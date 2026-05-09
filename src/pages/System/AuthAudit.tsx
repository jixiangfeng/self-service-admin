import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { DataScopeRelationRecord, LoginLogRecord, OperationLogRecord, PermissionChangeLogRecord, UserRoleRelationRecord } from '@/services/backendService';

type UserRoleRecord = UserRoleRelationRecord;
type DataScopeRecord = DataScopeRelationRecord;
type LoginLogRecordView = LoginLogRecord;
type OperationLogRecordView = OperationLogRecord;
type PermissionChangeRecord = PermissionChangeLogRecord;
type AuditTab = 'userRole' | 'dataScope' | 'permissionChange';

const statusMap = buildValueEnum(statusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);

const authAuditDetailFields: Record<string, DetailField<Record<string, any>>[]> = {
  userRole: [
    { name: 'userName', label: '用户' },
    { name: 'roleName', label: '角色' },
    { name: 'roleCode', label: '角色编码' },
    { name: 'grantUser', label: '授权人' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'grantedAt', label: '授权时间', render: (value) => formatDateTime(value) },
  ],
  dataScope: [
    { name: 'roleName', label: '角色' },
    { name: 'scopeType', label: '范围类型', render: (value) => renderStatusTag(value, scopeMap) },
    { name: 'scopeName', label: '范围名称' },
    { name: 'merchantName', label: '关联商户' },
    { name: 'storeName', label: '关联门店' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
  ],
  loginLog: [
    { name: 'userName', label: '用户' },
    { name: 'loginIp', label: '登录 IP' },
    { name: 'loginLocation', label: '地区' },
    { name: 'device', label: '设备' },
    { name: 'result', label: '结果', render: (value) => renderStatusTag(value, auditStatusMap) },
    { name: 'loginAt', label: '登录时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '说明' },
  ],
  operationLog: [
    { name: 'userName', label: '用户' },
    { name: 'moduleCode', label: '模块' },
    { name: 'operationType', label: '操作' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'result', label: '结果', render: (value) => renderStatusTag(value, auditStatusMap) },
    { name: 'operatedAt', label: '操作时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '说明' },
  ],
  permissionChange: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'targetUser', label: '目标用户' },
    { name: 'changeType', label: '变更类型' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'auditStatus', label: '审核状态', render: (value) => renderStatusTag(value, auditStatusMap) },
    { name: 'changedAt', label: '变更时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '说明' },
  ],
};

const getAuthAuditDetailFields = (record: UserRoleRecord | DataScopeRecord | LoginLogRecordView | OperationLogRecordView | PermissionChangeRecord): DetailField<Record<string, any>>[] => {
  if ('roleCode' in record) return authAuditDetailFields.userRole;
  if ('scopeType' in record) return authAuditDetailFields.dataScope;
  if ('loginIp' in record) return authAuditDetailFields.loginLog;
  if ('moduleCode' in record) return authAuditDetailFields.operationLog;
  return authAuditDetailFields.permissionChange;
};

const AuthAudit: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<UserRoleRecord | DataScopeRecord | LoginLogRecordView | OperationLogRecordView | PermissionChangeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const [modalType, setModalType] = useState<AuditTab | null>(null);
  const [editingPermissionChange, setEditingPermissionChange] = useState<PermissionChangeRecord | null>(null);

  const userRoleQuery = useQuery({
    queryKey: ['authAuditUserRoles', keyword],
    queryFn: async () => (await api.authAudit.userRoles.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const dataScopeQuery = useQuery({
    queryKey: ['authAuditDataScopes', keyword],
    queryFn: async () => (await api.authAudit.dataScopes.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const loginLogQuery = useQuery({
    queryKey: ['authAuditLoginLogs', keyword],
    queryFn: async () => (await api.authAudit.loginLogs.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const operationLogQuery = useQuery({
    queryKey: ['authAuditOperationLogs', keyword],
    queryFn: async () => (await api.authAudit.operationLogs.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const permissionChangeQuery = useQuery({
    queryKey: ['authAuditPermissionChanges', keyword],
    queryFn: async () => (await api.authAudit.permissionChanges.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });

  const userRoles = userRoleQuery.data?.records || [];
  const dataScopes = dataScopeQuery.data?.records || [];
  const loginLogs = loginLogQuery.data?.records || [];
  const operationLogs = operationLogQuery.data?.records || [];
  const permissionChanges = permissionChangeQuery.data?.records || [];

  const saveMutation = useMutation({
    mutationFn: async ({ type, values }: { type: AuditTab; values: Record<string, unknown> }) => {
      if (type === 'userRole') return api.authAudit.userRoles.add(values);
      if (type === 'dataScope') return api.authAudit.dataScopes.add(values);
      if (values.id) return api.authAudit.permissionChanges.edit(values);
      return api.authAudit.permissionChanges.add(values);
    },
    onSuccess: async (_, variables) => {
      const queryKey = variables.type === 'userRole' ? 'authAuditUserRoles' : variables.type === 'dataScope' ? 'authAuditDataScopes' : 'authAuditPermissionChanges';
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      setModalVisible(false);
      setModalType(null);
      setEditingPermissionChange(null);
      form.resetFields();
      message.success('权限审计操作已保存');
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string, type: AuditTab, record?: PermissionChangeRecord) => {
    setModalTitle(title);
    setModalType(type);
    setEditingPermissionChange(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(record as unknown as Record<string, string | number | undefined>);
    } else if (type === 'userRole' || type === 'dataScope') {
      form.setFieldsValue({ status: 1 });
    } else {
      form.setFieldsValue({ auditStatus: 'PENDING' });
    }
    setModalVisible(true);
  };

  const userRoleColumns = useMemo<ProColumns<UserRoleRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 140 },
    { title: '角色', dataIndex: 'roleName', width: 140 },
    { title: '角色编码', dataIndex: 'roleCode', width: 180 },
    { title: '授权人', dataIndex: 'grantUser', width: 140 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '授权时间', dataIndex: 'grantedAt', width: 180, render: (_, record) => formatDateTime(record.grantedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const dataScopeColumns = useMemo<ProColumns<DataScopeRecord>[]>(() => [
    { title: '角色', dataIndex: 'roleName', width: 140 },
    { title: '范围类型', dataIndex: 'scopeType', width: 120, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '范围名称', dataIndex: 'scopeName', width: 180 },
    { title: '关联商户', dataIndex: 'merchantName', width: 160 },
    { title: '关联门店', dataIndex: 'storeName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const loginLogColumns = useMemo<ProColumns<LoginLogRecordView>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 140 },
    { title: 'IP', dataIndex: 'loginIp', width: 140 },
    { title: '地区', dataIndex: 'loginLocation', width: 120 },
    { title: '设备', dataIndex: 'device', width: 180 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '登录时间', dataIndex: 'loginAt', width: 180, render: (_, record) => formatDateTime(record.loginAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const operationLogColumns = useMemo<ProColumns<OperationLogRecordView>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 140 },
    { title: '模块', dataIndex: 'moduleCode', width: 180 },
    { title: '操作', dataIndex: 'operationType', width: 140 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '操作时间', dataIndex: 'operatedAt', width: 180, render: (_, record) => formatDateTime(record.operatedAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const permissionChangeColumns = useMemo<ProColumns<PermissionChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '目标用户', dataIndex: 'targetUser', width: 140 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openModal('审核权限变更', 'permissionChange', record)}>审核</Button>
      </>
    ) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="权限审计中心" subtitle="维护多角色关系、数据权限、登录日志、操作日志和权限变更记录。" icon={<AuditOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="角色关系" value={userRoles.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="数据权限" value={dataScopes.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="登录失败" value={loginLogs.filter((item) => item.result === 'REJECTED').length} suffix="次" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="操作日志" value={operationLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待审变更" value={permissionChanges.filter((item) => item.auditStatus === 'PENDING').length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入用户、角色、范围、IP、模块、业务单号' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'userRole', label: '多角色关系', children: <ProTable<UserRoleRecord> cardBordered rowKey="id" columns={userRoleColumns} dataSource={filter(userRoles) as UserRoleRecord[]} loading={userRoleQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="grant" type="primary" onClick={() => openModal('授权角色', 'userRole')}>授权角色</Button>]} /> },
          { key: 'dataScope', label: '数据权限', children: <ProTable<DataScopeRecord> cardBordered rowKey="id" columns={dataScopeColumns} dataSource={filter(dataScopes) as DataScopeRecord[]} loading={dataScopeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="scope" type="primary" onClick={() => openModal('配置数据权限', 'dataScope')}>配置权限</Button>]} /> },
          { key: 'loginLog', label: '登录日志', children: <ProTable<LoginLogRecordView> cardBordered rowKey="id" columns={loginLogColumns} dataSource={filter(loginLogs) as LoginLogRecordView[]} loading={loginLogQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'operationLog', label: '操作日志', children: <ProTable<OperationLogRecordView> cardBordered rowKey="id" columns={operationLogColumns} dataSource={filter(operationLogs) as OperationLogRecordView[]} loading={operationLogQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'permissionChange', label: '权限变更', children: <ProTable<PermissionChangeRecord> cardBordered rowKey="id" columns={permissionChangeColumns} dataSource={filter(permissionChanges) as PermissionChangeRecord[]} loading={permissionChangeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('新增权限变更', 'permissionChange')}>新增变更</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={getAuthAuditDetailFields(detail)}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          if (!modalType) return;
          const values = await form.validateFields();
          await saveMutation.mutateAsync({
            type: modalType,
            values: editingPermissionChange ? { ...values, id: editingPermissionChange.id } : values,
          });
        }}
        confirmLoading={saveMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userName" label="用户"><Input /></Form.Item>
            <Form.Item name="roleName" label="角色名称"><Input /></Form.Item>
            <Form.Item name="roleCode" label="角色编码"><Input /></Form.Item>
            <Form.Item name="grantUser" label="授权人"><Input /></Form.Item>
            <Form.Item name="scopeType" label="范围类型"><Select options={scopeTypeOptions} /></Form.Item>
            <Form.Item name="scopeName" label="范围名称"><Input /></Form.Item>
            <Form.Item name="merchantName" label="关联商户"><Input /></Form.Item>
            <Form.Item name="storeName" label="关联门店"><Input /></Form.Item>
            <Form.Item name="changeNo" label="变更单号"><Input /></Form.Item>
            <Form.Item name="targetUser" label="目标用户"><Input /></Form.Item>
            <Form.Item name="changeType" label="变更类型"><Input /></Form.Item>
            <Form.Item name="beforeValue" label="变更前"><Input /></Form.Item>
            <Form.Item name="afterValue" label="变更后"><Input /></Form.Item>
            <Form.Item name="grantedAt" label="授权时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="changedAt" label="变更时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
            <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AuthAudit;
