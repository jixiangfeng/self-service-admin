import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { messageChannelOptions, messageStatusOptions, subscribeStatusOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type MessageRecord, type MessageTemplateRecord } from '@/services/backendService';

const statusMap = buildValueEnum(templateStatusOptions);
const channelMap = buildValueEnum(messageChannelOptions);
const messageStatusMap = buildValueEnum(messageStatusOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);
const triggerSceneOptions = [
  { value: 'ORDER_PAID', label: '订单支付成功' },
  { value: 'SERVICE_DONE', label: '服务完成' },
  { value: 'COUPON_EXPIRE', label: '券即将过期' },
  { value: 'TICKET_UPDATE', label: '工单状态更新' },
];
const targetUserOptions = [
  { value: 'ALL_USER', label: '全部用户' },
  { value: 'ORDER_USER', label: '下单用户' },
  { value: 'MEMBER_USER', label: '会员用户' },
  { value: 'STORE_OWNER', label: '门店负责人' },
];
type MessageTemplateFormRecord = MessageTemplateRecord & {
  triggerScene?: string;
  delayMinutes?: number;
  triggerLimit?: string;
};
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const messageTemplateDetailFields: DetailField<MessageTemplateRecord>[] = [
  { name: 'templateCode', label: '模板编码' },
  { name: 'templateName', label: '模板名称' },
  { name: 'scene', label: '场景' },
  { name: 'channel', label: '发送渠道', render: (value) => value ? channelMap[value as keyof typeof channelMap]?.text || value : '-' },
  { name: 'triggerCondition', label: '触发条件' },
  { name: 'targetUser', label: '目标用户' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const messageRecordDetailFields: DetailField<MessageRecord>[] = [
  { name: 'messageNo', label: '消息编号' },
  { name: 'templateCode', label: '模板编码' },
  { name: 'receiver', label: '接收人' },
  { name: 'phone', label: '手机号' },
  { name: 'channel', label: '渠道', render: (value) => value ? channelMap[value as keyof typeof channelMap]?.text || value : '-' },
  { name: 'subscribeStatus', label: '订阅状态', render: (value) => value ? subscribeStatusMap[value as keyof typeof subscribeStatusMap]?.text || value : '-' },
  { name: 'status', label: '发送状态', render: (value) => value ? messageStatusMap[value as keyof typeof messageStatusMap]?.text || value : '-' },
  { name: 'failReason', label: '失败原因' },
  { name: 'sentAt', label: '发送时间', render: (value) => formatDateTime(value) },
];

const MessageCenterManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MessageTemplateFormRecord>();
  const [keyword, setKeyword] = useState('');
  const [messageKeyword, setMessageKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MessageTemplateRecord | null>(null);
  const [detail, setDetail] = useState<MessageTemplateRecord | MessageRecord | null>(null);

  const templateQuery = useQuery({
    queryKey: ['messageTemplates', keyword, statusFilter],
    queryFn: async () => (await api.message.templates.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const messageQuery = useQuery({
    queryKey: ['messageRecords', messageKeyword],
    queryFn: async () => (await api.message.messageRecords.page({ pageNum: 1, pageSize: 200, keyword: messageKeyword || undefined })).data,
  });

  const records = templateQuery.data?.records || [];
  const messages = messageQuery.data?.records || [];
  const saveTemplateMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingRecord ? api.message.templates.edit({ ...values, id: editingRecord.id }) : api.message.templates.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      message.success('消息模板已保存');
    },
  });
  const resendMutation = useMutation({
    mutationFn: (id: number) => api.message.messageRecords.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRecords'] });
      message.success('消息已重新发送');
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const confirmTemplateStatus = (record: MessageTemplateRecord) => {
    const nextEnabled = record.status !== 'ENABLED';
    showBusinessConfirm({
      title: `确认${nextEnabled ? '启用' : '暂停'}消息模板`,
      content: `确定${nextEnabled ? '启用' : '暂停'}模板「${record.templateName || record.templateCode}」吗？该操作会影响后续消息触发。`,
      okText: `确认${nextEnabled ? '启用' : '暂停'}`,
      danger: !nextEnabled,
      onOk: async () => {
        await api.message.templates.edit({ ...record, status: nextEnabled ? 'ENABLED' : 'DISABLED' });
        queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
        message.success('模板状态已更新');
      },
    });
  };

  const confirmResendMessage = (record: MessageRecord) => {
    showBusinessConfirm({
      title: '确认重发消息',
      content: `确定重新发送消息「${record.messageNo || record.id}」吗？用户可能会再次收到通知。`,
      okText: '确认重发',
      onOk: () => resendMutation.mutate(record.id),
    });
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.templateCode, item.templateName, item.scene, item.channel, item.triggerCondition, item.targetUser]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const messageDataSource = useMemo(
    () => messages.filter((item) => containsKeyword(messageKeyword, [item.messageNo, item.templateCode, item.receiver, item.phone, item.failReason])),
    [messageKeyword, messages]
  );

  const columns: ProColumns<MessageTemplateRecord>[] = [
    {
      title: '模板',
      dataIndex: 'templateName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.templateName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.templateCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '模板 / 编码 / 场景 / 渠道 / 触发条件' } },
    { title: '场景', dataIndex: 'scene', width: 160, search: false },
    { title: '发送渠道', dataIndex: 'channel', width: 180, valueType: 'select', valueEnum: channelMap, render: (_, record) => renderStatusTag(record.channel, channelMap) },
    { title: '触发条件', dataIndex: 'triggerCondition', width: 200, search: false },
    { title: '目标用户', dataIndex: 'targetUser', width: 120, search: false },
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
            onClick={() => confirmTemplateStatus(record)}
          >
            {record.status === 'ENABLED' ? '暂停' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const messageColumns: ProColumns<MessageRecord>[] = [
    { title: '消息编号', dataIndex: 'messageNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '消息编号 / 模板 / 接收人 / 手机号' } },
    { title: '模板编码', dataIndex: 'templateCode', width: 160, search: false },
    { title: '接收人', dataIndex: 'receiver', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '渠道', dataIndex: 'channel', width: 140, valueType: 'select', valueEnum: channelMap, render: (_, record) => renderStatusTag(record.channel, channelMap) },
    { title: '订阅状态', dataIndex: 'subscribeStatus', width: 120, valueType: 'select', valueEnum: subscribeStatusMap, render: (_, record) => renderStatusTag(record.subscribeStatus, subscribeStatusMap) },
    { title: '发送状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: messageStatusMap, render: (_, record) => renderStatusTag(record.status, messageStatusMap) },
    { title: '失败原因', dataIndex: 'failReason', width: 180, search: false },
    { title: '发送时间', dataIndex: 'sentAt', width: 180, search: false, render: (_, record) => formatDateTime(record.sentAt) },
    {
      title: '操作',
      width: 170,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            loading={resendMutation.isPending}
            onClick={() => confirmResendMessage(record)}
          >
            重发
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const triggerCondition = compactJoin([
      values.triggerScene ? `触发场景：${optionLabel(triggerSceneOptions, values.triggerScene as string)}` : undefined,
      values.delayMinutes ? `延迟发送：${values.delayMinutes}分钟` : undefined,
      values.triggerLimit ? `频控：${values.triggerLimit}` : undefined,
    ]);
    await saveTemplateMutation.mutateAsync({ ...(values as unknown as Record<string, unknown>), triggerCondition, targetUser: values.targetUser || optionLabel(targetUserOptions, values.targetUser as string) });
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="消息中心" subtitle="补齐消息模板的编码、场景、渠道、触发条件、目标用户和状态控制。" icon={<CustomerServiceOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="消息模板" value={templateQuery.data?.total ?? records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="发送渠道" value={new Set(records.map((item) => item.channel).filter(Boolean)).size} suffix="类" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="触发场景" value={new Set(records.map((item) => item.scene).filter(Boolean)).size} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用模板" value={records.filter((item) => item.status === 'ENABLED').length} suffix="个" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'template',
            label: '消息模板',
            children: (
              <ProTable<MessageTemplateRecord>
                cardBordered
                rowKey="id"
                columns={columns}
                dataSource={dataSource}
                loading={templateQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1760 }}
                toolBarRender={() => [
                  <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT' }); setModalVisible(true); }}>
                    新建模板
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
            ),
          },
          {
            key: 'records',
            label: '发送记录',
            children: (
              <ProTable<MessageRecord>
                cardBordered
                rowKey="id"
                columns={messageColumns}
                dataSource={messageDataSource}
                loading={messageQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1740 }}
                onSubmit={(values) => setMessageKeyword(String(values.keyword || ''))}
                onReset={() => setMessageKeyword('')}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="消息模板配置"
        title={editingRecord ? `编辑消息模板 · ${editingRecord.templateName}` : '新建消息模板'}
        subtitle="把触发条件拆成场景、延迟、频控和目标用户，运营不需要手写触发规则。"
        meta={[editingRecord ? '编辑' : '新增', '消息中心']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={saveTemplateMutation.isPending}
        onCancel={closeModal}
        width={1080}
        okText="保存模板"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CustomerServiceOutlined />} title="模板基础" desc="定义模板编码、名称、场景和渠道。">
              <div className="merchant-editor-fields">
                <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input placeholder="例如：MSG-ORDER-PAID" /></Form.Item>
                <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input placeholder="例如：订单支付成功提醒" /></Form.Item>
                <Form.Item name="scene" label="场景"><Input placeholder="例如：订单通知" /></Form.Item>
                <Form.Item name="channel" label="发送渠道"><Select options={messageChannelOptions} placeholder="请选择发送渠道" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={templateStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SendOutlined />} title="触发策略" desc="配置触发场景、发送延迟、频控和目标用户。">
              <div className="merchant-editor-fields">
                <Form.Item name="triggerScene" label="触发场景"><Select options={triggerSceneOptions} placeholder="请选择触发场景" /></Form.Item>
                <Form.Item name="delayMinutes" label="延迟发送"><Input placeholder="例如：0 或 10" /></Form.Item>
                <Form.Item name="triggerLimit" label="频控"><Input placeholder="例如：每用户每天最多1次" /></Form.Item>
                <Form.Item name="targetUser" label="目标用户"><Select options={targetUserOptions} placeholder="请选择目标用户" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title={detail && 'messageNo' in detail ? '消息发送详情' : '消息模板详情'} open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('messageNo' in detail ? messageRecordDetailFields : messageTemplateDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default MessageCenterManagement;
