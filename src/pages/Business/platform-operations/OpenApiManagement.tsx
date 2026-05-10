import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApiOutlined, KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusOptions } from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api, { type OpenApiCallLogRecord, type OpenApiClientRecord } from '@/services/backendService';

type DetailRecord = OpenApiClientRecord | OpenApiCallLogRecord;

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

const callStatusOptions = [
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' },
];

const statusMap = buildValueEnum(statusOptions);
const methodMap = buildValueEnum(methodOptions);
const callStatusMap = buildValueEnum(callStatusOptions);
const rateLimitWindowOptions = [
  { value: '分钟', label: '每分钟' },
  { value: '小时', label: '每小时' },
  { value: '天', label: '每天' },
];

const openApiDetailFields: Record<'client' | 'log', DetailField<any>[]> = {
  client: [
    { name: 'clientName', label: '客户端名称' },
    { name: 'clientCode', label: '客户端编码' },
    { name: 'appKey', label: 'AppKey' },
    { name: 'appSecret', label: 'AppSecret' },
    { name: 'callbackUrl', label: '回调地址' },
    { name: 'ipWhitelist', label: 'IP 白名单' },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  log: [
    { name: 'clientName', label: '客户端' },
    { name: 'apiPath', label: '接口路径' },
    { name: 'requestMethod', label: '方法' },
    { name: 'requestPayload', label: '请求内容' },
    { name: 'responsePayload', label: '响应内容' },
    { name: 'responseCode', label: '响应码' },
    { name: 'callStatus', label: '状态' },
    { name: 'costMs', label: '耗时' },
    { name: 'createdAt', label: '调用时间', render: (value) => formatDateTime(value) },
  ],
};

const OpenApiManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const clientsQuery = useQuery({ queryKey: ['open-api-clients', queryParams], queryFn: () => api.openApi.clients.page(queryParams) });
  const callLogsQuery = useQuery({ queryKey: ['open-api-call-logs', queryParams], queryFn: () => api.openApi.callLogs.page(queryParams) });

  const clients = clientsQuery.data?.data.records ?? [];
  const callLogs = callLogsQuery.data?.data.records ?? [];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const rateLimit = values.rateLimitCount ? `每${values.rateLimitWindow || '分钟'} ${values.rateLimitCount} 次` : values.rateLimit;
    const { rateLimitCount, rateLimitWindow, ...payload } = values;
    await api.openApi.clients.add({ ...payload, rateLimit });
    await queryClient.invalidateQueries({ queryKey: ['open-api-clients'] });
    setModalVisible(false);
    message.success('已保存到后端');
  };

  const clientColumns = useMemo<ProColumns<OpenApiClientRecord>[]>(() => [
    { title: '客户端名称', dataIndex: 'clientName', width: 180, fixed: 'left' },
    { title: '客户端编码', dataIndex: 'clientCode', width: 180 },
    { title: 'AppKey', dataIndex: 'appKey', width: 180 },
    { title: 'AppSecret', dataIndex: 'appSecret', width: 120 },
    { title: '回调地址', dataIndex: 'callbackUrl', width: 300, ellipsis: true },
    { title: 'IP 白名单', dataIndex: 'ipWhitelist', width: 220, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const logColumns = useMemo<ProColumns<OpenApiCallLogRecord>[]>(() => [
    { title: '客户端', dataIndex: 'clientName', width: 180, fixed: 'left' },
    { title: '接口路径', dataIndex: 'apiPath', width: 220 },
    { title: '方法', dataIndex: 'requestMethod', width: 100, render: (_, record) => renderStatusTag(record.requestMethod, methodMap) },
    { title: '请求内容', dataIndex: 'requestPayload', width: 260, ellipsis: true },
    { title: '响应内容', dataIndex: 'responsePayload', width: 260, ellipsis: true },
    { title: '响应码', dataIndex: 'responseCode', width: 100 },
    { title: '状态', dataIndex: 'callStatus', width: 100, render: (_, record) => renderStatusTag(record.callStatus, callStatusMap) },
    { title: '耗时', dataIndex: 'costMs', width: 100, renderText: (value) => `${value}ms` },
    { title: '调用时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="开放接口中心" subtitle="维护厂商客户端、密钥、回调地址、IP 白名单和接口调用日志。" icon={<ApiOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="客户端" value={clients.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用客户端" value={clients.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="调用日志" value={callLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="失败调用" value={callLogs.filter((item) => item.callStatus === 'FAILED').length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="客户端 / 接口 / AppKey / 响应内容"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'client', label: '客户端配置', children: <ProTable<OpenApiClientRecord> cardBordered rowKey="id" columns={clientColumns} dataSource={clients} loading={clientsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1800 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => { form.resetFields(); setModalVisible(true); }}>新建客户端</Button>]} /> },
          { key: 'log', label: '调用日志', children: <ProTable<OpenApiCallLogRecord> cardBordered rowKey="id" columns={logColumns} dataSource={callLogs} loading={callLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <BusinessDetailModal title="开放接口详情" open={!!detail} onCancel={() => setDetail(null)} width={860}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('apiPath' in detail ? openApiDetailFields.log : openApiDetailFields.client) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="开放接口客户端"
        title="维护开放接口客户端"
        subtitle="维护厂商客户端、密钥、回调地址和 IP 白名单，保证接口接入可审计、可停用。"
        meta={['平台运营', '开放接口']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={1040}
        okText="保存客户端"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ApiOutlined />} title="客户端基础" desc="明确接入方名称、编码和启停状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="clientName" label="客户端名称" rules={[{ required: true, message: '请输入客户端名称' }]}><Input placeholder="例如：鲸洗设备厂商平台" /></Form.Item>
                <Form.Item name="clientCode" label="客户端编码" rules={[{ required: true, message: '请输入客户端编码' }]}><Input placeholder="例如：VENDOR-WASH-001" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                <Form.Item name="owner" label="对接负责人"><Input placeholder="例如：张三 / 技术支持" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<KeyOutlined />} title="密钥与回调" desc="密钥、回调地址和签名约定必须和厂商接入文档一致。">
              <div className="merchant-editor-fields">
                <Form.Item name="appKey" label="AppKey" rules={[{ required: true, message: '请输入 AppKey' }]}><Input placeholder="平台分配的 AppKey" /></Form.Item>
                <Form.Item name="appSecret" label="AppSecret"><Input placeholder="平台分配的 AppSecret" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="callbackUrl" label="回调地址" rules={[{ required: true, message: '请输入回调地址' }]}><Input placeholder="https://vendor.example.com/callback" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="访问控制" desc="配置白名单和维护说明，降低异常调用风险。">
              <div className="merchant-editor-fields">
                <Form.Item className="merchant-editor-field-span-all" name="ipWhitelist" label="IP 白名单"><Input.TextArea rows={3} placeholder="多个 IP 用逗号或换行分隔" /></Form.Item>
                <Form.Item name="rateLimitWindow" label="限流周期"><Select options={rateLimitWindowOptions} placeholder="请选择限流周期" /></Form.Item>
                <Form.Item name="rateLimitCount" label="调用上限"><InputNumber min={1} precision={0} addonAfter="次" style={{ width: '100%' }} placeholder="300" /></Form.Item>
                <Form.Item name="maintainNote" label="维护说明"><Input placeholder="例如：仅开放设备启动、状态查询接口" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default OpenApiManagement;
