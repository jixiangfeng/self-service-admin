import React, { useMemo, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Select, Space, Tag } from 'antd';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusCircleOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { useCreateMenu, useDeleteMenu, useMenuTree, useUpdateMenu } from '@/hooks/useApi';

interface MenuItem {
  id: number;
  parentId?: number;
  permissionName?: string;
  permissionCode?: string;
  permissionType?: number | string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  status?: number;
  visible?: number;
  updateTime?: string;
  children?: MenuItem[];
}

const SEARCH_FIELD_WIDTH = 240;
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const TYPE_MAP: Record<string, string> = {
  '0': '目录',
  '1': '菜单',
  '2': '按钮',
  M: '目录',
  C: '菜单',
  F: '按钮',
};

const menuDetailFields: DetailField<Record<string, any>>[] = [
  { name: 'id', label: '菜单ID' },
  { name: 'parentId', label: '上级ID' },
  { name: 'permissionName', label: '名称' },
  { name: 'permissionCode', label: '编码' },
  { name: 'permissionType', label: '类型', render: (value) => TYPE_MAP[String(value ?? '')] || String(value ?? '-') },
  { name: 'path', label: '路径' },
  { name: 'component', label: '组件' },
  { name: 'icon', label: '图标' },
  { name: 'sort', label: '排序' },
  { name: 'visible', label: '可见', render: (value) => <Tag color={value === 1 ? 'processing' : 'default'}>{value === 1 ? '显示' : '隐藏'}</Tag> },
  { name: 'status', label: '状态', render: (value) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '正常' : '禁用'}</Tag> },
  { name: 'updateTime', label: '更新时间', render: (value) => formatDateTime(value) },
];

const normalizeType = (value: string | number | undefined) => {
  if (value === 'M' || value === 0 || value === '0') return 0;
  if (value === 'F' || value === 2 || value === '2') return 2;
  return 1;
};

const MenuManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [detailMenu, setDetailMenu] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  const { data: menuTree = [] } = useMenuTree();
  const createMutation: any = useCreateMenu();
  const updateMutation: any = useUpdateMenu();
  const deleteMutation: any = useDeleteMenu();
  const keyword = Form.useWatch('keyword', searchForm);
  const permissionType = Form.useWatch('permissionType', searchForm);
  const status = Form.useWatch('status', searchForm);
  const visible = Form.useWatch('visible', searchForm);

  const parentOptions = useMemo(() => {
    const flat: Array<{ label: string; value: number }> = [{ label: '顶级菜单', value: 0 }];
    const walk = (items: MenuItem[]) => {
      items.forEach((item) => {
        flat.push({ label: item.permissionName || `节点-${item.id}`, value: item.id });
        if (item.children?.length) walk(item.children);
      });
    };
    walk(menuTree as MenuItem[]);
    return flat;
  }, [menuTree]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
    form.resetFields();
  };

  const handleCreate = (parentId = 0) => {
    setEditingMenu(null);
    form.resetFields();
    form.setFieldsValue({ parentId, permissionType: 1, sort: 0, visible: 1, status: 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (record: MenuItem) => {
    setEditingMenu(record);
    setIsModalOpen(true);
    setTimeout(() => {
      form.setFieldsValue({
        id: record.id,
        parentId: record.parentId ?? 0,
        permissionName: record.permissionName,
        permissionCode: record.permissionCode,
        permissionType: normalizeType(record.permissionType),
        path: record.path,
        component: record.component,
        icon: record.icon,
        sort: record.sort ?? 0,
        visible: record.visible ?? 1,
        status: record.status ?? 1,
      });
    }, 0);
  };

  const handleDelete = (id: number) => {
    showBusinessConfirm({
      title: '确认删除',
      content: '确定要删除该菜单吗？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      permissionType: normalizeType(values.permissionType),
    };

    if (editingMenu) {
      updateMutation.mutate(payload, { onSuccess: closeModal });
    } else {
      createMutation.mutate(payload, { onSuccess: closeModal });
    }
  };

  const columns: ProColumns<MenuItem>[] = [
    { title: '名称', dataIndex: 'permissionName', width: 220 },
    { title: '编码', dataIndex: 'permissionCode', width: 220 },
    {
      title: '类型',
      dataIndex: 'permissionType',
      width: 100,
      render: (_, record) => TYPE_MAP[String(record.permissionType ?? '')] || String(record.permissionType ?? '-'),
    },
    { title: '路径', dataIndex: 'path', ellipsis: true },
    { title: '组件', dataIndex: 'component', ellipsis: true },
    { title: '图标', dataIndex: 'icon', width: 100, render: (value) => value || '-' },
    { title: '排序', dataIndex: 'sort', width: 80, render: (_, record) => record.sort ?? 0 },
    {
      title: '可见',
      dataIndex: 'visible',
      width: 100,
      render: (_, record) => <Tag color={record.visible === 1 ? 'processing' : 'default'}>{record.visible === 1 ? '显示' : '隐藏'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => <Tag color={record.status === 1 ? 'success' : 'default'}>{record.status === 1 ? '正常' : '禁用'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: (_, record) => formatDateTime(record.updateTime) },
    {
      title: '操作',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => setDetailMenu(record)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" icon={<PlusCircleOutlined />} onClick={() => handleCreate(record.id)}>新增下级</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const filteredMenuTree = useMemo(() => {
    const text = String(keyword || '').trim().toLowerCase();
    const filterType = permissionType;
    const filterStatus = status;
    const filterVisible = visible;

    const matches = (item: MenuItem) => {
      const keywordMatched =
        !text ||
        [item.permissionName, item.permissionCode, item.path, item.component]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
      const typeMatched = filterType === undefined || filterType === null || filterType === '' || normalizeType(item.permissionType) === filterType;
      const statusMatched = filterStatus === undefined || filterStatus === null || filterStatus === '' || item.status === filterStatus;
      const visibleMatched = filterVisible === undefined || filterVisible === null || filterVisible === '' || item.visible === filterVisible;
      return keywordMatched && typeMatched && statusMatched && visibleMatched;
    };

    const walk = (items: MenuItem[]): MenuItem[] =>
      items
        .map((item) => {
          const children = walk(item.children || []);
          if (matches(item) || children.length) {
            return { ...item, children };
          }
          return null;
        })
        .filter(Boolean) as MenuItem[];

    return walk(menuTree as MenuItem[]);
  }, [keyword, menuTree, permissionType, status, visible]);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="菜单管理" subtitle="这里对应 sz-web 的权限树，既包含菜单也包含按钮权限。" icon={<PlusOutlined />} />
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <Space wrap size="middle">
              <Form.Item name="keyword" label="关键词" style={{ marginBottom: 0 }}>
                <Input placeholder="名称/编码/路径/组件" allowClear style={{ width: SEARCH_FIELD_WIDTH }} />
              </Form.Item>
              <Form.Item name="permissionType" label="类型" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="全部"
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={[
                    { label: '目录', value: 0 },
                    { label: '菜单', value: 1 },
                    { label: '按钮', value: 2 },
                  ]}
                />
              </Form.Item>
              <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="全部"
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={[
                    { label: '正常', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                />
              </Form.Item>
              <Form.Item name="visible" label="可见性" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="全部"
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={[
                    { label: '显示', value: 1 },
                    { label: '隐藏', value: 0 },
                  ]}
                />
              </Form.Item>
            </Space>
            <Space>
              <Button onClick={() => searchForm.resetFields()}>重置</Button>
            </Space>
          </div>
        </Form>
      </Card>
      <ProTable<MenuItem>
        columns={columns}
        dataSource={filteredMenuTree}
        rowKey="id"
        search={false}
        pagination={false}
        scroll={{ x: 1760 }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => handleCreate(0)}>
            新建菜单
          </Button>,
        ]}
      />

      <BusinessDetailModal title="菜单详情" open={!!detailMenu} onCancel={() => setDetailMenu(null)} width={760}>
        {detailMenu ? (
          <SchemaDetail
            record={detailMenu as Record<string, any>}
            fields={menuDetailFields}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingMenu ? '菜单维护' : '菜单新增'}
        title={editingMenu ? '编辑菜单' : '新建菜单'}
        subtitle="维护后台菜单树、按钮权限、路由组件和展示状态，保证权限配置和前端路由一致。"
        meta={[editingMenu ? '编辑模式' : '新建模式', TYPE_MAP[String(form.getFieldValue('permissionType') ?? '')] || '菜单节点']}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={1040}
        forceRender
        destroyOnClose
        okText="保存菜单"
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false} className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<AppstoreOutlined />} title="节点基础" desc="定义菜单层级、名称、权限编码和节点类型。">
              <div className="merchant-editor-fields">
                <Form.Item name="id" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="parentId" label="上级菜单" initialValue={0}>
                  <Select options={parentOptions} placeholder="请选择上级菜单" />
                </Form.Item>
                <Form.Item name="permissionName" label="菜单名称" rules={[{ required: true, message: '请输入菜单名称' }]}>
                  <Input autoComplete="off" placeholder="例如：门店运营" />
                </Form.Item>
                <Form.Item name="permissionCode" label="权限编码" rules={[{ required: true, message: '请输入权限编码' }]}>
                  <Input autoComplete="off" placeholder="例如：business:store:list" />
                </Form.Item>
                <Form.Item name="permissionType" label="菜单类型" rules={[{ required: true, message: '请选择菜单类型' }]}>
                  <Select
                    options={[
                      { label: '目录', value: 0 },
                      { label: '菜单', value: 1 },
                      { label: '按钮', value: 2 },
                    ]}
                    placeholder="请选择菜单类型"
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<LinkOutlined />} title="路由配置" desc="菜单节点需要配置路由路径和组件，按钮权限可只填权限编码。">
              <div className="merchant-editor-fields">
                <Form.Item name="path" label="路由路径">
                  <Input autoComplete="off" placeholder="/store-operations" />
                </Form.Item>
                <Form.Item name="component" label="组件路径">
                  <Input autoComplete="off" placeholder="Business/store-operations" />
                </Form.Item>
                <Form.Item name="icon" label="图标">
                  <Input autoComplete="off" placeholder="例如：ShopOutlined" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SettingOutlined />} title="展示与状态" desc="控制菜单展示、排序和启停状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="sort" label="排序" initialValue={0}>
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
                </Form.Item>
                <Form.Item name="visible" label="可见性" initialValue={1}>
                  <Select
                    options={[
                      { value: 1, label: '显示' },
                      { value: 0, label: '隐藏' },
                    ]}
                    placeholder="请选择可见性"
                  />
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
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MenuManagement;
