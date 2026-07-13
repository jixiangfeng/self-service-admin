import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, HomeOutlined, NotificationOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  storeServiceCapabilityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  StoreImageRecord,
  StoreServiceCapabilityRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag, safeJsonParse, formatEnumText } from '@/pages/Business/shared';

type StoreProfileTab = 'image' | 'capability';
type EditableRecord = StoreImageRecord | StoreServiceCapabilityRecord;
type StoreProfileSearchValues = { keyword?: string; storeId?: number };
const storeProfilePublishStatusOptions = [
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'DISABLED', label: '已禁用' },
];
const storeImageTypeOptions = [
  { value: 'COVER', label: '封面图' },
  { value: 'ENVIRONMENT', label: '环境图' },
  { value: 'EQUIPMENT', label: '设备图' },
  { value: 'OTHER', label: '其他' },
];
const storeProfilePublishStatusMap = buildValueEnum(storeProfilePublishStatusOptions);

const storeProfileModalTitleMap: Record<StoreProfileTab, string> = {
  image: '门店图片',
  capability: '服务能力',
};

const storeProfileModalDescMap: Record<StoreProfileTab, string> = {
  image: '维护门店封面、环境图和展示排序，保证小程序门店页有可用素材。',
  capability: '配置门店可用能力和扩展参数，承接服务、活动和履约范围。',
};

const capabilityLimitOptions = [
  { value: 'ALL_DAY', label: '全天开放' },
  { value: 'BUSINESS_HOURS', label: '营业中开放' },
  { value: 'APPOINTMENT_ONLY', label: '仅预约可用' },
];

