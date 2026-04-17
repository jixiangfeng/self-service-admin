import React, { useState } from 'react';
import { Button, Card, Form, Input, Modal, Space, Spin, Table, Tag, Tree } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { useCreateRole, useDeleteRole, usePermissionTree, useRoles, useUpdateRole } from '@/hooks/useApi';
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

  const { data: rolesData, isLoading } = useRoles({ pageNum: 1, pageSize: 100 });
  const { data: permissionTree } = usePermissionTree();
  const createMutation: any = useCreateRole();
  const updateMutation: any = useUpdateRole();
  const deleteMutation: any = useDeleteRole();
  const roles = (rolesData as any)?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleCreate = () => {
    setEditingRole(null);
    form.resetFields();
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

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '角色名称', dataIndex: 'roleName', width: 160 },
    { title: '角色编码', dataIndex: 'roleCode', width: 180 },
    { title: '描述', dataIndex: 'description', render: (value: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '正常' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      width: 160,
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

  if (isLoading) return <Spin />;

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="角色管理" subtitle="复用 sz-web 的角色编码、权限树和角色授权模型。" icon={<SafetyOutlined />} />
      <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建角色</Button>}>
        <Table columns={columns} dataSource={roles} rowKey="id" />
      </Card>

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
              checkedKeys={form.getFieldValue('permissionIds')}
              onCheck={(checkedKeys) => form.setFieldValue('permissionIds', checkedKeys)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;
