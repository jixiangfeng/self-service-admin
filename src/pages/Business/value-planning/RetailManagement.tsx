import React, { useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, Tabs, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import {
  retailCategoryOptions,
  retailDeliveryTypeOptions,
  retailProductStatusOptions,
  retailStockScopeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';

interface RetailProductRecord {
  id: string;
  productCode: string;
  name: string;
  category: string;
  salePrice: number;
  costPrice: number;
  delivery: string;
  status: string;
  stockSummary: string;
  supplier: string;
}

interface StockRecord {
  id: string;
  scope: string;
  storeName: string;
  deviceCode: string;
  sku: string;
  available: number;
  locked: number;
  warningThreshold: number;
  owner: string;
  updatedAt: string;
}

const categoryMap = buildValueEnum(retailCategoryOptions);
const deliveryMap = buildValueEnum(retailDeliveryTypeOptions);
const productStatusMap = buildValueEnum(retailProductStatusOptions);
const stockScopeMap = buildValueEnum(retailStockScopeOptions);

const initialProducts: RetailProductRecord[] = [
  { id: 'product-1', productCode: 'RP-DRINK-001', name: '冰感饮料套餐', category: 'DRINK', salePrice: 12, costPrice: 6.8, delivery: 'DEVICE_SHIP', status: 'ON_SALE', stockSummary: '设备库存 42', supplier: '清凉饮品供应商' },
  { id: 'product-2', productCode: 'RP-CAR-002', name: '洗车毛巾礼包', category: 'CAR_SUPPLY', salePrice: 29, costPrice: 12.5, delivery: 'STORE_PICKUP', status: 'DRAFT', stockSummary: '门店库存 18', supplier: '门店物料仓' },
];

const initialStocks: StockRecord[] = [
  { id: 'stock-1', scope: 'PLATFORM_WAREHOUSE', storeName: '-', deviceCode: '-', sku: '零食礼包', available: 128, locked: 8, warningThreshold: 30, owner: '仓储-许安', updatedAt: '2026-04-18 09:00:00' },
  { id: 'stock-2', scope: 'STORE', storeName: '虹桥旗舰洗车站', deviceCode: '-', sku: '洗车毛巾礼包', available: 18, locked: 2, warningThreshold: 10, owner: '门店-李思远', updatedAt: '2026-04-18 08:40:00' },
  { id: 'stock-3', scope: 'DEVICE', storeName: '徐汇夜洗门店', deviceCode: 'DRINK-D-07', sku: '冰感饮料套餐', available: 42, locked: 0, warningThreshold: 12, owner: '设备运维-周可', updatedAt: '2026-04-18 08:30:00' },
];

const RetailManagement: React.FC = () => {
  const [productForm] = Form.useForm<RetailProductRecord>();
  const [stockForm] = Form.useForm<StockRecord>();
  const [products, setProducts] = useState(initialProducts);
  const [stocks, setStocks] = useState(initialStocks);
  const [productVisible, setProductVisible] = useState(false);
  const [stockVisible, setStockVisible] = useState(false);
  const [detail, setDetail] = useState<RetailProductRecord | StockRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');

  const handleProductSubmit = async () => {
    const values = await productForm.validateFields();
    setProducts((prev) => [{ ...values, id: `product-${Date.now()}` }, ...prev]);
    setProductVisible(false);
    productForm.resetFields();
    message.success('零售商品已创建');
  };

  const handleStockSubmit = async () => {
    const values = await stockForm.validateFields();
    setStocks((prev) => [{ ...values, id: `stock-${Date.now()}` }, ...prev]);
    setStockVisible(false);
    stockForm.resetFields();
    message.success('库存台账已创建');
  };

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商城零售" subtitle="管理零售商品、库存、负责人和履约方式，不再只是阶段说明页。" icon={<ShoppingCartOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="商品域">零食 / 饮料 / 自提 / 积分兑换</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="库存层级">平台 / 门店 / 设备</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="履约方式">出货 / 自提 / 虚拟发放</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="版本阶段">第三期起逐步扩展</Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'product',
            label: '零售商品',
            children: (
              <Card extra={<Space><Button onClick={() => openHelper('商品域说明')}>商品域说明</Button><Button type="primary" onClick={() => setProductVisible(true)}>新建商品</Button></Space>}>
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
                    { title: '操作', width: 100, render: (_, record: RetailProductRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'stock',
            label: '库存台账',
            children: (
              <Card extra={<Space><Button onClick={() => openHelper('库存规则')}>库存规则</Button><Button onClick={() => setStockVisible(true)}>新建库存记录</Button></Space>}>
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
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal title="新建零售商品" open={productVisible} onOk={handleProductSubmit} onCancel={() => { setProductVisible(false); productForm.resetFields(); }} width={860}>
        <Form form={productForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}><Input /></Form.Item>
            <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input /></Form.Item>
            <Form.Item name="category" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}><Select options={retailCategoryOptions} /></Form.Item>
            <Form.Item name="delivery" label="履约方式"><Select options={retailDeliveryTypeOptions} /></Form.Item>
            <Form.Item name="salePrice" label="售价"><Input /></Form.Item>
            <Form.Item name="costPrice" label="成本价"><Input /></Form.Item>
            <Form.Item name="supplier" label="供应商"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={retailProductStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="stockSummary" label="库存摘要"><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="新建库存台账" open={stockVisible} onOk={handleStockSubmit} onCancel={() => { setStockVisible(false); stockForm.resetFields(); }} width={860}>
        <Form form={stockForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="scope" label="库存层级" rules={[{ required: true, message: '请选择库存层级' }]}><Select options={retailStockScopeOptions} /></Form.Item>
            <Form.Item name="storeName" label="门店"><Input /></Form.Item>
            <Form.Item name="deviceCode" label="设备编号"><Input /></Form.Item>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, message: '请输入 SKU' }]}><Input /></Form.Item>
            <Form.Item name="available" label="可用库存"><Input /></Form.Item>
            <Form.Item name="locked" label="锁定库存"><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item name="warningThreshold" label="预警阈值"><Input /></Form.Item>
            <Form.Item name="updatedAt" label="更新时间"><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">这里用于承接零售模块的辅助配置入口，后续可以继续拆成商品分类、库存预警、履约策略等独立页。</Descriptions.Item>
          <Descriptions.Item label="当前入口">{helperTitle}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default RetailManagement;
