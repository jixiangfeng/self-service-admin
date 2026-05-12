import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, EditOutlined, EnvironmentOutlined, FieldTimeOutlined, NotificationOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, message } from 'antd';
import type { CascaderProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  marketingOptions,
  statusOptions,
  storeServiceCapabilityOptions,
  storeStatusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, StoreRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderBooleanTag, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';
import { DateTimeField, fromDateTimePickerValue, toDateTimePickerValue, RegionCascader } from '@/utils/formControls';

const normalizePickerValues = (values: Record<string, any>) => ({
  ...values,
  tempClosedUntil: fromDateTimePickerValue(values.tempClosedUntil) || values.tempClosedUntil,
});

const normalizePickerInitialValues = (record: StoreRecord) => ({
  ...record,
  tempClosedUntil: toDateTimePickerValue(record.tempClosedUntil) || record.tempClosedUntil,
  region: [record.province, record.city, record.district].filter(Boolean),
});

const StoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StoreRecord | null>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    merchantId: undefined as number | undefined,
    city: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stores', queryParams],
    queryFn: async () => (await api.store.page(queryParams)).data,
  });

  const { data: merchantOptionsData } = useQuery({
    queryKey: ['merchantOptions'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const merchantOptions = merchantOptionsData || [];
  const merchantOptionMap = useMemo(() => new Map(merchantOptions.map((item) => [item.value, item.label])), [merchantOptions]);

  const closeDrawer = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.store.add(payload),
    onSuccess: () => {
      message.success('门店创建成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.store.edit(payload),
    onSuccess: () => {
      message.success('门店更新成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.store.remove(id),
    onSuccess: () => {
      message.success('门店删除成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  const openCreateDrawer = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      marketingEnabled: 1,
      status: 'OPEN',
      tempClosed: 0,
      serviceFlags: ['SCAN', 'POINT_SELECT', 'BALANCE', 'COUPON'],
    });
    setModalVisible(true);
  };

  const columns = useMemo<ProColumns<StoreRecord>[]>(
    () => [
      {
        title: '门店名称',
        dataIndex: 'storeName',
        width: 220,
        hideInSearch: true,
        render: (_, record) => (
          <div>
            <div>{record.storeName}</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>{record.storePhone || '未配置门店电话'}</div>
          </div>
        ),
      },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店名称 / 编号 / 地址' } },
      {
        title: '所属商户',
        dataIndex: 'merchantId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(merchantOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.merchantName || '-',
      },
      { title: '门店编号', dataIndex: 'storeCode', width: 140, search: false },
      { title: '城市', dataIndex: 'city', width: 140, render: (_, record) => record.city || '-', hideInSearch: true },
      { title: '城市筛选', dataIndex: 'cityKeyword', hideInTable: true, fieldProps: { placeholder: '输入城市，例如上海' } },
      { title: '营业时间', dataIndex: 'businessHours', width: 160, search: false, render: (_, record) => record.businessHours || '-' },
      { title: '营业时段', dataIndex: 'openTime', width: 150, search: false, render: (_, record) => record.openTime && record.closeTime ? `${record.openTime}-${record.closeTime}` : '-' },
      { title: '店长', dataIndex: 'managerName', width: 140, search: false, render: (_, record) => record.managerName || '-' },
      { title: '服务半径', dataIndex: 'serviceRadius', width: 110, search: false, render: (_, record) => record.serviceRadius ? `${record.serviceRadius}km` : '-' },
      { title: '服务能力', dataIndex: 'serviceFlags', width: 280, search: false, render: (_, record) => renderOptionTags(record.serviceFlags, storeServiceCapabilityOptions) },
      { title: '营销开关', dataIndex: 'marketingEnabled', width: 120, search: false, render: (_, record) => renderBooleanTag(record.marketingEnabled) },
      { title: '临停状态', dataIndex: 'tempClosed', width: 120, search: false, render: (_, record) => renderBooleanTag(record.tempClosed, '临停中', '正常') },
      {
        title: '门店状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: buildValueEnum(storeStatusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(storeStatusOptions) as any),
      },
      { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt || record.updateTime) },
      {
        title: '操作',
        width: 160,
        search: false,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                form.setFieldsValue({
                  ...normalizePickerInitialValues(record),
                  serviceFlags: splitCommaValues(record.serviceFlags),
                });
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                showBusinessConfirm({
                  title: '确认删除门店',
                  content: `确定删除门店「${record.storeName}」吗？`,
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deleteMutation, form, merchantOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店管理" subtitle="维护门店档案、营业配置、营销开关和服务能力。" icon={<ShopOutlined />} />
      <WorkflowGuide
        title="门店经营闭环"
        summary="门店不是地址条目，而是点位、设备、商品、活动和门店运营的统一承载主体。"
        steps={[
          { title: '门店建档', description: '补齐地址、营业时间、公告和联系方式', status: 'finish', tag: '当前页' },
          { title: '点位设备', description: '配置点位、二维码和设备绑定', status: 'process', tag: '下一步：点位 / 设备' },
          { title: '商品活动', description: '决定商品适用范围和营销开关', status: 'wait', tag: '商品与服务 / 活动营销' },
          { title: '门店运营', description: '切到运营台跟进班次、巡检和异常', status: 'wait', tag: '门店运营台' },
        ]}
        actions={[
          { key: 'create', label: '新建门店', type: 'primary', onClick: openCreateDrawer },
          { key: 'ops', label: '去门店运营台', onClick: () => navigate('/store-operations') },
        ]}
      />

      <ProTable<StoreRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1860 }}
        pagination={{
          current: data?.current || queryParams.pageNum,
          pageSize: data?.size || queryParams.pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
        }}
        toolBarRender={() => [
          <Button key="ops" onClick={() => navigate('/store-operations')}>
            去门店运营台
          </Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新建门店
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams({
            pageNum: 1,
            pageSize: queryParams.pageSize,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            merchantId: typeof values.merchantId === 'number' ? values.merchantId : undefined,
            city: typeof values.cityKeyword === 'string' ? values.cityKeyword.trim() || undefined : undefined,
            status: typeof values.status === 'string' ? values.status : undefined,
          });
        }}
        onReset={() => {
          setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, merchantId: undefined, city: undefined, status: undefined });
        }}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '门店档案维护' : '门店建档配置'}
        title={editingRecord ? `编辑门店 · ${editingRecord.storeName}` : '新建门店'}
        subtitle="门店是点位、设备、商品、活动和运营任务的承载主体，建档时同步补齐地址、营业、服务能力和公告信息。"
        meta={['门店闭环', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        width={1220}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingRecord ? '保存变更' : '创建门店'}
        forceRender
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            const { region, ...restValues } = values;
            const payload = {
              ...normalizePickerValues(restValues),
              serviceFlags: joinCommaValues(values.serviceFlags),
            };
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...payload });
              return;
            }
            createMutation.mutate(payload);
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="基础归属"
              desc="明确门店属于哪个商户，并沉淀门店名称、编号、封面和负责人，后续点位、设备和交易都会引用这里。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择所属商户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={merchantOptions as SelectOptionRecord[]}
                    placeholder="请选择商户"
                    onChange={(value) => form.setFieldValue('merchantName', merchantOptionMap.get(value))}
                  />
                </Form.Item>
                <Form.Item name="merchantName" label="商户名称">
                  <Input disabled placeholder="选择商户后自动带出" />
                </Form.Item>
                <Form.Item name="storeName" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
                  <Input placeholder="例如：鲸洗虹桥枢纽店" />
                </Form.Item>
                <Form.Item name="storeCode" label="门店编号" rules={[{ required: true, message: '请输入门店编号' }]}>
                  <Input placeholder="例如：STORE-SH-HQ-001" />
                </Form.Item>
                <Form.Item name="storePhone" label="门店电话">
                  <Input placeholder="用于小程序展示和客服回访" />
                </Form.Item>
                <Form.Item name="managerName" label="店长 / 负责人">
                  <Input placeholder="现场运营负责人" />
                </Form.Item>
                <Form.Item name="managerPhone" label="负责人电话">
                  <Input placeholder="异常、巡检和售后通知手机号" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="coverUrl" label="门店封面">
                  <OssImageUpload prefix="store/covers" placeholder="上传门店封面" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<EnvironmentOutlined />}
              title="位置与服务范围"
              desc="补齐行政区、详细地址、经纬度和服务半径，支撑门店检索、导航、附近门店和服务范围控制。"
            >
              <div className="merchant-editor-fields">
                <Form.Item className="merchant-editor-field-span-all" name="region" label="省 / 市 / 区">
                  <RegionCascader
                    onChange={(value: CascaderProps['value']) => {
                      const [province, city, district] = (value || []) as string[];
                      form.setFieldsValue({ province, city, district });
                    }}
                  />
                </Form.Item>
                <Form.Item name="province" hidden><Input /></Form.Item>
                <Form.Item name="city" hidden><Input /></Form.Item>
                <Form.Item name="district" hidden><Input /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="address" label="详细地址">
                  <Input placeholder="精确到园区、停车场、楼栋或入口" />
                </Form.Item>
                <Form.Item name="longitude" label="经度">
                  <Input placeholder="例如：121.473701" />
                </Form.Item>
                <Form.Item name="latitude" label="纬度">
                  <Input placeholder="例如：31.230416" />
                </Form.Item>
                <Form.Item name="serviceRadius" label="服务半径 km">
                  <Input placeholder="例如：3" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<FieldTimeOutlined />}
              title="营业与能力"
              desc="配置营业时段、节假日策略、营销开关、临停原因和服务能力，决定用户是否能在该店下单。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="businessHours" label="营业时间">
                  <Input placeholder="例如：08:00-22:00" />
                </Form.Item>
                <Form.Item name="openTime" label="开门时间">
                  <Input placeholder="例如：08:00" />
                </Form.Item>
                <Form.Item name="closeTime" label="关门时间">
                  <Input placeholder="例如：22:00" />
                </Form.Item>
                <Form.Item name="holidayHours" label="节假日营业时间">
                  <Input placeholder="例如：节假日 09:00-21:00" />
                </Form.Item>
                <Form.Item name="marketingEnabled" label="营销开关">
                  <Select options={marketingOptions} placeholder="是否参与营销活动" />
                </Form.Item>
                <Form.Item name="status" label="门店状态">
                  <Select options={storeStatusOptions} placeholder="请选择门店状态" />
                </Form.Item>
                <Form.Item name="tempClosed" label="是否临时停业">
                  <Select options={statusOptions.map((item) => ({ value: item.value, label: item.value === 1 ? '是' : '否' }))} placeholder="请选择临停状态" />
                </Form.Item>
                <Form.Item name="tempClosedReason" label="临停原因">
                  <Input placeholder="例如：设备检修 / 场地施工" />
                </Form.Item>
                <Form.Item name="tempClosedUntil" label="临停截止时间">
                  <DateTimeField />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="serviceFlags" label="服务能力">
                  <Select mode="multiple" options={storeServiceCapabilityOptions} placeholder="选择门店支持的能力" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<NotificationOutlined />}
              title="展示与公告"
              desc="维护门店图片、公告和介绍，让小程序展示、活动落地页和运营交接信息保持一致。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item className="merchant-editor-field-span-2" name="imageUrls" label="门店图片">
                  <OssImageUpload multiple prefix="store/images" placeholder="上传门店图片" />
                </Form.Item>
                <Form.Item name="notice" label="门店公告">
                  <Input.TextArea rows={3} placeholder="例如：夜间洗车请按现场引导停车" />
                </Form.Item>
                <Form.Item name="intro" label="门店介绍">
                  <Input.TextArea rows={3} placeholder="描述门店定位、设备组合和经营重点" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default StoreManagement;
