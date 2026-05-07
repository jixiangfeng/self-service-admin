import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  compensationTypeOptions,
  messageChannelOptions,
  messageStatusOptions,
  ticketPriorityOptions,
  ticketSourceOptions,
  ticketStatusOptions,
  ticketTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface MessageRecord {
  id: string;
  scene: string;
  receiver: string;
  channel: string;
  template: string;
  status: string;
  sentAt: string;
  trigger: string;
}

interface TicketRecord {
  id: string;
  ticketNo: string;
  source: string;
  ticketType: string;
  orderNo: string;
  storeName: string;
  deviceCode: string;
  content: string;
  owner: string;
  priority: string;
  compensationType: string;
  compensationAmount: number;
  status: string;
  updatedAt: string;
  result?: string;
}

const messageStatusMap = buildValueEnum(messageStatusOptions);
const messageChannelMap = buildValueEnum(messageChannelOptions);
const ticketStatusMap = buildValueEnum(ticketStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);
const ticketSourceMap = buildValueEnum(ticketSourceOptions);
const ticketTypeMap = buildValueEnum(ticketTypeOptions);
const compensationTypeMap = buildValueEnum(compensationTypeOptions);

const initialMessages: MessageRecord[] = [
  { id: 'm1', scene: '支付成功通知', receiver: '张晨', channel: 'WECHAT', template: 'pay_success_v1', status: 'SENT', sentAt: '2026-04-18 09:14:00', trigger: '支付回调成功' },
  { id: 'm2', scene: '退款进度通知', receiver: '陈越', channel: 'IN_APP', template: 'refund_progress_v2', status: 'PENDING', sentAt: '2026-04-18 09:26:00', trigger: '退款状态变更' },
  { id: 'm3', scene: '邀请奖励到账', receiver: '李波', channel: 'WECHAT', template: 'invite_reward_v1', status: 'FAILED', sentAt: '2026-04-18 08:58:00', trigger: '奖励发放成功' },
];

const initialTickets: TicketRecord[] = [
  { id: 't1', ticketNo: 'CS20260418001', source: 'DEVICE_FAULT', ticketType: 'FAULT', orderNo: 'SO202604170113', storeName: '徐汇夜洗门店', deviceCode: 'DEV-XH-007', content: '风干设备启动失败，需要客服联系', owner: '客服-刘莎', priority: 'HIGH', compensationType: 'COUPON', compensationAmount: 5, status: 'PROCESSING', updatedAt: '2026-04-18 09:28:00', result: '已联系门店确认设备异常，准备补发 5 元券' },
  { id: 't2', ticketNo: 'CS20260417017', source: 'ORDER_COMPLAINT', ticketType: 'COMPLAINT', orderNo: 'SO202604170098', storeName: '虹桥旗舰洗车站', deviceCode: '-', content: '订单结束时间与实际不符', owner: '客服-韩梅', priority: 'MEDIUM', compensationType: 'BALANCE', compensationAmount: 8, status: 'PENDING', updatedAt: '2026-04-17 21:12:00' },
  { id: 't3', ticketNo: 'CS20260417005', source: 'STORE_EVALUATION', ticketType: 'CONSULT', orderNo: '-', storeName: '嘉定联营门店', deviceCode: '-', content: '门店指引不清晰', owner: '运营-何铭', priority: 'LOW', compensationType: 'NONE', compensationAmount: 0, status: 'CLOSED', updatedAt: '2026-04-17 19:05:00', result: '已同步门店更新指引牌文案' },
];

