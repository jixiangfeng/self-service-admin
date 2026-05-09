import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SolutionOutlined } from '@ant-design/icons';
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
import api from '@/services/backendService';
import type {
  MerchantChangeLogRecord,
  MerchantContactRecord,
  MerchantContractRecord,
  MerchantQualificationRecord,
  MerchantSettlementAccountRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type ProfileTab = 'contact' | 'qualification' | 'contract' | 'account' | 'change';
type EditableRecord = MerchantContactRecord | MerchantContractRecord | MerchantSettlementAccountRecord | MerchantQualificationRecord | MerchantChangeLogRecord;

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

const MerchantProfileManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('contact');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const { data: merchantOptions } = useQuery({
    queryKey: ['merchantOptionsForProfiles'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const merchantMap = useMemo(() => new Map((merchantOptions || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const enrichMerchantName = <T extends { merchantId?: number; merchantName?: string }>(records: T[] | undefined) =>
    (records || []).map((record) => ({ ...record, merchantName: record.merchantName || (record.merchantId ? merchantMap.get(record.merchantId) : '-') || '-' }));

  const contactQuery = useQuery({ queryKey: ['merchantContacts'], queryFn: async () => (await api.merchantContact.page({ pageNum: 1, pageSize: 200 })).data });
  const qualificationQuery = useQuery({ queryKey: ['merchantQualifications'], queryFn: async () => (await api.merchantQualification.page({ pageNum: 1, pageSize: 200 })).data });
  const contractQuery = useQuery({ queryKey: ['merchantContracts'], queryFn: async () => (await api.merchantContract.page({ pageNum: 1, pageSize: 200 })).data });
  const accountQuery = useQuery({ queryKey: ['merchantSettlementAccounts'], queryFn: async () => (await api.merchantSettlementAccount.page({ pageNum: 1, pageSize: 200 })).data });
  const changeQuery = useQuery({ queryKey: ['merchantChangeLogs'], queryFn: async () => (await api.merchantChangeLog.page({ pageNum: 1, pageSize: 200 })).data });

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
      if (activeTab === 'contact') return payload.id ? api.merchantContact.edit(payload) : api.merchantContact.add(payload);
      if (activeTab === 'qualification') return payload.id ? api.merchantQualification.edit(payload) : api.merchantQualification.add(payload);
      if (activeTab === 'contract') return payload.id ? api.merchantContract.edit(payload) : api.merchantContract.add(payload);
      if (activeTab === 'account') return payload.id ? api.merchantSettlementAccount.edit(payload) : api.merchantSettlementAccount.add(payload);
      return payload.id ? api.merchantChangeLog.edit(payload) : api.merchantChangeLog.add(payload);
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

  const openModal = (tab: ProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...(record as unknown as Record<string, string | number | undefined>) });
    } else if (tab === 'contact') {
      form.setFieldsValue({ primaryFlag: 0, status: 'APPROVED' });
    } else if (tab === 'contract') {
      form.setFieldsValue({ settlementCycle: 'WEEK', contractStatus: 'PENDING', status: 'PENDING' });
    } else if (tab === 'qualification') {
      form.setFieldsValue({ auditStatus: 'PENDING', status: 'ACTIVE' });
    } else if (tab === 'account') {
      form.setFieldsValue({ auditStatus: 'PENDING', status: 'ACTIVE' });
    } else {
      form.setFieldsValue({ changeType: 'CONTACT' });
    }
    setModalVisible(true);
  };

  const contactColumns: ProColumns<MerchantContactRecord>[] = [
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '联系人类型', dataIndex: 'contactType', width: 130 },
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
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('contact', record)}>编辑</Button>
          <Popconfirm title="确认删除联系人？" onConfirm={() => removeMutation.mutate({ tab: 'contact', id: record.id })}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
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
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('qualification', record)}>编辑</Button>
          <Popconfirm title="确认删除资质？" onConfirm={() => removeMutation.mutate({ tab: 'qualification', id: record.id })}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
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
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('contract', record)}>编辑</Button>
          <Popconfirm title="确认删除合同？" onConfirm={() => removeMutation.mutate({ tab: 'contract', id: record.id })}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
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
    { title: '账户状态', dataIndex: 'status', width: 120 },
    { title: '生效日期', dataIndex: 'effectiveAt', width: 130 },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('account', record)}>编辑</Button>
          <Popconfirm title="确认删除结算账户？" onConfirm={() => removeMutation.mutate({ tab: 'account', id: record.id })}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  const changeColumns: ProColumns<MerchantChangeLogRecord>[] = [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '变更类型', dataIndex: 'changeType', width: 150 },
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
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('change', record)}>编辑</Button>
          <Popconfirm title="确认删除变更日志？" onConfirm={() => removeMutation.mutate({ tab: 'change', id: record.id })}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户档案中心" subtitle="维护商户联系人、资质、合同、结算账户和变更日志。" icon={<SolutionOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="联系人" value={contacts.length} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审资质" value={qualifications.filter((item) => item.auditStatus === 'PENDING').length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="合同" value={contracts.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审账户" value={settlementAccounts.filter((item) => item.auditStatus === 'PENDING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="变更记录" value={changes.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入商户、联系人、资质、合同、账户、变更关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

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

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as any} fields={profileDetailFields[activeTab]} /> : null}
      </Modal>

      <Modal
        title={editingRecord ? '编辑商户档案' : '新增商户档案'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(await form.validateFields())}
        confirmLoading={saveMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="modal-grid">
            <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
              <Select showSearch optionFilterProp="label" options={merchantOptions || []} />
            </Form.Item>
            {activeTab === 'contact' ? (
              <>
                <Form.Item name="contactType" label="联系人类型" rules={[{ required: true, message: '请选择联系人类型' }]}><Select options={contactTypeOptions} /></Form.Item>
                <Form.Item name="contactName" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}><Input /></Form.Item>
                <Form.Item name="mobile" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}><Input /></Form.Item>
                <Form.Item name="email" label="邮箱"><Input /></Form.Item>
                <Form.Item name="primaryFlag" label="主联系人"><Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'qualification' ? (
              <>
                <Form.Item name="qualificationType" label="资质类型" rules={[{ required: true, message: '请选择资质类型' }]}><Select options={qualificationTypeOptions} /></Form.Item>
                <Form.Item name="qualificationNo" label="资质编号" rules={[{ required: true, message: '请输入资质编号' }]}><Input /></Form.Item>
                <Form.Item name="fileName" label="文件名称"><Input /></Form.Item>
                <Form.Item name="fileUrl" label="文件地址"><Input /></Form.Item>
                <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={accountStatusOptions} /></Form.Item>
                <Form.Item name="expireAt" label="到期日"><Input placeholder="YYYY-MM-DD" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'contract' ? (
              <>
                <Form.Item name="contractNo" label="合同编号" rules={[{ required: true, message: '请输入合同编号' }]}><Input /></Form.Item>
                <Form.Item name="contractName" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}><Input /></Form.Item>
                <Form.Item name="settlementCycle" label="结算周期"><Select options={settlementCycleOptions} /></Form.Item>
                <Form.Item name="contractStatus" label="合同状态"><Select options={merchantContractStatusOptions} /></Form.Item>
                <Form.Item name="status" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
                <Form.Item name="startAt" label="开始日期"><Input placeholder="YYYY-MM-DD" /></Form.Item>
                <Form.Item name="endAt" label="结束日期"><Input placeholder="YYYY-MM-DD" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'account' ? (
              <>
                <Form.Item name="accountName" label="户名" rules={[{ required: true, message: '请输入户名' }]}><Input /></Form.Item>
                <Form.Item name="accountNo" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input /></Form.Item>
                <Form.Item name="bankName" label="开户行"><Input /></Form.Item>
                <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
                <Form.Item name="status" label="账户状态"><Select options={accountStatusOptions} /></Form.Item>
                <Form.Item name="effectiveAt" label="生效日期"><Input placeholder="YYYY-MM-DD" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'change' ? (
              <>
                <Form.Item name="changeNo" label="变更单号" rules={[{ required: true, message: '请输入变更单号' }]}><Input /></Form.Item>
                <Form.Item name="changeType" label="变更类型"><Select options={changeTypeOptions} /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
                <Form.Item name="changedAt" label="变更时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item className="modal-span-2" name="beforeValue" label="变更前"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="afterValue" label="变更后"><Input.TextArea rows={3} /></Form.Item>
              </>
            ) : null}
            <Form.Item className="modal-span-2" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantProfileManagement;
