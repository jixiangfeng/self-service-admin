import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { auditStatusOptions, scopeTypeOptions, statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { LoginLogRecord, MerchantAccountRecord, PermissionChangeLogRecord, RoleOption, SelectOptionRecord, UserRoleRelationRecord } from '@/services/backendService';
import { useRoleOptions } from '@/hooks/useApi';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const statusMap = buildValueEnum(statusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const pageData = <T,>(result: any) => ('data' in result ? result.data : result) as { records: T[]; total: number };

const accountDetailFields: DetailField<MerchantAccountRecord>[] = [
  { name: 'userName', label: '账号' },
  { name: 'mobile', label: '手机号' },
  { name: 'accountType', label: '账号类型' },
  { name: 'merchantName', label: '商户' },
  { name: 'storeName', label: '门店' },
  { name: 'dataScopeType', label: '数据范围' },
  { name: 'status', label: '状态' },
  { name: 'remark', label: '备注' },
];

const genericAccountDetailFields: DetailField<any>[] = [
  { name: 'userName', label: '账号' },
  { name: 'roleName', label: '角色' },
  { name: 'roleCode', label: '角色编码' },
  { name: 'result', label: '结果' },
  { name: 'changeType', label: '变更类型' },
  { name: 'beforeValue', label: '变更前' },
  { name: 'afterValue', label: '变更后' },
  { name: 'changedAt', label: '变更时间' },
];

const MerchantAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<MerchantAccountRecord[]>([]);
  const [grants, setGrants] = useState<UserRoleRelationRecord[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginLogRecord[]>([]);
  const [changes, setChanges] = useState<PermissionChangeLogRecord[]>([]);
  const [detail, setDetail] = useState<MerchantAccountRecord | UserRoleRelationRecord | LoginLogRecord | PermissionChangeLogRecord | null>(null);
  const [accountVisible, setAccountVisible] = useState(false);
  const [grantVisible, setGrantVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MerchantAccountRecord | null>(null);
  const [form] = Form.useForm<MerchantAccountRecord>();
  const [grantForm] = Form.useForm<UserRoleRelationRecord & { auditStatus?: string; remark?: string }>();
  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForAccounts'], queryFn: async () => (await api.merchant.options()).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForAccounts'], queryFn: async () => (await api.store.options()).data });
  const { data: roleOptions = [] } = useRoleOptions();
  const merchantOptionMap = useMemo(() => new Map((merchantOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);
  const roleSelectOptions = useMemo(() => (roleOptions as RoleOption[]).map((item) => ({ value: item.id, label: `${item.roleName} / ${item.roleCode}`, role: item })), [roleOptions]);

  const summary = useMemo(() => ({
    total: accounts.length,
    pendingGrant: grants.filter((item) => item.status === 0).length,
    failedLogin: loginRecords.filter((item) => item.result === 'REJECTED' || item.result === 'FAILED').length,
    changes: changes.length,
  }), [accounts, changes.length, grants, loginRecords]);

  const fetchOverview = async (keyword?: string) => {
    const [accountRes, grantRes, loginRes, changeRes] = await Promise.all([
      api.merchantAccount.page({ current: 1, size: 100, keyword }),
      api.authAudit.userRoles.page({ current: 1, size: 100, userName: keyword }),
      api.authAudit.loginLogs.page({ current: 1, size: 100, userName: keyword }),
      api.authAudit.permissionChanges.page({ current: 1, size: 100, targetUser: keyword }),
    ]);
    setAccounts(pageData<MerchantAccountRecord>(accountRes).records || []);
    setGrants(pageData<UserRoleRelationRecord>(grantRes).records || []);
    setLoginRecords(pageData<LoginLogRecord>(loginRes).records || []);
    setChanges(pageData<PermissionChangeLogRecord>(changeRes).records || []);
  };

  const openAccount = (record?: MerchantAccountRecord) => {
    setEditingAccount(record || null);
    form.resetFields();
    form.setFieldsValue(record || { accountType: '商户账号', dataScopeType: 'MERCHANT', status: 1 });
    setAccountVisible(true);
  };

  const saveAccount = async () => {
    const values = await form.validateFields();
    if (editingAccount) {
      await api.merchantAccount.edit({ ...editingAccount, ...values } as unknown as Record<string, unknown>);
      message.success('商户账号绑定已更新');
    } else {
      await api.merchantAccount.add(values as unknown as Record<string, unknown>);
      message.success('商户账号绑定已创建');
    }
    setAccountVisible(false);
    fetchOverview();
  };

  const saveGrant = async () => {
    const values = await grantForm.validateFields();
    await api.authAudit.userRoles.add({ ...values, status: values.status ?? 1, grantedAt: new Date().toISOString() });
    await api.authAudit.permissionChanges.add({
      changeNo: `MAC${Date.now()}`,
      targetUser: values.userName,
      changeType: '商户角色授权',
      beforeValue: '-',
      afterValue: values.roleName,
      auditStatus: values.auditStatus || 'APPROVED',
      remark: values.remark,
      changedAt: new Date().toISOString(),
    });
    message.success('角色授权已写入');
    setGrantVisible(false);
    grantForm.resetFields();
    fetchOverview();
  };

  const accountColumns: ProColumns<MerchantAccountRecord>[] = [
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '账号类型', dataIndex: 'accountType', width: 130 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '数据范围', dataIndex: 'dataScopeType', width: 120, render: (_, record) => renderStatusTag(record.dataScopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 210,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => openAccount(record)}>编辑</Button>
          <Popconfirm title={`确认${record.status === 1 ? '停用' : '启用'}该账号？`} onConfirm={async () => { await api.merchantAccount.changeStatus(record.id, record.status === 1 ? 0 : 1); message.success('账号状态已更新'); fetchOverview(); }}>
            <Button size="small">{record.status === 1 ? '停用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const grantColumns: ProColumns<UserRoleRelationRecord>[] = [
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '角色', dataIndex: 'roleName', width: 140 },
    { title: '角色编码', dataIndex: 'roleCode', width: 140 },
    { title: '授权人', dataIndex: 'grantUser', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status ?? 1, statusMap) },
    { title: '授权时间', dataIndex: 'grantedAt', width: 180, render: (_, record) => formatDateTime(record.grantedAt) },
  ];

  const loginColumns: ProColumns<LoginLogRecord>[] = [
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '登录IP', dataIndex: 'loginIp', width: 140 },
    { title: '登录地点', dataIndex: 'loginLocation', width: 160 },
    { title: '设备', dataIndex: 'device', width: 160 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '登录时间', dataIndex: 'loginAt', width: 180, render: (_, record) => formatDateTime(record.loginAt) },
  ];

  const changeColumns: ProColumns<PermissionChangeLogRecord>[] = [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '账号', dataIndex: 'targetUser', width: 140 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户账号中心" subtitle="维护商户账号绑定、角色授权、登录记录和账号变更日志。" icon={<UserSwitchOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="商户账号" value={summary.total} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审授权" value={summary.pendingGrant} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="登录失败" value={summary.failedLogin} suffix="次" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="账号变更" value={summary.changes} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入账号、商户、门店、角色' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => fetchOverview(String(values.keyword || ''))}
        onReset={() => fetchOverview()}
      />

      <Tabs
        items={[
          { key: 'account', label: '账号绑定', children: <ProTable<MerchantAccountRecord> cardBordered rowKey="id" columns={accountColumns} request={async (params) => { const res = await api.merchantAccount.page({ current: params.current, size: params.pageSize, keyword: params.keyword }); const page = pageData<MerchantAccountRecord>(res); setAccounts(page.records || []); return { data: page.records || [], total: page.total, success: true }; }} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openAccount()}>新增账号</Button>]} /> },
          { key: 'grant', label: '角色授权', children: <ProTable<UserRoleRelationRecord> cardBordered rowKey="id" columns={grantColumns} dataSource={grants} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="grant" type="primary" onClick={() => { grantForm.resetFields(); grantForm.setFieldsValue({ status: 1, auditStatus: 'APPROVED' }); setGrantVisible(true); }}>新增授权</Button>]} /> },
          { key: 'login', label: '登录记录', children: <ProTable<LoginLogRecord> cardBordered rowKey="id" columns={loginColumns} dataSource={loginRecords} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'change', label: '账号变更', children: <ProTable<PermissionChangeLogRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={changes} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as any} fields={'merchantName' in detail ? accountDetailFields : genericAccountDetailFields} /> : null}
      </Modal>

      <Modal title={editingAccount ? `编辑账号 · ${editingAccount.userName}` : '新增商户账号'} open={accountVisible} onCancel={() => setAccountVisible(false)} onOk={saveAccount} width={820} destroyOnClose>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userId" label="平台用户ID"><Input /></Form.Item>
            <Form.Item name="userName" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}><Input /></Form.Item>
            <Form.Item name="mobile" label="手机号"><Input /></Form.Item>
            <Form.Item name="accountType" label="账号类型" rules={[{ required: true, message: '请输入账号类型' }]}><Input /></Form.Item>
            <Form.Item name="merchantId" label="商户"><Select options={merchantOptions as SelectOptionRecord[]} allowClear onChange={(value) => form.setFieldValue('merchantName', merchantOptionMap.get(value))} /></Form.Item>
            <Form.Item name="merchantName" label="商户名称"><Input disabled /></Form.Item>
            <Form.Item name="storeId" label="门店"><Select options={storeOptions as SelectOptionRecord[]} allowClear onChange={(value) => form.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
            <Form.Item name="storeName" label="门店名称"><Input disabled /></Form.Item>
            <Form.Item name="dataScopeType" label="数据范围" rules={[{ required: true, message: '请选择数据范围' }]}><Select options={scopeTypeOptions} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="新增角色授权" open={grantVisible} onCancel={() => setGrantVisible(false)} onOk={saveGrant} width={760} destroyOnClose>
        <Form form={grantForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userId" label="用户ID"><Input /></Form.Item>
            <Form.Item name="userName" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input /></Form.Item>
            <Form.Item name="roleId" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select
                options={roleSelectOptions}
                onChange={(_, option) => {
                  const role = !option || Array.isArray(option) ? undefined : option.role;
                  grantForm.setFieldsValue({ roleName: role?.roleName, roleCode: role?.roleCode });
                }}
              />
            </Form.Item>
            <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请选择角色' }]}><Input disabled /></Form.Item>
            <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请选择角色' }]}><Input disabled /></Form.Item>
            <Form.Item name="grantUser" label="授权人"><Input /></Form.Item>
            <Form.Item name="status" label="授权状态"><Select options={statusOptions} /></Form.Item>
            <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantAccountManagement;