const capabilityPointOptions = [
  { value: 'ALL_POINTS', label: '全部点位' },
  { value: 'CAR_WASH_ONLY', label: '洗车点位' },
  { value: 'RETAIL_ONLY', label: '零售点位' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const buildCapabilityConfig = (values: Record<string, any>) =>
  JSON.stringify({
    limitMode: values.limitMode,
    pointScope: values.pointScope,
    extraLimit: values.extraLimit,
  });

const parseCapabilityConfig = (configJson?: string) =>
  safeJsonParse<{ limitMode?: string; pointScope?: string; extraLimit?: string }>(configJson, {});

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
  capability: [
    { name: 'storeName', label: '门店' },
    { name: 'capabilityCode', label: '能力' },
    { name: 'limitMode', label: '开放限制', render: (_, record) => optionLabel(capabilityLimitOptions, record.limitMode) || '-' },
    { name: 'pointScope', label: '适用点位', render: (_, record) => optionLabel(capabilityPointOptions, record.pointScope) || '-' },
    { name: 'extraLimit', label: '补充限制' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间' },
  ],
};

const StoreProfileManagement: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [storeId, setStoreId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<StoreProfileTab>('image');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [detailTab, setDetailTab] = useState<StoreProfileTab>('image');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [searchForm] = Form.useForm<StoreProfileSearchValues>();

  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForProfiles'], queryFn: async () => (await api.store.options()).data });
  const storeMap = new Map((storeOptions || []).map((item) => [item.value, item.label]));
  const withStoreName = <T extends { storeId?: number; storeName?: string }>(records: T[] | undefined) =>
    (records || []).map((record) => ({ ...record, storeName: record.storeName || (record.storeId ? storeMap.get(record.storeId) : '-') || '-' }));

  const storeProfileQueryParams = { current: 1, size: 200, storeId };
  const imageQuery = useQuery({ queryKey: ['storeImages', storeId], queryFn: async () => (await api.storeImage.page(storeProfileQueryParams)).data });
  const capabilityQuery = useQuery({ queryKey: ['storeServiceCapabilities', storeId], queryFn: async () => (await api.storeServiceCapability.page(storeProfileQueryParams)).data });

  const images = withStoreName(imageQuery.data?.records);
  const capabilities = withStoreName(capabilityQuery.data?.records)
    .map((record) => ({ ...record, ...parseCapabilityConfig(record.configJson) }));

  const invalidateTab = (tab: StoreProfileTab) => {
    if (tab === 'image') queryClient.invalidateQueries({ queryKey: ['storeImages'] });
    if (tab === 'capability') queryClient.invalidateQueries({ queryKey: ['storeServiceCapabilities'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'image') return payload.id ? api.storeImage.edit(payload) : api.storeImage.add(payload);
      if (payload.id) return api.storeServiceCapability.edit(payload);
      return api.storeServiceCapability.addBatch({
        storeId: Number(payload.storeId),
        capabilityCodes: Array.isArray(payload.capabilityCodes) ? payload.capabilityCodes.map(String) : [],
        configJson: typeof payload.configJson === 'string' ? payload.configJson : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
      });
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
      return api.storeServiceCapability.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('门店档案已删除');
      invalidateTab(variables.tab);
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const confirmRemove = (tab: StoreProfileTab, id: number) => {
    showBusinessConfirm({
      title: '确认删除该门店档案',
      content: `删除后将移除「${storeProfileModalTitleMap[tab]}」记录，并影响门店运营资料追溯，请确认后继续。`,
      onOk: () => removeMutation.mutate({ tab, id }),
    });
  };

  const openModal = (tab: StoreProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        ...(tab === 'capability' ? parseCapabilityConfig(String((record as StoreServiceCapabilityRecord).configJson || '')) : {}),
      });
    } else if (tab === 'image') {
      form.setFieldsValue({ storeId, imageType: 'COVER', sortNo: 0, status: 'PUBLISHED' });
    } else if (tab === 'capability') {
      form.setFieldsValue({ storeId, capabilityCodes: [], status: 'PUBLISHED' });
    }
    setModalVisible(true);
  };

  const openDetail = (tab: StoreProfileTab, record: EditableRecord) => {
    setDetailTab(tab);
    setDetail(record);
  };

  const actionColumn = (tab: StoreProfileTab): ProColumns<EditableRecord> => ({
    title: '操作',
    width: 170,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" onClick={() => openDetail(tab, record)}>详情</Button>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(tab, record)}>编辑</Button>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove(tab, record.id)}>删除</Button>
      </>
    ),
  });

  const imageColumns: ProColumns<StoreImageRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '图片类型', dataIndex: 'imageType', width: 130 , render: (value) => formatEnumText(value, 'imageType', '图片类型') },
    { title: '图片地址', dataIndex: 'imageUrl', width: 280 },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, storeProfilePublishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('image') as ProColumns<StoreImageRecord>,
  ];
  const capabilityColumns: ProColumns<StoreServiceCapabilityRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '能力', dataIndex: 'capabilityCode', width: 160, render: (value) => formatEnumText(value, 'capabilityCode', '能力') },
    { title: '开放限制', dataIndex: 'limitMode', width: 150, render: (_, record) => optionLabel(capabilityLimitOptions, record.limitMode) || '-' },
    { title: '适用点位', dataIndex: 'pointScope', width: 150, render: (_, record) => optionLabel(capabilityPointOptions, record.pointScope) || '-' },
    { title: '补充限制', dataIndex: 'extraLimit', width: 220, render: (_, record) => record.extraLimit || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, storeProfilePublishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('capability') as ProColumns<StoreServiceCapabilityRecord>,
  ];
  return (
    <div style={{ padding: embedded ? 0 : 24 }}>
      {!embedded ? <PageBanner title="门店档案中心" subtitle="维护门店图片和服务能力。" icon={<HomeOutlined />} /> : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={12}><Card><Statistic title="门店图片" value={images.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={12}><Card><Statistic title="服务能力" value={capabilities.length} suffix="项" /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => {
          setKeyword(String(values.keyword || ''));
          setStoreId(values.storeId);
        }}
      >
        <Form.Item name="storeId" label="所属门店">
          <Select allowClear showSearch optionFilterProp="label" options={storeOptions || []} placeholder="全部门店" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="输入门店、图片、能力关键词" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { searchForm.resetFields(); setKeyword(''); setStoreId(undefined); }}>重置</Button>
        </Form.Item>
      </Form>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as StoreProfileTab)}
        items={[
          { key: 'image', label: '门店图片', children: <ProTable<StoreImageRecord> cardBordered rowKey="id" columns={imageColumns} dataSource={filter(images)} loading={imageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('image')}>新增图片</Button>]} /> },
          { key: 'capability', label: '服务能力', children: <ProTable<StoreServiceCapabilityRecord> cardBordered rowKey="id" columns={capabilityColumns} dataSource={filter(capabilities)} loading={capabilityQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1440 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('capability')}>新增能力</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title={`${storeProfileModalTitleMap[detailTab]}详情`} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={storeProfileDetailFields[detailTab]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '门店档案维护' : '门店档案新增'}
        title={`${editingRecord ? '编辑' : '新增'}${storeProfileModalTitleMap[activeTab]}`}
        subtitle={storeProfileModalDescMap[activeTab]}
        meta={[storeProfileModalTitleMap[activeTab], editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => {
          const values = await form.validateFields();
          saveMutation.mutate(activeTab === 'capability' ? { ...values, configJson: buildCapabilityConfig(values as Record<string, any>) } : values);
        }}
        confirmLoading={saveMutation.isPending}
        width={980}
        okText={editingRecord ? '保存修改' : '保存档案'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<HomeOutlined />}
              title="归属门店"
              desc="所有档案都必须挂到具体门店，保证展示和服务能力能回到同一个经营主体。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select showSearch optionFilterProp="label" options={storeOptions || []} placeholder="请选择门店" />
                </Form.Item>
                {activeTab === 'image' ? <Form.Item name="imageType" label="图片类型" rules={[{ required: true, message: '请选择图片类型' }]}><Select options={storeImageTypeOptions} placeholder="请选择图片类型" /></Form.Item> : null}
                {activeTab === 'capability' ? (
                  <Form.Item
                    name={editingRecord ? 'capabilityCode' : 'capabilityCodes'}
                    label={editingRecord ? '能力' : '能力（可多选）'}
                    rules={[{ required: true, message: '请至少选择一项能力' }]}
                  >
                    <Select
                      mode={editingRecord ? undefined : 'multiple'}
                      options={storeServiceCapabilityOptions}
                      placeholder={editingRecord ? '请选择服务能力' : '可一次选择多项服务能力'}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                ) : null}
              </div>
            </BusinessEditorSection>

            {activeTab === 'image' ? (
              <BusinessEditorSection icon={<NotificationOutlined />} title="图片展示" desc="配置图片地址、排序和发布状态，支撑门店详情页展示。">
                <div className="merchant-editor-fields">
                  <Form.Item className="merchant-editor-field-span-all" name="imageUrl" label="图片" rules={[{ required: true, message: '请上传图片' }]}><OssImageUpload prefix="store/images" placeholder="上传图片" /></Form.Item>
                  <Form.Item name="sortNo" label="排序"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={storeProfilePublishStatusOptions} placeholder="请选择状态" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {activeTab === 'capability' ? (
              <BusinessEditorSection icon={<ToolOutlined />} title="能力策略" desc="用开放限制、适用点位和补充限制维护能力策略，不让运营直接维护技术配置。">
                <div className="merchant-editor-fields merchant-editor-fields--two">
                  <Form.Item name="status" label="状态"><Select options={storeProfilePublishStatusOptions} placeholder="请选择状态" /></Form.Item>
                  <Form.Item name="limitMode" label="开放限制"><Select options={capabilityLimitOptions} placeholder="请选择开放限制" /></Form.Item>
                  <Form.Item name="pointScope" label="适用点位"><Select options={capabilityPointOptions} placeholder="请选择适用点位" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="extraLimit" label="补充限制"><Input placeholder="例如：夜间仅开放 1-3 号洗车位" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default StoreProfileManagement;
