import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface RechargeActivityRecord {
  id: string;
  activityCode: string;
  activityName: string;
  rechargeRule: string;
  rewardRule: string;
  scope: string;
  costOwner: string;
  tierRule: string;
  status: string;
  updatedAt: string;
}

const statusMap = {
  DRAFT: { color: 'gold', text: '草稿' },
  RUNNING: { color: 'success', text: '进行中' },
  PAUSED: { color: 'default', text: '暂停' },
};

const initialActivities: RechargeActivityRecord[] = [
  { id: 'r1', activityCode: 'RCG-001', activityName: '首充礼包', rechargeRule: '首次充值满 50 元', rewardRule: '赠 10 元余额 + 5 元券', scope: '平台', costOwner: '平台承担', tierRule: '50 / 100 / 200 三档', status: 'DRAFT', updatedAt: '2026-04-18 09:10:00' },
  { id: 'r2', activityCode: 'RCG-006', activityName: '夜洗充值返利', rechargeRule: '充值 100 元', rewardRule: '赠 15 元余额', scope: '指定门店组', costOwner: '门店承担 70%，平台承担 30%', tierRule: '100 / 200 固定档', status: 'PAUSED', updatedAt: '2026-04-16 21:42:00' },
];

const RechargeActivityManagement: React.FC = () => {
  const [form] = Form.useForm<RechargeActivityRecord>();
  const [records, setRecords] = useState(initialActivities);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RechargeActivityRecord | null>(null);
  const [detail, setDetail] = useState<RechargeActivityRecord | null>(null);
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
    { title: '成本承担', dataIndex: 'costOwner', width: 180, search: false },
    { title: '固定档位', dataIndex: 'tierRule', width: 160, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: buildValueEnum(Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))), render: (_, record) => renderStatusTag(record.status, statusMap) },
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
              message.success('充值活动状态已更新');
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
      message.success('充值活动已更新');
    } else {
      setRecords((prev) => [{ ...values, id: `recharge-${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
      message.success('充值活动已创建');
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
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1860 }}
        toolBarRender={() => [
          <Button key="tiers" onClick={() => setHelperVisible(true)}>固定档位</Button>,
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

      <Modal title={editingRecord ? `编辑充值活动 · ${editingRecord.activityName}` : '新建充值活动'} open={modalVisible} onOk={handleSubmit} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
            <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
            <Form.Item name="rechargeRule" label="充值规则"><Input /></Form.Item>
            <Form.Item name="scope" label="作用范围"><Input /></Form.Item>
            <Form.Item name="costOwner" label="成本承担"><Input /></Form.Item>
            <Form.Item name="tierRule" label="固定档位"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))} /></Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="rewardRule" label="奖励规则"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="充值活动详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="活动编码">{detail.activityCode}</Descriptions.Item>
            <Descriptions.Item label="活动名称">{detail.activityName}</Descriptions.Item>
            <Descriptions.Item label="充值规则">{detail.rechargeRule}</Descriptions.Item>
            <Descriptions.Item label="奖励规则">{detail.rewardRule}</Descriptions.Item>
            <Descriptions.Item label="成本承担">{detail.costOwner}</Descriptions.Item>
            <Descriptions.Item label="固定档位">{detail.tierRule}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="固定档位模板" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="推荐档位">50 / 100 / 200 / 500 四档。</Descriptions.Item>
          <Descriptions.Item label="适用场景">首充礼包、节日充值返利、夜洗充值活动。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default RechargeActivityManagement;
