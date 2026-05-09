import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { PlatformDepartmentRecord, PlatformOrganizationChangeLogRecord, PlatformOrganizationRecord, PlatformPositionRecord } from '@/services/backendService';

type OrganizationRecord = PlatformOrganizationRecord;
type DepartmentRecord = PlatformDepartmentRecord;
type PositionRecord = PlatformPositionRecord;
type OrgChangeRecord = PlatformOrganizationChangeLogRecord;

const statusMap = buildValueEnum(statusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const organizationDetailFields: Record<string, DetailField<Record<string, any>>[]> = {
  org: [
    { name: 'orgCode', label: '组织编码' },
    { name: 'orgName', label: '组织名称' },
    { name: 'orgType', label: '组织类型' },
    { name: 'parentName', label: '上级组织' },
    { name: 'merchantName', label: '商户' },
    { name: 'storeName', label: '门店' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  dept: [
    { name: 'deptCode', label: '部门编码' },
    { name: 'deptName', label: '部门名称' },
    { name: 'organizationName', label: '所属组织' },
    { name: 'parentDept', label: '上级部门' },
    { name: 'manager', label: '负责人' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
  ],
  position: [
    { name: 'positionCode', label: '岗位编码' },
    { name: 'positionName', label: '岗位名称' },
    { name: 'departmentName', label: '部门' },
    { name: 'dataScope', label: '数据范围', render: (value) => renderStatusTag(value, scopeMap) },
    { name: 'roleName', label: '绑定角色' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
  ],
  change: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'objectName', label: '对象' },
    { name: 'changeType', label: '变更类型' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'operator', label: '操作人' },
    { name: 'changedAt', label: '变更时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '说明' },
  ],
};

const getOrganizationDetailFields = (record: OrganizationRecord | DepartmentRecord | PositionRecord | OrgChangeRecord): DetailField<Record<string, any>>[] => {
  if ('orgCode' in record) return organizationDetailFields.org;
  if ('deptCode' in record) return organizationDetailFields.dept;
  if ('positionCode' in record) return organizationDetailFields.position;
  return organizationDetailFields.change;
};

const Organization: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<OrganizationRecord | DepartmentRecord | PositionRecord | OrgChangeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const [editingOrg, setEditingOrg] = useState<OrganizationRecord | null>(null);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [editingPosition, setEditingPosition] = useState<PositionRecord | null>(null);
  const orgQuery = useQuery({
    queryKey: ['systemPlatformOrganizations', keyword],
    queryFn: async () => (await api.platformBase.organizations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const deptQuery = useQuery({
    queryKey: ['systemPlatformDepartments', keyword],
    queryFn: async () => (await api.platformBase.departments.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const positionQuery = useQuery({
    queryKey: ['systemPlatformPositions', keyword],
    queryFn: async () => (await api.platformBase.positions.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const changeQuery = useQuery({
    queryKey: ['systemPlatformOrganizationChangeLogs', keyword],
    queryFn: async () => (await api.platformBase.organizationChangeLogs.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });

  const organizations = orgQuery.data?.records || [];
  const departments = deptQuery.data?.records || [];
  const positions = positionQuery.data?.records || [];
  const changes = changeQuery.data?.records || [];
  const saveOrgMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => editingOrg?.id
      ? api.platformBase.organizations.edit({ ...values, id: editingOrg.id })
      : api.platformBase.organizations.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['systemPlatformOrganizations'] });
      setModalVisible(false);
      setEditingOrg(null);
      setEditingDept(null);
      setEditingPosition(null);
      form.resetFields();
      message.success('组织已保存');
    },
  });

  const saveDeptMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => editingDept?.id
      ? api.platformBase.departments.edit({ ...values, id: editingDept.id })
      : api.platformBase.departments.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['systemPlatformDepartments'] });
      setModalVisible(false);
      setEditingDept(null);
      form.resetFields();
      message.success('部门已保存');
    },
  });
  const savePositionMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => editingPosition?.id
      ? api.platformBase.positions.edit({ ...values, id: editingPosition.id })
      : api.platformBase.positions.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['systemPlatformPositions'] });
      setModalVisible(false);
      setEditingPosition(null);
      form.resetFields();
      message.success('岗位已保存');
    },
  });
  const saveChangeMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.platformBase.organizationChangeLogs.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['systemPlatformOrganizationChangeLogs'] });
      setModalVisible(false);
      form.resetFields();
      message.success('组织变更已记录');
    },
  });
  const removeOrgMutation = useMutation({
    mutationFn: (id: number) => api.platformBase.organizations.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemPlatformOrganizations'] }),
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openOrgModal = (record?: OrganizationRecord) => {
    setModalTitle(record ? '编辑组织' : '新增组织');
    setEditingOrg(record || null);
    form.setFieldsValue(record ? { ...record } : { status: 'ENABLED' });
    setModalVisible(true);
  };

  const openDeptModal = (record?: DepartmentRecord) => {
    setModalTitle(record ? '编辑部门' : '新增部门');
    setEditingDept(record || null);
    form.setFieldsValue(record ? { ...record } : { status: 1 });
    setModalVisible(true);
  };

  const openPositionModal = (record?: PositionRecord) => {
    setModalTitle(record ? '编辑岗位' : '新增岗位');
    setEditingPosition(record || null);
    form.setFieldsValue(record ? { ...record } : { status: 1 });
    setModalVisible(true);
  };

  const openChangeModal = () => {
    setModalTitle('新增组织变更');
    form.resetFields();
    setModalVisible(true);
  };

  const orgColumns = useMemo<ProColumns<OrganizationRecord>[]>(() => [
    { title: '组织编码', dataIndex: 'orgCode', width: 160 },
    { title: '组织名称', dataIndex: 'orgName', width: 180 },
    { title: '组织类型', dataIndex: 'orgType', width: 130 },
    { title: '上级组织', dataIndex: 'parentName', width: 160 },
    { title: '商户', dataIndex: 'merchantName', width: 160 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openOrgModal(record)}>编辑</Button>
        <Button size="small" type="link" danger onClick={() => removeOrgMutation.mutate(record.id)}>删除</Button>
      </>
    ) },
  ], []);

  const deptColumns = useMemo<ProColumns<DepartmentRecord>[]>(() => [
    { title: '部门编码', dataIndex: 'deptCode', width: 160 },
    { title: '部门名称', dataIndex: 'deptName', width: 160 },
    { title: '所属组织', dataIndex: 'organizationName', width: 180 },
    { title: '上级部门', dataIndex: 'parentDept', width: 140 },
    { title: '负责人', dataIndex: 'manager', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 140, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openDeptModal(record)}>编辑</Button>
      </>
    ) },
  ], []);

  const positionColumns = useMemo<ProColumns<PositionRecord>[]>(() => [
    { title: '岗位编码', dataIndex: 'positionCode', width: 160 },
    { title: '岗位名称', dataIndex: 'positionName', width: 160 },
    { title: '部门', dataIndex: 'departmentName', width: 140 },
    { title: '数据范围', dataIndex: 'dataScope', width: 120, render: (_, record) => renderStatusTag(record.dataScope, scopeMap) },
    { title: '绑定角色', dataIndex: 'roleName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 140, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openPositionModal(record)}>编辑</Button>
      </>
    ) },
  ], []);

  const changeColumns = useMemo<ProColumns<OrgChangeRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '对象', dataIndex: 'objectName', width: 180 },
    { title: '变更类型', dataIndex: 'changeType', width: 140 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="组织架构中心" subtitle="维护平台组织、部门、岗位和组织变更记录。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="组织" value={orgQuery.data?.total ?? organizations.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="部门" value={deptQuery.data?.total ?? departments.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="岗位" value={positionQuery.data?.total ?? positions.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="变更记录" value={changeQuery.data?.total ?? changes.length} suffix="条" /></Card></Col>
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
          { key: 'org', label: '组织', children: <ProTable<OrganizationRecord> cardBordered rowKey="id" columns={orgColumns} dataSource={organizations} loading={orgQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openOrgModal()}>新增组织</Button>]} /> },
          { key: 'dept', label: '部门', children: <ProTable<DepartmentRecord> cardBordered rowKey="id" columns={deptColumns} dataSource={filter(departments) as DepartmentRecord[]} loading={deptQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openDeptModal()}>新增部门</Button>]} /> },
          { key: 'position', label: '岗位', children: <ProTable<PositionRecord> cardBordered rowKey="id" columns={positionColumns} dataSource={filter(positions) as PositionRecord[]} loading={positionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openPositionModal()}>新增岗位</Button>]} /> },
          { key: 'change', label: '变更记录', children: <ProTable<OrgChangeRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes) as OrgChangeRecord[]} loading={changeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={openChangeModal}>新增变更</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={getOrganizationDetailFields(detail)}
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
          const values = await form.validateFields();
          if (modalTitle.includes('组织') && !modalTitle.includes('变更')) {
            await saveOrgMutation.mutateAsync(values);
            return;
          }
          if (modalTitle.includes('部门')) {
            await saveDeptMutation.mutateAsync(values);
            return;
          }
          if (modalTitle.includes('岗位')) {
            await savePositionMutation.mutateAsync(values);
            return;
          }
          if (modalTitle.includes('变更')) {
            await saveChangeMutation.mutateAsync(values);
          }
        }}
        confirmLoading={saveOrgMutation.isPending || saveDeptMutation.isPending || savePositionMutation.isPending || saveChangeMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="orgCode" label="组织编码"><Input /></Form.Item>
            <Form.Item name="orgName" label="组织名称"><Input /></Form.Item>
            <Form.Item name="deptCode" label="部门编码"><Input /></Form.Item>
            <Form.Item name="deptName" label="部门名称"><Input /></Form.Item>
            <Form.Item name="positionCode" label="岗位编码"><Input /></Form.Item>
            <Form.Item name="positionName" label="岗位名称"><Input /></Form.Item>
            <Form.Item name="organizationName" label="所属组织"><Input /></Form.Item>
            <Form.Item name="departmentName" label="所属部门"><Input /></Form.Item>
            <Form.Item name="parentName" label="上级组织"><Input /></Form.Item>
            <Form.Item name="parentDept" label="上级部门"><Input /></Form.Item>
            <Form.Item name="manager" label="负责人"><Input /></Form.Item>
            <Form.Item name="roleName" label="绑定角色"><Input /></Form.Item>
            <Form.Item name="dataScope" label="数据范围"><Select options={scopeTypeOptions} /></Form.Item>
            <Form.Item name="orgType" label="组织类型"><Input /></Form.Item>
            <Form.Item name="merchantName" label="关联商户"><Input /></Form.Item>
            <Form.Item name="storeName" label="关联门店"><Input /></Form.Item>
            <Form.Item name="changeNo" label="变更单号"><Input /></Form.Item>
            <Form.Item name="objectName" label="变更对象"><Input /></Form.Item>
            <Form.Item name="changeType" label="变更类型"><Input /></Form.Item>
            <Form.Item name="beforeValue" label="变更前"><Input /></Form.Item>
            <Form.Item name="afterValue" label="变更后"><Input /></Form.Item>
            <Form.Item name="operator" label="操作人"><Input /></Form.Item>
            <Form.Item name="changedAt" label="变更时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Organization;
