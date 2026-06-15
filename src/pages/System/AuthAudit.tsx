import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, BankOutlined, SafetyCertificateOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { DataScopeRelationRecord, LoginLogRecord, OperationLogRecord, PermissionChangeLogRecord, UserRoleRelationRecord } from '@/services/backendService';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';

type UserRoleRecord = UserRoleRelationRecord;
type DataScopeRecord = DataScopeRelationRecord;
type LoginLogRecordView = LoginLogRecord;
type OperationLogRecordView = OperationLogRecord;
type PermissionChangeRecord = PermissionChangeLogRecord;
type AuditTab = 'userRole' | 'dataScope' | 'permissionChange';


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};

const normalizePickerInitialValues = (record: Record<string, any>) => {
  const next = { ...record };
  Object.entries(next).forEach(([key, value]) => {
    if (!value) return;
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = toTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = toDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = toDateTimePickerValue(value) || value;
    }
  });
  return next;
};
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
      form.setFieldsValue(normalizePickerInitialValues(record as unknown as Record<string, any>));
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
    { title: '操作', dataIndex: 'operationType', width: 140 , render: (value) => formatEnumText(value, 'operationType', '操作') },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '操作时间', dataIndex: 'operatedAt', width: 180, render: (_, record) => formatDateTime(record.operatedAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const permissionChangeColumns = useMemo<ProColumns<PermissionChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '目标用户', dataIndex: 'targetUser', width: 140 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 , render: (value) => formatEnumText(value, 'changeType', '变更类型') },
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入用户、角色、范围、IP、模块、业务单号"
        onSearch={setKeyword}
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

      <BusinessDetailModal title="权限审计详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={getAuthAuditDetailFields(detail)}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingPermissionChange ? '权限变更审核' : '权限审计维护'}
        title={modalTitle}
        subtitle="按授权角色、数据权限和权限变更拆分字段，确保授权动作可追溯。"
        meta={[modalType === 'userRole' ? '角色授权' : modalType === 'dataScope' ? '数据权限' : '权限变更', editingPermissionChange ? '审核模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setModalType(null);
          setEditingPermissionChange(null);
          form.resetFields();
        }}
        onOk={async () => {
          if (!modalType) return;
          const values = normalizePickerValues(await form.validateFields());
          await saveMutation.mutateAsync({
            type: modalType,
            values: editingPermissionChange ? { ...values, id: editingPermissionChange.id } : values,
          });
        }}
        confirmLoading={saveMutation.isPending}
        width={1020}
        okText="保存审计记录"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            {modalType === 'userRole' ? (
              <>
                <BusinessEditorSection icon={<UserOutlined />} title="授权对象" desc="确认被授权用户和目标角色。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="userName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input placeholder="例如：zhangsan" /></Form.Item>
                    <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}><Input placeholder="例如：门店运营" /></Form.Item>
                    <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}><Input placeholder="例如：STORE_OPERATOR" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="授权闭环" desc="记录授权人、授权时间和启停状态。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="grantUser" label="授权人"><Input placeholder="例如：系统管理员" /></Form.Item>
                    <Form.Item name="grantedAt" label="授权时间"><DateTimeField /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="remark" label="说明"><Input.TextArea rows={3} placeholder="记录授权原因、审批依据或有效边界" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'dataScope' ? (
              <>
                <BusinessEditorSection icon={<TeamOutlined />} title="角色范围" desc="确认角色的数据权限类型和权限范围名称。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}><Input placeholder="例如：区域运营" /></Form.Item>
                    <Form.Item name="scopeType" label="范围类型" rules={[{ required: true, message: '请选择范围类型' }]}><Select options={scopeTypeOptions} placeholder="请选择范围类型" /></Form.Item>
                    <Form.Item name="scopeName" label="范围名称" rules={[{ required: true, message: '请输入范围名称' }]}><Input placeholder="例如：上海区域" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<BankOutlined />} title="业务归属" desc="可绑定到商户或门店，便于控制后台可见数据。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="merchantName" label="关联商户"><Input placeholder="例如：鲸洗直营" /></Form.Item>
                    <Form.Item name="storeName" label="关联门店"><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="remark" label="说明"><Input.TextArea rows={3} placeholder="记录数据范围用途、授权依据或边界说明" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'permissionChange' ? (
              <>
                <BusinessEditorSection icon={<AuditOutlined />} title="变更对象" desc="记录权限变更单号、目标用户和变更类型。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="changeNo" label="变更单号" rules={[{ required: true, message: '请输入变更单号' }]}><Input placeholder="例如：AUTH-CHG-20260510" /></Form.Item>
                    <Form.Item name="targetUser" label="目标用户" rules={[{ required: true, message: '请输入目标用户' }]}><Input placeholder="例如：zhangsan" /></Form.Item>
                    <Form.Item name="changeType" label="变更类型"><Input placeholder="例如：新增角色 / 回收权限 / 调整数据范围" /></Form.Item>
                    <Form.Item name="changedAt" label="变更时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="审核结果" desc="补齐变更前后、审核状态和说明。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="beforeValue" label="变更前"><Input placeholder="变更前权限或范围" /></Form.Item>
                    <Form.Item name="afterValue" label="变更后"><Input placeholder="变更后权限或范围" /></Form.Item>
                    <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} placeholder="请选择审核状态" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="remark" label="说明"><Input.TextArea rows={3} placeholder="记录审核意见、审批单号或回滚要求" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default AuthAudit;
