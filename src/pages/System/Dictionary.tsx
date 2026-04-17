import React, { useMemo, useState } from 'react';
import { BookOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag } from 'antd';
import PageBanner from '@/components/PageBanner';
import {
  useCreateDictionary,
  useDeleteDictionary,
  useDictionaries,
  useDictionaryItems,
  useUpdateDictionary,
} from '@/hooks/useApi';

const SEARCH_FIELD_WIDTH = 240;
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const Dictionary: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [itemSearchForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState<any>(null);
  const [selectedCode, setSelectedCode] = useState<string>();
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const { data: dictionaries } = useDictionaries(queryParams);
  const { data: items } = useDictionaryItems(selectedCode || '');
  const createMutation: any = useCreateDictionary();
  const updateMutation: any = useUpdateDictionary();
  const deleteMutation: any = useDeleteDictionary();

  const dicts = (dictionaries as any)?.records || [];
  const itemList = (items as any)?.records || [];
  const itemKeyword = Form.useWatch('keyword', itemSearchForm);
  const itemStatus = Form.useWatch('status', itemSearchForm);

  const filteredItemList = useMemo(() => {
    const text = String(itemKeyword || '').trim().toLowerCase();
    const filterStatus = itemStatus;

    return itemList.filter((item: any) => {
      const keywordMatched =
        !text ||
        [item.dictLabel, item.dictValue, item.remark]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(text));
      const statusMatched = filterStatus === undefined || filterStatus === null || filterStatus === '' || item.status === filterStatus;
      return keywordMatched && statusMatched;
    });
  }, [itemKeyword, itemList, itemStatus]);

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
    { title: '创建时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
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
    { title: '备注', dataIndex: 'remark', render: (value: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '启用' : '禁用'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="数据字典" subtitle="沿用 sz-web 的字典类型与字典数据模型。" icon={<BookOutlined />} />
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} onFinish={handleSearch}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <Space wrap size="middle">
              <Form.Item name="keyword" label="关键词" style={{ marginBottom: 0 }}>
                <Input placeholder="字典名称/字典编码" allowClear style={{ width: SEARCH_FIELD_WIDTH }} />
              </Form.Item>
              <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: SEARCH_FIELD_WIDTH }}
                  options={[
                    { label: '启用', value: 1 },
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
                <Table
                  columns={columns}
                  dataSource={dicts}
                  rowKey="id"
                  scroll={{ x: 1380 }}
                  pagination={{
                    current: (dictionaries as any)?.current || queryParams.pageNum,
                    pageSize: (dictionaries as any)?.size || queryParams.pageSize,
                    total: (dictionaries as any)?.total || 0,
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
            ),
          },
          {
            key: 'items',
            label: '字典项',
            disabled: !selectedCode,
            children: selectedCode ? (
              <Card title={`字典项 - ${selectedCode}`}>
                <Form form={itemSearchForm} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <Space wrap size="middle">
                      <Form.Item name="keyword" label="关键词" style={{ marginBottom: 0 }}>
                        <Input placeholder="标签/值/备注" allowClear style={{ width: SEARCH_FIELD_WIDTH }} />
                      </Form.Item>
                      <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
                        <Select
                          placeholder="全部"
                          allowClear
                          style={{ width: SEARCH_FIELD_WIDTH }}
                          options={[
                            { label: '启用', value: 1 },
                            { label: '禁用', value: 0 },
                          ]}
                        />
                      </Form.Item>
                    </Space>
                    <Space>
                      <Button onClick={() => itemSearchForm.resetFields()}>重置</Button>
                    </Space>
                  </div>
                </Form>
                <Table columns={itemColumns} dataSource={filteredItemList} rowKey="id" scroll={{ x: 1080 }} />
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
