import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { couponTypeOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type CouponTemplateRecord } from '@/services/backendService';

const typeMap = buildValueEnum(couponTypeOptions);
const statusMap = buildValueEnum(templateStatusOptions);

const couponTemplateDetailFields: DetailField<CouponTemplateRecord>[] = [
  { name: 'templateCode', label: '编码' },
  { name: 'templateName', label: '名称' },
  { name: 'couponType', label: '券类型', render: (value) => typeMap[value as keyof typeof typeMap]?.text || value },
  { name: 'scope', label: '作用范围' },
  { name: 'threshold', label: '使用门槛' },
  { name: 'validity', label: '有效期' },
  { name: 'issueRule', label: '发放规则' },
  { name: 'stackRule', label: '叠加规则' },
  { name: 'stock', label: '库存' },
  { name: 'status', label: '状态', render: (value) => statusMap[value as keyof typeof statusMap]?.text || value },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const CouponTemplateManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CouponTemplateRecord>();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CouponTemplateRecord | null>(null);
  const [detail, setDetail] = useState<CouponTemplateRecord | null>(null);

  const templateQuery = useQuery({
    queryKey: ['couponTemplates', keyword, typeFilter, statusFilter],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, couponType: typeFilter, status: statusFilter })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.couponTemplates.edit(values);
      } else {
        await api.marketing.couponTemplates.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponTemplates'] });
      message.success(editingRecord ? '券模板已更新' : '券模板已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: CouponTemplateRecord) => api.marketing.couponTemplates.edit({ ...record, status: record.status === 'ENABLED' ? 'PAUSED' : 'ENABLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponTemplates'] });
      message.success('券模板状态已更新');
    },
  });

  const records = templateQuery.data?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.templateCode, item.templateName, item.scope, item.threshold, item.issueRule]) &&
          (!typeFilter || item.couponType === typeFilter) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter, typeFilter]
  );

  const columns: ProColumns<CouponTemplateRecord>[] = [
    {
      title: '券模板',
      dataIndex: 'templateName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.templateName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.templateCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '模板 / 编码 / 范围 / 发放规则' } },
    {
      title: '券类型',
      dataIndex: 'couponType',
      width: 140,
      valueType: 'select',
      valueEnum: typeMap,
      render: (_, record) => renderStatusTag(record.couponType, typeMap),
    },
    { title: '适用范围', dataIndex: 'scope', width: 160, search: false },
    { title: '使用门槛', dataIndex: 'threshold', width: 160, search: false },
    { title: '有效期', dataIndex: 'validity', width: 140, search: false },
    { title: '发放规则', dataIndex: 'issueRule', width: 180, search: false },
    { title: '叠加规则', dataIndex: 'stackRule', width: 180, search: false },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: statusMap,
      render: (_, record) => renderStatusTag(record.status, statusMap),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              statusMutation.mutate(record);
            }}
          >
            {record.status === 'ENABLED' ? '暂停' : '启用'}
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
      <PageBanner title="券模板管理" subtitle="补齐券模板的编码、作用范围、门槛、发放规则、叠加规则和状态控制。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="券模板数" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用模板" value={records.filter((item) => item.status === 'ENABLED').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="作用范围" value={3} suffix="层" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="库存总量" value={records.reduce((sum, item) => sum + Number(item.stock || 0), 0)} suffix="张" /></Card></Col>
      </Row>

      <ProTable<CouponTemplateRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={templateQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1960 }}
        toolBarRender={() => [
          <Button key="rules" onClick={() => {
            setEditingRecord(null);
            form.resetFields();
            form.setFieldsValue({ couponType: 'FULL_REDUCTION', status: 'ENABLED', stock: 0, stackRule: '同类券不可叠加；立减券与服务券互斥；余额可与单张券混用' });
            setModalVisible(true);
          }}>叠加规则</Button>,
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({ couponType: 'FULL_REDUCTION', status: 'ENABLED', stock: 0 });
              setModalVisible(true);
            }}
          >
            新建券模板
          </Button>,
        ]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setTypeFilter(values.couponType as string | undefined);
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setTypeFilter(undefined);
          setStatusFilter(undefined);
        }}
      />

      <Modal title={editingRecord ? `编辑券模板 · ${editingRecord.templateName}` : '新建券模板'} open={modalVisible} onOk={handleSubmit} confirmLoading={saveMutation.isPending} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="templateCode" label="券模板编码" rules={[{ required: true, message: '请输入券模板编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="templateName" label="券模板名称" rules={[{ required: true, message: '请输入券模板名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="couponType" label="券类型" rules={[{ required: true, message: '请选择券类型' }]}>
              <Select options={couponTypeOptions} />
            </Form.Item>
            <Form.Item name="scope" label="作用范围">
              <Input />
            </Form.Item>
            <Form.Item name="threshold" label="使用门槛">
              <Input />
            </Form.Item>
            <Form.Item name="validity" label="有效期">
              <Input />
            </Form.Item>
            <Form.Item name="stock" label="库存">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={templateStatusOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="issueRule" label="发放规则">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="stackRule" label="叠加规则">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="券模板详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={couponTemplateDetailFields} column={2} labelWidth={100} />
        ) : null}
      </Modal>

    </div>
  );
};

export default CouponTemplateManagement;
