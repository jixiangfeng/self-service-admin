import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Table, Tabs, message } from 'antd';
import { AppstoreOutlined, ShoppingCartOutlined, ShopOutlined } from '@ant-design/icons';
import {
  retailCategoryOptions,
  retailDeliveryTypeOptions,
  retailProductStatusOptions,
  retailStockScopeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import api, { type RetailProductRecord, type RetailStockRecord } from '@/services/backendService';

const categoryMap = buildValueEnum(retailCategoryOptions);
const deliveryMap = buildValueEnum(retailDeliveryTypeOptions);
const productStatusMap = buildValueEnum(retailProductStatusOptions);
const stockScopeMap = buildValueEnum(retailStockScopeOptions);

const retailDetailFields: Record<'product' | 'stock', DetailField<any>[]> = {
  product: [
    { name: 'productCode', label: '商品编码' },
    { name: 'name', label: '商品名称' },
    { name: 'category', label: '分类' },
    { name: 'salePrice', label: '售价', render: (value) => formatAmount(value) },
    { name: 'costPrice', label: '成本价', render: (value) => formatAmount(value) },
    { name: 'stockSummary', label: '库存摘要' },
    { name: 'delivery', label: '履约方式' },
    { name: 'supplier', label: '供应商' },
    { name: 'status', label: '状态' },
  ],
  stock: [
    { name: 'scope', label: '库存层级' },
    { name: 'storeName', label: '门店' },
    { name: 'deviceCode', label: '设备' },
    { name: 'sku', label: 'SKU' },
    { name: 'available', label: '可用库存' },
    { name: 'locked', label: '锁定库存' },
    { name: 'warningThreshold', label: '预警阈值' },
    { name: 'owner', label: '负责人' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间' },
  ],
};

const RetailManagement: React.FC = () => {
  const [productForm] = Form.useForm<RetailProductRecord>();
  const [stockForm] = Form.useForm<RetailStockRecord>();
  const queryClient = useQueryClient();
  const productQuery = useQuery({ queryKey: ['retailProducts'], queryFn: async () => (await api.valuePlanning.retailProducts.page({ pageNum: 1, pageSize: 200 })).data });
  const stockQuery = useQuery({ queryKey: ['retailStocks'], queryFn: async () => (await api.valuePlanning.retailStocks.page({ pageNum: 1, pageSize: 200 })).data });
  const products = productQuery.data?.records || [];
  const stocks = stockQuery.data?.records || [];
  const [productVisible, setProductVisible] = useState(false);
  const [stockVisible, setStockVisible] = useState(false);
  const [detail, setDetail] = useState<RetailProductRecord | RetailStockRecord | null>(null);
  const [editingProduct, setEditingProduct] = useState<RetailProductRecord | null>(null);
  const [editingStock, setEditingStock] = useState<RetailStockRecord | null>(null);

  const saveProductMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingProduct ? api.valuePlanning.retailProducts.edit({ ...values, id: editingProduct.id }) : api.valuePlanning.retailProducts.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailProducts'] });
      message.success(editingProduct ? '零售商品已更新' : '零售商品已创建');
    },
  });
  const handleProductSubmit = async () => {
    const values = await productForm.validateFields();
    await saveProductMutation.mutateAsync(values as unknown as Record<string, unknown>);
    setProductVisible(false);
    setEditingProduct(null);
    productForm.resetFields();
  };

  const saveStockMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingStock ? api.valuePlanning.retailStocks.edit({ ...values, id: editingStock.id }) : api.valuePlanning.retailStocks.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailStocks'] });
      message.success(editingStock ? '库存台账已更新' : '库存台账已创建');
    },
  });
  const handleStockSubmit = async () => {
    const values = await stockForm.validateFields();
    await saveStockMutation.mutateAsync(values as unknown as Record<string, unknown>);
    setStockVisible(false);
    setEditingStock(null);
    stockForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商城零售" subtitle="管理零售商品、库存、负责人和履约方式。" icon={<ShoppingCartOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="商品域">零食 / 饮料 / 自提 / 积分兑换</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="库存层级">平台 / 门店 / 设备</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="履约方式">出货 / 自提 / 虚拟发放</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="运营状态">商品和库存均已接入后台维护</Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'product',
            label: '零售商品',
            children: (
              <Card extra={<Button type="primary" onClick={() => { setEditingProduct(null); productForm.resetFields(); setProductVisible(true); }}>新建商品</Button>}>
                <Table
                  pagination={false}
                  rowKey="id"
                  dataSource={products}
                  columns={[
                    { title: '商品编码', dataIndex: 'productCode', width: 150 },
                    { title: '商品名称', dataIndex: 'name' },
                    { title: '分类', dataIndex: 'category', width: 140, render: (value: string) => renderStatusTag(value, categoryMap) },
                    { title: '售价', dataIndex: 'salePrice', width: 100, render: (value: number) => formatAmount(value) },
                    { title: '成本价', dataIndex: 'costPrice', width: 100, render: (value: number) => formatAmount(value) },
                    { title: '库存摘要', dataIndex: 'stockSummary', width: 160 },
                    { title: '履约方式', dataIndex: 'delivery', width: 140, render: (value: string) => renderStatusTag(value, deliveryMap) },
                    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, productStatusMap) },
                    { title: '操作', width: 150, render: (_, record: RetailProductRecord) => (
                      <>
                        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                        <Button size="small" type="link" onClick={() => { setEditingProduct(record); productForm.setFieldsValue(record); setProductVisible(true); }}>编辑</Button>
                      </>
                    ) },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'stock',
            label: '库存台账',
            children: (
              <Card extra={<Button type="primary" onClick={() => { setEditingStock(null); stockForm.resetFields(); setStockVisible(true); }}>新建库存记录</Button>}>
                <Table
                  pagination={false}
                  rowKey="id"
                  dataSource={stocks}
                  columns={[
                    { title: '库存层级', dataIndex: 'scope', width: 140, render: (value: string) => renderStatusTag(value, stockScopeMap) },
                    { title: '门店', dataIndex: 'storeName', width: 160 },
                    { title: '设备', dataIndex: 'deviceCode', width: 130 },
                    { title: 'SKU', dataIndex: 'sku', width: 180 },
                    { title: '可用库存', dataIndex: 'available', width: 120 },
                    { title: '锁定库存', dataIndex: 'locked', width: 120 },
                    { title: '预警阈值', dataIndex: 'warningThreshold', width: 120 },
                    { title: '负责人', dataIndex: 'owner', width: 140 },
                    { title: '操作', width: 150, render: (_, record: RetailStockRecord) => (
                      <>
                        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                        <Button size="small" type="link" onClick={() => { setEditingStock(record); stockForm.setFieldsValue(record); setStockVisible(true); }}>编辑</Button>
                      </>
                    ) },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="零售商品配置"
        title={editingProduct ? `编辑零售商品 · ${editingProduct.name || editingProduct.productCode}` : '新建零售商品'}
        subtitle="配置商品编码、分类、价格、履约方式、库存摘要和供应商，形成零售商品维护闭环。"
        meta={[editingProduct ? '编辑' : '新增', '商城零售']}
        open={productVisible}
        onOk={handleProductSubmit}
        onCancel={() => { setProductVisible(false); setEditingProduct(null); productForm.resetFields(); }}
        width={1080}
        okText="保存商品"
        confirmLoading={saveProductMutation.isPending}
      >
        <Form form={productForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ShoppingCartOutlined />} title="商品基础" desc="定义商品编码、名称、分类和销售状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}><Input placeholder="例如：SKU-WATER-500" /></Form.Item>
                <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input placeholder="例如：矿泉水 500ml" /></Form.Item>
                <Form.Item name="category" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}><Select options={retailCategoryOptions} placeholder="请选择商品分类" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={retailProductStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ShopOutlined />} title="履约与供应" desc="配置履约方式、供应商和库存摘要。">
              <div className="merchant-editor-fields">
                <Form.Item name="delivery" label="履约方式"><Select options={retailDeliveryTypeOptions} placeholder="请选择履约方式" /></Form.Item>
                <Form.Item name="supplier" label="供应商"><Input placeholder="例如：华东供应链" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="stockSummary" label="库存摘要"><Input placeholder="例如：平台总仓 120，门店可售 80，设备库存 40" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AppstoreOutlined />} title="价格配置" desc="配置商品售价和成本价，后续用于毛利核算。">
              <div className="merchant-editor-fields">
                <Form.Item name="salePrice" label="售价"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                <Form.Item name="costPrice" label="成本价"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="库存台账配置"
        title={editingStock ? `编辑库存台账 · ${editingStock.sku}` : '新建库存台账'}
        subtitle="配置库存层级、门店或设备、可用库存、锁定库存、预警阈值和负责人。"
        meta={[editingStock ? '编辑' : '新增', '库存台账']}
        open={stockVisible}
        onOk={handleStockSubmit}
        onCancel={() => { setStockVisible(false); setEditingStock(null); stockForm.resetFields(); }}
        width={1080}
        okText="保存库存"
        confirmLoading={saveStockMutation.isPending}
      >
        <Form form={stockForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ShopOutlined />} title="库存位置" desc="定义库存所在层级、门店、设备和 SKU。">
              <div className="merchant-editor-fields">
                <Form.Item name="scope" label="库存层级" rules={[{ required: true, message: '请选择库存层级' }]}><Select options={retailStockScopeOptions} placeholder="请选择库存层级" /></Form.Item>
                <Form.Item name="storeName" label="门店"><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                <Form.Item name="deviceCode" label="设备编号"><Input placeholder="例如：DEV-001" /></Form.Item>
                <Form.Item name="sku" label="SKU" rules={[{ required: true, message: '请输入 SKU' }]}><Input placeholder="例如：SKU-WATER-500" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AppstoreOutlined />} title="库存数量" desc="维护可用、锁定和预警数量。">
              <div className="merchant-editor-fields">
                <Form.Item name="available" label="可用库存"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="locked" label="锁定库存"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="warningThreshold" label="预警阈值"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ShoppingCartOutlined />} title="维护责任" desc="记录负责人和更新时间，便于库存异常追踪。">
              <div className="merchant-editor-fields">
                <Form.Item name="owner" label="负责人"><Input placeholder="例如：门店运营-王敏" /></Form.Item>
                <Form.Item name="updatedAt" label="更新时间"><Input placeholder="例如：2026-05-10 10:00:00" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="商城零售详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('productCode' in detail ? retailDetailFields.product : retailDetailFields.stock) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={100}
          />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default RetailManagement;
