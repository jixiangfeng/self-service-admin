import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOutlined, DeleteOutlined, EditOutlined, FieldTimeOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Tabs, Tag, message } from 'antd';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import {
  useCreateDictionary,
  useDeleteDictionary,
  useDictionaries,
  useDictionaryItems,
  useUpdateDictionary,
} from '@/hooks/useApi';

const SEARCH_FIELD_WIDTH = 240;
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const dictionaryDetailFields: DetailField<Record<string, any>>[] = [
  { name: 'id', label: '字典ID' },
  { name: 'dictName', label: '字典名称' },
  { name: 'dictCode', label: '字典编码' },
  { name: 'remark', label: '备注' },
  { name: 'status', label: '状态', render: (value) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '启用' : '禁用'}</Tag> },
  { name: 'createTime', label: '创建时间', render: (value) => formatDateTime(value) },
  { name: 'updateTime', label: '更新时间', render: (value) => formatDateTime(value) },
];

const dictionaryItemDetailFields: DetailField<Record<string, any>>[] = [
  { name: 'id', label: '字典项ID' },
  { name: 'dictCode', label: '字典编码' },
  { name: 'dictLabel', label: '标签' },
  { name: 'dictValue', label: '值' },
  { name: 'dictSort', label: '排序' },
  { name: 'remark', label: '备注' },
  { name: 'status', label: '状态', render: (value) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '启用' : '禁用'}</Tag> },
  { name: 'createTime', label: '创建时间', render: (value) => formatDateTime(value) },
  { name: 'updateTime', label: '更新时间', render: (value) => formatDateTime(value) },
];

