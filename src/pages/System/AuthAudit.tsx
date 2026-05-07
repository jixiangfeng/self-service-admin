import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface UserRoleRecord {
  id: string;
  userName: string;
  roleName: string;
  roleCode: string;
  grantUser: string;
  status: number;
  grantedAt: string;
}

interface DataScopeRecord {
  id: string;
  roleName: string;
  scopeType: string;
  scopeName: string;
  merchantName: string;
  storeName: string;
  status: number;
}

interface LoginLogRecord {
  id: string;
  userName: string;
  loginIp: string;
  loginLocation: string;
  device: string;
  result: string;
  loginAt: string;
}

interface OperationLogRecord {
  id: string;
  userName: string;
  moduleCode: string;
  operationType: string;
  bizNo: string;
  result: string;
  operatedAt: string;
}

interface PermissionChangeRecord {
  id: string;
  changeNo: string;
  targetUser: string;
  changeType: string;
  beforeValue: string;
  afterValue: string;
  auditStatus: string;
  changedAt: string;
}

const statusMap = buildValueEnum(statusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);

const userRoles: UserRoleRecord[] = [
  { id: 'ur1', userName: '运营-何铭', roleName: '活动运营', roleCode: 'ACTIVITY_OPERATOR', grantUser: '系统管理员', status: 1, grantedAt: '2026-04-18 09:00:00' },
  { id: 'ur2', userName: '财务-许鸣', roleName: '财务审核', roleCode: 'FINANCE_AUDITOR', grantUser: '系统管理员', status: 1, grantedAt: '2026-04-17 18:20:00' },
];

const dataScopes: DataScopeRecord[] = [
  { id: 'ds1', roleName: '区域运营', scopeType: 'GROUP', scopeName: '华东门店组', merchantName: '-', storeName: '-', status: 1 },
  { id: 'ds2', roleName: '店长', scopeType: 'STORE', scopeName: '虹桥旗舰洗车站', merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', status: 1 },
];

const loginLogs: LoginLogRecord[] = [
  { id: 'll1', userName: '运营-何铭', loginIp: '10.10.2.18', loginLocation: '上海', device: 'Chrome / Windows', result: 'APPROVED', loginAt: '2026-04-18 09:10:00' },
  { id: 'll2', userName: '客服-刘莎', loginIp: '10.10.5.21', loginLocation: '上海', device: 'Edge / Windows', result: 'REJECTED', loginAt: '2026-04-18 08:55:00' },
];

const operationLogs: OperationLogRecord[] = [
  { id: 'ol1', userName: '运营-何铭', moduleCode: 'marketing.execution', operationType: '补发奖励', bizNo: 'RWD202604180001', result: 'APPROVED', operatedAt: '2026-04-18 10:20:00' },
  { id: 'ol2', userName: '财务-许鸣', moduleCode: 'settlement', operationType: '确认结算', bizNo: 'SET202604180001', result: 'PENDING', operatedAt: '2026-04-18 10:02:00' },
];

const permissionChanges: PermissionChangeRecord[] = [
  { id: 'pc1', changeNo: 'PERM202604180001', targetUser: '运营-何铭', changeType: '新增角色', beforeValue: '-', afterValue: '活动运营', auditStatus: 'APPROVED', changedAt: '2026-04-18 09:00:00' },
  { id: 'pc2', changeNo: 'PERM202604170006', targetUser: '店长-李思远', changeType: '调整数据范围', beforeValue: '徐汇夜洗门店', afterValue: '虹桥旗舰洗车站', auditStatus: 'PENDING', changedAt: '2026-04-17 19:30:00' },
];

const AuthAudit: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<UserRoleRecord | DataScopeRecord | LoginLogRecord | OperationLogRecord | PermissionChangeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ target: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
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
  ], []);

  const loginLogColumns = useMemo<ProColumns<LoginLogRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 140 },
    { title: 'IP', dataIndex: 'loginIp', width: 140 },
    { title: '地区', dataIndex: 'loginLocation', width: 120 },
    { title: '设备', dataIndex: 'device', width: 180 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '登录时间', dataIndex: 'loginAt', width: 180, render: (_, record) => formatDateTime(record.loginAt) },
  ], []);

  const operationLogColumns = useMemo<ProColumns<OperationLogRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 140 },
    { title: '模块', dataIndex: 'moduleCode', width: 180 },
    { title: '操作', dataIndex: 'operationType', width: 140 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '操作时间', dataIndex: 'operatedAt', width: 180, render: (_, record) => formatDateTime(record.operatedAt) },
  ], []);

  const permissionChangeColumns = useMemo<ProColumns<PermissionChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '目标用户', dataIndex: 'targetUser', width: 140 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
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
          { key: 'userRole', label: '多角色关系', children: <ProTable<UserRoleRecord> cardBordered rowKey="id" columns={userRoleColumns} dataSource={filter(userRoles) as UserRoleRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="grant" type="primary" onClick={() => openModal('授权角色')}>授权角色</Button>]} /> },
          { key: 'dataScope', label: '数据权限', children: <ProTable<DataScopeRecord> cardBordered rowKey="id" columns={dataScopeColumns} dataSource={filter(dataScopes) as DataScopeRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="scope" type="primary" onClick={() => openModal('配置数据权限')}>配置权限</Button>]} /> },
          { key: 'loginLog', label: '登录日志', children: <ProTable<LoginLogRecord> cardBordered rowKey="id" columns={loginLogColumns} dataSource={filter(loginLogs) as LoginLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'operationLog', label: '操作日志', children: <ProTable<OperationLogRecord> cardBordered rowKey="id" columns={operationLogColumns} dataSource={filter(operationLogs) as OperationLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'permissionChange', label: '权限变更', children: <ProTable<PermissionChangeRecord> cardBordered rowKey="id" columns={permissionChangeColumns} dataSource={filter(permissionChanges) as PermissionChangeRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核权限变更')}>审核变更</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('权限审计操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="target" label="用户 / 角色 / 变更单号" rules={[{ required: true, message: '请输入目标对象' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AuthAudit;
