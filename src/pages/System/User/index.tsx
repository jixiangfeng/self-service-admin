import React, { useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Select, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, SafetyCertificateOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useCreateUser, useDeleteUser, useResetUserPassword, useRoleOptions, useUpdateUser, useUpdateUserStatus, useUsers } from '@/hooks/useApi';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const userDetailFields: DetailField<Record<string, any>>[] = [
  { name: 'id', label: '用户ID' },
  { name: 'username', label: '用户名' },
  { name: 'nickname', label: '昵称' },
  { name: 'phone', label: '手机号' },
  { name: 'email', label: '邮箱' },
  { name: 'role', label: '角色编码', render: (value) => (value ? <Tag color="processing">{value}</Tag> : '-') },
  { name: 'status', label: '状态', render: (value) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '正常' : '禁用'}</Tag> },
  { name: 'createTime', label: '创建时间', render: (value) => formatDateTime(value) },
  { name: 'updateTime', label: '更新时间', render: (value) => formatDateTime(value) },
];

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [roleUser, setRoleUser] = useState<any>(null);
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
  const deleteMutation: any = useDeleteUser();
  const resetPasswordMutation: any = useResetUserPassword();
  const users = (usersData as any)?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const closePasswordModal = () => {
    setPasswordModalVisible(false);
    setPasswordUser(null);
    form.resetFields(['newPassword']);
  };

  const closeRoleModal = () => {
    setRoleModalVisible(false);
    setRoleUser(null);
    form.resetFields(['relationRoleCodes', 'grantUser']);
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

  const handleDelete = (record: any) => {
    showBusinessConfirm({
      title: '确认删除用户',
      content: `确定要删除用户 ${record.username} 吗？`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleResetPassword = async () => {
    const values = await form.validateFields(['newPassword']);
    resetPasswordMutation.mutate({ id: passwordUser.id, newPassword: values.newPassword }, { onSuccess: closePasswordModal });
  };

  const handleSaveUserRoles = async () => {
    const values = await form.validateFields(['relationRoleCodes', 'grantUser']);
    const roleCodes = (values.relationRoleCodes || []) as string[];
    await Promise.all(roleCodes.map((roleCode) => {
      const role = (roleOptions as any[]).find((item) => item.roleCode === roleCode);
      return api.authAudit.userRoles.add({
        userId: roleUser.id,
        userName: roleUser.username,
        roleName: role?.roleName || roleCode,
        roleCode,
        grantUser: values.grantUser || '系统管理员',
        status: 1,
        grantedAt: new Date().toISOString(),
      });
    }));
    closeRoleModal();
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
      width: 360,
      search: false,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => setDetailUser(record)}>
            详情
          </Button>
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
          <Button size="small" icon={<KeyOutlined />} onClick={() => { setPasswordUser(record); form.setFieldValue('newPassword', '123456'); setPasswordModalVisible(true); }}>
            重置密码
          </Button>
          <Button size="small" onClick={() => { setRoleUser(record); form.setFieldsValue({ relationRoleCodes: record.role ? [record.role] : [], grantUser: '系统管理员' }); setRoleModalVisible(true); }}>
            多角色
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
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

      <BusinessDetailModal title="用户详情" open={!!detailUser} onCancel={() => setDetailUser(null)} width={760}>
        {detailUser ? (
          <SchemaDetail
            record={detailUser}
            fields={userDetailFields}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingUser ? '账号维护' : '账号新增'}
        title={editingUser ? `编辑用户 #${editingUser.id}` : '新建用户'}
        subtitle="维护后台账号、联系信息、默认角色和启停状态，保证账号可登录、可授权、可审计。"
        meta={[editingUser ? '编辑模式' : '新建模式', '系统用户']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={980}
        okText={editingUser ? '保存用户' : '创建用户'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<UserOutlined />} title="账号基础" desc="维护登录名、昵称和联系方式。">
              <div className="merchant-editor-fields">
                <Form.Item name="id" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input placeholder="例如：admin.wash" />
                </Form.Item>
                <Form.Item name="nickname" label="昵称">
                  <Input placeholder="例如：运营管理员" />
                </Form.Item>
                <Form.Item name="phone" label="手机号">
                  <Input placeholder="用于通知和找回密码" />
                </Form.Item>
                <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确邮箱' }]}>
                  <Input placeholder="用于系统通知" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="登录与权限" desc="配置初始密码、默认角色和账号状态。">
              <div className="merchant-editor-fields">
                {!editingUser ? (
                  <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
                    <Input.Password placeholder="请输入初始密码" />
                  </Form.Item>
                ) : null}
                <Form.Item name="role" label="角色编码">
                  <Select
                    allowClear
                    placeholder="请选择默认角色"
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
                    placeholder="请选择状态"
                  />
                </Form.Item>
                <Form.Item name="operator" label="维护人">
                  <Input placeholder="例如：系统管理员" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="账号安全"
        title={passwordUser ? `重置密码 · ${passwordUser.username}` : '重置密码'}
        subtitle="重置后请通过安全渠道同步给使用人，必要时要求首次登录修改。"
        meta={['密码重置', passwordUser?.username || '未选择用户']}
        open={passwordModalVisible}
        onOk={handleResetPassword}
        onCancel={closePasswordModal}
        confirmLoading={resetPasswordMutation.isPending}
        width={760}
        okText="确认重置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<KeyOutlined />} title="新密码" desc="设置本次重置后的临时密码。">
              <div className="merchant-editor-fields">
                <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>
                <Form.Item name="resetOperator" label="操作人">
                  <Input placeholder="例如：系统管理员" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="resetReason" label="重置原因">
                  <Input placeholder="例如：用户忘记密码 / 岗位交接" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="用户授权"
        title={roleUser ? `多角色授权 · ${roleUser.username}` : '多角色授权'}
        subtitle="为用户追加角色关系，并记录授权人和授权说明，方便审计中心追溯。"
        meta={['多角色', roleUser?.username || '未选择用户']}
        open={roleModalVisible}
        onOk={handleSaveUserRoles}
        onCancel={closeRoleModal}
        width={860}
        okText="保存授权"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="角色范围" desc="选择需要授予的角色，可一次追加多个角色关系。">
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="relationRoleCodes" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
                  <Select
                    mode="multiple"
                    placeholder="请选择角色"
                    options={(roleOptions as any[]).map((item) => ({
                      value: item.roleCode,
                      label: `${item.roleName} / ${item.roleCode}`,
                    }))}
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="授权闭环" desc="记录授权人、授权原因和有效边界。">
              <div className="merchant-editor-fields">
                <Form.Item name="grantUser" label="授权人">
                  <Input placeholder="例如：系统管理员" />
                </Form.Item>
                <Form.Item name="grantReason" label="授权原因">
                  <Input placeholder="例如：运营岗位新增权限" />
                </Form.Item>
                <Form.Item name="scopeRemark" label="权限边界">
                  <Input placeholder="例如：仅处理门店运营和客服工单" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default UserManagement;
