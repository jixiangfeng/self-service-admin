import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { WalletOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, renderStatusTag } from '@/pages/Business/shared';

interface ServiceCardRecord {
  id: string;
  cardCode: string;
  cardName: string;
  cardType: string;
  scope: string;
  rights: string;
  salePrice: number;
  validity: string;
  stock: number;
  issueRule: string;
  status: string;
}

const cardTypeMap = {
  SERVICE_CARD: { color: 'blue', text: '服务卡' },
  COUNT_CARD: { color: 'purple', text: '次卡' },
  MONTH_CARD: { color: 'cyan', text: '月卡' },
};

const statusMap = {
  ENABLED: { color: 'success', text: '启用' },
  PAUSED: { color: 'gold', text: '暂停' },
  EXPIRED: { color: 'default', text: '下线' },
};

const initialCards: ServiceCardRecord[] = [
  { id: 'sc1', cardCode: 'CARD-MONTH-001', cardName: '夜洗月卡', cardType: 'MONTH_CARD', scope: '夜洗门店组', rights: '30 天内不限次夜洗优惠', salePrice: 199, validity: '30 天', stock: 200, issueRule: '支持购买与活动发放', status: 'ENABLED' },
  { id: 'sc2', cardCode: 'CARD-COUNT-005', cardName: '精洗 5 次卡', cardType: 'COUNT_CARD', scope: '直营门店', rights: '泡沫精洗 5 次', salePrice: 169, validity: '90 天', stock: 80, issueRule: '新客首充赠送', status: 'PAUSED' },
  { id: 'sc3', cardCode: 'CARD-SVC-020', cardName: '会员服务包', cardType: 'SERVICE_CARD', scope: '平台', rights: '洗车 + 吸尘权益包', salePrice: 129, validity: '180 天', stock: 60, issueRule: '仅运营后台补发', status: 'ENABLED' },
];

const ServiceCardManagement: React.FC = () => {
  const [form] = Form.useForm<ServiceCardRecord>();
  const [records, setRecords] = useState(initialCards);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceCardRecord | null>(null);
  const [detail, setDetail] = useState<ServiceCardRecord | null>(null);
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
          containsKeyword(keyword, [item.cardCode, item.cardName, item.scope, item.rights, item.issueRule]) &&
          (!typeFilter || item.cardType === typeFilter) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter, typeFilter]
  );

  const columns: ProColumns<ServiceCardRecord>[] = [
    {
      title: '卡产品',
      dataIndex: 'cardName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.cardName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.cardCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡名称 / 编码 / 范围 / 权益' } },
    {
      title: '卡类型',
      dataIndex: 'cardType',
      width: 120,
      valueType: 'select',
      valueEnum: buildValueEnum(Object.entries(cardTypeMap).map(([value, item]) => ({ value, label: item.text }))),
      render: (_, record) => renderStatusTag(record.cardType, cardTypeMap),
    },
    { title: '作用范围', dataIndex: 'scope', width: 160, search: false },
    { title: '权益内容', dataIndex: 'rights', width: 220, search: false },
    { title: '售价', dataIndex: 'salePrice', width: 120, search: false, render: (_, record) => formatAmount(record.salePrice) },
    { title: '有效期', dataIndex: 'validity', width: 120, search: false },
    { title: '发放规则', dataIndex: 'issueRule', width: 180, search: false },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: buildValueEnum(Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))), render: (_, record) => renderStatusTag(record.status, statusMap) },
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
                  item.id === record.id ? { ...item, status: item.status === 'ENABLED' ? 'PAUSED' : 'ENABLED' } : item
                )
              );
              message.success('卡产品状态已更新');
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
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values } : item)));
      message.success('卡产品已更新');
    } else {
      setRecords((prev) => [{ ...values, id: `card-${Date.now()}` }, ...prev]);
      message.success('卡产品已创建');
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="服务卡与次卡" subtitle="补齐服务卡、次卡、月卡的产品配置、售价、发放规则和上下架状态。" icon={<WalletOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="卡产品" value={records.length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="服务卡" value={records.filter((item) => item.cardType === 'SERVICE_CARD').length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="次卡 / 月卡" value={records.filter((item) => item.cardType !== 'SERVICE_CARD').length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="可售库存" value={records.reduce((sum, item) => sum + item.stock, 0)} suffix="份" /></Card></Col>
      </Row>

      <ProTable<ServiceCardRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1780 }}
        toolBarRender={() => [
          <Button key="issue" onClick={() => setHelperVisible(true)}>批量发卡</Button>,
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({ cardType: 'SERVICE_CARD', status: 'ENABLED', stock: 0, salePrice: 0 });
              setModalVisible(true);
            }}
          >
            新建卡产品
          </Button>,
        ]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setTypeFilter(values.cardType as string | undefined);
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setTypeFilter(undefined);
          setStatusFilter(undefined);
        }}
      />

      <Modal
        title={editingRecord ? `编辑卡产品 · ${editingRecord.cardName}` : '新建卡产品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        width={860}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="cardCode" label="卡产品编码" rules={[{ required: true, message: '请输入卡产品编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cardName" label="卡名称" rules={[{ required: true, message: '请输入卡名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cardType" label="卡类型" rules={[{ required: true, message: '请选择卡类型' }]}>
              <Select options={Object.entries(cardTypeMap).map(([value, item]) => ({ value, label: item.text }))} />
            </Form.Item>
            <Form.Item name="scope" label="作用范围">
              <Input />
            </Form.Item>
            <Form.Item name="salePrice" label="售价">
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
            <Form.Item className="modal-span-2" name="rights" label="权益内容">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="issueRule" label="发放规则">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="卡产品详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="编码">{detail.cardCode}</Descriptions.Item>
            <Descriptions.Item label="名称">{detail.cardName}</Descriptions.Item>
            <Descriptions.Item label="类型">{cardTypeMap[detail.cardType as keyof typeof cardTypeMap]?.text || detail.cardType}</Descriptions.Item>
            <Descriptions.Item label="作用范围">{detail.scope}</Descriptions.Item>
            <Descriptions.Item label="权益内容">{detail.rights}</Descriptions.Item>
            <Descriptions.Item label="售价">{formatAmount(detail.salePrice)}</Descriptions.Item>
            <Descriptions.Item label="有效期">{detail.validity}</Descriptions.Item>
            <Descriptions.Item label="库存">{detail.stock}</Descriptions.Item>
            <Descriptions.Item label="发放规则">{detail.issueRule}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusMap[detail.status as keyof typeof statusMap]?.text || detail.status}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="批量发卡说明" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="适用场景">首充活动发卡、售后补偿发卡、会员权益批量发放。</Descriptions.Item>
          <Descriptions.Item label="建议流程">先筛用户，再选卡产品，最后确认生效期与回收规则。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default ServiceCardManagement;
