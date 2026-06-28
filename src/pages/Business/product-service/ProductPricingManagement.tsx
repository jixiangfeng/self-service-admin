import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { ClockCircleOutlined, DeleteOutlined, EditOutlined, FieldTimeOutlined, PlusOutlined, PoweroffOutlined, SafetyCertificateOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  billingModeOptions,
  categoryOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { PricingRuleRecord, PricingRuleVersionRecord, SelectOptionRecord, ServiceProductRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import { DateTimeField, TimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';

type PricingTab = 'category' | 'scope' | 'version' | 'segment' | 'holiday' | 'change';
type EditableRecord = ServiceProductRecord | PricingRuleRecord | PricingRuleVersionRecord;


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

const pricingRuleVersionStatusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'OFFLINE', label: '已下线' },
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

const categoryMap = buildValueEnum(categoryOptions);
const billingModeMap = buildValueEnum(billingModeOptions);
const statusMap = buildValueEnum(statusOptions);
const pricingRuleVersionStatusMap = buildValueEnum(pricingRuleVersionStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const pricingTabTitleMap: Record<PricingTab, string> = {
  category: '商品分类',
  scope: '适用范围',
  version: '价格版本',
  segment: '时段价',
  holiday: '节假日规则',
  change: '价格规则',
};

const pricingTabDescMap: Record<PricingTab, string> = {
  category: '补齐商品主档、分类、计费模式和基础价格表达，支撑后续范围和版本配置。',
  scope: '维护商品适用的平台、商户或门店边界，并同步生效和失效时间。',
  version: '沉淀价格版本、权益内容、退款规则和生效状态，确保商品价格可追溯。',
  segment: '配置计费规则的商品归属、基础价格和时段价，供订单计价读取。',
  holiday: '配置节假日价格、适用日期和门店范围，避免特殊日期价格断层。',
  change: '维护完整价格规则版本、基础价格和有效期，形成价格变更闭环。',
};

const productDetailFields: DetailField<ServiceProductRecord>[] = [
  { name: 'productCode', label: '商品编码' },
  { name: 'productName', label: '商品名称' },
  { name: 'categoryCode', label: '商品分类' },
  { name: 'billingMode', label: '计费模式' },
  { name: 'scopeType', label: '范围类型' },
  { name: 'scopeId', label: '范围ID' },
  { name: 'scopeName', label: '范围名称' },
  { name: 'priceVersion', label: '价格版本' },
  { name: 'priceDesc', label: '价格描述' },
  { name: 'serviceDuration', label: '服务周期' },
  { name: 'rightsContent', label: '权益内容' },
  { name: 'refundPolicy', label: '退款口径' },
  { name: 'abnormalRefund', label: '异常退款处理' },
  { name: 'refundWindowHours', label: '可退时限' },
  { name: 'effectiveAt', label: '生效时间' },
  { name: 'expireAt', label: '失效时间' },
  { name: 'status', label: '状态' },
];

const pricingDetailFields: DetailField<PricingRuleRecord>[] = [
  { name: 'ruleCode', label: '规则编码' },
  { name: 'ruleName', label: '规则名称' },
  { name: 'storeName', label: '门店' },
  { name: 'productName', label: '服务商品' },
  { name: 'versionNo', label: '版本号' },
  { name: 'startPrice', label: '起步价' },
  { name: 'minutePrice', label: '分钟单价' },
  { name: 'countPrice', label: '按次单价' },
  { name: 'capAmount', label: '封顶金额' },
  { name: 'freeMinutes', label: '免费分钟' },
  { name: 'timeStart', label: '开始时间' },
  { name: 'timeEnd', label: '结束时间' },
  { name: 'nightPriceMode', label: '夜间计价方式' },
  { name: 'nightPriceValue', label: '夜间计价值' },
  { name: 'nightPriceDesc', label: '夜间价格' },
  { name: 'holidayPriceMode', label: '节假日计价方式' },
  { name: 'holidayDates', label: '节假日适用日期' },
  { name: 'holidayPriceValue', label: '节假日计价值' },
  { name: 'holidayStackPolicy', label: '节假日叠加方式' },
  { name: 'holidayPriceDesc', label: '节假日价格' },
  { name: 'effectiveAt', label: '生效时间' },
  { name: 'expireAt', label: '失效时间' },
  { name: 'status', label: '状态' },
];

const pricingVersionDetailFields: DetailField<PricingRuleVersionRecord>[] = [
  { name: 'pricingRuleId', label: '规则ID' },
  { name: 'ruleCode', label: '规则编码' },
  { name: 'versionNo', label: '版本号' },
  { name: 'billingMode', label: '计费模式' },
  { name: 'basePrice', label: '基础价格' },
  { name: 'effectiveAt', label: '生效时间' },
  { name: 'status', label: '状态' },
];

const ProductPricingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<PricingTab>('category');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const selectedScopeType = Form.useWatch('scopeType', form);

  const productQuery = useQuery({ queryKey: ['serviceProductsForPricingCenter'], queryFn: async () => (await api.serviceProduct.page({ pageNum: 1, pageSize: 500 })).data });
  const pricingQuery = useQuery({ queryKey: ['pricingRulesForPricingCenter'], queryFn: async () => (await api.pricingRule.page({ pageNum: 1, pageSize: 500 })).data });
  const pricingVersionQuery = useQuery({ queryKey: ['pricingRuleVersionsForPricingCenter'], queryFn: async () => (await api.pricingRuleVersion.page({ pageNum: 1, pageSize: 500 })).data });
  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForPricingCenter'], queryFn: async () => (await api.merchant.options()).data });
  const { data: merchantGroupOptions } = useQuery({ queryKey: ['merchantGroupOptionsForPricingCenter'], queryFn: async () => (await api.merchantGroup.options()).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForPricingCenter'], queryFn: async () => (await api.store.options()).data });
  const { data: productOptions } = useQuery({ queryKey: ['serviceProductOptionsForPricingCenter'], queryFn: async () => (await api.serviceProduct.options()).data });

  const products = productQuery.data?.records || [];
  const pricingRules = pricingQuery.data?.records || [];
  const pricingVersions = pricingVersionQuery.data?.records || [];
  const merchantOptionList = merchantOptions || [];
  const merchantGroupOptionList = merchantGroupOptions || [];
  const storeOptionList = storeOptions || [];
  const productOptionList = productOptions || [];
  const storeOptionMap = useMemo(() => new Map(storeOptionList.map((item) => [item.value, item.label])), [storeOptionList]);
  const productOptionMap = useMemo(() => new Map(productOptionList.map((item) => [item.value, item.label])), [productOptionList]);
  const scopeObjectOptions = useMemo<SelectOptionRecord[]>(() => {
    if (selectedScopeType === 'MERCHANT') return merchantOptionList as SelectOptionRecord[];
    if (selectedScopeType === 'STORE') return storeOptionList as SelectOptionRecord[];
    if (selectedScopeType === 'GROUP') return merchantGroupOptionList as SelectOptionRecord[];
    return [];
  }, [merchantGroupOptionList, merchantOptionList, selectedScopeType, storeOptionList]);

  const categories = products;
  const scopes = products.filter((item) => item.scopeType && item.scopeType !== 'PLATFORM');
  const pricingRuleOptionList = pricingRules.map((item) => ({ value: item.id, label: `${item.ruleName} / ${item.ruleCode}` }));
  const timeSegments = pricingRules.filter((item) => item.timeStart || item.timeEnd || item.nightPriceMode || item.nightPriceDesc);
  const holidayRules = pricingRules.filter((item) => item.holidayPriceMode || item.holidayDates || item.holidayPriceDesc);
  const changeLogs = pricingRules;

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['serviceProductsForPricingCenter'] });
    queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
    queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
  };

  const invalidatePricingRules = () => {
    queryClient.invalidateQueries({ queryKey: ['pricingRulesForPricingCenter'] });
    queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
  };

  const invalidatePricingVersions = () => {
    queryClient.invalidateQueries({ queryKey: ['pricingRuleVersionsForPricingCenter'] });
    queryClient.invalidateQueries({ queryKey: ['pricingRuleVersions'] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ tab, id, status }: { tab: PricingTab; id: number; status: number }) => {
      if (tab === 'category' || tab === 'scope') {
        return api.serviceProduct.changeStatus(id, status);
      }
      return api.pricingRule.changeStatus(id, status);
    },
    onSuccess: (_, variables) => {
      message.success('状态已更新');
      if (variables.tab === 'category' || variables.tab === 'scope') {
        invalidateProducts();
        queryClient.invalidateQueries({ queryKey: ['productStatusLogs'] });
        queryClient.invalidateQueries({ queryKey: ['productChangeLogs'] });
      } else {
        invalidatePricingRules();
        queryClient.invalidateQueries({ queryKey: ['pricingRuleVersions'] });
        queryClient.invalidateQueries({ queryKey: ['pricingChangeLogs'] });
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'category' || activeTab === 'scope') {
        return payload.id ? api.serviceProduct.edit(payload) : api.serviceProduct.add(payload);
      }
      if (activeTab === 'version') {
        return payload.id ? api.pricingRuleVersion.edit(payload) : api.pricingRuleVersion.add(payload);
      }
      return payload.id ? api.pricingRule.edit(payload) : api.pricingRule.add(payload);
    },
    onSuccess: () => {
      message.success('商品价格配置已保存');
      if (activeTab === 'category' || activeTab === 'scope') invalidateProducts();
      else if (activeTab === 'version') invalidatePricingVersions();
      else invalidatePricingRules();
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: PricingTab; id: number }) => {
      if (tab === 'category' || tab === 'scope') return api.serviceProduct.remove(id);
      if (tab === 'version') return api.pricingRuleVersion.remove(id);
      return api.pricingRule.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('商品价格配置已删除');
      if (variables.tab === 'category' || variables.tab === 'scope') invalidateProducts();
      else if (variables.tab === 'version') invalidatePricingVersions();
      else invalidatePricingRules();
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const confirmRemove = (tab: PricingTab, id: number) => {
    showBusinessConfirm({
      title: '确认删除该价格配置',
      content: `删除后将影响「${pricingTabTitleMap[tab]}」下的商品定价规则，请确认已完成运营核对。`,
      onOk: () => removeMutation.mutate({ tab, id }),
    });
  };

  const handleScopeTypeChange = (value: string) => {
    form.setFieldsValue({
      scopeId: undefined,
      scopeName: value === 'PLATFORM' ? '平台' : undefined,
    });
  };

  const handleScopeObjectChange = (value?: number) => {
    form.setFieldValue('scopeName', value ? scopeObjectOptions.find((item) => item.value === value)?.label : undefined);
  };

  const handleStoreChange = (value?: number) => {
    form.setFieldValue('storeName', value ? storeOptionMap.get(value) : undefined);
  };

  const handleProductChange = (value?: number) => {
    form.setFieldValue('productName', value ? productOptionMap.get(value) : undefined);
  };

  const handlePricingRuleChange = (value?: number) => {
    const rule = pricingRules.find((item) => item.id === value);
    form.setFieldsValue({ ruleCode: rule?.ruleCode });
  };

  const openModal = (tab: PricingTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(normalizePickerInitialValues(record as unknown as Record<string, any>));
    } else if (tab === 'category') {
      form.setFieldsValue({ categoryCode: 'CAR_WASH_PACKAGE', billingMode: 'PACKAGE', scopeType: 'PLATFORM', scopeName: '平台', status: 1 });
    } else if (tab === 'scope') {
      form.setFieldsValue({ categoryCode: 'CAR_WASH_PACKAGE', billingMode: 'PACKAGE', scopeType: 'STORE', status: 1 });
    } else if (tab === 'version') {
      form.setFieldsValue({ billingMode: 'PACKAGE', versionNo: 'PR-V202605', status: 'DRAFT' });
    } else {
      form.setFieldsValue({ status: 1 });
    }
    setModalVisible(true);
  };

  const actionColumn = (tab: PricingTab): ProColumns<EditableRecord> => ({
    title: '操作',
    width: 250,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        {tab !== 'version' ? (
          <Button
            size="small"
            type="link"
            icon={<PoweroffOutlined />}
            loading={updateStatusMutation.isPending}
            onClick={() => {
              const isProduct = tab === 'category' || tab === 'scope';
              const currentStatus = (record as ServiceProductRecord | PricingRuleRecord).status;
              const nextStatus = currentStatus === 1 ? 0 : 1;
              showBusinessConfirm({
                title: `确认${currentStatus === 1 ? (isProduct ? '下架' : '停用') : (isProduct ? '上架' : '启用')}该配置`,
                content: `状态变更会同步写入${isProduct ? '商品状态日志' : '价格变更日志'}，请确认已完成运营核对。`,
                onOk: () => updateStatusMutation.mutate({ tab, id: record.id, status: nextStatus }),
              });
            }}
          >
            {(record as ServiceProductRecord | PricingRuleRecord).status === 1 ? (tab === 'category' || tab === 'scope' ? '下架' : '停用') : (tab === 'category' || tab === 'scope' ? '上架' : '启用')}
          </Button>
        ) : null}
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(tab, record)}>编辑</Button>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove(tab, record.id)}>删除</Button>
      </>
    ),
  });

  const categoryColumns: ProColumns<ServiceProductRecord>[] = [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '分类', dataIndex: 'categoryCode', width: 150, render: (_, record) => renderStatusTag(record.categoryCode, categoryMap) },
    { title: '计费模式', dataIndex: 'billingMode', width: 130, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '价格描述', dataIndex: 'priceDesc', width: 220 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('category') as ProColumns<ServiceProductRecord>,
  ];

  const scopeColumns: ProColumns<ServiceProductRecord>[] = [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '范围类型', dataIndex: 'scopeType', width: 120, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '范围ID', dataIndex: 'scopeId', width: 100 },
    { title: '范围名称', dataIndex: 'scopeName', width: 180 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '失效时间', dataIndex: 'expireAt', width: 180, render: (_, record) => formatDateTime(record.expireAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('scope') as ProColumns<ServiceProductRecord>,
  ];

  const versionColumns: ProColumns<PricingRuleVersionRecord>[] = [
    { title: '规则ID', dataIndex: 'pricingRuleId', width: 100 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '版本号', dataIndex: 'versionNo', width: 140 },
    { title: '计费模式', dataIndex: 'billingMode', width: 130, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '基础价格', dataIndex: 'basePrice', width: 120 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, pricingRuleVersionStatusMap) },
    actionColumn('version') as ProColumns<PricingRuleVersionRecord>,
  ];

  const segmentColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '服务商品', dataIndex: 'productName', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 120 },
    { title: '适用时段', dataIndex: 'timeStart', width: 180, render: (_, record) => timeRangeText(record) },
    { title: '夜间计价', dataIndex: 'nightPriceMode', width: 220, render: (_, record) => nightPriceText(record) },
    { title: '分钟单价', dataIndex: 'minutePrice', width: 100 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('segment') as ProColumns<PricingRuleRecord>,
  ];

  const holidayColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '节假日计价', dataIndex: 'holidayPriceMode', width: 260, render: (_, record) => holidayPriceText(record) },
    { title: '节假日价格描述', dataIndex: 'holidayPriceDesc', width: 220 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('holiday') as ProColumns<PricingRuleRecord>,
  ];

  const changeColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 120 },
    { title: '起步价', dataIndex: 'startPrice', width: 100 },
    { title: '分钟价', dataIndex: 'minutePrice', width: 100 },
    { title: '封顶', dataIndex: 'capAmount', width: 100 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('change') as ProColumns<PricingRuleRecord>,
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商品价格中心" subtitle="维护商品分类、适用范围、价格版本、时段价、节假日规则和价格变更。" icon={<TagsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="商品分类" value={categories.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="适用范围" value={scopes.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="价格版本" value={pricingVersions.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="时段规则" value={timeSegments.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="节假日规则" value={holidayRules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="价格规则" value={changeLogs.length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入商品、分类、价格、范围、规则关键词"
        onSearch={setKeyword}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as PricingTab)}
        items={[
          { key: 'category', label: '商品分类', children: <ProTable<ServiceProductRecord> cardBordered rowKey="id" columns={categoryColumns} dataSource={filter(categories)} loading={productQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('category')}>新建商品</Button>]} /> },
          { key: 'scope', label: '适用范围', children: <ProTable<ServiceProductRecord> cardBordered rowKey="id" columns={scopeColumns} dataSource={filter(scopes)} loading={productQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="bind" type="primary" icon={<PlusOutlined />} onClick={() => openModal('scope')}>绑定范围</Button>]} /> },
          { key: 'version', label: '价格版本', children: <ProTable<PricingRuleVersionRecord> cardBordered rowKey="id" columns={versionColumns} dataSource={filter(pricingVersions)} loading={pricingVersionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('version')}>新建版本</Button>]} /> },
          { key: 'segment', label: '时段价', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={segmentColumns} dataSource={filter(timeSegments)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('segment')}>新建时段</Button>]} /> },
          { key: 'holiday', label: '节假日规则', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={holidayColumns} dataSource={filter(holidayRules)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('holiday')}>新建规则</Button>]} /> },
          { key: 'change', label: '价格规则', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changeLogs)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('change')}>新建规则</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title={`${pricingTabTitleMap[activeTab]}详情`} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('productCode' in detail ? productDetailFields : 'pricingRuleId' in detail || ('versionNo' in detail && !('ruleName' in detail)) ? pricingVersionDetailFields : pricingDetailFields) as DetailField<Record<string, any>>[]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '商品价格维护' : '商品价格新增'}
        title={`${editingRecord ? '编辑' : '新增'}${pricingTabTitleMap[activeTab]}`}
        subtitle={pricingTabDescMap[activeTab]}
        meta={[pricingTabTitleMap[activeTab], editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          const payload = values.scopeType === 'PLATFORM' ? { ...values, scopeId: undefined, scopeName: '平台' } : values;
          saveMutation.mutate(payload);
        }}
        confirmLoading={saveMutation.isPending}
        width={1080}
        okText={editingRecord ? '保存变更' : '保存配置'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            {activeTab === 'category' || activeTab === 'scope' ? (
              <>
                <BusinessEditorSection icon={<TagsOutlined />} title="商品主档" desc="保持商品编码、名称、分类和计费模式一致，避免价格配置游离于商品主数据之外。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}><Input placeholder="例如：SP-CAR-WASH-001" /></Form.Item>
                    <Form.Item name="productName" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input placeholder="例如：标准洗车套餐" /></Form.Item>
                    <Form.Item name="categoryCode" label="商品分类"><Select options={categoryOptions} placeholder="请选择商品分类" /></Form.Item>
                    <Form.Item name="billingMode" label="计费模式"><Select options={billingModeOptions} placeholder="请选择计费模式" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>

                <BusinessEditorSection icon={<ClockCircleOutlined />} title="范围与版本" desc="补齐适用范围、价格版本、价格描述和有效期，保证用户端展示与后台计价同源。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="scopeType" label="范围类型"><Select options={scopeTypeOptions} placeholder="请选择平台、商户、门店或门店组" onChange={handleScopeTypeChange} /></Form.Item>
                    {selectedScopeType && selectedScopeType !== 'PLATFORM' ? (
                      <Form.Item name="scopeId" label="范围对象" rules={[{ required: true, message: '请选择范围对象' }]}>
                        <Select showSearch optionFilterProp="label" options={scopeObjectOptions} placeholder="请选择商户、门店或门店组" onChange={handleScopeObjectChange} />
                      </Form.Item>
                    ) : null}
                    <Form.Item name="scopeName" label="范围名称"><Input disabled placeholder="选择范围对象后自动回填" /></Form.Item>
                    <Form.Item name="priceVersion" label="价格版本"><Input placeholder="例如：V202605" /></Form.Item>
                    <Form.Item name="priceDesc" label="价格描述"><Input placeholder="例如：29 元 / 15 分钟" /></Form.Item>
                    <Form.Item name="serviceDuration" label="服务周期"><Input placeholder="例如：15 分钟 / 10 次 / 30 天" /></Form.Item>
                    <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                    <Form.Item name="expireAt" label="失效时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>

                <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="权益与售后" desc="记录权益内容和退款规则，价格版本发布后可直接支撑前台展示和客服处理。">
                  <div className="merchant-editor-fields">
                    <Form.Item className="merchant-editor-field-span-all" name="rightsContent" label="权益内容"><Input.TextArea rows={3} placeholder="填写包含的服务次数、设备能力、卡券权益等" /></Form.Item>
                    <Form.Item name="refundPolicy" label="退款口径"><Select options={refundPolicyOptions} placeholder="请选择退款口径" /></Form.Item>
                    <Form.Item name="abnormalRefund" label="异常处理"><Select options={abnormalRefundOptions} placeholder="请选择异常处理" /></Form.Item>
                    <Form.Item name="refundWindowHours" label="可退时限"><InputNumber min={0} precision={0} addonAfter="小时内" style={{ width: '100%' }} placeholder="24" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : activeTab === 'version' ? (
              <>
                <BusinessEditorSection icon={<TagsOutlined />} title="版本归属" desc="价格版本必须绑定明确的计费规则，避免只改商品主档而没有生成规则版本。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="pricingRuleId" label="计费规则" rules={[{ required: true, message: '请选择计费规则' }]}>
                      <Select showSearch optionFilterProp="label" options={pricingRuleOptionList} placeholder="请选择计费规则" onChange={handlePricingRuleChange} />
                    </Form.Item>
                    <Form.Item name="ruleCode" label="规则编码"><Input disabled placeholder="选择计费规则后自动回填" /></Form.Item>
                    <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}><Input placeholder="例如：PR-V202605" /></Form.Item>
                    <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={pricingRuleVersionStatusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<ClockCircleOutlined />} title="版本价格" desc="维护版本生效时间、计费模式和基础价格，供规则版本发布和追溯。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="billingMode" label="计费模式"><Select options={billingModeOptions} placeholder="请选择计费模式" /></Form.Item>
                    <Form.Item name="basePrice" label="基础价格"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                    <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : (
              <>
                <BusinessEditorSection icon={<TagsOutlined />} title="规则归属" desc="规则编码、门店和服务商品共同决定价格规则的适用对象。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true, message: '请输入规则编码' }]}><Input placeholder="例如：PR-CAR-WASH-001" /></Form.Item>
                    <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}><Input placeholder="例如：标准洗车门店计费规则" /></Form.Item>
                    <Form.Item name="storeId" label="适用门店"><Select allowClear showSearch optionFilterProp="label" options={storeOptionList} placeholder="为空则表示全局规则" onChange={handleStoreChange} /></Form.Item>
                    <Form.Item name="serviceProductId" label="服务商品"><Select allowClear showSearch optionFilterProp="label" options={productOptionList} placeholder="请选择服务商品" onChange={handleProductChange} /></Form.Item>
                    <Form.Item name="storeName" label="门店名称"><Input disabled placeholder="选择门店后自动回填" /></Form.Item>
                    <Form.Item name="productName" label="商品名称"><Input disabled placeholder="选择服务商品后自动回填" /></Form.Item>
                    <Form.Item name="versionNo" label="版本号"><Input placeholder="例如：PR-V202605" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>

                <BusinessEditorSection icon={<ClockCircleOutlined />} title="基础价格" desc="维护起步价、分钟价、按次价、封顶和免费分钟，覆盖价格规则的常规计费链路。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="startPrice" label="起步价"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" /></Form.Item>
                    <Form.Item name="minutePrice" label="分钟单价"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" /></Form.Item>
                    <Form.Item name="countPrice" label="按次单价"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" /></Form.Item>
                    <Form.Item name="capAmount" label="封顶金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="不填则不封顶" /></Form.Item>
                    <Form.Item name="freeMinutes" label="免费分钟"><InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="例如：5" /></Form.Item>
                    <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                    <Form.Item name="expireAt" label="失效时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>

                <BusinessEditorSection icon={<FieldTimeOutlined />} title="特殊时段" desc="记录时段、夜间和节假日价格口径，形成特殊日期和常规计价的闭环。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="timeStart" label="开始时间"><TimeField placeholder="请选择开始时间" /></Form.Item>
                    <Form.Item name="timeEnd" label="结束时间"><TimeField placeholder="请选择结束时间" /></Form.Item>
                    <Form.Item name="nightPriceMode" label="夜间计价"><Select options={nightPriceModeOptions} placeholder="请选择夜间计价" /></Form.Item>
                    <Form.Item name="nightPriceValue" label="夜间数值"><Input placeholder="例如：每分钟 +0.2 元" /></Form.Item>
                    <Form.Item name="nightPriceDesc" label="夜间价格描述"><Input placeholder="例如：夜间每分钟 +0.2 元" /></Form.Item>
                    <Form.Item name="holidayPriceMode" label="节假日计价"><Select options={holidayPriceModeOptions} placeholder="请选择节假日计价" /></Form.Item>
                    <Form.Item name="holidayPriceValue" label="节假日数值"><Input placeholder="例如：39 元 / 加价 5 元 / 8 折" /></Form.Item>
                    <Form.Item name="holidayDates" label="适用日期"><Input placeholder="例如：2026-05-01 至 2026-05-05" /></Form.Item>
                    <Form.Item name="holidayStackPolicy" label="夜间价叠加"><Select options={stackPolicyOptions} placeholder="请选择叠加方式" /></Form.Item>
                    <Form.Item name="holidayPriceDesc" label="节假日价格描述"><Input placeholder="例如：法定节假日起步价 39 元" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            )}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ProductPricingManagement;
