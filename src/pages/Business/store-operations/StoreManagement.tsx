import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, EditOutlined, EnvironmentOutlined, FieldTimeOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Select, Space, Tabs, message } from 'antd';
import type { CascaderProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  storeStatusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, StoreFullProfileRecord, StoreRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, CoreFlowPanel, formatDateTime, OperatorTips, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { RegionCascader } from '@/utils/formControls';
import StoreFullProfileDrawer from './StoreFullProfileDrawer';
import StoreProfileManagement from './StoreProfileManagement';

const normalizePickerInitialValues = (record: StoreRecord) => ({
  ...record,
  region: [record.province, record.city, record.district].filter(Boolean),
});

const storeStatusMap = buildValueEnum(storeStatusOptions);

const StoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fullProfile, setFullProfile] = useState<StoreFullProfileRecord | undefined>();
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

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.store.changeStatus(id, status),
    onSuccess: () => {
      message.success('门店状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  const confirmStoreStatus = (record: StoreRecord) => {
    const nextStatus = record.status === 'OPEN' ? 'PAUSED' : 'OPEN';
    const actionName = nextStatus === 'OPEN' ? '开业' : '暂停';
    showBusinessConfirm({
      title: `确认${actionName}门店`,
      content: `确定将门店「${record.storeName}」调整为${actionName}状态吗？该操作会影响用户端可见性和履约接单。`,
      okText: `确认${actionName}`,
      danger: nextStatus !== 'OPEN',
      onOk: () => statusMutation.mutate({ id: record.id, status: nextStatus }),
    });
  };

  const openCreateDrawer = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'OPEN',
    });
    setModalVisible(true);
  };

  const openFullProfile = React.useCallback(async (record: StoreRecord) => {
    setProfileVisible(true);
    setProfileLoading(true);
    try {
      const res = await api.store.fullProfile(record.id);
      setFullProfile(res.data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

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
      { title: '店长', dataIndex: 'managerName', width: 140, search: false, render: (_, record) => record.managerName || '-' },
      {
        title: '门店状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: storeStatusMap,
        render: (_, record) => renderStatusTag(record.status, storeStatusMap as any),
      },
      { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt || record.updateTime) },
      {
        title: '操作',
        width: 220,
        search: false,
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openFullProfile(record)}>
              详情
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                form.setFieldsValue(normalizePickerInitialValues(record));
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
            <Button size="small" loading={statusMutation.isPending} onClick={() => confirmStoreStatus(record)}>
              {record.status === 'OPEN' ? '暂停' : '开业'}
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
    [deleteMutation, form, merchantOptions, openFullProfile, statusMutation]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店管理" subtitle="维护门店基础信息、位置、当前营业状态和公告。" icon={<ShopOutlined />} />
      <WorkflowGuide
        title="门店经营闭环"
        summary="门店不是地址条目，而是点位、设备、商品、活动和门店运营的统一承载主体。"
        steps={[
          { title: '门店建档', description: '补齐地址、营业时间、公告和联系方式', status: 'finish', tag: '当前页' },
          { title: '点位设备', description: '配置点位、二维码和设备绑定', status: 'process', tag: '下一步：点位 / 设备' },
          { title: '商品活动', description: '决定商品适用范围和营销开关', status: 'wait', tag: '商品与服务 / 活动营销' },
        ]}
        actions={[
          { key: 'create', label: '新建门店', type: 'primary', onClick: openCreateDrawer },
        ]}
      />
      <CoreFlowPanel
        title="门店上线闭环"
        subtitle="门店要同时满足商户归属、地理位置、营业策略、点位设备和商品适用范围，开业后用户端才会稳定展示和下单。"
        config={[
          { label: '商户归属', desc: '新建门店必须先选择商户，后续订单、结算和活动都按这个归属流转。', tag: '必填' },
          { label: '地址与营业', desc: '省市区、详细地址、营业状态和公告决定用户端展示与接单。', tag: '上线' },
          { label: '点位设备', desc: '开业前至少要补齐服务点位和可用设备，否则运营无法闭环验证。', tag: '履约' },
        ]}
        landing={[
          { label: '用户下单', desc: '门店状态、地理位置和服务能力会影响用户端可见性和可选服务。' },
          { label: '设备履约', desc: '设备绑定门店点位后，订单启动、回执和异常才有明确落点。' },
          { label: '结算统计', desc: '门店维度沉淀收入、退款、成本和跨店清分明细。' },
        ]}
        verify={[
          { label: '开业前', desc: '确认商户、地址、联系人、营业状态、点位和设备均已配置。' },
          { label: '暂停前', desc: '确认是否有进行中订单、待核销权益和运行中活动。' },
          { label: '上线后', desc: '用交易中心和设备管理查看是否产生正确订单和履约数据。' },
        ]}
        actions={[
          { key: 'device', label: '去设备管理', type: 'primary', onClick: () => navigate('/device') },
          { key: 'service', label: '配置商品服务', onClick: () => navigate('/service') },
        ]}
      />
      <OperatorTips
        items={[
          { label: '新增门店', desc: '先选商户，再填门店名称、编号、地址和负责人，创建后再维护点位和图片。', tag: '建档' },
          { label: '暂停营业', desc: '列表行内点“暂停”，会影响用户端可见性和接单，提交前会二次确认。', tag: '状态' },
          { label: '完善档案', desc: '营业时间、临停、图片和服务能力放在“档案维护”，避免主表单过长。', tag: '档案' },
        ]}
      />

      <Tabs
        items={[
          {
            key: 'store-list',
            label: '门店列表',
            children: (
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
            ),
          },
          { key: 'store-profile', label: '档案维护', children: <StoreProfileManagement embedded /> },
        ]}
      />

      <StoreFullProfileDrawer
        open={profileVisible}
        loading={profileLoading}
        profile={fullProfile}
        onClose={() => {
          setProfileVisible(false);
          setFullProfile(undefined);
        }}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '门店档案维护' : '门店建档配置'}
        title={editingRecord ? `编辑门店 · ${editingRecord.storeName}` : '新建门店'}
        subtitle="主表单只维护门店基础建档和当前经营状态；图片、营业时间明细、临停记录和服务能力在档案维护中配置。"
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
            const { region, ...payload } = values;
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
              desc="明确门店属于哪个商户，并沉淀门店名称、编号和负责人。"
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
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<EnvironmentOutlined />}
              title="位置与导航"
              desc="补齐行政区、详细地址和经纬度，支撑门店检索、导航和附近门店展示。"
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
                  <InputNumber min={-180} max={180} precision={6} step={0.000001} style={{ width: '100%' }} placeholder="例如：121.473701" />
                </Form.Item>
                <Form.Item name="latitude" label="纬度">
                  <InputNumber min={-90} max={90} precision={6} step={0.000001} style={{ width: '100%' }} placeholder="例如：31.230416" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<FieldTimeOutlined />}
              title="营业设置"
              desc="维护门店启停状态；营业时段和临停记录在档案维护中维护。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="status" label="门店状态">
                  <Select options={storeStatusOptions} placeholder="请选择门店状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="展示介绍"
              desc="维护门店介绍；门店图片和公告类运营信息在档案或活动配置中统一管理。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
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
