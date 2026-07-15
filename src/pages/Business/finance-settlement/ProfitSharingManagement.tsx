import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import {
  AccountBookOutlined,
  BankOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { partnerRoleOptions, profitRelationStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type ProfitConfirmRecord,
  type ProfitChargebackRecord,
  type ProfitPartnerRelationRecord,
  type ProfitRatioVersionRecord,
  type ProfitShareDetailRecord,
  type SettlementPayeeAccountRecord,
  type StoreRecord,
} from '@/services/backendService';
import { DateField, fromDatePickerValue, toDatePickerValue } from '@/utils/formControls';

const partnerSubjectTypeOptions = [
  { value: 'MERCHANT', label: '商户主体' },
  { value: 'STORE', label: '门店主体' },
  { value: 'PLATFORM', label: '平台主体' },
  { value: 'EXTERNAL', label: '外部合伙人' },
];

const ratioAuditStatusOptions = [
  { value: 'PENDING', label: '待审批' },
  { value: 'APPROVED', label: '已生效' },
  { value: 'REJECTED', label: '已驳回' },
];

const confirmStatusOptions = [
  { value: 'PENDING', label: '待确认' },
  { value: 'APPROVED', label: '已确认' },
  { value: 'REJECTED', label: '已驳回' },
];

const profitPayoutStatusOptions = [
  { value: 'NO_PAYABLE', label: '未到打款' },
  { value: 'WAIT_PAY', label: '待打款' },
  { value: 'PAID', label: '已打款' },
];

const accountTypeOptions = [
  { value: 'BANK', label: '银行账户' },
  { value: 'WECHAT', label: '微信账户' },
  { value: 'ALIPAY', label: '支付宝账户' },
  { value: 'OTHER', label: '其他账户' },
];

const accountVerificationOptions = [
  { value: 'PENDING', label: '待验证' },
  { value: 'VERIFIED', label: '已验证' },
  { value: 'REJECTED', label: '验证失败' },
];

const accountStatusOptions = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const chargebackStatusOptions = [
  { value: 'APPROVED', label: '已冲减待付款' },
  { value: 'PENDING', label: '已付款待追缴' },
];

const roleMap = buildValueEnum(partnerRoleOptions);
const relationStatusMap = buildValueEnum(profitRelationStatusOptions);
const subjectTypeMap = buildValueEnum(partnerSubjectTypeOptions);
const ratioAuditStatusMap = buildValueEnum(ratioAuditStatusOptions);
const confirmStatusMap = buildValueEnum(confirmStatusOptions);
const profitPayoutStatusMap = buildValueEnum(profitPayoutStatusOptions);
const accountTypeMap = buildValueEnum(accountTypeOptions);
const accountVerificationMap = buildValueEnum(accountVerificationOptions);
const accountStatusMap = buildValueEnum(accountStatusOptions);
const chargebackStatusMap = buildValueEnum(chargebackStatusOptions);

type AuditTarget = {
  kind: 'ratio-approve' | 'ratio-reject' | 'confirm-approve' | 'confirm-reject';
  id: number;
  title: string;
};

const ProfitSharingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [relationForm] = Form.useForm<Record<string, unknown>>();
  const [accountForm] = Form.useForm<Record<string, unknown>>();
  const [auditForm] = Form.useForm<Record<string, unknown>>();
  const [payoutForm] = Form.useForm<Record<string, unknown>>();
  const [chargebackForm] = Form.useForm<Record<string, unknown>>();
  const relationSubjectType = Form.useWatch('partnerSubjectType', relationForm);
  const relationSubjectId = Form.useWatch('partnerSubjectId', relationForm);
  const relationSubjectName = Form.useWatch('partnerSubjectName', relationForm);
  const chargebackDetailId = Form.useWatch('profitShareDetailId', chargebackForm);
  const [relationKeyword, setRelationKeyword] = useState('');
  const [versionKeyword, setVersionKeyword] = useState('');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [payoutKeyword, setPayoutKeyword] = useState('');
  const [accountKeyword, setAccountKeyword] = useState('');
  const [chargebackKeyword, setChargebackKeyword] = useState('');
  const [editingRelation, setEditingRelation] = useState<ProfitPartnerRelationRecord | null>(null);
  const [relationEditorOpen, setRelationEditorOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SettlementPayeeAccountRecord | null>(null);
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<ProfitConfirmRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<ProfitConfirmRecord | null>(null);
  const [chargebackTarget, setChargebackTarget] = useState<ProfitConfirmRecord | null>(null);

  const storeQuery = useQuery({
    queryKey: ['profitStores'],
    queryFn: async () => (await api.store.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const relationQuery = useQuery({
    queryKey: ['profitPartnerRelations', relationKeyword],
    queryFn: async () => (await api.profitPartnerRelation.page({ pageNum: 1, pageSize: 500, keyword: relationKeyword || undefined })).data,
  });
  const versionQuery = useQuery({
    queryKey: ['profitRatioVersions', versionKeyword],
    queryFn: async () => (await api.profitRatioVersion.page({ pageNum: 1, pageSize: 500, keyword: versionKeyword || undefined })).data,
  });
  const confirmQuery = useQuery({
    queryKey: ['profitConfirms', confirmKeyword],
    queryFn: async () => (await api.profitConfirm.page({ pageNum: 1, pageSize: 500, keyword: confirmKeyword || undefined })).data,
  });
  const payoutQuery = useQuery({
    queryKey: ['profitPayouts', payoutKeyword],
    queryFn: async () => (await api.profitConfirm.page({ pageNum: 1, pageSize: 500, keyword: payoutKeyword || undefined, confirmStatus: 'APPROVED' })).data,
  });
  const accountQuery = useQuery({
    queryKey: ['settlementPayeeAccounts', accountKeyword],
    queryFn: async () => (await api.settlementPayeeAccount.page({ pageNum: 1, pageSize: 500, keyword: accountKeyword || undefined })).data,
  });
  const chargebackQuery = useQuery({
    queryKey: ['profitChargebacks', chargebackKeyword],
    queryFn: async () => (await api.profitChargeback.page({ pageNum: 1, pageSize: 500, keyword: chargebackKeyword || undefined })).data,
  });
  const confirmDetailQuery = useQuery({
    queryKey: ['profitConfirmDetails', detailTarget?.id],
    enabled: !!detailTarget,
    queryFn: async () => (await api.profitConfirm.details(detailTarget!.id)).data,
  });
  const chargebackDetailQuery = useQuery({
    queryKey: ['profitConfirmChargebackDetails', chargebackTarget?.id],
    enabled: !!chargebackTarget,
    queryFn: async () => (await api.profitConfirm.details(chargebackTarget!.id)).data,
  });

  const stores = (storeQuery.data?.records || []) as StoreRecord[];
  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const versions = (versionQuery.data?.records || []) as ProfitRatioVersionRecord[];
  const confirms = (confirmQuery.data?.records || []) as ProfitConfirmRecord[];
  const payoutConfirms = (payoutQuery.data?.records || []) as ProfitConfirmRecord[];
  const accounts = useMemo(() => (accountQuery.data?.records || []) as SettlementPayeeAccountRecord[], [accountQuery.data]);
  const chargebacks = (chargebackQuery.data?.records || []) as ProfitChargebackRecord[];
  const confirmDetails = (confirmDetailQuery.data || []) as ProfitShareDetailRecord[];
  const chargebackDetails = (chargebackDetailQuery.data || []) as ProfitShareDetailRecord[];
  const selectedChargebackDetail = chargebackDetails.find((item) => item.id === chargebackDetailId);

  const accountById = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const verifiedAccountOptions = useMemo(() => accounts
    .filter((item) => item.status === 'ENABLED'
      && item.verificationStatus === 'VERIFIED'
      && item.subjectType === relationSubjectType
      && (relationSubjectType === 'EXTERNAL'
        ? item.subjectName === relationSubjectName
        : item.subjectId === relationSubjectId))
    .map((item) => ({
      value: item.id,
      label: `${item.subjectName} / ${item.accountName} / ${item.accountReference}`,
    })), [accounts, relationSubjectId, relationSubjectName, relationSubjectType]);

  const saveRelationMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingRelation
      ? api.profitPartnerRelation.edit({ ...values, id: editingRelation.id })
      : api.profitPartnerRelation.add(values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] }),
        queryClient.invalidateQueries({ queryKey: ['profitRatioVersions'] }),
      ]);
      message.success(editingRelation ? '合伙关系已更新，比例变更已进入审批' : '合伙关系已创建，比例已进入审批');
      setRelationEditorOpen(false);
      setEditingRelation(null);
      relationForm.resetFields();
    },
  });

  const closeRelationMutation = useMutation({
    mutationFn: (id: number) => api.profitPartnerRelation.close(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] });
      message.success('合伙关系已结束');
    },
  });

  const auditMutation = useMutation({
    mutationFn: async ({ target, values }: { target: AuditTarget; values: Record<string, unknown> }) => {
      if (target.kind === 'ratio-approve') return api.profitRatioVersion.approve(target.id, { auditor: values.operator, remark: values.remark });
      if (target.kind === 'ratio-reject') return api.profitRatioVersion.reject(target.id, { auditor: values.operator, remark: values.remark });
      if (target.kind === 'confirm-approve') return api.profitConfirm.approve(target.id, values);
      return api.profitConfirm.reject(target.id, values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profitRatioVersions'] }),
        queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] }),
        queryClient.invalidateQueries({ queryKey: ['profitConfirms'] }),
        queryClient.invalidateQueries({ queryKey: ['profitPayouts'] }),
      ]);
      message.success('审批处理已完成');
      setAuditTarget(null);
      auditForm.resetFields();
    },
  });

  const payoutMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Record<string, unknown> }) => api.profitConfirm.payout(id, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profitConfirms'] }),
        queryClient.invalidateQueries({ queryKey: ['profitPayouts'] }),
      ]);
      message.success('打款结果已登记');
      setPayoutTarget(null);
      payoutForm.resetFields();
    },
  });

  const saveAccountMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingAccount
      ? api.settlementPayeeAccount.edit({ ...values, id: editingAccount.id })
      : api.settlementPayeeAccount.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settlementPayeeAccounts'] });
      message.success(editingAccount ? '收款账户已更新' : '收款账户已创建');
      setAccountEditorOpen(false);
      setEditingAccount(null);
      accountForm.resetFields();
    },
  });

  const disableAccountMutation = useMutation({
    mutationFn: (id: number) => api.settlementPayeeAccount.disable(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settlementPayeeAccounts'] });
      message.success('收款账户已停用');
    },
  });

  const chargebackMutation = useMutation({
    mutationFn: ({ confirmId, values }: { confirmId: number; values: Record<string, unknown> }) => api.profitChargeback.create(confirmId, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profitChargebacks'] }),
        queryClient.invalidateQueries({ queryKey: ['profitConfirms'] }),
        queryClient.invalidateQueries({ queryKey: ['profitPayouts'] }),
      ]);
      message.success('分润回冲已创建');
      setChargebackTarget(null);
      chargebackForm.resetFields();
    },
  });

  const openRelationEditor = (record?: ProfitPartnerRelationRecord) => {
    setEditingRelation(record || null);
    relationForm.resetFields();
    relationForm.setFieldsValue(record ? {
      ...record,
      effectiveStart: toDatePickerValue(record.effectiveStart) || record.effectiveStart,
      effectiveEnd: toDatePickerValue(record.effectiveEnd) || record.effectiveEnd,
    } : {
      partnerSubjectType: 'EXTERNAL',
      partnerRole: 'PARTNER',
      shareRatio: 0,
    });
    setRelationEditorOpen(true);
  };

  const openAccountEditor = (record?: SettlementPayeeAccountRecord) => {
    setEditingAccount(record || null);
    accountForm.resetFields();
    accountForm.setFieldsValue(record ? { ...record } as Parameters<typeof accountForm.setFieldsValue>[0] : {
      subjectType: 'EXTERNAL',
      accountType: 'BANK',
      verificationStatus: 'PENDING',
      status: 'ENABLED',
    });
    setAccountEditorOpen(true);
  };

  const openAudit = (target: AuditTarget) => {
    auditForm.resetFields();
    setAuditTarget(target);
  };

  const relationColumns: ProColumns<ProfitPartnerRelationRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙主体 / 关系编号' } },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false },
    { title: '主体类型', dataIndex: 'partnerSubjectType', width: 120, search: false, render: (_, record) => renderStatusTag(record.partnerSubjectType, subjectTypeMap) },
    { title: '角色', dataIndex: 'partnerRole', width: 120, search: false, render: (_, record) => renderStatusTag(record.partnerRole, roleMap) },
    { title: '当前比例', dataIndex: 'shareRatio', width: 110, search: false, render: (_, record) => `${Number(record.shareRatio || 0)}%` },
    {
      title: '收款账户',
      dataIndex: 'settleAccountId',
      width: 240,
      search: false,
      render: (_, record) => {
        const account = record.settleAccountId ? accountById.get(record.settleAccountId) : undefined;
        return account ? `${account.accountName} / ${account.accountReference}` : '-';
      },
    },
    { title: '生效周期', dataIndex: 'effectiveStart', width: 220, search: false, render: (_, record) => `${record.effectiveStart || '立即'} 至 ${record.effectiveEnd || '长期'}` },
    { title: '状态', dataIndex: 'status', width: 110, search: false, render: (_, record) => renderStatusTag(record.status, relationStatusMap) },
    {
      title: '操作',
      width: 190,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openRelationEditor(record)}>编辑</Button>
          <Button
            size="small"
            danger
            disabled={record.status === 'CLOSED'}
            loading={closeRelationMutation.isPending}
            onClick={() => showBusinessConfirm({
              title: '结束合伙关系',
              content: `结束「${record.storeName} / ${record.partnerSubjectName}」后，不再参与后续交易分润。`,
              okText: '确认结束',
              danger: true,
              onOk: () => closeRelationMutation.mutate(record.id),
            })}
          >
            结束
          </Button>
        </Space>
      ),
    },
  ];

  const versionColumns: ProColumns<ProfitRatioVersionRecord>[] = [
    { title: '版本号', dataIndex: 'versionNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '版本号 / 关系编号 / 备注' } },
    { title: '关系编号', dataIndex: 'relationNo', width: 180, search: false },
    { title: '比例变更', dataIndex: 'afterRatio', width: 140, search: false, render: (_, record) => `${Number(record.beforeRatio || 0)}% -> ${Number(record.afterRatio || 0)}%` },
    { title: '计划生效', dataIndex: 'effectiveFrom', width: 180, search: false, render: (_, record) => formatDateTime(record.effectiveFrom) },
    { title: '审批状态', dataIndex: 'auditStatus', width: 110, search: false, render: (_, record) => renderStatusTag(record.auditStatus, ratioAuditStatusMap) },
    { title: '审批人', dataIndex: 'auditor', width: 120, search: false },
    { title: '备注', dataIndex: 'remark', width: 220, search: false },
    {
      title: '操作',
      width: 170,
      search: false,
      render: (_, record) => record.auditStatus === 'PENDING' ? (
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openAudit({ kind: 'ratio-approve', id: record.id, title: `通过比例版本 ${record.versionNo}` })}>通过</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => openAudit({ kind: 'ratio-reject', id: record.id, title: `驳回比例版本 ${record.versionNo}` })}>驳回</Button>
        </Space>
      ) : '-',
    },
  ];

  const confirmColumns: ProColumns<ProfitConfirmRecord>[] = [
    { title: '确认单号', dataIndex: 'confirmNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '确认单 / 结算单 / 合伙主体' } },
    { title: '结算单号', dataIndex: 'settlementBillNo', width: 180, search: false },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false },
    { title: '确认金额', dataIndex: 'confirmAmount', width: 120, search: false, render: (_, record) => formatAmount(record.confirmAmount) },
    { title: '已回冲', dataIndex: 'chargebackAmount', width: 110, search: false, render: (_, record) => formatAmount(record.chargebackAmount) },
    { title: '确认状态', dataIndex: 'confirmStatus', width: 110, search: false, render: (_, record) => renderStatusTag(record.confirmStatus, confirmStatusMap) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 110, search: false, render: (_, record) => renderStatusTag(record.payoutStatus, profitPayoutStatusMap) },
    { title: '生成时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 310,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetailTarget(record)}>明细</Button>
          {record.confirmStatus === 'PENDING' ? <>
            <Button size="small" type="primary" onClick={() => openAudit({ kind: 'confirm-approve', id: record.id, title: `通过分润确认单 ${record.confirmNo}` })}>通过</Button>
            <Button size="small" danger onClick={() => openAudit({ kind: 'confirm-reject', id: record.id, title: `驳回分润确认单 ${record.confirmNo}` })}>驳回</Button>
          </> : null}
          {record.confirmStatus === 'APPROVED' ? <Button size="small" danger onClick={() => { chargebackForm.resetFields(); setChargebackTarget(record); }}>回冲</Button> : null}
        </Space>
      ),
    },
  ];

  const payoutColumns: ProColumns<ProfitConfirmRecord>[] = [
    { title: '确认单号', dataIndex: 'confirmNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '确认单 / 结算单 / 合伙主体 / 流水号' } },
    { title: '结算单号', dataIndex: 'settlementBillNo', width: 180, search: false },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false },
    { title: '应付金额', dataIndex: 'confirmAmount', width: 120, search: false, render: (_, record) => formatAmount(Number(record.confirmAmount || 0) - Number(record.chargebackAmount || 0)) },
    { title: '实付金额', dataIndex: 'paidAmount', width: 120, search: false, render: (_, record) => formatAmount(record.paidAmount) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 110, search: false, render: (_, record) => renderStatusTag(record.payoutStatus, profitPayoutStatusMap) },
    { title: '打款流水号', dataIndex: 'payoutReference', width: 180, search: false },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, search: false, render: (_, record) => formatDateTime(record.paidAt) },
    {
      title: '操作',
      width: 130,
      search: false,
      render: (_, record) => record.payoutStatus === 'WAIT_PAY' ? (
        <Button
          size="small"
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => {
            setPayoutTarget(record);
            payoutForm.setFieldsValue({ paidAmount: Number(record.confirmAmount || 0) - Number(record.chargebackAmount || 0) });
          }}
        >
          登记打款
        </Button>
      ) : <Button size="small" onClick={() => setDetailTarget(record)}>明细</Button>,
    },
  ];

  const accountColumns: ProColumns<SettlementPayeeAccountRecord>[] = [
    { title: '账户编号', dataIndex: 'accountNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '主体 / 户名 / 账户标识' } },
    { title: '收款主体', dataIndex: 'subjectName', width: 180, search: false },
    { title: '账户类型', dataIndex: 'accountType', width: 120, search: false, render: (_, record) => renderStatusTag(record.accountType, accountTypeMap) },
    { title: '收款户名', dataIndex: 'accountName', width: 180, search: false },
    { title: '开户行', dataIndex: 'bankName', width: 160, search: false },
    { title: '账户标识', dataIndex: 'accountReference', width: 220, search: false },
    { title: '验证状态', dataIndex: 'verificationStatus', width: 110, search: false, render: (_, record) => renderStatusTag(record.verificationStatus, accountVerificationMap) },
    { title: '状态', dataIndex: 'status', width: 100, search: false, render: (_, record) => renderStatusTag(record.status, accountStatusMap) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openAccountEditor(record)}>编辑</Button>
          <Button
            size="small"
            danger
            disabled={record.status === 'DISABLED'}
            loading={disableAccountMutation.isPending}
            onClick={() => showBusinessConfirm({
              title: '停用收款账户',
              content: `停用「${record.accountName} / ${record.accountReference}」后，新合伙关系不能再选择该账户。`,
              okText: '确认停用',
              danger: true,
              onOk: () => disableAccountMutation.mutate(record.id),
            })}
          >
            停用
          </Button>
        </Space>
      ),
    },
  ];

  const chargebackColumns: ProColumns<ProfitChargebackRecord>[] = [
    { title: '回冲单号', dataIndex: 'chargebackNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '回冲单 / 退款单 / 分润明细 / 合伙人' } },
    { title: '退款单号', dataIndex: 'refundNo', width: 180, search: false },
    { title: '分润明细', dataIndex: 'detailNo', width: 180, search: false },
    { title: '合伙人', dataIndex: 'partnerName', width: 160, search: false },
    { title: '回冲金额', dataIndex: 'chargebackAmount', width: 120, search: false, render: (_, record) => formatAmount(record.chargebackAmount) },
    { title: '处理状态', dataIndex: 'status', width: 130, search: false, render: (_, record) => renderStatusTag(record.status, chargebackStatusMap) },
    { title: '回冲原因', dataIndex: 'reason', width: 220, search: false },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
  ];

  const pendingVersions = versions.filter((item) => item.auditStatus === 'PENDING').length;
  const pendingConfirms = confirms.filter((item) => item.confirmStatus === 'PENDING').length;
  const waitPayAmount = payoutConfirms
    .filter((item) => item.payoutStatus === 'WAIT_PAY')
    .reduce((sum, item) => sum + Number(item.confirmAmount || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="合伙人分润" subtitle="按待办顺序处理关系、比例审批、确认和打款。" icon={<AccountBookOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="生效合伙关系" value={relations.filter((item) => item.status === 'EFFECTIVE').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审比例版本" value={pendingVersions} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认分润单" value={pendingConfirms} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待打款金额" value={formatAmount(waitPayAmount)} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'relations',
            label: '合伙关系',
            children: <ProTable<ProfitPartnerRelationRecord>
              cardBordered
              rowKey="id"
              columns={relationColumns}
              dataSource={relations}
              loading={relationQuery.isLoading || accountQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1600 }}
              toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openRelationEditor()}>新建合伙关系</Button>]}
              onSubmit={(values) => setRelationKeyword(String(values.keyword || ''))}
              onReset={() => setRelationKeyword('')}
            />,
          },
          {
            key: 'versions',
            label: `比例审批 (${pendingVersions})`,
            children: <ProTable<ProfitRatioVersionRecord>
              cardBordered
              rowKey="id"
              columns={versionColumns}
              dataSource={versions}
              loading={versionQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
              onSubmit={(values) => setVersionKeyword(String(values.keyword || ''))}
              onReset={() => setVersionKeyword('')}
            />,
          },
          {
            key: 'confirms',
            label: `分润确认 (${pendingConfirms})`,
            children: <ProTable<ProfitConfirmRecord>
              cardBordered
              rowKey="id"
              columns={confirmColumns}
              dataSource={confirms}
              loading={confirmQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1600 }}
              onSubmit={(values) => setConfirmKeyword(String(values.keyword || ''))}
              onReset={() => setConfirmKeyword('')}
            />,
          },
          {
            key: 'payouts',
            label: '待打款',
            children: <ProTable<ProfitConfirmRecord>
              cardBordered
              rowKey="id"
              columns={payoutColumns}
              dataSource={payoutConfirms}
              loading={payoutQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1600 }}
              onSubmit={(values) => setPayoutKeyword(String(values.keyword || ''))}
              onReset={() => setPayoutKeyword('')}
            />,
          },
          {
            key: 'accounts',
            label: '收款账户',
            children: <ProTable<SettlementPayeeAccountRecord>
              cardBordered
              rowKey="id"
              columns={accountColumns}
              dataSource={accounts}
              loading={accountQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1600 }}
              toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openAccountEditor()}>新建收款账户</Button>]}
              onSubmit={(values) => setAccountKeyword(String(values.keyword || ''))}
              onReset={() => setAccountKeyword('')}
            />,
          },
          {
            key: 'chargebacks',
            label: '回冲记录',
            children: <ProTable<ProfitChargebackRecord>
              cardBordered
              rowKey="id"
              columns={chargebackColumns}
              dataSource={chargebacks}
              loading={chargebackQuery.isLoading}
              search={{ labelWidth: 'auto', defaultCollapsed: false }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1500 }}
              onSubmit={(values) => setChargebackKeyword(String(values.keyword || ''))}
              onReset={() => setChargebackKeyword('')}
            />,
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="合伙关系"
        title={editingRelation ? `编辑 ${editingRelation.partnerSubjectName}` : '新建合伙关系'}
        subtitle="保存后，新增或调整的比例统一进入审批，不直接覆盖生效比例。"
        meta={[editingRelation ? '调整关系' : '新增关系', '收入比例分润']}
        open={relationEditorOpen}
        width={960}
        okText={editingRelation ? '保存并提交比例审批' : '创建并提交比例审批'}
        confirmLoading={saveRelationMutation.isPending}
        onCancel={() => { setRelationEditorOpen(false); setEditingRelation(null); relationForm.resetFields(); }}
        onOk={async () => {
          const values = await relationForm.validateFields();
          await saveRelationMutation.mutateAsync({
            ...values,
            distributionMode: 'REVENUE_RATIO',
            effectiveStart: fromDatePickerValue(values.effectiveStart as never) || values.effectiveStart,
            effectiveEnd: fromDatePickerValue(values.effectiveEnd as never) || values.effectiveEnd,
          });
        }}
      >
        <Form
          form={relationForm}
          layout="vertical"
          className="merchant-editor-form"
          onValuesChange={(changed) => {
            if ('partnerSubjectType' in changed || 'partnerSubjectId' in changed || 'partnerSubjectName' in changed) {
              relationForm.setFieldValue('settleAccountId', undefined);
            }
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="归属关系" desc="选择门店和合伙主体。门店名称由系统带出。">
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="分润归属门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select showSearch optionFilterProp="label" loading={storeQuery.isLoading} options={stores.map((item) => ({ value: item.id, label: `${item.storeName} (${item.storeCode})` }))} placeholder="选择门店" />
                </Form.Item>
                <Form.Item name="partnerSubjectType" label="合伙主体类型" rules={[{ required: true, message: '请选择主体类型' }]}>
                  <Select options={partnerSubjectTypeOptions} />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(previous, current) => previous.partnerSubjectType !== current.partnerSubjectType}>
                  {({ getFieldValue }) => getFieldValue('partnerSubjectType') !== 'EXTERNAL' ? (
                    <Form.Item name="partnerSubjectId" label="合伙主体ID" rules={[{ required: true, message: '请输入主体ID' }]}>
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  ) : null}
                </Form.Item>
                <Form.Item name="partnerSubjectName" label="合伙主体名称" rules={[{ required: true, message: '请输入合伙主体名称' }]}><Input /></Form.Item>
                <Form.Item name="partnerRole" label="合伙角色" rules={[{ required: true, message: '请选择合伙角色' }]}><Select options={partnerRoleOptions} /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AccountBookOutlined />} title="比例与账户" desc="只支持收入比例分润，收款账户必须已验证并启用。">
              <div className="merchant-editor-fields">
                <Form.Item name="shareRatio" label="收入分润比例" rules={[{ required: true, message: '请输入比例' }]}><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="settleAccountId" label="收款账户" rules={[{ required: true, message: '请选择已验证的收款账户' }]}>
                  <Select showSearch optionFilterProp="label" options={verifiedAccountOptions} placeholder="选择已验证账户" />
                </Form.Item>
                <Form.Item name="effectiveStart" label="计划开始日期"><DateField /></Form.Item>
                <Form.Item name="effectiveEnd" label="关系结束日期"><DateField /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="收款账户"
        title={editingAccount ? `编辑 ${editingAccount.accountName}` : '新建收款账户'}
        subtitle="账户验证通过后，才能用于合伙关系和打款。"
        meta={[editingAccount ? '编辑账户' : '新增账户', '结构化账户']}
        open={accountEditorOpen}
        width={900}
        okText="保存账户"
        confirmLoading={saveAccountMutation.isPending}
        onCancel={() => { setAccountEditorOpen(false); setEditingAccount(null); accountForm.resetFields(); }}
        onOk={async () => saveAccountMutation.mutateAsync(await accountForm.validateFields())}
      >
        <Form form={accountForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<BankOutlined />} title="账户信息" desc="明确收款主体、户名和账户标识。">
              <div className="merchant-editor-fields">
                <Form.Item name="subjectType" label="主体类型" rules={[{ required: true, message: '请选择主体类型' }]}><Select options={partnerSubjectTypeOptions} /></Form.Item>
                <Form.Item
                  name="subjectId"
                  label="主体ID"
                  dependencies={['subjectType']}
                  rules={[({ getFieldValue }) => ({
                    validator: (_, value) => getFieldValue('subjectType') === 'EXTERNAL' || value
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入主体ID')),
                  })]}
                >
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="subjectName" label="主体名称" rules={[{ required: true, message: '请输入主体名称' }]}><Input /></Form.Item>
                <Form.Item name="accountType" label="账户类型" rules={[{ required: true, message: '请选择账户类型' }]}><Select options={accountTypeOptions} /></Form.Item>
                <Form.Item name="accountName" label="收款户名" rules={[{ required: true, message: '请输入收款户名' }]}><Input /></Form.Item>
                <Form.Item name="bankName" label="开户行"><Input /></Form.Item>
                <Form.Item name="accountReference" label="账户标识" rules={[{ required: true, message: '请输入卡号或账号' }]}><Input /></Form.Item>
                <Form.Item name="paymentChannel" label="打款渠道"><Input placeholder="例如：线下银行转账" /></Form.Item>
                <Form.Item name="verificationStatus" label="验证状态" rules={[{ required: true, message: '请选择验证状态' }]}><Select options={accountVerificationOptions} /></Form.Item>
                <Form.Item name="status" label="账户状态" rules={[{ required: true, message: '请选择账户状态' }]}><Select options={accountStatusOptions} /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="审批处理"
        title={auditTarget?.title || '审批处理'}
        subtitle="审批结果会决定比例是否生效，或确认单是否进入待打款。"
        meta={[auditTarget?.kind.includes('reject') ? '驳回' : '通过']}
        open={!!auditTarget}
        width={680}
        okText={auditTarget?.kind.includes('reject') ? '确认驳回' : '确认通过'}
        confirmLoading={auditMutation.isPending}
        onCancel={() => { setAuditTarget(null); auditForm.resetFields(); }}
        onOk={async () => {
          if (!auditTarget) return;
          const values = await auditForm.validateFields();
          await auditMutation.mutateAsync({ target: auditTarget, values });
        }}
      >
        <Form form={auditForm} layout="vertical">
          <Form.Item name="operator" label="审批人" rules={[{ required: true, message: '请输入审批人' }]}><Input /></Form.Item>
          <Form.Item name="remark" label="审批意见" rules={auditTarget?.kind.includes('reject') ? [{ required: true, message: '请输入驳回原因' }] : undefined}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="线下打款"
        title={payoutTarget ? `登记打款 ${payoutTarget.confirmNo}` : '登记打款'}
        subtitle="登记银行或第三方渠道的真实流水，确认金额不会在此修改。"
        meta={[
          payoutTarget?.partnerSubjectName || '合伙主体',
          formatAmount(Number(payoutTarget?.confirmAmount || 0) - Number(payoutTarget?.chargebackAmount || 0)),
        ]}
        open={!!payoutTarget}
        width={720}
        okText="确认已打款"
        confirmLoading={payoutMutation.isPending}
        onCancel={() => { setPayoutTarget(null); payoutForm.resetFields(); }}
        onOk={async () => {
          if (!payoutTarget) return;
          await payoutMutation.mutateAsync({ id: payoutTarget.id, values: await payoutForm.validateFields() });
        }}
      >
        <Form form={payoutForm} layout="vertical">
          <Form.Item name="paidAmount" label="实付金额" rules={[{ required: true, message: '请输入实付金额' }]}><InputNumber disabled precision={2} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="payoutReference" label="打款流水号" rules={[{ required: true, message: '请输入真实打款流水号' }]}><Input /></Form.Item>
          <Form.Item name="payoutVoucherUrl" label="打款凭证地址"><Input /></Form.Item>
          <Form.Item name="remark" label="打款备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="退款回冲"
        title={chargebackTarget ? `创建回冲 ${chargebackTarget.confirmNo}` : '创建回冲'}
        subtitle="未打款确认单直接冲减应付；已打款确认单进入待追缴记录。"
        meta={[chargebackTarget?.partnerSubjectName || '合伙主体']}
        open={!!chargebackTarget}
        width={760}
        okText="确认创建回冲"
        confirmLoading={chargebackMutation.isPending}
        onCancel={() => { setChargebackTarget(null); chargebackForm.resetFields(); }}
        onOk={async () => {
          if (!chargebackTarget) return;
          await chargebackMutation.mutateAsync({ confirmId: chargebackTarget.id, values: await chargebackForm.validateFields() });
        }}
      >
        <Form form={chargebackForm} layout="vertical">
          <Form.Item name="profitShareDetailId" label="原分润明细" rules={[{ required: true, message: '请选择原分润明细' }]}>
            <Select
              loading={chargebackDetailQuery.isLoading}
              options={chargebackDetails.map((item) => ({
                value: item.id,
                label: `${item.detailNo} / ${item.serviceOrderNo || '-'} / 可回冲 ${formatAmount(Number(item.shareAmount || 0) - Number(item.refundAmount || 0))}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="refundNo" label="关联退款单号" rules={[{ required: true, message: '请输入退款单号' }]}><Input /></Form.Item>
          <Form.Item name="chargebackAmount" label="回冲金额" rules={[{ required: true, message: '请输入回冲金额' }]}>
            <InputNumber
              min={0.01}
              max={selectedChargebackDetail ? Number(selectedChargebackDetail.shareAmount || 0) - Number(selectedChargebackDetail.refundAmount || 0) : undefined}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="reason" label="回冲原因" rules={[{ required: true, message: '请输入回冲原因' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title={detailTarget ? `分润明细 ${detailTarget.confirmNo}` : '分润明细'} open={!!detailTarget} onCancel={() => setDetailTarget(null)} width={980}>
        <ProTable<ProfitShareDetailRecord>
          rowKey="id"
          search={false}
          options={false}
          loading={confirmDetailQuery.isLoading}
          pagination={false}
          dataSource={confirmDetails}
          columns={[
            { title: '明细号', dataIndex: 'detailNo', width: 180 },
            { title: '服务订单', dataIndex: 'serviceOrderNo', width: 180 },
            { title: '门店', dataIndex: 'storeName', width: 160 },
            { title: '分润基数', dataIndex: 'baseAmount', width: 120, render: (_, record) => formatAmount(record.baseAmount) },
            { title: '比例', dataIndex: 'shareRatio', width: 90, render: (_, record) => `${Number(record.shareRatio || 0)}%` },
            { title: '应分金额', dataIndex: 'shareAmount', width: 120, render: (_, record) => formatAmount(record.shareAmount) },
            { title: '状态', dataIndex: 'status', width: 100 },
          ]}
          scroll={{ x: 1000 }}
        />
      </BusinessDetailModal>
    </div>
  );
};

export default ProfitSharingManagement;
