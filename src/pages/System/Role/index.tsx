import React, { useEffect, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, Space, Tag, Tree } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { useCreateRole, useDeleteRole, usePermissionTree, useRolePermissionIds, useRoles, useUpdateRole } from '@/hooks/useApi';
import PageBanner from '@/components/PageBanner';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

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
        permissionIds: record.permissionIds || [],
      });
    }, 0);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该角色吗？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      sort: editingRole?.sort ?? 0,
      status: editingRole?.status ?? 1,
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

      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
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
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;
