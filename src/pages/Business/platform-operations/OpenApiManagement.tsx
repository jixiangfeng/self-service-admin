import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface OpenApiClientRecord {
  id: string;
  clientName: string;
  clientCode: string;
  appKey: string;
  appSecret: string;
  callbackUrl: string;
  ipWhitelist: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface OpenApiCallLogRecord {
  id: string;
  clientName: string;
  apiPath: string;
  requestMethod: string;
  requestPayload: string;
  responsePayload: string;
  responseCode: number;
  callStatus: string;
  costMs: number;
  createdAt: string;
}

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

const clients: OpenApiClientRecord[] = [
  { id: 'cli1', clientName: '泡沫设备厂商', clientCode: 'VENDOR_FOAM', appKey: 'ak_foam_202605', appSecret: '******', callbackUrl: 'https://vendor.example.com/device/callback', ipWhitelist: '10.10.20.11,10.10.20.12', status: 1, createdAt: '2026-05-01 09:00:00', updatedAt: '2026-05-07 09:10:00' },
  { id: 'cli2', clientName: '短信服务商', clientCode: 'VENDOR_SMS', appKey: 'ak_sms_202605', appSecret: '******', callbackUrl: 'https://sms.example.com/report', ipWhitelist: '10.11.20.21', status: 1, createdAt: '2026-05-02 10:20:00', updatedAt: '2026-05-06 18:00:00' },
  { id: 'cli3', clientName: '支付对账服务', clientCode: 'VENDOR_PAY_RECON', appKey: 'ak_pay_202605', appSecret: '******', callbackUrl: 'https://pay.example.com/recon/callback', ipWhitelist: '10.12.10.8', status: 0, createdAt: '2026-05-03 11:30:00', updatedAt: '2026-05-05 16:20:00' },
];

const callLogs: OpenApiCallLogRecord[] = [
  { id: 'log1', clientName: '泡沫设备厂商', apiPath: '/open/device/callback', requestMethod: 'POST', requestPayload: '{"deviceCode":"DEV-HQ-003","status":"FINISHED"}', responsePayload: '{"code":0,"message":"success"}', responseCode: 200, callStatus: 'SUCCESS', costMs: 82, createdAt: '2026-05-07 09:27:08' },
  { id: 'log2', clientName: '短信服务商', apiPath: '/open/sms/report', requestMethod: 'POST', requestPayload: '{"messageNo":"MS202605070003"}', responsePayload: '{"code":500,"message":"timeout"}', responseCode: 500, callStatus: 'FAILED', costMs: 3000, createdAt: '2026-05-07 08:58:10' },
  { id: 'log3', clientName: '支付对账服务', apiPath: '/open/pay/recon', requestMethod: 'GET', requestPayload: '{"date":"2026-05-06"}', responsePayload: '{"code":0,"count":126}', responseCode: 200, callStatus: 'SUCCESS', costMs: 146, createdAt: '2026-05-07 02:10:00' },
];

const statusMap = buildValueEnum(statusOptions);
const methodMap = buildValueEnum(methodOptions);
const callStatusMap = buildValueEnum(callStatusOptions);

const OpenApiManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const filter = <T extends object>(records: T[]) => records.filter((record) => containsKeyword(keyword, Object.values(record).map((value) => String(value ?? ''))));

  const handleSubmit = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('开放接口配置已保存');
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
          { key: 'client', label: '客户端配置', children: <ProTable<OpenApiClientRecord> cardBordered rowKey="id" columns={clientColumns} dataSource={filter(clients) as OpenApiClientRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1800 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => { form.resetFields(); setModalVisible(true); }}>新建客户端</Button>]} /> },
          { key: 'log', label: '调用日志', children: <ProTable<OpenApiCallLogRecord> cardBordered rowKey="id" columns={logColumns} dataSource={filter(callLogs) as OpenApiCallLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={860}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>)}
          </Descriptions>
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
            <Col span={24}><Form.Item name="ipWhitelist" label="IP 白名单"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OpenApiManagement;
