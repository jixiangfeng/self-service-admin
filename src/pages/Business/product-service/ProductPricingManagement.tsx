import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  billingModeOptions,
  categoryOptions,
  scopeTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import api from '@/services/backendService';
import type { PricingRuleRecord, ServiceProductRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type PricingTab = 'category' | 'scope' | 'version' | 'segment' | 'holiday' | 'change';
type EditableRecord = ServiceProductRecord | PricingRuleRecord;

const categoryMap = buildValueEnum(categoryOptions);
const billingModeMap = buildValueEnum(billingModeOptions);
const statusMap = buildValueEnum(statusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const ProductPricingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<PricingTab>('category');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const productQuery = useQuery({ queryKey: ['serviceProductsForPricingCenter'], queryFn: async () => (await api.serviceProduct.page({ pageNum: 1, pageSize: 500 })).data });
  const pricingQuery = useQuery({ queryKey: ['pricingRulesForPricingCenter'], queryFn: async () => (await api.pricingRule.page({ pageNum: 1, pageSize: 500 })).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForPricingCenter'], queryFn: async () => (await api.store.options()).data });
  const { data: productOptions } = useQuery({ queryKey: ['serviceProductOptionsForPricingCenter'], queryFn: async () => (await api.serviceProduct.options()).data });

  const products = productQuery.data?.records || [];
  const pricingRules = pricingQuery.data?.records || [];

  const categories = products;
  const scopes = products.filter((item) => item.scopeType && item.scopeType !== 'PLATFORM');
  const priceVersions = products.filter((item) => item.priceVersion || item.effectiveAt || item.expireAt);
  const timeSegments = pricingRules.filter((item) => item.timeSegment || item.nightPriceDesc);
  const holidayRules = pricingRules.filter((item) => item.holidayRule || item.holidayPriceDesc);
  const changeLogs = pricingRules;

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['serviceProductsForPricingCenter'] });
    queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
    queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
  };

  const invalidatePricingRules = () => {
    queryClient.invalidateQueries({ queryKey: ['pricingRulesForPricingCenter'] });
    queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'category' || activeTab === 'scope' || activeTab === 'version') {
        return payload.id ? api.serviceProduct.edit(payload) : api.serviceProduct.add(payload);
      }
      return payload.id ? api.pricingRule.edit(payload) : api.pricingRule.add(payload);
    },
    onSuccess: () => {
      message.success('商品价格配置已保存');
      if (activeTab === 'category' || activeTab === 'scope' || activeTab === 'version') invalidateProducts();
      else invalidatePricingRules();
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: PricingTab; id: number }) => {
      if (tab === 'category' || tab === 'scope' || tab === 'version') return api.serviceProduct.remove(id);
      return api.pricingRule.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('商品价格配置已删除');
      if (variables.tab === 'category' || variables.tab === 'scope' || variables.tab === 'version') invalidateProducts();
      else invalidatePricingRules();
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (tab: PricingTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...(record as unknown as Record<string, string | number | undefined>) });
    } else if (tab === 'category') {
      form.setFieldsValue({ categoryCode: 'CAR_WASH_PACKAGE', billingMode: 'PACKAGE', scopeType: 'PLATFORM', status: 1 });
    } else if (tab === 'scope') {
      form.setFieldsValue({ categoryCode: 'CAR_WASH_PACKAGE', billingMode: 'PACKAGE', scopeType: 'STORE', status: 1 });
    } else if (tab === 'version') {
      form.setFieldsValue({ categoryCode: 'CAR_WASH_PACKAGE', billingMode: 'PACKAGE', scopeType: 'PLATFORM', priceVersion: 'V20260507', status: 1 });
    } else {
      form.setFieldsValue({ status: 1 });
    }
    setModalVisible(true);
  };

  const actionColumn = (tab: PricingTab): ProColumns<EditableRecord> => ({
    title: '操作',
    width: 170,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(tab, record)}>编辑</Button>
        <Popconfirm title="确认删除该记录？" onConfirm={() => removeMutation.mutate({ tab, id: record.id })}>
          <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </>
    ),
  });

  const categoryColumns: ProColumns<ServiceProductRecord>[] = [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '分类', dataIndex: 'categoryCode', width: 150, render: (_, record) => renderStatusTag(record.categoryCode, categoryMap) },
    { title: '计费模式', dataIndex: 'billingMode', width: 130, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '价格描述', dataIndex: 'priceDesc', width: 220 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('category') as ProColumns<ServiceProductRecord>,
  ];

  const scopeColumns: ProColumns<ServiceProductRecord>[] = [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '范围类型', dataIndex: 'scopeType', width: 120, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '范围ID', dataIndex: 'scopeId', width: 100 },
    { title: '范围名称', dataIndex: 'scopeName', width: 180 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '失效时间', dataIndex: 'expireAt', width: 180, render: (_, record) => formatDateTime(record.expireAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('scope') as ProColumns<ServiceProductRecord>,
  ];

  const versionColumns: ProColumns<ServiceProductRecord>[] = [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '价格版本', dataIndex: 'priceVersion', width: 140 },
    { title: '权益内容', dataIndex: 'rightsContent', width: 260 },
    { title: '退款规则', dataIndex: 'refundRule', width: 220 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('version') as ProColumns<ServiceProductRecord>,
  ];

  const segmentColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '服务商品', dataIndex: 'productName', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 120 },
    { title: '时段规则', dataIndex: 'timeSegment', width: 220 },
    { title: '夜间价格', dataIndex: 'nightPriceDesc', width: 220 },
    { title: '分钟单价', dataIndex: 'minutePrice', width: 100 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('segment') as ProColumns<PricingRuleRecord>,
  ];

  const holidayColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '节假日规则', dataIndex: 'holidayRule', width: 240 },
    { title: '节假日价格', dataIndex: 'holidayPriceDesc', width: 220 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    actionColumn('holiday') as ProColumns<PricingRuleRecord>,
  ];

  const changeColumns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 120 },
    { title: '起步价', dataIndex: 'startPrice', width: 100 },
    { title: '分钟价', dataIndex: 'minutePrice', width: 100 },
    { title: '封顶', dataIndex: 'capAmount', width: 100 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('change') as ProColumns<PricingRuleRecord>,
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商品价格中心" subtitle="维护商品分类、适用范围、价格版本、时段价、节假日规则和价格变更。" icon={<TagsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="商品分类" value={categories.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="适用范围" value={scopes.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="价格版本" value={priceVersions.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="时段规则" value={timeSegments.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="节假日规则" value={holidayRules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="价格规则" value={changeLogs.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入商品、分类、价格、范围、规则关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as PricingTab)}
        items={[
          { key: 'category', label: '商品分类', children: <ProTable<ServiceProductRecord> cardBordered rowKey="id" columns={categoryColumns} dataSource={filter(categories)} loading={productQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('category')}>新建商品</Button>]} /> },
          { key: 'scope', label: '适用范围', children: <ProTable<ServiceProductRecord> cardBordered rowKey="id" columns={scopeColumns} dataSource={filter(scopes)} loading={productQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="bind" type="primary" icon={<PlusOutlined />} onClick={() => openModal('scope')}>绑定范围</Button>]} /> },
          { key: 'version', label: '价格版本', children: <ProTable<ServiceProductRecord> cardBordered rowKey="id" columns={versionColumns} dataSource={filter(priceVersions)} loading={productQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('version')}>新建版本</Button>]} /> },
          { key: 'segment', label: '时段价', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={segmentColumns} dataSource={filter(timeSegments)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('segment')}>新建时段</Button>]} /> },
          { key: 'holiday', label: '节假日规则', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={holidayColumns} dataSource={filter(holidayRules)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('holiday')}>新建规则</Button>]} /> },
          { key: 'change', label: '价格规则', children: <ProTable<PricingRuleRecord> cardBordered rowKey="id" columns={changeColumns} dataSource={filter(changeLogs)} loading={pricingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('change')}>新建规则</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={editingRecord ? '编辑商品价格配置' : '新增商品价格配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(await form.validateFields())}
        confirmLoading={saveMutation.isPending}
        width={860}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="modal-grid">
            {activeTab === 'category' || activeTab === 'scope' || activeTab === 'version' ? (
              <>
                <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}><Input /></Form.Item>
                <Form.Item name="productName" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input /></Form.Item>
                <Form.Item name="categoryCode" label="商品分类"><Select options={categoryOptions} /></Form.Item>
                <Form.Item name="billingMode" label="计费模式"><Select options={billingModeOptions} /></Form.Item>
                <Form.Item name="scopeType" label="范围类型"><Select options={scopeTypeOptions} /></Form.Item>
                <Form.Item name="scopeId" label="范围ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="priceVersion" label="价格版本"><Input /></Form.Item>
                <Form.Item name="priceDesc" label="价格描述"><Input /></Form.Item>
                <Form.Item name="serviceDuration" label="服务周期"><Input /></Form.Item>
                <Form.Item name="effectiveAt" label="生效时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="expireAt" label="失效时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                <Form.Item className="modal-span-2" name="rightsContent" label="权益内容"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="refundRule" label="退款规则"><Input.TextArea rows={3} /></Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true, message: '请输入规则编码' }]}><Input /></Form.Item>
                <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}><Input /></Form.Item>
                <Form.Item name="storeId" label="适用门店"><Select allowClear showSearch optionFilterProp="label" options={storeOptions || []} /></Form.Item>
                <Form.Item name="serviceProductId" label="服务商品"><Select allowClear showSearch optionFilterProp="label" options={productOptions || []} /></Form.Item>
                <Form.Item name="versionNo" label="版本号"><Input /></Form.Item>
                <Form.Item name="startPrice" label="起步价"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="minutePrice" label="分钟单价"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="countPrice" label="按次单价"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="capAmount" label="封顶金额"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="freeMinutes" label="免费分钟"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="effectiveAt" label="生效时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="expireAt" label="失效时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item>
                <Form.Item className="modal-span-2" name="timeSegment" label="时段规则"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="nightPriceDesc" label="夜间价格描述"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="holidayRule" label="节假日规则"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="holidayPriceDesc" label="节假日价格描述"><Input.TextArea rows={3} /></Form.Item>
              </>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductPricingManagement;
