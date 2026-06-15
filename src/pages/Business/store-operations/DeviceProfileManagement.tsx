import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApiOutlined, ClusterOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  deviceProtocolTypeOptions,
  deviceTypeOptions,
  publishStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  DeviceBindLogRecord,
  DeviceModelRecord,
  DeviceProtocolRecord,
  DeviceVendorRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag, safeJsonParse } from '@/pages/Business/shared';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';

type DeviceProfileTab = 'vendor' | 'model' | 'protocol' | 'bind';
type EditableRecord = DeviceVendorRecord | DeviceModelRecord | DeviceProtocolRecord | DeviceBindLogRecord;


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};

const normalizePickerInitialValues = (record: Record<string, any>) => {
  const next = { ...record };
  Object.entries(next).forEach(([key, value]) => {
    if (!value) return;
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = toTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = toDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = toDateTimePickerValue(value) || value;
    }
  });
  return next;
};
const publishStatusMap = buildValueEnum(publishStatusOptions);
const deviceTypeMap = buildValueEnum(deviceTypeOptions);
const protocolTypeMap = buildValueEnum(deviceProtocolTypeOptions);

const deviceProfileModalTitleMap: Record<DeviceProfileTab, string> = {
  vendor: '设备厂商',
  model: '设备型号',
  protocol: '设备协议',
  bind: '绑定日志',
};

const deviceProfileModalDescMap: Record<DeviceProfileTab, string> = {
  vendor: '维护设备厂商、联系人和接口地址，为设备接入和售后协作提供基础资料。',
  model: '维护设备型号、设备类型和协议编码，保证台账、点位绑定和能力投放一致。',
  protocol: '维护协议编码、协议类型、版本和接入安全策略，支撑设备指令下发。',
  bind: '记录设备在门店和点位之间的绑定变化，方便设备迁移和异常追溯。',
};

const authMethodOptions = [
  { value: 'NONE', label: '无需鉴权' },
  { value: 'APP_KEY', label: 'AppKey' },
  { value: 'TOKEN', label: 'Token' },
  { value: 'SIGN', label: '签名校验' },
];

