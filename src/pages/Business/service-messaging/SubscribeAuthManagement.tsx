import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, message } from 'antd';
import { BellOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { messageChannelOptions, subscribeStatusOptions } from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type SubscribeRecord } from '@/services/backendService';

const channelMap = buildValueEnum(messageChannelOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);

const subscribeDetailFields: DetailField<SubscribeRecord>[] = [
  { name: 'appUserName', label: '用户' },
  { name: 'mobile', label: '手机号' },
  { name: 'templateCode', label: '模板编码' },
  { name: 'templateName', label: '模板名称' },
  { name: 'channel', label: '渠道', render: (value) => value ? channelMap[value as keyof typeof channelMap]?.text || value : '-' },
  { name: 'subscribeStatus', label: '订阅状态', render: (value) => value ? subscribeStatusMap[value as keyof typeof subscribeStatusMap]?.text || value : '-' },
  { name: 'subscribedAt', label: '订阅时间', render: (value) => formatDateTime(value) },
  { name: 'expiredAt', label: '过期时间', render: (value) => formatDateTime(value) },
];

const SubscribeAuthManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<SubscribeRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<SubscribeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const subscribeQuery = useQuery({
    queryKey: ['subscribeRecords', keyword],
    queryFn: async () => (await api.message.subscribes.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });

  const subscribes = subscribeQuery.data?.records || [];
  const saveSubscribeMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingRecord ? api.message.subscribes.edit({ ...values, id: editingRecord.id }) : api.message.subscribes.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribeRecords'] });
      message.success('订阅授权已保存');
    },
  });

  const dataSource = useMemo(
    () => subscribes.filter((item) => containsKeyword(keyword, [item.appUserName, item.mobile, item.templateCode, item.templateName, item.channel, item.subscribeStatus])),
    [keyword]
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveSubscribeMutation.mutateAsync(values);
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const columns: ProColumns<SubscribeRecord>[] = [
    { title: '用户', dataIndex: 'appUserName', width: 120, fixed: 'left' },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '模板编码', dataIndex: 'templateCode', width: 170 },
    { title: '模板名称', dataIndex: 'templateName', width: 180 },
    { title: '渠道', dataIndex: 'channel', width: 120, render: (_, record) => renderStatusTag(record.channel, channelMap) },
    { title: '订阅状态', dataIndex: 'subscribeStatus', width: 130, render: (_, record) => renderStatusTag(record.subscribeStatus, subscribeStatusMap) },
    { title: '订阅时间', dataIndex: 'subscribedAt', width: 180, render: (_, record) => formatDateTime(record.subscribedAt) },
    { title: '过期时间', dataIndex: 'expiredAt', width: 180, render: (_, record) => formatDateTime(record.expiredAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="edit" onClick={() => { setEditingRecord(record); form.setFieldsValue(record); setModalVisible(true); }}>维护</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="订阅授权中心" subtitle="维护用户消息模板授权、渠道订阅状态和授权过期时间。" icon={<BellOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="订阅记录" value={subscribes.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="有效授权" value={subscribes.filter((item) => item.subscribeStatus === 'SUBSCRIBED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="过期授权" value={subscribes.filter((item) => item.subscribeStatus === 'EXPIRED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="拒绝/取消" value={subscribes.filter((item) => item.subscribeStatus && ['REJECTED', 'CANCELLED'].includes(item.subscribeStatus)).length} suffix="条" /></Card></Col>
      </Row>

      <ProTable<SubscribeRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={subscribeQuery.isLoading}
        search={false}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1300 }}
        toolbar={{ search: { value: keyword, onSearch: (value) => setKeyword(value), placeholder: '用户 / 手机号 / 模板 / 状态' } }}
        toolBarRender={() => [<Button key="new" type="primary" onClick={() => { setEditingRecord(null); form.resetFields(); setModalVisible(true); }}>新增授权记录</Button>]}
      />

      <BusinessDetailModal title="订阅授权详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail && (
          <SchemaDetail record={detail} fields={subscribeDetailFields} column={2} labelWidth={110} />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '订阅授权维护' : '订阅授权新增'}
        title={editingRecord ? `维护授权 · ${editingRecord.appUserName}` : '新增订阅授权'}
        subtitle="把用户、消息模板、订阅渠道、授权状态和有效期放在同一个维护动作里。"
        meta={[editingRecord ? '编辑模式' : '新建模式', '消息订阅']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={saveSubscribeMutation.isPending}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        width={940}
        okText="保存授权"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<UserOutlined />} title="用户主体" desc="确认授权所属用户和联系方式，方便客服回查。">
              <div className="merchant-editor-fields">
                <Form.Item name="appUserName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input placeholder="例如：张三" /></Form.Item>
                <Form.Item name="mobile" label="手机号"><Input placeholder="例如：13800000000" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<BellOutlined />} title="模板与渠道" desc="明确授权模板、消息渠道和授权状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input placeholder="例如：WASH_DONE_NOTICE" /></Form.Item>
                <Form.Item name="templateName" label="模板名称"><Input placeholder="例如：洗车完成通知" /></Form.Item>
                <Form.Item name="channel" label="渠道" rules={[{ required: true, message: '请选择渠道' }]}><Select options={messageChannelOptions} placeholder="请选择渠道" /></Form.Item>
                <Form.Item name="subscribeStatus" label="订阅状态" rules={[{ required: true, message: '请选择订阅状态' }]}><Select options={subscribeStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ClockCircleOutlined />} title="有效期" desc="维护订阅开始和到期时间，减少过期授权无法触达的问题。">
              <div className="merchant-editor-fields">
                <Form.Item name="subscribedAt" label="订阅时间"><Input placeholder="2026-05-10 10:00:00" /></Form.Item>
                <Form.Item name="expiredAt" label="过期时间"><Input placeholder="2026-06-10 10:00:00" /></Form.Item>
                <Form.Item name="statusReason" label="状态说明"><Input placeholder="例如：用户主动授权 / 到期自动失效" /></Form.Item>
                <Form.Item name="operator" label="维护人"><Input placeholder="例如：系统管理员" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default SubscribeAuthManagement;
