import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  publishStatusOptions,
  storeServiceCapabilityOptions,
  storeStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type {
  StoreBusinessHoursRecord,
  StoreChangeLogRecord,
  StoreImageRecord,
  StoreServiceCapabilityRecord,
  StoreTempCloseRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type StoreProfileTab = 'image' | 'business' | 'tempClose' | 'capability' | 'change';
type EditableRecord = StoreImageRecord | StoreBusinessHoursRecord | StoreTempCloseRecord | StoreServiceCapabilityRecord | StoreChangeLogRecord;

const publishStatusMap = buildValueEnum(publishStatusOptions);
const storeStatusMap = buildValueEnum(storeStatusOptions);
const capabilityMap = buildValueEnum(storeServiceCapabilityOptions);

const storeProfileDetailFields: Record<StoreProfileTab, DetailField<any>[]> = {
  image: [
    { name: 'storeName', label: '门店' },
    { name: 'imageType', label: '图片类型' },
    { name: 'imageUrl', label: '图片地址' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间' },
    { name: 'updatedAt', label: '更新时间' },
  ],
  business: [
    { name: 'storeName', label: '门店' },
    { name: 'weekday', label: '星期' },
    { name: 'openTime', label: '开门时间' },
    { name: 'closeTime', label: '闭店时间' },
    { name: 'status', label: '状态' },
  ],
  tempClose: [
    { name: 'storeName', label: '门店' },
    { name: 'closeReason', label: '临停原因' },
    { name: 'startAt', label: '开始时间' },
    { name: 'endAt', label: '结束时间' },
    { name: 'operator', label: '操作人' },
    { name: 'status', label: '状态' },
  ],
  capability: [
    { name: 'storeName', label: '门店' },
    { name: 'capabilityCode', label: '能力' },
    { name: 'configJson', label: '配置' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间' },
  ],
  change: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'storeName', label: '门店' },
    { name: 'changeType', label: '变更类型' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'operator', label: '操作人' },
    { name: 'changedAt', label: '变更时间' },
  ],
};

const StoreProfileManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<StoreProfileTab>('image');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForProfiles'], queryFn: async () => (await api.store.options()).data });
  const storeMap = new Map((storeOptions || []).map((item) => [item.value, item.label]));
  const withStoreName = <T extends { storeId?: number; storeName?: string }>(records: T[] | undefined) =>
    (records || []).map((record) => ({ ...record, storeName: record.storeName || (record.storeId ? storeMap.get(record.storeId) : '-') || '-' }));

  const imageQuery = useQuery({ queryKey: ['storeImages'], queryFn: async () => (await api.storeImage.page({ pageNum: 1, pageSize: 200 })).data });
  const businessQuery = useQuery({ queryKey: ['storeBusinessHours'], queryFn: async () => (await api.storeBusinessHours.page({ pageNum: 1, pageSize: 200 })).data });
  const tempCloseQuery = useQuery({ queryKey: ['storeTempCloseRecords'], queryFn: async () => (await api.storeTempCloseRecord.page({ pageNum: 1, pageSize: 200 })).data });
  const capabilityQuery = useQuery({ queryKey: ['storeServiceCapabilities'], queryFn: async () => (await api.storeServiceCapability.page({ pageNum: 1, pageSize: 200 })).data });
  const changeQuery = useQuery({ queryKey: ['storeChangeLogs'], queryFn: async () => (await api.storeChangeLog.page({ pageNum: 1, pageSize: 200 })).data });

  const images = withStoreName(imageQuery.data?.records);
  const businessHours = withStoreName(businessQuery.data?.records);
  const tempCloses = withStoreName(tempCloseQuery.data?.records);
  const capabilities = withStoreName(capabilityQuery.data?.records);
  const changes = withStoreName(changeQuery.data?.records);

  const invalidateTab = (tab: StoreProfileTab) => {
    if (tab === 'image') queryClient.invalidateQueries({ queryKey: ['storeImages'] });
    if (tab === 'business') queryClient.invalidateQueries({ queryKey: ['storeBusinessHours'] });
    if (tab === 'tempClose') queryClient.invalidateQueries({ queryKey: ['storeTempCloseRecords'] });
    if (tab === 'capability') queryClient.invalidateQueries({ queryKey: ['storeServiceCapabilities'] });
    if (tab === 'change') queryClient.invalidateQueries({ queryKey: ['storeChangeLogs'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'image') return payload.id ? api.storeImage.edit(payload) : api.storeImage.add(payload);
      if (activeTab === 'business') return payload.id ? api.storeBusinessHours.edit(payload) : api.storeBusinessHours.add(payload);
      if (activeTab === 'tempClose') return payload.id ? api.storeTempCloseRecord.edit(payload) : api.storeTempCloseRecord.add(payload);
      if (activeTab === 'capability') return payload.id ? api.storeServiceCapability.edit(payload) : api.storeServiceCapability.add(payload);
      return payload.id ? api.storeChangeLog.edit(payload) : api.storeChangeLog.add(payload);
    },
    onSuccess: () => {
      message.success('门店档案已保存');
      invalidateTab(activeTab);
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: StoreProfileTab; id: number }) => {
      if (tab === 'image') return api.storeImage.remove(id);
      if (tab === 'business') return api.storeBusinessHours.remove(id);
      if (tab === 'tempClose') return api.storeTempCloseRecord.remove(id);
      if (tab === 'capability') return api.storeServiceCapability.remove(id);
      return api.storeChangeLog.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('门店档案已删除');
      invalidateTab(variables.tab);
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (tab: StoreProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...(record as unknown as Record<string, string | number | undefined>) });
    } else if (tab === 'image') {
      form.setFieldsValue({ imageType: 'COVER', sortNo: 0, status: 'PUBLISHED' });
    } else if (tab === 'business') {
      form.setFieldsValue({ weekday: '周一至周日', status: 'OPEN' });
    } else if (tab === 'tempClose') {
      form.setFieldsValue({ status: 'PAUSED' });
    } else if (tab === 'capability') {
      form.setFieldsValue({ capabilityCode: 'SCAN', status: 'PUBLISHED' });
    }
    setModalVisible(true);
  };

  const actionColumn = (tab: StoreProfileTab): ProColumns<EditableRecord> => ({
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

  const imageColumns: ProColumns<StoreImageRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '图片类型', dataIndex: 'imageType', width: 130 },
    { title: '图片地址', dataIndex: 'imageUrl', width: 280 },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('image') as ProColumns<StoreImageRecord>,
  ];
  const businessColumns: ProColumns<StoreBusinessHoursRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '星期', dataIndex: 'weekday', width: 140 },
    { title: '开门时间', dataIndex: 'openTime', width: 120 },
    { title: '闭店时间', dataIndex: 'closeTime', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, storeStatusMap) },
    actionColumn('business') as ProColumns<StoreBusinessHoursRecord>,
  ];
  const tempCloseColumns: ProColumns<StoreTempCloseRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '临停原因', dataIndex: 'closeReason', width: 180 },
    { title: '开始时间', dataIndex: 'startAt', width: 180, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'endAt', width: 180, render: (_, record) => formatDateTime(record.endAt) },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, storeStatusMap) },
    actionColumn('tempClose') as ProColumns<StoreTempCloseRecord>,
  ];
  const capabilityColumns: ProColumns<StoreServiceCapabilityRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '能力', dataIndex: 'capabilityCode', width: 130, render: (_, record) => renderStatusTag(record.capabilityCode, capabilityMap) },
    { title: '配置', dataIndex: 'configJson', width: 280 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('capability') as ProColumns<StoreServiceCapabilityRecord>,
  ];
  const changeColumns: ProColumns<StoreChangeLogRecord>[] = [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '变更类型', dataIndex: 'changeType', width: 150 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    actionColumn('change') as ProColumns<StoreChangeLogRecord>,
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店档案中心" subtitle="维护门店图片、营业时间、临停记录、服务能力和变更日志。" icon={<HomeOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="门店图片" value={images.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="营业时间" value={businessHours.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="临停中" value={tempCloses.filter((item) => item.status === 'PAUSED').length} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="服务能力" value={capabilities.length} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="变更日志" value={changes.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入门店、图片、营业时间、能力、变更关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as StoreProfileTab)}
        items={[
          { key: 'image', label: '门店图片', children: <ProTable<StoreImageRecord> cardBordered rowKey="id" columns={imageColumns} dataSource={filter(images)} loading={imageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('image')}>新增图片</Button>]} /> },
          { key: 'business', label: '营业时间', children: <ProTable<StoreBusinessHoursRecord> cardBordered rowKey="id" columns={businessColumns} dataSource={filter(businessHours)} loading={businessQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('business')}>配置时间</Button>]} /> },
          { key: 'tempClose', label: '临停记录', children: <ProTable<StoreTempCloseRecord> cardBordered rowKey="id" columns={tempCloseColumns} dataSource={filter(tempCloses)} loading={tempCloseQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1260 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('tempClose')}>新增临停</Button>]} /> },
          { key: 'capability', label: '服务能力', children: <ProTable<StoreServiceCapabilityRecord> cardBordered rowKey="id" columns={capabilityColumns} dataSource={filter(capabilities)} loading={capabilityQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('capability')}>配置能力</Button>]} /> },
          { key: 'change', label: '变更日志', children: <ProTable<StoreChangeLogRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes)} loading={changeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('change')}>新增变更</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={storeProfileDetailFields[activeTab]} /> : null}
      </Modal>

      <Modal
        title={editingRecord ? '编辑门店档案' : '新增门店档案'}
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
            <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择门店' }]}>
              <Select showSearch optionFilterProp="label" options={storeOptions || []} />
            </Form.Item>
            {activeTab === 'image' ? (
              <>
                <Form.Item name="imageType" label="图片类型" rules={[{ required: true, message: '请输入图片类型' }]}><Input /></Form.Item>
                <Form.Item className="modal-span-2" name="imageUrl" label="图片地址" rules={[{ required: true, message: '请输入图片地址' }]}><Input /></Form.Item>
                <Form.Item name="sortNo" label="排序"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'business' ? (
              <>
                <Form.Item name="weekday" label="星期" rules={[{ required: true, message: '请输入星期' }]}><Input /></Form.Item>
                <Form.Item name="openTime" label="开门时间" rules={[{ required: true, message: '请输入开门时间' }]}><Input placeholder="08:00" /></Form.Item>
                <Form.Item name="closeTime" label="闭店时间" rules={[{ required: true, message: '请输入闭店时间' }]}><Input placeholder="23:00" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={storeStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'tempClose' ? (
              <>
                <Form.Item className="modal-span-2" name="closeReason" label="临停原因" rules={[{ required: true, message: '请输入临停原因' }]}><Input /></Form.Item>
                <Form.Item name="startAt" label="开始时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="endAt" label="结束时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={storeStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'capability' ? (
              <>
                <Form.Item name="capabilityCode" label="能力" rules={[{ required: true, message: '请选择能力' }]}><Select options={storeServiceCapabilityOptions} /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
                <Form.Item className="modal-span-2" name="configJson" label="配置"><Input.TextArea rows={4} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'change' ? (
              <>
                <Form.Item name="changeNo" label="变更单号" rules={[{ required: true, message: '请输入变更单号' }]}><Input /></Form.Item>
                <Form.Item name="changeType" label="变更类型" rules={[{ required: true, message: '请输入变更类型' }]}><Input /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
                <Form.Item name="changedAt" label="变更时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item className="modal-span-2" name="beforeValue" label="变更前"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="afterValue" label="变更后"><Input.TextArea rows={3} /></Form.Item>
              </>
            ) : null}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreProfileManagement;
