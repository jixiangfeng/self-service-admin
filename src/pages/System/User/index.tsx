import React, { useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, Select, Space, Tag } from 'antd';
import { EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useCreateUser, useRoleOptions, useUpdateUser, useUpdateUserStatus, useUsers } from '@/hooks/useApi';
import PageBanner from '@/components/PageBanner';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    status: undefined as number | undefined,
    role: undefined as string | undefined,
  });

  const { data: usersData, isLoading } = useUsers(queryParams);
  const { data: roleOptions = [] } = useRoleOptions();
  const createMutation: any = useCreateUser();
  const updateMutation: any = useUpdateUser();
  const updateStatusMutation: any = useUpdateUserStatus();
  const users = (usersData as any)?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, role: 'PLATFORM_OPERATOR', password: '123456' });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue({
      id: record.id,
      username: record.username,
      nickname: record.nickname,
      phone: record.phone,
      email: record.email,
      role: record.role,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      updateMutation.mutate(values, { onSuccess: closeModal });
      return;
    }

    createMutation.mutate(values, { onSuccess: closeModal });
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 140,
      hideInSearch: true,
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '用户名/手机号/邮箱',
      },
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      search: false,
      render: (_, record) => record.phone || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 180,
      search: false,
      render: (_, record) => record.email || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 160,
      valueType: 'select',
      valueEnum: (roleOptions as any[]).reduce((acc, item) => {
        acc[item.roleCode] = { text: item.roleName };
        return acc;
      }, {} as Record<string, { text: string }>),
      render: (_, record) => (record.role ? <Tag color="processing">{record.role}</Tag> : '-'),
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
      fixed: 'right' as const,
      width: 140,
      search: false,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => updateStatusMutation.mutate({ id: record.id, status: record.status === 1 ? 0 : 1 })}
            loading={updateStatusMutation.isPending}
          >
            {record.status === 1 ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="用户管理" subtitle="沿用 sz-web 的账号、角色挂载和状态控制能力。" icon={<UserOutlined />} />
      <ProTable<any>
        columns={columns}
        loading={isLoading}
        dataSource={users}
        rowKey="id"
        cardBordered
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        scroll={{ x: 1460 }}
        pagination={{
          current: (usersData as any)?.current || queryParams.pageNum,
          pageSize: (usersData as any)?.size || queryParams.pageSize,
          total: (usersData as any)?.total || 0,
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
        onSubmit={(values) => {
          setQueryParams((prev) => ({
            ...prev,
            pageNum: 1,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            status: typeof values.status === 'number' ? values.status : undefined,
            role: typeof values.role === 'string' ? values.role || undefined : undefined,
          }));
        }}
        onReset={() => {
          setQueryParams((prev) => ({
            ...prev,
            pageNum: 1,
            keyword: undefined,
            status: undefined,
            role: undefined,
          }));
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建用户
          </Button>,
        ]}
      />

      <Modal
        title={editingUser ? `编辑用户 #${editingUser.id}` : '新建用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={860}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nickname" label="昵称">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确邮箱' }]}>
              <Input />
            </Form.Item>
            {!editingUser ? (
              <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
                <Input.Password />
              </Form.Item>
            ) : null}
            <Form.Item name="role" label="角色编码">
              <Select
                options={(roleOptions as any[]).map((item) => ({
                  value: item.roleCode,
                  label: `${item.roleName} / ${item.roleCode}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { value: 1, label: '正常' },
                  { value: 0, label: '禁用' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
