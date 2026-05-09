import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { activityRewardStatusOptions, activityStatusOptions, costBearerOptions, rewardTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type RechargeActivityRecord } from '@/services/backendService';

const statusMap = buildValueEnum(activityStatusOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);

const rechargeDetailFields: DetailField<RechargeActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'rechargeRule', label: '充值规则' },
  { name: 'rewardRule', label: '奖励规则' },
  { name: 'costOwner', label: '成本承担', render: (value) => value ? costBearerMap[value as keyof typeof costBearerMap]?.text || value : '-' },
  { name: 'tierRule', label: '固定档位' },
  { name: 'minAmount', label: '最低充值金额' },
  { name: 'rewardValue', label: '奖励值' },
  { name: 'rewardStatus', label: '发放状态', render: (value) => value ? rewardStatusMap[value as keyof typeof rewardStatusMap]?.text || value : '-' },
  { name: 'issuedCount', label: '发放数量' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const RechargeActivityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RechargeActivityRecord>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RechargeActivityRecord | null>(null);
  const [detail, setDetail] = useState<RechargeActivityRecord | null>(null);

  const activityQuery = useQuery({
    queryKey: ['rechargeActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.rechargeActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.rechargeActivities.edit(values);
      } else {
        await api.marketing.rechargeActivities.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechargeActivities'] });
      message.success(editingRecord ? '充值活动已更新' : '充值活动已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: RechargeActivityRecord) => api.marketing.rechargeActivities.edit({ ...record, status: record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechargeActivities'] });
      message.success('充值活动状态已更新');
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
          containsKeyword(keyword, [item.activityCode, item.activityName, item.rechargeRule, item.rewardRule, item.scope]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const columns: ProColumns<RechargeActivityRecord>[] = [
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
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动 / 编码 / 充值门槛 / 奖励 / 范围' } },
    { title: '充值规则', dataIndex: 'rechargeRule', width: 180, search: false },
    { title: '奖励规则', dataIndex: 'rewardRule', width: 220, search: false },
    { title: '作用范围', dataIndex: 'scope', width: 160, search: false },
    { title: '成本承担', dataIndex: 'costOwner', width: 160, valueType: 'select', valueEnum: costBearerMap, render: (_, record) => renderStatusTag(record.costOwner, costBearerMap) },
    { title: '固定档位', dataIndex: 'tierRule', width: 160, search: false },
    { title: '最低充值', dataIndex: 'minAmount', width: 100, search: false },
    { title: '奖励值', dataIndex: 'rewardValue', width: 160, search: false },
    { title: '发放状态', dataIndex: 'rewardStatus', width: 120, valueType: 'select', valueEnum: rewardStatusMap, render: (_, record) => renderStatusTag(record.rewardStatus, rewardStatusMap) },
    { title: '发放数', dataIndex: 'issuedCount', width: 100, search: false },
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
      <PageBanner title="充值活动" subtitle="补齐固定档位、赠送规则、成本承担和状态控制能力。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="充值活动" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="固定档位" value={4} suffix="档" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="首充礼包" value={records.filter((item) => item.activityName.includes('首充')).length} suffix="套" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="赠送规则" value={records.length} suffix="类" /></Card></Col>
      </Row>

      <ProTable<RechargeActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1860 }}
        toolBarRender={() => [
          <Button key="tiers" onClick={() => {
            setEditingRecord(null);
            form.resetFields();
            form.setFieldsValue({ status: 'DRAFT', tierRule: '50/100/200/500', rechargeRule: '固定档位充值', rewardRule: '按档位赠送余额', rewardStatus: 'PENDING' });
            setModalVisible(true);
          }}>固定档位</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT' }); setModalVisible(true); }}>
            新建充值活动
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

      <Modal title={editingRecord ? `编辑充值活动 · ${editingRecord.activityName}` : '新建充值活动'} open={modalVisible} onOk={handleSubmit} confirmLoading={saveMutation.isPending} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
            <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
            <Form.Item name="rechargeRule" label="充值规则"><Input /></Form.Item>
            <Form.Item name="scope" label="作用范围"><Input /></Form.Item>
            <Form.Item name="costOwner" label="成本承担"><Select options={costBearerOptions} /></Form.Item>
            <Form.Item name="tierRule" label="固定档位"><Input /></Form.Item>
            <Form.Item name="minAmount" label="最低充值金额"><Input /></Form.Item>
            <Form.Item name="rewardValue" label="奖励值"><Input /></Form.Item>
            <Form.Item name="rewardStatus" label="发放状态"><Select options={activityRewardStatusOptions} /></Form.Item>
            <Form.Item name="issuedCount" label="发放数量"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="rewardRule" label="奖励规则"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item className="modal-span-2" name="rewardType" label="奖励类型"><Select mode="multiple" options={rewardTypeOptions} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="充值活动详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={rechargeDetailFields} column={2} labelWidth={110} />
        ) : null}
      </Modal>

    </div>
  );
};

export default RechargeActivityManagement;
