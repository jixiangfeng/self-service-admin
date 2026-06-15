import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApiOutlined, CloudSyncOutlined, CodeOutlined, PartitionOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { statusOptions } from '@/constants/businessCatalog';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, {
  type DeviceCallbackConfigRecord,
  type DeviceCommandLogRecord,
  type DeviceCommandTemplateRecord,
  type DeviceModelRecord,
  type DeviceProtocolRecord,
  type DeviceStatusMappingRecord,
  type DeviceVendorRecord,
  type OpenApiCallLogRecord,
} from '@/services/backendService';

type ModalKind = 'protocol' | 'vendor' | 'model' | 'command' | 'status' | 'callback';
type DeviceAccessFormValues = {
  protocolCode?: string;
  protocolName?: string;
  protocolType?: string;
  version?: string;
  authMethod?: string;
  signatureMethod?: string;
  callbackRequired?: string;
  securityOwner?: string;
  vendorCode?: string;
  vendorName?: string;
  contactName?: string;
  contactPhone?: string;
  apiBaseUrl?: string;
  modelCode?: string;
  modelName?: string;
  deviceType?: string;
  templateCode?: string;
  templateName?: string;
  deviceCode?: string;
  commandType?: string;
  commandPayload?: string;
  mappingCode?: string;
  statusGroup?: string;
  vendorStatusCode?: string;
  platformStatusCode?: string;
  statusName?: string;
  callbackCode?: string;
  callbackName?: string;
  callbackType?: string;
  callbackUrl?: string;
  ipWhitelist?: string;
  status?: string | number;
};

const protocolTypeOptions = [
  { value: 'HTTP', label: 'HTTP' },
  { value: 'MQTT', label: 'MQTT' },
  { value: 'TCP', label: 'TCP' },
  { value: 'WEBSOCKET', label: 'WebSocket' },
];

const deviceTypeOptions = [
  { value: 'WASHER', label: '洗车机' },
  { value: 'GATE', label: '闸机' },
  { value: 'WATER_GUN', label: '高压水枪' },
  { value: 'VACUUM', label: '吸尘设备' },
];

const commandTypeOptions = [
  { value: 'START_WASH', label: '启动洗车' },
  { value: 'STOP_WASH', label: '停止洗车' },
  { value: 'QUERY_STATUS', label: '查询状态' },
  { value: 'RESET_DEVICE', label: '设备复位' },
];

const callbackRequiredOptions = [
  { value: 'YES', label: '需要回调' },
  { value: 'NO', label: '无需回调' },
];

const statusMap = buildValueEnum(statusOptions);

const DeviceAccessManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [modalKind, setModalKind] = useState<ModalKind | null>(null);
  const [form] = Form.useForm<DeviceAccessFormValues>();
  const queryParams = useMemo(() => ({ keyword, current: 1, size: 80 }), [keyword]);

  const protocolsQuery = useQuery({ queryKey: ['device-access-protocols', queryParams], queryFn: () => api.deviceProtocol.page(queryParams) });
  const vendorsQuery = useQuery({ queryKey: ['device-access-vendors', queryParams], queryFn: () => api.deviceVendor.page(queryParams) });
  const modelsQuery = useQuery({ queryKey: ['device-access-models', queryParams], queryFn: () => api.deviceModel.page(queryParams) });
  const commandsQuery = useQuery({ queryKey: ['device-access-command-templates', queryParams], queryFn: () => api.deviceCommandTemplate.page(queryParams) });
  const statusMappingsQuery = useQuery({ queryKey: ['device-access-status-mappings', queryParams], queryFn: () => api.deviceStatusMapping.page(queryParams) });
  const commandLogsQuery = useQuery({ queryKey: ['device-access-command-logs', queryParams], queryFn: () => api.deviceOps.commandLogs.page(queryParams) });
  const callbacksQuery = useQuery({ queryKey: ['device-access-callback-configs', queryParams], queryFn: () => api.deviceCallbackConfig.page(queryParams) });
  const callLogsQuery = useQuery({ queryKey: ['device-access-callback-call-logs', queryParams], queryFn: () => api.openApi.callLogs.page(queryParams) });

  const protocols = protocolsQuery.data?.data.records ?? [];
  const vendors = vendorsQuery.data?.data.records ?? [];
  const models = modelsQuery.data?.data.records ?? [];
  const commands = commandsQuery.data?.data.records ?? [];
  const statusMappings = statusMappingsQuery.data?.data.records ?? [];
  const commandLogs = commandLogsQuery.data?.data.records ?? [];
  const callbacks = callbacksQuery.data?.data.records ?? [];
  const callLogs = callLogsQuery.data?.data.records ?? [];

  const openModal = (kind: ModalKind) => {
    setModalKind(kind);
    form.resetFields();
    form.setFieldsValue({ status: 1, callbackRequired: 'YES' });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalKind === 'protocol') {
      await api.deviceProtocol.add(values as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-protocols'] });
      message.success('设备协议已保存');
    } else if (modalKind === 'vendor') {
      await api.deviceVendor.add(values as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-vendors'] });
      message.success('设备厂商已保存');
    } else if (modalKind === 'model') {
      await api.deviceModel.add(values as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-models'] });
      message.success('设备型号已保存');
    } else if (modalKind === 'command') {
      await api.deviceCommandTemplate.add({ ...values, status: values.status || 'PUBLISHED' } as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-command-templates'] });
      message.success('指令模板已保存');
    } else if (modalKind === 'status') {
      await api.deviceStatusMapping.add({ ...values, status: values.status || 'PUBLISHED' } as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-status-mappings'] });
      message.success('状态码映射已保存');
    } else if (modalKind === 'callback') {
      await api.deviceCallbackConfig.add(values as Record<string, unknown>);
      await queryClient.invalidateQueries({ queryKey: ['device-access-callback-configs'] });
      message.success('回调配置已保存');
    }
    setModalKind(null);
  };

  const protocolColumns = useMemo<ProColumns<DeviceProtocolRecord>[]>(() => [
    { title: '协议编码', dataIndex: 'protocolCode', width: 150, fixed: 'left' },
    { title: '协议名称', dataIndex: 'protocolName', width: 180 },
    { title: '协议类型', dataIndex: 'protocolType', width: 120 , render: (value) => formatEnumText(value, 'protocolType', '协议类型') },
    { title: '版本', dataIndex: 'version', width: 100 },
    { title: '认证方式', dataIndex: 'authMethod', width: 130 , render: (value) => formatEnumText(value, 'authMethod', '认证方式') },
    { title: '签名算法', dataIndex: 'signatureMethod', width: 130 , render: (value) => formatEnumText(value, 'signatureMethod', '签名算法') },
    { title: '回调要求', dataIndex: 'callbackRequired', width: 120 , render: (value) => formatEnumText(value, 'callbackRequired', '回调要求') },
    { title: '安全负责人', dataIndex: 'securityOwner', width: 140 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const vendorColumns = useMemo<ProColumns<DeviceVendorRecord>[]>(() => [
    { title: '厂商编码', dataIndex: 'vendorCode', width: 150, fixed: 'left' },
    { title: '厂商名称', dataIndex: 'vendorName', width: 180 },
    { title: '联系人', dataIndex: 'contactName', width: 120 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
    { title: '接口地址', dataIndex: 'apiBaseUrl', width: 260, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const modelColumns = useMemo<ProColumns<DeviceModelRecord>[]>(() => [
    { title: '型号编码', dataIndex: 'modelCode', width: 150, fixed: 'left' },
    { title: '型号名称', dataIndex: 'modelName', width: 180 },
    { title: '厂商', dataIndex: 'vendorName', width: 160 },
    { title: '设备类型', dataIndex: 'deviceType', width: 120 , render: (value) => formatEnumText(value, 'deviceType', '设备类型') },
    { title: '协议编码', dataIndex: 'protocolCode', width: 150 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const commandColumns = useMemo<ProColumns<DeviceCommandTemplateRecord>[]>(() => [
    { title: '模板编码', dataIndex: 'templateCode', width: 160, fixed: 'left' },
    { title: '模板名称', dataIndex: 'templateName', width: 180 },
    { title: '协议编码', dataIndex: 'protocolCode', width: 150 },
    { title: '设备类型', dataIndex: 'deviceType', width: 120 , render: (value) => formatEnumText(value, 'deviceType', '设备类型') },
    { title: '指令类型', dataIndex: 'commandType', width: 140 , render: (value) => formatEnumText(value, 'commandType', '指令类型') },
    { title: '指令内容', dataIndex: 'commandPayload', width: 320, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const statusColumns = useMemo<ProColumns<DeviceStatusMappingRecord>[]>(() => [
    { title: '映射编码', dataIndex: 'mappingCode', width: 160, fixed: 'left' },
    { title: '协议编码', dataIndex: 'protocolCode', width: 150 },
    { title: '映射分组', dataIndex: 'statusGroup', width: 140 , render: (value) => formatEnumText(value, 'statusGroup', '映射分组') },
    { title: '厂商状态码', dataIndex: 'vendorStatusCode', width: 140 },
    { title: '平台状态码', dataIndex: 'platformStatusCode', width: 140 },
    { title: '状态名称', dataIndex: 'statusName', width: 160 },
    { title: '说明', dataIndex: 'description', width: 220, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
  ], []);

  const callbackColumns = useMemo<ProColumns<DeviceCallbackConfigRecord>[]>(() => [
    { title: '回调编码', dataIndex: 'callbackCode', width: 160, fixed: 'left' },
    { title: '回调名称', dataIndex: 'callbackName', width: 180 },
    { title: '协议编码', dataIndex: 'protocolCode', width: 150 },
    { title: '厂商编码', dataIndex: 'vendorCode', width: 150 },
    { title: '回调类型', dataIndex: 'callbackType', width: 140 , render: (value) => formatEnumText(value, 'callbackType', '回调类型') },
    { title: '回调地址', dataIndex: 'callbackUrl', width: 320, ellipsis: true },
    { title: '签名算法', dataIndex: 'signatureMethod', width: 130 , render: (value) => formatEnumText(value, 'signatureMethod', '签名算法') },
    { title: 'IP 白名单', dataIndex: 'ipWhitelist', width: 240, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
  ], []);

  const logColumns = useMemo<ProColumns<DeviceCommandLogRecord>[]>(() => [
    { title: '指令编号', dataIndex: 'commandNo', width: 180, fixed: 'left' },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '请求报文', dataIndex: 'requestPayload', width: 320, ellipsis: true },
    { title: '回执报文', dataIndex: 'responsePayload', width: 320, ellipsis: true },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '记录时间', dataIndex: 'loggedAt', width: 180, render: (_, record) => formatDateTime(record.loggedAt) },
  ], []);

  const callLogColumns = useMemo<ProColumns<OpenApiCallLogRecord>[]>(() => [
    { title: '客户端', dataIndex: 'clientName', width: 180, fixed: 'left' },
    { title: '接口路径', dataIndex: 'apiPath', width: 220 },
    { title: '方法', dataIndex: 'requestMethod', width: 100 , render: (value) => formatEnumText(value, 'requestMethod', '方法') },
    { title: '响应码', dataIndex: 'responseCode', width: 100 },
    { title: '状态', dataIndex: 'callStatus', width: 100 , render: (value) => formatEnumText(value, 'callStatus', '状态') },
    { title: '耗时', dataIndex: 'costMs', width: 100, renderText: (value) => `${value}ms` },
    { title: '调用时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const modalTitleMap: Record<ModalKind, string> = {
    protocol: '新增设备协议',
    vendor: '新增设备厂商',
    model: '新增设备型号',
    command: '新增指令模板',
    status: '新增状态码映射',
    callback: '新增回调配置',
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="设备接入" subtitle="统一维护设备协议、厂商型号、指令模板、状态映射、回调配置和通信日志。" icon={<ApiOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="协议" value={protocols.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="厂商" value={vendors.length} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="型号" value={models.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="指令模板" value={commands.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="回调配置" value={callbacks.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="通信日志" value={commandLogs.length + callLogs.length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar value={keyword} placeholder="协议 / 厂商 / 型号 / 指令 / 回调 / 日志关键词" onSearch={setKeyword} />

      <Tabs
        items={[
          { key: 'protocol', label: '设备协议', children: <ProTable<DeviceProtocolRecord> cardBordered rowKey="id" columns={protocolColumns} dataSource={protocols} loading={protocolsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('protocol')}>新增协议</Button>]} /> },
          { key: 'vendor', label: '设备厂商', children: <ProTable<DeviceVendorRecord> cardBordered rowKey="id" columns={vendorColumns} dataSource={vendors} loading={vendorsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('vendor')}>新增厂商</Button>]} /> },
          { key: 'model', label: '设备型号', children: <ProTable<DeviceModelRecord> cardBordered rowKey="id" columns={modelColumns} dataSource={models} loading={modelsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('model')}>新增型号</Button>]} /> },
          { key: 'command', label: '指令模板', children: <ProTable<DeviceCommandTemplateRecord> cardBordered rowKey="id" columns={commandColumns} dataSource={commands} loading={commandsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('command')}>新增指令模板</Button>]} /> },
          { key: 'status', label: '状态码映射', children: <ProTable<DeviceStatusMappingRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={statusMappings} loading={statusMappingsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('status')}>新增状态映射</Button>]} /> },
          { key: 'callback', label: '回调配置', children: <ProTable<DeviceCallbackConfigRecord> cardBordered rowKey="id" columns={callbackColumns} dataSource={callbacks} loading={callbacksQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('callback')}>新增回调配置</Button>]} /> },
          { key: 'log', label: '通信日志', children: <Tabs items={[{ key: 'commandLog', label: '设备回执日志', children: <ProTable<DeviceCommandLogRecord> cardBordered rowKey="id" columns={logColumns} dataSource={commandLogs} loading={commandLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} /> }, { key: 'apiLog', label: '接口调用日志', children: <ProTable<OpenApiCallLogRecord> cardBordered rowKey="id" columns={callLogColumns} dataSource={callLogs} loading={callLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} /> }]} /> },
        ]}
      />

      <BusinessEditorModal
        eyebrow="设备接入配置"
        title={modalKind ? modalTitleMap[modalKind] : '设备接入配置'}
        subtitle="按协议、厂商、型号、指令和回调分层维护，便于新增设备厂商和排查通信问题。"
        meta={['设备接入', modalKind ? modalTitleMap[modalKind] : '配置']}
        open={!!modalKind}
        onCancel={() => setModalKind(null)}
        onOk={handleSubmit}
        width={1040}
        okText="保存"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            {modalKind === 'protocol' ? (
              <BusinessEditorSection icon={<ApiOutlined />} title="协议基础" desc="维护设备协议编码、类型、鉴权和回调要求。">
                <div className="merchant-editor-fields">
                  <Form.Item name="protocolCode" label="协议编码" rules={[{ required: true, message: '请输入协议编码' }]}><Input placeholder="例如：HTTP-WASH-V1" /></Form.Item>
                  <Form.Item name="protocolName" label="协议名称" rules={[{ required: true, message: '请输入协议名称' }]}><Input placeholder="例如：HTTP 洗车机协议" /></Form.Item>
                  <Form.Item name="protocolType" label="协议类型" rules={[{ required: true, message: '请选择协议类型' }]}><Select options={protocolTypeOptions} /></Form.Item>
                  <Form.Item name="version" label="版本"><Input placeholder="V1.0" /></Form.Item>
                  <Form.Item name="authMethod" label="认证方式"><Input placeholder="AppKey / Token / 签名" /></Form.Item>
                  <Form.Item name="signatureMethod" label="签名算法"><Input placeholder="HMAC-SHA256" /></Form.Item>
                  <Form.Item name="callbackRequired" label="回调要求"><Select options={callbackRequiredOptions} /></Form.Item>
                  <Form.Item name="securityOwner" label="安全负责人"><Input placeholder="例如：设备接入-张三" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalKind === 'vendor' ? (
              <BusinessEditorSection icon={<PartitionOutlined />} title="厂商基础" desc="维护厂商联系人、接口地址和启停状态。">
                <div className="merchant-editor-fields">
                  <Form.Item name="vendorCode" label="厂商编码" rules={[{ required: true, message: '请输入厂商编码' }]}><Input placeholder="VENDOR-WASH-001" /></Form.Item>
                  <Form.Item name="vendorName" label="厂商名称" rules={[{ required: true, message: '请输入厂商名称' }]}><Input placeholder="鲸洗设备厂商" /></Form.Item>
                  <Form.Item name="contactName" label="联系人"><Input placeholder="技术联系人" /></Form.Item>
                  <Form.Item name="contactPhone" label="联系电话"><Input placeholder="手机号" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="apiBaseUrl" label="接口地址"><Input placeholder="https://vendor.example.com/api" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalKind === 'model' ? (
              <BusinessEditorSection icon={<CodeOutlined />} title="型号基础" desc="维护设备型号、类型和适配协议。">
                <div className="merchant-editor-fields">
                  <Form.Item name="modelCode" label="型号编码" rules={[{ required: true, message: '请输入型号编码' }]}><Input placeholder="MODEL-WASH-A1" /></Form.Item>
                  <Form.Item name="modelName" label="型号名称" rules={[{ required: true, message: '请输入型号名称' }]}><Input placeholder="A1 标准洗车机" /></Form.Item>
                  <Form.Item name="deviceType" label="设备类型"><Select options={deviceTypeOptions} /></Form.Item>
                  <Form.Item name="protocolCode" label="协议编码"><Input placeholder="HTTP-WASH-V1" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalKind === 'command' ? (
              <BusinessEditorSection icon={<ThunderboltOutlined />} title="指令模板" desc="维护启动、停止、查询、复位等设备指令模板。">
                <div className="merchant-editor-fields">
                  <Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input placeholder="TPL-START-WASH" /></Form.Item>
                  <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input placeholder="启动洗车模板" /></Form.Item>
                  <Form.Item name="protocolCode" label="协议编码"><Input placeholder="HTTP-WASH-V1" /></Form.Item>
                  <Form.Item name="deviceType" label="适用设备类型"><Select options={deviceTypeOptions} /></Form.Item>
                  <Form.Item name="commandType" label="指令类型"><Select options={commandTypeOptions} /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="commandPayload" label="指令模板内容"><Input.TextArea rows={4} placeholder='例如：{"action":"START_WASH","duration":600}' /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalKind === 'status' ? (
              <BusinessEditorSection icon={<CodeOutlined />} title="状态码映射" desc="维护厂商状态码到平台状态码的映射，避免页面直接显示 code。">
                <div className="merchant-editor-fields">
                  <Form.Item name="mappingCode" label="映射编码" rules={[{ required: true, message: '请输入映射编码' }]}><Input placeholder="MAP-WASH-ONLINE" /></Form.Item>
                  <Form.Item name="protocolCode" label="协议编码"><Input placeholder="HTTP-WASH-V1" /></Form.Item>
                  <Form.Item name="statusGroup" label="状态分组" rules={[{ required: true, message: '请输入状态分组' }]}><Input placeholder="DEVICE_STATUS" /></Form.Item>
                  <Form.Item name="vendorStatusCode" label="厂商状态码" rules={[{ required: true, message: '请输入厂商状态码' }]}><Input placeholder="0" /></Form.Item>
                  <Form.Item name="platformStatusCode" label="平台状态码" rules={[{ required: true, message: '请输入平台状态码' }]}><Input placeholder="ONLINE" /></Form.Item>
                  <Form.Item name="statusName" label="状态名称" rules={[{ required: true, message: '请输入状态名称' }]}><Input placeholder="在线" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="description" label="说明"><Input.TextArea rows={3} placeholder="说明状态来源和适用设备" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalKind === 'callback' ? (
              <BusinessEditorSection icon={<CloudSyncOutlined />} title="回调配置" desc="维护设备厂商回调客户端、密钥、地址和白名单。">
                <div className="merchant-editor-fields">
                  <Form.Item name="callbackCode" label="回调编码" rules={[{ required: true, message: '请输入回调编码' }]}><Input placeholder="CALLBACK-WASH-001" /></Form.Item>
                  <Form.Item name="callbackName" label="回调名称" rules={[{ required: true, message: '请输入回调名称' }]}><Input placeholder="鲸洗设备回调" /></Form.Item>
                  <Form.Item name="protocolCode" label="协议编码"><Input placeholder="HTTP-WASH-V1" /></Form.Item>
                  <Form.Item name="vendorCode" label="厂商编码"><Input placeholder="VENDOR-WASH-001" /></Form.Item>
                  <Form.Item name="callbackType" label="回调类型" rules={[{ required: true, message: '请输入回调类型' }]}><Input placeholder="STATUS_NOTIFY" /></Form.Item>
                  <Form.Item name="signatureMethod" label="签名算法"><Input placeholder="HMAC-SHA256" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="callbackUrl" label="回调地址" rules={[{ required: true, message: '请输入回调地址' }]}><Input placeholder="https://admin.example.com/device/callback" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="ipWhitelist" label="IP 白名单"><Input.TextArea rows={3} placeholder="多个 IP 用逗号或换行分隔" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="配置说明" desc="设备协议、厂商、型号、指令和回调需要和真实设备接入文档保持一致，避免扫码启动和状态回传异常。">
              <div />
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default DeviceAccessManagement;
