import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface MerchantAccountRecord {
  id: string;
  userName: string;
  mobile: string;
  accountType: string;
  merchantName: string;
  storeName: string;
  dataScopeType: string;
  status: number;
}

interface AccountGrantRecord {
  id: string;
  grantNo: string;
  userName: string;
  roleName: string;
  merchantName: string;
  grantUser: string;
  auditStatus: string;
  grantedAt: string;
}

interface AccountLoginRecord {
  id: string;
  userName: string;
  merchantName: string;
  storeName: string;
  loginIp: string;
  loginAt: string;
  result: string;
}

interface AccountChangeRecord {
  id: string;
  changeNo: string;
  userName: string;
  changeType: string;
  beforeValue: string;
  afterValue: string;
  changedAt: string;
}

const statusMap = buildValueEnum(statusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const accounts: MerchantAccountRecord[] = [
  { id: 'ma1', userName: '店长-李思远', mobile: '13800001111', accountType: '店长账号', merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', dataScopeType: 'STORE', status: 1 },
  { id: 'ma2', userName: '商户财务-许鸣', mobile: '13800002222', accountType: '财务账号', merchantName: '嘉定联营服务商', storeName: '-', dataScopeType: 'MERCHANT', status: 1 },
];

const grants: AccountGrantRecord[] = [
  { id: 'g1', grantNo: 'MAGR202604180001', userName: '店长-李思远', roleName: '门店店长', merchantName: '鲸洗直营', grantUser: '系统管理员', auditStatus: 'APPROVED', grantedAt: '2026-04-18 09:00:00' },
  { id: 'g2', grantNo: 'MAGR202604170006', userName: '商户财务-许鸣', roleName: '商户财务', merchantName: '嘉定联营服务商', grantUser: '招商主管-林悦', auditStatus: 'PENDING', grantedAt: '2026-04-17 18:00:00' },
];

const loginRecords: AccountLoginRecord[] = [
  { id: 'l1', userName: '店长-李思远', merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', loginIp: '10.20.1.10', loginAt: '2026-04-18 09:12:00', result: 'APPROVED' },
  { id: 'l2', userName: '商户财务-许鸣', merchantName: '嘉定联营服务商', storeName: '-', loginIp: '10.20.2.11', loginAt: '2026-04-18 08:50:00', result: 'REJECTED' },
];

const changes: AccountChangeRecord[] = [
  { id: 'c1', changeNo: 'MAC202604180001', userName: '店长-李思远', changeType: '绑定门店', beforeValue: '-', afterValue: '虹桥旗舰洗车站', changedAt: '2026-04-18 09:00:00' },
  { id: 'c2', changeNo: 'MAC202604170006', userName: '商户财务-许鸣', changeType: '数据范围', beforeValue: 'STORE', afterValue: 'MERCHANT', changedAt: '2026-04-17 18:00:00' },
];

const MerchantAccountManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<MerchantAccountRecord | AccountGrantRecord | AccountLoginRecord | AccountChangeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ userName: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const accountColumns = useMemo<ProColumns<MerchantAccountRecord>[]>(() => [
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '账号类型', dataIndex: 'accountType', width: 130 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '数据范围', dataIndex: 'dataScopeType', width: 120, render: (_, record) => renderStatusTag(record.dataScopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const grantColumns = useMemo<ProColumns<AccountGrantRecord>[]>(() => [
    { title: '授权单号', dataIndex: 'grantNo', width: 180 },
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '角色', dataIndex: 'roleName', width: 140 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '授权人', dataIndex: 'grantUser', width: 140 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '授权时间', dataIndex: 'grantedAt', width: 180, render: (_, record) => formatDateTime(record.grantedAt) },
  ], []);

  const loginColumns = useMemo<ProColumns<AccountLoginRecord>[]>(() => [
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '商户', dataIndex: 'merchantName', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '登录IP', dataIndex: 'loginIp', width: 140 },
    { title: '结果', dataIndex: 'result', width: 120, render: (_, record) => renderStatusTag(record.result, auditStatusMap) },
    { title: '登录时间', dataIndex: 'loginAt', width: 180, render: (_, record) => formatDateTime(record.loginAt) },
  ], []);

  const changeColumns = useMemo<ProColumns<AccountChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '账号', dataIndex: 'userName', width: 140 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户账号中心" subtitle="维护商户账号绑定、角色授权、登录记录和账号变更日志。" icon={<UserSwitchOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="商户账号" value={accounts.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审授权" value={grants.filter((item) => item.auditStatus === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="登录失败" value={loginRecords.filter((item) => item.result === 'REJECTED').length} suffix="次" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="账号变更" value={changes.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入账号、商户、门店、角色、授权单号' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'account', label: '账号绑定', children: <ProTable<MerchantAccountRecord> cardBordered rowKey="id" columns={accountColumns} dataSource={filter(accounts) as MerchantAccountRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增商户账号')}>新增账号</Button>]} /> },
          { key: 'grant', label: '角色授权', children: <ProTable<AccountGrantRecord> cardBordered rowKey="id" columns={grantColumns} dataSource={filter(grants) as AccountGrantRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核角色授权')}>审核授权</Button>]} /> },
          { key: 'login', label: '登录记录', children: <ProTable<AccountLoginRecord> cardBordered rowKey="id" columns={loginColumns} dataSource={filter(loginRecords) as AccountLoginRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'change', label: '账号变更', children: <ProTable<AccountChangeRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes) as AccountChangeRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
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
          message.success('商户账号操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userName" label="账号 / 手机号" rules={[{ required: true, message: '请输入账号或手机号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantAccountManagement;
