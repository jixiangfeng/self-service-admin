import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, BankOutlined, ContactsOutlined, DeleteOutlined, EditOutlined, FileProtectOutlined, PlusOutlined, SolutionOutlined, SyncOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  merchantContractStatusOptions,
  qualificationTypeOptions,
  settlementCycleOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  MerchantChangeLogRecord,
  MerchantContactRecord,
  MerchantContractRecord,
  MerchantQualificationRecord,
  MerchantSettlementAccountRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import { DateField, DateTimeField, fromDatePickerValue, fromDateTimePickerValue, toDatePickerValue, toDateTimePickerValue } from '@/utils/formControls';

type ProfileTab = 'contact' | 'qualification' | 'contract' | 'account' | 'change';
type EditableRecord = MerchantContactRecord | MerchantContractRecord | MerchantSettlementAccountRecord | MerchantQualificationRecord | MerchantChangeLogRecord;
type ProfileSearchValues = { keyword?: string; merchantId?: number };

const auditStatusMap = buildValueEnum(auditStatusOptions);
const contractStatusMap = buildValueEnum(merchantContractStatusOptions);
const qualificationTypeMap = buildValueEnum(qualificationTypeOptions);
const settlementCycleMap = buildValueEnum(settlementCycleOptions);
const primaryFlagMap = {
  1: { color: 'success', text: '是' },
  0: { color: 'default', text: '否' },
};

const contactTypeOptions = [
  { value: 'PRIMARY', label: '主联系人' },
  { value: 'FINANCE', label: '财务联系人' },
  { value: 'OPERATION', label: '运营联系人' },
  { value: 'LEGAL', label: '法务联系人' },
];

