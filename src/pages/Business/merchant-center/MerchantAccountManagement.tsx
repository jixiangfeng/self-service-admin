import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Select, Space, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ShopOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { merchantAccountTypeOptions, statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  AppUserOptionRecord,
  MerchantAccountRecord,
  MerchantAccountSaveRequest,
  SelectOptionRecord,
} from '@/services/backendService';
import { buildValueEnum, formatEnumText, renderStatusTag } from '@/pages/Business/shared';

type MerchantAccountFormValues = MerchantAccountSaveRequest;

const statusMap = buildValueEnum(statusOptions);
const manageableScopeOptions = [
  { value: 'MERCHANT', label: '所选商户的全部门店' },
  { value: 'STORE', label: '仅所选门店' },
];
const scopeMap = buildValueEnum(manageableScopeOptions);

const pageData = <T,>(result: unknown) => {
  const payload = result as { data?: { records?: T[]; total?: number }; records?: T[]; total?: number };
  return (payload.data || payload) as { records?: T[]; total?: number };
};

const accountDetailFields: DetailField<MerchantAccountRecord>[] = [
  { name: 'userName', label: '商户人员' },
  { name: 'mobile', label: '手机号' },
  { name: 'accountType', label: '商户端权限模板', render: (value) => formatEnumText(value, 'accountType', '权限模板') },
  { name: 'merchantName', label: '所属商户' },
  { name: 'storeName', label: '指定门店' },
  { name: 'dataScopeType', label: '可管理范围', render: (value) => scopeMap[value as string]?.text || value || '-' },
  { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
  { name: 'remark', label: '备注' },
];

const MerchantAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<MerchantAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<MerchantAccountRecord | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MerchantAccountRecord | null>(null);
  const [form] = Form.useForm<MerchantAccountFormValues>();
  const [searchForm] = Form.useForm<{ keyword?: string }>();
  const merchantId = Form.useWatch('merchantId', form);
  const dataScopeType = Form.useWatch('dataScopeType', form);

  const { data: appUserOptions = [], isLoading: appUsersLoading } = useQuery({
    queryKey: ['appUserOptionsForMerchantAccounts'],
    queryFn: async () => (await api.asset.userOptions()).data,
  });
  const { data: merchantOptions = [] } = useQuery({
    queryKey: ['merchantOptionsForAccounts'],
    queryFn: async () => (await api.merchant.options()).data,
  });
  const { data: storeOptions = [] } = useQuery({
    queryKey: ['storeOptionsForAccounts', merchantId],
    queryFn: async () => (await api.store.options(merchantId)).data,
    enabled: Boolean(merchantId),
  });

  const selectableAppUsers = useMemo(() => {
    const options = [...(appUserOptions as AppUserOptionRecord[])];
    if (editingAccount && !options.some((item) => item.value === editingAccount.userId)) {
      options.unshift({
        value: editingAccount.userId,
        label: `${editingAccount.userName}${editingAccount.mobile ? `（${editingAccount.mobile}）` : ''}`,
        userName: editingAccount.userName,
        mobile: editingAccount.mobile,
      });
    }
    return options;
  }, [appUserOptions, editingAccount]);

  const currentKeyword = () => String(searchForm.getFieldValue('keyword') || '').trim() || undefined;

  const fetchAccounts = async (keyword?: string) => {
    setLoading(true);
    try {
      const result = await api.merchantAccount.page({ current: 1, size: 100, keyword });
      setAccounts(pageData<MerchantAccountRecord>(result).records || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void api.merchantAccount.page({ current: 1, size: 100 }).then((result) => {
      if (active) setAccounts(pageData<MerchantAccountRecord>(result).records || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const openEditor = (record?: MerchantAccountRecord) => {
    const editing = record || null;
    setEditingAccount(editing);
    form.resetFields();
    form.setFieldsValue(editing ? {
      userId: editing.userId,
      accountType: editing.accountType,
      merchantId: editing.merchantId as number,
      storeId: editing.storeId,
      dataScopeType: editing.dataScopeType as 'MERCHANT' | 'STORE',
      status: editing.status,
      remark: editing.remark,
    } : {
      accountType: 'STORE_MANAGER',
      dataScopeType: 'MERCHANT',
      status: 1,
    } as MerchantAccountFormValues);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingAccount(null);
    form.resetFields();
  };

  const saveAccount = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editingAccount) {
        await api.merchantAccount.edit(editingAccount.id, values);
        message.success('商户人员权限已更新');
      } else {
        await api.merchantAccount.add(values);
        message.success('商户人员已添加');
      }
      closeEditor();
      await fetchAccounts(currentKeyword());
    } finally {
      setSaving(false);
    }
  };

  const confirmAccountStatus = (record: MerchantAccountRecord) => {
    const enabling = record.status !== 1;
    showBusinessConfirm({
      eyebrow: '商户端权限确认',
      title: `确认${enabling ? '启用' : '停用'}该人员`,
      content: `${record.userName}${enabling ? '将可以' : '将不能'}继续使用已配置范围内的小程序商户工具。`,
      okText: `确认${enabling ? '启用' : '停用'}`,
      danger: !enabling,
      onOk: async () => {
        await api.merchantAccount.changeStatus(record.id, enabling ? 1 : 0);
        message.success('商户人员状态已更新');
        await fetchAccounts(currentKeyword());
      },
    });
  };

  const confirmDelete = (record: MerchantAccountRecord) => {
    showBusinessConfirm({
      eyebrow: '移除商户人员',
      title: `确认移除 ${record.userName}`,
      content: '移除后，该用户将立即失去当前商户或门店的小程序商户工具权限。',
      okText: '确认移除',
      danger: true,
      onOk: async () => {
        await api.merchantAccount.remove(record.id);
        message.success('商户人员已移除');
        await fetchAccounts(currentKeyword());
      },
    });
  };

  const columns: ProColumns<MerchantAccountRecord>[] = [
    { title: '商户人员', dataIndex: 'userName', width: 140 },
    { title: '手机号', dataIndex: 'mobile', width: 140, render: (_, record) => record.mobile || '-' },
    { title: '商户端权限模板', dataIndex: 'accountType', width: 160, render: (value) => formatEnumText(value, 'accountType', '权限模板') },
    { title: '所属商户', dataIndex: 'merchantName', width: 180 },
    { title: '指定门店', dataIndex: 'storeName', width: 180, render: (_, record) => record.storeName || '-' },
    { title: '可管理范围', dataIndex: 'dataScopeType', width: 180, render: (_, record) => renderStatusTag(record.dataScopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(record)}>编辑</Button>
          <Button size="small" onClick={() => confirmAccountStatus(record)}>{record.status === 1 ? '停用' : '启用'}</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(record)}>移除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="商户人员权限"
        subtitle="绑定可使用小程序商户工具的人员；后台登录账号与系统角色在系统管理中维护。"
        icon={<UserSwitchOutlined />}
      />

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => fetchAccounts(String(values.keyword || '').trim() || undefined)}
      >
        <Form.Item name="keyword" label="搜索">
          <Input allowClear placeholder="姓名、手机号、商户或门店" style={{ width: 320 }} />
        </Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item>
        <Form.Item><Button onClick={() => { searchForm.resetFields(); void fetchAccounts(); }}>重置</Button></Form.Item>
      </Form>

      <ProTable<MerchantAccountRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={accounts}
        loading={loading}
        search={false}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1380 }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>添加商户人员</Button>,
        ]}
      />

      <BusinessDetailModal title="商户人员权限详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail} fields={accountDetailFields} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingAccount ? '调整商户端权限' : '添加商户人员'}
        title={editingAccount ? `编辑 ${editingAccount.userName}` : '添加商户人员'}
        subtitle="人员身份来自小程序用户档案，姓名和手机号无需重复录入。"
        meta={[editingAccount ? '编辑权限' : '新建绑定']}
        open={editorVisible}
        onCancel={closeEditor}
        onOk={saveAccount}
        okText={editingAccount ? '保存变更' : '确认添加'}
        confirmLoading={saving}
        width={920}
        forceRender
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="选择人员" desc="人员姓名与手机号以小程序用户档案为准。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item
                  className="merchant-editor-field-span-2"
                  name="userId"
                  label="小程序用户（姓名 / 手机号）"
                  rules={[{ required: true, message: '请选择小程序用户' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={selectableAppUsers}
                    loading={appUsersLoading}
                    disabled={Boolean(editingAccount)}
                    placeholder="搜索姓名或手机号"
                  />
                </Form.Item>
                <Form.Item name="accountType" label="商户端权限模板" rules={[{ required: true, message: '请选择权限模板' }]}>
                  <Select options={merchantAccountTypeOptions} placeholder="请选择权限模板" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select options={statusOptions} />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<ShopOutlined />} title="配置可管理范围" desc="按商户授权全部门店，或只授权一个指定门店。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={merchantOptions as SelectOptionRecord[]}
                    allowClear
                    placeholder="请选择商户"
                    onChange={() => form.setFieldValue('storeId', undefined)}
                  />
                </Form.Item>
                <Form.Item name="dataScopeType" label="可管理范围" rules={[{ required: true, message: '请选择可管理范围' }]}>
                  <Select
                    options={manageableScopeOptions}
                    onChange={(value) => {
                      if (value === 'MERCHANT') form.setFieldValue('storeId', undefined);
                    }}
                  />
                </Form.Item>
                {dataScopeType === 'STORE' ? (
                  <Form.Item
                    className="merchant-editor-field-span-2"
                    name="storeId"
                    label="指定门店"
                    rules={[{ required: true, message: '请选择门店' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={storeOptions as SelectOptionRecord[]}
                      allowClear
                      disabled={!merchantId}
                      placeholder={merchantId ? '请选择该商户下的门店' : '请先选择商户'}
                    />
                  </Form.Item>
                ) : null}
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="例如：负责日常运营，2026-07-15 授权" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MerchantAccountManagement;
