import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  compensationTypeOptions,
  messageChannelOptions,
  messageStatusOptions,
  ticketStatusOptions,
  ticketTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type AfterSaleTicketRecord, type MessageRecord, type MessageTemplateRecord } from '@/services/backendService';

const messageStatusMap = buildValueEnum(messageStatusOptions);
const messageChannelMap = buildValueEnum(messageChannelOptions);
const ticketStatusMap = buildValueEnum(ticketStatusOptions);
const ticketTypeMap = buildValueEnum(ticketTypeOptions);
const compensationTypeMap = buildValueEnum(compensationTypeOptions);

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
    mutationFn: (values: Record<string, unknown>) => api.message.messageRecords.add({ ...values, messageNo: values.messageNo || `MSG${Date.now()}`, status: 'SENT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRecords'] });
      message.success('消息已发送');
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
    { title: '订阅状态', dataIndex: 'subscribeStatus', width: 120, search: false, renderText: (value) => value || '-' },
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
    await api.afterSaleTicket.updateStatus(editingTicket.id, {
      ticketStatus: values.status,
      compensationType: values.compensationType,
      compensationValue: values.result,
      result: values.result,
    });
    message.success('工单处理结果已更新');
    queryClient.invalidateQueries({ queryKey: ['afterSaleTickets'] });
    setTicketModalVisible(false);
    setEditingTicket(null);
    ticketForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="客服工单" subtitle="管理故障反馈、订单投诉、消息发送和客服处理进度。" icon={<CustomerServiceOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="今日消息发送" value={messages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待处理工单" value={tickets.filter((item) => item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="消息失败" value={messages.filter((item) => item.status === 'FAILED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="高优先级工单" value={0} suffix="单" /></Card></Col>
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
                  <Button key="assign" onClick={() => {
                    const first = tickets[0];
                    if (first) {
                      api.afterSaleTicket.updateStatus(first.id, { ticketStatus: first.status || 'PROCESSING', compensationType: first.compensationType, compensationValue: first.result || '已分派客服处理' }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['afterSaleTickets'] });
                        message.success('已分派首个待处理工单');
                      });
                    }
                  }}>批量分派</Button>,
                  <Button key="new" type="primary" onClick={() => { setEditingTicket(null); ticketForm.resetFields(); setTicketModalVisible(true); }}>新建工单</Button>,
                ]}
                onSubmit={(values) => setTicketKeyword(String(values.keyword || ''))}
                onReset={() => setTicketKeyword('')}
              />
            ),
          },
        ]}
      />
      <Modal title={editingTicket ? `处理工单 · ${editingTicket.ticketNo}` : '新建工单'} open={ticketModalVisible} onOk={async () => {
        if (editingTicket) {
          await handleTicketSubmit();
          return;
        }
        const values = await ticketForm.validateFields();
        await createTicketMutation.mutateAsync({ ...values, ticketNo: values.ticketNo || `TK${Date.now()}`, ticketStatus: values.status || 'PENDING' });
        setTicketModalVisible(false);
        ticketForm.resetFields();
      }} confirmLoading={createTicketMutation.isPending} onCancel={() => setTicketModalVisible(false)} width={760}>
        <Form form={ticketForm} layout="vertical">
          <Row gutter={16}>
            {!editingTicket && <Col span={12}><Form.Item name="ticketNo" label="工单号"><Input /></Form.Item></Col>}
            {!editingTicket && <Col span={12}><Form.Item name="ticketType" label="工单类型" rules={[{ required: true, message: '请选择工单类型' }]}><Select options={ticketTypeOptions} /></Form.Item></Col>}
            <Col span={12}><Form.Item name="status" label="工单状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={ticketStatusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="compensationType" label="补偿类型"><Select options={compensationTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="owner" label="处理人"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="compensationAmount" label="补偿金额"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="result" label="处理结果" rules={[{ required: true, message: '请输入处理结果' }]}><Input.TextArea rows={4} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
      <Modal title={helperTitle} open={helperVisible} onCancel={() => setHelperVisible(false)} footer={null} width={640}>
        {helperTitle === '手工发送' ? (
          <Form form={messageForm} layout="vertical">
            <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input /></Form.Item>
            <Form.Item name="receiver" label="接收人" rules={[{ required: true, message: '请输入接收人' }]}><Input /></Form.Item>
            <Form.Item name="phone" label="手机号"><Input /></Form.Item>
            <Form.Item name="channel" label="渠道"><Select options={messageChannelOptions} /></Form.Item>
            <Button type="primary" loading={sendMessageMutation.isPending} onClick={async () => {
              const values = await messageForm.validateFields();
              await sendMessageMutation.mutateAsync(values);
              setHelperVisible(false);
            }}>发送</Button>
          </Form>
        ) : (
          <div style={{ color: 'rgba(0,0,0,0.65)' }}>该入口已接入现有后端数据，当前可查看模板并处理工单。</div>
        )}
      </Modal>
      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('messageNo' in detail ? serviceDeskDetailFields.message : 'templateName' in detail ? serviceDeskDetailFields.template : serviceDeskDetailFields.ticket) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default ServiceDeskManagement;
