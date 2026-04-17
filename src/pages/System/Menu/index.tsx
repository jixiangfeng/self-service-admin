import React, { useMemo, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, Select, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';
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
  children?: MenuItem[];
}

const TYPE_MAP: Record<string, string> = {
  '0': '目录',
  '1': '菜单',
  '2': '按钮',
  M: '目录',
  C: '菜单',
  F: '按钮',
};

const normalizeType = (value: string | number | undefined) => {
  if (value === 'M' || value === 0 || value === '0') return 0;
  if (value === 'F' || value === 2 || value === '2') return 2;
  return 1;
};

const MenuManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  const { data: menuTree = [] } = useMenuTree();
  const createMutation: any = useCreateMenu();
  const updateMutation: any = useUpdateMenu();
  const deleteMutation: any = useDeleteMenu();

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
    form.setFieldsValue({ parentId, permissionType: 1, sort: 0 });
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
      });
    }, 0);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该菜单吗？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      permissionType: normalizeType(values.permissionType),
      status: 1,
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
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => <Tag color={record.status === 1 ? 'success' : 'default'}>{record.status === 1 ? '正常' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      width: 240,
      render: (_, record) => (
        <Space.Compact size="small">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button icon={<PlusCircleOutlined />} onClick={() => handleCreate(record.id)}>新增下级</Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space.Compact>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="菜单管理" subtitle="这里对应 sz-web 的权限树，既包含菜单也包含按钮权限。" icon={<PlusOutlined />} />
      <ProTable<MenuItem>
        columns={columns}
        dataSource={menuTree as MenuItem[]}
        rowKey="id"
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => handleCreate(0)}>
            新建菜单
          </Button>,
        ]}
      />

      <Modal
        title={editingMenu ? '编辑菜单' : '新建菜单'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="上级菜单" initialValue={0}>
            <Select options={parentOptions} />
          </Form.Item>
          <Form.Item name="permissionName" label="菜单名称" rules={[{ required: true, message: '请输入菜单名称' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="permissionCode" label="权限编码" rules={[{ required: true, message: '请输入权限编码' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="permissionType" label="菜单类型" rules={[{ required: true, message: '请选择菜单类型' }]}>
            <Select
              options={[
                { label: '目录', value: 0 },
                { label: '菜单', value: 1 },
                { label: '按钮', value: 2 },
              ]}
            />
          </Form.Item>
          <Form.Item name="path" label="路由路径">
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="component" label="组件路径">
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuManagement;