const signatureMethodOptions = [
  { value: 'NONE', label: '不签名' },
  { value: 'MD5', label: 'MD5' },
  { value: 'SHA256', label: 'SHA256' },
  { value: 'HMAC_SHA256', label: 'HMAC-SHA256' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const buildAuthConfig = (values: Record<string, unknown>) =>
  JSON.stringify({
    authMethod: values.authMethod,
    signatureMethod: values.signatureMethod,
    callbackRequired: values.callbackRequired,
    securityOwner: values.securityOwner,
    authRemark: values.authRemark,
  });

const parseAuthConfig = (authConfig?: string) =>
  safeJsonParse<{
    authMethod?: string;
    signatureMethod?: string;
    callbackRequired?: string;
    securityOwner?: string;
    authRemark?: string;
  }>(authConfig, {});

const deviceProfileDetailFields: Record<DeviceProfileTab, DetailField<any>[]> = {
  vendor: [
    { name: 'vendorCode', label: '厂商编码' },
    { name: 'vendorName', label: '厂商名称' },
    { name: 'contactName', label: '联系人' },
    { name: 'contactPhone', label: '电话' },
    { name: 'apiBaseUrl', label: '接口地址' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间' },
  ],
  model: [
    { name: 'vendorName', label: '厂商' },
    { name: 'modelCode', label: '型号编码' },
    { name: 'modelName', label: '型号名称' },
    { name: 'deviceType', label: '设备类型' },
    { name: 'protocolCode', label: '协议编码' },
    { name: 'status', label: '状态' },
  ],
  protocol: [
    { name: 'protocolCode', label: '协议编码' },
    { name: 'protocolName', label: '协议名称' },
    { name: 'protocolType', label: '协议类型' },
    { name: 'version', label: '版本' },
    { name: 'authMethod', label: '鉴权方式', render: (value) => optionLabel(authMethodOptions, value) || '-' },
    { name: 'signatureMethod', label: '签名方式', render: (value) => optionLabel(signatureMethodOptions, value) || '-' },
    { name: 'callbackRequired', label: '回调验签', render: (value) => (value === 'YES' ? '需要' : value === 'NO' ? '不需要' : '-') },
    { name: 'securityOwner', label: '安全负责人' },
    { name: 'authRemark', label: '补充说明' },
    { name: 'status', label: '状态' },
  ],
  bind: [
    { name: 'bindNo', label: '绑定单号' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'beforeStore', label: '原门店' },
    { name: 'afterStore', label: '新门店' },
    { name: 'beforePoint', label: '原点位' },
    { name: 'afterPoint', label: '新点位' },
    { name: 'boundAt', label: '绑定时间' },
  ],
};

const DeviceProfileManagement: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<DeviceProfileTab>('vendor');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [searchForm] = Form.useForm<{ keyword?: string }>();

  const vendorQuery = useQuery({ queryKey: ['deviceVendors'], queryFn: async () => (await api.deviceVendor.page({ pageNum: 1, pageSize: 200 })).data });
  const modelQuery = useQuery({ queryKey: ['deviceModels'], queryFn: async () => (await api.deviceModel.page({ pageNum: 1, pageSize: 200 })).data });
  const protocolQuery = useQuery({ queryKey: ['deviceProtocols'], queryFn: async () => (await api.deviceProtocol.page({ pageNum: 1, pageSize: 200 })).data });
  const bindQuery = useQuery({ queryKey: ['deviceBindLogs'], queryFn: async () => (await api.deviceBindLog.page({ pageNum: 1, pageSize: 200 })).data });

  const vendors = vendorQuery.data?.records || [];
  const models = modelQuery.data?.records || [];
  const protocols = (protocolQuery.data?.records || []).map((record) => ({ ...record, ...parseAuthConfig(record.authConfig) }));
  const bindLogs = bindQuery.data?.records || [];

  const vendorOptions = vendors.map((item) => ({ value: item.id, label: item.vendorName }));
  const deviceOptionsQuery = useQuery({ queryKey: ['deviceOptionsForProfiles'], queryFn: async () => (await api.device.options()).data });

  const invalidateTab = (tab: DeviceProfileTab) => {
    if (tab === 'vendor') queryClient.invalidateQueries({ queryKey: ['deviceVendors'] });
    if (tab === 'model') queryClient.invalidateQueries({ queryKey: ['deviceModels'] });
    if (tab === 'protocol') queryClient.invalidateQueries({ queryKey: ['deviceProtocols'] });
    if (tab === 'bind') queryClient.invalidateQueries({ queryKey: ['deviceBindLogs'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'vendor') return payload.id ? api.deviceVendor.edit(payload) : api.deviceVendor.add(payload);
      if (activeTab === 'model') return payload.id ? api.deviceModel.edit(payload) : api.deviceModel.add(payload);
      if (activeTab === 'protocol') return payload.id ? api.deviceProtocol.edit(payload) : api.deviceProtocol.add(payload);
      return payload.id ? api.deviceBindLog.edit(payload) : api.deviceBindLog.add(payload);
    },
    onSuccess: () => {
      message.success('设备档案已保存');
      invalidateTab(activeTab);
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: DeviceProfileTab; id: number }) => {
      if (tab === 'vendor') return api.deviceVendor.remove(id);
      if (tab === 'model') return api.deviceModel.remove(id);
      if (tab === 'protocol') return api.deviceProtocol.remove(id);
      return api.deviceBindLog.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('设备档案已删除');
      invalidateTab(variables.tab);
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const confirmRemove = (tab: DeviceProfileTab, id: number) => {
    showBusinessConfirm({
      title: '确认删除该设备档案',
      content: `删除后将移除「${deviceProfileModalTitleMap[tab]}」记录，并影响设备接入和追溯资料，请确认后继续。`,
      onOk: () => removeMutation.mutate({ tab, id }),
    });
  };

  const openModal = (tab: DeviceProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      const recordValues = normalizePickerInitialValues(record as unknown as Record<string, any>);
      form.setFieldsValue({
        ...recordValues,
        ...(tab === 'protocol' ? parseAuthConfig(String(recordValues.authConfig || '')) : {}),
      });
    } else if (tab === 'vendor') {
      form.setFieldsValue({ status: 'PUBLISHED' });
    } else if (tab === 'model') {
      form.setFieldsValue({ deviceType: 'CAR_WASH_HIGH_PRESSURE', status: 'PUBLISHED' });
    } else if (tab === 'protocol') {
      form.setFieldsValue({ protocolType: 'HTTP', status: 'PUBLISHED' });
    }
    setModalVisible(true);
  };

  const actionColumn = (tab: DeviceProfileTab): ProColumns<EditableRecord> => ({
    title: '操作',
    width: 170,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(tab, record)}>编辑</Button>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove(tab, record.id)}>删除</Button>
      </>
    ),
  });

  const vendorColumns: ProColumns<DeviceVendorRecord>[] = [
    { title: '厂商编码', dataIndex: 'vendorCode', width: 160 },
    { title: '厂商名称', dataIndex: 'vendorName', width: 160 },
    { title: '联系人', dataIndex: 'contactName', width: 120 },
    { title: '电话', dataIndex: 'contactPhone', width: 140 },
    { title: '接口地址', dataIndex: 'apiBaseUrl', width: 240 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    actionColumn('vendor') as ProColumns<DeviceVendorRecord>,
  ];

  const modelColumns: ProColumns<DeviceModelRecord>[] = [
    { title: '厂商', dataIndex: 'vendorName', width: 160 },
    { title: '型号编码', dataIndex: 'modelCode', width: 150 },
    { title: '型号名称', dataIndex: 'modelName', width: 160 },
    { title: '设备类型', dataIndex: 'deviceType', width: 160, render: (_, record) => renderStatusTag(record.deviceType, deviceTypeMap) },
    { title: '协议编码', dataIndex: 'protocolCode', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    actionColumn('model') as ProColumns<DeviceModelRecord>,
  ];

  const protocolColumns: ProColumns<DeviceProtocolRecord>[] = [
    { title: '协议编码', dataIndex: 'protocolCode', width: 150 },
    { title: '协议名称', dataIndex: 'protocolName', width: 160 },
    { title: '协议类型', dataIndex: 'protocolType', width: 120, render: (_, record) => renderStatusTag(record.protocolType, protocolTypeMap) },
    { title: '版本', dataIndex: 'version', width: 100 },
    { title: '鉴权方式', dataIndex: 'authMethod', width: 120, render: (_, record) => optionLabel(authMethodOptions, record.authMethod) || '-' },
    { title: '签名方式', dataIndex: 'signatureMethod', width: 140, render: (_, record) => optionLabel(signatureMethodOptions, record.signatureMethod) || '-' },
    { title: '回调验签', dataIndex: 'callbackRequired', width: 100, render: (_, record) => (record.callbackRequired === 'YES' ? '需要' : record.callbackRequired === 'NO' ? '不需要' : '-') },
    { title: '安全负责人', dataIndex: 'securityOwner', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    actionColumn('protocol') as ProColumns<DeviceProtocolRecord>,
  ];

  const bindColumns: ProColumns<DeviceBindLogRecord>[] = [
    { title: '绑定单号', dataIndex: 'bindNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '原门店', dataIndex: 'beforeStore', width: 160 },
    { title: '新门店', dataIndex: 'afterStore', width: 180 },
    { title: '原点位', dataIndex: 'beforePoint', width: 120 },
    { title: '新点位', dataIndex: 'afterPoint', width: 120 },
    { title: '绑定时间', dataIndex: 'boundAt', width: 180, render: (_, record) => formatDateTime(record.boundAt) },
    actionColumn('bind') as ProColumns<DeviceBindLogRecord>,
  ];

  return (
    <div style={{ padding: embedded ? 0 : 24 }}>
      {!embedded ? <PageBanner title="设备档案中心" subtitle="维护设备厂商、型号、协议和绑定日志。" icon={<ClusterOutlined />} /> : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="设备厂商" value={vendors.length} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="设备型号" value={models.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="协议" value={protocols.length} suffix="套" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="绑定日志" value={bindLogs.length} suffix="条" /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => setKeyword(String(values.keyword || ''))}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="输入厂商、型号、协议、设备、绑定单关键词" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { searchForm.resetFields(); setKeyword(''); }}>重置</Button>
        </Form.Item>
      </Form>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as DeviceProfileTab)}
        items={[
          { key: 'vendor', label: '设备厂商', children: <ProTable<DeviceVendorRecord> cardBordered rowKey="id" columns={vendorColumns} dataSource={filter(vendors)} loading={vendorQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('vendor')}>新增厂商</Button>]} /> },
          { key: 'model', label: '设备型号', children: <ProTable<DeviceModelRecord> cardBordered rowKey="id" columns={modelColumns} dataSource={filter(models)} loading={modelQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('model')}>新增型号</Button>]} /> },
          { key: 'protocol', label: '设备协议', children: <ProTable<DeviceProtocolRecord> cardBordered rowKey="id" columns={protocolColumns} dataSource={filter(protocols)} loading={protocolQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('protocol')}>新增协议</Button>]} /> },
          { key: 'bind', label: '绑定日志', children: <ProTable<DeviceBindLogRecord> cardBordered rowKey="id" columns={bindColumns} dataSource={filter(bindLogs)} loading={bindQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('bind')}>新增绑定</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title={`${deviceProfileModalTitleMap[activeTab]}详情`} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={deviceProfileDetailFields[activeTab]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '设备档案维护' : '设备档案新增'}
        title={`${editingRecord ? '编辑' : '新增'}${deviceProfileModalTitleMap[activeTab]}`}
        subtitle={deviceProfileModalDescMap[activeTab]}
        meta={[deviceProfileModalTitleMap[activeTab], editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          saveMutation.mutate(activeTab === 'protocol' ? { ...values, authConfig: buildAuthConfig(values) } : values);
        }}
        confirmLoading={saveMutation.isPending}
        width={980}
        okText={editingRecord ? '保存变更' : '保存档案'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            {activeTab === 'vendor' ? (
              <>
                <BusinessEditorSection icon={<ClusterOutlined />} title="厂商主体" desc="维护厂商编码、名称和状态，作为设备型号和接口协议的上游主体。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="vendorCode" label="厂商编码" rules={[{ required: true, message: '请输入厂商编码' }]}><Input placeholder="例如：VENDOR-WASH-001" /></Form.Item>
                    <Form.Item name="vendorName" label="厂商名称" rules={[{ required: true, message: '请输入厂商名称' }]}><Input placeholder="设备供应商名称" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<ApiOutlined />} title="联系人与接口" desc="沉淀厂商联系人、电话和接口地址，方便联调、故障处理和售后协作。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="contactName" label="联系人"><Input placeholder="厂商技术或商务联系人" /></Form.Item>
                    <Form.Item name="contactPhone" label="电话"><Input placeholder="联调和售后联系电话" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="apiBaseUrl" label="接口地址"><Input placeholder="例如：https://api.vendor.example.com" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}

            {activeTab === 'model' ? (
              <>
                <BusinessEditorSection icon={<ClusterOutlined />} title="型号归属" desc="将型号挂到厂商并明确型号编码、名称和状态，作为设备建档时的参考。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="vendorId" label="所属厂商"><Select showSearch optionFilterProp="label" options={vendorOptions} placeholder="请选择厂商" /></Form.Item>
                    <Form.Item name="vendorName" label="厂商名称"><Input placeholder="可手动记录厂商名称" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
                    <Form.Item name="modelCode" label="型号编码" rules={[{ required: true, message: '请输入型号编码' }]}><Input placeholder="例如：MODEL-HP-1200" /></Form.Item>
                    <Form.Item name="modelName" label="型号名称" rules={[{ required: true, message: '请输入型号名称' }]}><Input placeholder="例如：高压清洗机 1200 型" /></Form.Item>
                    <Form.Item name="deviceType" label="设备类型"><Select options={deviceTypeOptions} placeholder="请选择设备类型" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<ToolOutlined />} title="协议适配" desc="记录型号默认协议编码，后续设备接入时可直接复用。">
                  <div className="merchant-editor-fields merchant-editor-fields--two">
                    <Form.Item name="protocolCode" label="协议编码"><Input placeholder="例如：PROTO-WASH-HTTP-V1" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}

            {activeTab === 'protocol' ? (
              <>
                <BusinessEditorSection icon={<ApiOutlined />} title="协议基础" desc="维护协议编码、名称、类型和版本，作为设备控制和回调解析依据。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="protocolCode" label="协议编码" rules={[{ required: true, message: '请输入协议编码' }]}><Input placeholder="例如：PROTO-WASH-HTTP-V1" /></Form.Item>
                    <Form.Item name="protocolName" label="协议名称" rules={[{ required: true, message: '请输入协议名称' }]}><Input placeholder="例如：洗车设备 HTTP 控制协议" /></Form.Item>
                    <Form.Item name="protocolType" label="协议类型"><Select options={deviceProtocolTypeOptions} placeholder="请选择协议类型" /></Form.Item>
                    <Form.Item name="version" label="版本"><Input placeholder="例如：v1.0" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<ToolOutlined />} title="接入安全" desc="用鉴权方式、签名方式和回调验签维护接入安全，避免运营直接填写技术配置。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="authMethod" label="鉴权方式"><Select options={authMethodOptions} placeholder="请选择鉴权方式" /></Form.Item>
                    <Form.Item name="signatureMethod" label="签名方式"><Select options={signatureMethodOptions} placeholder="请选择签名方式" /></Form.Item>
                    <Form.Item name="callbackRequired" label="回调验签"><Select options={[{ value: 'YES', label: '需要' }, { value: 'NO', label: '不需要' }]} placeholder="请选择回调验签要求" /></Form.Item>
                    <Form.Item name="securityOwner" label="安全负责人"><Input placeholder="例如：设备接入-张工" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="authRemark" label="补充说明"><Input placeholder="例如：厂商回调必须携带时间戳和签名" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}

            {activeTab === 'bind' ? (
              <>
                <BusinessEditorSection icon={<LinkOutlined />} title="绑定对象" desc="记录绑定单号、设备编号和绑定时间，形成设备迁移和点位绑定台账。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="bindNo" label="绑定单号" rules={[{ required: true, message: '请输入绑定单号' }]}><Input placeholder="例如：BIND-DEV-20260510-001" /></Form.Item>
                    <Form.Item name="deviceId" label="设备"><Select showSearch optionFilterProp="label" options={deviceOptionsQuery.data || []} placeholder="请选择设备" /></Form.Item>
                    <Form.Item name="deviceCode" label="设备编号"><Input placeholder="选择设备后可回填或手动记录" /></Form.Item>
                    <Form.Item name="boundAt" label="绑定时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<ToolOutlined />} title="绑定前后" desc="记录设备迁移前后的门店和点位，方便异常履约、资产盘点和运维交接。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="beforeStore" label="原门店"><Input placeholder="原门店名称" /></Form.Item>
                    <Form.Item name="afterStore" label="新门店"><Input placeholder="新门店名称" /></Form.Item>
                    <Form.Item name="beforePoint" label="原点位"><Input placeholder="原点位编号" /></Form.Item>
                    <Form.Item name="afterPoint" label="新点位"><Input placeholder="新点位编号" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default DeviceProfileManagement;
