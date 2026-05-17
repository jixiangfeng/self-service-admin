import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import type { CascaderProps } from 'antd';
import { ApartmentOutlined, AuditOutlined, DeploymentUnitOutlined, PlusOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { useBackendBusinessEnumOptions, useBusinessEnumOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type { MerchantGroupRecord, MerchantGroupStoreRecord, SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderOptionTags, renderStatusTag, safeJsonParse } from '@/pages/Business/shared';
import { RegionCascader } from '@/utils/formControls';

const writeoffScopeOptions = [
  { value: '同门店组通用', label: '同门店组通用' },
  { value: '同商户门店组通用', label: '同商户门店组通用' },
  { value: '仅原购买门店可用', label: '仅原购买门店可用' },
];
const writeoffLimitOptions = [
  { value: '不支持跨商户核销', label: '不支持跨商户核销' },
  { value: '支持跨商户核销', label: '支持跨商户核销' },
];
const clearingModeOptions = [
  { value: 'NONE', label: '不启用跨商户清分' },
  { value: 'OFFLINE_CLEARING', label: '线下清分' },
];
const clearingCycleOptions = [
  { value: 'DAY', label: '日结' },
  { value: 'WEEK', label: '周结' },
  { value: 'MONTH', label: '月结' },
];
const cashHolderOptions = [
  { value: 'RECHARGE_MERCHANT', label: '充值收款商户' },
  { value: 'PLATFORM_PREPAID', label: '平台预收账户' },
];
const revenueOwnerOptions = [
  { value: 'CONSUME_STORE', label: '消费履约门店' },
  { value: 'RECHARGE_STORE', label: '充值来源门店' },
  { value: 'RATIO_SPLIT', label: '按协议比例分摊' },
];
const clearingBaseOptions = [
  { value: 'PRINCIPAL_ONLY', label: '仅本金消耗' },
  { value: 'PRINCIPAL_PLUS_GIFT', label: '本金 + 赠送余额' },
  { value: 'ORDER_PAYABLE', label: '订单应付金额' },
  { value: 'AFTER_COUPON', label: '优惠后实收口径' },
];
const clearingCostBearerOptions = [
  { value: 'RECHARGE_MERCHANT', label: '充值商户承担' },
  { value: 'CONSUME_MERCHANT', label: '消费商户承担' },
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'GROUP_RATIO', label: '门店组比例分摊' },
];
const parseGroupRules = (record: MerchantGroupRecord) => ({
  ...parseScopeConfig(record.scope, record),
  ...parseWriteoffConfig(record.writeoffRule, record),
});
const parseScopeConfig = (scope?: string, record?: MerchantGroupRecord) => ({
  scopeUsages: record?.scopeUsages || safeJsonParse<{ scopeUsages?: string[] }>(scope, {}).scopeUsages || [],
  scopeRemark: record?.scopeRemark || safeJsonParse<{ scopeRemark?: string }>(scope, {}).scopeRemark,
});
const parseWriteoffConfig = (writeoffRule?: string, record?: MerchantGroupRecord) => ({
  writeoffScope: record?.writeoffScope || safeJsonParse<{ writeoffScope?: string }>(writeoffRule, {}).writeoffScope,
  writeoffLimit: record?.writeoffLimit || safeJsonParse<{ writeoffLimit?: string }>(writeoffRule, {}).writeoffLimit,
  writeoffRemark: record?.writeoffRemark || safeJsonParse<{ writeoffRemark?: string }>(writeoffRule, {}).writeoffRemark,
  settlementMode: record?.settlementMode || safeJsonParse<{ settlementMode?: string }>(writeoffRule, {}).settlementMode,
  settlementCycle: record?.settlementCycle || safeJsonParse<{ settlementCycle?: string }>(writeoffRule, {}).settlementCycle,
  cashHolder: record?.cashHolder || safeJsonParse<{ cashHolder?: string }>(writeoffRule, {}).cashHolder,
  revenueOwner: record?.revenueOwner || safeJsonParse<{ revenueOwner?: string }>(writeoffRule, {}).revenueOwner,
  principalBearer: record?.principalBearer || safeJsonParse<{ principalBearer?: string }>(writeoffRule, {}).principalBearer,
  giftCostBearer: record?.giftCostBearer || safeJsonParse<{ giftCostBearer?: string }>(writeoffRule, {}).giftCostBearer,
  couponCostBearer: record?.couponCostBearer || safeJsonParse<{ couponCostBearer?: string }>(writeoffRule, {}).couponCostBearer,
  paymentFeeBearer: record?.paymentFeeBearer || safeJsonParse<{ paymentFeeBearer?: string }>(writeoffRule, {}).paymentFeeBearer,
  clearingBase: record?.clearingBase || safeJsonParse<{ clearingBase?: string }>(writeoffRule, {}).clearingBase,
  rechargeMerchantRate: record?.rechargeMerchantRate || safeJsonParse<{ rechargeMerchantRate?: number | string }>(writeoffRule, {}).rechargeMerchantRate,
  consumeMerchantRate: record?.consumeMerchantRate || safeJsonParse<{ consumeMerchantRate?: number | string }>(writeoffRule, {}).consumeMerchantRate,
  platformRate: record?.platformRate || safeJsonParse<{ platformRate?: number | string }>(writeoffRule, {}).platformRate,
  rechargeCommissionRate: record?.rechargeCommissionRate || safeJsonParse<{ rechargeCommissionRate?: number | string }>(writeoffRule, {}).rechargeCommissionRate,
  platformFeeRate: record?.platformFeeRate || safeJsonParse<{ platformFeeRate?: number | string }>(writeoffRule, {}).platformFeeRate,
  arrearsLimit: record?.arrearsLimit || safeJsonParse<{ arrearsLimit?: number | string }>(writeoffRule, {}).arrearsLimit,
  overdueFreezeDays: record?.overdueFreezeDays || safeJsonParse<{ overdueFreezeDays?: number | string }>(writeoffRule, {}).overdueFreezeDays,
  clearingRemark: record?.clearingRemark || safeJsonParse<{ clearingRemark?: string }>(writeoffRule, {}).clearingRemark,
});
const buildGroupScope = (values: Record<string, any>) =>
  JSON.stringify({
    scopeUsages: Array.isArray(values.scopeUsages) ? values.scopeUsages : [],
    scopeRemark: values.scopeRemark || '',
  });
const buildWriteoffRule = (values: Record<string, any>) =>
  JSON.stringify({
    writeoffScope: values.writeoffScope || '',
    writeoffLimit: values.writeoffLimit || '',
    writeoffRemark: values.writeoffRemark || '',
    settlementMode: values.settlementMode || 'NONE',
    settlementCycle: values.settlementCycle || '',
    cashHolder: values.cashHolder || '',
    revenueOwner: values.revenueOwner || '',
    principalBearer: values.principalBearer || '',
    giftCostBearer: values.giftCostBearer || '',
    couponCostBearer: values.couponCostBearer || '',
    paymentFeeBearer: values.paymentFeeBearer || '',
    clearingBase: values.clearingBase || '',
    rechargeMerchantRate: values.rechargeMerchantRate ?? '',
    consumeMerchantRate: values.consumeMerchantRate ?? '',
    platformRate: values.platformRate ?? '',
    rechargeCommissionRate: values.rechargeCommissionRate ?? '',
    platformFeeRate: values.platformFeeRate ?? '',
    arrearsLimit: values.arrearsLimit ?? '',
    overdueFreezeDays: values.overdueFreezeDays ?? '',
    clearingRemark: values.clearingRemark || '',
  });
const optionLabel = (options: Array<{ value: string; label: string }>, value?: string) =>
  options.find((item) => item.value === value)?.label || value || '-';
const formatPercent = (value?: number | string) => (value === undefined || value === null || value === '' ? '-' : `${value}%`);
const formatAmount = (value?: number | string) => (value === undefined || value === null || value === '' ? '-' : `￥${value}`);
const buildRatioText = (record: MerchantGroupRecord) => {
  if (!record.rechargeMerchantRate && !record.consumeMerchantRate && !record.platformRate) {
    return '-';
  }

  return [
    `充值商户留存 ${formatPercent(record.rechargeMerchantRate)}`,
    `履约商户分得 ${formatPercent(record.consumeMerchantRate)}`,
    `平台服务费 ${formatPercent(record.platformRate)}`,
  ].join(' / ');
};

const MerchantGroupManagement: React.FC = () => {
  const [form] = Form.useForm<MerchantGroupRecord>();
  const [records, setRecords] = useState<MerchantGroupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detail, setDetail] = useState<MerchantGroupRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MerchantGroupRecord | null>(null);
  const [memberForm] = Form.useForm<MerchantGroupStoreRecord>();
  const [memberVisible, setMemberVisible] = useState(false);
  const [memberGroup, setMemberGroup] = useState<MerchantGroupRecord | null>(null);
  const [members, setMembers] = useState<MerchantGroupStoreRecord[]>([]);
  const [editingMember, setEditingMember] = useState<MerchantGroupStoreRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForMerchantGroups'], queryFn: async () => (await api.merchant.options()).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForMerchantGroups'], queryFn: async () => (await api.store.options()).data });
  const merchantGroupTypeOptions = useBusinessEnumOptions('merchantGroupTypeOptions');
  const scopeLevelOptions = useBusinessEnumOptions('scopeLevelOptions');
  const templateStatusOptions = useBusinessEnumOptions('templateStatusOptions');
  const groupUsageOptions = useBackendBusinessEnumOptions('merchantGroupUsageOptions');
  const groupTypeMap = useMemo(() => buildValueEnum(merchantGroupTypeOptions), [merchantGroupTypeOptions]);
  const statusMap = useMemo(() => buildValueEnum(templateStatusOptions), [templateStatusOptions]);
  const scopeLevelMap = useMemo(() => buildValueEnum(scopeLevelOptions), [scopeLevelOptions]);
  const merchantOptionMap = useMemo(() => new Map((merchantOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item])), [storeOptions]);
  const fetchRecords = async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const result = await api.merchantGroup.page({
        current: 1,
        size: 100,
        keyword,
        groupType: typeFilter,
        status: statusFilter,
        ...params,
      });
      const page = 'data' in result ? result.data : result;
      setRecords((page.records || []).map((record) => ({ ...record, ...parseGroupRules(record) })));
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const fetchMembers = async (group: MerchantGroupRecord) => {
    setMemberLoading(true);
    try {
      const result = await api.merchantGroupStore.page({ current: 1, size: 100, groupId: group.id });
      const page = 'data' in result ? result.data : result;
      setMembers(page.records || []);
    } finally {
      setMemberLoading(false);
    }
  };

  const openMemberModal = async (record: MerchantGroupRecord) => {
    setMemberGroup(record);
    setEditingMember(null);
    memberForm.resetFields();
    setMemberVisible(true);
    await fetchMembers(record);
  };

  const handleMemberSubmit = async () => {
    if (!memberGroup) return;
    const values = await memberForm.validateFields();
    if (editingMember) {
      await api.merchantGroupStore.edit({ ...editingMember, ...values });
      message.success('门店成员已更新');
    } else {
      await api.merchantGroupStore.add({
        ...values,
        groupId: memberGroup.id,
        merchantId: memberGroup.merchantId,
        status: values.status || 'ENABLED',
      });
      message.success('门店成员已添加');
    }
    setEditingMember(null);
    memberForm.resetFields();
    await fetchMembers(memberGroup);
    await fetchRecords();
  };

  const confirmGroupStatus = (record: MerchantGroupRecord) => {
    const nextStatus = record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    showBusinessConfirm({
      eyebrow: '状态确认',
      title: `确认${record.status === 'ENABLED' ? '停用' : '启用'}该门店组`,
      content: `门店组「${record.groupName}」状态更新后，将影响活动投放、跨店核销和统计口径。`,
      okText: '确认更新',
      danger: false,
      onOk: async () => {
        await api.merchantGroup.changeStatus(record.id, nextStatus);
        message.success('门店组状态已更新');
        fetchRecords();
      },
    });
  };

  const confirmRemoveMember = (record: MerchantGroupStoreRecord) => {
    showBusinessConfirm({
      title: '确认移除该门店成员',
      content: `移除「${record.storeName || record.storeCode || record.storeId}」后，该门店将不再参与当前门店组的活动、核销和统计范围。`,
      okText: '确认移除',
      onOk: async () => {
        await api.merchantGroupStore.remove(record.id);
        message.success('门店成员已移除');
        if (memberGroup) {
          await fetchMembers(memberGroup);
          await fetchRecords();
        }
      },
    });
  };

  const summary = useMemo(
    () => ({
      total: records.length,
      activity: records.filter((item) => item.groupType === 'ACTIVITY').length,
      writeoff: records.filter((item) => item.groupType === 'WRITEOFF').length,
      stores: records.reduce((sum, item) => sum + Number(item.storeCount || 0), 0),
    }),
    [records]
  );

  const columns: ProColumns<MerchantGroupRecord>[] = [
    {
      title: '门店组',
      dataIndex: 'groupName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.groupName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>{record.groupCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店组 / 商户 / 城市 / 负责人' } },
    { title: '所属商户', dataIndex: 'merchantName', width: 180, search: false },
    {
      title: '分组类型',
      dataIndex: 'groupType',
      width: 140,
      valueType: 'select',
      valueEnum: groupTypeMap,
      render: (_, record) => renderStatusTag(record.groupType, groupTypeMap),
    },
    {
      title: '作用层级',
      dataIndex: 'scopeLevel',
      width: 120,
      search: false,
      render: (_, record) => renderStatusTag(record.scopeLevel, scopeLevelMap),
    },
    { title: '城市', dataIndex: 'city', width: 120, search: false },
    { title: '门店数', dataIndex: 'storeCount', width: 100, search: false },
    { title: '用途范围', dataIndex: 'scopeUsages', width: 240, search: false, render: (_, record) => renderOptionTags(record.scopeUsages?.length ? record.scopeUsages : record.scope, groupUsageOptions) },
    { title: '核销规则', dataIndex: 'writeoffRule', width: 220, search: false, render: (_, record) => [record.writeoffScope, record.writeoffLimit].filter(Boolean).join('、') || record.writeoffRule || '-' },
    { title: '负责人', dataIndex: 'owner', width: 140, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: statusMap,
      render: (_, record) => renderStatusTag(record.status, statusMap),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({ ...record, ...parseGroupRules(record), region: [record.city].filter(Boolean) } as any);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button size="small" onClick={() => openMemberModal(record)}>成员</Button>
          <Button size="small" onClick={() => confirmGroupStatus(record)}>{record.status === 'ENABLED' ? '停用' : '启用'}</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const {
      scopeUsages,
      scopeRemark,
      writeoffScope,
      writeoffLimit,
      writeoffRemark,
      settlementMode,
      settlementCycle,
      cashHolder,
      revenueOwner,
      principalBearer,
      giftCostBearer,
      couponCostBearer,
      paymentFeeBearer,
      clearingBase,
      rechargeMerchantRate,
      consumeMerchantRate,
      platformRate,
      rechargeCommissionRate,
      platformFeeRate,
      arrearsLimit,
      overdueFreezeDays,
      clearingRemark,
      ...baseValues
    } = values as Record<string, any>;
    const payload = {
      ...baseValues,
      scope: buildGroupScope({ scopeUsages, scopeRemark }),
      writeoffRule: buildWriteoffRule({
        writeoffScope,
        writeoffLimit,
        writeoffRemark,
        settlementMode,
        settlementCycle,
        cashHolder,
        revenueOwner,
        principalBearer,
        giftCostBearer,
        couponCostBearer,
        paymentFeeBearer,
        clearingBase,
        rechargeMerchantRate,
        consumeMerchantRate,
        platformRate,
        rechargeCommissionRate,
        platformFeeRate,
        arrearsLimit,
        overdueFreezeDays,
        clearingRemark,
      }),
    };
    if (editingRecord) {
      await api.merchantGroup.edit({ ...editingRecord, ...payload } as Record<string, unknown>);
      message.success('门店组已更新');
    } else {
      await api.merchantGroup.add(payload as unknown as Record<string, unknown>);
      message.success('门店组已创建');
    }
    closeModal();
    fetchRecords();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店组管理" subtitle="按文档补齐区域、活动、核销、统计门店组的配置与查看能力。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店组总量" value={summary.total} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动门店组" value={summary.activity} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="跨店核销组" value={summary.writeoff} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="覆盖门店" value={summary.stores} suffix="家" /></Card></Col>
      </Row>

      <ProTable<MerchantGroupRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        request={async (params) => {
          const result = await api.merchantGroup.page({
            current: params.current,
            size: params.pageSize,
            keyword: params.keyword,
            groupType: params.groupType,
            status: params.status,
          });
          const page = 'data' in result ? result.data : result;
          const parsedRecords = (page.records || []).map((record) => ({ ...record, ...parseGroupRules(record) }));
          setRecords(parsedRecords);
          setKeyword(String(params.keyword || ''));
          setTypeFilter(params.groupType as string | undefined);
          setStatusFilter(params.status as string | undefined);
          return { data: parsedRecords, total: page.total, success: true };
        }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1880 }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({
                groupType: 'ACTIVITY',
                scopeLevel: 'STORE_GROUP',
                status: 'DRAFT',
                storeCount: 0,
                writeoffLimit: '不支持跨商户核销',
                settlementMode: 'NONE',
                settlementCycle: 'WEEK',
                cashHolder: 'RECHARGE_MERCHANT',
                revenueOwner: 'CONSUME_STORE',
                principalBearer: 'RECHARGE_MERCHANT',
                giftCostBearer: 'RECHARGE_MERCHANT',
                couponCostBearer: 'PLATFORM',
                paymentFeeBearer: 'RECHARGE_MERCHANT',
                clearingBase: 'PRINCIPAL_PLUS_GIFT',
                rechargeMerchantRate: 0,
                consumeMerchantRate: 100,
                platformRate: 0,
                rechargeCommissionRate: 0,
                platformFeeRate: 0,
                arrearsLimit: 0,
                overdueFreezeDays: 7,
              });
              setModalVisible(true);
            }}
          >
            新建门店组
          </Button>,
        ]}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '门店组配置维护' : '门店组建档'}
        title={editingRecord ? `编辑门店组 · ${editingRecord.groupName}` : '新建门店组'}
        subtitle="用于活动投放、跨店核销、区域运营和统计分析，需同时绑定商户主体和作用范围。"
        meta={['门店组', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingRecord ? '保存变更' : '创建门店组'}
        width={1120}
        forceRender
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<DeploymentUnitOutlined />}
              title="分组基础信息"
              desc="定义门店组编码、名称、归属商户和当前状态，支撑后续成员维护和业务引用。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="groupCode" label="门店组编码" rules={[{ required: true, message: '请输入门店组编码' }]}>
                  <Input placeholder="例如：GRP-ACT-001" />
                </Form.Item>
                <Form.Item name="groupName" label="门店组名称" rules={[{ required: true, message: '请输入门店组名称' }]}>
                  <Input placeholder="例如：五一活动核心门店组" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select options={templateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={merchantOptions as SelectOptionRecord[]}
                    placeholder="请选择商户"
                    onChange={(value) => form.setFieldValue('merchantName', merchantOptionMap.get(value))}
                  />
                </Form.Item>
                <Form.Item name="merchantName" label="商户名称" rules={[{ required: true, message: '请选择商户' }]}>
                  <Input disabled placeholder="选择商户后自动带出" />
                </Form.Item>
                <Form.Item name="owner" label="负责人">
                  <Input placeholder="例如：区域运营负责人" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<TagsOutlined />}
              title="作用范围与规则"
              desc="明确门店组使用场景、城市范围和核销规则，避免活动、券和结算口径混用。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="groupType" label="分组类型" rules={[{ required: true, message: '请选择分组类型' }]}>
                  <Select options={merchantGroupTypeOptions} placeholder="请选择分组类型" />
                </Form.Item>
                <Form.Item name="scopeLevel" label="作用层级" rules={[{ required: true, message: '请选择作用层级' }]}>
                  <Select options={scopeLevelOptions} placeholder="请选择作用层级" />
                </Form.Item>
                <Form.Item name="region" label="城市">
                  <RegionCascader
                    placeholder="请选择城市"
                    onChange={(value: CascaderProps['value']) => {
                      const parts = (value || []) as string[];
                      form.setFieldValue('city', parts[1] || parts[0]);
                    }}
                  />
                </Form.Item>
                <Form.Item name="city" hidden><Input /></Form.Item>
                <Form.Item name="storeCount" label="门店数">
                  <Input disabled placeholder="由成员维护自动统计" />
                </Form.Item>
                <Form.Item name="scopeUsages" label="用途范围">
                  <Select mode="multiple" options={groupUsageOptions} placeholder="请选择用途范围" />
                </Form.Item>
                <Form.Item name="scopeRemark" label="用途补充">
                  <Input placeholder="例如：五一活动核心门店" />
                </Form.Item>
                <Form.Item name="writeoffScope" label="核销范围">
                  <Select options={writeoffScopeOptions} placeholder="请选择核销范围" />
                </Form.Item>
                <Form.Item name="writeoffLimit" label="跨商户限制">
                  <Select options={writeoffLimitOptions} placeholder="请选择限制方式" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="writeoffRemark" label="核销补充">
                  <Input placeholder="例如：活动券仅支持有效期内核销" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="记录维护原因、使用边界或审批说明" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<AuditOutlined />}
              title="跨商户线下清分协议"
              desc="当加盟商使用各自微信商户号收款时，跨店消费不会自动分账，需要在这里约定资金持有方、履约收入归属、成本承担和逾期风控。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="settlementMode" label="清分方式">
                  <Select options={clearingModeOptions} placeholder="请选择清分方式" />
                </Form.Item>
                <Form.Item name="settlementCycle" label="清分周期">
                  <Select options={clearingCycleOptions} placeholder="请选择清分周期" />
                </Form.Item>
                <Form.Item name="cashHolder" label="资金持有方">
                  <Select options={cashHolderOptions} placeholder="请选择资金持有方" />
                </Form.Item>
                <Form.Item name="revenueOwner" label="收入归属">
                  <Select options={revenueOwnerOptions} placeholder="请选择收入归属" />
                </Form.Item>
                <Form.Item name="principalBearer" label="本金兑付方">
                  <Select options={clearingCostBearerOptions} placeholder="请选择本金兑付方" />
                </Form.Item>
                <Form.Item name="giftCostBearer" label="赠送余额成本">
                  <Select options={clearingCostBearerOptions} placeholder="请选择赠送余额成本承担方" />
                </Form.Item>
                <Form.Item name="couponCostBearer" label="优惠券成本">
                  <Select options={clearingCostBearerOptions} placeholder="请选择优惠券成本承担方" />
                </Form.Item>
                <Form.Item name="paymentFeeBearer" label="支付手续费">
                  <Select options={clearingCostBearerOptions} placeholder="请选择支付手续费承担方" />
                </Form.Item>
                <Form.Item name="clearingBase" label="清分基数">
                  <Select options={clearingBaseOptions} placeholder="请选择清分基数" />
                </Form.Item>
                <Form.Item name="rechargeMerchantRate" label="充值商户留存比例">
                  <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：5" />
                </Form.Item>
                <Form.Item name="consumeMerchantRate" label="履约商户分得比例">
                  <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：92" />
                </Form.Item>
                <Form.Item name="platformRate" label="平台服务费比例">
                  <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：3" />
                </Form.Item>
                <Form.Item name="rechargeCommissionRate" label="兼容：充值佣金">
                  <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="可留空，旧规则字段" />
                </Form.Item>
                <Form.Item name="platformFeeRate" label="兼容：平台费率">
                  <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="可留空，旧规则字段" />
                </Form.Item>
                <Form.Item name="arrearsLimit" label="欠款额度">
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="例如：5000" />
                </Form.Item>
                <Form.Item name="overdueFreezeDays" label="逾期冻结天数">
                  <InputNumber min={0} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="例如：7" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="clearingRemark" label="清分补充">
                  <Input.TextArea rows={3} placeholder="例如：A 商户收充值款，B 门店履约后按周线下对账打款；逾期超限自动暂停跨店核销。" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="门店组详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店组编码">{detail.groupCode}</Descriptions.Item>
            <Descriptions.Item label="门店组名称">{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label="所属商户">{detail.merchantName}</Descriptions.Item>
            <Descriptions.Item label="分组类型">{groupTypeMap[detail.groupType as keyof typeof groupTypeMap]?.text || detail.groupType}</Descriptions.Item>
            <Descriptions.Item label="作用层级">{scopeLevelMap[detail.scopeLevel as keyof typeof scopeLevelMap]?.text || detail.scopeLevel}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="门店数">{detail.storeCount}</Descriptions.Item>
            <Descriptions.Item label="用途范围">{(detail.scopeUsages || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="用途补充">{detail.scopeRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销范围">{detail.writeoffScope || '-'}</Descriptions.Item>
            <Descriptions.Item label="跨商户限制">{detail.writeoffLimit || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销补充">{detail.writeoffRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="清分方式">{optionLabel(clearingModeOptions, detail.settlementMode)}</Descriptions.Item>
            <Descriptions.Item label="清分周期">{optionLabel(clearingCycleOptions, detail.settlementCycle)}</Descriptions.Item>
            <Descriptions.Item label="资金持有方">{optionLabel(cashHolderOptions, detail.cashHolder)}</Descriptions.Item>
            <Descriptions.Item label="收入归属">{optionLabel(revenueOwnerOptions, detail.revenueOwner)}</Descriptions.Item>
            <Descriptions.Item label="本金兑付方">{optionLabel(clearingCostBearerOptions, detail.principalBearer)}</Descriptions.Item>
            <Descriptions.Item label="赠送余额成本">{optionLabel(clearingCostBearerOptions, detail.giftCostBearer)}</Descriptions.Item>
            <Descriptions.Item label="优惠券成本">{optionLabel(clearingCostBearerOptions, detail.couponCostBearer)}</Descriptions.Item>
            <Descriptions.Item label="支付手续费">{optionLabel(clearingCostBearerOptions, detail.paymentFeeBearer)}</Descriptions.Item>
            <Descriptions.Item label="清分基数">{optionLabel(clearingBaseOptions, detail.clearingBase)}</Descriptions.Item>
            <Descriptions.Item label="协议比例">{buildRatioText(detail)}</Descriptions.Item>
            <Descriptions.Item label="充值商户留存">{formatPercent(detail.rechargeMerchantRate)}</Descriptions.Item>
            <Descriptions.Item label="履约商户分得">{formatPercent(detail.consumeMerchantRate)}</Descriptions.Item>
            <Descriptions.Item label="平台服务费">{formatPercent(detail.platformRate)}</Descriptions.Item>
            <Descriptions.Item label="兼容充值佣金">{formatPercent(detail.rechargeCommissionRate)}</Descriptions.Item>
            <Descriptions.Item label="欠款额度">{formatAmount(detail.arrearsLimit)}</Descriptions.Item>
            <Descriptions.Item label="逾期冻结">{detail.overdueFreezeDays ? `${detail.overdueFreezeDays} 天` : '-'}</Descriptions.Item>
            <Descriptions.Item label="清分补充" span={2}>{detail.clearingRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="负责人">{detail.owner}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="门店组成员维护"
        title={memberGroup ? `门店组成员 · ${memberGroup.groupName}` : '门店组成员'}
        subtitle="将门店加入当前门店组，成员变更会同步影响门店组覆盖数量。"
        meta={['成员维护', editingMember ? '编辑成员' : '添加成员']}
        open={memberVisible}
        onCancel={() => {
          setMemberVisible(false);
          setMemberGroup(null);
          setEditingMember(null);
          memberForm.resetFields();
        }}
        footer={null}
        width={1080}
      >
        <Form form={memberForm} layout="vertical" className="merchant-editor-form" style={{ marginBottom: 16 }}>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="门店成员信息"
              desc="选择门店后自动带出门店名称，可补充编码和成员维护说明。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions as SelectOptionRecord[]}
                    placeholder="请选择门店"
                    onChange={(value) => memberForm.setFieldValue('storeName', storeOptionMap.get(value))}
                  />
                </Form.Item>
                <Form.Item name="storeCode" label="门店编码">
                  <Input placeholder="例如：STR-HQ-001" />
                </Form.Item>
                <Form.Item name="storeName" label="门店名称" rules={[{ required: true, message: '请选择门店' }]}>
                  <Input disabled placeholder="选择门店后自动带出" />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue="ENABLED">
                  <Select options={templateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input placeholder="记录加入门店组的原因或使用限制" />
                </Form.Item>
              </div>
              <div className="merchant-editor-actions">
                <Button onClick={() => { setEditingMember(null); memberForm.resetFields(); }}>清空</Button>
                <Button type="primary" onClick={handleMemberSubmit}>{editingMember ? '更新成员' : '添加成员'}</Button>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
        <ProTable<MerchantGroupStoreRecord>
          rowKey="id"
          search={false}
          options={false}
          loading={memberLoading}
          dataSource={members}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '门店ID', dataIndex: 'storeId', width: 100 },
            { title: '门店编码', dataIndex: 'storeCode', width: 140 },
            { title: '门店名称', dataIndex: 'storeName', width: 180 },
            { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
            { title: '备注', dataIndex: 'remark', width: 180 },
            {
              title: '操作',
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingMember(record);
                      memberForm.setFieldsValue(record);
                    }}
                  >
                    编辑
                  </Button>
                  <Button size="small" danger onClick={() => confirmRemoveMember(record)}>移除</Button>
                </Space>
              ),
            },
          ]}
        />
      </BusinessEditorModal>
    </div>
  );
};

export default MerchantGroupManagement;