const Dictionary: React.FC = () => {
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [itemSearchForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailType, setDetailType] = useState<'dict' | 'item'>('dict');
  const [selectedCode, setSelectedCode] = useState<string>();
  const queryClient = useQueryClient();
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
  const createItemMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.dict.dataAdd(payload),
    onSuccess: () => {
      message.success('字典项已创建');
      queryClient.invalidateQueries({ queryKey: ['dictItems', selectedCode] });
      queryClient.invalidateQueries({ queryKey: ['businessEnums'] });
      setItemModalVisible(false);
      setEditingItem(null);
      itemForm.resetFields();
    },
  });
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown>) => api.dict.dataEdit(Number(id), payload),
    onSuccess: () => {
      message.success('字典项已更新');
      queryClient.invalidateQueries({ queryKey: ['dictItems', selectedCode] });
      queryClient.invalidateQueries({ queryKey: ['businessEnums'] });
      setItemModalVisible(false);
      setEditingItem(null);
      itemForm.resetFields();
    },
  });
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => api.dict.dataRemove(id),
    onSuccess: () => {
      message.success('字典项已删除');
      queryClient.invalidateQueries({ queryKey: ['dictItems', selectedCode] });
      queryClient.invalidateQueries({ queryKey: ['businessEnums'] });
    },
  });

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

  const closeItemModal = () => {
    setItemModalVisible(false);
    setEditingItem(null);
    itemForm.resetFields();
  };

  const handleCreate = () => {
    setEditingDict(null);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingDict(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        dictName: record.dictName,
        dictCode: record.dictCode,
        status: record.status ?? 1,
        remark: record.remark,
      });
    }, 0);
  };

  const handleDelete = (record: any) => {
    showBusinessConfirm({
      title: '确认删除字典',
      content: `确定删除字典「${record.dictName || record.dictCode || record.id}」吗？删除后依赖该编码的业务下拉和状态展示可能不可用。`,
      okText: '确认删除',
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id);
      },
    });
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({ dictCode: selectedCode, dictSort: 0, status: 1 });
    setItemModalVisible(true);
  };

  const handleEditItem = (record: any) => {
    setEditingItem(record);
    itemForm.setFieldsValue(record);
    setItemModalVisible(true);
  };

  const handleDeleteItem = (record: any) => {
    showBusinessConfirm({
      title: '确认删除字典项',
      content: `确定删除字典项「${record.dictLabel || record.dictValue || record.id}」吗？删除后已存量数据可能只能显示原始编码。`,
      okText: '确认删除',
      onOk: async () => {
        await deleteItemMutation.mutateAsync(record.id);
      },
    });
  };

  const handleItemFinish = async () => {
    const values = await itemForm.validateFields();
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, ...values });
      return;
    }
    createItemMutation.mutate(values);
  };

  const handleFinish = (values: any) => {
    if (editingDict) {
      updateMutation.mutate(
        { id: editingDict.id, ...values, status: Number(values.status ?? editingDict.status ?? 1) },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessEnums'] });
            closeModal();
          },
        },
      );
    } else {
      createMutation.mutate(
        { ...values, status: Number(values.status ?? 1) },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessEnums'] });
            closeModal();
          },
        },
      );
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
          <Button size="small" onClick={() => { setDetailRecord(record); setDetailType('dict'); }}>详情</Button>
          <Button size="small" onClick={() => setSelectedCode(record.dictCode)}>查看项</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} onClick={() => handleDelete(record)}>删除</Button>
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
    {
      title: '操作',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => { setDetailRecord(record); setDetailType('item'); }}>详情</Button>
          <Button size="small" onClick={() => handleEditItem(record)}>编辑</Button>
          <Button size="small" danger loading={deleteItemMutation.isPending} onClick={() => handleDeleteItem(record)}>删除</Button>
        </Space>
      ),
    },
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
              <Card title={`字典项 - ${selectedCode}`} extra={<Button type="primary" onClick={handleCreateItem}>新建字典项</Button>}>
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

      <BusinessDetailModal title={detailType === 'dict' ? '字典详情' : '字典项详情'} open={!!detailRecord} onCancel={() => setDetailRecord(null)} width={760}>
        {detailRecord ? (
          <SchemaDetail
            record={detailRecord}
            fields={detailType === 'dict' ? dictionaryDetailFields : dictionaryItemDetailFields}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingDict ? '字典维护' : '字典新增'}
        title={editingDict ? '编辑字典' : '新建字典'}
        subtitle="维护系统字典类型，字典编码会被业务配置、筛选项和枚举展示复用。"
        meta={[editingDict ? '编辑模式' : '新建模式', '系统字典']}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={920}
        forceRender
        destroyOnClose
        okText="保存字典"
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false} className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<BookOutlined />} title="字典基础" desc="明确字典名称、唯一编码和启停状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="dictName" label="字典名称" rules={[{ required: true, message: '请输入字典名称' }]}>
                  <Input autoComplete="off" placeholder="例如：活动状态" />
                </Form.Item>
                <Form.Item name="dictCode" label="字典编码" rules={[{ required: true, message: '请输入字典编码' }]}>
                  <Input autoComplete="off" placeholder="例如：marketing_status" />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue={1}>
                  <Select
                    options={[
                      { value: 1, label: '启用' },
                      { value: 0, label: '禁用' },
                    ]}
                    placeholder="请选择状态"
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<FieldTimeOutlined />} title="维护说明" desc="记录用途、维护边界和影响模块。">
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="例如：用于活动中心状态筛选，不要随意删除已有值" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow={editingItem ? '字典项维护' : '字典项新增'}
        title={editingItem ? '编辑字典项' : '新建字典项'}
        subtitle="维护字典标签和值，运营侧只需要理解标签、值、排序和状态。"
        meta={[selectedCode || '未选择字典', editingItem ? '编辑模式' : '新建模式']}
        open={itemModalVisible}
        onOk={handleItemFinish}
        onCancel={closeItemModal}
        confirmLoading={createItemMutation.isPending || updateItemMutation.isPending}
        width={920}
        forceRender
        destroyOnClose
        okText="保存字典项"
      >
        <Form form={itemForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TagsOutlined />} title="字典项基础" desc="配置后台可识别的值和前台展示的标签。">
              <div className="merchant-editor-fields">
                <Form.Item name="dictCode" label="字典编码">
                  <Input disabled />
                </Form.Item>
                <Form.Item name="dictLabel" label="标签" rules={[{ required: true, message: '请输入标签' }]}>
                  <Input placeholder="例如：启用" />
                </Form.Item>
                <Form.Item name="dictValue" label="值" rules={[{ required: true, message: '请输入值' }]}>
                  <Input placeholder="例如：ENABLED / 1" />
                </Form.Item>
                <Form.Item name="dictSort" label="排序">
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select
                    options={[
                      { value: 1, label: '启用' },
                      { value: 0, label: '禁用' },
                    ]}
                    placeholder="请选择状态"
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<FieldTimeOutlined />} title="维护说明" desc="记录该值适用场景和变更注意事项。">
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="例如：用于列表筛选和状态标签展示" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default Dictionary;
