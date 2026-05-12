import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { AppstoreOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, FieldTimeOutlined, PlusOutlined, PoweroffOutlined, SafetyCertificateOutlined, TagsOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Select, Space, Tabs, message } from 'antd';
import {
  billingModeOptions,
  categoryOptions,
  scopeTypeOptions,
  serviceSellingPointOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { PricingRuleRecord, SelectOptionRecord, ServiceProductRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';
import { DateTimeField, TimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';


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

const normalizePickerInitialValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
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


const allowDenyOptions = [
  { value: 'ALLOW', label: '允许' },
  { value: 'DENY', label: '不允许' },
];

const combineModeOptions = [
  { value: 'COUPON_BALANCE', label: '优惠券 + 余额支付' },
  { value: 'MEMBER_COUPON', label: '会员价 + 优惠券' },
  { value: 'COUPON_ONLY', label: '仅优惠券' },
  { value: 'NONE', label: '不允许叠加优惠' },
];

const refundPolicyOptions = [
  { value: 'UNUSED_REFUND', label: '未使用可退' },
  { value: 'PARTIAL_REFUND', label: '部分履约按比例退' },
  { value: 'NO_REFUND_AFTER_START', label: '启动后不可退' },
  { value: 'MANUAL_REVIEW', label: '人工审核退款' },
];

const abnormalRefundOptions = [
  { value: 'AUTO_REFUND', label: '设备异常自动退' },
  { value: 'MANUAL_REVIEW', label: '设备异常人工审核' },
  { value: 'REISSUE_SERVICE', label: '补发服务权益' },
];

const holidayPriceModeOptions = [
  { value: 'NONE', label: '不启用节假日价' },
  { value: 'SURCHARGE', label: '按金额加价' },
  { value: 'DISCOUNT', label: '按折扣计价' },
  { value: 'FIXED_PRICE', label: '固定节假日价' },
];

const nightPriceModeOptions = [
  { value: 'NONE', label: '不启用夜间价' },
  { value: 'SURCHARGE', label: '按分钟加价' },
  { value: 'FIXED_PRICE', label: '固定夜间价' },
];

const stackPolicyOptions = [
  { value: 'STACK', label: '允许叠加' },
  { value: 'NOT_STACK', label: '不叠加' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const timeRangeText = (record: PricingRuleRecord) => record.timeStart || record.timeEnd ? `${record.timeStart || '--:--'} - ${record.timeEnd || '--:--'}` : '-';
const nightPriceText = (record: PricingRuleRecord) => [
  optionLabel(nightPriceModeOptions, record.nightPriceMode),
  record.nightPriceValue,
].filter(Boolean).join(' / ') || '-';
const holidayPriceText = (record: PricingRuleRecord) => [
  optionLabel(holidayPriceModeOptions, record.holidayPriceMode),
  record.holidayDates,
  record.holidayPriceValue,
  optionLabel(stackPolicyOptions, record.holidayStackPolicy),
].filter(Boolean).join(' / ') || '-';

const ServiceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [productForm] = Form.useForm();
  const [pricingForm] = Form.useForm();
  const productScopeType = Form.useWatch('scopeType', productForm);

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ServiceProductRecord | null>(null);
  const [editingPricing, setEditingPricing] = useState<PricingRuleRecord | null>(null);

  const [productQueryParams, setProductQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    categoryCode: undefined as string | undefined,
    billingMode: undefined as string | undefined,
    scopeType: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const [pricingQueryParams, setPricingQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    storeId: undefined as number | undefined,
    serviceProductId: undefined as number | undefined,
    status: undefined as number | undefined,
  });

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['serviceProducts', productQueryParams],
    queryFn: async () => (await api.serviceProduct.page(productQueryParams)).data,
  });

  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['pricingRules', pricingQueryParams],
    queryFn: async () => (await api.pricingRule.page(pricingQueryParams)).data,
  });

  const { data: merchantOptionsData } = useQuery({
    queryKey: ['merchantOptionsForService'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const { data: storeOptionsData } = useQuery({
    queryKey: ['storeOptionsForService'],
    queryFn: async () => (await api.store.options()).data,
  });

  const { data: merchantGroupOptionsData } = useQuery({
    queryKey: ['merchantGroupOptionsForService'],
    queryFn: async () => (await api.merchantGroup.options()).data,
  });

  const { data: serviceProductOptionsData } = useQuery({
    queryKey: ['serviceProductOptions'],
    queryFn: async () => (await api.serviceProduct.options()).data,
  });

  const merchantOptions = merchantOptionsData || [];
  const storeOptions = storeOptionsData || [];
  const merchantGroupOptions = merchantGroupOptionsData || [];
  const serviceProductOptions = serviceProductOptionsData || [];

  const closeProductModal = () => {
    setProductModalVisible(false);
    setEditingProduct(null);
    productForm.resetFields();
  };

  const closePricingModal = () => {
    setPricingModalVisible(false);
    setEditingPricing(null);
    pricingForm.resetFields();
  };

  const scopeOptions = useMemo<SelectOptionRecord[]>(() => {
    if (productScopeType === 'MERCHANT') {
      return merchantOptions as SelectOptionRecord[];
    }
    if (productScopeType === 'STORE') {
      return storeOptions as SelectOptionRecord[];
    }
    if (productScopeType === 'GROUP') {
      return merchantGroupOptions as SelectOptionRecord[];
    }
    return [];
  }, [merchantGroupOptions, merchantOptions, productScopeType, storeOptions]);

  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item.label])), [storeOptions]);
  const serviceProductOptionMap = useMemo(() => new Map(serviceProductOptions.map((item) => [item.value, item.label])), [serviceProductOptions]);

  const handleProductScopeTypeChange = (value: string) => {
    productForm.setFieldsValue({
      scopeId: undefined,
      scopeName: value === 'PLATFORM' ? '平台' : undefined,
    });
  };

  const handleProductScopeChange = (value?: number) => {
    productForm.setFieldValue('scopeName', value ? scopeOptions.find((item) => item.value === value)?.label : undefined);
  };

  const handlePricingStoreChange = (value?: number) => {
    pricingForm.setFieldValue('storeName', value ? storeOptionMap.get(value) : undefined);
  };

  const handlePricingProductChange = (value?: number) => {
    pricingForm.setFieldValue('productName', value ? serviceProductOptionMap.get(value) : undefined);
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.serviceProduct.add(payload),
    onSuccess: () => {
      message.success('服务商品创建成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
      closeProductModal();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.serviceProduct.edit(payload),
    onSuccess: () => {
      message.success('服务商品更新成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
      closeProductModal();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => api.serviceProduct.remove(id),
    onSuccess: () => {
      message.success('服务商品删除成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
    },
  });

  const productStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => api.serviceProduct.changeStatus(id, status),
    onSuccess: () => {
      message.success('服务商品状态已更新');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
      queryClient.invalidateQueries({ queryKey: ['productStatusLogs'] });
      queryClient.invalidateQueries({ queryKey: ['productChangeLogs'] });
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.pricingRule.add(payload),
    onSuccess: () => {
      message.success('计费规则创建成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      closePricingModal();
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.pricingRule.edit(payload),
    onSuccess: () => {
      message.success('计费规则更新成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      closePricingModal();
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: number) => api.pricingRule.remove(id),
    onSuccess: () => {
      message.success('计费规则删除成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
    },
  });

  const pricingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => api.pricingRule.changeStatus(id, status),
    onSuccess: () => {
      message.success('计费规则状态已更新');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      queryClient.invalidateQueries({ queryKey: ['pricingRulesForPricingCenter'] });
      queryClient.invalidateQueries({ queryKey: ['pricingRuleVersions'] });
      queryClient.invalidateQueries({ queryKey: ['pricingChangeLogs'] });
    },
  });

  const productColumns = useMemo<ProColumns<ServiceProductRecord>[]>(
    () => [
      { title: '商品名称', dataIndex: 'productName', width: 180, hideInSearch: true },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '商品名称 / 编号 / 价格描述' } },
      { title: '商品编码', dataIndex: 'productCode', width: 140, search: false },
      {
        title: '分类',
        dataIndex: 'categoryCode',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(categoryOptions),
        render: (_, record) => renderStatusTag(record.categoryCode, buildValueEnum(categoryOptions) as any),
      },
      {
        title: '计费模式',
        dataIndex: 'billingMode',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(billingModeOptions),
        render: (_, record) => renderStatusTag(record.billingMode, buildValueEnum(billingModeOptions) as any),
      },
      {
        title: '作用范围',
        dataIndex: 'scopeType',
        width: 160,
        valueType: 'select',
        valueEnum: buildValueEnum(scopeTypeOptions),
        render: (_, record) => `${scopeTypeOptions.find((item) => item.value === record.scopeType)?.label || record.scopeType}${record.scopeName ? ` / ${record.scopeName}` : ''}`,
      },
      { title: '价格描述', dataIndex: 'priceDesc', width: 200, search: false, render: (_, record) => record.priceDesc || '-' },
      { title: '服务周期', dataIndex: 'serviceDuration', width: 120, search: false, render: (_, record) => record.serviceDuration || '-' },
      { title: '价格版本', dataIndex: 'priceVersion', width: 120, search: false, render: (_, record) => record.priceVersion || '-' },
      { title: '生效时间', dataIndex: 'effectiveAt', width: 160, search: false, render: (_, record) => formatDateTime(record.effectiveAt) },
      { title: '失效时间', dataIndex: 'expireAt', width: 160, search: false, render: (_, record) => formatDateTime(record.expireAt) },
      { title: '卖点标签', dataIndex: 'sellingPoints', width: 240, search: false, render: (_, record) => renderOptionTags(record.sellingPoints, serviceSellingPointOptions) },
      { title: '优惠组合', dataIndex: 'combineMode', width: 180, search: false, render: (_, record) => optionLabel(combineModeOptions, record.combineMode) || '-' },
      { title: '退款口径', dataIndex: 'refundPolicy', width: 160, search: false, render: (_, record) => optionLabel(refundPolicyOptions, record.refundPolicy) || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: buildValueEnum(statusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(statusOptions) as any),
      },
      { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt || record.updateTime) },
      {
        title: '操作',
        width: 240,
        search: false,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<PoweroffOutlined />}
              loading={productStatusMutation.isPending}
              onClick={() => {
                const nextStatus = record.status === 1 ? 0 : 1;
                showBusinessConfirm({
                  title: `确认${record.status === 1 ? '下架' : '上架'}服务商品`,
                  content: `确定${record.status === 1 ? '下架' : '上架'}商品「${record.productName}」吗？状态变更会写入商品状态日志。`,
                  onOk: () => productStatusMutation.mutate({ id: record.id, status: nextStatus }),
                });
              }}
            >
              {record.status === 1 ? '下架' : '上架'}
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(record);
                productForm.setFieldsValue({
                  ...normalizePickerInitialValues(record as unknown as Record<string, any>),
                  sellingPoints: splitCommaValues(record.sellingPoints),
                });
                setProductModalVisible(true);
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
                  title: '确认删除服务商品',
                  content: `确定删除商品「${record.productName}」吗？`,
                  onOk: () => deleteProductMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deleteProductMutation, productForm, productStatusMutation]
  );

  const pricingColumns = useMemo<ProColumns<PricingRuleRecord>[]>(
    () => [
      { title: '规则名称', dataIndex: 'ruleName', width: 180, hideInSearch: true },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '规则名称 / 编号 / 夜间价格描述' } },
      { title: '规则编码', dataIndex: 'ruleCode', width: 140, search: false },
      {
        title: '门店',
        dataIndex: 'storeId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(storeOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.storeName || '全局规则',
      },
      {
        title: '服务商品',
        dataIndex: 'serviceProductId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(serviceProductOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.productName || '-',
      },
      { title: '起步价', dataIndex: 'startPrice', width: 100, search: false, render: (_, record) => record.startPrice ?? '-' },
      { title: '分钟单价', dataIndex: 'minutePrice', width: 100, search: false, render: (_, record) => record.minutePrice ?? '-' },
      { title: '封顶金额', dataIndex: 'capAmount', width: 100, search: false, render: (_, record) => record.capAmount ?? '-' },
      { title: '免费分钟', dataIndex: 'freeMinutes', width: 100, search: false, render: (_, record) => record.freeMinutes ?? '-' },
      { title: '版本号', dataIndex: 'versionNo', width: 120, search: false, render: (_, record) => record.versionNo || '-' },
      { title: '适用时段', dataIndex: 'timeStart', width: 160, search: false, render: (_, record) => timeRangeText(record) },
      { title: '夜间计价', dataIndex: 'nightPriceMode', width: 180, search: false, render: (_, record) => nightPriceText(record) },
      { title: '节假日计价', dataIndex: 'holidayPriceMode', width: 220, search: false, render: (_, record) => holidayPriceText(record) },
      { title: '生效时间', dataIndex: 'effectiveAt', width: 160, search: false, render: (_, record) => formatDateTime(record.effectiveAt) },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: buildValueEnum(statusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(statusOptions) as any),
      },
      {
        title: '操作',
        width: 240,
        search: false,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<PoweroffOutlined />}
              loading={pricingStatusMutation.isPending}
              onClick={() => {
                const nextStatus = record.status === 1 ? 0 : 1;
                showBusinessConfirm({
                  title: `确认${record.status === 1 ? '停用' : '启用'}计费规则`,
                  content: `确定${record.status === 1 ? '停用' : '启用'}规则「${record.ruleName}」吗？状态变更会同步价格变更日志和最近版本状态。`,
                  onOk: () => pricingStatusMutation.mutate({ id: record.id, status: nextStatus }),
                });
              }}
            >
              {record.status === 1 ? '停用' : '启用'}
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingPricing(record);
                pricingForm.setFieldsValue(normalizePickerInitialValues(record as unknown as Record<string, any>));
                setPricingModalVisible(true);
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
                  title: '确认删除计费规则',
                  content: `确定删除规则「${record.ruleName}」吗？`,
                  onOk: () => deletePricingMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deletePricingMutation, pricingForm, pricingStatusMutation, serviceProductOptions, storeOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商品与服务" subtitle="管理服务商品、计费规则和作用范围。" icon={<AppstoreOutlined />} />
      <WorkflowGuide
        title="商品上架闭环"
        summary="商品页不该只剩两个表格。完整闭环至少要把商品建档、计费规则、作用范围和交易表现串起来。"
        steps={[
          { title: '商品建档', description: '定义商品分类、计费模式和价格表达', status: 'finish', tag: '服务商品' },
          { title: '配置计费', description: '补起步价、分钟单价、封顶和免费分钟', status: 'process', tag: '计费规则' },
          { title: '作用范围', description: '确认平台 / 商户 / 门店的适用边界', status: 'process', tag: '范围配置' },
          { title: '交易验证', description: '到订单中心核对真实下单与支付表现', status: 'wait', tag: '下一步：交易中心' },
        ]}
        actions={[
          {
            key: 'product',
            label: '新建服务商品',
            type: 'primary',
            onClick: () => {
              setEditingProduct(null);
              productForm.resetFields();
              productForm.setFieldsValue({
                billingMode: 'PACKAGE',
                scopeType: 'PLATFORM',
                status: 1,
                scopeName: '平台',
                sellingPoints: ['FAST_ENTRY', 'COUPON_STACK'],
              });
              setProductModalVisible(true);
            },
          },
          {
            key: 'pricing',
            label: '新建计费规则',
            onClick: () => {
              setEditingPricing(null);
              pricingForm.resetFields();
              pricingForm.setFieldsValue({ status: 1, freeMinutes: 0 });
              setPricingModalVisible(true);
            },
          },
        ]}
      />
      <Tabs
        items={[
          {
            key: 'products',
            label: '服务商品',
            children: (
              <ProTable<ServiceProductRecord>
                cardBordered
                rowKey="id"
                columns={productColumns}
                dataSource={productData?.records || []}
                loading={productLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 1980 }}
                pagination={{
                  current: productData?.current || productQueryParams.pageNum,
                  pageSize: productData?.size || productQueryParams.pageSize,
                  total: productData?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (page, pageSize) => setProductQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
                }}
                toolBarRender={() => [
                  <Button
                    key="create-product"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingProduct(null);
                      productForm.resetFields();
                      productForm.setFieldsValue({
                        billingMode: 'PACKAGE',
                        scopeType: 'PLATFORM',
                        status: 1,
                        scopeName: '平台',
                        sellingPoints: ['FAST_ENTRY', 'COUPON_STACK'],
                      });
                      setProductModalVisible(true);
                    }}
                  >
                    新建服务商品
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setProductQueryParams({
                    pageNum: 1,
                    pageSize: productQueryParams.pageSize,
                    keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                    categoryCode: typeof values.categoryCode === 'string' ? values.categoryCode : undefined,
                    billingMode: typeof values.billingMode === 'string' ? values.billingMode : undefined,
                    scopeType: typeof values.scopeType === 'string' ? values.scopeType : undefined,
                    status: typeof values.status === 'number' ? values.status : undefined,
                  });
                }}
                onReset={() => {
                  setProductQueryParams({
                    pageNum: 1,
                    pageSize: 10,
                    keyword: undefined,
                    categoryCode: undefined,
                    billingMode: undefined,
                    scopeType: undefined,
                    status: undefined,
                  });
                }}
              />
            ),
          },
          {
            key: 'pricing',
            label: '计费规则',
            children: (
              <ProTable<PricingRuleRecord>
                cardBordered
                rowKey="id"
                columns={pricingColumns}
                dataSource={pricingData?.records || []}
                loading={pricingLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 1680 }}
                pagination={{
                  current: pricingData?.current || pricingQueryParams.pageNum,
                  pageSize: pricingData?.size || pricingQueryParams.pageSize,
                  total: pricingData?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (page, pageSize) => setPricingQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
                }}
                toolBarRender={() => [
                  <Button
                    key="create-pricing"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingPricing(null);
                      pricingForm.resetFields();
                      pricingForm.setFieldsValue({ status: 1, freeMinutes: 0 });
                      setPricingModalVisible(true);
                    }}
                  >
                    新建计费规则
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setPricingQueryParams({
                    pageNum: 1,
                    pageSize: pricingQueryParams.pageSize,
                    keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                    storeId: typeof values.storeId === 'number' ? values.storeId : undefined,
                    serviceProductId: typeof values.serviceProductId === 'number' ? values.serviceProductId : undefined,
                    status: typeof values.status === 'number' ? values.status : undefined,
                  });
                }}
                onReset={() => {
                  setPricingQueryParams({
                    pageNum: 1,
                    pageSize: 10,
                    keyword: undefined,
                    storeId: undefined,
                    serviceProductId: undefined,
                    status: undefined,
                  });
                }}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow={editingProduct ? '服务商品维护' : '服务商品建档'}
        title={editingProduct ? `编辑服务商品 · ${editingProduct.productName}` : '新建服务商品'}
        subtitle="补齐商品基础、适用范围、价格版本、权益内容和售后规则，让商品从上架到履约可直接闭环。"
        meta={['商品闭环', editingProduct ? '编辑模式' : '新建模式']}
        open={productModalVisible}
        width={1080}
        onCancel={closeProductModal}
        onOk={() => productForm.submit()}
        confirmLoading={createProductMutation.isPending || updateProductMutation.isPending}
        okText="保存商品"
        forceRender
        destroyOnClose
      >
        <Form
          form={productForm}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            values = normalizePickerValues(values);
            const sellingPoints = joinCommaValues(values.sellingPoints);
            const payload = values.scopeType === 'PLATFORM'
              ? { ...values, scopeId: undefined, scopeName: '平台', sellingPoints }
              : { ...values, sellingPoints };
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, ...payload });
              return;
            }
            createProductMutation.mutate(payload);
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<AppstoreOutlined />} title="商品基础" desc="定义商品编码、名称、分类和计费方式，作为价格、门店范围和交易履约的主档。">
              <div className="merchant-editor-fields">
                <Form.Item name="productName" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
                  <Input placeholder="例如：标准洗车套餐" />
                </Form.Item>
                <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}>
                  <Input placeholder="例如：SP-CAR-WASH-001" />
                </Form.Item>
                <Form.Item name="categoryCode" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}>
                  <Select options={categoryOptions} placeholder="请选择商品分类" />
                </Form.Item>
                <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}>
                  <Select options={billingModeOptions} placeholder="请选择计费模式" />
                </Form.Item>
                <Form.Item name="status" label="上架状态">
                  <Select options={statusOptions} placeholder="请选择商品状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<TagsOutlined />} title="适用范围与价格版本" desc="控制商品在平台、商户或门店的生效边界，并记录当前价格版本和有效期。">
              <div className="merchant-editor-fields">
                <Form.Item name="scopeType" label="作用范围" rules={[{ required: true, message: '请选择作用范围' }]}>
                  <Select options={scopeTypeOptions} placeholder="请选择平台、商户、门店或门店组" onChange={handleProductScopeTypeChange} />
                </Form.Item>
                {productScopeType && productScopeType !== 'PLATFORM' ? (
                  <Form.Item name="scopeId" label="作用对象" rules={[{ required: true, message: '请选择作用对象' }]}>
                    <Select showSearch optionFilterProp="label" options={scopeOptions} placeholder="请选择商户、门店或门店组" onChange={handleProductScopeChange} />
                  </Form.Item>
                ) : null}
                <Form.Item name="scopeName" label="作用对象名称">
                  <Input disabled placeholder="选择作用对象后自动回填" />
                </Form.Item>
                <Form.Item name="priceVersion" label="价格版本">
                  <Input placeholder="例如：V202605" />
                </Form.Item>
                <Form.Item name="priceDesc" label="价格描述">
                  <Input placeholder="例如：29 元 / 15 分钟" />
                </Form.Item>
                <Form.Item name="serviceDuration" label="服务周期 / 履约时长">
                  <Input placeholder="例如：15 分钟 / 10 次 / 30 天" />
                </Form.Item>
                <Form.Item name="effectiveAt" label="生效时间">
                  <DateTimeField />
                </Form.Item>
                <Form.Item name="expireAt" label="失效时间">
                  <DateTimeField />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="权益与售后" desc="沉淀卖点、权益、使用说明、优惠叠加和退款规则，保证前台展示与售后处理一致。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item className="merchant-editor-field-span-2" name="sellingPoints" label="卖点标签">
                  <Select mode="multiple" options={serviceSellingPointOptions} placeholder="选择商品卖点" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="rightsContent" label="权益内容">
                  <Input.TextArea rows={3} placeholder="填写包含的服务次数、设备能力、卡券权益等" />
                </Form.Item>
                <Form.Item name="combineMode" label="优惠组合"><Select options={combineModeOptions} placeholder="请选择优惠组合" /></Form.Item>
                <Form.Item name="memberPriceStack" label="会员价叠加"><Select options={allowDenyOptions} placeholder="请选择是否允许" /></Form.Item>
                <Form.Item name="couponStack" label="优惠券叠加"><Select options={allowDenyOptions} placeholder="请选择是否允许" /></Form.Item>
                <Form.Item name="usageNotice" label="使用须知">
                  <Input.TextArea rows={4} placeholder="填写启动时效、核销边界、设备异常处理等说明" />
                </Form.Item>
                <Form.Item name="refundPolicy" label="退款口径"><Select options={refundPolicyOptions} placeholder="请选择退款口径" /></Form.Item>
                <Form.Item name="abnormalRefund" label="异常处理"><Select options={abnormalRefundOptions} placeholder="请选择异常处理" /></Form.Item>
                <Form.Item name="refundWindowHours" label="可退时限"><InputNumber min={0} precision={0} addonAfter="小时内" style={{ width: '100%' }} placeholder="24" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow={editingPricing ? '计费规则维护' : '计费规则新增'}
        title={editingPricing ? `编辑计费规则 · ${editingPricing.ruleName}` : '新建计费规则'}
        subtitle="把适用门店、关联商品、基础价格、封顶免费和特殊时段规则集中维护，供订单计价直接读取。"
        meta={['计费闭环', editingPricing ? '编辑模式' : '新建模式']}
        open={pricingModalVisible}
        width={1080}
        onCancel={closePricingModal}
        onOk={() => pricingForm.submit()}
        confirmLoading={createPricingMutation.isPending || updatePricingMutation.isPending}
        okText="保存规则"
        forceRender
        destroyOnClose
      >
        <Form
          form={pricingForm}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            if (editingPricing) {
              updatePricingMutation.mutate({ id: editingPricing.id, ...values });
              return;
            }
            createPricingMutation.mutate(values);
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TagsOutlined />} title="规则归属" desc="定义规则编码、名称、适用门店和关联商品；门店为空时作为全局计价规则。">
              <div className="merchant-editor-fields">
                <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
                  <Input placeholder="例如：标准洗车门店计费规则" />
                </Form.Item>
                <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true, message: '请输入规则编码' }]}>
                  <Input placeholder="例如：PR-CAR-WASH-001" />
                </Form.Item>
                <Form.Item name="storeId" label="适用门店">
                  <Select showSearch optionFilterProp="label" options={storeOptions as SelectOptionRecord[]} allowClear placeholder="为空则表示全局规则" onChange={handlePricingStoreChange} />
                </Form.Item>
                <Form.Item name="serviceProductId" label="关联服务商品">
                  <Select showSearch optionFilterProp="label" options={serviceProductOptions as SelectOptionRecord[]} allowClear placeholder="请选择服务商品" onChange={handlePricingProductChange} />
                </Form.Item>
                <Form.Item name="storeName" label="门店名称">
                  <Input disabled placeholder="选择门店后自动回填" />
                </Form.Item>
                <Form.Item name="productName" label="商品名称">
                  <Input disabled placeholder="选择服务商品后自动回填" />
                </Form.Item>
                <Form.Item name="versionNo" label="版本号">
                  <Input placeholder="例如：PR-V202605" />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue={1}>
                  <Select options={statusOptions} placeholder="请选择规则状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<ClockCircleOutlined />} title="基础计价" desc="维护起步价、分钟价、按次价、封顶和免费分钟，覆盖订单计费的主链路。">
              <div className="merchant-editor-fields">
                <Form.Item name="startPrice" label="起步价">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="minutePrice" label="按分钟单价">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="countPrice" label="按次单价">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="capAmount" label="封顶金额">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="不填则不封顶" />
                </Form.Item>
                <Form.Item name="freeMinutes" label="免费分钟">
                  <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="例如：5" />
                </Form.Item>
                <Form.Item name="effectiveAt" label="生效时间">
                  <DateTimeField />
                </Form.Item>
                <Form.Item name="expireAt" label="失效时间">
                  <DateTimeField />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<FieldTimeOutlined />} title="时段与节假日" desc="记录夜间价、节假日价和叠加口径，避免特殊日期价格与基础规则脱节。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="timeStart" label="开始时间">
                  <TimeField placeholder="请选择开始时间" />
                </Form.Item>
                <Form.Item name="timeEnd" label="结束时间">
                  <TimeField placeholder="请选择结束时间" />
                </Form.Item>
                <Form.Item name="nightPriceMode" label="夜间计价">
                  <Select options={nightPriceModeOptions} placeholder="请选择夜间计价" />
                </Form.Item>
                <Form.Item name="nightPriceValue" label="夜间数值">
                  <Input placeholder="例如：每分钟 +0.2 元" />
                </Form.Item>
                <Form.Item name="nightPriceDesc" label="夜间价格描述">
                  <Input placeholder="例如：夜间每分钟 +0.2 元" />
                </Form.Item>
                <Form.Item name="holidayPriceDesc" label="节假日价格描述">
                  <Input placeholder="例如：法定节假日起步价 39 元" />
                </Form.Item>
                <Form.Item name="holidayPriceMode" label="节假日计价">
                  <Select options={holidayPriceModeOptions} placeholder="请选择节假日计价" />
                </Form.Item>
                <Form.Item name="holidayPriceValue" label="节假日数值">
                  <Input placeholder="例如：39 元 / 加价 5 元 / 8 折" />
                </Form.Item>
                <Form.Item name="holidayDates" label="适用日期">
                  <Input placeholder="例如：2026-05-01 至 2026-05-05" />
                </Form.Item>
                <Form.Item name="holidayStackPolicy" label="夜间价叠加">
                  <Select options={stackPolicyOptions} placeholder="请选择叠加方式" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ServiceManagement;
