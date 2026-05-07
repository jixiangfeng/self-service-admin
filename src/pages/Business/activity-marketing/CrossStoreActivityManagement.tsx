import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { activityStatusOptions, activityTypeOptions, costBearerOptions, writeOffMethodOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface CrossStoreActivityRecord {
  id: string;
  activityCode: string;
  activityName: string;
  activityType: string;
  storeGroup: string;
  writeoffMode: string;
  costOwner: string;
  cycle: string;
  status: string;
  updatedAt: string;
}

const activityTypeMap = buildValueEnum(activityTypeOptions);
const statusMap = buildValueEnum(activityStatusOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
const writeOffMethodMap = buildValueEnum(writeOffMethodOptions);

const initialActivities: CrossStoreActivityRecord[] = [
  { id: 'cs1', activityCode: 'CSA-001', activityName: '上海直营跨店夜洗券', activityType: 'COUPON', storeGroup: '上海直营夜洗门店组', writeoffMode: 'ASSIGNED_STORE', costOwner: 'PLATFORM', cycle: '2026-04-18 ~ 2026-05-18', status: 'RUNNING', updatedAt: '2026-04-18 09:32:00' },
  { id: 'cs2', activityCode: 'CSA-006', activityName: '联营门店联合充值季', activityType: 'RECHARGE', storeGroup: '嘉定联营核销组', writeoffMode: 'STORE_GROUP', costOwner: 'RATIO', cycle: '2026-05-01 ~ 2026-05-31', status: 'DRAFT', updatedAt: '2026-04-17 18:45:00' },
];

const CrossStoreActivityManagement: React.FC = () => {
  const [form] = Form.useForm<CrossStoreActivityRecord>();
  const [records, setRecords] = useState(initialActivities);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrossStoreActivityRecord | null>(null);
  const [detail, setDetail] = useState<CrossStoreActivityRecord | null>(null);
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
              setRecords((prev) => prev.map((item) => item.id === record.id ? { ...item, status: item.status === 'RUNNING' ? 'PAUSED' : 'RUNNING', updatedAt: new Date().toISOString() } : item));
              message.success('跨店活动状态已更新');
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
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)));
      message.success('跨店活动已更新');
    } else {
      setRecords((prev) => [{ ...values, id: `cross-${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
      message.success('跨店活动已创建');
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
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1860 }}
        toolBarRender={() => [
          <Button key="group" onClick={() => setHelperVisible(true)}>选择门店组</Button>,
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

      <Modal title={editingRecord ? `编辑跨店活动 · ${editingRecord.activityName}` : '新建跨店活动'} open={modalVisible} onOk={handleSubmit} onCancel={closeModal} width={860}>
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
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="活动编码">{detail.activityCode}</Descriptions.Item>
            <Descriptions.Item label="活动名称">{detail.activityName}</Descriptions.Item>
            <Descriptions.Item label="门店组">{detail.storeGroup}</Descriptions.Item>
            <Descriptions.Item label="核销方式">{writeOffMethodMap[detail.writeoffMode]?.text || detail.writeoffMode}</Descriptions.Item>
            <Descriptions.Item label="成本承担">{costBearerMap[detail.costOwner]?.text || detail.costOwner}</Descriptions.Item>
            <Descriptions.Item label="活动周期">{detail.cycle}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="门店组选择说明" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="配置入口">请先到门店组管理维护活动组、核销组、统计组。</Descriptions.Item>
          <Descriptions.Item label="推荐做法">活动创建前先锁定门店组，避免中途变更核销边界。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default CrossStoreActivityManagement;
