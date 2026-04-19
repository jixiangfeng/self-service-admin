import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface CouponTemplateRecord {
  id: string;
  templateCode: string;
  templateName: string;
  couponType: string;
  scope: string;
  threshold: string;
  validity: string;
  issueRule: string;
  stackRule: string;
  stock: number;
  status: string;
  updatedAt: string;
}

const typeMap = {
  FULL_REDUCTION: { color: 'blue', text: '满减券' },
  DIRECT: { color: 'purple', text: '立减券' },
  DISCOUNT: { color: 'cyan', text: '折扣券' },
  FREE_SERVICE: { color: 'gold', text: '免费服务券' },
  DURATION: { color: 'green', text: '时长抵扣券' },
};

const statusMap = {
  ENABLED: { color: 'success', text: '启用' },
  PAUSED: { color: 'gold', text: '暂停' },
  EXPIRED: { color: 'default', text: '失效' },
};

const initialTemplates: CouponTemplateRecord[] = [
  { id: 'ct1', templateCode: 'CPN-NIGHT-008', templateName: '夜洗 8 元满减券', couponType: 'FULL_REDUCTION', scope: '指定门店组', threshold: '满 39 元可用', validity: '领券后 7 天', issueRule: '夜洗活动自动发放', stackRule: '可与余额同用，不可叠同类券', stock: 520, status: 'ENABLED', updatedAt: '2026-04-18 09:16:00' },
  { id: 'ct2', templateCode: 'CPN-INVITE-005', templateName: '邀请首充 5 元券', couponType: 'DIRECT', scope: '平台', threshold: '满 20 元可用', validity: '到账后 5 天', issueRule: '邀请达标实时发券', stackRule: '不可与新人礼叠加', stock: 320, status: 'ENABLED', updatedAt: '2026-04-18 08:48:00' },
  { id: 'ct3', templateCode: 'CPN-FOAM-TRY', templateName: '泡沫精洗体验券', couponType: 'FREE_SERVICE', scope: '直营门店', threshold: '指定服务可核销', validity: '活动期内', issueRule: '线下活动补发', stackRule: '仅限单次核销', stock: 0, status: 'EXPIRED', updatedAt: '2026-04-16 16:22:00' },
];

const CouponTemplateManagement: React.FC = () => {
  const [form] = Form.useForm<CouponTemplateRecord>();
  const [records, setRecords] = useState(initialTemplates);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CouponTemplateRecord | null>(null);
  const [detail, setDetail] = useState<CouponTemplateRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);

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
      valueEnum: buildValueEnum(Object.entries(typeMap).map(([value, item]) => ({ value, label: item.text }))),
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
      valueEnum: buildValueEnum(Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))),
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
              setRecords((prev) =>
                prev.map((item) =>
                  item.id === record.id ? { ...item, status: item.status === 'ENABLED' ? 'PAUSED' : 'ENABLED', updatedAt: new Date().toISOString() } : item
                )
              );
              message.success('券模板状态已更新');
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
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)));
      message.success('券模板已更新');
    } else {
      setRecords((prev) => [{ ...values, id: `coupon-${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
      message.success('券模板已创建');
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
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="库存总量" value={records.reduce((sum, item) => sum + item.stock, 0)} suffix="张" /></Card></Col>
      </Row>

      <ProTable<CouponTemplateRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1960 }}
        toolBarRender={() => [
          <Button key="rules" onClick={() => setHelperVisible(true)}>叠加规则</Button>,
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

      <Modal title={editingRecord ? `编辑券模板 · ${editingRecord.templateName}` : '新建券模板'} open={modalVisible} onOk={handleSubmit} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="templateCode" label="券模板编码" rules={[{ required: true, message: '请输入券模板编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="templateName" label="券模板名称" rules={[{ required: true, message: '请输入券模板名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="couponType" label="券类型" rules={[{ required: true, message: '请选择券类型' }]}>
              <Select options={Object.entries(typeMap).map(([value, item]) => ({ value, label: item.text }))} />
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
              <Select options={Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))} />
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
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="编码">{detail.templateCode}</Descriptions.Item>
            <Descriptions.Item label="名称">{detail.templateName}</Descriptions.Item>
            <Descriptions.Item label="券类型">{typeMap[detail.couponType as keyof typeof typeMap]?.text || detail.couponType}</Descriptions.Item>
            <Descriptions.Item label="作用范围">{detail.scope}</Descriptions.Item>
            <Descriptions.Item label="使用门槛">{detail.threshold}</Descriptions.Item>
            <Descriptions.Item label="有效期">{detail.validity}</Descriptions.Item>
            <Descriptions.Item label="发放规则">{detail.issueRule}</Descriptions.Item>
            <Descriptions.Item label="叠加规则">{detail.stackRule}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="叠加规则说明" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="规则目标">控制券与余额、服务卡、新人礼、邀请券之间的叠加边界。</Descriptions.Item>
          <Descriptions.Item label="当前建议">同类券不可叠加，立减券与服务券互斥，余额可与单张券混用。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default CouponTemplateManagement;
