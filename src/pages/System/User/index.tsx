import React, { useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Spin, Table, Tag } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useRoleOptions, useUpdateUser, useUpdateUserStatus, useUsers } from '@/hooks/useApi';
import PageBanner from '@/components/PageBanner';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');
const SEARCH_FIELD_WIDTH = 240;

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
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
  const updateMutation: any = useUpdateUser();
  const updateStatusMutation: any = useUpdateUserStatus();
  const users = (usersData as any)?.records || [];

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    setQueryParams({
      pageNum: 1,
      pageSize: queryParams.pageSize,
      keyword: values.keyword?.trim() || undefined,
      status: values.status,
      role: values.role,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, status: undefined, role: undefined });
  };

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue({
      id: record.id,
      username: record.username,
      phone: record.phone,
      email: record.email,
      role: record.role,
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
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value: string) => value || '-' },
    { title: '邮箱', dataIndex: 'email', width: 180, render: (value: string) => value || '-' },
    {
      title: '角色',
      dataIndex: 'role',
      width: 160,
      render: (role?: string) => (role ? <Tag color="processing">{role}</Tag> : '-'),
    },
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
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} onFinish={handleSearch}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <Space wrap size="middle">
              <Form.Item name="keyword" label="关键词" style={{ marginBottom: 0 }}>
                <Input placeholder="用户名/手机号/邮箱" allowClear style={{ width: SEARCH_FIELD_WIDTH }} />
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
              <Form.Item name="role" label="角色" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={(roleOptions as any[]).map((item) => ({
                    label: item.roleName,
                    value: item.roleCode,
                  }))}
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
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
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
        />
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
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确邮箱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色编码">
            <Input placeholder="例如 PLATFORM_OPERATOR" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
