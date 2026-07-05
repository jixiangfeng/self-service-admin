import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined, SendOutlined, ToolOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  compensationTypeOptions,
  messageChannelOptions,
  messageStatusOptions,
  subscribeStatusOptions,
  ticketStatusOptions,
  ticketTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type AfterSaleTicketRecord, type MessageRecord, type MessageTemplateRecord } from '@/services/backendService';

const messageStatusMap = buildValueEnum(messageStatusOptions);
const messageChannelMap = buildValueEnum(messageChannelOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);
const ticketStatusMap = buildValueEnum(ticketStatusOptions);
const ticketTypeMap = buildValueEnum(ticketTypeOptions);
const compensationTypeMap = buildValueEnum(compensationTypeOptions);
const ticketResultOptions = [
  { value: 'REMOTE_GUIDE', label: '远程引导' },
  { value: 'REFUND_PROCESS', label: '退款处理' },
  { value: 'COUPON_COMPENSATE', label: '补偿优惠券' },
  { value: 'DEVICE_REPAIR', label: '设备维修' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const serviceDeskDetailFields: Record<'ticket' | 'message' | 'template', DetailField<any>[]> = {
  ticket: [
    { name: 'ticketNo', label: '工单号' },
    { name: 'ticketType', label: '类型' },
    { name: 'orderNo', label: '关联订单' },
    { name: 'content', label: '反馈内容' },
    { name: 'owner', label: '处理人' },
    { name: 'compensationType', label: '补偿类型' },
    { name: 'compensationAmount', label: '补偿金额' },
    { name: 'compensationValue', label: '补偿内容' },
    { name: 'status', label: '状态' },
    { name: 'result', label: '处理结果' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  message: [
    { name: 'messageNo', label: '消息编号' },
    { name: 'templateCode', label: '模板编码' },
    { name: 'receiver', label: '接收人' },
    { name: 'phone', label: '手机号' },
    { name: 'channel', label: '渠道' },
    { name: 'subscribeStatus', label: '订阅状态' },
    { name: 'status', label: '发送状态' },
    { name: 'failReason', label: '失败原因' },
    { name: 'sentAt', label: '发送时间', render: (value) => formatDateTime(value) },
  ],
  template: [
    { name: 'templateCode', label: '模板编码' },
    { name: 'templateName', label: '模板名称' },
    { name: 'scene', label: '场景' },
    { name: 'channel', label: '发送渠道' },
    { name: 'triggerCondition', label: '触发条件' },
    { name: 'targetUser', label: '目标用户' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const ServiceDeskManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [messageKeyword, setMessageKeyword] = useState('');
  const [ticketKeyword, setTicketKeyword] = useState('');
  const [detail, setDetail] = useState<AfterSaleTicketRecord | MessageRecord | MessageTemplateRecord | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<AfterSaleTicketRecord | null>(null);
  const [ticketForm] = Form.useForm();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [messageForm] = Form.useForm();

  const messageQuery = useQuery({
    queryKey: ['messageRecords', messageKeyword],
    queryFn: async () => (await api.message.messageRecords.page({ pageNum: 1, pageSize: 200, keyword: messageKeyword || undefined })).data,
  });
  const templateQuery = useQuery({
    queryKey: ['messageTemplates', messageKeyword],
    queryFn: async () => (await api.message.templates.page({ pageNum: 1, pageSize: 200 })).data,
  });
  const ticketQuery = useQuery({
    queryKey: ['afterSaleTickets', ticketKeyword],
    queryFn: async () => (await api.afterSaleTicket.page({ pageNum: 1, pageSize: 200, keyword: ticketKeyword || undefined })).data,
  });

  const messages = messageQuery.data?.records || [];
  const templates = templateQuery.data?.records || [];
  const tickets = ticketQuery.data?.records || [];
  const createTicketMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.afterSaleTicket.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afterSaleTickets'] });
      message.success('客服工单已创建');
    },
  });
  const sendMessageMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.message.messageRecords.add({ ...values, status: 'SENT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRecords'] });
      message.success('消息已发送');
    },
  });
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Record<string, unknown> }) => api.afterSaleTicket.updateStatus(id, values),
    onSuccess: () => {
      message.success('工单处理结果已更新');
      queryClient.invalidateQueries({ queryKey: ['afterSaleTickets'] });
    },
  });

  const filteredMessages = useMemo(() => messages.filter((item) => containsKeyword(messageKeyword, [item.messageNo, item.templateCode, item.receiver, item.phone, item.failReason])), [messageKeyword, messages]);
  const filteredTickets = useMemo(() => tickets.filter((item) => containsKeyword(ticketKeyword, [item.ticketNo, item.ticketType, item.content, item.owner, item.orderNo])), [ticketKeyword, tickets]);

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  const messageColumns: ProColumns<MessageRecord>[] = [
    { title: '消息编号', dataIndex: 'messageNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '消息编号 / 模板 / 接收人 / 手机号' } },
    { title: '模板编码', dataIndex: 'templateCode', width: 160, search: false },
    { title: '接收人', dataIndex: 'receiver', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '渠道', dataIndex: 'channel', width: 140, valueType: 'select', valueEnum: messageChannelMap, render: (_, record) => renderStatusTag(record.channel, messageChannelMap) },
    { title: '订阅状态', dataIndex: 'subscribeStatus', width: 120, search: false, render: (_, record) => renderStatusTag(record.subscribeStatus, subscribeStatusMap) },
    { title: '发送状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: messageStatusMap, render: (_, record) => renderStatusTag(record.status, messageStatusMap) },
    { title: '失败原因', dataIndex: 'failReason', width: 180, search: false, renderText: (value) => value || '-' },
    { title: '发送时间', dataIndex: 'sentAt', width: 180, search: false, render: (_, record) => formatDateTime(record.sentAt) },
    {
      title: '操作',
      width: 120,
      search: false,
      render: (_, record) => (
        <Button size="small" onClick={() => { setDetail(record); }}>
          详情
        </Button>
      ),
    },
  ];

  const ticketColumns: ProColumns<AfterSaleTicketRecord>[] = [
    { title: '工单号', dataIndex: 'ticketNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '工单号 / 类型 / 订单 / 内容' } },
    { title: '来源', dataIndex: 'source', width: 140, renderText: () => '-' },
    { title: '类型', dataIndex: 'ticketType', width: 120, valueType: 'select', valueEnum: ticketTypeMap, render: (_, record) => renderStatusTag(record.ticketType, ticketTypeMap) },
    { title: '关联订单', dataIndex: 'orderNo', width: 160, search: false, renderText: (value) => value || '-' },
    { title: '门店', dataIndex: 'storeName', width: 160, search: false, renderText: () => '-' },
    { title: '设备', dataIndex: 'deviceCode', width: 130, search: false, renderText: () => '-' },
    { title: '反馈内容', dataIndex: 'content', width: 260, search: false, renderText: (value) => value || '-' },
    { title: '处理人', dataIndex: 'owner', width: 140, search: false, renderText: (value) => value || '-' },
    { title: '优先级', dataIndex: 'priority', width: 120, search: false, renderText: () => '-' },
    { title: '补偿', dataIndex: 'compensationType', width: 120, render: (_, record) => renderStatusTag(record.compensationType, compensationTypeMap) },
    { title: '补偿金额', dataIndex: 'compensationAmount', width: 110, search: false, renderText: (value) => String(value ?? '-') },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: ticketStatusMap, render: (_, record) => renderStatusTag(record.status, ticketStatusMap) },
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
              setEditingTicket(record);
              ticketForm.setFieldsValue({ ...record, result: record.result });
              setTicketModalVisible(true);
            }}
          >
            处理
          </Button>
        </Space>
      ),
    },
  ];

  const handleTicketSubmit = async () => {
    const values = await ticketForm.validateFields();
    if (!editingTicket) {
      return;
    }
    const result = compactJoin([
      values.resultAction ? `处理动作：${optionLabel(ticketResultOptions, values.resultAction)}` : undefined,
      values.owner ? `处理人：${values.owner}` : undefined,
      values.compensationType ? `补偿类型：${optionLabel(compensationTypeOptions, values.compensationType)}` : undefined,
      values.compensationAmount ? `补偿金额：${values.compensationAmount}元` : undefined,
      values.supplement ? `补充说明：${values.supplement}` : undefined,
    ]);
    const ticket = editingTicket;
    showBusinessConfirm({
      title: '确认提交工单处理结果',
      content: `确定更新工单「${ticket.ticketNo || ticket.id}」吗？处理结果会同步影响售后进度。`,
      okText: '确认提交',
      danger: values.status === 'CLOSED',
      onOk: async () => {
        await updateTicketMutation.mutateAsync({
          id: ticket.id,
          values: {
            ticketStatus: values.status,
            compensationType: values.compensationType,
            compensationValue: result,
            result,
          },
        });
        setTicketModalVisible(false);
        setEditingTicket(null);
        ticketForm.resetFields();
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="客服工单" subtitle="管理故障反馈、订单投诉、消息发送和客服处理进度。" icon={<CustomerServiceOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="今日消息发送" value={messages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待处理工单" value={tickets.filter((item) => item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="消息失败" value={messages.filter((item) => item.status === 'FAILED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="高优先级工单" value={tickets.filter((item) => ['DEVICE_FAULT', 'REFUND_APPEAL', 'COMPLAINT'].includes(item.ticketType || '') && item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
      </Row>
      <Tabs
        items={[
          {
            key: 'message',
            label: '消息通知',
            children: (
              <ProTable<MessageRecord>
                cardBordered
                rowKey="id"
                columns={messageColumns}
                dataSource={filteredMessages}
                loading={messageQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1580 }}
                toolBarRender={() => [<Button key="template" onClick={() => openHelper(`模板管理 · ${templates.length} 个模板`)}>模板管理</Button>, <Button key="send" type="primary" onClick={() => { messageForm.resetFields(); openHelper('手工发送'); }}>手工发送</Button>]}
                onSubmit={(values) => setMessageKeyword(String(values.keyword || ''))}
                onReset={() => setMessageKeyword('')}
              />
            ),
          },
          {
            key: 'ticket',
            label: '客服工单',
            children: (
              <ProTable<AfterSaleTicketRecord>
                cardBordered
                rowKey="id"
                columns={ticketColumns}
                dataSource={filteredTickets}
                loading={ticketQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1740 }}
                        toolBarRender={() => [
                          <Button key="new" type="primary" onClick={() => { setEditingTicket(null); ticketForm.resetFields(); setTicketModalVisible(true); }}>新建工单</Button>,
                        ]}
                onSubmit={(values) => setTicketKeyword(String(values.keyword || ''))}
                onReset={() => setTicketKeyword('')}
              />
            ),
          },
        ]}
      />
      <BusinessEditorModal
        eyebrow={editingTicket ? '工单处理' : '工单创建'}
        title={editingTicket ? `处理工单 · ${editingTicket.ticketNo}` : '新建工单'}
        subtitle="把工单状态、补偿和处理结果拆成结构化字段，提交时生成客服处理结果。"
        meta={[editingTicket ? '处理' : '新增', '客服工单']}
        open={ticketModalVisible}
        onOk={async () => {
        if (editingTicket) {
          await handleTicketSubmit();
          return;
        }
        const values = await ticketForm.validateFields();
        const result = compactJoin([
          values.resultAction ? `处理动作：${optionLabel(ticketResultOptions, values.resultAction)}` : undefined,
          values.supplement ? `补充说明：${values.supplement}` : undefined,
        ]);
        const { ticketNo, ...payload } = values;
        await createTicketMutation.mutateAsync({ ...payload, ticketStatus: values.status || 'PENDING', result });
        setTicketModalVisible(false);
        ticketForm.resetFields();
      }}
                confirmLoading={editingTicket ? updateTicketMutation.isPending : createTicketMutation.isPending}
                onCancel={() => { setTicketModalVisible(false); setEditingTicket(null); ticketForm.resetFields(); }}
        width={1080}
        okText={editingTicket ? '提交处理' : '创建工单'}
      >
        <Form form={ticketForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CustomerServiceOutlined />} title="工单基础" desc="维护工单类型和当前状态。">
              <div className="merchant-editor-fields">
                {editingTicket ? <Form.Item name="ticketNo" label="工单号"><Input disabled placeholder="工单号不可编辑" /></Form.Item> : null}
                {!editingTicket ? <Form.Item name="ticketType" label="工单类型" rules={[{ required: true, message: '请选择工单类型' }]}><Select options={ticketTypeOptions} placeholder="请选择工单类型" /></Form.Item> : null}
                <Form.Item name="status" label="工单状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={ticketStatusOptions} placeholder="请选择工单状态" /></Form.Item>
                <Form.Item name="owner" label="处理人"><Input placeholder="例如：客服-王敏" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ToolOutlined />} title="处理与补偿" desc="配置处理动作、补偿类型和补偿金额。">
              <div className="merchant-editor-fields">
                <Form.Item name="resultAction" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}><Select options={ticketResultOptions} placeholder="请选择处理动作" /></Form.Item>
                <Form.Item name="compensationType" label="补偿类型"><Select options={compensationTypeOptions} placeholder="请选择补偿类型" /></Form.Item>
                <Form.Item name="compensationAmount" label="补偿金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：用户反馈设备未启动，已补偿洗车券" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
      <BusinessEditorModal
        eyebrow={helperTitle === '手工发送' ? '手工消息' : '模板管理'}
        title={helperTitle}
        subtitle={helperTitle === '手工发送' ? '录入模板、接收人和发送渠道后立即发送消息。' : '当前入口用于查看已接入的消息模板。'}
        meta={['客服工单', helperTitle]}
        open={helperVisible}
        onCancel={() => setHelperVisible(false)}
        footer={null}
        width={760}
      >
        {helperTitle === '手工发送' ? (
          <Form form={messageForm} layout="vertical" className="merchant-editor-form">
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<SendOutlined />} title="发送对象" desc="维护模板、接收人、手机号和发送渠道。">
                <div className="merchant-editor-fields">
                  <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input placeholder="例如：MSG-ORDER-PAID" /></Form.Item>
                  <Form.Item name="receiver" label="接收人" rules={[{ required: true, message: '请输入接收人' }]}><Input placeholder="例如：张三" /></Form.Item>
                  <Form.Item name="phone" label="手机号"><Input placeholder="请输入手机号" /></Form.Item>
                  <Form.Item name="channel" label="渠道"><Select options={messageChannelOptions} placeholder="请选择渠道" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <Button type="primary" loading={sendMessageMutation.isPending} onClick={async () => {
                const values = await messageForm.validateFields();
                await sendMessageMutation.mutateAsync(values);
                setHelperVisible(false);
              }}>发送</Button>
            </div>
          </Form>
        ) : (
          <div style={{ color: 'rgba(0,0,0,0.65)' }}>该入口已接入现有后端数据，当前可查看模板并处理工单。</div>
        )}
      </BusinessEditorModal>
      <BusinessDetailModal title="客服工单详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('messageNo' in detail ? serviceDeskDetailFields.message : 'templateName' in detail ? serviceDeskDetailFields.template : serviceDeskDetailFields.ticket) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default ServiceDeskManagement;
