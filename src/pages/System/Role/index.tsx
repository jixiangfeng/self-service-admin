import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Spin, Table, Tag, Tree } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { useCreateRole, useDeleteRole, usePermissionTree, useRolePermissionIds, useRoles, useUpdateRole } from '@/hooks/useApi';
import PageBanner from '@/components/PageBanner';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');
const SEARCH_FIELD_WIDTH = 240;

const normalizeTree = (nodes: any[] = []): any[] =>
  nodes.map((node) => ({
    title: node.permissionName || node.name || node.label || `节点-${node.id}`,
    key: node.id,
    children: normalizeTree(node.children || []),
  }));

const RoleManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
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

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    setQueryParams({
      pageNum: 1,
      pageSize: queryParams.pageSize,
      keyword: values.keyword?.trim() || undefined,
      status: values.status,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, status: undefined });
  };

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

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '角色名称', dataIndex: 'roleName', width: 160 },
    { title: '角色编码', dataIndex: 'roleCode', width: 180 },
    { title: '排序', dataIndex: 'sort', width: 100, render: (value: number) => value ?? 0 },
    { title: '权限数', dataIndex: 'permissionCount', width: 100, render: (value: number) => value ?? 0 },
    { title: '描述', dataIndex: 'description', render: (value: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '正常' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
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
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} onFinish={handleSearch}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <Space wrap size="middle">
              <Form.Item name="keyword" label="关键词" style={{ marginBottom: 0 }}>
                <Input placeholder="角色名称/角色编码" allowClear style={{ width: SEARCH_FIELD_WIDTH }} />
              </Form.Item>
              <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={[
                    { label: '正常', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                />
              </Form.Item>
            </Space>
            <Space>
              <Button type="primary" htmlType="submit">搜索</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </Form>
      </Card>
      <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建角色</Button>}>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
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
        />
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
