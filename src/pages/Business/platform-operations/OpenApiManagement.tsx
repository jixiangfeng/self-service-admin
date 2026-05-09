import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
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
    await api.openApi.clients.add(values);
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

      <ProTable
        rowKey="keyword"
        search={false}
        pagination={false}
        options={false}
        dataSource={[]}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true }]}
        toolBarRender={() => [
          <Input.Search
            key="keyword"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => setKeyword(value)}
            placeholder="客户端 / 接口 / AppKey / 响应内容"
            style={{ width: 320 }}
          />,
        ]}
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          { key: 'client', label: '客户端配置', children: <ProTable<OpenApiClientRecord> cardBordered rowKey="id" columns={clientColumns} dataSource={clients} loading={clientsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1800 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => { form.resetFields(); setModalVisible(true); }}>新建客户端</Button>]} /> },
          { key: 'log', label: '调用日志', children: <ProTable<OpenApiCallLogRecord> cardBordered rowKey="id" columns={logColumns} dataSource={callLogs} loading={callLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={860}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('apiPath' in detail ? openApiDetailFields.log : openApiDetailFields.client) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </Modal>

      <Modal title="维护开放接口客户端" open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={820}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="clientName" label="客户端名称" rules={[{ required: true, message: '请输入客户端名称' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="clientCode" label="客户端编码" rules={[{ required: true, message: '请输入客户端编码' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="appKey" label="AppKey" rules={[{ required: true, message: '请输入 AppKey' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} /></Form.Item></Col>
            <Col span={24}><Form.Item name="callbackUrl" label="回调地址" rules={[{ required: true, message: '请输入回调地址' }]}><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="appSecret" label="AppSecret"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="ipWhitelist" label="IP 白名单"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OpenApiManagement;
