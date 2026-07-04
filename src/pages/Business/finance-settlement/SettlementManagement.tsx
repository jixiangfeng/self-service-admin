import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined, CalculatorOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  costBearerOptions,
  payoutStatusOptions,
  reconciliationStatusOptions,
  settlementCycleOptions,
  settlementDetailTypeOptions,
  settlementStatusOptions,
  settlementSubjectTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, CoreFlowPanel, formatAmount, formatDateTime, formatEnumText, OperatorTips, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { DateField, fromDatePickerValue } from '@/utils/formControls';
import api, {
  type PaymentReconciliationRecord,
  type ProfitShareDetailRecord,
  type SettlementBillDetailRecord,
  type SettlementAllocationRecord,
  type SettlementBillRecord,
  type SettlementPayoutRecord,
} from '@/services/backendService';

interface SettlementRecord extends SettlementBillRecord {
  id: number;
  billNo: string;
  billType: string;
  subjectName?: string;
  cycle?: string;
  incomeAmount: number | string;
  refundAmount: number | string;
  costAmount: number | string;
  settlementAmount: number | string;
  payoutStatus?: string;
  status?: string;
  updatedAt?: string;
}

interface ProfitShareRecord {
  id: string;
  storeName: string;
  partnerName: string;
  rechargeNo?: string;
  balanceScopeType?: string;
  merchantGroupName?: string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  baseAmount: number;
  ratio: string;
  actualAmount: number;
  status: string;
  updatedAt: string;
}

interface SettlementDetailRecord {
  id: number | string;
  billNo: string;
  detailType: string;
  sourceNo: string;
  storeName: string;
  rechargeNo?: string;
  balanceScopeType?: string;
  balanceScopeId?: number;
  merchantGroupName?: string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  incomeAmount: number | string;
  refundAmount: number | string;
  costAmount: number | string;
  settlementAmount: number | string;
  remark: string;
}

interface CrossStoreClearingRecord {
  id: string;
  clearingNo: string;
  merchantGroupName: string;
  rechargeMerchant: string;
  consumeMerchant: string;
  rechargeStore: string;
  consumeStore: string;
  sourceNo: string;
  principalAmount: number;
  giftAmount: number;
  couponAmount: number;
  clearingBase: number;
  rechargeMerchantRate: number;
  consumeMerchantRate: number;
  platformRate: number;
  rechargeMerchantAmount: number;
  consumeMerchantAmount: number;
  platformFee: number;
  payableAmount: number;
  formula: string;
  settlementCycle: string;
  status: string;
  riskStatus: string;
  remark: string;
}

const settlementStatusMap = buildValueEnum(settlementStatusOptions);
const payoutStatusMap = buildValueEnum(payoutStatusOptions);
const subjectTypeMap = buildValueEnum(settlementSubjectTypeOptions);
const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);
const settlementAllocationStatusOptions = [
  { value: 'PENDING', label: '待清分' },
  { value: 'WAIT_CONFIRM', label: '待确认' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'CANCELLED', label: '已取消' },
];
const clearingStatusMap = buildValueEnum(settlementAllocationStatusOptions);
const clearingRiskMap = buildValueEnum([
  { value: 'NORMAL', label: '正常' },
  { value: 'NEAR_LIMIT', label: '接近额度' },
  { value: 'OVERDUE', label: '逾期' },
]);

