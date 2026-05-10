import React, { useEffect, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, Select, Space, Tag, Tree } from 'antd';
import { DeleteOutlined, EditOutlined, FieldTimeOutlined, PlusOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { useCreateRole, useDeleteRole, usePermissionTree, useRolePermissionIds, useRoles, useUpdateRole } from '@/hooks/useApi';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const roleDetailFields: DetailField<Record<string, any>>[] = [
  { name: 'id', label: '角色ID' },
  { name: 'roleName', label: '角色名称' },
  { name: 'roleCode', label: '角色编码' },
  { name: 'sort', label: '排序' },
  { name: 'permissionCount', label: '权限数' },
  { name: 'description', label: '描述' },
  { name: 'status', label: '状态', render: (value) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '正常' : '禁用'}</Tag> },
  { name: 'createTime', label: '创建时间', render: (value) => formatDateTime(value) },
  { name: 'updateTime', label: '更新时间', render: (value) => formatDateTime(value) },
];

const normalizeTree = (nodes: any[] = []): any[] =>
  nodes.map((node) => ({
    title: node.permissionName || node.name || node.label || `节点-${node.id}`,
    key: node.id,
    children: normalizeTree(node.children || []),
  }));

const RoleManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [detailRole, setDetailRole] = useState<any>(null);
  const checkedPermissionIds = Form.useWatch('permissionIds', form) || [];
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const { data: rolesData, isLoading } = useRoles(queryParams);
  const { data: permissionTree } = usePermissionTree();
  const { data: currentPermissionIds = [], isLoading: permissionIdsLoading } = useRolePermissionIds(editingRole?.id, {
    enabled: modalVisible && !!editingRole?.id,
  } as any);
  const createMutation: any = useCreateRole();
  const updateMutation: any = useUpdateRole();
  const deleteMutation: any = useDeleteRole();
  const roles = (rolesData as any)?.records || [];

  useEffect(() => {
    if (editingRole?.id) {
      form.setFieldValue('permissionIds', currentPermissionIds);
      return;
    }

    form.setFieldValue('permissionIds', []);
  }, [currentPermissionIds, editingRole, form]);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldValue('permissionIds', []);
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRole(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        id: record.id,
        roleName: record.roleName,
        roleCode: record.roleCode,
        description: record.description,
        sort: record.sort ?? 0,
        status: record.status ?? 1,
        permissionIds: record.permissionIds || [],
      });
    }, 0);
  };

  const handleDelete = (id: number) => {
    showBusinessConfirm({
      title: '确认删除',
      content: '确定要删除该角色吗？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      sort: Number(values.sort ?? editingRole?.sort ?? 0),
      status: Number(values.status ?? editingRole?.status ?? 1),
    };
    if (editingRole) {
      updateMutation.mutate(payload, { onSuccess: closeModal });
    } else {
      createMutation.mutate(payload, { onSuccess: closeModal });
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '角色名称',
      dataIndex: 'roleName',
      width: 160,
      hideInSearch: true,
    },
    {
      title: '角色编码',
      dataIndex: 'roleCode',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      valueType: 'text',
      hideInTable: true,
      fieldProps: {
        placeholder: '角色名称/角色编码',
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 100,
      search: false,
      render: (_, record) => record.sort ?? 0,
    },
    {
      title: '权限数',
      dataIndex: 'permissionCount',
      width: 100,
      search: false,
      render: (_, record) => record.permissionCount ?? 0,
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
      render: (_, record) => record.description || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '正常' },
        0: { text: '禁用' },
      },
      render: (_, record) => <Tag color={record.status === 1 ? 'success' : 'default'}>{record.status === 1 ? '正常' : '禁用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      search: false,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => setDetailRole(record)}>
            详情
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="角色管理" subtitle="复用 sz-web 的角色编码、权限树和角色授权模型。" icon={<SafetyOutlined />} />
      <ProTable<any>
        columns={columns}
        loading={isLoading}
        dataSource={roles}
        rowKey="id"
        cardBordered
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        scroll={{ x: 1360 }}
        pagination={{
          current: (rolesData as any)?.current || queryParams.pageNum,
          pageSize: (rolesData as any)?.size || queryParams.pageSize,
          total: (rolesData as any)?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setQueryParams((prev) => ({
              ...prev,
              pageNum: page,
              pageSize: pageSize || prev.pageSize,
            }));
          },
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建角色
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams((prev) => ({
            ...prev,
            pageNum: 1,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            status: typeof values.status === 'number' ? values.status : undefined,
          }));
        }}
        onReset={() => {
          setQueryParams((prev) => ({
            ...prev,
            pageNum: 1,
            keyword: undefined,
            status: undefined,
          }));
        }}
      />

      <BusinessDetailModal title="角色详情" open={!!detailRole} onCancel={() => setDetailRole(null)} width={760}>
        {detailRole ? (
          <SchemaDetail
            record={detailRole}
            fields={roleDetailFields}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRole ? '角色维护' : '角色新增'}
        title={editingRole ? '编辑角色' : '新建角色'}
        subtitle="维护角色编码、状态和权限树，角色变更会影响后台菜单、按钮和数据操作边界。"
        meta={[editingRole ? '编辑模式' : '新建模式', `${checkedPermissionIds.length} 项权限`]}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={1040}
        destroyOnClose
        okText="保存角色"
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false} className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="角色基础" desc="角色编码用于权限校验，创建后应保持稳定。">
              <div className="merchant-editor-fields">
                <Form.Item name="id" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                  <Input autoComplete="off" placeholder="例如：门店运营" />
                </Form.Item>
                <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}>
                  <Input autoComplete="off" placeholder="例如：STORE_OPERATOR" />
                </Form.Item>
                <Form.Item name="sort" label="排序" initialValue={0}>
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue={1}>
                  <Select
                    options={[
                      { value: 1, label: '正常' },
                      { value: 0, label: '禁用' },
                    ]}
                    placeholder="请选择状态"
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<FieldTimeOutlined />} title="角色说明" desc="记录角色用途和授权边界，便于后续审计。">
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="description" label="描述">
                  <Input.TextArea rows={3} placeholder="例如：负责门店运营、设备巡检和客服工单处理" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyOutlined />} title="权限范围" desc="勾选菜单、按钮和操作权限，保存后立即影响角色授权。">
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="permissionIds" label="权限范围">
                  <Tree
                    checkable
                    defaultExpandAll
                    treeData={normalizeTree((permissionTree as any[]) || [])}
                    checkedKeys={checkedPermissionIds}
                    onCheck={(checkedKeys) => form.setFieldValue('permissionIds', Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked)}
                  />
                </Form.Item>
                {editingRole?.id && permissionIdsLoading ? (
                  <div style={{ marginTop: -8, color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>正在加载角色已有权限...</div>
                ) : null}
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default RoleManagement;
