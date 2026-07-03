import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CheckCircleOutlined, ReloadOutlined, SearchOutlined, SplitCellsOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  partnerRoleOptions,
  profitRelationStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type PartnerPayableSummaryRecord,
  type ProfitChargebackRecord,
  type ProfitConfirmRecord,
  type ProfitPartnerRelationRecord,
  type ProfitRatioVersionRecord,
  type ProfitShareDetailRecord,
} from '@/services/backendService';
import { DateTimeField, fromDateTimePickerValue } from '@/utils/formControls';

const partnerRoleMap = buildValueEnum(partnerRoleOptions);
const relationStatusMap = buildValueEnum(profitRelationStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const payableStatusMap = buildValueEnum([
  { value: 'WAIT_PAY', label: '待打款' },
  { value: 'PAID', label: '已打款' },
  { value: 'FAILED', label: '打款失败' },
  { value: 'NO_PAYABLE', label: '无应付' },
]);
const profitActionOptions = [
  { value: 'ADD_RELATION', label: '新增合伙关系' },
  { value: 'AUDIT_VERSION', label: '审核比例版本' },
  { value: 'CONFIRM_SHARE', label: '确认分润' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const ownerText = (type?: string, id?: number | string) => [type, id !== undefined && id !== null ? `#${id}` : undefined].filter(Boolean).join('');

const profitShareCenterDetailFields: Record<'relation' | 'version' | 'detail' | 'chargeback' | 'confirm', DetailField<any>[]> = {
  relation: [
    { name: 'relationNo', label: '关系编号' },
    { name: 'storeName', label: '门店' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'partnerRole', label: '角色' },
    { name: 'shareRatio', label: '比例' },
    { name: 'primarySettlement', label: '主结算人' },
    { name: 'status', label: '状态' },
  ],
  version: [
    { name: 'versionNo', label: '版本号' },
    { name: 'relationNo', label: '关系编号' },
    { name: 'beforeRatio', label: '原比例' },
    { name: 'afterRatio', label: '新比例' },
    { name: 'effectiveAt', label: '生效时间', render: (value) => formatDateTime(value) },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'remark', label: '备注' },
  ],
  detail: [
    { name: 'detailNo', label: '分润明细' },
    { name: 'settlementBillNo', label: '结算单' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'balanceScopeType', label: '余额范围', render: (_value, record) => ownerText(record.balanceScopeType, record.balanceScopeId) || '-' },
    { name: 'fundOwnerType', label: '资金归属', render: (_value, record) => ownerText(record.fundOwnerType, record.fundOwnerId) || '-' },
    { name: 'revenueOwnerType', label: '收入归属', render: (_value, record) => ownerText(record.revenueOwnerType, record.revenueOwnerId) || '-' },
    { name: 'giftCostBearerType', label: '赠送成本', render: (_value, record) => ownerText(record.giftCostBearerType, record.giftCostBearerId) || '-' },
    { name: 'cashAmount', label: '本金抵扣', render: (value) => formatAmount(value || 0) },
    { name: 'giftAmount', label: '赠送抵扣', render: (value) => formatAmount(value || 0) },
    { name: 'settlementBaseAmount', label: '结算基准', render: (value) => formatAmount(value || 0) },
    { name: 'settlementRule', label: '清分规则' },
    { name: 'baseAmount', label: '分润基数', render: (value) => formatAmount(value) },
    { name: 'shareAmount', label: '分润金额', render: (value) => formatAmount(value) },
    { name: 'refundAmount', label: '退款回冲', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
  ],
  chargeback: [
    { name: 'chargebackNo', label: '回冲单号' },
    { name: 'detailNo', label: '分润明细' },
    { name: 'refundNo', label: '退款单号' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'chargebackAmount', label: '回冲金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  confirm: [
    { name: 'confirmNo', label: '确认单号' },
    { name: 'settlementBillNo', label: '结算单' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'confirmAmount', label: '确认金额', render: (value) => formatAmount(value) },
    { name: 'confirmer', label: '确认人' },
    { name: 'confirmStatus', label: '确认状态' },
    { name: 'confirmedAt', label: '确认时间', render: (value) => formatDateTime(value) },
    { name: 'payoutStatus', label: '打款状态', render: (value) => payableStatusMap[value as keyof typeof payableStatusMap]?.text || value },
    { name: 'paidAt', label: '打款时间', render: (value) => formatDateTime(value) },
  ],
};

type ProfitShareDetailSearchValues = {
  keyword?: string;
  relationStatus?: string;
  versionAuditStatus?: string;
  detailStatus?: string;
  chargebackStatus?: string;
  confirmStatus?: string;
};

const ProfitShareDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [relationStatusFilter, setRelationStatusFilter] = useState<string>();
  const [versionAuditStatusFilter, setVersionAuditStatusFilter] = useState<string>();
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>();
  const [chargebackStatusFilter, setChargebackStatusFilter] = useState<string>();
  const [confirmStatusFilter, setConfirmStatusFilter] = useState<string>();
  const [detail, setDetail] = useState<ProfitPartnerRelationRecord | ProfitRatioVersionRecord | ProfitShareDetailRecord | ProfitChargebackRecord | ProfitConfirmRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, any>>();
  const [searchForm] = Form.useForm<ProfitShareDetailSearchValues>();
  const action = Form.useWatch('action', form);

  const handleSearch = (values: ProfitShareDetailSearchValues) => {
    setKeyword(String(values.keyword || '').trim());
    setRelationStatusFilter(values.relationStatus);
    setVersionAuditStatusFilter(values.versionAuditStatus);
    setDetailStatusFilter(values.detailStatus);
    setChargebackStatusFilter(values.chargebackStatus);
    setConfirmStatusFilter(values.confirmStatus);
  };

  const handleResetSearch = () => {
    searchForm.resetFields();
    setKeyword('');
    setRelationStatusFilter(undefined);
    setVersionAuditStatusFilter(undefined);
    setDetailStatusFilter(undefined);
    setChargebackStatusFilter(undefined);
    setConfirmStatusFilter(undefined);
  };

  const openAction = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    form.setFieldsValue({
      action: title === '新增合伙关系' ? 'ADD_RELATION' : title === '审核比例版本' ? 'AUDIT_VERSION' : 'CONFIRM_SHARE',
      partnerRole: 'PARTNER',
      status: title === '新增合伙关系' ? 'PENDING' : 'APPROVED',
      auditStatus: title === '审核比例版本' ? 'APPROVED' : undefined,
      confirmStatus: title === '确认分润' ? 'APPROVED' : undefined,
    });
    setModalVisible(true);
  };

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const relationQuery = useQuery({ queryKey: ['profitDetailRelations', keyword, relationStatusFilter], queryFn: async () => (await api.profitPartnerRelation.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: relationStatusFilter })).data });
  const versionQuery = useQuery({ queryKey: ['profitDetailVersions', keyword, versionAuditStatusFilter], queryFn: async () => (await api.profitRatioVersion.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, auditStatus: versionAuditStatusFilter })).data });
  const detailQuery = useQuery({ queryKey: ['profitDetailDetails', keyword, detailStatusFilter], queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: detailStatusFilter })).data });
  const chargebackQuery = useQuery({ queryKey: ['profitDetailChargebacks', keyword, chargebackStatusFilter], queryFn: async () => (await api.profitChargeback.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: chargebackStatusFilter })).data });
  const confirmQuery = useQuery({ queryKey: ['profitDetailConfirms', keyword, confirmStatusFilter], queryFn: async () => (await api.profitConfirm.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, confirmStatus: confirmStatusFilter })).data });
  const payableQuery = useQuery({ queryKey: ['profitPartnerPayables', keyword], queryFn: async () => (await api.profitConfirm.payableSummary({ keyword: keyword || undefined })).data });
  const actionMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => {
      const remark = compactJoin([
        values.action ? `操作类型：${optionLabel(profitActionOptions, String(values.action))}` : undefined,
        values.storeName ? `门店：${values.storeName}` : undefined,
        values.partnerName ? `合伙人：${values.partnerName}` : undefined,
        values.shareRatio ? `分润比例：${values.shareRatio}%` : undefined,
        values.afterRatio ? `新比例：${values.afterRatio}%` : undefined,
        values.supplement ? `补充说明：${values.supplement}` : undefined,
      ]);
      if (values.action === 'ADD_RELATION') {
        return api.profitPartnerRelation.add({ relationNo: values.relationNo, storeName: values.storeName, partnerName: values.partnerName, partnerRole: values.partnerRole, shareRatio: values.shareRatio, status: values.status });
      }
      if (values.action === 'AUDIT_VERSION') {
        return api.profitRatioVersion.add({ versionNo: values.versionNo, relationNo: values.relationNo, beforeRatio: values.beforeRatio, afterRatio: values.afterRatio, effectiveAt: fromDateTimePickerValue(values.effectiveAt as any) || values.effectiveAt, auditStatus: values.auditStatus, remark });
      }
      return api.profitConfirm.generate({ settlementBillNo: values.settlementBillNo, confirmer: values.confirmer, confirmStatus: values.confirmStatus, confirmRemark: remark });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitDetailRelations'] });
      queryClient.invalidateQueries({ queryKey: ['profitDetailVersions'] });
      queryClient.invalidateQueries({ queryKey: ['profitDetailDetails'] });
      queryClient.invalidateQueries({ queryKey: ['profitDetailConfirms'] });
      queryClient.invalidateQueries({ queryKey: ['profitPartnerPayables'] });
      message.success('分润操作已保存');
    },
  });
  const payoutMutation = useMutation<unknown, Error, ProfitConfirmRecord>({
    mutationFn: (record) => api.profitConfirm.updatePayoutStatus(record.id, { payoutStatus: 'PAID' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitDetailConfirms'] });
      queryClient.invalidateQueries({ queryKey: ['profitPartnerPayables'] });
      message.success('已标记合伙人打款');
    },
  });

  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const versions = (versionQuery.data?.records || []) as ProfitRatioVersionRecord[];
  const details = (detailQuery.data?.records || []) as ProfitShareDetailRecord[];
  const chargebacks = (chargebackQuery.data?.records || []) as ProfitChargebackRecord[];
  const confirms = (confirmQuery.data?.records || []) as ProfitConfirmRecord[];
  const payables = (payableQuery.data || []) as PartnerPayableSummaryRecord[];

  const relationColumns = useMemo<ProColumns<ProfitPartnerRelationRecord>[]>(() => [
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '角色', dataIndex: 'partnerRole', width: 120, render: (_, record) => renderStatusTag(record.partnerRole, partnerRoleMap) },
    { title: '比例', dataIndex: 'shareRatio', width: 100 },
    { title: '主结算人', dataIndex: 'primarySettlement', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, relationStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const versionColumns = useMemo<ProColumns<ProfitRatioVersionRecord>[]>(() => [
    { title: '版本号', dataIndex: 'versionNo', width: 160 },
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '原比例', dataIndex: 'beforeRatio', width: 100 },
    { title: '新比例', dataIndex: 'afterRatio', width: 100 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const detailColumns = useMemo<ProColumns<ProfitShareDetailRecord>[]>(() => [
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '余额范围', dataIndex: 'balanceScopeType', width: 130, render: (_, record) => ownerText(record.balanceScopeType, record.balanceScopeId) || '-' },
    { title: '资金归属', dataIndex: 'fundOwnerType', width: 130, render: (_, record) => ownerText(record.fundOwnerType, record.fundOwnerId) || '-' },
    { title: '收入归属', dataIndex: 'revenueOwnerType', width: 130, render: (_, record) => ownerText(record.revenueOwnerType, record.revenueOwnerId) || '-' },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '分润金额', dataIndex: 'shareAmount', width: 120, render: (_, record) => formatAmount(record.shareAmount) },
    { title: '退款回冲', dataIndex: 'refundAmount', width: 120, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const chargebackColumns = useMemo<ProColumns<ProfitChargebackRecord>[]>(() => [
    { title: '回冲单号', dataIndex: 'chargebackNo', width: 180 },
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '退款单号', dataIndex: 'refundNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '回冲金额', dataIndex: 'chargebackAmount', width: 120, render: (_, record) => formatAmount(record.chargebackAmount) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const confirmColumns = useMemo<ProColumns<ProfitConfirmRecord>[]>(() => [
    { title: '确认单号', dataIndex: 'confirmNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '确认金额', dataIndex: 'confirmAmount', width: 120, render: (_, record) => formatAmount(record.confirmAmount) },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认状态', dataIndex: 'confirmStatus', width: 120, render: (_, record) => renderStatusTag(record.confirmStatus, auditStatusMap) },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 120, render: (_, record) => renderStatusTag(record.payoutStatus, payableStatusMap) },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            type="primary"
            disabled={record.confirmStatus !== 'APPROVED' || record.payoutStatus === 'PAID'}
            loading={payoutMutation.isPending}
            onClick={() => payoutMutation.mutate(record)}
          >
            标记打款
          </Button>
        </Space>
      ),
    },
  ], [payoutMutation]);

  const payableColumns = useMemo<ProColumns<PartnerPayableSummaryRecord>[]>(() => [
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '确认单数', dataIndex: 'confirmCount', width: 100 },
    { title: '待确认', dataIndex: 'pendingAmount', width: 120, render: (_, record) => formatAmount(record.pendingAmount) },
    { title: '待打款', dataIndex: 'payableAmount', width: 120, render: (_, record) => formatAmount(record.payableAmount) },
    { title: '已打款', dataIndex: 'paidAmount', width: 120, render: (_, record) => formatAmount(record.paidAmount || 0) },
    { title: '已驳回', dataIndex: 'rejectedAmount', width: 120, render: (_, record) => formatAmount(record.rejectedAmount) },
    { title: '累计确认', dataIndex: 'totalAmount', width: 120, render: (_, record) => formatAmount(record.totalAmount) },
    { title: '最近结算单', dataIndex: 'latestSettlementBillNo', width: 180 },
    { title: '最近确认', dataIndex: 'latestConfirmedAt', width: 180, render: (_, record) => formatDateTime(record.latestConfirmedAt) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 120, render: (_, record) => renderStatusTag(record.payoutStatus, payableStatusMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="分润明细中心" subtitle="维护合伙关系、比例版本、分润明细、退款回冲和分润确认记录。" icon={<SplitCellsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="合伙关系" value={relations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审版本" value={versions.filter((item) => item.auditStatus === 'PENDING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="分润金额" value={formatAmount(details.reduce((sum, item) => sum + Number(item.shareAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="回冲金额" value={formatAmount(chargebacks.reduce((sum, item) => sum + Number(item.chargebackAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="合伙人待打款" value={formatAmount(payables.reduce((sum, item) => sum + Number(item.payableAmount || 0), 0))} /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        onFinish={handleSearch}
        style={{ marginBottom: 16, padding: 16, background: '#fff', borderRadius: 8, rowGap: 12 }}
      >
        <Form.Item name="keyword" style={{ minWidth: 320, flex: 1, marginBottom: 0 }}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="输入门店、合伙人、订单、结算单、版本、回冲单" />
        </Form.Item>
        <Form.Item name="relationStatus" style={{ marginBottom: 0 }}>
          <Select allowClear placeholder="关系状态" style={{ width: 140 }} options={profitRelationStatusOptions} />
        </Form.Item>
        <Form.Item name="versionAuditStatus" style={{ marginBottom: 0 }}>
          <Select allowClear placeholder="版本审核" style={{ width: 140 }} options={auditStatusOptions} />
        </Form.Item>
        <Form.Item name="detailStatus" style={{ marginBottom: 0 }}>
          <Select allowClear placeholder="分润状态" style={{ width: 140 }} options={auditStatusOptions} />
        </Form.Item>
        <Form.Item name="chargebackStatus" style={{ marginBottom: 0 }}>
          <Select allowClear placeholder="回冲状态" style={{ width: 140 }} options={auditStatusOptions} />
        </Form.Item>
        <Form.Item name="confirmStatus" style={{ marginBottom: 0 }}>
          <Select allowClear placeholder="确认状态" style={{ width: 140 }} options={auditStatusOptions} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={handleResetSearch}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Tabs
        items={[
          { key: 'relation', label: '合伙关系', children: <ProTable<ProfitPartnerRelationRecord> cardBordered rowKey="id" columns={relationColumns} dataSource={filter(relations) as ProfitPartnerRelationRecord[]} loading={relationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openAction('新增合伙关系')}>新增关系</Button>]} /> },
          { key: 'version', label: '比例版本', children: <ProTable<ProfitRatioVersionRecord> cardBordered rowKey="id" columns={versionColumns} dataSource={filter(versions) as ProfitRatioVersionRecord[]} loading={versionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openAction('审核比例版本')}>审核版本</Button>]} /> },
          { key: 'detail', label: '分润明细', children: <ProTable<ProfitShareDetailRecord> cardBordered rowKey="id" columns={detailColumns} dataSource={filter(details) as ProfitShareDetailRecord[]} loading={detailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} /> },
          { key: 'chargeback', label: '退款回冲', children: <ProTable<ProfitChargebackRecord> cardBordered rowKey="id" columns={chargebackColumns} dataSource={filter(chargebacks) as ProfitChargebackRecord[]} loading={chargebackQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'confirm', label: '分润确认', children: <ProTable<ProfitConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as ProfitConfirmRecord[]} loading={confirmQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openAction('确认分润')}>确认分润</Button>]} /> },
          { key: 'payable', label: '合伙人应付', children: <ProTable<PartnerPayableSummaryRecord> cardBordered rowKey="partnerName" columns={payableColumns} dataSource={filter(payables) as PartnerPayableSummaryRecord[]} loading={payableQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} /> },
        ]}
      />

      <BusinessDetailModal title="分润明细详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('versionNo' in detail ? profitShareCenterDetailFields.version : 'detailNo' in detail && 'chargebackAmount' in detail ? profitShareCenterDetailFields.chargeback : 'detailNo' in detail ? profitShareCenterDetailFields.detail : 'confirmNo' in detail ? profitShareCenterDetailFields.confirm : profitShareCenterDetailFields.relation) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="分润操作"
        title={modalTitle}
        subtitle="把合伙关系、比例审核和分润确认拆成独立字段，避免单号和业务语义混用。"
        meta={[modalTitle || '分润操作', '财务结算']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          await actionMutation.mutateAsync(form.getFieldsValue());
          setModalVisible(false);
        }}
        width={1080}
        okText="保存分润操作"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SplitCellsOutlined />} title="操作对象" desc="先选择操作类型，再填写对应的关系、版本或结算单信息。">
              <div className="merchant-editor-fields">
                <Form.Item name="action" label="操作类型" rules={[{ required: true, message: '请选择操作类型' }]}><Select options={profitActionOptions} placeholder="请选择操作类型" /></Form.Item>
                {action === 'ADD_RELATION' ? (
                  <>
                    <Form.Item name="relationNo" label="关系编号" rules={[{ required: true, message: '请输入关系编号' }]}><Input placeholder="例如：REL-20260510-001" /></Form.Item>
                    <Form.Item name="status" label="关系状态" rules={[{ required: true, message: '请选择关系状态' }]}><Select options={profitRelationStatusOptions} placeholder="请选择关系状态" /></Form.Item>
                  </>
                ) : null}
                {action === 'AUDIT_VERSION' ? (
                  <>
                    <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入比例版本号' }]}><Input placeholder="例如：PRV-20260510-001" /></Form.Item>
                    <Form.Item name="relationNo" label="关系编号" rules={[{ required: true, message: '请输入关联关系编号' }]}><Input placeholder="例如：REL-20260510-001" /></Form.Item>
                    <Form.Item name="auditStatus" label="审核状态" rules={[{ required: true, message: '请选择审核状态' }]}><Select options={auditStatusOptions} placeholder="请选择审核状态" /></Form.Item>
                  </>
                ) : null}
                {action === 'CONFIRM_SHARE' ? (
                  <>
                    <Form.Item name="settlementBillNo" label="结算单号" rules={[{ required: true, message: '请输入结算单号' }]}><Input placeholder="例如：SETTLE-20260510-001" /></Form.Item>
                    <Form.Item name="confirmStatus" label="确认状态" rules={[{ required: true, message: '请选择确认状态' }]}><Select options={auditStatusOptions} placeholder="请选择确认状态" /></Form.Item>
                  </>
                ) : null}
              </div>
            </BusinessEditorSection>
            {action === 'ADD_RELATION' ? (
              <BusinessEditorSection icon={<TeamOutlined />} title="合伙关系" desc="新增关系时必须明确门店、合伙人、角色和当前分润比例。">
                <div className="merchant-editor-fields">
                  <Form.Item name="storeName" label="门店" rules={[{ required: true, message: '请输入门店名称' }]}><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                  <Form.Item name="partnerName" label="合伙人" rules={[{ required: true, message: '请输入合伙人' }]}><Input placeholder="例如：张三" /></Form.Item>
                  <Form.Item name="partnerRole" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={partnerRoleOptions} placeholder="请选择角色" /></Form.Item>
                  <Form.Item name="shareRatio" label="分润比例" rules={[{ required: true, message: '请输入分润比例' }]}><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="30" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {action === 'AUDIT_VERSION' ? (
              <BusinessEditorSection icon={<TeamOutlined />} title="比例版本" desc="审核比例版本时只维护版本比例和生效时间，关系编号必须来自已有关系。">
                <div className="merchant-editor-fields">
                  <Form.Item name="beforeRatio" label="原比例"><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="0" /></Form.Item>
                  <Form.Item name="afterRatio" label="新比例" rules={[{ required: true, message: '请输入新比例' }]}><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="30" /></Form.Item>
                  <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {action === 'CONFIRM_SHARE' ? (
              <BusinessEditorSection icon={<CheckCircleOutlined />} title="确认信息" desc="按结算单自动汇总合伙人分润，确认金额由后端分润明细生成。">
                <div className="merchant-editor-fields">
                  <Form.Item name="confirmer" label="确认人" rules={[{ required: true, message: '请输入确认人' }]}><Input placeholder="例如：财务管理员" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="备注" desc="记录本次操作说明，便于财务追溯。">
              <div className="merchant-editor-fields">
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：比例版本审核通过，进入本期结算" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ProfitShareDetailManagement;
