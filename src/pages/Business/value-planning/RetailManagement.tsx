import React, { useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Space, Table, Tabs, Tag, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';

interface RetailProductRecord {
  id: string;
  name: string;
  category: string;
  inventory: string;
  delivery: string;
  stage: string;
  price: string;
}

interface StockRecord {
  id: string;
  scope: string;
  sku: string;
  available: number;
  warning: string;
  owner: string;
}

const initialProducts: RetailProductRecord[] = [
  { id: 'product-1', name: '冰感饮料套餐', category: '饮料商品', inventory: '设备库存 42', delivery: '自动出货', stage: '三期规划', price: '12 元' },
  { id: 'product-2', name: '洗车毛巾礼包', category: '门店自提', inventory: '门店库存 18', delivery: '扫码自提', stage: '四期预留', price: '29 元' },
];

const initialStocks: StockRecord[] = [
  { id: 'stock-1', scope: '平台总仓', sku: '零食礼包', available: 128, warning: '低于 30 提醒', owner: '仓储-许安' },
  { id: 'stock-2', scope: '虹桥旗舰洗车站', sku: '洗车毛巾礼包', available: 18, warning: '低于 10 提醒', owner: '门店-李思远' },
  { id: 'stock-3', scope: '饮料机 D-07', sku: '冰感饮料套餐', available: 42, warning: '低于 12 提醒', owner: '设备运维-周可' },
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
                    { title: '商品名称', dataIndex: 'name' },
                    { title: '分类', dataIndex: 'category', width: 160 },
                    { title: '售价', dataIndex: 'price', width: 100 },
                    { title: '库存摘要', dataIndex: 'inventory', width: 180 },
                    { title: '履约方式', dataIndex: 'delivery', width: 160 },
                    { title: '阶段', dataIndex: 'stage', width: 120, render: (value: string) => <Tag color="gold">{value}</Tag> },
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
                    { title: '库存层级', dataIndex: 'scope' },
                    { title: 'SKU', dataIndex: 'sku', width: 180 },
                    { title: '可用库存', dataIndex: 'available', width: 120 },
                    { title: '预警规则', dataIndex: 'warning', width: 160 },
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
            <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input /></Form.Item>
            <Form.Item name="category" label="商品分类" rules={[{ required: true, message: '请输入商品分类' }]}><Input /></Form.Item>
            <Form.Item name="price" label="售价"><Input /></Form.Item>
            <Form.Item name="delivery" label="履约方式"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="inventory" label="库存摘要"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="stage" label="阶段"><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="新建库存台账" open={stockVisible} onOk={handleStockSubmit} onCancel={() => { setStockVisible(false); stockForm.resetFields(); }} width={860}>
        <Form form={stockForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="scope" label="库存层级" rules={[{ required: true, message: '请输入库存层级' }]}><Input /></Form.Item>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, message: '请输入 SKU' }]}><Input /></Form.Item>
            <Form.Item name="available" label="可用库存"><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="warning" label="预警规则"><Input /></Form.Item>
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
