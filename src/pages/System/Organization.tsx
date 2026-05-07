import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface OrganizationRecord {
  id: string;
  orgCode: string;
  orgName: string;
  orgType: string;
  parentName: string;
  scopeType: string;
  status: number;
}

interface DepartmentRecord {
  id: string;
  deptCode: string;
  deptName: string;
  organizationName: string;
  parentDept: string;
  manager: string;
  status: number;
}

interface PositionRecord {
  id: string;
  positionCode: string;
  positionName: string;
  departmentName: string;
  dataScope: string;
  roleName: string;
  status: number;
}

interface OrgChangeRecord {
  id: string;
  changeNo: string;
  objectName: string;
  changeType: string;
  beforeValue: string;
  afterValue: string;
  changedAt: string;
}

const statusMap = buildValueEnum(statusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const organizations: OrganizationRecord[] = [
  { id: 'org1', orgCode: 'ORG-HQ', orgName: '平台总部', orgType: '平台组织', parentName: '-', scopeType: 'PLATFORM', status: 1 },
  { id: 'org2', orgCode: 'ORG-EAST', orgName: '华东运营中心', orgType: '区域组织', parentName: '平台总部', scopeType: 'GROUP', status: 1 },
];

const departments: DepartmentRecord[] = [
  { id: 'dept1', deptCode: 'DEPT-OPS', deptName: '运营部', organizationName: '平台总部', parentDept: '-', manager: '何铭', status: 1 },
  { id: 'dept2', deptCode: 'DEPT-FIN', deptName: '财务部', organizationName: '平台总部', parentDept: '-', manager: '许鸣', status: 1 },
];

const positions: PositionRecord[] = [
  { id: 'pos1', positionCode: 'POS-STORE-OPS', positionName: '区域运营', departmentName: '运营部', dataScope: 'GROUP', roleName: '区域运营角色', status: 1 },
  { id: 'pos2', positionCode: 'POS-FIN-AUDIT', positionName: '财务审核', departmentName: '财务部', dataScope: 'PLATFORM', roleName: '财务审核角色', status: 1 },
];

const changes: OrgChangeRecord[] = [
  { id: 'chg1', changeNo: 'ORGCHG202604180001', objectName: '华东运营中心', changeType: '范围调整', beforeValue: '上海', afterValue: '上海/杭州', changedAt: '2026-04-18 09:00:00' },
  { id: 'chg2', changeNo: 'ORGCHG202604170006', objectName: '财务审核', changeType: '岗位角色', beforeValue: '普通财务', afterValue: '财务审核角色', changedAt: '2026-04-17 18:00:00' },
];

const Organization: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<OrganizationRecord | DepartmentRecord | PositionRecord | OrgChangeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ code: string; name: string; status: number; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const orgColumns = useMemo<ProColumns<OrganizationRecord>[]>(() => [
    { title: '组织编码', dataIndex: 'orgCode', width: 160 },
    { title: '组织名称', dataIndex: 'orgName', width: 180 },
    { title: '组织类型', dataIndex: 'orgType', width: 130 },
    { title: '上级组织', dataIndex: 'parentName', width: 160 },
    { title: '范围', dataIndex: 'scopeType', width: 120, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const deptColumns = useMemo<ProColumns<DepartmentRecord>[]>(() => [
    { title: '部门编码', dataIndex: 'deptCode', width: 160 },
    { title: '部门名称', dataIndex: 'deptName', width: 160 },
    { title: '所属组织', dataIndex: 'organizationName', width: 180 },
    { title: '上级部门', dataIndex: 'parentDept', width: 140 },
    { title: '负责人', dataIndex: 'manager', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
  ], []);

  const positionColumns = useMemo<ProColumns<PositionRecord>[]>(() => [
    { title: '岗位编码', dataIndex: 'positionCode', width: 160 },
    { title: '岗位名称', dataIndex: 'positionName', width: 160 },
    { title: '部门', dataIndex: 'departmentName', width: 140 },
    { title: '数据范围', dataIndex: 'dataScope', width: 120, render: (_, record) => renderStatusTag(record.dataScope, scopeMap) },
    { title: '绑定角色', dataIndex: 'roleName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
  ], []);

  const changeColumns = useMemo<ProColumns<OrgChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '对象', dataIndex: 'objectName', width: 180 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="组织架构中心" subtitle="维护平台组织、部门、岗位和组织变更记录。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="组织" value={organizations.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="部门" value={departments.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="岗位" value={positions.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="变更记录" value={changes.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入组织、部门、岗位、角色、范围关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'org', label: '组织', children: <ProTable<OrganizationRecord> cardBordered rowKey="id" columns={orgColumns} dataSource={filter(organizations) as OrganizationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增组织')}>新增组织</Button>]} /> },
          { key: 'dept', label: '部门', children: <ProTable<DepartmentRecord> cardBordered rowKey="id" columns={deptColumns} dataSource={filter(departments) as DepartmentRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增部门')}>新增部门</Button>]} /> },
          { key: 'position', label: '岗位', children: <ProTable<PositionRecord> cardBordered rowKey="id" columns={positionColumns} dataSource={filter(positions) as PositionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增岗位')}>新增岗位</Button>]} /> },
          { key: 'change', label: '变更记录', children: <ProTable<OrgChangeRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes) as OrgChangeRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
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
          message.success('组织架构操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}><Input /></Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Organization;
