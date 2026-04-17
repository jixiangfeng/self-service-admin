import React, { useState } from 'react';
import { BookOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Space, Table, Tabs, Tag } from 'antd';
import PageBanner from '@/components/PageBanner';
import {
  useCreateDictionary,
  useDeleteDictionary,
  useDictionaries,
  useDictionaryItems,
  useUpdateDictionary,
} from '@/hooks/useApi';

const Dictionary: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState<any>(null);
  const [selectedCode, setSelectedCode] = useState<string>();

  const { data: dictionaries } = useDictionaries({ pageNum: 1, pageSize: 100 });
  const { data: items } = useDictionaryItems(selectedCode || '');
  const createMutation: any = useCreateDictionary();
  const updateMutation: any = useUpdateDictionary();
  const deleteMutation: any = useDeleteDictionary();

  const dicts = (dictionaries as any)?.records || [];
  const itemList = (items as any)?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingDict(null);
    form.resetFields();
  };

  const handleCreate = () => {
    setEditingDict(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingDict(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        dictName: record.dictName,
        dictCode: record.dictCode,
        remark: record.remark,
      });
    }, 0);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该字典吗？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleFinish = (values: any) => {
    if (editingDict) {
      updateMutation.mutate({ id: editingDict.id, ...values, status: editingDict.status ?? 1 }, { onSuccess: closeModal });
    } else {
      createMutation.mutate({ ...values, status: 1 }, { onSuccess: closeModal });
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '字典名称', dataIndex: 'dictName', width: 180 },
    { title: '字典编码', dataIndex: 'dictCode', width: 220 },
    { title: '备注', dataIndex: 'remark', render: (value: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => setSelectedCode(record.dictCode)}>查看项</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: '标签', dataIndex: 'dictLabel' },
    { title: '值', dataIndex: 'dictValue' },
    { title: '排序', dataIndex: 'dictSort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '启用' : '禁用'}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="数据字典" subtitle="沿用 sz-web 的字典类型与字典数据模型。" icon={<BookOutlined />} />
      <Tabs
        activeKey={selectedCode ? 'items' : 'dict'}
        onChange={(key) => {
          if (key === 'dict') setSelectedCode(undefined);
        }}
        items={[
          {
            key: 'dict',
            label: '字典列表',
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建字典</Button>}>
                <Table columns={columns} dataSource={dicts} rowKey="id" />
              </Card>
            ),
          },
          {
            key: 'items',
            label: '字典项',
            disabled: !selectedCode,
            children: selectedCode ? (
              <Card title={`字典项 - ${selectedCode}`}>
                <Table columns={itemColumns} dataSource={itemList} rowKey="id" />
              </Card>
            ) : undefined,
          },
        ]}
      />

      <Modal
        title={editingDict ? '编辑字典' : '新建字典'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
          <Form.Item name="dictName" label="字典名称" rules={[{ required: true, message: '请输入字典名称' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="dictCode" label="字典编码" rules={[{ required: true, message: '请输入字典编码' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dictionary;
