import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { ApartmentOutlined, AuditOutlined, BankOutlined, PartitionOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  publishStatusOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { PlatformDepartmentRecord, PlatformOrganizationChangeLogRecord, PlatformOrganizationRecord, PlatformPositionRecord } from '@/services/backendService';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';

type OrganizationRecord = PlatformOrganizationRecord;
type DepartmentRecord = PlatformDepartmentRecord;
type PositionRecord = PlatformPositionRecord;
type OrgChangeRecord = PlatformOrganizationChangeLogRecord;
type OrganizationModalType = 'org' | 'dept' | 'position' | 'change' | null;


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
const orgStatusMap = buildValueEnum(publishStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const organizationDetailFields: Record<string, DetailField<Record<string, any>>[]> = {
  org: [
    { name: 'orgCode', label: '组织编码' },
    { name: 'orgName', label: '组织名称' },
    { name: 'orgType', label: '组织类型' },
    { name: 'parentName', label: '上级组织' },
    { name: 'merchantName', label: '商户' },
    { name: 'storeName', label: '门店' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, orgStatusMap) },
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
  const [modalType, setModalType] = useState<OrganizationModalType>(null);
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

  const confirmRemoveOrg = (record: OrganizationRecord) => {
    showBusinessConfirm({
      title: '确认删除组织',
      content: `确定删除组织「${record.orgName || record.orgCode}」吗？删除后相关组织配置将不可用。`,
      onOk: () => removeOrgMutation.mutate(record.id),
    });
  };

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openOrgModal = (record?: OrganizationRecord) => {
    setModalTitle(record ? '编辑组织' : '新增组织');
    setModalType('org');
    setEditingDept(null);
    setEditingPosition(null);
    form.resetFields();
    setEditingOrg(record || null);
    form.setFieldsValue(record ? normalizePickerInitialValues(record as unknown as Record<string, any>) : { status: 'PUBLISHED' });
    setModalVisible(true);
  };

  const openDeptModal = (record?: DepartmentRecord) => {
    setModalTitle(record ? '编辑部门' : '新增部门');
    setModalType('dept');
    setEditingOrg(null);
    setEditingPosition(null);
    form.resetFields();
    setEditingDept(record || null);
    form.setFieldsValue(record ? normalizePickerInitialValues(record as unknown as Record<string, any>) : { status: 1 });
    setModalVisible(true);
  };

  const openPositionModal = (record?: PositionRecord) => {
    setModalTitle(record ? '编辑岗位' : '新增岗位');
    setModalType('position');
    setEditingOrg(null);
    setEditingDept(null);
    form.resetFields();
    setEditingPosition(record || null);
    form.setFieldsValue(record ? normalizePickerInitialValues(record as unknown as Record<string, any>) : { status: 1 });
    setModalVisible(true);
  };

  const openChangeModal = () => {
    setModalTitle('新增组织变更');
    setModalType('change');
    setEditingOrg(null);
    setEditingDept(null);
    setEditingPosition(null);
    form.resetFields();
    setModalVisible(true);
  };

  const closeEditor = () => {
    setModalVisible(false);
    setModalType(null);
    setEditingOrg(null);
    setEditingDept(null);
    setEditingPosition(null);
    form.resetFields();
  };

  const orgColumns = useMemo<ProColumns<OrganizationRecord>[]>(() => [
    { title: '组织编码', dataIndex: 'orgCode', width: 160 },
    { title: '组织名称', dataIndex: 'orgName', width: 180 },
    { title: '组织类型', dataIndex: 'orgType', width: 130 , render: (value) => formatEnumText(value, 'orgType', '组织类型') },
    { title: '上级组织', dataIndex: 'parentName', width: 160 },
    { title: '商户', dataIndex: 'merchantName', width: 160 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, orgStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openOrgModal(record)}>编辑</Button>
        <Button size="small" type="link" danger onClick={() => confirmRemoveOrg(record)}>删除</Button>
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
    { title: '变更类型', dataIndex: 'changeType', width: 140 , render: (value) => formatEnumText(value, 'changeType', '变更类型') },
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入组织、部门、岗位、角色、范围关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'org', label: '组织', children: <ProTable<OrganizationRecord> cardBordered rowKey="id" columns={orgColumns} dataSource={organizations} loading={orgQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openOrgModal()}>新增组织</Button>]} /> },
          { key: 'dept', label: '部门', children: <ProTable<DepartmentRecord> cardBordered rowKey="id" columns={deptColumns} dataSource={filter(departments) as DepartmentRecord[]} loading={deptQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openDeptModal()}>新增部门</Button>]} /> },
          { key: 'position', label: '岗位', children: <ProTable<PositionRecord> cardBordered rowKey="id" columns={positionColumns} dataSource={filter(positions) as PositionRecord[]} loading={positionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openPositionModal()}>新增岗位</Button>]} /> },
          { key: 'change', label: '变更记录', children: <ProTable<OrgChangeRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changes) as OrgChangeRecord[]} loading={changeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={openChangeModal}>新增变更</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="组织架构详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={getOrganizationDetailFields(detail)}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={modalTitle.includes('编辑') ? '组织架构维护' : '组织架构新增'}
        title={modalTitle}
        subtitle="按组织、部门、岗位和变更记录拆分字段，避免把无关配置堆到一个表单里。"
        meta={[modalType === 'org' ? '组织' : modalType === 'dept' ? '部门' : modalType === 'position' ? '岗位' : '变更记录', modalTitle.includes('编辑') ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={closeEditor}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          if (modalType === 'org') {
            await saveOrgMutation.mutateAsync(values);
            return;
          }
          if (modalType === 'dept') {
            await saveDeptMutation.mutateAsync(values);
            return;
          }
          if (modalType === 'position') {
            await savePositionMutation.mutateAsync(values);
            return;
          }
          if (modalType === 'change') {
            await saveChangeMutation.mutateAsync(values);
          }
        }}
        confirmLoading={saveOrgMutation.isPending || saveDeptMutation.isPending || savePositionMutation.isPending || saveChangeMutation.isPending}
        width={1040}
        okText="保存"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            {modalType === 'org' ? (
              <>
                <BusinessEditorSection icon={<ApartmentOutlined />} title="组织基础" desc="维护平台组织编码、名称、类型和上下级关系。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="orgCode" label="组织编码" rules={[{ required: true, message: '请输入组织编码' }]}><Input placeholder="例如：PLATFORM-SH" /></Form.Item>
                    <Form.Item name="orgName" label="组织名称" rules={[{ required: true, message: '请输入组织名称' }]}><Input placeholder="例如：上海运营中心" /></Form.Item>
                    <Form.Item name="orgType" label="组织类型"><Input placeholder="例如：平台 / 区域 / 门店" /></Form.Item>
                    <Form.Item name="parentName" label="上级组织"><Input placeholder="上级组织名称" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<BankOutlined />} title="业务归属" desc="关联商户和门店，便于数据权限和运营看板按组织聚合。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="merchantName" label="关联商户"><Input placeholder="例如：鲸洗直营" /></Form.Item>
                    <Form.Item name="storeName" label="关联门店"><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'dept' ? (
              <>
                <BusinessEditorSection icon={<PartitionOutlined />} title="部门基础" desc="维护部门编码、名称和所属组织。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="deptCode" label="部门编码" rules={[{ required: true, message: '请输入部门编码' }]}><Input placeholder="例如：OPS-DEPT" /></Form.Item>
                    <Form.Item name="deptName" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}><Input placeholder="例如：运营部" /></Form.Item>
                    <Form.Item name="organizationName" label="所属组织"><Input placeholder="例如：上海运营中心" /></Form.Item>
                    <Form.Item name="parentDept" label="上级部门"><Input placeholder="上级部门名称" /></Form.Item>
                    <Form.Item name="manager" label="负责人"><Input placeholder="部门负责人" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'position' ? (
              <>
                <BusinessEditorSection icon={<UserSwitchOutlined />} title="岗位基础" desc="维护岗位编码、名称、所属部门和绑定角色。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="positionCode" label="岗位编码" rules={[{ required: true, message: '请输入岗位编码' }]}><Input placeholder="例如：STORE_MANAGER" /></Form.Item>
                    <Form.Item name="positionName" label="岗位名称" rules={[{ required: true, message: '请输入岗位名称' }]}><Input placeholder="例如：门店店长" /></Form.Item>
                    <Form.Item name="departmentName" label="所属部门"><Input placeholder="例如：门店运营部" /></Form.Item>
                    <Form.Item name="roleName" label="绑定角色"><Input placeholder="例如：门店运营" /></Form.Item>
                    <Form.Item name="dataScope" label="数据范围"><Select options={scopeTypeOptions} placeholder="请选择数据范围" /></Form.Item>
                    <Form.Item name="status" label="状态"><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'change' ? (
              <>
                <BusinessEditorSection icon={<AuditOutlined />} title="变更对象" desc="记录组织、部门或岗位的变更对象和变更类型。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="changeNo" label="变更单号" rules={[{ required: true, message: '请输入变更单号' }]}><Input placeholder="例如：ORG-CHG-20260510" /></Form.Item>
                    <Form.Item name="objectName" label="变更对象" rules={[{ required: true, message: '请输入变更对象' }]}><Input placeholder="组织 / 部门 / 岗位名称" /></Form.Item>
                    <Form.Item name="changeType" label="变更类型"><Input placeholder="例如：新增 / 调整负责人 / 停用" /></Form.Item>
                    <Form.Item name="operator" label="操作人"><Input placeholder="例如：系统管理员" /></Form.Item>
                    <Form.Item name="changedAt" label="变更时间"><DateTimeField /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<AuditOutlined />} title="变更内容" desc="补齐变更前后内容和说明，方便后续审计追溯。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="beforeValue" label="变更前"><Input placeholder="变更前关键内容" /></Form.Item>
                    <Form.Item name="afterValue" label="变更后"><Input placeholder="变更后关键内容" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-all" name="remark" label="说明"><Input.TextArea rows={3} placeholder="记录变更原因、审批依据或影响范围" /></Form.Item>
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

export default Organization;