const ServiceDeskManagement: React.FC = () => {
  const [messageKeyword, setMessageKeyword] = useState('');
  const [ticketKeyword, setTicketKeyword] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [tickets, setTickets] = useState(initialTickets);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [detail, setDetail] = useState<TicketRecord | MessageRecord | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);
  const [ticketForm] = Form.useForm<TicketRecord & { reply?: string }>();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');

  const filteredMessages = useMemo(() => messages.filter((item) => containsKeyword(messageKeyword, [item.scene, item.receiver, item.template, item.trigger])), [messageKeyword, messages]);
  const filteredTickets = useMemo(() => tickets.filter((item) => containsKeyword(ticketKeyword, [item.ticketNo, item.source, item.content, item.owner, item.orderNo])), [ticketKeyword, tickets]);

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  const messageColumns: ProColumns<MessageRecord>[] = [
    { title: '触达场景', dataIndex: 'scene', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '场景 / 接收人 / 模板 / 触发条件' } },
    { title: '接收人', dataIndex: 'receiver', width: 120, search: false },
    { title: '渠道', dataIndex: 'channel', width: 160, valueType: 'select', valueEnum: messageChannelMap, render: (_, record) => renderStatusTag(record.channel, messageChannelMap) },
    { title: '模板编码', dataIndex: 'template', width: 160, search: false },
    { title: '触发条件', dataIndex: 'trigger', width: 180, search: false },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, messageStatusMap) },
    { title: '发送时间', dataIndex: 'sentAt', width: 180, search: false, render: (_, record) => formatDateTime(record.sentAt) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setMessages((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'SENT', sentAt: new Date().toISOString() } : item));
              message.success('消息已重发');
            }}
          >
            重发
          </Button>
        </Space>
      ),
    },
  ];

  const ticketColumns: ProColumns<TicketRecord>[] = [
    { title: '工单号', dataIndex: 'ticketNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '工单号 / 来源 / 订单 / 内容 / 处理人' } },
    { title: '来源', dataIndex: 'source', width: 140, valueType: 'select', valueEnum: ticketSourceMap, render: (_, record) => renderStatusTag(record.source, ticketSourceMap) },
    { title: '类型', dataIndex: 'ticketType', width: 120, valueType: 'select', valueEnum: ticketTypeMap, render: (_, record) => renderStatusTag(record.ticketType, ticketTypeMap) },
    { title: '关联订单', dataIndex: 'orderNo', width: 160, search: false },
    { title: '门店', dataIndex: 'storeName', width: 160, search: false },
    { title: '设备', dataIndex: 'deviceCode', width: 130, search: false },
    { title: '反馈内容', dataIndex: 'content', width: 260, search: false },
    { title: '处理人', dataIndex: 'owner', width: 140, search: false },
    { title: '优先级', dataIndex: 'priority', width: 120, search: false, render: (_, record) => renderStatusTag(record.priority, priorityMap) },
    { title: '补偿', dataIndex: 'compensationType', width: 120, render: (_, record) => renderStatusTag(record.compensationType, compensationTypeMap) },
    { title: '补偿金额', dataIndex: 'compensationAmount', width: 110, search: false },
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
              ticketForm.setFieldsValue({ ...record, reply: record.result });
              setTicketModalVisible(true);
            }}
          >
            处理
          </Button>
          <Button
            size="small"
            onClick={() => {
              setTickets((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'CLOSED', updatedAt: new Date().toISOString(), result: item.result || '已手动关闭工单' } : item));
              message.success('工单已关闭');
            }}
          >
            关闭
          </Button>
        </Space>
      ),
    },
  ];

  const handleTicketSubmit = async () => {
    const values = await ticketForm.validateFields();
    if (editingTicket) {
      setTickets((prev) =>
        prev.map((item) =>
          item.id === editingTicket.id
            ? {
                ...item,
                ...values,
                result: values.reply,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      message.success('工单处理结果已更新');
    } else {
      setTickets((prev) => [
        {
          id: `ticket-${Date.now()}`,
          ticketNo: values.ticketNo,
          source: values.source,
          orderNo: values.orderNo,
          storeName: values.storeName,
          deviceCode: values.deviceCode,
          content: values.content,
          owner: values.owner,
          priority: values.priority,
          ticketType: values.ticketType,
          compensationType: values.compensationType,
          compensationAmount: values.compensationAmount,
          status: values.status,
          updatedAt: new Date().toISOString(),
          result: values.reply,
        },
        ...prev,
      ]);
      message.success('工单已创建');
    }
    setTicketModalVisible(false);
    setEditingTicket(null);
    ticketForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="客服工单" subtitle="管理故障反馈、订单投诉、消息发送和客服处理进度。" icon={<CustomerServiceOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="今日消息发送" value={368} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待处理工单" value={tickets.filter((item) => item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="消息失败" value={messages.filter((item) => item.status === 'FAILED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="高优先级工单" value={tickets.filter((item) => item.priority === 'HIGH').length} suffix="单" /></Card></Col>
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
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1580 }}
                toolBarRender={() => [<Button key="template" onClick={() => openHelper('模板管理')}>模板管理</Button>, <Button key="send" type="primary" onClick={() => openHelper('手工发送')}>手工发送</Button>]}
                onSubmit={(values) => setMessageKeyword(String(values.keyword || ''))}
                onReset={() => setMessageKeyword('')}
              />
            ),
          },
          {
            key: 'ticket',
            label: '客服工单',
            children: (
              <ProTable<TicketRecord>
                cardBordered
                rowKey="id"
                columns={ticketColumns}
                dataSource={filteredTickets}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1860 }}
                toolBarRender={() => [
                  <Button key="assign" onClick={() => openHelper('批量分派')}>批量分派</Button>,
                  <Button
                    key="new"
                    type="primary"
                    onClick={() => {
                      setEditingTicket(null);
                      ticketForm.resetFields();
                      ticketForm.setFieldsValue({ priority: 'MEDIUM', status: 'PENDING', owner: '客服-待分派', compensationType: 'NONE', compensationAmount: 0 });
                      setTicketModalVisible(true);
                    }}
                  >
                    新建工单
                  </Button>,
                ]}
                onSubmit={(values) => setTicketKeyword(String(values.keyword || ''))}
                onReset={() => setTicketKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingTicket ? `处理工单 · ${editingTicket.ticketNo}` : '新建工单'}
        open={ticketModalVisible}
        onOk={handleTicketSubmit}
        onCancel={() => {
          setTicketModalVisible(false);
          setEditingTicket(null);
          ticketForm.resetFields();
        }}
        width={860}
        okText={editingTicket ? '保存处理结果' : '创建工单'}
      >
        <Form form={ticketForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item className="modal-span-2" name="ticketNo" label="工单号" rules={[{ required: true, message: '请输入工单号' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="source" label="来源" rules={[{ required: true, message: '请选择来源' }]}>
              <Select options={ticketSourceOptions} />
            </Form.Item>
            <Form.Item name="ticketType" label="工单类型" rules={[{ required: true, message: '请选择工单类型' }]}>
              <Select options={ticketTypeOptions} />
            </Form.Item>
            <Form.Item name="orderNo" label="关联订单">
              <Input />
            </Form.Item>
            <Form.Item name="storeName" label="关联门店">
              <Input />
            </Form.Item>
            <Form.Item name="deviceCode" label="关联设备">
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="处理人">
              <Input />
            </Form.Item>
            <Form.Item name="priority" label="优先级">
              <Select options={ticketPriorityOptions} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={ticketStatusOptions} />
            </Form.Item>
            <Form.Item name="compensationType" label="补偿类型">
              <Select options={compensationTypeOptions} />
            </Form.Item>
            <Form.Item name="compensationAmount" label="补偿金额">
              <Input />
            </Form.Item>
            <Form.Item className="modal-span-2" name="content" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="reply" label="处理说明 / 补偿方案">
              <Input.TextArea rows={4} placeholder="填写处理进度、补偿说明、关闭结论" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">该入口已具备可达弹框，后续可以继续拆成独立批量处理页面。</Descriptions.Item>
          <Descriptions.Item label="当前动作">{helperTitle}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default ServiceDeskManagement;
