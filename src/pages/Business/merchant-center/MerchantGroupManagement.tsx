import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Space, message } from 'antd';
import { ApartmentOutlined, EditOutlined, PlusOutlined, ShopOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import api from '@/services/backendService';
import type { MerchantGroupRecord, MerchantGroupStoreRecord, SelectOptionRecord } from '@/services/backendService';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const groupTypeOptions = [
  { value: 'OPERATING', label: '经营门店组' },
  { value: 'STORED_VALUE', label: '储值通用组' },
];
const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];
const groupTypeMap = buildValueEnum(groupTypeOptions);
const statusMap = buildValueEnum(statusOptions);

export default function MerchantGroupManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MerchantGroupRecord>();
  const [memberForm] = Form.useForm<MerchantGroupStoreRecord>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantGroupRecord | null>(null);
  const [memberGroup, setMemberGroup] = useState<MerchantGroupRecord | null>(null);
  const [editingMember, setEditingMember] = useState<MerchantGroupStoreRecord | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['merchantGroups'],
    queryFn: async () => (await api.merchantGroup.page({ pageNum: 1, pageSize: 200 })).data,
  });
  const merchantsQuery = useQuery({
    queryKey: ['merchantOptions', 'group-editor'],
    queryFn: async () => (await api.merchant.options({ includeDisabled: true })).data,
  });
  const storesQuery = useQuery({
    queryKey: ['storeOptions', memberGroup?.id],
    queryFn: async () => (await api.store.options(memberGroup?.groupType === 'OPERATING' ? memberGroup.merchantId : undefined)).data,
    enabled: Boolean(memberGroup),
  });
  const membersQuery = useQuery({
    queryKey: ['merchantGroupMembers', memberGroup?.id],
    queryFn: async () => (await api.merchantGroupStore.page({ pageNum: 1, pageSize: 200, groupId: memberGroup?.id })).data,
    enabled: Boolean(memberGroup),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: MerchantGroupRecord) => editing
      ? api.merchantGroup.edit({ ...values, id: editing.id })
      : api.merchantGroup.add(values as unknown as Record<string, unknown>),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['merchantGroups'] });
      message.success(editing ? '门店组资料已更新' : '门店组已创建');
      setEditorOpen(false);
      setEditing(null);
      form.resetFields();
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: MerchantGroupRecord) => api.merchantGroup.changeStatus(record.id, record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchantGroups'] }),
  });
  const saveMemberMutation = useMutation({
    mutationFn: async (values: MerchantGroupStoreRecord) => editingMember
      ? api.merchantGroupStore.edit({ ...values, id: editingMember.id, groupId: memberGroup?.id })
      : api.merchantGroupStore.add({ ...values, groupId: memberGroup?.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['merchantGroupMembers', memberGroup?.id] });
      await queryClient.invalidateQueries({ queryKey: ['merchantGroups'] });
      message.success(editingMember ? '成员已更新' : '成员已添加');
      setEditingMember(null);
      memberForm.resetFields();
    },
  });
  const removeMemberMutation = useMutation({
    mutationFn: (id: number) => api.merchantGroupStore.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchantGroupMembers', memberGroup?.id] }),
  });

  const records = (groupsQuery.data?.records || []) as MerchantGroupRecord[];
  const members = (membersQuery.data?.records || []) as MerchantGroupStoreRecord[];
  const selectedType = Form.useWatch('groupType', form);
  const merchantOptions = (merchantsQuery.data || []) as SelectOptionRecord[];
  const storeOptions = useMemo(() => (storesQuery.data || []) as SelectOptionRecord[], [storesQuery.data]);
  const storeMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item.label])), [storeOptions]);

  const openEditor = (record?: MerchantGroupRecord) => {
    setEditing(record || null);
    form.resetFields();
    form.setFieldsValue(record || ({ groupType: 'STORED_VALUE', status: 'DRAFT', storeCount: 0 } as MerchantGroupRecord));
    setEditorOpen(true);
  };

  const columns: ProColumns<MerchantGroupRecord>[] = [
    { title: '门店组', dataIndex: 'groupName', width: 220, render: (_, record) => <Space direction="vertical" size={0}><strong>{record.groupName}</strong><span>{record.groupCode}</span></Space> },
    { title: '类型', dataIndex: 'groupType', width: 130, valueType: 'select', valueEnum: groupTypeMap, render: (_, record) => renderStatusTag(record.groupType, groupTypeMap) },
    { title: '所属商户', dataIndex: 'merchantName', width: 180, render: (_, record) => record.groupType === 'STORED_VALUE' ? '跨商户' : record.merchantName || '-' },
    { title: '成员门店', dataIndex: 'storeCount', width: 110, search: false, render: (_, record) => `${record.storeCount || 0} 家` },
    { title: '负责人', dataIndex: 'owner', width: 140, search: false },
    { title: '状态', dataIndex: 'status', width: 110, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作', valueType: 'option', width: 310, fixed: 'right', render: (_, record) => [
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEditor(record)}>编辑资料</Button>,
        <Button key="members" type="link" icon={<ShopOutlined />} onClick={() => { setMemberGroup(record); setEditingMember(null); memberForm.resetFields(); }}>成员门店</Button>,
        record.groupType === 'STORED_VALUE' ? <Button key="plan" type="link" icon={<WalletOutlined />} onClick={() => navigate(`/settlement/clearing-plans?groupId=${record.id}`)}>结算方案</Button> : null,
        <Button key="status" type="link" danger={record.status === 'ENABLED'} onClick={() => showBusinessConfirm({
          title: record.status === 'ENABLED' ? '停用门店组' : '启用门店组',
          content: record.status === 'ENABLED' ? '停用后相关储值范围和当前结算规则将一并停用。' : '确认启用该门店组？',
          onOk: () => statusMutation.mutate(record),
        })}>{record.status === 'ENABLED' ? '停用' : '启用'}</Button>,
      ].filter(Boolean),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店组管理" subtitle="维护经营分组和储值通用范围；资金结算配置在财务结算中单独发布。" icon={<ApartmentOutlined />} />
      <ProTable<MerchantGroupRecord>
        cardBordered rowKey="id" search={false} loading={groupsQuery.isLoading} dataSource={records}
        columns={columns} pagination={{ pageSize: 10 }} scroll={{ x: 1400 }}
        toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新建门店组</Button>]}
      />

      <BusinessEditorModal
        open={editorOpen} title={editing ? '编辑门店组资料' : '新建门店组'} width={820}
        onCancel={() => setEditorOpen(false)} onOk={() => form.submit()} confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values as MerchantGroupRecord)}>
          <BusinessEditorSection icon={<ApartmentOutlined />} title="基本资料" desc="储值通用组只定义适用门店范围，不在这里维护财务比例。">
            <div className="merchant-editor-fields">
              <Form.Item name="groupName" label="门店组名称" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="groupType" label="分组类型" rules={[{ required: true }]}><Select disabled={Boolean(editing)} options={groupTypeOptions} /></Form.Item>
              {selectedType === 'OPERATING' ? <Form.Item name="merchantId" label="所属商户" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={merchantOptions} /></Form.Item> : null}
              <Form.Item name="owner" label="负责人"><Input /></Form.Item>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={statusOptions} /></Form.Item>
              <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
            </div>
          </BusinessEditorSection>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        open={Boolean(memberGroup)} title={memberGroup ? `成员门店 · ${memberGroup.groupName}` : '成员门店'} width={980}
        footer={null} onCancel={() => { setMemberGroup(null); setEditingMember(null); memberForm.resetFields(); }}
      >
        <Form form={memberForm} layout="vertical" onFinish={(values) => saveMemberMutation.mutate(values as MerchantGroupStoreRecord)}>
          <Space align="end" wrap style={{ marginBottom: 16 }}>
            <Form.Item name="storeId" label="门店" rules={[{ required: true }]} style={{ width: 320, marginBottom: 0 }}><Select showSearch optionFilterProp="label" options={storeOptions} /></Form.Item>
            <Form.Item name="status" label="状态" initialValue="ENABLED" style={{ width: 140, marginBottom: 0 }}><Select options={statusOptions.filter((item) => item.value !== 'DRAFT')} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMemberMutation.isPending}>{editingMember ? '更新' : '添加'}</Button>
          </Space>
        </Form>
        <ProTable<MerchantGroupStoreRecord>
          rowKey="id" search={false} options={false} dataSource={members} loading={membersQuery.isLoading} pagination={{ pageSize: 6 }}
          columns={[
            { title: '门店', dataIndex: 'storeName', render: (_, record) => record.storeName || storeMap.get(record.storeId) || `门店#${record.storeId}` },
            { title: '门店编码', dataIndex: 'storeCode' },
            { title: '状态', dataIndex: 'status', render: (_, record) => renderStatusTag(record.status, statusMap) },
            { title: '备注', dataIndex: 'remark' },
            { title: '操作', render: (_, record) => <Space><Button size="small" onClick={() => { setEditingMember(record); memberForm.setFieldsValue(record); }}>编辑</Button><Button size="small" danger onClick={() => showBusinessConfirm({ title: '移除成员门店', content: `确认移除「${record.storeName || record.storeId}」？`, onOk: () => removeMemberMutation.mutate(record.id) })}>移除</Button></Space> },
          ]}
        />
      </BusinessEditorModal>
    </div>
  );
}