const accountStatusOptions = [
  { value: 'ACTIVE', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const changeTypeOptions = [
  { value: 'CONTACT', label: '联系人变更' },
  { value: 'QUALIFICATION', label: '资质变更' },
  { value: 'CONTRACT', label: '合同变更' },
  { value: 'ACCOUNT', label: '结算账户变更' },
];

const profileTabMeta: Record<ProfileTab, { eyebrow: string; createTitle: string; editTitle: string; subtitle: string; sectionTitle: string; sectionDesc: string; icon: React.ReactNode; meta: string }> = {
  contact: {
    eyebrow: '联系人档案维护',
    createTitle: '新增联系人',
    editTitle: '编辑联系人',
    subtitle: '维护商户运营、财务、法务等联系人，保证异常处理和日常通知有明确责任人。',
    sectionTitle: '联系人信息',
    sectionDesc: '选择所属商户并录入联系人类型、联系方式和主联系人标记。',
    icon: <ContactsOutlined />,
    meta: '联系人',
  },
  qualification: {
    eyebrow: '资质档案维护',
    createTitle: '新增资质',
    editTitle: '编辑资质',
    subtitle: '沉淀商户营业执照、法人证件和经营许可等资质材料，支持审核和到期跟进。',
    sectionTitle: '资质材料',
    sectionDesc: '录入资质编号、文件地址、审核状态和有效期，保证资料可追溯。',
    icon: <FileProtectOutlined />,
    meta: '资质',
  },
  contract: {
    eyebrow: '合同档案维护',
    createTitle: '新增合同',
    editTitle: '编辑合同',
    subtitle: '维护商户合同编号、履约周期、结算周期和审核状态，支撑财务对账和合作管理。',
    sectionTitle: '合同信息',
    sectionDesc: '配置合同主体、合同周期、结算周期和当前履约状态。',
    icon: <AuditOutlined />,
    meta: '合同',
  },
  account: {
    eyebrow: '结算账户维护',
    createTitle: '新增结算账户',
    editTitle: '编辑结算账户',
    subtitle: '维护商户收款账户和审核状态，保证结算打款信息完整。',
    sectionTitle: '账户信息',
    sectionDesc: '录入户名、账号、开户行、生效日期和账户状态。',
    icon: <BankOutlined />,
    meta: '结算账户',
  },
  change: {
    eyebrow: '商户变更维护',
    createTitle: '新增变更记录',
    editTitle: '编辑变更记录',
    subtitle: '记录商户关键资料的变更前后内容、操作人和变更时间，形成审计闭环。',
    sectionTitle: '变更内容',
    sectionDesc: '填写变更单号、变更类型、变更前后内容和操作信息。',
    icon: <SyncOutlined />,
    meta: '变更日志',
  },
};


const normalizeProfilePayload = (payload: Record<string, unknown>, tab: ProfileTab) => {
  const next = { ...payload };
  if (tab === 'qualification') {
    next.expireAt = fromDatePickerValue(next.expireAt as any) || next.expireAt;
  }
  if (tab === 'contract') {
    next.startAt = fromDatePickerValue(next.startAt as any) || next.startAt;
    next.endAt = fromDatePickerValue(next.endAt as any) || next.endAt;
  }
  if (tab === 'account') {
    next.effectiveAt = fromDatePickerValue(next.effectiveAt as any) || next.effectiveAt;
  }
  if (tab === 'change') {
    next.changedAt = fromDateTimePickerValue(next.changedAt as any) || next.changedAt;
  }
  return next;
};

const normalizeProfileFormRecord = (record: EditableRecord, tab: ProfileTab) => {
  const next = { ...(record as unknown as Record<string, unknown>) };
  if (tab === 'qualification') next.expireAt = toDatePickerValue(next.expireAt) || next.expireAt;
  if (tab === 'contract') {
    next.startAt = toDatePickerValue(next.startAt) || next.startAt;
    next.endAt = toDatePickerValue(next.endAt) || next.endAt;
  }
  if (tab === 'account') next.effectiveAt = toDatePickerValue(next.effectiveAt) || next.effectiveAt;
  if (tab === 'change') next.changedAt = toDateTimePickerValue(next.changedAt) || next.changedAt;
  return next;
};

const profileDetailFields: Record<ProfileTab, DetailField<any>[]> = {
  contact: [
    { name: 'merchantName', label: '商户' },
    { name: 'contactType', label: '联系人类型' },
    { name: 'contactName', label: '联系人' },
    { name: 'mobile', label: '手机号' },
    { name: 'email', label: '邮箱' },
    { name: 'primaryFlag', label: '主联系人' },
    { name: 'status', label: '状态' },
  ],
  qualification: [
    { name: 'merchantName', label: '商户' },
    { name: 'qualificationType', label: '资质类型' },
    { name: 'qualificationNo', label: '资质编号' },
    { name: 'fileName', label: '文件名称' },
    { name: 'fileUrl', label: '文件地址' },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'expireAt', label: '到期日' },
  ],
  contract: [
    { name: 'merchantName', label: '商户' },
    { name: 'contractNo', label: '合同编号' },
    { name: 'contractName', label: '合同名称' },
    { name: 'settlementCycle', label: '结算周期' },
    { name: 'contractStatus', label: '合同状态' },
    { name: 'status', label: '审核状态' },
    { name: 'startAt', label: '开始日期' },
    { name: 'endAt', label: '结束日期' },
  ],
  account: [
    { name: 'merchantName', label: '商户' },
    { name: 'accountName', label: '户名' },
    { name: 'accountNo', label: '账号' },
    { name: 'bankName', label: '开户行' },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'status', label: '账户状态' },
    { name: 'effectiveAt', label: '生效日期' },
  ],
  change: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'merchantName', label: '商户' },
    { name: 'changeType', label: '变更类型' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'operator', label: '操作人' },
    { name: 'changedAt', label: '变更时间' },
  ],
};

