import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tag, Typography, message } from 'antd';
import { AccountBookOutlined, ApartmentOutlined, CalculatorOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type SelectOptionRecord, type SettlementRuleRecord } from '@/services/backendService';
import { DateTimeField, fromDateTimePickerValue, toDateTimePickerValue } from '@/utils/formControls';

const { TextArea } = Input;

const statusOptions = [
  { value: 'ENABLED', label: '启用', color: 'success' },
  { value: 'DISABLED', label: '停用', color: 'default' },
];
const ruleTypeOptions = [
  { value: 'RECHARGE_BALANCE', label: '充值余额' },
  { value: 'BALANCE_CONSUME', label: '余额消费' },
  { value: 'STORE_GROUP_CLEARING', label: '门店组清分' },
  { value: 'PLATFORM_CLEARING', label: '平台清分' },
];
const settlementModeOptions = [
  { value: 'STORE_CLEARING', label: '门店清分' },
  { value: 'MERCHANT_CLEARING', label: '商户清分' },
  { value: 'GROUP_UNIFIED_SETTLEMENT', label: '门店组统一结算' },
  { value: 'PLATFORM_CLEARING', label: '平台统一清分' },
  { value: 'OFFLINE_CLEARING', label: '线下清分' },
];
const ownerTypeOptions = [
  { value: 'PLATFORM', label: '平台' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
  { value: 'STORE_GROUP', label: '门店组' },
  { value: 'SERVICE_STORE', label: '服务门店' },
  { value: 'SOURCE_STORE', label: '来源门店' },
  { value: 'ISSUER_MERCHANT', label: '发行商户' },
  { value: 'FIXED_UNIT', label: '指定结算单元' },
  { value: 'SHARED', label: '多方分摊' },
];
const scopeTypeOptions = [
  { value: 'PLATFORM', label: '平台通用' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
  { value: 'STORE_GROUP', label: '门店组' },
  { value: 'CUSTOM_STORE_SET', label: '自定义门店集合' },
];
const feeTypeOptions = [
  { value: 'NONE', label: '不收取' },
  { value: 'RATE', label: '按比例' },
  { value: 'FIXED', label: '固定金额' },
  { value: 'RATE_PLUS_FIXED', label: '比例+固定' },
];
const feeBaseOptions = [
  { value: 'ORDER_ORIGINAL_AMOUNT', label: '订单原价' },
  { value: 'USER_PAID_AMOUNT', label: '用户实付' },
  { value: 'BALANCE_LOT_AMOUNT', label: '余额批次金额' },
  { value: 'MERCHANT_RECEIVABLE_AMOUNT', label: '商户应收' },
  { value: 'PRINCIPAL_AMOUNT', label: '本金金额' },
  { value: 'SERVICE_AMOUNT', label: '服务金额' },
];
const settlementCycleOptions = [
  { value: 'REALTIME', label: '实时' },
  { value: 'T_PLUS_1', label: 'T+1' },
  { value: 'T_PLUS_3', label: 'T+3' },
  { value: 'WEEKLY', label: '周结' },
  { value: 'MONTHLY', label: '月结' },
];
const refundRuleOptions = [
  { value: 'UNSETTLED_DEDUCT', label: '未结算直接冲减' },
  { value: 'SETTLED_NEXT_PERIOD_OFFSET', label: '已结算下期抵扣' },
  { value: 'MANUAL_REVIEW', label: '人工复核' },
];
const restoreRuleOptions = [
  { value: 'RESTORE_ORIGINAL_LOT', label: '恢复原批次' },
  { value: 'NO_RESTORE', label: '不恢复' },
  { value: 'MANUAL_REVIEW', label: '人工复核' },
];
const flagOptions = [
  { value: 'Y', label: '是' },
  { value: 'N', label: '否' },
];

const statusMap = buildValueEnum(statusOptions);
const ruleTypeMap = buildValueEnum(ruleTypeOptions);
const modeMap = buildValueEnum(settlementModeOptions);
const ownerTypeMap = buildValueEnum(ownerTypeOptions);
const scopeTypeMap = buildValueEnum(scopeTypeOptions);
const feeTypeMap = buildValueEnum(feeTypeOptions);
const feeBaseMap = buildValueEnum(feeBaseOptions);
const cycleMap = buildValueEnum(settlementCycleOptions);
const refundMap = buildValueEnum(refundRuleOptions);
const restoreMap = buildValueEnum(restoreRuleOptions);
const flagMap = buildValueEnum(flagOptions);

const enumText = (map: Record<string | number, { text: string }>, value?: string | number) => (value == null ? '-' : map[value]?.text || String(value));
const renderEnumTag = (map: Record<string | number, { text: string; color?: string }>, value?: string | number) => renderStatusTag(value, map);

const normalizePickerValues = (values: SettlementRuleRecord) => ({
  ...values,
  effectiveFrom: fromDateTimePickerValue(values.effectiveFrom as any) || values.effectiveFrom,
  effectiveTo: fromDateTimePickerValue(values.effectiveTo as any) || values.effectiveTo,
});

const normalizePickerInitialValues = (record: SettlementRuleRecord) => ({
  ...record,
  effectiveFrom: toDateTimePickerValue(record.effectiveFrom) as any,
  effectiveTo: toDateTimePickerValue(record.effectiveTo) as any,
});

const formatPlatformFee = (record: SettlementRuleRecord) => {
  if (!record.platformFeeType || record.platformFeeType === 'NONE') {
    return <Tag>不收取</Tag>;
  }

  const details = [
    record.platformFeeRate ? `${record.platformFeeRate}%` : undefined,
    record.platformFeeFixedAmount ? formatAmount(record.platformFeeFixedAmount) : undefined,
  ].filter(Boolean).join(' + ');

  return (
    <Space size={4} wrap>
      <Tag color="processing">{enumText(feeTypeMap, record.platformFeeType)}</Tag>
      {details ? <span className="settlement-rule-table__muted">{details}</span> : null}
    </Space>
  );
};

const formatScopeText = (record: SettlementRuleRecord, storedValueGroupMap: Map<number, string>) => {
  const scope = enumText(scopeTypeMap, record.balanceScopeType);
  const group = record.merchantGroupId ? storedValueGroupMap.get(record.merchantGroupId) || `门店组#${record.merchantGroupId}` : undefined;
  const activity = record.activityId ? `活动#${record.activityId}` : undefined;

  return [scope !== '-' ? scope : undefined, group, activity].filter(Boolean).join(' / ') || '-';
};

const ownerLine = (label: string, type?: string, id?: number) => {
  const text = [type ? enumText(ownerTypeMap, type) : undefined, id ? `#${id}` : undefined].filter(Boolean).join('');
  return text ? `${label}：${text}` : undefined;
};

const ruleFields: DetailField<SettlementRuleRecord>[] = [
  { name: 'ruleCode', label: '规则编码' },
  { name: 'ruleName', label: '规则名称' },
  { name: 'ruleType', label: '规则类型', render: (value) => enumText(ruleTypeMap, value) },
  { name: 'status', label: '状态', render: (value) => renderEnumTag(statusMap, value) },
  { name: 'settlementMode', label: '清分模式', render: (value) => enumText(modeMap, value) },
  { name: 'versionNo', label: '版本' },
  { name: 'priority', label: '优先级' },
  { name: 'effectiveFrom', label: '生效时间', render: (value) => formatDateTime(value) },
  { name: 'effectiveTo', label: '失效时间', render: (value) => formatDateTime(value) },
  { name: 'balanceScopeType', label: '余额范围', render: (value) => enumText(scopeTypeMap, value) },
  { name: 'activityId', label: '活动ID' },
  { name: 'issuerType', label: '发行主体', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'issuerId', label: '发行主体ID' },
  { name: 'sourceMerchantId', label: '来源商户ID' },
  { name: 'sourceStoreId', label: '来源门店ID' },
  { name: 'serviceMerchantId', label: '消费商户ID' },
  { name: 'serviceStoreId', label: '消费门店ID' },
  { name: 'merchantGroupId', label: '门店组ID' },
  { name: 'crossMerchantFlag', label: '跨商户', render: (value) => enumText(flagMap, value) },
  { name: 'revenueOwnerType', label: '收入归属', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'revenueOwnerUnitType', label: '收入结算单元类型', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'revenueOwnerUnitId', label: '收入结算单元ID' },
  { name: 'principalCostBearerType', label: '本金责任方', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'giftCostBearerType', label: '赠送成本方', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'giftCostShareRule', label: '赠送分摊规则' },
  { name: 'platformFeeType', label: '平台费类型', render: (value) => enumText(feeTypeMap, value) },
  { name: 'platformFeeRate', label: '平台费率' },
  { name: 'platformFeeFixedAmount', label: '固定平台费', render: (value) => formatAmount(value) },
  { name: 'platformFeeBase', label: '平台费基数', render: (value) => enumText(feeBaseMap, value) },
  { name: 'minPlatformFee', label: '最低平台费', render: (value) => formatAmount(value) },
  { name: 'maxPlatformFee', label: '最高平台费', render: (value) => formatAmount(value) },
  { name: 'platformFeeBearerType', label: '平台费承担方', render: (value) => enumText(ownerTypeMap, value) },
  { name: 'settlementCycle', label: '结算周期', render: (value) => enumText(cycleMap, value) },
  { name: 'settlementDelayDays', label: '延迟天数' },
  { name: 'refundFreezeDays', label: '退款冻结天数' },
  { name: 'minSettlementAmount', label: '最低结算金额', render: (value) => formatAmount(value) },
  { name: 'autoSettlement', label: '自动结算', render: (value) => enumText(flagMap, value) },
  { name: 'nettingEnabled', label: '净额轧差', render: (value) => enumText(flagMap, value) },
  { name: 'refundRule', label: '退款冲正规则', render: (value) => enumText(refundMap, value) },
  { name: 'serviceFeeRefundRule', label: '服务费退款规则', render: (value) => enumText(refundMap, value) },
  { name: 'principalRestoreRule', label: '本金恢复规则', render: (value) => enumText(restoreMap, value) },
  { name: 'giftRestoreRule', label: '赠送恢复规则', render: (value) => enumText(restoreMap, value) },
  { name: 'ruleSnapshot', label: '规则快照' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const SettlementRuleManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SettlementRuleRecord>();
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>();
  const [editingRecord, setEditingRecord] = useState<SettlementRuleRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<SettlementRuleRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const rulesQuery = useQuery({
    queryKey: ['settlementRules', keyword, statusFilter, ruleTypeFilter],
    queryFn: async () => (await api.settlementRule.page({ pageNum: 1, pageSize: 300, keyword: keyword || undefined, status: statusFilter, ruleType: ruleTypeFilter })).data,
  });
  const storedValueGroupsQuery = useQuery({
    queryKey: ['storedValueGroupOptionsForSettlementRules'],
    queryFn: async () => (await api.merchantGroup.storedValueOptions()).data,
  });

  const records = rulesQuery.data?.records || [];
  const storedValueGroupOptions = (storedValueGroupsQuery.data || []) as SelectOptionRecord[];
  const storedValueGroupMap = useMemo(() => new Map(storedValueGroupOptions.map((item) => [Number(item.value), item.label])), [storedValueGroupOptions]);
  const enabledCount = useMemo(() => records.filter((item) => item.status === 'ENABLED').length, [records]);
  const platformFeeCount = useMemo(() => records.filter((item) => item.platformFeeType && item.platformFeeType !== 'NONE').length, [records]);
  const groupRuleCount = useMemo(() => records.filter((item) => item.balanceScopeType === 'STORE_GROUP' || item.merchantGroupId).length, [records]);

  const saveMutation = useMutation<unknown, Error, SettlementRuleRecord>({
    mutationFn: (values: SettlementRuleRecord) => {
      const payload = normalizePickerValues(values) as unknown as Record<string, unknown>;
      return editingRecord ? api.settlementRule.edit({ ...payload, id: editingRecord.id }) : api.settlementRule.add(payload);
    },
    onSuccess: async () => {
      message.success(editingRecord ? '清分规则已更新' : '清分规则已创建');
      setModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['settlementRules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.settlementRule.remove(id),
    onSuccess: async () => {
      message.success('清分规则已删除');
      await queryClient.invalidateQueries({ queryKey: ['settlementRules'] });
    },
  });

  const openCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      ruleType: 'RECHARGE_BALANCE',
      settlementMode: 'STORE_CLEARING',
      revenueOwnerType: 'SERVICE_STORE',
      giftCostBearerType: 'SOURCE_STORE',
      priority: 100,
      platformFeeType: 'NONE',
      platformFeeRate: 0,
      platformFeeFixedAmount: 0,
      minPlatformFee: 0,
      maxPlatformFee: 0,
      platformFeeBearerType: 'SERVICE_STORE',
      settlementCycle: 'T_PLUS_1',
      settlementDelayDays: 1,
      refundFreezeDays: 0,
      minSettlementAmount: 0,
      autoSettlement: 'N',
      nettingEnabled: 'Y',
      refundRule: 'UNSETTLED_DEDUCT',
      serviceFeeRefundRule: 'UNSETTLED_DEDUCT',
      principalRestoreRule: 'RESTORE_ORIGINAL_LOT',
      giftRestoreRule: 'RESTORE_ORIGINAL_LOT',
      versionNo: 'V1',
      status: 'DISABLED',
    } as SettlementRuleRecord);
    setModalOpen(true);
  };

  const openEdit = (record: SettlementRuleRecord) => {
    setEditingRecord(record);
    form.resetFields();
    form.setFieldsValue(normalizePickerInitialValues(record));
    setModalOpen(true);
  };

  const handleResetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setStatusFilter(undefined);
    setRuleTypeFilter(undefined);
  };

  const columns: ProColumns<SettlementRuleRecord>[] = [
    {
      title: '规则',
      dataIndex: 'ruleCode',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <div className="settlement-rule-table__name">
          <strong>{record.ruleName}</strong>
          <span>{record.ruleCode}{record.versionNo ? ` · ${record.versionNo}` : ''}</span>
        </div>
      ),
    },
    {
      title: '类型 / 模式',
      dataIndex: 'ruleType',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          {renderEnumTag(ruleTypeMap, record.ruleType)}
          <span className="settlement-rule-table__muted">{enumText(modeMap, record.settlementMode)}</span>
        </Space>
      ),
    },
    {
      title: '适用范围',
      dataIndex: 'balanceScopeType',
      width: 220,
      render: (_, record) => formatScopeText(record, storedValueGroupMap),
    },
    {
      title: '归属口径',
      dataIndex: 'revenueOwnerType',
      width: 260,
      render: (_, record) => {
        const lines = [
          ownerLine('收入', record.revenueOwnerType, record.revenueOwnerUnitId),
          ownerLine('本金', record.principalCostBearerType, record.principalCostBearerUnitId),
          ownerLine('赠送', record.giftCostBearerType, record.giftCostBearerUnitId),
        ].filter(Boolean);

        return lines.length ? (
          <div className="settlement-rule-table__stack">
            {lines.map((line) => <span key={line}>{line}</span>)}
          </div>
        ) : '-';
      },
    },
    {
      title: '平台费',
      dataIndex: 'platformFeeType',
      width: 170,
      render: (_, record) => formatPlatformFee(record),
    },
    {
      title: '周期 / 退款',
      dataIndex: 'settlementCycle',
      width: 220,
      render: (_, record) => (
        <div className="settlement-rule-table__stack">
          <span>{enumText(cycleMap, record.settlementCycle)}{record.settlementDelayDays ? ` · 延迟${record.settlementDelayDays}天` : ''}</span>
          <span>{enumText(refundMap, record.refundRule)}</span>
        </div>
      ),
    },
    { title: '优先级', dataIndex: 'priority', width: 80, sorter: (a, b) => (a.priority || 0) - (b.priority || 0), render: (_, record) => record.priority ?? '-' },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, record) => renderEnumTag(statusMap, record.status) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => [
        <Button key="detail" type="link" icon={<EyeOutlined />} onClick={() => setDetailRecord(record)}>详情</Button>,
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>,
        <Button
          key="delete"
          type="link"
          danger
          disabled={record.status === 'ENABLED'}
          icon={<DeleteOutlined />}
          onClick={() => showBusinessConfirm({
            title: '删除清分规则',
            content: `确认删除 ${record.ruleName}？启用中的规则禁止删除。`,
            onOk: () => deleteMutation.mutate(record.id),
          })}
        >删除</Button>,
      ],
    },
  ];

  return (
    <div className="settlement-rule-page">
      <PageBanner
        title="清分规则中心"
        subtitle="统一维护门店统一钱包的余额范围、收入归属、平台服务费、结算周期与退款冲正规则。"
        icon={<CalculatorOutlined />}
      />

      <div className="settlement-rule-page__actions">
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增清分规则</Button>
      </div>

      <Row gutter={[16, 16]} className="settlement-rule-stats">
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="规则总数" value={records.length} suffix="条" prefix={<AccountBookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="启用规则" value={enabledCount} suffix="条" prefix={<SafetyOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="门店组范围" value={groupRuleCount} suffix="条" prefix={<ApartmentOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="收取平台费" value={platformFeeCount} suffix="条" prefix={<WalletOutlined />} />
          </Card>
        </Col>
      </Row>

      <div className="settlement-rule-filter">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索规则编码、名称"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
          onPressEnter={() => setKeyword(draftKeyword.trim())}
        />
        <Select allowClear placeholder="规则类型" options={ruleTypeOptions} value={ruleTypeFilter} onChange={setRuleTypeFilter} />
        <Select allowClear placeholder="状态" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <Space className="settlement-rule-filter__actions">
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setKeyword(draftKeyword.trim())}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>重置</Button>
        </Space>
      </div>

      <ProTable<SettlementRuleRecord>
        cardBordered
        rowKey="id"
        loading={rulesQuery.isLoading}
        search={false}
        scroll={{ x: 1640 }}
        dataSource={records}
        columns={columns}
        headerTitle="规则列表"
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增规则</Button>,
        ]}
        pagination={{ pageSize: 10 }}
      />

      <BusinessEditorModal
        open={modalOpen}
        width={1080}
        title={editingRecord ? '编辑清分规则' : '新增清分规则'}
        eyebrow="规则配置"
        subtitle="按新规格结构化维护匹配条件、归属口径、平台服务费、周期与退款规则。"
        confirmLoading={saveMutation.isPending}
        onCancel={() => { setModalOpen(false); setEditingRecord(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form" onFinish={(values) => saveMutation.mutate(values as SettlementRuleRecord)}>
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SafetyOutlined />} title="基础信息" desc="先确定规则身份、适用业务和版本优先级。">
              <div className="merchant-editor-fields">
                <Form.Item name="ruleCode" label="规则编码"><Input readOnly placeholder="保存后由系统自动生成" /></Form.Item>
                <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}><Input placeholder="规则展示名称" /></Form.Item>
                <Form.Item name="ruleType" label="规则类型" rules={[{ required: true, message: '请选择规则类型' }]}><Select options={ruleTypeOptions} /></Form.Item>
                <Form.Item name="settlementMode" label="清分模式" rules={[{ required: true, message: '请选择清分模式' }]}><Select options={settlementModeOptions} /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} /></Form.Item>
                <Form.Item name="versionNo" label="版本号"><Input placeholder="V1" /></Form.Item>
                <Form.Item name="priority" label="优先级"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="effectiveFrom" label="生效时间"><DateTimeField /></Form.Item>
                <Form.Item name="effectiveTo" label="失效时间"><DateTimeField /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<ApartmentOutlined />} title="匹配条件" desc="限定余额批次、储值通用组、发行主体和消费场景。">
              <div className="merchant-editor-fields">
                <Form.Item name="balanceScopeType" label="余额范围"><Select allowClear options={scopeTypeOptions} placeholder="请选择余额范围" /></Form.Item>
                <Form.Item name="merchantGroupId" label="储值通用组">
                  <Select allowClear showSearch optionFilterProp="label" options={storedValueGroupOptions} placeholder="选择后按储值通用范围匹配" />
                </Form.Item>
                <Form.Item name="activityId" label="活动ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="crossMerchantFlag" label="是否跨商户"><Select allowClear options={flagOptions} placeholder="请选择" /></Form.Item>
                <Form.Item name="issuerType" label="发行主体类型"><Select allowClear options={ownerTypeOptions} placeholder="请选择发行主体" /></Form.Item>
                <Form.Item name="issuerId" label="发行主体ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="sourceMerchantId" label="来源商户ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="sourceStoreId" label="来源门店ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="serviceMerchantId" label="消费商户ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="serviceStoreId" label="消费门店ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<CalculatorOutlined />} title="归属与费用" desc="明确收入归谁、本金和赠送成本谁承担，以及平台服务费怎么算。">
              <div className="merchant-editor-fields">
                <Form.Item name="revenueOwnerType" label="收入归属" rules={[{ required: true, message: '请选择收入归属' }]}><Select options={ownerTypeOptions} /></Form.Item>
                <Form.Item name="revenueOwnerUnitType" label="收入结算单元类型"><Select allowClear options={ownerTypeOptions} /></Form.Item>
                <Form.Item name="revenueOwnerUnitId" label="收入结算单元ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="principalCostBearerType" label="本金责任承担"><Select allowClear options={ownerTypeOptions} /></Form.Item>
                <Form.Item name="principalCostBearerUnitId" label="本金责任单元ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="giftCostBearerType" label="赠送成本承担"><Select allowClear options={ownerTypeOptions} /></Form.Item>
                <Form.Item name="giftCostBearerUnitId" label="赠送成本单元ID"><InputNumber style={{ width: '100%' }} min={0} precision={0} /></Form.Item>
                <Form.Item name="platformFeeType" label="平台费类型"><Select options={feeTypeOptions} /></Form.Item>
                <Form.Item name="platformFeeRate" label="平台费率"><InputNumber style={{ width: '100%' }} min={0} precision={4} addonAfter="%" /></Form.Item>
                <Form.Item name="platformFeeFixedAmount" label="固定平台费"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元" /></Form.Item>
                <Form.Item name="platformFeeBase" label="平台费基数"><Select allowClear options={feeBaseOptions} /></Form.Item>
                <Form.Item name="minPlatformFee" label="最低平台费"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元" /></Form.Item>
                <Form.Item name="maxPlatformFee" label="最高平台费"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元" /></Form.Item>
                <Form.Item name="platformFeeBearerType" label="平台费承担方"><Select allowClear options={ownerTypeOptions} /></Form.Item>
              </div>
              <Form.Item className="merchant-editor-field-span-all" name="giftCostShareRule" label="赠送成本多方分摊规则"><TextArea rows={2} placeholder="JSON 或规则说明" /></Form.Item>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<ClockCircleOutlined />} title="结算与退款" desc="控制结算生成、轧差、退款冲正、服务费冲减和余额恢复策略。">
              <div className="merchant-editor-fields">
                <Form.Item name="settlementCycle" label="结算周期"><Select options={settlementCycleOptions} /></Form.Item>
                <Form.Item name="settlementDelayDays" label="延迟天数"><InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="天" /></Form.Item>
                <Form.Item name="refundFreezeDays" label="退款冻结天数"><InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="天" /></Form.Item>
                <Form.Item name="minSettlementAmount" label="最低结算金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元" /></Form.Item>
                <Form.Item name="autoSettlement" label="自动结算"><Select options={flagOptions} /></Form.Item>
                <Form.Item name="nettingEnabled" label="净额轧差"><Select options={flagOptions} /></Form.Item>
                <Form.Item name="refundRule" label="退款冲正规则"><Select options={refundRuleOptions} /></Form.Item>
                <Form.Item name="serviceFeeRefundRule" label="服务费退款规则"><Select options={refundRuleOptions} /></Form.Item>
                <Form.Item name="principalRestoreRule" label="本金恢复规则"><Select options={restoreRuleOptions} /></Form.Item>
                <Form.Item name="giftRestoreRule" label="赠送恢复规则"><Select options={restoreRuleOptions} /></Form.Item>
              </div>
              <Form.Item className="merchant-editor-field-span-all" name="ruleSnapshot" label="规则快照/备注"><TextArea rows={3} placeholder="系统同步或人工备注的规则摘要" /></Form.Item>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal
        open={Boolean(detailRecord)}
        title={detailRecord?.ruleName || '清分规则详情'}
        eyebrow="清分规则审计"
        subtitle="查看规则匹配条件、归属口径、费用、周期与退款冲正策略。"
        width={1060}
        onCancel={() => setDetailRecord(null)}
      >
        {detailRecord ? (
          <>
            <SchemaDetail record={detailRecord} fields={ruleFields} column={2} labelWidth={150} />
            {detailRecord.ruleSnapshot ? <Typography.Paragraph copyable style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{detailRecord.ruleSnapshot}</Typography.Paragraph> : null}
          </>
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default SettlementRuleManagement;
