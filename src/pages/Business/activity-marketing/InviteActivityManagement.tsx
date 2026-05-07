import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { activityRewardStatusOptions, activityStatusOptions, inviteRecordStatusOptions, rewardTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';

interface InviteActivityRecord {
  id: string;
  activityCode: string;
  activityName: string;
  qualifyRule: string;
  inviterReward: string;
  inviterRewardType: string;
  inviteeReward: string;
  inviteeRewardType: string;
  inviteCount: number;
  qualifiedCount: number;
  rewardStatus: string;
  recordStatus: string;
  antiFraud: string;
  recoveryRule: string;
  dailyLimit: string;
  status: string;
  updatedAt: string;
}

const statusMap = buildValueEnum(activityStatusOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const inviteRecordStatusMap = buildValueEnum(inviteRecordStatusOptions);

const initialActivities: InviteActivityRecord[] = [
  { id: 'i1', activityCode: 'INV-001', activityName: '邀请好友首充得奖励', qualifyRule: '好友首充满 50 元', inviterReward: '10 元余额', inviterRewardType: 'BALANCE', inviteeReward: '5 元洗车券', inviteeRewardType: 'COUPON', inviteCount: 86, qualifiedCount: 24, rewardStatus: 'PENDING', recordStatus: 'QUALIFIED', antiFraud: '同设备 / 同手机号 / 同支付账户限制', recoveryRule: '首充退款后自动回收奖励', dailyLimit: '10 人 / 天', status: 'DRAFT', updatedAt: '2026-04-18 09:05:00' },
  { id: 'i2', activityCode: 'INV-003', activityName: '三人阶梯邀请奖励', qualifyRule: '累计 3 人达标', inviterReward: '30 元余额', inviterRewardType: 'BALANCE', inviteeReward: '新人礼券包', inviteeRewardType: 'COUPON', inviteCount: 132, qualifiedCount: 48, rewardStatus: 'ISSUED', recordStatus: 'REWARDED', antiFraud: '黑名单 / 退款回收 / 人工审核', recoveryRule: '作弊判定后批量扣回', dailyLimit: '20 人 / 天', status: 'PAUSED', updatedAt: '2026-04-16 18:10:00' },
];

const InviteActivityManagement: React.FC = () => {
  const [form] = Form.useForm<InviteActivityRecord>();
  const [records, setRecords] = useState(initialActivities);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InviteActivityRecord | null>(null);
  const [detail, setDetail] = useState<InviteActivityRecord | null>(null);
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
          containsKeyword(keyword, [item.activityCode, item.activityName, item.qualifyRule, item.inviterReward, item.inviteeReward]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const columns: ProColumns<InviteActivityRecord>[] = [
    {
      title: '活动',
      dataIndex: 'activityName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.activityName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.activityCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动 / 编码 / 达标规则 / 奖励' } },
    { title: '达标规则', dataIndex: 'qualifyRule', width: 180, search: false },
    { title: '邀请人奖励', dataIndex: 'inviterReward', width: 160, search: false },
    { title: '被邀请人奖励', dataIndex: 'inviteeReward', width: 160, search: false },
    { title: '邀请数', dataIndex: 'inviteCount', width: 100, search: false },
    { title: '达标数', dataIndex: 'qualifiedCount', width: 100, search: false },
    { title: '记录状态', dataIndex: 'recordStatus', width: 120, valueType: 'select', valueEnum: inviteRecordStatusMap, render: (_, record) => renderStatusTag(record.recordStatus, inviteRecordStatusMap) },
    { title: '奖励状态', dataIndex: 'rewardStatus', width: 120, valueType: 'select', valueEnum: rewardStatusMap, render: (_, record) => renderStatusTag(record.rewardStatus, rewardStatusMap) },
    { title: '防刷规则', dataIndex: 'antiFraud', width: 220, search: false },
    { title: '奖励回收', dataIndex: 'recoveryRule', width: 180, search: false },
    { title: '每日上限', dataIndex: 'dailyLimit', width: 120, search: false },
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
              api.marketing.inviteActivities.edit({ id: Number(record.id), status: record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' } as Record<string, unknown>);
              setRecords((prev) => prev.map((item) => item.id === record.id ? { ...item, status: item.status === 'RUNNING' ? 'PAUSED' : 'RUNNING', updatedAt: new Date().toISOString() } : item));
              message.success('邀请活动状态已更新');
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
      await api.marketing.inviteActivities.edit({ ...values, id: Number(editingRecord.id) } as Record<string, unknown>);
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)));
      message.success('邀请活动已更新');
    } else {
      await api.marketing.inviteActivities.add(values as unknown as Record<string, unknown>);
      setRecords((prev) => [{ ...values, id: `${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
      message.success('邀请活动已创建');
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="邀请活动" subtitle="补齐邀请活动的编码、达标规则、奖励、回收和防刷策略。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="邀请活动" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="进行中" value={records.filter((item) => item.status === 'RUNNING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="防刷维度" value={4} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="奖励回收规则" value={records.length} suffix="类" /></Card></Col>
      </Row>

      <ProTable<InviteActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1980 }}
        toolBarRender={() => [
          <Button key="fraud" onClick={() => setHelperVisible(true)}>防刷策略</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT' }); setModalVisible(true); }}>
            新建邀请活动
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
        request={async (params) => {
          const res = await api.marketing.inviteActivities.page(params);
          return { data: res.data.records as any, success: true, total: res.data.total };
        }}
      />

      <Modal title={editingRecord ? `编辑邀请活动 · ${editingRecord.activityName}` : '新建邀请活动'} open={modalVisible} onOk={handleSubmit} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
            <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
            <Form.Item name="qualifyRule" label="达标规则"><Input /></Form.Item>
            <Form.Item name="dailyLimit" label="每日上限"><Input /></Form.Item>
            <Form.Item name="inviterReward" label="邀请人奖励"><Input /></Form.Item>
            <Form.Item name="inviteeReward" label="被邀请人奖励"><Input /></Form.Item>
            <Form.Item name="inviterRewardType" label="邀请人奖励类型"><Select options={rewardTypeOptions} /></Form.Item>
            <Form.Item name="inviteeRewardType" label="被邀请人奖励类型"><Select options={rewardTypeOptions} /></Form.Item>
            <Form.Item name="inviteCount" label="邀请数"><Input /></Form.Item>
            <Form.Item name="qualifiedCount" label="达标数"><Input /></Form.Item>
            <Form.Item name="recordStatus" label="记录状态"><Select options={inviteRecordStatusOptions} /></Form.Item>
            <Form.Item name="rewardStatus" label="奖励状态"><Select options={activityRewardStatusOptions} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="antiFraud" label="防刷规则"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item className="modal-span-2" name="recoveryRule" label="奖励回收规则"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="邀请活动详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="活动编码">{detail.activityCode}</Descriptions.Item>
            <Descriptions.Item label="活动名称">{detail.activityName}</Descriptions.Item>
            <Descriptions.Item label="达标规则">{detail.qualifyRule}</Descriptions.Item>
            <Descriptions.Item label="邀请人奖励">{detail.inviterReward}</Descriptions.Item>
            <Descriptions.Item label="被邀请人奖励">{detail.inviteeReward}</Descriptions.Item>
            <Descriptions.Item label="每日上限">{detail.dailyLimit}</Descriptions.Item>
            <Descriptions.Item label="邀请数">{detail.inviteCount}</Descriptions.Item>
            <Descriptions.Item label="达标数">{detail.qualifiedCount}</Descriptions.Item>
            <Descriptions.Item label="记录状态">{inviteRecordStatusMap[detail.recordStatus]?.text || detail.recordStatus}</Descriptions.Item>
            <Descriptions.Item label="奖励状态">{rewardStatusMap[detail.rewardStatus]?.text || detail.rewardStatus}</Descriptions.Item>
            <Descriptions.Item label="防刷规则">{detail.antiFraud}</Descriptions.Item>
            <Descriptions.Item label="奖励回收">{detail.recoveryRule}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="防刷策略" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="校验维度">同设备、同手机号、同支付账户、退款回收、人工黑名单。</Descriptions.Item>
          <Descriptions.Item label="建议策略">先拦截高风险用户，再在奖励到账后做回收复核。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default InviteActivityManagement;
