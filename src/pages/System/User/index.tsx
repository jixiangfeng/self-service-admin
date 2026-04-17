import React, { useState } from 'react';
import { Button, Card, Form, Input, Modal, Space, Spin, Table, Tag } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useUpdateUser, useUpdateUserStatus, useUsers } from '@/hooks/useApi';
import PageBanner from '@/components/PageBanner';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: usersData, isLoading } = useUsers({ pageNum: 1, pageSize: 100 });
  const updateMutation: any = useUpdateUser();
  const updateStatusMutation: any = useUpdateUserStatus();
  const users = (usersData as any)?.records || [];

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue({
      id: record.id,
      username: record.username,
      nickname: record.nickname,
      phone: record.phone,
      email: record.email,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values, {
      onSuccess: () => {
        setModalVisible(false);
        setEditingUser(null);
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '昵称', dataIndex: 'nickname', width: 140, render: (value: string) => value || '-' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value: string) => value || '-' },
    { title: '邮箱', dataIndex: 'email', width: 180, render: (value: string) => value || '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 180,
      render: (roles?: Array<{ roleName: string }>) =>
        roles?.length ? roles.map((item) => <Tag key={item.roleName}>{item.roleName}</Tag>) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '正常' : '禁用'}</Tag>,
    },
    { title: '最后登录', dataIndex: 'lastLoginTime', width: 180, render: formatDateTime },
    { title: '创建时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      fixed: 'right' as const,
      width: 140,
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

  if (isLoading) return <Spin />;

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="用户管理" subtitle="沿用 sz-web 的账号、角色挂载和状态控制能力。" icon={<UserOutlined />} />
      <Card>
        <Table columns={columns} dataSource={users} rowKey="id" scroll={{ x: 1280 }} />
      </Card>

      <Modal
        title={editingUser ? `编辑用户 #${editingUser.id}` : '编辑用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
        }}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
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
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
