import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { messageChannelOptions, messageStatusOptions, subscribeStatusOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type MessageRecord, type MessageTemplateRecord } from '@/services/backendService';

const statusMap = buildValueEnum(templateStatusOptions);
const channelMap = buildValueEnum(messageChannelOptions);
const messageStatusMap = buildValueEnum(messageStatusOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);

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
  const [form] = Form.useForm<MessageTemplateRecord>();
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
            onClick={() => {
              api.message.templates.edit({ ...record, status: record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED' }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
                message.success('模板状态已更新');
              });
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
      width: 170,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            loading={resendMutation.isPending}
            onClick={() => resendMutation.mutate(record.id)}
          >
            重发
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveTemplateMutation.mutateAsync(values as unknown as Record<string, unknown>);
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

      <Modal title={editingRecord ? `编辑消息模板 · ${editingRecord.templateName}` : '新建消息模板'} open={modalVisible} onOk={handleSubmit} confirmLoading={saveTemplateMutation.isPending} onCancel={closeModal} width={860}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input /></Form.Item>
            <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input /></Form.Item>
            <Form.Item name="scene" label="场景"><Input /></Form.Item>
            <Form.Item name="channel" label="发送渠道"><Select options={messageChannelOptions} /></Form.Item>
            <Form.Item name="targetUser" label="目标用户"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={templateStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="triggerCondition" label="触发条件"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={detail && 'messageNo' in detail ? '消息发送详情' : '消息模板详情'} open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('messageNo' in detail ? messageRecordDetailFields : messageTemplateDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default MessageCenterManagement;
