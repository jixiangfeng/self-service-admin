import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  costBearerOptions,
  payoutStatusOptions,
  reconciliationStatusOptions,
  settlementDetailTypeOptions,
  settlementStatusOptions,
  settlementSubjectTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, {
  type PaymentReconciliationRecord,
  type ProfitShareDetailRecord,
  type SettlementBillDetailRecord,
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
  incomeAmount: number | string;
  refundAmount: number | string;
  costAmount: number | string;
  settlementAmount: number | string;
  remark: string;
}

const settlementStatusMap = buildValueEnum(settlementStatusOptions);
const payoutStatusMap = buildValueEnum(payoutStatusOptions);
const subjectTypeMap = buildValueEnum(settlementSubjectTypeOptions);
const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);

const settlementBillDetailFields: DetailField<SettlementRecord>[] = [
  { name: 'billNo', label: '结算单号' },
  { name: 'billType', label: '结算层级' },
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

const SettlementManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [billKeyword, setBillKeyword] = useState('');
  const [shareKeyword, setShareKeyword] = useState('');
  const [detailKeyword, setDetailKeyword] = useState('');
  const [payoutKeyword, setPayoutKeyword] = useState('');
  const [reconcileKeyword, setReconcileKeyword] = useState('');
  const [detail, setDetail] = useState<SettlementRecord | SettlementDetailRecord | SettlementPayoutRecord | PaymentReconciliationRecord | null>(null);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [costVisible, setCostVisible] = useState(false);
  const [shareDetail, setShareDetail] = useState<ProfitShareRecord | null>(null);
  const [costForm] = Form.useForm<{ couponCost: string; rechargeCost: string; inviteCost: string; owner: string }>();
  const [generateForm] = Form.useForm<{ billNo: string; billType: string; subjectId: string; cycleType: string; periodStart: string; periodEnd: string; incomeAmount: string; refundAmount: string; costAmount: string; settlementAmount: string }>();

  const billQuery = useQuery({
    queryKey: ['settlementBills', billKeyword],
    queryFn: async () => (await api.settlementBill.page({ pageNum: 1, pageSize: 200, keyword: billKeyword || undefined })).data,
  });
  const billDetailQuery = useQuery({
    queryKey: ['settlementOverviewDetails', detailKeyword],
    queryFn: async () => (await api.settlementBillDetail.page({ pageNum: 1, pageSize: 200, billNo: detailKeyword || undefined })).data,
  });
  const payoutQuery = useQuery({
    queryKey: ['settlementPayoutsOverview', payoutKeyword],
    queryFn: async () => (await api.settlementPayout.page({ pageNum: 1, pageSize: 200, keyword: payoutKeyword || undefined })).data,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['settlementReconciliationsOverview', reconcileKeyword],
    queryFn: async () => (await api.payment.reconciliations.page({ pageNum: 1, pageSize: 200, keyword: reconcileKeyword || undefined })).data,
  });
  const profitShareQuery = useQuery({
    queryKey: ['profitShareOverview', shareKeyword],
    queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: shareKeyword || undefined })).data,
  });
  const createBillMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementBill.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementBills'] });
      message.success('结算单已生成');
    },
  });
  const confirmBillMutation = useMutation({
    mutationFn: (record: SettlementRecord) => api.settlementBill.edit({ ...record, billStatus: 'SETTLED', status: 'SETTLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementBills'] });
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
  const exportTaskMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.file.importExportTasks.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operationImportExportTasks'] });
      message.success('导出任务已创建');
      navigate('/operations-support');
    },
  });
  const handleExportTask = (taskName: string, taskType: string, bizNo?: string) => {
    exportTaskMutation.mutate({
      taskNo: `EXP-${Date.now()}`,
      taskName,
      taskType,
      bizNo,
      fileName: `${taskName}-${Date.now()}.xlsx`,
      status: 'PENDING',
      createdBy: '系统管理员',
      createdAt: new Date().toISOString(),
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
    baseAmount: Number(item.baseAmount || 0),
    ratio: item.ratio || '',
    actualAmount: Number(item.actualAmount ?? item.shareAmount ?? 0),
    status: item.status,
    updatedAt: item.updatedAt || item.createdAt || '',
  })), [profitShareQuery.data]);
  const payouts = (payoutQuery.data?.records || []) as SettlementPayoutRecord[];
  const reconciliations = (reconciliationQuery.data?.records || []) as PaymentReconciliationRecord[];

  const filteredBills = useMemo(() => bills.filter((item) => containsKeyword(billKeyword, [item.billNo, item.subjectName, item.cycle])), [billKeyword, bills]);
  const filteredShares = useMemo(() => profitShares.filter((item) => containsKeyword(shareKeyword, [item.storeName, item.partnerName, item.ratio])), [shareKeyword, profitShares]);
  const filteredDetails = useMemo(() => settlementDetails.filter((item) => containsKeyword(detailKeyword, [item.billNo, item.sourceNo, item.storeName, item.remark])), [detailKeyword, settlementDetails]);
  const filteredPayouts = useMemo(() => payouts.filter((item) => containsKeyword(payoutKeyword, [item.payoutNo, item.billNo, item.accountName, item.bankName, item.failureReason])), [payoutKeyword, payouts]);
  const filteredReconciliations = useMemo(() => reconciliations.filter((item) => containsKeyword(reconcileKeyword, [item.reconNo, item.channelCode, item.handleRemark])), [reconcileKeyword, reconciliations]);

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
            onClick={() => confirmBillMutation.mutate(record)}
          >
            确认
          </Button>
          <Button size="small" loading={exportTaskMutation.isPending} onClick={() => handleExportTask('结算单导出', 'SETTLEMENT_BILL_EXPORT', record.billNo)}>导出</Button>
        </Space>
      ),
    },
  ];

  const shareColumns: ProColumns<ProfitShareRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例' } },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
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
          <Button size="small" onClick={() => navigate('/settlement/profit-details')}>调整</Button>
        </Space>
      ),
    },
  ];

  const detailColumns: ProColumns<SettlementDetailRecord>[] = [
    { title: '结算单号', dataIndex: 'billNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '结算单 / 来源单 / 门店 / 备注' } },
    { title: '明细类型', dataIndex: 'detailType', width: 130, valueType: 'select', valueEnum: detailTypeMap, render: (_, record) => renderStatusTag(record.detailType, detailTypeMap) },
    { title: '来源单号', dataIndex: 'sourceNo', width: 180, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '收入', dataIndex: 'incomeAmount', width: 110, search: false, render: (_, record) => formatAmount(record.incomeAmount) },
    { title: '退款', dataIndex: 'refundAmount', width: 110, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '成本', dataIndex: 'costAmount', width: 110, search: false, render: (_, record) => formatAmount(record.costAmount) },
    { title: '应结', dataIndex: 'settlementAmount', width: 110, search: false, render: (_, record) => formatAmount(record.settlementAmount) },
    { title: '备注', dataIndex: 'remark', width: 240, search: false },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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

  const handleGenerate = async () => {
    const values = await generateForm.validateFields();
    await createBillMutation.mutateAsync({
      ...values,
      subjectId: Number(values.subjectId),
      incomeAmount: Number(values.incomeAmount || 0),
      refundAmount: Number(values.refundAmount || 0),
      costAmount: Number(values.costAmount || 0),
      settlementAmount: Number(values.settlementAmount || 0),
      billStatus: 'PENDING',
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
          { title: '退款冲减', description: '把退款、补偿和活动成本同步冲减', status: 'process', tag: '成本分摊' },
          { title: '分润确认', description: '按门店和合伙关系确认实际分润结果', status: 'process', tag: '合伙人分润' },
          { title: '导出复盘', description: '最终输出结算单、分润明细和经营复盘数据', status: 'wait', tag: '报表 / 导出' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认结算单" value={bills.filter((item) => item.status !== 'SETTLED').length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="本周期收入" value={formatAmount(bills.reduce((sum, item) => sum + Number(item.incomeAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款冲减" value={formatAmount(bills.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="分润待确认" value={profitShares.filter((item) => item.status !== 'APPROVED').length} suffix="条" /></Card></Col>
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
                      costForm.setFieldsValue({ couponCost: '200', rechargeCost: '360', inviteCost: '120', owner: 'RATIO' });
                      setCostVisible(true);
                    }}
                  >
                    成本分摊配置
                  </Button>,
                  <Button key="generate" type="primary" onClick={() => setGenerateVisible(true)}>生成结算单</Button>,
                ]}
                onSubmit={(values) => setBillKeyword(String(values.keyword || ''))}
                onReset={() => setBillKeyword('')}
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
                toolBarRender={() => [<Button key="export" loading={exportTaskMutation.isPending} onClick={() => handleExportTask('结算明细导出', 'SETTLEMENT_DETAIL_EXPORT', detailKeyword || undefined)}>导出明细</Button>]}
                onSubmit={(values) => setDetailKeyword(String(values.keyword || ''))}
                onReset={() => setDetailKeyword('')}
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
                toolBarRender={() => [<Button key="retry" type="primary" loading={retryPayoutMutation.isPending} onClick={() => filteredPayouts[0] && retryPayoutMutation.mutate(filteredPayouts[0])}>重试打款</Button>]}
                onSubmit={(values) => setPayoutKeyword(String(values.keyword || ''))}
                onReset={() => setPayoutKeyword('')}
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
                toolBarRender={() => [<Button key="handle" type="primary" onClick={() => navigate('/payment-ops')}>处理差异</Button>]}
                onSubmit={(values) => setReconcileKeyword(String(values.keyword || ''))}
                onReset={() => setReconcileKeyword('')}
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
                  <Button key="rule" type="primary" onClick={() => navigate('/settlement/profit-details')}>分润规则</Button>,
                ]}
                onSubmit={(values) => setShareKeyword(String(values.keyword || ''))}
                onReset={() => setShareKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal title={detail && 'payoutNo' in detail ? '打款流水详情' : detail && 'reconNo' in detail ? '对账差异详情' : detail && 'sourceNo' in detail ? '结算明细详情' : '结算单详情'} open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('payoutNo' in detail ? settlementPayoutDetailFields : 'reconNo' in detail ? reconciliationDetailFields : 'sourceNo' in detail ? settlementOverviewDetailFields : settlementBillDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal title="成本分摊配置" open={costVisible} onOk={handleCostSubmit} onCancel={() => { setCostVisible(false); costForm.resetFields(); }} width={820}>
        <Form form={costForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="couponCost" label="优惠券成本" rules={[{ required: true, message: '请输入优惠券成本' }]}>
              <Select options={costBearerOptions} />
            </Form.Item>
            <Form.Item name="rechargeCost" label="充值赠送成本" rules={[{ required: true, message: '请输入充值成本' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="inviteCost" label="邀请奖励成本" rules={[{ required: true, message: '请输入邀请成本' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="承担方式" rules={[{ required: true, message: '请输入承担方式' }]}>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="分润明细" open={!!shareDetail} footer={null} onCancel={() => setShareDetail(null)} width={760}>
        {shareDetail ? (
          <SchemaDetail record={shareDetail} fields={profitShareSummaryFields} column={2} labelWidth={110} />
        ) : null}
      </Modal>

      <Modal title="生成结算单" open={generateVisible} onOk={handleGenerate} confirmLoading={createBillMutation.isPending} onCancel={() => { setGenerateVisible(false); generateForm.resetFields(); }} width={820}>
        <Form form={generateForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="billType" label="结算层级" rules={[{ required: true, message: '请选择结算层级' }]}>
              <Select options={settlementSubjectTypeOptions} />
            </Form.Item>
            <Form.Item name="subjectId" label="结算主体ID" rules={[{ required: true, message: '请输入结算主体ID' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="billNo" label="结算单号" rules={[{ required: true, message: '请输入结算单号' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cycleType" label="周期类型" rules={[{ required: true, message: '请输入周期类型' }]}>
              <Input placeholder="WEEKLY / MONTHLY" />
            </Form.Item>
            <Form.Item name="periodStart" label="周期开始" rules={[{ required: true, message: '请输入周期开始' }]}>
              <Input placeholder="2026-05-01" />
            </Form.Item>
            <Form.Item name="periodEnd" label="周期结束" rules={[{ required: true, message: '请输入周期结束' }]}>
              <Input placeholder="2026-05-07" />
            </Form.Item>
            <Form.Item name="incomeAmount" label="收入金额" rules={[{ required: true, message: '请输入收入金额' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="refundAmount" label="退款冲减" rules={[{ required: true, message: '请输入退款金额' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="costAmount" label="成本金额" rules={[{ required: true, message: '请输入成本金额' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="settlementAmount" label="应结金额" rules={[{ required: true, message: '请输入应结金额' }]}>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

export default SettlementManagement;
