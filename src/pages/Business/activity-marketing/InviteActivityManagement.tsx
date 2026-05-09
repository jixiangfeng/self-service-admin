import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityRewardStatusOptions, activityStatusOptions, inviteRecordStatusOptions, rewardTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type InviteActivityRecord } from '@/services/backendService';

const statusMap = buildValueEnum(activityStatusOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const inviteRecordStatusMap = buildValueEnum(inviteRecordStatusOptions);

const inviteDetailFields: DetailField<InviteActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'qualifyRule', label: '达标规则' },
  { name: 'inviterReward', label: '邀请人奖励' },
  { name: 'inviteeReward', label: '被邀请人奖励' },
  { name: 'dailyLimit', label: '每日上限' },
  { name: 'inviteCount', label: '邀请数' },
  { name: 'qualifiedCount', label: '达标数' },
  { name: 'recordStatus', label: '记录状态', render: (value) => value ? inviteRecordStatusMap[value as keyof typeof inviteRecordStatusMap]?.text || value : '-' },
  { name: 'rewardStatus', label: '奖励状态', render: (value) => value ? rewardStatusMap[value as keyof typeof rewardStatusMap]?.text || value : '-' },
  { name: 'antiFraud', label: '防刷规则' },
  { name: 'recoveryRule', label: '奖励回收' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const InviteActivityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<InviteActivityRecord>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InviteActivityRecord | null>(null);
  const [detail, setDetail] = useState<InviteActivityRecord | null>(null);

  const activityQuery = useQuery({
    queryKey: ['inviteActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.inviteActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.inviteActivities.edit(values);
      } else {
        await api.marketing.inviteActivities.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteActivities'] });
      message.success(editingRecord ? '邀请活动已更新' : '邀请活动已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: InviteActivityRecord) => api.marketing.inviteActivities.edit({ ...record, status: record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteActivities'] });
      message.success('邀请活动状态已更新');
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
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1980 }}
        toolBarRender={() => [
          <Button key="fraud" onClick={() => navigate('/risk-schedule-alarms')}>防刷策略</Button>,
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
      />

      <Modal title={editingRecord ? `编辑邀请活动 · ${editingRecord.activityName}` : '新建邀请活动'} open={modalVisible} onOk={handleSubmit} confirmLoading={saveMutation.isPending} onCancel={closeModal} width={860}>
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
          <SchemaDetail record={detail} fields={inviteDetailFields} column={2} labelWidth={110} />
        ) : null}
      </Modal>

    </div>
  );
};

export default InviteActivityManagement;
