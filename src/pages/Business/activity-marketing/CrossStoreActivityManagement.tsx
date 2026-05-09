import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityStatusOptions, activityTypeOptions, costBearerOptions, writeOffMethodOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type CrossStoreActivityRecord } from '@/services/backendService';

const activityTypeMap = buildValueEnum(activityTypeOptions);
const statusMap = buildValueEnum(activityStatusOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
const writeOffMethodMap = buildValueEnum(writeOffMethodOptions);

const crossStoreDetailFields: DetailField<CrossStoreActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'activityType', label: '活动类型', render: (value) => value ? activityTypeMap[value as keyof typeof activityTypeMap]?.text || value : '-' },
  { name: 'storeGroup', label: '门店组' },
  { name: 'writeoffMode', label: '核销方式', render: (value) => value ? writeOffMethodMap[value as keyof typeof writeOffMethodMap]?.text || value : '-' },
  { name: 'costOwner', label: '成本承担', render: (value) => value ? costBearerMap[value as keyof typeof costBearerMap]?.text || value : '-' },
  { name: 'cycle', label: '活动周期' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const CrossStoreActivityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<CrossStoreActivityRecord>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrossStoreActivityRecord | null>(null);
  const [detail, setDetail] = useState<CrossStoreActivityRecord | null>(null);
  const activityQuery = useQuery({
    queryKey: ['crossStoreActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.crossStoreActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) return api.marketing.crossStoreActivities.edit(values);
      return api.marketing.crossStoreActivities.add(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crossStoreActivities'] });
      message.success(editingRecord ? '跨店活动已更新' : '跨店活动已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: CrossStoreActivityRecord) => api.marketing.crossStoreActivities.changeStatus(record.id, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crossStoreActivities'] });
      message.success('跨店活动状态已更新');
    },
  });
  const records = activityQuery.data?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.activityCode, item.activityName, item.storeGroup, item.writeoffMode, item.costOwner]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const columns: ProColumns<CrossStoreActivityRecord>[] = [
    {
      title: '活动',
      dataIndex: 'activityName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.activityName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.activityCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动 / 编码 / 门店组 / 核销方式 / 成本承担' } },
    { title: '活动类型', dataIndex: 'activityType', width: 140, valueType: 'select', valueEnum: activityTypeMap, render: (_, record) => renderStatusTag(record.activityType, activityTypeMap) },
    { title: '门店组', dataIndex: 'storeGroup', width: 200, search: false },
    { title: '核销方式', dataIndex: 'writeoffMode', width: 160, valueType: 'select', valueEnum: writeOffMethodMap, render: (_, record) => renderStatusTag(record.writeoffMode, writeOffMethodMap) },
    { title: '成本承担', dataIndex: 'costOwner', width: 160, valueType: 'select', valueEnum: costBearerMap, render: (_, record) => renderStatusTag(record.costOwner, costBearerMap) },
    { title: '活动周期', dataIndex: 'cycle', width: 200, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => { setEditingRecord(record); form.setFieldsValue(record); setModalVisible(true); }}>编辑</Button>
          <Button
            size="small"
            onClick={() => {
              statusMutation.mutate(record);
            }}
          >
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRecord) {
      await saveMutation.mutateAsync({ ...values, id: editingRecord.id } as Record<string, unknown>);
    } else {
      await saveMutation.mutateAsync(values as unknown as Record<string, unknown>);
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="跨店活动" subtitle="补齐门店组范围、核销方式、成本承担和跨店状态控制。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="跨店活动" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="运行中" value={records.filter((item) => item.status === 'RUNNING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动门店组" value={records.length} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="可跨店核销" value={1} suffix="种方式" /></Card></Col>
      </Row>

      <ProTable<CrossStoreActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1860 }}
        toolBarRender={() => [
          <Button key="group" onClick={() => navigate('/merchant/groups')}>选择门店组</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT' }); setModalVisible(true); }}>
            新建跨店活动
          </Button>,
        ]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setStatusFilter(undefined);
        }}
      />

      <Modal title={editingRecord ? `编辑跨店活动 · ${editingRecord.activityName}` : '新建跨店活动'} open={modalVisible} onOk={handleSubmit} confirmLoading={saveMutation.isPending} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
            <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
            <Form.Item name="activityType" label="活动类型" rules={[{ required: true, message: '请选择活动类型' }]}><Select options={activityTypeOptions} /></Form.Item>
            <Form.Item name="storeGroup" label="门店组"><Input /></Form.Item>
            <Form.Item name="writeoffMode" label="核销方式"><Select options={writeOffMethodOptions} /></Form.Item>
            <Form.Item name="costOwner" label="成本承担"><Select options={costBearerOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="cycle" label="活动周期"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="跨店活动详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={crossStoreDetailFields} column={2} labelWidth={110} />
        ) : null}
      </Modal>

    </div>
  );
};

export default CrossStoreActivityManagement;