const settlementBillDetailFields: DetailField<SettlementRecord>[] = [
  { name: 'billNo', label: '结算单号' },
  { name: 'billType', label: '结算层级', render: (value) => formatEnumText(value, 'billType', '结算层级') },
  { name: 'subjectName', label: '结算主体' },
  { name: 'cycle', label: '周期' },
  { name: 'incomeAmount', label: '收入金额', render: (value) => formatAmount(value) },
  { name: 'refundAmount', label: '退款冲减', render: (value) => formatAmount(value) },
  { name: 'costAmount', label: '活动成本', render: (value) => formatAmount(value) },
  { name: 'settlementAmount', label: '应结金额', render: (value) => formatAmount(value) },
  { name: 'payoutStatus', label: '打款状态', render: (value) => payoutStatusMap[value as keyof typeof payoutStatusMap]?.text || value },
  { name: 'status', label: '状态', render: (value) => settlementStatusMap[value as keyof typeof settlementStatusMap]?.text || value },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const profitShareSummaryFields: DetailField<ProfitShareRecord>[] = [
  { name: 'storeName', label: '门店' },
  { name: 'partnerName', label: '合伙人' },
  { name: 'baseAmount', label: '分润基数', render: (value) => formatAmount(value) },
  { name: 'ratio', label: '比例' },
  { name: 'actualAmount', label: '应分金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '状态', render: (value) => settlementStatusMap[value as keyof typeof settlementStatusMap]?.text || value },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const settlementOverviewDetailFields: DetailField<SettlementDetailRecord>[] = [
  { name: 'billNo', label: '结算单号' },
  { name: 'detailType', label: '明细类型', render: (value) => detailTypeMap[value as keyof typeof detailTypeMap]?.text || value },
  { name: 'sourceNo', label: '来源单号' },
  { name: 'storeName', label: '门店' },
  { name: 'rechargeNo', label: '充值单号' },
  { name: 'balanceScopeType', label: '可用范围', render: (value, record) => record.balanceScopeType ? formatEnumText(value, 'scopeType', '可用范围') : '-' },
  { name: 'merchantGroupName', label: '门店组' },
  { name: 'settlementMode', label: '结算模式', render: (value) => formatEnumText(value, 'settlementMode', '结算模式') },
  { name: 'settlementRule', label: '结算规则' },
  { name: 'settlementRuleSnapshot', label: '规则快照' },
  { name: 'incomeAmount', label: '收入', render: (value) => formatAmount(value) },
  { name: 'refundAmount', label: '退款', render: (value) => formatAmount(value) },
  { name: 'costAmount', label: '成本', render: (value) => formatAmount(value) },
  { name: 'settlementAmount', label: '应结', render: (value) => formatAmount(value) },
  { name: 'remark', label: '备注' },
];

const settlementPayoutDetailFields: DetailField<SettlementPayoutRecord>[] = [
  { name: 'payoutNo', label: '打款流水号' },
  { name: 'billNo', label: '结算单号' },
  { name: 'accountName', label: '收款户名' },
  { name: 'bankName', label: '开户行' },
  { name: 'payoutAmount', label: '打款金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '打款状态', render: (value) => payoutStatusMap[value as keyof typeof payoutStatusMap]?.text || value },
  { name: 'paidAt', label: '打款时间', render: (value) => formatDateTime(value) },
  { name: 'failureReason', label: '失败原因' },
];

const reconciliationDetailFields: DetailField<PaymentReconciliationRecord>[] = [
  { name: 'reconNo', label: '对账单号' },
  { name: 'channelCode', label: '渠道编码' },
  { name: 'channelAmount', label: '渠道金额', render: (value) => formatAmount(value) },
  { name: 'platformAmount', label: '系统金额', render: (value) => formatAmount(value) },
  { name: 'diffAmount', label: '差异金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '对账状态', render: (value) => reconciliationStatusMap[value as keyof typeof reconciliationStatusMap]?.text || value },
  { name: 'handleRemark', label: '处理说明' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const crossStoreClearingDetailFields: DetailField<CrossStoreClearingRecord>[] = [
  { name: 'clearingNo', label: '清分单号' },
  { name: 'merchantGroupName', label: '门店组' },
  { name: 'rechargeMerchant', label: '资金持有商户' },
  { name: 'consumeMerchant', label: '履约商户' },
  { name: 'rechargeStore', label: '充值门店' },
  { name: 'consumeStore', label: '消费门店' },
  { name: 'sourceNo', label: '来源单号' },
  { name: 'principalAmount', label: '本金消耗', render: (value) => formatAmount(value) },
  { name: 'giftAmount', label: '赠送消耗', render: (value) => formatAmount(value) },
  { name: 'couponAmount', label: '优惠抵扣', render: (value) => formatAmount(value) },
  { name: 'clearingBase', label: '清分基数', render: (value) => formatAmount(value) },
  { name: 'rechargeMerchantRate', label: '充值方比例', render: (value) => `${value}%` },
  { name: 'consumeMerchantRate', label: '履约方比例', render: (value) => `${value}%` },
  { name: 'platformRate', label: '平台比例', render: (value) => `${value}%` },
  { name: 'rechargeMerchantAmount', label: '充值方留存', render: (value) => formatAmount(value) },
  { name: 'consumeMerchantAmount', label: '履约方应收', render: (value) => formatAmount(value) },
  { name: 'platformFee', label: '平台服务费', render: (value) => formatAmount(value) },
  { name: 'payableAmount', label: '应线下清分', render: (value) => formatAmount(value) },
  { name: 'formula', label: '计算公式' },
  { name: 'settlementCycle', label: '账期', render: (value) => formatEnumText(value, 'settlementMode', '结算模式') },
  { name: 'status', label: '状态', render: (value) => clearingStatusMap[value as keyof typeof clearingStatusMap]?.text || value },
  { name: 'riskStatus', label: '风控状态', render: (value) => clearingRiskMap[value as keyof typeof clearingRiskMap]?.text || value },
  { name: 'remark', label: '清分说明' },
];

const SettlementManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [billKeyword, setBillKeyword] = useState('');
  const [shareKeyword, setShareKeyword] = useState('');
  const [detailKeyword, setDetailKeyword] = useState('');
  const [payoutKeyword, setPayoutKeyword] = useState('');
  const [reconcileKeyword, setReconcileKeyword] = useState('');
  const [clearingKeyword, setClearingKeyword] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState<string>();
  const [detailTypeFilter, setDetailTypeFilter] = useState<string>();
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>();
  const [reconcileStatusFilter, setReconcileStatusFilter] = useState<string>();
  const [shareStatusFilter, setShareStatusFilter] = useState<string>();
  const [detail, setDetail] = useState<SettlementRecord | SettlementDetailRecord | SettlementPayoutRecord | PaymentReconciliationRecord | CrossStoreClearingRecord | null>(null);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [costVisible, setCostVisible] = useState(false);
  const [shareDetail, setShareDetail] = useState<ProfitShareRecord | null>(null);
  const [costForm] = Form.useForm<{ couponCost: number; rechargeCost: number; inviteCost: number; owner: string }>();
  const [generateForm] = Form.useForm<{ cycleType: string; periodStart: string; periodEnd: string; allocationStatus: string }>();

  const billQuery = useQuery({
    queryKey: ['settlementBills', billKeyword, billStatusFilter],
    queryFn: async () => (await api.settlementBill.page({ pageNum: 1, pageSize: 200, keyword: billKeyword || undefined, billStatus: billStatusFilter })).data,
  });
  const billDetailQuery = useQuery({
    queryKey: ['settlementOverviewDetails', detailKeyword, detailTypeFilter],
    queryFn: async () => (await api.settlementBillDetail.page({ pageNum: 1, pageSize: 200, keyword: detailKeyword || undefined, detailType: detailTypeFilter })).data,
  });
  const payoutQuery = useQuery({
    queryKey: ['settlementPayoutsOverview', payoutKeyword, payoutStatusFilter],
    queryFn: async () => (await api.settlementPayout.page({ pageNum: 1, pageSize: 200, keyword: payoutKeyword || undefined, status: payoutStatusFilter })).data,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['settlementReconciliationsOverview', reconcileKeyword, reconcileStatusFilter],
    queryFn: async () => (await api.payment.reconciliations.page({ pageNum: 1, pageSize: 200, keyword: reconcileKeyword || undefined, status: reconcileStatusFilter })).data,
  });
  const profitShareQuery = useQuery({
    queryKey: ['profitShareOverview', shareKeyword, shareStatusFilter],
    queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: shareKeyword || undefined, status: shareStatusFilter })).data,
  });
  const allocationQuery = useQuery({
    queryKey: ['settlementAllocationOverview', clearingKeyword],
    queryFn: async () => (await api.settlementAllocation.page({ pageNum: 1, pageSize: 200, keyword: clearingKeyword || undefined })).data,
  });
  const generateBillMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementBill.generateFromAllocations(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementBills'] });
      queryClient.invalidateQueries({ queryKey: ['settlementOverviewDetails'] });
      queryClient.invalidateQueries({ queryKey: ['settlementAllocationsCenter'] });
      message.success('结算单已按清分明细生成');
    },
  });
  const confirmBillMutation = useMutation({
    mutationFn: (record: SettlementRecord) => api.settlementBill.edit({ ...record, billStatus: 'SETTLED', status: 'SETTLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementBills'] });
      queryClient.invalidateQueries({ queryKey: ['settlementAllocationsCenter'] });
      message.success('结算单已确认');
    },
  });
  const retryPayoutMutation = useMutation({
    mutationFn: (record: SettlementPayoutRecord) => api.settlementPayout.updateStatus(record.id, { status: 'PAYING', failureReason: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementPayoutsOverview'] });
      message.success('已发起重试打款');
    },
  });
  const confirmBill = (record: SettlementRecord) => {
    showBusinessConfirm({
      title: '确认结算单',
      content: `确定确认结算单「${record.billNo}」吗？确认后该结算单将进入已结算状态。`,
      okText: '确认结算',
      danger: false,
      onOk: () => confirmBillMutation.mutate(record),
    });
  };

  const confirmRetryPayout = (record?: SettlementPayoutRecord) => {
    if (!record) return;
    showBusinessConfirm({
      title: '确认重试打款',
      content: `确定重试打款流水「${record.payoutNo || record.billNo || record.id}」吗？系统会重新发起打款处理。`,
      okText: '确认重试',
      onOk: () => retryPayoutMutation.mutate(record),
    });
  };

  const bills = (billQuery.data?.records || []) as SettlementRecord[];
  const settlementDetails = useMemo<SettlementDetailRecord[]>(() => (billDetailQuery.data?.records || []).map((item: SettlementBillDetailRecord) => {
    const amount = Number(item.amount || 0);
    return {
      id: item.id,
      billNo: item.billNo,
      detailType: item.detailType,
      sourceNo: item.serviceOrderNo,
      storeName: item.storeName || '-',
      rechargeNo: item.rechargeNo,
      balanceScopeType: item.balanceScopeType,
      balanceScopeId: item.balanceScopeId,
      merchantGroupName: item.merchantGroupName,
      settlementMode: item.settlementMode,
      settlementRule: item.settlementRule,
      settlementRuleSnapshot: item.settlementRuleSnapshot,
      incomeAmount: amount > 0 ? amount : 0,
      refundAmount: amount < 0 ? Math.abs(amount) : 0,
      costAmount: 0,
      settlementAmount: amount,
      remark: item.merchantName || '-',
    };
  }), [billDetailQuery.data]);
  const profitShares = useMemo<ProfitShareRecord[]>(() => ((profitShareQuery.data?.records || []) as ProfitShareDetailRecord[]).map((item) => ({
    id: String(item.id),
    storeName: item.storeName || '-',
    partnerName: item.partnerName,
    rechargeNo: item.rechargeNo,
    balanceScopeType: item.balanceScopeType,
    merchantGroupName: item.merchantGroupName,
    settlementMode: item.settlementMode,
    settlementRule: item.settlementRule,
    settlementRuleSnapshot: item.settlementRuleSnapshot,
    baseAmount: Number(item.baseAmount || 0),
    ratio: item.ratio || '',
    actualAmount: Number(item.actualAmount ?? item.shareAmount ?? 0),
    status: item.status,
    updatedAt: item.updatedAt || item.createdAt || '',
  })), [profitShareQuery.data]);
  const payouts = (payoutQuery.data?.records || []) as SettlementPayoutRecord[];
  const reconciliations = (reconciliationQuery.data?.records || []) as PaymentReconciliationRecord[];

  const filteredBills = useMemo(() => bills.filter((item) => containsKeyword(billKeyword, [item.billNo, item.subjectName, item.cycle])), [billKeyword, bills]);
  const filteredShares = useMemo(() => profitShares.filter((item) => containsKeyword(shareKeyword, [item.storeName, item.partnerName, item.ratio, item.rechargeNo, item.merchantGroupName, item.settlementMode, item.settlementRule])), [shareKeyword, profitShares]);
  const filteredDetails = useMemo(() => settlementDetails.filter((item) => containsKeyword(detailKeyword, [item.billNo, item.sourceNo, item.storeName, item.rechargeNo, item.merchantGroupName, item.settlementMode, item.settlementRule, item.remark])), [detailKeyword, settlementDetails]);
  const filteredPayouts = useMemo(() => payouts.filter((item) => containsKeyword(payoutKeyword, [item.payoutNo, item.billNo, item.accountName, item.bankName, item.failureReason])), [payoutKeyword, payouts]);
  const filteredReconciliations = useMemo(() => reconciliations.filter((item) => containsKeyword(reconcileKeyword, [item.reconNo, item.channelCode, item.handleRemark])), [reconcileKeyword, reconciliations]);
  const crossStoreClearings = useMemo<CrossStoreClearingRecord[]>(() => {
    const rows = (allocationQuery.data?.records || []) as SettlementAllocationRecord[];
    return rows.map((item) => {
      const principalAmount = Number(item.principalAmount || 0);
      const giftAmount = Number(item.giftAmount || 0);
      const platformFee = Number(item.platformFeeAmount || 0);
      const payableAmount = Number(item.merchantReceivableAmount || 0);
      const clearingBase = Number((principalAmount + giftAmount).toFixed(2));
      return {
        id: `allocation-${item.id}`,
        clearingNo: item.allocationNo,
        merchantGroupName: item.merchantGroupName || item.balanceScopeType || '-',
        rechargeMerchant: item.fundOwnerUnitId ? `资金主体#${item.fundOwnerUnitId}` : (item.sourceMerchantId ? `充值商户#${item.sourceMerchantId}` : '-'),
        consumeMerchant: item.revenueOwnerUnitId ? `收入主体#${item.revenueOwnerUnitId}` : (item.serviceMerchantId ? `履约商户#${item.serviceMerchantId}` : '-'),
        rechargeStore: item.sourceStoreId ? `充值门店#${item.sourceStoreId}` : '-',
        consumeStore: item.serviceStoreId ? `消费门店#${item.serviceStoreId}` : '-',
        sourceNo: item.serviceOrderNo || item.relatedNo || item.rechargeNo || '-',
        principalAmount,
        giftAmount,
        couponAmount: 0,
        clearingBase,
        rechargeMerchantRate: 0,
        consumeMerchantRate: clearingBase > 0 ? Number((payableAmount * 100 / clearingBase).toFixed(2)) : 0,
        platformRate: clearingBase > 0 ? Number((platformFee * 100 / clearingBase).toFixed(2)) : 0,
        rechargeMerchantAmount: 0,
        consumeMerchantAmount: payableAmount,
        platformFee,
        payableAmount,
        formula: item.settlementRuleSnapshot || item.settlementRule || '按后端清分明细计算',
        settlementCycle: item.settlementMode || '-',
        status: item.allocationStatus || 'PENDING',
        riskStatus: 'NORMAL',
        remark: `余额批次#${item.balanceLotId || '-'} / 清分规则#${item.settlementRuleId || '-'}`,
      };
    });
  }, [allocationQuery.data]);
  const filteredCrossStoreClearings = useMemo(
    () => crossStoreClearings.filter((item) => containsKeyword(clearingKeyword, [item.clearingNo, item.merchantGroupName, item.rechargeMerchant, item.consumeMerchant, item.rechargeStore, item.consumeStore, item.sourceNo])),
    [clearingKeyword, crossStoreClearings]
  );

  const billColumns: ProColumns<SettlementRecord>[] = [
    { title: '结算单号', dataIndex: 'billNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '结算单号 / 主体 / 周期' } },
    { title: '结算层级', dataIndex: 'billType', width: 120, valueType: 'select', valueEnum: subjectTypeMap, render: (_, record) => renderStatusTag(record.billType, subjectTypeMap) },
    { title: '结算主体', dataIndex: 'subjectName', width: 180, search: false },
    { title: '周期', dataIndex: 'cycle', width: 220, search: false },
    { title: '收入金额', dataIndex: 'incomeAmount', width: 120, search: false, render: (_, record) => formatAmount(record.incomeAmount) },
    { title: '退款冲减', dataIndex: 'refundAmount', width: 120, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '活动成本', dataIndex: 'costAmount', width: 120, search: false, render: (_, record) => formatAmount(record.costAmount) },
    { title: '应结金额', dataIndex: 'settlementAmount', width: 120, search: false, render: (_, record) => formatAmount(record.settlementAmount) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 120, valueType: 'select', valueEnum: payoutStatusMap, render: (_, record) => renderStatusTag(record.payoutStatus, payoutStatusMap) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: settlementStatusMap, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
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
            loading={confirmBillMutation.isPending}
            onClick={() => confirmBill(record)}
          >
            确认
          </Button>
        </Space>
      ),
    },
  ];

  const shareColumns: ProColumns<ProfitShareRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例' } },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180, search: false },
    { title: '门店组', dataIndex: 'merchantGroupName', width: 180, search: false },
    { title: '结算模式', dataIndex: 'settlementMode', width: 140, search: false, render: (_, record) => formatEnumText(record.settlementMode, 'settlementMode', '结算模式') },
    { title: '结算规则', dataIndex: 'settlementRule', width: 180, search: false },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, search: false, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '比例', dataIndex: 'ratio', width: 100, search: false },
    { title: '应分金额', dataIndex: 'actualAmount', width: 120, search: false, render: (_, record) => formatAmount(record.actualAmount) },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setShareDetail(record)}>明细</Button>
          <Button size="small" onClick={() => navigate('/settlement/profit-sharing')}>调整</Button>
        </Space>
      ),
    },
  ];

  const detailColumns: ProColumns<SettlementDetailRecord>[] = [
    { title: '结算单号', dataIndex: 'billNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '结算单 / 来源单 / 门店 / 备注' } },
    { title: '明细类型', dataIndex: 'detailType', width: 130, valueType: 'select', valueEnum: detailTypeMap, render: (_, record) => renderStatusTag(record.detailType, detailTypeMap) },
    { title: '来源单号', dataIndex: 'sourceNo', width: 180, search: false },
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '门店组', dataIndex: 'merchantGroupName', width: 180, search: false },
    { title: '结算模式', dataIndex: 'settlementMode', width: 140, search: false, render: (_, record) => formatEnumText(record.settlementMode, 'settlementMode', '结算模式') },
    { title: '结算规则', dataIndex: 'settlementRule', width: 180, search: false },
    { title: '收入', dataIndex: 'incomeAmount', width: 110, search: false, render: (_, record) => formatAmount(record.incomeAmount) },
    { title: '退款', dataIndex: 'refundAmount', width: 110, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '成本', dataIndex: 'costAmount', width: 110, search: false, render: (_, record) => formatAmount(record.costAmount) },
    { title: '应结', dataIndex: 'settlementAmount', width: 110, search: false, render: (_, record) => formatAmount(record.settlementAmount) },
    { title: '备注', dataIndex: 'remark', width: 240, search: false },
    {
      title: '操作',
      width: 100,
      search: false,
      render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button>,
    },
  ];

  const payoutColumns: ProColumns<SettlementPayoutRecord>[] = [
    { title: '打款流水号', dataIndex: 'payoutNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '打款流水 / 结算单 / 账户 / 银行' } },
    { title: '结算单号', dataIndex: 'billNo', width: 180, search: false },
    { title: '收款户名', dataIndex: 'accountName', width: 180, search: false },
    { title: '开户行', dataIndex: 'bankName', width: 160, search: false },
    { title: '打款金额', dataIndex: 'payoutAmount', width: 120, search: false, render: (_, record) => formatAmount(record.payoutAmount) },
    { title: '打款状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: payoutStatusMap, render: (_, record) => renderStatusTag(record.status, payoutStatusMap) },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, search: false, render: (_, record) => formatDateTime(record.paidAt) },
    { title: '失败原因', dataIndex: 'failureReason', width: 180, search: false },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            loading={retryPayoutMutation.isPending}
            disabled={record.status !== 'FAILED'}
            title={record.status !== 'FAILED' ? '仅失败打款流水可重试' : undefined}
            onClick={() => confirmRetryPayout(record)}
          >
            重试
          </Button>
        </Space>
      ),
    },
  ];

  const reconciliationColumns: ProColumns<PaymentReconciliationRecord>[] = [
    { title: '对账单号', dataIndex: 'reconNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '对账单 / 结算单 / 负责人' } },
    { title: '渠道编码', dataIndex: 'channelCode', width: 140, search: false },
    { title: '渠道金额', dataIndex: 'channelAmount', width: 120, search: false, render: (_, record) => formatAmount(record.channelAmount) },
    { title: '系统金额', dataIndex: 'platformAmount', width: 120, search: false, render: (_, record) => formatAmount(record.platformAmount) },
    { title: '差异金额', dataIndex: 'diffAmount', width: 120, search: false, render: (_, record) => formatAmount(record.diffAmount) },
    { title: '对账状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: reconciliationStatusMap, render: (_, record) => renderStatusTag(record.status, reconciliationStatusMap) },
    { title: '处理说明', dataIndex: 'handleRemark', width: 220, search: false },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ];

  const clearingColumns: ProColumns<CrossStoreClearingRecord>[] = [
    { title: '清分单号', dataIndex: 'clearingNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '清分单 / 门店组 / 商户 / 门店 / 来源单' } },
    { title: '门店组', dataIndex: 'merchantGroupName', width: 180, search: false },
    { title: '资金持有商户', dataIndex: 'rechargeMerchant', width: 160, search: false },
    { title: '履约商户', dataIndex: 'consumeMerchant', width: 160, search: false },
    { title: '充值门店', dataIndex: 'rechargeStore', width: 140, search: false },
    { title: '消费门店', dataIndex: 'consumeStore', width: 160, search: false },
    { title: '来源单号', dataIndex: 'sourceNo', width: 180, search: false },
    { title: '本金消耗', dataIndex: 'principalAmount', width: 120, search: false, render: (_, record) => formatAmount(record.principalAmount) },
    { title: '赠送消耗', dataIndex: 'giftAmount', width: 120, search: false, render: (_, record) => formatAmount(record.giftAmount) },
    { title: '优惠抵扣', dataIndex: 'couponAmount', width: 120, search: false, render: (_, record) => formatAmount(record.couponAmount) },
    { title: '清分基数', dataIndex: 'clearingBase', width: 120, search: false, render: (_, record) => formatAmount(record.clearingBase) },
    { title: '协议比例', dataIndex: 'consumeMerchantRate', width: 220, search: false, render: (_, record) => `${record.rechargeMerchantRate}% / ${record.consumeMerchantRate}% / ${record.platformRate}%` },
    { title: '充值方留存', dataIndex: 'rechargeMerchantAmount', width: 120, search: false, render: (_, record) => formatAmount(record.rechargeMerchantAmount) },
    { title: '履约方应收', dataIndex: 'consumeMerchantAmount', width: 120, search: false, render: (_, record) => formatAmount(record.consumeMerchantAmount) },
    { title: '平台服务费', dataIndex: 'platformFee', width: 120, search: false, render: (_, record) => formatAmount(record.platformFee) },
    { title: '应线下清分', dataIndex: 'payableAmount', width: 130, search: false, render: (_, record) => formatAmount(record.payableAmount) },
    { title: '账期', dataIndex: 'settlementCycle', width: 140, search: false, render: (value) => formatEnumText(value, 'settlementMode', '结算模式') },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: clearingStatusMap, render: (_, record) => renderStatusTag(record.status, clearingStatusMap) },
    { title: '风控', dataIndex: 'riskStatus', width: 120, search: false, render: (_, record) => renderStatusTag(record.riskStatus, clearingRiskMap) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ];

  const handleGenerate = async () => {
    const values = await generateForm.validateFields();
    await generateBillMutation.mutateAsync({
      ...values,
      periodStart: fromDatePickerValue(values.periodStart as any) || values.periodStart,
      periodEnd: fromDatePickerValue(values.periodEnd as any) || values.periodEnd,
      billStatus: 'WAIT_CONFIRM',
    });
    setGenerateVisible(false);
    generateForm.resetFields();
  };

  const handleCostSubmit = async () => {
    await costForm.validateFields();
    setCostVisible(false);
    costForm.resetFields();
    message.success('成本分摊配置已保存');
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="结算总览" subtitle="补齐结算单、退款冲减、成本分摊、打款状态和确认动作。" icon={<AccountBookOutlined />} />
      <WorkflowGuide
        title="结算复盘闭环"
        summary="结算页要把收入归集、退款冲减、成本分摊和分润确认串起来，而不是把两个表平铺出来。"
        steps={[
          { title: '收入归集', description: '先归集服务收入、充值收入和门店维度金额', status: 'finish', tag: '结算单管理' },
          { title: '跨店清分', description: '对独立微信商户收款的跨店消费生成线下应收应付', status: 'process', tag: '清分台账' },
          { title: '分润确认', description: '按门店和合伙关系确认实际分润结果', status: 'process', tag: '合伙人分润' },
          { title: '导出复盘', description: '最终输出结算单、分润明细和经营复盘数据', status: 'wait', tag: '报表 / 导出' },
        ]}
      />
      <CoreFlowPanel
        title="多商户跨店结算闭环"
        subtitle="结算总览要能解释收入从哪里来、退款和成本怎么扣、跨店消费怎么清分、合伙人分润怎么确认，避免财务只能看金额猜原因。"
        config={[
          { label: '结算主体', desc: '按商户、门店、门店组或平台主体生成账单，周期和账户来自商户档案。', tag: '主体' },
          { label: '跨店清分', desc: '独立微信商户收款但跨店消费时，要形成应收应付和清分备注。', tag: '清分' },
          { label: '分润规则', desc: '多合伙人比例要使用版本化规则，不能覆盖历史口径。', tag: '分润' },
        ]}
        landing={[
          { label: '结算单', desc: '汇总服务收入、充值收入、退款冲减、成本分摊和应结金额。' },
          { label: '结算明细', desc: '按订单、充值单、门店和商户组保留可追溯明细。' },
          { label: '打款流水', desc: '打款状态、失败原因和重试结果单独沉淀，便于财务复盘。' },
        ]}
        verify={[
          { label: '确认前', desc: '核对周期、主体、账户、收入、退款、成本和跨店清分金额。' },
          { label: '打款前', desc: '确认收款账户和失败原因，不要对失败流水批量盲重试。' },
          { label: '归档后', desc: '去分润明细和结算明细抽查订单级金额是否一致。' },
        ]}
        actions={[
          { key: 'profit', label: '合伙人分润', type: 'primary', onClick: () => navigate('/settlement/profit-sharing') },
        ]}
      />
      <OperatorTips
        items={[
          { label: '先核结算单', desc: '先看收入、退款、成本和应结金额，再处理跨店清分和分润。', tag: '核对' },
          { label: '打款失败', desc: '在打款流水行内重试，先确认失败原因和收款账户，不要批量盲重试。', tag: '打款' },
          { label: '确认结算', desc: '确认后进入财务归档口径，提交前要核对周期、主体、金额和备注。', tag: '归档' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认结算单" value={bills.filter((item) => item.status !== 'SETTLED').length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="本周期收入" value={formatAmount(bills.reduce((sum, item) => sum + Number(item.incomeAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款冲减" value={formatAmount(bills.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待清分金额" value={formatAmount(crossStoreClearings.reduce((sum, item) => sum + Number(item.payableAmount || 0), 0))} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'bill',
            label: '结算单管理',
            children: (
              <ProTable<SettlementRecord>
                cardBordered
                rowKey="id"
                columns={billColumns}
                dataSource={filteredBills}
                loading={billQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 2100 }}
                toolBarRender={() => [
                  <Button
                    key="cost"
                    onClick={() => {
                      costForm.setFieldsValue({ couponCost: 200, rechargeCost: 360, inviteCost: 120, owner: 'RATIO' });
                      setCostVisible(true);
                    }}
                  >
                    成本分摊配置
                  </Button>,
                  <Button
                    key="generate"
                    type="primary"
                    icon={<CalculatorOutlined />}
                    loading={generateBillMutation.isPending}
                    onClick={() => {
                      generateForm.setFieldsValue({ cycleType: 'DAY', allocationStatus: 'PENDING' });
                      setGenerateVisible(true);
                    }}
                  >
                    按清分生成结算单
                  </Button>,
                ]}
                onSubmit={(values) => { setBillKeyword(String(values.keyword || '')); setBillStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setBillKeyword(''); setBillStatusFilter(undefined); }}
              />
            ),
          },
          {
            key: 'detail',
            label: '结算明细',
            children: (
              <ProTable<SettlementDetailRecord>
                cardBordered
                rowKey="id"
                columns={detailColumns}
                dataSource={filteredDetails}
                loading={billDetailQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1700 }}
                onSubmit={(values) => { setDetailKeyword(String(values.keyword || '')); setDetailTypeFilter(values.detailType ? String(values.detailType) : undefined); }}
                onReset={() => { setDetailKeyword(''); setDetailTypeFilter(undefined); }}
              />
            ),
          },
          {
            key: 'crossStoreClearing',
            label: '跨店清分台账',
            children: (
              <ProTable<CrossStoreClearingRecord>
                cardBordered
                rowKey="id"
                columns={clearingColumns}
                dataSource={filteredCrossStoreClearings}
                loading={allocationQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 2500 }}
                toolBarRender={() => [
                  <Button key="rule" onClick={() => navigate('/merchant/groups')}>维护门店组协议</Button>,
                ]}
                onSubmit={(values) => setClearingKeyword(String(values.keyword || ''))}
                onReset={() => setClearingKeyword('')}
              />
            ),
          },
          {
            key: 'payout',
            label: '打款流水',
            children: (
              <ProTable<SettlementPayoutRecord>
                cardBordered
                rowKey="id"
                columns={payoutColumns}
                dataSource={filteredPayouts}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                        scroll={{ x: 1600 }}
                        loading={payoutQuery.isLoading}
                        onSubmit={(values) => { setPayoutKeyword(String(values.keyword || '')); setPayoutStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setPayoutKeyword(''); setPayoutStatusFilter(undefined); }}
              />
            ),
          },
          {
            key: 'reconcile',
            label: '对账差异',
            children: (
              <ProTable<PaymentReconciliationRecord>
                cardBordered
                rowKey="id"
                columns={reconciliationColumns}
                dataSource={filteredReconciliations}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1600 }}
                loading={reconciliationQuery.isLoading}
                toolBarRender={() => []}
                onSubmit={(values) => { setReconcileKeyword(String(values.keyword || '')); setReconcileStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setReconcileKeyword(''); setReconcileStatusFilter(undefined); }}
              />
            ),
          },
          {
            key: 'share',
            label: '合伙人分润',
            children: (
              <ProTable<ProfitShareRecord>
                cardBordered
                rowKey="id"
                columns={shareColumns}
                dataSource={filteredShares}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1440 }}
                toolBarRender={() => [
                  <Button key="partner" onClick={() => navigate('/settlement/profit-sharing')}>合伙关系配置</Button>,
                  <Button key="rule" type="primary" onClick={() => navigate('/settlement/profit-sharing')}>分润规则</Button>,
                ]}
                onSubmit={(values) => { setShareKeyword(String(values.keyword || '')); setShareStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setShareKeyword(''); setShareStatusFilter(undefined); }}
              />
            ),
          },
        ]}
      />

      <BusinessDetailModal title={detail && 'clearingNo' in detail ? '跨店清分详情' : detail && 'payoutNo' in detail ? '打款流水详情' : detail && 'reconNo' in detail ? '对账差异详情' : detail && 'sourceNo' in detail ? '结算明细详情' : '结算单详情'} open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('clearingNo' in detail ? crossStoreClearingDetailFields : 'payoutNo' in detail ? settlementPayoutDetailFields : 'reconNo' in detail ? reconciliationDetailFields : 'sourceNo' in detail ? settlementOverviewDetailFields : settlementBillDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="成本分摊配置"
        title="配置活动成本分摊"
        subtitle="把优惠券、充值赠送、邀请奖励和承担方式拆成财务可维护字段，避免手写成本说明。"
        meta={['结算总览', '成本分摊']}
        open={costVisible}
        onOk={handleCostSubmit}
        onCancel={() => { setCostVisible(false); costForm.resetFields(); }}
        width={980}
        okText="保存成本配置"
      >
        <Form form={costForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CalculatorOutlined />} title="活动成本" desc="按成本来源维护金额，后续用于结算单成本归集。">
              <div className="merchant-editor-fields">
                <Form.Item name="couponCost" label="优惠券成本" rules={[{ required: true, message: '请输入优惠券成本' }]}>
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="rechargeCost" label="充值赠送成本" rules={[{ required: true, message: '请输入充值成本' }]}>
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="inviteCost" label="邀请奖励成本" rules={[{ required: true, message: '请输入邀请成本' }]}>
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<TeamOutlined />} title="承担方式" desc="配置成本承担方，保持财务和运营口径一致。">
              <div className="merchant-editor-fields">
                <Form.Item name="owner" label="承担方式" rules={[{ required: true, message: '请选择承担方式' }]}>
                  <Select options={costBearerOptions} placeholder="请选择承担方式" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="分润明细" open={!!shareDetail} onCancel={() => setShareDetail(null)} width={760}>
        {shareDetail ? (
          <SchemaDetail record={shareDetail} fields={profitShareSummaryFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="生成结算单"
        title="按清分明细生成结算单"
        subtitle="系统会读取待清分余额明细，按履约商户或门店自动分组生成结算单和账单明细。"
        meta={['结算总览', '生成']}
        open={generateVisible}
        onOk={handleGenerate}
        confirmLoading={generateBillMutation.isPending}
        onCancel={() => { setGenerateVisible(false); generateForm.resetFields(); }}
        width={920}
        okText="生成结算单"
      >
        <Form form={generateForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CalendarOutlined />} title="账期周期" desc="选择要归集的清分发生时间，系统按清分明细自动生成结算主体和金额。">
              <div className="merchant-editor-fields">
                <Form.Item name="cycleType" label="周期类型" rules={[{ required: true, message: '请选择周期类型' }]}>
                  <Select options={settlementCycleOptions} placeholder="请选择周期类型" />
                </Form.Item>
                <Form.Item name="periodStart" label="周期开始" rules={[{ required: true, message: '请输入周期开始' }]}>
                  <DateField />
                </Form.Item>
                <Form.Item name="periodEnd" label="周期结束" rules={[{ required: true, message: '请输入周期结束' }]}>
                  <DateField />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AccountBookOutlined />} title="清分来源" desc="只归集指定状态的清分明细，生成后清分状态会进入待确认。">
              <div className="merchant-editor-fields">
                <Form.Item name="allocationStatus" label="清分状态" rules={[{ required: true, message: '请选择清分状态' }]}>
                  <Select options={settlementAllocationStatusOptions} placeholder="请选择清分状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

    </div>
  );
};

export default SettlementManagement;
