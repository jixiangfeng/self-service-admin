import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Space, Tabs, message } from 'antd';
import {
  AccountBookOutlined,
  EyeOutlined,
  FileDoneOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  settlementCycleOptions,
  settlementDetailTypeOptions,
  settlementStatusOptions,
  settlementSubjectTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import {
  buildValueEnum,
  formatAmount,
  formatDateTime,
  renderStatusTag,
} from '@/pages/Business/shared';
import api, {
  type SettlementAllocationRecord,
  type SettlementBillDetailRecord,
  type SettlementBillRecord,
} from '@/services/backendService';

type SettlementTabKey = 'bill' | 'crossStoreClearing';

interface PageQuery {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

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
  pendingProfitDetailCount?: number;
  status?: string;
  updatedAt?: string;
}

interface ClearingPlanSnapshot {
  sourceShareRate?: number | string;
  serviceShareRate?: number | string;
  platformRate?: number | string;
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
  giftCostAmount: number;
  clearingBase: number;
  configuredRate: string;
  rechargeMerchantAmount: number;
  consumeMerchantAmount: number;
  platformFee: number;
  payableAmount: number;
  settlementRule: string;
  settlementRuleVersion: string;
  settlementCycle: string;
  status: string;
  remark: string;
}

const settlementStatusMap = buildValueEnum(settlementStatusOptions.map((option) => (
  option.value === 'WAIT_PAYOUT' ? { ...option, label: '待外部结算' } : option
)));
const subjectTypeMap = buildValueEnum(settlementSubjectTypeOptions);
const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const settlementCycleMap = buildValueEnum([
  ...settlementCycleOptions,
  { value: 'T_PLUS_1', label: '日结（T+1）' },
  { value: 'WEEKLY', label: '周结' },
  { value: 'MONTHLY', label: '月结' },
  { value: 'REALTIME', label: '实时' },
]);
const settlementAllocationStatusOptions = [
  { value: 'PENDING', label: '待清分' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'WAIT_PAYOUT', label: '待外部结算' },
  { value: 'SETTLED', label: '已结算' },
  { value: 'BLOCKED', label: '处理受阻' },
];
const clearingStatusMap = buildValueEnum(settlementAllocationStatusOptions);

const parseRate = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const configuredRateText = (snapshotText?: string) => {
  if (!snapshotText) return '-';
  try {
    const snapshot = JSON.parse(snapshotText) as ClearingPlanSnapshot;
    const sourceRate = parseRate(snapshot.sourceShareRate);
    const serviceRate = parseRate(snapshot.serviceShareRate);
    const platformRate = parseRate(snapshot.platformRate);
    if (sourceRate === undefined && serviceRate === undefined && platformRate === undefined) return '-';
    return `资金方 ${sourceRate ?? 0}% / 履约方 ${serviceRate ?? 0}% / 平台 ${platformRate ?? 0}%`;
  } catch {
    return '-';
  }
};

const settlementBillDetailFields: DetailField<SettlementRecord>[] = [
  { name: 'billNo', label: '结算单号' },
  { name: 'billType', label: '结算层级', render: (value) => subjectTypeMap[value as keyof typeof subjectTypeMap]?.text || value },
  { name: 'subjectName', label: '结算主体' },
  { name: 'cycle', label: '结算周期' },
  { name: 'incomeAmount', label: '收入金额', render: (value) => formatAmount(value) },
  { name: 'refundAmount', label: '退款冲减', render: (value) => formatAmount(value) },
  { name: 'costAmount', label: '赠送及活动成本', render: (value) => formatAmount(value) },
  { name: 'settlementAmount', label: '应结金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '结算状态', render: (value) => settlementStatusMap[value as keyof typeof settlementStatusMap]?.text || value },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const crossStoreClearingDetailFields: DetailField<CrossStoreClearingRecord>[] = [
  { name: 'clearingNo', label: '清分单号' },
  { name: 'merchantGroupName', label: '门店组' },
  { name: 'rechargeMerchant', label: '资金持有方' },
  { name: 'consumeMerchant', label: '履约收入方' },
  { name: 'rechargeStore', label: '充值门店' },
  { name: 'consumeStore', label: '消费门店' },
  { name: 'sourceNo', label: '来源单号' },
  { name: 'principalAmount', label: '本金消耗', render: (value) => formatAmount(value) },
  { name: 'giftAmount', label: '赠送消耗', render: (value) => formatAmount(value) },
  { name: 'giftCostAmount', label: '赠送成本', render: (value) => formatAmount(value) },
  { name: 'clearingBase', label: '清分基数', render: (value) => formatAmount(value) },
  { name: 'configuredRate', label: '方案比例' },
  { name: 'rechargeMerchantAmount', label: '资金方分成', render: (value) => formatAmount(value) },
  { name: 'consumeMerchantAmount', label: '履约方分成', render: (value) => formatAmount(value) },
  { name: 'platformFee', label: '平台服务费', render: (value) => formatAmount(value) },
  { name: 'payableAmount', label: '商户净应结', render: (value) => formatAmount(value) },
  { name: 'settlementRule', label: '结算方案' },
  { name: 'settlementRuleVersion', label: '方案版本' },
  { name: 'settlementCycle', label: '账期', render: (value) => settlementCycleMap[value as keyof typeof settlementCycleMap]?.text || value },
  { name: 'status', label: '清分状态', render: (value) => clearingStatusMap[value as keyof typeof clearingStatusMap]?.text || value },
  { name: 'remark', label: '关联信息' },
];

const mapCrossStoreClearing = (item: SettlementAllocationRecord): CrossStoreClearingRecord => ({
  id: `allocation-${item.id}`,
  clearingNo: item.allocationNo,
  merchantGroupName: item.merchantGroupName || item.balanceScopeType || '-',
  rechargeMerchant: item.fundOwnerUnitId
    ? `资金主体#${item.fundOwnerUnitId}`
    : item.sourceMerchantId ? `充值商户#${item.sourceMerchantId}` : '-',
  consumeMerchant: item.revenueOwnerUnitId
    ? `收入主体#${item.revenueOwnerUnitId}`
    : item.serviceMerchantId ? `履约商户#${item.serviceMerchantId}` : '-',
  rechargeStore: item.sourceStoreId ? `充值门店#${item.sourceStoreId}` : '-',
  consumeStore: item.serviceStoreId ? `消费门店#${item.serviceStoreId}` : '-',
  sourceNo: item.serviceOrderNo || item.relatedNo || item.rechargeNo || '-',
  principalAmount: Number(item.principalAmount || 0),
  giftAmount: Number(item.giftAmount || 0),
  giftCostAmount: Number(item.giftCostAmount || 0),
  clearingBase: Number(item.settlementBaseAmount || 0),
  configuredRate: configuredRateText(item.settlementRuleSnapshot),
  rechargeMerchantAmount: Number(item.sourceShareAmount || 0),
  consumeMerchantAmount: Number(item.serviceShareAmount || 0),
  platformFee: Number(item.platformFeeAmount || 0),
  payableAmount: Number(item.merchantReceivableAmount || 0),
  settlementRule: item.settlementRule || '-',
  settlementRuleVersion: item.settlementRuleVersion || '-',
  settlementCycle: item.settlementCycle || '-',
  status: item.allocationStatus || 'PENDING',
  remark: `余额批次#${item.balanceLotId || '-'} / 清分规则#${item.settlementRuleId || '-'}`,
});

const SettlementManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettlementTabKey>('bill');
  const [billQueryParams, setBillQueryParams] = useState<PageQuery>({ pageNum: 1, pageSize: 10 });
  const [clearingQueryParams, setClearingQueryParams] = useState<PageQuery>({ pageNum: 1, pageSize: 10 });
  const [billDetailPage, setBillDetailPage] = useState({ pageNum: 1, pageSize: 8 });
  const [selectedBill, setSelectedBill] = useState<SettlementRecord | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CrossStoreClearingRecord | null>(null);

  const billQuery = useQuery({
    queryKey: ['settlementBills', billQueryParams],
    queryFn: async () => (await api.settlementBill.page({
      pageNum: billQueryParams.pageNum,
      pageSize: billQueryParams.pageSize,
      keyword: billQueryParams.keyword,
      billStatus: billQueryParams.status,
    })).data,
    enabled: activeTab === 'bill',
  });
  const allocationQuery = useQuery({
    queryKey: ['settlementAllocationOverview', clearingQueryParams],
    queryFn: async () => (await api.settlementAllocation.page({
      pageNum: clearingQueryParams.pageNum,
      pageSize: clearingQueryParams.pageSize,
      keyword: clearingQueryParams.keyword,
      allocationStatus: clearingQueryParams.status,
    })).data,
    enabled: activeTab === 'crossStoreClearing',
  });
  const billDetailQuery = useQuery({
    queryKey: ['settlementBillDetails', selectedBill?.billNo, billDetailPage],
    queryFn: async () => (await api.settlementBillDetail.page({
      pageNum: billDetailPage.pageNum,
      pageSize: billDetailPage.pageSize,
      billNo: selectedBill?.billNo,
    })).data,
    enabled: !!selectedBill?.billNo,
  });

  const generateProfitConfirmMutation = useMutation({
    mutationFn: (billNo: string) => api.profitConfirm.generate({ settlementBillNo: billNo }),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profitConfirms'] }),
        queryClient.invalidateQueries({ queryKey: ['settlementBills'] }),
      ]);
      message.success(`已生成 ${response.data.generatedCount} 张分润确认单，合计 ${formatAmount(response.data.totalConfirmAmount)}`);
      navigate('/settlement/profit-sharing');
    },
  });

  const openBillDetail = (record: SettlementRecord) => {
    setBillDetailPage({ pageNum: 1, pageSize: 8 });
    setSelectedBill(record);
  };

  const bills = (billQuery.data?.records || []) as SettlementRecord[];
  const crossStoreClearings = ((allocationQuery.data?.records || []) as SettlementAllocationRecord[]).map(mapCrossStoreClearing);

  const billColumns: ProColumns<SettlementRecord>[] = [
    { title: '结算单号', dataIndex: 'billNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '结算单号' } },
    { title: '结算层级', dataIndex: 'billType', width: 110, search: false, render: (_, record) => renderStatusTag(record.billType, subjectTypeMap) },
    { title: '结算主体', dataIndex: 'subjectName', width: 180, search: false },
    { title: '周期', dataIndex: 'cycle', width: 210, search: false },
    { title: '收入金额', dataIndex: 'incomeAmount', width: 120, search: false, render: (_, record) => formatAmount(record.incomeAmount) },
    { title: '退款冲减', dataIndex: 'refundAmount', width: 120, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '成本', dataIndex: 'costAmount', width: 120, search: false, render: (_, record) => formatAmount(record.costAmount) },
    { title: '应结金额', dataIndex: 'settlementAmount', width: 120, search: false, render: (_, record) => formatAmount(record.settlementAmount) },
    { title: '结算状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: settlementStatusMap, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 260,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openBillDetail(record)}>详情</Button>
          {Number(record.pendingProfitDetailCount || 0) > 0 ? (
            <Button
              size="small"
              type="primary"
              icon={<FileDoneOutlined />}
              loading={generateProfitConfirmMutation.isPending}
              onClick={() => showBusinessConfirm({
                title: '生成分润确认单',
                content: `按结算单「${record.billNo}」的待处理分润明细生成确认单。`,
                okText: '确认生成',
                onOk: () => generateProfitConfirmMutation.mutate(record.billNo),
              })}
            >
              生成分润确认
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const billDetailColumns: ProColumns<SettlementBillDetailRecord>[] = [
    { title: '明细类型', dataIndex: 'detailType', width: 150, render: (_, record) => renderStatusTag(record.detailType, detailTypeMap) },
    { title: '来源单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 160 },
    { title: '本金', dataIndex: 'principalAmount', width: 110, render: (_, record) => formatAmount(record.principalAmount) },
    { title: '赠送', dataIndex: 'giftAmount', width: 110, render: (_, record) => formatAmount(record.giftAmount) },
    { title: '清分基数', dataIndex: 'settlementBaseAmount', width: 120, render: (_, record) => formatAmount(record.settlementBaseAmount) },
    { title: '入账金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '结算方案', dataIndex: 'settlementRule', width: 180 },
  ];

  const clearingColumns: ProColumns<CrossStoreClearingRecord>[] = [
    { title: '清分单号', dataIndex: 'clearingNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '清分单号 / 来源单号' } },
    { title: '门店组', dataIndex: 'merchantGroupName', width: 180, search: false },
    { title: '资金持有方', dataIndex: 'rechargeMerchant', width: 160, search: false },
    { title: '履约收入方', dataIndex: 'consumeMerchant', width: 160, search: false },
    { title: '充值门店', dataIndex: 'rechargeStore', width: 140, search: false },
    { title: '消费门店', dataIndex: 'consumeStore', width: 140, search: false },
    { title: '来源单号', dataIndex: 'sourceNo', width: 180, search: false },
    { title: '本金消耗', dataIndex: 'principalAmount', width: 120, search: false, render: (_, record) => formatAmount(record.principalAmount) },
    { title: '赠送消耗', dataIndex: 'giftAmount', width: 120, search: false, render: (_, record) => formatAmount(record.giftAmount) },
    { title: '赠送成本', dataIndex: 'giftCostAmount', width: 120, search: false, render: (_, record) => formatAmount(record.giftCostAmount) },
    { title: '清分基数', dataIndex: 'clearingBase', width: 120, search: false, render: (_, record) => formatAmount(record.clearingBase) },
    { title: '方案比例', dataIndex: 'configuredRate', width: 300, search: false },
    { title: '资金方分成', dataIndex: 'rechargeMerchantAmount', width: 120, search: false, render: (_, record) => formatAmount(record.rechargeMerchantAmount) },
    { title: '履约方分成', dataIndex: 'consumeMerchantAmount', width: 120, search: false, render: (_, record) => formatAmount(record.consumeMerchantAmount) },
    { title: '平台服务费', dataIndex: 'platformFee', width: 120, search: false, render: (_, record) => formatAmount(record.platformFee) },
    { title: '商户净应结', dataIndex: 'payableAmount', width: 130, search: false, render: (_, record) => formatAmount(record.payableAmount) },
    { title: '账期', dataIndex: 'settlementCycle', width: 120, search: false, render: (_, record) => settlementCycleMap[record.settlementCycle as keyof typeof settlementCycleMap]?.text || record.settlementCycle },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: clearingStatusMap, render: (_, record) => renderStatusTag(record.status, clearingStatusMap) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedDetail(record)}>详情</Button> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="结算中心"
        subtitle="查看自动结算结果和跨店清分记录。"
        icon={<AccountBookOutlined />}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as SettlementTabKey)}
        items={[
          {
            key: 'bill',
            label: '结算单',
            children: (
              <ProTable<SettlementRecord>
                cardBordered
                rowKey="id"
                columns={billColumns}
                dataSource={bills}
                loading={billQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 1900 }}
                pagination={{
                  current: billQuery.data?.current || billQueryParams.pageNum,
                  pageSize: billQuery.data?.size || billQueryParams.pageSize,
                  total: billQuery.data?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (pageNum, pageSize) => setBillQueryParams((prev) => ({ ...prev, pageNum, pageSize })),
                }}
                toolBarRender={() => []}
                onSubmit={(values) => setBillQueryParams((prev) => ({
                  ...prev,
                  pageNum: 1,
                  keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                  status: values.status ? String(values.status) : undefined,
                }))}
                onReset={() => setBillQueryParams((prev) => ({ pageNum: 1, pageSize: prev.pageSize }))}
              />
            ),
          },
          {
            key: 'crossStoreClearing',
            label: '跨店清分',
            children: (
              <ProTable<CrossStoreClearingRecord>
                cardBordered
                rowKey="id"
                columns={clearingColumns}
                dataSource={crossStoreClearings}
                loading={allocationQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 2800 }}
                pagination={{
                  current: allocationQuery.data?.current || clearingQueryParams.pageNum,
                  pageSize: allocationQuery.data?.size || clearingQueryParams.pageSize,
                  total: allocationQuery.data?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (pageNum, pageSize) => setClearingQueryParams((prev) => ({ ...prev, pageNum, pageSize })),
                }}
                toolBarRender={() => [
                  <Button key="plan" icon={<SettingOutlined />} onClick={() => navigate('/settlement/clearing-plans')}>
                    跨店结算方案
                  </Button>,
                ]}
                onSubmit={(values) => setClearingQueryParams((prev) => ({
                  ...prev,
                  pageNum: 1,
                  keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                  status: values.status ? String(values.status) : undefined,
                }))}
                onReset={() => setClearingQueryParams((prev) => ({ pageNum: 1, pageSize: prev.pageSize }))}
              />
            ),
          },
        ]}
      />

      <BusinessDetailModal
        title="结算单详情"
        eyebrow="结算单"
        subtitle={selectedBill ? `结算单 ${selectedBill.billNo}` : ''}
        sectionTitle="结算信息"
        sectionDesc=""
        open={!!selectedBill}
        onCancel={() => setSelectedBill(null)}
        width={1120}
      >
        {selectedBill ? (
          <>
            <SchemaDetail record={selectedBill} fields={settlementBillDetailFields} column={2} labelWidth={110} />
            <div style={{ marginTop: 20, marginBottom: 8, fontWeight: 600 }}>结算明细</div>
            <ProTable<SettlementBillDetailRecord>
              rowKey="id"
              columns={billDetailColumns}
              dataSource={billDetailQuery.data?.records || []}
              loading={billDetailQuery.isLoading}
              search={false}
              options={false}
              scroll={{ x: 1130 }}
              pagination={{
                current: billDetailQuery.data?.current || billDetailPage.pageNum,
                pageSize: billDetailQuery.data?.size || billDetailPage.pageSize,
                total: billDetailQuery.data?.total || 0,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (pageNum, pageSize) => setBillDetailPage({ pageNum, pageSize }),
              }}
              toolBarRender={false}
            />
          </>
        ) : null}
      </BusinessDetailModal>

      <BusinessDetailModal
        title="跨店清分详情"
        eyebrow="跨店清分"
        subtitle=""
        sectionTitle="记录详情"
        sectionDesc=""
        open={!!selectedDetail}
        onCancel={() => setSelectedDetail(null)}
        width={860}
      >
        {selectedDetail ? (
          <SchemaDetail
            record={selectedDetail as unknown as Record<string, unknown>}
            fields={crossStoreClearingDetailFields as unknown as DetailField<Record<string, unknown>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default SettlementManagement;