const MerchantProfileManagement: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [profileMerchantId, setProfileMerchantId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<ProfileTab>('contact');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [detailTab, setDetailTab] = useState<ProfileTab>('contact');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [searchForm] = Form.useForm<ProfileSearchValues>();

  const { data: merchantOptions } = useQuery({
    queryKey: ['merchantOptionsForProfiles'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const merchantMap = useMemo(() => new Map((merchantOptions || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const enrichMerchantName = <T extends { merchantId?: number; merchantName?: string }>(records: T[] | undefined): T[] =>
    (records || []).map((record) => ({ ...record, merchantName: record.merchantName || (record.merchantId ? merchantMap.get(record.merchantId) : '-') || '-' }));

  const profileQueryParams = { current: 1, size: 200, merchantId: profileMerchantId };
  const contactQuery = useQuery({ queryKey: ['merchantContacts', profileMerchantId], queryFn: async () => (await api.merchantContact.page(profileQueryParams)).data as { records: MerchantContactRecord[] } });
  const qualificationQuery = useQuery({ queryKey: ['merchantQualifications', profileMerchantId], queryFn: async () => (await api.merchantQualification.page(profileQueryParams)).data as { records: MerchantQualificationRecord[] } });
  const contractQuery = useQuery({ queryKey: ['merchantContracts', profileMerchantId], queryFn: async () => (await api.merchantContract.page(profileQueryParams)).data as { records: MerchantContractRecord[] } });
  const accountQuery = useQuery({ queryKey: ['merchantSettlementAccounts', profileMerchantId], queryFn: async () => (await api.merchantSettlementAccount.page(profileQueryParams)).data as { records: MerchantSettlementAccountRecord[] } });
  const changeQuery = useQuery({ queryKey: ['merchantChangeLogs', profileMerchantId], queryFn: async () => (await api.merchantChangeLog.page(profileQueryParams)).data as { records: MerchantChangeLogRecord[] } });

  const contacts = enrichMerchantName(contactQuery.data?.records);
  const qualifications = enrichMerchantName(qualificationQuery.data?.records);
  const contracts = enrichMerchantName(contractQuery.data?.records);
  const settlementAccounts = enrichMerchantName(accountQuery.data?.records);
  const changes = enrichMerchantName(changeQuery.data?.records);

  const invalidateTab = (tab: ProfileTab) => {
    if (tab === 'contact') queryClient.invalidateQueries({ queryKey: ['merchantContacts'] });
    if (tab === 'qualification') queryClient.invalidateQueries({ queryKey: ['merchantQualifications'] });
    if (tab === 'contract') queryClient.invalidateQueries({ queryKey: ['merchantContracts'] });
    if (tab === 'account') queryClient.invalidateQueries({ queryKey: ['merchantSettlementAccounts'] });
    if (tab === 'change') queryClient.invalidateQueries({ queryKey: ['merchantChangeLogs'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const normalizedPayload = normalizeProfilePayload(payload, activeTab);
      if (activeTab === 'contact') return normalizedPayload.id ? api.merchantContact.edit(normalizedPayload) : api.merchantContact.add(normalizedPayload);
      if (activeTab === 'qualification') return normalizedPayload.id ? api.merchantQualification.edit(normalizedPayload) : api.merchantQualification.add(normalizedPayload);
      if (activeTab === 'contract') return normalizedPayload.id ? api.merchantContract.edit(normalizedPayload) : api.merchantContract.add(normalizedPayload);
      if (activeTab === 'account') return normalizedPayload.id ? api.merchantSettlementAccount.edit(normalizedPayload) : api.merchantSettlementAccount.add(normalizedPayload);
      return normalizedPayload.id ? api.merchantChangeLog.edit(normalizedPayload) : api.merchantChangeLog.add(normalizedPayload);
    },
    onSuccess: () => {
      message.success('商户档案已保存');
      invalidateTab(activeTab);
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: ProfileTab; id: number }) => {
      if (tab === 'contact') return api.merchantContact.remove(id);
      if (tab === 'qualification') return api.merchantQualification.remove(id);
      if (tab === 'contract') return api.merchantContract.remove(id);
      if (tab === 'account') return api.merchantSettlementAccount.remove(id);
      return api.merchantChangeLog.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('商户档案已删除');
      invalidateTab(variables.tab);
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const syncMerchantName = (value: unknown) => {
    form.setFieldValue('merchantName', merchantMap.get(value as number));
  };

  const confirmRemove = (tab: ProfileTab, id: number) => {
    showBusinessConfirm({
      title: `确认删除${profileTabMeta[tab].meta}`,
      content: `删除后将移除该商户「${profileTabMeta[tab].meta}」记录，相关运营、审核和追溯信息将不可恢复。`,
      onOk: () => removeMutation.mutate({ tab, id }),
    });
  };

  const openModal = (tab: ProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(normalizeProfileFormRecord(record, tab) as Record<string, string | number | undefined>);
    } else if (tab === 'contact') {
      form.setFieldsValue({ merchantId: profileMerchantId, merchantName: profileMerchantId ? merchantMap.get(profileMerchantId) : undefined, contactType: 'PRIMARY', primaryFlag: 0, status: 'APPROVED' });
    } else if (tab === 'contract') {
      form.setFieldsValue({ merchantId: profileMerchantId, merchantName: profileMerchantId ? merchantMap.get(profileMerchantId) : undefined, settlementCycle: 'WEEK', contractStatus: 'PENDING', status: 'PENDING' });
    } else if (tab === 'qualification') {
      form.setFieldsValue({ merchantId: profileMerchantId, merchantName: profileMerchantId ? merchantMap.get(profileMerchantId) : undefined, auditStatus: 'PENDING', status: 'ACTIVE' });
    } else if (tab === 'account') {
      form.setFieldsValue({ merchantId: profileMerchantId, merchantName: profileMerchantId ? merchantMap.get(profileMerchantId) : undefined, auditStatus: 'PENDING', status: 'ACTIVE' });
    } else {
      form.setFieldsValue({ merchantId: profileMerchantId, merchantName: profileMerchantId ? merchantMap.get(profileMerchantId) : undefined, changeType: 'CONTACT' });
    }
    setModalVisible(true);
  };

  const openDetail = (tab: ProfileTab, record: EditableRecord) => {
    setDetailTab(tab);
    setDetail(record);
  };

  const contactColumns: ProColumns<MerchantContactRecord>[] = [
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '联系人类型', dataIndex: 'contactType', width: 130 , render: (value) => formatEnumText(value, 'contactType', '联系人类型') },
    { title: '联系人', dataIndex: 'contactName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '邮箱', dataIndex: 'email', width: 190 },
    { title: '主联系人', dataIndex: 'primaryFlag', width: 100, render: (_, record) => renderStatusTag(record.primaryFlag, primaryFlagMap) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => openDetail('contact', record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('contact', record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove('contact', record.id)}>删除</Button>
        </>
      ),
    },
  ];

  const qualificationColumns: ProColumns<MerchantQualificationRecord>[] = [
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '资质类型', dataIndex: 'qualificationType', width: 140, render: (_, record) => renderStatusTag(record.qualificationType, qualificationTypeMap) },
    { title: '资质编号', dataIndex: 'qualificationNo', width: 180 },
    { title: '文件', dataIndex: 'fileName', width: 220 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '到期日', dataIndex: 'expireAt', width: 130 },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => openDetail('qualification', record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('qualification', record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove('qualification', record.id)}>删除</Button>
        </>
      ),
    },
  ];

  const contractColumns: ProColumns<MerchantContractRecord>[] = [
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '合同编号', dataIndex: 'contractNo', width: 180 },
    { title: '合同名称', dataIndex: 'contractName', width: 180 },
    { title: '结算周期', dataIndex: 'settlementCycle', width: 120, render: (_, record) => renderStatusTag(record.settlementCycle, settlementCycleMap) },
    { title: '合同状态', dataIndex: 'contractStatus', width: 120, render: (_, record) => renderStatusTag(record.contractStatus, contractStatusMap) },
    { title: '审核状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '开始日期', dataIndex: 'startAt', width: 130 },
    { title: '结束日期', dataIndex: 'endAt', width: 130 },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => openDetail('contract', record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('contract', record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove('contract', record.id)}>删除</Button>
        </>
      ),
    },
  ];

  const accountColumns: ProColumns<MerchantSettlementAccountRecord>[] = [
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '户名', dataIndex: 'accountName', width: 220 },
    { title: '账号', dataIndex: 'accountNo', width: 160 },
    { title: '开户行', dataIndex: 'bankName', width: 190 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '账户状态', dataIndex: 'status', width: 120 , render: (value) => formatEnumText(value, 'status', '账户状态') },
    { title: '生效日期', dataIndex: 'effectiveAt', width: 130 },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => openDetail('account', record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('account', record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove('account', record.id)}>删除</Button>
        </>
      ),
    },
  ];

  const changeColumns: ProColumns<MerchantChangeLogRecord>[] = [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '变更类型', dataIndex: 'changeType', width: 150 , render: (value) => formatEnumText(value, 'changeType', '变更类型') },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => openDetail('change', record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('change', record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove('change', record.id)}>删除</Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: embedded ? 0 : 24 }}>
      {!embedded ? <PageBanner title="商户档案中心" subtitle="维护商户联系人、资质、合同、结算账户和变更日志。" icon={<SolutionOutlined />} /> : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="联系人" value={contacts.length} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审资质" value={qualifications.filter((item) => item.auditStatus === 'PENDING').length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="合同" value={contracts.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审账户" value={settlementAccounts.filter((item) => item.auditStatus === 'PENDING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="变更记录" value={changes.length} suffix="条" /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => {
          setKeyword(String(values.keyword || ''));
          setProfileMerchantId(values.merchantId);
        }}
      >
        <Form.Item name="merchantId" label="所属商户">
          <Select allowClear showSearch optionFilterProp="label" options={merchantOptions || []} placeholder="全部商户" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="输入商户、联系人、资质、合同、账户、变更关键词" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { searchForm.resetFields(); setKeyword(''); setProfileMerchantId(undefined); }}>重置</Button>
        </Form.Item>
      </Form>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ProfileTab)}
        items={[
          { key: 'contact', label: '联系人', children: <ProTable<MerchantContactRecord> cardBordered rowKey="id" columns={contactColumns} dataSource={filter(contacts)} loading={contactQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('contact')}>新增联系人</Button>]} /> },
          { key: 'qualification', label: '资质', children: <ProTable<MerchantQualificationRecord> cardBordered rowKey="id" columns={qualificationColumns} dataSource={filter(qualifications)} loading={qualificationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('qualification')}>新增资质</Button>]} /> },
          { key: 'contract', label: '合同', children: <ProTable<MerchantContractRecord> cardBordered rowKey="id" columns={contractColumns} dataSource={filter(contracts)} loading={contractQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1460 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('contract')}>新增合同</Button>]} /> },
          { key: 'account', label: '结算账户', children: <ProTable<MerchantSettlementAccountRecord> cardBordered rowKey="id" columns={accountColumns} dataSource={filter(settlementAccounts)} loading={accountQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('account')}>新增账户</Button>]} /> },
          { key: 'change', label: '变更日志', children: <ProTable<MerchantChangeLogRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes)} loading={changeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('change')}>新增变更</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="商户档案详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as any} fields={profileDetailFields[detailTab]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={profileTabMeta[activeTab].eyebrow}
        title={editingRecord ? profileTabMeta[activeTab].editTitle : profileTabMeta[activeTab].createTitle}
        subtitle={profileTabMeta[activeTab].subtitle}
        meta={[profileTabMeta[activeTab].meta, editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(await form.validateFields())}
        confirmLoading={saveMutation.isPending}
        okText={editingRecord ? '保存变更' : '保存档案'}
        width={1040}
        forceRender
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={profileTabMeta[activeTab].icon}
              title={profileTabMeta[activeTab].sectionTitle}
              desc={profileTabMeta[activeTab].sectionDesc}
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
                  <Select showSearch optionFilterProp="label" options={merchantOptions || []} placeholder="请选择商户" onChange={syncMerchantName} />
                </Form.Item>
                <Form.Item name="merchantName" label="商户名称">
                  <Input disabled placeholder="选择商户后自动带出" />
                </Form.Item>
            {activeTab === 'contact' ? (
              <>
                <Form.Item name="contactType" label="联系人类型" rules={[{ required: true, message: '请选择联系人类型' }]}><Select options={contactTypeOptions} placeholder="请选择联系人类型" /></Form.Item>
                <Form.Item name="contactName" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}><Input placeholder="例如：王敏" /></Form.Item>
                <Form.Item name="mobile" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}><Input placeholder="用于运营通知和异常处理" /></Form.Item>
                <Form.Item name="email" label="邮箱"><Input placeholder="例如：ops@example.com" /></Form.Item>
                <Form.Item name="primaryFlag" label="主联系人"><Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} placeholder="请选择" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'qualification' ? (
              <>
                <Form.Item name="qualificationType" label="资质类型" rules={[{ required: true, message: '请选择资质类型' }]}><Select options={qualificationTypeOptions} placeholder="请选择资质类型" /></Form.Item>
                <Form.Item name="qualificationNo" label="资质编号" rules={[{ required: true, message: '请输入资质编号' }]}><Input placeholder="统一信用代码或许可证编号" /></Form.Item>
                <Form.Item name="fileName" label="文件名称"><Input placeholder="例如：营业执照.pdf" /></Form.Item>
                <Form.Item name="fileUrl" label="资质文件"><OssImageUpload fileKind="file" prefix="merchant/qualifications" placeholder="上传资质文件" /></Form.Item>
                <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} placeholder="请选择审核状态" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={accountStatusOptions} placeholder="请选择状态" /></Form.Item>
                <Form.Item name="expireAt" label="到期日"><DateField /></Form.Item>
              </>
            ) : null}
            {activeTab === 'contract' ? (
              <>
                <Form.Item name="contractNo" label="合同编号" rules={[{ required: true, message: '请输入合同编号' }]}><Input placeholder="例如：CTR-2026-001" /></Form.Item>
                <Form.Item name="contractName" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}><Input placeholder="例如：商户入驻合作协议" /></Form.Item>
                <Form.Item name="settlementCycle" label="结算周期"><Select options={settlementCycleOptions} placeholder="请选择结算周期" /></Form.Item>
                <Form.Item name="contractStatus" label="合同状态"><Select options={merchantContractStatusOptions} placeholder="请选择合同状态" /></Form.Item>
                <Form.Item name="status" label="审核状态"><Select options={auditStatusOptions} placeholder="请选择审核状态" /></Form.Item>
                <Form.Item name="fileUrl" label="合同文件"><OssImageUpload fileKind="file" prefix="merchant/contracts" placeholder="上传合同文件" /></Form.Item>
                <Form.Item name="startAt" label="开始日期"><DateField /></Form.Item>
                <Form.Item name="endAt" label="结束日期"><DateField /></Form.Item>
              </>
            ) : null}
            {activeTab === 'account' ? (
              <>
                <Form.Item name="accountName" label="户名" rules={[{ required: true, message: '请输入户名' }]}><Input placeholder="例如：上海鲸洗运营有限公司" /></Form.Item>
                <Form.Item name="accountNo" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input placeholder="银行账户或收款账号" /></Form.Item>
                <Form.Item name="bankName" label="开户行"><Input placeholder="例如：招商银行上海分行" /></Form.Item>
                <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} placeholder="请选择审核状态" /></Form.Item>
                <Form.Item name="status" label="账户状态"><Select options={accountStatusOptions} placeholder="请选择账户状态" /></Form.Item>
                <Form.Item name="effectiveAt" label="生效日期"><DateField /></Form.Item>
              </>
            ) : null}
            {activeTab === 'change' ? (
              <>
                <Form.Item name="changeNo" label="变更单号" rules={[{ required: true, message: '请输入变更单号' }]}><Input placeholder="例如：MCG202605100001" /></Form.Item>
                <Form.Item name="changeType" label="变更类型"><Select options={changeTypeOptions} placeholder="请选择变更类型" /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input placeholder="例如：平台运营" /></Form.Item>
                <Form.Item name="changedAt" label="变更时间"><DateTimeField /></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="beforeValue" label="变更前"><Input.TextArea rows={3} placeholder="记录变更前的关键字段和值" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="afterValue" label="变更后"><Input.TextArea rows={3} placeholder="记录变更后的关键字段和值" /></Form.Item>
              </>
            ) : null}
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注"><Input.TextArea rows={3} placeholder="补充审核说明、资料来源或内部交接说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MerchantProfileManagement;
