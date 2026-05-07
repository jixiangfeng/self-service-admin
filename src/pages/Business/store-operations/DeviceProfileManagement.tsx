import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Statistic, Tabs, message } from 'antd';
import { ClusterOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  deviceProtocolTypeOptions,
  deviceTypeOptions,
  publishStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import api from '@/services/backendService';
import type {
  DeviceBindLogRecord,
  DeviceModelRecord,
  DeviceProtocolRecord,
  DeviceVendorRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type DeviceProfileTab = 'vendor' | 'model' | 'protocol' | 'bind';
type EditableRecord = DeviceVendorRecord | DeviceModelRecord | DeviceProtocolRecord | DeviceBindLogRecord;

const publishStatusMap = buildValueEnum(publishStatusOptions);
const deviceTypeMap = buildValueEnum(deviceTypeOptions);
const protocolTypeMap = buildValueEnum(deviceProtocolTypeOptions);

const DeviceProfileManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<DeviceProfileTab>('vendor');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const vendorQuery = useQuery({ queryKey: ['deviceVendors'], queryFn: async () => (await api.deviceVendor.page({ pageNum: 1, pageSize: 200 })).data });
  const modelQuery = useQuery({ queryKey: ['deviceModels'], queryFn: async () => (await api.deviceModel.page({ pageNum: 1, pageSize: 200 })).data });
  const protocolQuery = useQuery({ queryKey: ['deviceProtocols'], queryFn: async () => (await api.deviceProtocol.page({ pageNum: 1, pageSize: 200 })).data });
  const bindQuery = useQuery({ queryKey: ['deviceBindLogs'], queryFn: async () => (await api.deviceBindLog.page({ pageNum: 1, pageSize: 200 })).data });

  const vendors = vendorQuery.data?.records || [];
  const models = modelQuery.data?.records || [];
  const protocols = protocolQuery.data?.records || [];
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

  const openModal = (tab: DeviceProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...(record as unknown as Record<string, string | number | undefined>) });
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
        <Popconfirm title="确认删除该记录？" onConfirm={() => removeMutation.mutate({ tab, id: record.id })}>
          <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
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
    { title: '鉴权配置', dataIndex: 'authConfig', width: 240 },
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
    <div style={{ padding: 24 }}>
      <PageBanner title="设备档案中心" subtitle="维护设备厂商、型号、协议和绑定日志。" icon={<ClusterOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="设备厂商" value={vendors.length} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="设备型号" value={models.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="协议" value={protocols.length} suffix="套" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="绑定日志" value={bindLogs.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入厂商、型号、协议、设备、绑定单关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

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

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={editingRecord ? '编辑设备档案' : '新增设备档案'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(await form.validateFields())}
        confirmLoading={saveMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="modal-grid">
            {activeTab === 'vendor' ? (
              <>
                <Form.Item name="vendorCode" label="厂商编码" rules={[{ required: true, message: '请输入厂商编码' }]}><Input /></Form.Item>
                <Form.Item name="vendorName" label="厂商名称" rules={[{ required: true, message: '请输入厂商名称' }]}><Input /></Form.Item>
                <Form.Item name="contactName" label="联系人"><Input /></Form.Item>
                <Form.Item name="contactPhone" label="电话"><Input /></Form.Item>
                <Form.Item className="modal-span-2" name="apiBaseUrl" label="接口地址"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'model' ? (
              <>
                <Form.Item name="vendorId" label="所属厂商"><Select showSearch optionFilterProp="label" options={vendorOptions} /></Form.Item>
                <Form.Item name="vendorName" label="厂商名称"><Input /></Form.Item>
                <Form.Item name="modelCode" label="型号编码" rules={[{ required: true, message: '请输入型号编码' }]}><Input /></Form.Item>
                <Form.Item name="modelName" label="型号名称" rules={[{ required: true, message: '请输入型号名称' }]}><Input /></Form.Item>
                <Form.Item name="deviceType" label="设备类型"><Select options={deviceTypeOptions} /></Form.Item>
                <Form.Item name="protocolCode" label="协议编码"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'protocol' ? (
              <>
                <Form.Item name="protocolCode" label="协议编码" rules={[{ required: true, message: '请输入协议编码' }]}><Input /></Form.Item>
                <Form.Item name="protocolName" label="协议名称" rules={[{ required: true, message: '请输入协议名称' }]}><Input /></Form.Item>
                <Form.Item name="protocolType" label="协议类型"><Select options={deviceProtocolTypeOptions} /></Form.Item>
                <Form.Item name="version" label="版本"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
                <Form.Item className="modal-span-2" name="authConfig" label="鉴权配置"><Input.TextArea rows={4} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'bind' ? (
              <>
                <Form.Item name="bindNo" label="绑定单号" rules={[{ required: true, message: '请输入绑定单号' }]}><Input /></Form.Item>
                <Form.Item name="deviceId" label="设备"><Select showSearch optionFilterProp="label" options={deviceOptionsQuery.data || []} /></Form.Item>
                <Form.Item name="deviceCode" label="设备编号"><Input /></Form.Item>
                <Form.Item name="beforeStore" label="原门店"><Input /></Form.Item>
                <Form.Item name="afterStore" label="新门店"><Input /></Form.Item>
                <Form.Item name="beforePoint" label="原点位"><Input /></Form.Item>
                <Form.Item name="afterPoint" label="新点位"><Input /></Form.Item>
                <Form.Item name="boundAt" label="绑定时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
              </>
            ) : null}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceProfileManagement;
