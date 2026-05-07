import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { messageChannelOptions, messageStatusOptions, subscribeStatusOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';

interface MessageTemplateRecord {
  id: string;
  templateCode: string;
  templateName: string;
  scene: string;
  channel: string;
  trigger: string;
  targetUser: string;
  status: string;
  updatedAt: string;
}

interface MessageRecord {
  id: string;
  messageNo: string;
  templateCode: string;
  receiver: string;
  phone: string;
  channel: string;
  subscribeStatus: string;
  status: string;
  failReason?: string;
  sentAt: string;
}

const statusMap = buildValueEnum(templateStatusOptions);
const channelMap = buildValueEnum(messageChannelOptions);
const messageStatusMap = buildValueEnum(messageStatusOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);

const initialTemplates: MessageTemplateRecord[] = [
  { id: 'mt1', templateCode: 'MSG-PAY-SUCC', templateName: '支付成功模板', scene: '支付结果通知', channel: 'WECHAT', trigger: '支付回调成功', targetUser: '下单用户', status: 'ENABLED', updatedAt: '2026-04-18 09:02:00' },
  { id: 'mt2', templateCode: 'MSG-INVITE', templateName: '邀请奖励到账模板', scene: '活动奖励提醒', channel: 'IN_APP', trigger: '发奖成功', targetUser: '邀请人', status: 'DRAFT', updatedAt: '2026-04-17 20:12:00' },
  { id: 'mt3', templateCode: 'MSG-REFUND', templateName: '退款进度模板', scene: '退款通知', channel: 'SMS', trigger: '退款状态变更', targetUser: '退款申请人', status: 'ENABLED', updatedAt: '2026-04-17 18:50:00' },
];

const initialMessages: MessageRecord[] = [
  { id: 'msg1', messageNo: 'MS202604180001', templateCode: 'MSG-PAY-SUCC', receiver: '张晨', phone: '13800001111', channel: 'WECHAT', subscribeStatus: 'SUBSCRIBED', status: 'SENT', sentAt: '2026-04-18 09:14:00' },
  { id: 'msg2', messageNo: 'MS202604180002', templateCode: 'MSG-REFUND', receiver: '陈越', phone: '13800002222', channel: 'SMS', subscribeStatus: 'SUBSCRIBED', status: 'PENDING', sentAt: '2026-04-18 09:26:00' },
  { id: 'msg3', messageNo: 'MS202604180003', templateCode: 'MSG-INVITE', receiver: '李波', phone: '13800003333', channel: 'WECHAT', subscribeStatus: 'EXPIRED', status: 'FAILED', failReason: '订阅授权过期', sentAt: '2026-04-18 08:58:00' },
];

const MessageCenterManagement: React.FC = () => {
  const [form] = Form.useForm<MessageTemplateRecord>();
  const [records, setRecords] = useState(initialTemplates);
  const [messages, setMessages] = useState(initialMessages);
  const [keyword, setKeyword] = useState('');
  const [messageKeyword, setMessageKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MessageTemplateRecord | null>(null);
  const [detail, setDetail] = useState<MessageTemplateRecord | null>(null);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.templateCode, item.templateName, item.scene, item.channel, item.trigger, item.targetUser]) &&
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
    { title: '触发条件', dataIndex: 'trigger', width: 200, search: false },
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
            onClick={() => {
              api.message.templates.page({});
              setRecords((prev) => prev.map((item) => item.id === record.id ? { ...item, status: item.status === 'ENABLED' ? 'PAUSED' : 'ENABLED', updatedAt: new Date().toISOString() } : item));
              message.success('消息模板状态已更新');
            }}
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
      width: 120,
      search: false,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setMessages((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'SENT', failReason: undefined, sentAt: new Date().toISOString() } : item));
            message.success('消息已重发');
          }}
        >
          重发
        </Button>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRecord) {
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)));
      message.success('消息模板已更新');
    } else {
      setRecords((prev) => [{ ...values, id: `message-${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
      message.success('消息模板已创建');
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="消息中心" subtitle="补齐消息模板的编码、场景、渠道、触发条件、目标用户和状态控制。" icon={<CustomerServiceOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="消息模板" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="发送渠道" value={3} suffix="类" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="触发场景" value={records.length + 2} suffix="种" /></Card></Col>
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
                request={async (params) => {
                  const res = await api.message.templates.page(params);
                  return { data: res.data.records as any, success: true, total: res.data.total };
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
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1740 }}
                onSubmit={(values) => setMessageKeyword(String(values.keyword || ''))}
                onReset={() => setMessageKeyword('')}
        request={async (params: any) => {
          const res = await api.message.messageRecords.page(params);
          return { data: res.data.records as any, success: true, total: res.data.total };
        }}
              />
            ),
          },
        ]}
      />

      <Modal title={editingRecord ? `编辑消息模板 · ${editingRecord.templateName}` : '新建消息模板'} open={modalVisible} onOk={handleSubmit} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input /></Form.Item>
            <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input /></Form.Item>
            <Form.Item name="scene" label="场景"><Input /></Form.Item>
            <Form.Item name="channel" label="发送渠道"><Select options={messageChannelOptions} /></Form.Item>
            <Form.Item name="targetUser" label="目标用户"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={templateStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="trigger" label="触发条件"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="消息模板详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="模板编码">{detail.templateCode}</Descriptions.Item>
            <Descriptions.Item label="模板名称">{detail.templateName}</Descriptions.Item>
            <Descriptions.Item label="场景">{detail.scene}</Descriptions.Item>
            <Descriptions.Item label="发送渠道">{channelMap[detail.channel]?.text || detail.channel}</Descriptions.Item>
            <Descriptions.Item label="触发条件">{detail.trigger}</Descriptions.Item>
            <Descriptions.Item label="目标用户">{detail.targetUser}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
};

export default MessageCenterManagement;
