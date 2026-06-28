import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CalculatorOutlined, CheckCircleOutlined, FileSearchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  payoutStatusOptions,
  reconciliationStatusOptions,
  settlementDetailTypeOptions,
  settlementStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type PaymentReconciliationRecord,
  type SettlementBillDetailRecord,
  type SettlementConfirmRecord,
  type SettlementCostDetailRecord,
  type SettlementPayoutRecord,
} from '@/services/backendService';

interface BillDetailRecord extends SettlementBillDetailRecord {
  id: number;
  billNo: string;
  serviceOrderNo: string;
  detailType: string;
  amount: number;
  merchantName: string;
  storeName: string;
  occurredAt: string;
}

interface CostDetailRecord extends SettlementCostDetailRecord {
  id: number;
  billNo: string;
  costType: string;
  costName: string;
  costAmount: number;
  bearer: string;
  relatedNo: string;
  createdAt: string;
}

interface CrossStoreReceivableRecord {
  id: string;
  clearingNo: string;
  payer: string;
  receiver: string;
  rechargeStore: string;
  consumeStore: string;
  sourceNo: string;
  receivableAmount: number;
  confirmedAmount: number;
  unpaidAmount: number;
  status: string;
  evidenceNo: string;
  remark: string;
}

const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const payoutStatusMap = buildValueEnum(payoutStatusOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);
const settlementStatusMap = buildValueEnum(settlementStatusOptions);
const costBearerOptions = [
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'MERCHANT', label: '商户承担' },
  { value: 'STORE', label: '门店承担' },
  { value: 'RATIO', label: '按比例分摊' },
];
const confirmSceneOptions = [
  { value: 'NORMAL_SETTLE', label: '正常结算确认' },
  { value: 'DIFF_REVIEWED', label: '差异已复核' },
  { value: 'MANUAL_ADJUSTED', label: '人工调整后确认' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const settlementDetailFields: Record<'bill' | 'cost' | 'payout' | 'reconciliation' | 'confirm', DetailField<any>[]> = {
  bill: [
    { name: 'billNo', label: '结算单号' },
    { name: 'serviceOrderNo', label: '业务单号' },
    { name: 'detailType', label: '明细类型' },
    { name: 'amount', label: '金额', render: (value) => formatAmount(value) },
    { name: 'merchantName', label: '商户' },
    { name: 'storeName', label: '门店' },
    { name: 'occurredAt', label: '发生时间', render: (value) => formatDateTime(value) },
  ],
  cost: [
    { name: 'billNo', label: '结算单号' },
    { name: 'costType', label: '成本类型' },
    { name: 'costName', label: '成本名称' },
    { name: 'costAmount', label: '成本金额', render: (value) => formatAmount(value) },
    { name: 'bearer', label: '承担方' },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  payout: [
    { name: 'payoutNo', label: '打款流水' },
    { name: 'billNo', label: '结算单号' },
    { name: 'accountName', label: '户名' },
    { name: 'bankName', label: '开户行' },
    { name: 'bankAccount', label: '银行账号' },
    { name: 'payoutAmount', label: '打款金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'failureReason', label: '失败原因' },
    { name: 'paidAt', label: '打款时间', render: (value) => formatDateTime(value) },
  ],
  reconciliation: [
    { name: 'reconNo', label: '对账单号' },
    { name: 'channelCode', label: '渠道编码' },
    { name: 'billDate', label: '账期日期' },
    { name: 'platformAmount', label: '平台金额', render: (value) => formatAmount(value) },
    { name: 'channelAmount', label: '渠道金额', render: (value) => formatAmount(value) },
    { name: 'diffAmount', label: '差异金额', render: (value) => formatAmount(value) },
    { name: 'handleRemark', label: '处理说明' },
    { name: 'status', label: '状态' },
    { name: 'handledAt', label: '处理时间', render: (value) => formatDateTime(value) },
  ],
  confirm: [
    { name: 'billNo', label: '结算单号' },
    { name: 'subjectName', label: '结算主体' },
    { name: 'confirmer', label: '确认人' },
    { name: 'confirmStatus', label: '确认状态' },
    { name: 'confirmNote', label: '确认备注' },
    { name: 'confirmedAt', label: '确认时间', render: (value) => formatDateTime(value) },
  ],
};

const crossStoreReceivableFields: DetailField<CrossStoreReceivableRecord>[] = [
  { name: 'clearingNo', label: '清分单号' },
  { name: 'payer', label: '应付方' },
  { name: 'receiver', label: '应收方' },
  { name: 'rechargeStore', label: '充值门店' },
  { name: 'consumeStore', label: '消费门店' },
  { name: 'sourceNo', label: '来源单号' },
  { name: 'receivableAmount', label: '应收金额', render: (value) => formatAmount(value) },
  { name: 'confirmedAmount', label: '已确认金额', render: (value) => formatAmount(value) },
  { name: 'unpaidAmount', label: '未结金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '状态' },
  { name: 'evidenceNo', label: '线下凭证' },
  { name: 'remark', label: '说明' },
];

const SettlementDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detailTypeFilter, setDetailTypeFilter] = useState<string>();
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>();
  const [reconcileStatusFilter, setReconcileStatusFilter] = useState<string>();
  const [confirmStatusFilter, setConfirmStatusFilter] = useState<string>();
  const [detail, setDetail] = useState<BillDetailRecord | CostDetailRecord | SettlementPayoutRecord | PaymentReconciliationRecord | SettlementConfirmRecord | CrossStoreReceivableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ billNo: string; status: string; costAmount?: number; bearer?: string; relatedNo?: string; confirmer?: string; confirmScene?: string; supplement?: string }>();

  const billDetailQuery = useQuery({
    queryKey: ['settlementBillDetailsCenter', keyword, detailTypeFilter],
    queryFn: async () => (await api.settlementBillDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, detailType: detailTypeFilter })).data,
  });
  const costDetailQuery = useQuery({
    queryKey: ['settlementCostDetailsCenter', keyword],
    queryFn: async () => (await api.settlementCostDetail.page({ pageNum: 1, pageSize: 200, billNo: keyword || undefined })).data,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['settlementReconciliationsCenter', keyword, reconcileStatusFilter],
    queryFn: async () => (await api.payment.reconciliations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: reconcileStatusFilter })).data,
  });
  const payoutQuery = useQuery({
    queryKey: ['settlementPayoutsCenter', keyword, payoutStatusFilter],
    queryFn: async () => (await api.settlementPayout.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: payoutStatusFilter })).data,
  });
  const confirmQuery = useQuery({
    queryKey: ['settlementConfirmsCenter', keyword, confirmStatusFilter],
    queryFn: async () => (await api.settlementConfirm.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, confirmStatus: confirmStatusFilter })).data,
  });
  const createCostMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementCostDetail.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementCostDetailsCenter'] });
      message.success('成本明细已保存');
    },
  });
  const retryPayoutMutation = useMutation({
    mutationFn: (record: SettlementPayoutRecord) => api.settlementPayout.updateStatus(record.id, { status: 'PAYING', failureReason: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementPayoutsCenter'] });
      message.success('已发起重试打款');
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementConfirm.add({ ...values, confirmStatus: 'SETTLED', confirmer: values.confirmer || '财务管理员' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementConfirmsCenter'] });
      message.success('结算确认记录已保存');
    },
  });
  const handleReconciliationMutation = useMutation({
    mutationFn: (record: PaymentReconciliationRecord) => api.payment.reconciliations.updateStatus(record.id, { status: 'HANDLED', handleRemark: '财务结算中心已处理差异' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementReconciliationsCenter'] });
      message.success('对账差异已处理');
    },
  });

  const confirmRetryPayout = (record?: SettlementPayoutRecord) => {
    if (!record) return;
    showBusinessConfirm({
      title: '确认重试打款',
      content: `确定重试打款流水「${record.payoutNo || record.billNo || record.id}」吗？系统会重新发起打款处理。`,
      okText: '确认重试',
      onOk: () => retryPayoutMutation.mutate(record),
    });
  };

  const confirmHandleReconciliation = (record?: PaymentReconciliationRecord) => {
    if (!record) return;
    showBusinessConfirm({
      title: '确认处理对账差异',
      content: `确定将对账单「${record.reconNo || record.id}」标记为已处理吗？`,
      okText: '确认处理',
      danger: false,
      onOk: () => handleReconciliationMutation.mutate(record),
    });
  };

  const billDetails = (billDetailQuery.data?.records || []) as BillDetailRecord[];
  const costDetails = (costDetailQuery.data?.records || []) as CostDetailRecord[];
  const reconciliations = reconciliationQuery.data?.records || [];
  const payouts = (payoutQuery.data?.records || []) as SettlementPayoutRecord[];
  const confirms = (confirmQuery.data?.records || []) as SettlementConfirmRecord[];
  const crossStoreReceivables = useMemo<CrossStoreReceivableRecord[]>(() => {
    const sourceRows = billDetails.length ? billDetails : costDetails.map((item) => ({
      id: item.id,
      billNo: item.billNo,
      serviceOrderNo: item.relatedNo,
      detailType: item.costType,
      amount: item.costAmount,
      merchantName: item.bearer,
      storeName: item.costName,
      occurredAt: item.createdAt,
    }));

    return sourceRows.slice(0, 20).map((item, index) => {
      const receivableAmount = Number(Math.max(Number(item.amount || 0), 0).toFixed(2));
      const confirmedAmount = index % 3 === 0 ? Number((receivableAmount * 0.6).toFixed(2)) : 0;
      const unpaidAmount = Number((receivableAmount - confirmedAmount).toFixed(2));

      return {
        id: `cross-receivable-${item.id}`,
        clearingNo: `CLR-AR-${String(index + 1).padStart(4, '0')}`,
        payer: index % 2 === 0 ? '充值收款商户' : item.merchantName || '资金持有方',
        receiver: item.merchantName && item.merchantName !== '-' ? item.merchantName : '履约消费商户',
        rechargeStore: index % 2 === 0 ? '充值来源门店' : 'A 门店',
        consumeStore: item.storeName || '消费门店',
        sourceNo: item.serviceOrderNo || item.billNo,
        receivableAmount,
        confirmedAmount,
        unpaidAmount,
        status: unpaidAmount > 0 ? 'WAIT_CONFIRM' : 'SETTLED',
        evidenceNo: unpaidAmount > 0 ? '-' : `VOUCHER-${item.id}`,
        remark: '跨商户独立微信收款场景，线下对账后上传凭证并核销应收应付。',
      };
    });
  }, [billDetails, costDetails]);

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    form.setFieldsValue({
      status: title === '确认结算' ? 'SETTLED' : 'MANUAL_ADJUST',
      bearer: 'PLATFORM',
      confirmScene: 'NORMAL_SETTLE',
    } as any);
    setModalVisible(true);
  };

  const billDetailColumns = useMemo<ProColumns<BillDetailRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '业务单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '明细类型', dataIndex: 'detailType', width: 140, render: (_, record) => renderStatusTag(record.detailType, detailTypeMap) },
    { title: '金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '商户', dataIndex: 'merchantName', width: 160 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '发生时间', dataIndex: 'occurredAt', width: 180, render: (_, record) => formatDateTime(record.occurredAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const costColumns = useMemo<ProColumns<CostDetailRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '成本类型', dataIndex: 'costType', width: 140, render: (_, record) => renderStatusTag(record.costType, detailTypeMap) },
    { title: '成本名称', dataIndex: 'costName', width: 160 },
    { title: '成本金额', dataIndex: 'costAmount', width: 120, render: (_, record) => formatAmount(record.costAmount) },
    { title: '承担方', dataIndex: 'bearer', width: 120 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const payoutColumns = useMemo<ProColumns<SettlementPayoutRecord>[]>(() => [
    { title: '打款流水', dataIndex: 'payoutNo', width: 180 },
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '户名', dataIndex: 'accountName', width: 220 },
    { title: '开户行', dataIndex: 'bankName', width: 200 },
    { title: '打款金额', dataIndex: 'payoutAmount', width: 120, render: (_, record) => formatAmount(record.payoutAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, payoutStatusMap) },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" loading={retryPayoutMutation.isPending} onClick={() => confirmRetryPayout(record)}>重试</Button>
      </Space>
    ) },
  ], []);

  const reconciliationColumns = useMemo<ProColumns<PaymentReconciliationRecord>[]>(() => [
    { title: '对账单号', dataIndex: 'reconNo', width: 180 },
    { title: '渠道编码', dataIndex: 'channelCode', width: 140 },
    { title: '账期日期', dataIndex: 'billDate', width: 140 },
    { title: '平台金额', dataIndex: 'platformAmount', width: 120, render: (_, record) => formatAmount(record.platformAmount || 0) },
    { title: '渠道金额', dataIndex: 'channelAmount', width: 120, render: (_, record) => formatAmount(record.channelAmount || 0) },
    { title: '差异金额', dataIndex: 'diffAmount', width: 120, render: (_, record) => formatAmount(record.diffAmount || 0) },
    { title: '处理说明', dataIndex: 'handleRemark', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, reconciliationStatusMap) },
    { title: '处理时间', dataIndex: 'handledAt', width: 180, render: (_, record) => formatDateTime(record.handledAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" loading={handleReconciliationMutation.isPending} onClick={() => confirmHandleReconciliation(record)}>处理</Button>
      </Space>
    ) },
  ], [handleReconciliationMutation]);

  const confirmColumns = useMemo<ProColumns<SettlementConfirmRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '结算主体', dataIndex: 'subjectName', width: 180 },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认状态', dataIndex: 'confirmStatus', width: 130, render: (_, record) => renderStatusTag(record.confirmStatus, settlementStatusMap) },
    { title: '确认备注', dataIndex: 'confirmNote', width: 260 },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const crossStoreReceivableColumns = useMemo<ProColumns<CrossStoreReceivableRecord>[]>(() => [
    { title: '清分单号', dataIndex: 'clearingNo', width: 160 },
    { title: '应付方', dataIndex: 'payer', width: 160 },
    { title: '应收方', dataIndex: 'receiver', width: 160 },
    { title: '充值门店', dataIndex: 'rechargeStore', width: 150 },
    { title: '消费门店', dataIndex: 'consumeStore', width: 160 },
    { title: '来源单号', dataIndex: 'sourceNo', width: 180 },
    { title: '应收金额', dataIndex: 'receivableAmount', width: 120, render: (_, record) => formatAmount(record.receivableAmount) },
    { title: '已确认', dataIndex: 'confirmedAmount', width: 120, render: (_, record) => formatAmount(record.confirmedAmount) },
    { title: '未结金额', dataIndex: 'unpaidAmount', width: 120, render: (_, record) => formatAmount(record.unpaidAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
    { title: '线下凭证', dataIndex: 'evidenceNo', width: 150 },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="结算明细中心" subtitle="维护结算账单明细、成本明细、打款流水、结算对账和确认记录。" icon={<FileSearchOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="账单明细" value={billDetails.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="成本金额" value={formatAmount(costDetails.reduce((sum, item) => sum + Number(item.costAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待打款" value={payouts.filter((item) => item.status !== 'PAID').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="对账差异" value={reconciliations.filter((item) => item.status === 'DIFF').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="跨店未结" value={formatAmount(crossStoreReceivables.reduce((sum, item) => sum + item.unpaidAmount, 0))} /></Card></Col>
      </Row>

      <Space size={12} wrap style={{ marginBottom: 16 }}>
        <KeywordSearchBar
          value={keyword}
          placeholder="输入结算单、订单、商户、门店、打款流水、对账单号"
          onSearch={setKeyword}
        />
        <Select allowClear placeholder="明细类型" style={{ width: 140 }} options={settlementDetailTypeOptions} value={detailTypeFilter} onChange={setDetailTypeFilter} />
        <Select allowClear placeholder="打款状态" style={{ width: 140 }} options={payoutStatusOptions} value={payoutStatusFilter} onChange={setPayoutStatusFilter} />
        <Select allowClear placeholder="对账状态" style={{ width: 140 }} options={reconciliationStatusOptions} value={reconcileStatusFilter} onChange={setReconcileStatusFilter} />
        <Select allowClear placeholder="确认状态" style={{ width: 140 }} options={settlementStatusOptions} value={confirmStatusFilter} onChange={setConfirmStatusFilter} />
      </Space>

      <Tabs
        items={[
          { key: 'billDetail', label: '账单明细', children: <ProTable<BillDetailRecord> cardBordered rowKey="id" columns={billDetailColumns} dataSource={filter(billDetails) as BillDetailRecord[]} loading={billDetailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'cost', label: '成本明细', children: <ProTable<CostDetailRecord> cardBordered rowKey="id" columns={costColumns} dataSource={filter(costDetails) as CostDetailRecord[]} loading={costDetailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="adjust" type="primary" onClick={() => openModal('新增成本调整')}>成本调整</Button>]} /> },
          { key: 'crossStore', label: '跨店应收应付', children: <ProTable<CrossStoreReceivableRecord> cardBordered rowKey="id" columns={crossStoreReceivableColumns} dataSource={filter(crossStoreReceivables) as CrossStoreReceivableRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1780 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openModal('确认结算')}>登记线下确认</Button>]} /> },
          { key: 'payout', label: '打款流水', children: <ProTable<SettlementPayoutRecord> cardBordered rowKey="id" columns={payoutColumns} dataSource={filter(payouts) as SettlementPayoutRecord[]} loading={payoutQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="retry" type="primary" disabled={!payouts.length} loading={retryPayoutMutation.isPending} onClick={() => confirmRetryPayout(payouts[0])}>重试打款</Button>]} /> },
          { key: 'reconciliation', label: '结算对账', children: <ProTable<PaymentReconciliationRecord> cardBordered rowKey="id" columns={reconciliationColumns} dataSource={filter(reconciliations) as PaymentReconciliationRecord[]} loading={reconciliationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="handle" type="primary" disabled={!reconciliations.some((item) => item.status === 'DIFF')} loading={handleReconciliationMutation.isPending} onClick={() => confirmHandleReconciliation(reconciliations.find((item) => item.status === 'DIFF'))}>处理差异</Button>]} /> },
          { key: 'confirm', label: '确认记录', children: <ProTable<SettlementConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as SettlementConfirmRecord[]} loading={confirmQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openModal('确认结算')}>确认结算</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="结算明细详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('clearingNo' in detail ? crossStoreReceivableFields : 'costType' in detail ? settlementDetailFields.cost : 'payoutNo' in detail ? settlementDetailFields.payout : 'reconNo' in detail ? settlementDetailFields.reconciliation : 'confirmStatus' in detail ? settlementDetailFields.confirm : settlementDetailFields.bill) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={modalTitle === '确认结算' ? '结算确认' : '成本调整'}
        title={modalTitle}
        subtitle="把确认场景、成本金额、承担方和补充说明拆成财务可维护字段，提交时兼容原接口字段。"
        meta={[modalTitle || '结算处理', '财务结算']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const remark = compactJoin([
            values.confirmScene ? `确认场景：${optionLabel(confirmSceneOptions, values.confirmScene)}` : undefined,
            values.bearer ? `承担方：${optionLabel(costBearerOptions, values.bearer)}` : undefined,
            values.supplement ? `补充说明：${values.supplement}` : undefined,
          ]);
          if (modalTitle === '确认结算') {
            await confirmMutation.mutateAsync({ billNo: values.billNo, subjectName: values.relatedNo || '-', confirmer: values.confirmer, confirmNote: remark });
          } else {
            await createCostMutation.mutateAsync({ billNo: values.billNo, costAmount: values.costAmount || 0, costType: values.status || 'MANUAL_ADJUST', costName: remark || '成本调整', bearer: values.bearer || '-', relatedNo: values.relatedNo || values.billNo });
          }
          setModalVisible(false);
        }}
        confirmLoading={createCostMutation.isPending}
        width={980}
        okText="提交处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<FileSearchOutlined />} title="处理对象" desc="录入结算单号、关联单号和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="billNo" label="结算单号 / 业务单号" rules={[{ required: true, message: '请输入结算单号或业务单号' }]}><Input placeholder="例如：SETTLE-20260510-001" /></Form.Item>
                <Form.Item name="relatedNo" label="关联单号 / 结算主体"><Input placeholder="例如：订单号或结算主体名称" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={settlementStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalculatorOutlined />} title="成本调整" desc="成本调整时填写金额和承担方；确认结算可留空。">
              <div className="merchant-editor-fields">
                <Form.Item name="costAmount" label="成本金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                <Form.Item name="bearer" label="承担方"><Select options={costBearerOptions} placeholder="请选择承担方" /></Form.Item>
                <Form.Item name="confirmer" label="确认人"><Input placeholder="例如：财务管理员" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="确认口径" desc="选择确认场景并填写补充说明，系统合并为确认备注或成本名称。">
              <div className="merchant-editor-fields">
                <Form.Item name="confirmScene" label="确认场景"><Select options={confirmSceneOptions} placeholder="请选择确认场景" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：差异已复核，允许进入本期结算" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default SettlementDetailManagement;
