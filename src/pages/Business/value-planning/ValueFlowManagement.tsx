import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  adDeliveryStatusOptions,
  retailDeliveryTypeOptions,
  retailProductStatusOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface AdEventRecord {
  id: string;
  eventNo: string;
  campaignCode: string;
  slotName: string;
  eventType: string;
  storeName: string;
  orderNo: string;
  eventTime: string;
}

interface RetailOrderRecord {
  id: string;
  orderNo: string;
  userName: string;
  storeName: string;
  productName: string;
  deliveryType: string;
  orderAmount: number;
  status: string;
  createdAt: string;
}

interface RetailStockFlowRecord {
  id: string;
  flowNo: string;
  skuName: string;
  scopeName: string;
  flowType: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  createdAt: string;
}

interface ConversionRecord {
  id: string;
  campaignCode: string;
  userName: string;
  sourceEvent: string;
  orderNo: string;
  conversionAmount: number;
  status: string;
  convertedAt: string;
}

interface DeviceShipRecord {
  id: string;
  shipNo: string;
  deviceCode: string;
  skuName: string;
  orderNo: string;
  shipResult: string;
  stockFlowNo: string;
  shippedAt: string;
}

const deliveryTypeMap = buildValueEnum(retailDeliveryTypeOptions);
const retailStatusMap = buildValueEnum(retailProductStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const adDeliveryStatusMap = buildValueEnum(adDeliveryStatusOptions);

const adEvents: AdEventRecord[] = [
  { id: 'ae1', eventNo: 'ADE202604180001', campaignCode: 'ADC-202604-002', slotName: '支付完成页广告位', eventType: '曝光', storeName: '虹桥旗舰洗车站', orderNo: 'SO202604180019', eventTime: '2026-04-18 09:31:00' },
  { id: 'ae2', eventNo: 'ADE202604180002', campaignCode: 'ADC-202604-002', slotName: '支付完成页广告位', eventType: '点击', storeName: '虹桥旗舰洗车站', orderNo: 'SO202604180019', eventTime: '2026-04-18 09:31:08' },
];

const retailOrders: RetailOrderRecord[] = [
  { id: 'ro1', orderNo: 'RT202604180001', userName: '张晨', storeName: '虹桥旗舰洗车站', productName: '冰感饮料套餐', deliveryType: 'DEVICE_SHIP', orderAmount: 8.8, status: 'ON_SALE', createdAt: '2026-04-18 09:35:00' },
  { id: 'ro2', orderNo: 'RT202604170006', userName: '陈越', storeName: '徐汇夜洗门店', productName: '洗车毛巾', deliveryType: 'STORE_PICKUP', orderAmount: 12, status: 'OFF_SALE', createdAt: '2026-04-17 21:00:00' },
];

const stockFlows: RetailStockFlowRecord[] = [
  { id: 'sf1', flowNo: 'RSF202604180001', skuName: '冰感饮料套餐', scopeName: '饮料机 DRINK-D-07', flowType: '设备出货', quantity: -1, beforeQty: 42, afterQty: 41, createdAt: '2026-04-18 09:35:20' },
  { id: 'sf2', flowNo: 'RSF202604170006', skuName: '洗车毛巾', scopeName: '徐汇夜洗门店', flowType: '门店补货', quantity: 20, beforeQty: 8, afterQty: 28, createdAt: '2026-04-17 16:20:00' },
];

const conversions: ConversionRecord[] = [
  { id: 'cv1', campaignCode: 'ADC-202604-002', userName: '张晨', sourceEvent: 'ADE202604180002', orderNo: 'RT202604180001', conversionAmount: 8.8, status: 'RUNNING', convertedAt: '2026-04-18 09:35:00' },
  { id: 'cv2', campaignCode: 'ADC-202604-001', userName: '李波', sourceEvent: 'ADE202604170019', orderNo: 'SO202604170101', conversionAmount: 39.9, status: 'ENDED', convertedAt: '2026-04-17 19:42:00' },
];

const deviceShips: DeviceShipRecord[] = [
  { id: 'ds1', shipNo: 'SHIP202604180001', deviceCode: 'DRINK-D-07', skuName: '冰感饮料套餐', orderNo: 'RT202604180001', shipResult: 'SUCCESS', stockFlowNo: 'RSF202604180001', shippedAt: '2026-04-18 09:35:20' },
  { id: 'ds2', shipNo: 'SHIP202604170006', deviceCode: 'SNACK-XH-02', skuName: '洗车湿巾', orderNo: 'RT202604170006', shipResult: 'PENDING', stockFlowNo: '-', shippedAt: '-' },
];

const ValueFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<AdEventRecord | RetailOrderRecord | RetailStockFlowRecord | ConversionRecord | DeviceShipRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const adEventColumns = useMemo<ProColumns<AdEventRecord>[]>(() => [
    { title: '事件编号', dataIndex: 'eventNo', width: 180 },
    { title: '广告活动', dataIndex: 'campaignCode', width: 160 },
    { title: '广告位', dataIndex: 'slotName', width: 180 },
    { title: '事件类型', dataIndex: 'eventType', width: 110 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '关联订单', dataIndex: 'orderNo', width: 180 },
    { title: '事件时间', dataIndex: 'eventTime', width: 180, render: (_, record) => formatDateTime(record.eventTime) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const retailOrderColumns = useMemo<ProColumns<RetailOrderRecord>[]>(() => [
    { title: '零售订单', dataIndex: 'orderNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '商品', dataIndex: 'productName', width: 160 },
    { title: '履约方式', dataIndex: 'deliveryType', width: 130, render: (_, record) => renderStatusTag(record.deliveryType, deliveryTypeMap) },
    { title: '金额', dataIndex: 'orderAmount', width: 110, render: (_, record) => formatAmount(record.orderAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, retailStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const stockFlowColumns = useMemo<ProColumns<RetailStockFlowRecord>[]>(() => [
    { title: '库存流水', dataIndex: 'flowNo', width: 180 },
    { title: 'SKU', dataIndex: 'skuName', width: 160 },
    { title: '库存范围', dataIndex: 'scopeName', width: 180 },
    { title: '流水类型', dataIndex: 'flowType', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 90 },
    { title: '变动前', dataIndex: 'beforeQty', width: 90 },
    { title: '变动后', dataIndex: 'afterQty', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const conversionColumns = useMemo<ProColumns<ConversionRecord>[]>(() => [
    { title: '广告活动', dataIndex: 'campaignCode', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源事件', dataIndex: 'sourceEvent', width: 180 },
    { title: '转化订单', dataIndex: 'orderNo', width: 180 },
    { title: '转化金额', dataIndex: 'conversionAmount', width: 120, render: (_, record) => formatAmount(record.conversionAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, adDeliveryStatusMap) },
    { title: '转化时间', dataIndex: 'convertedAt', width: 180, render: (_, record) => formatDateTime(record.convertedAt) },
  ], []);

  const shipColumns = useMemo<ProColumns<DeviceShipRecord>[]>(() => [
    { title: '出货流水', dataIndex: 'shipNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: 'SKU', dataIndex: 'skuName', width: 160 },
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '出货结果', dataIndex: 'shipResult', width: 120, render: (_, record) => renderStatusTag(record.shipResult, writeOffStatusMap) },
    { title: '库存流水', dataIndex: 'stockFlowNo', width: 180 },
    { title: '出货时间', dataIndex: 'shippedAt', width: 180, render: (_, record) => formatDateTime(record.shippedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="增值流水中心" subtitle="维护广告事件、广告转化、零售订单、库存流水和设备出货记录。" icon={<LineChartOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="广告事件" value={adEvents.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="零售订单" value={retailOrders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="库存流水" value={stockFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="转化金额" value={formatAmount(conversions.reduce((sum, item) => sum + item.conversionAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待出货" value={deviceShips.filter((item) => item.shipResult === 'PENDING').length} suffix="单" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入广告、订单、SKU、设备、库存流水关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'adEvent', label: '广告事件', children: <ProTable<AdEventRecord> cardBordered rowKey="id" columns={adEventColumns} dataSource={filter(adEvents) as AdEventRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'conversion', label: '广告转化', children: <ProTable<ConversionRecord> cardBordered rowKey="id" columns={conversionColumns} dataSource={filter(conversions) as ConversionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} /> },
          { key: 'retailOrder', label: '零售订单', children: <ProTable<RetailOrderRecord> cardBordered rowKey="id" columns={retailOrderColumns} dataSource={filter(retailOrders) as RetailOrderRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('同步零售订单')}>同步订单</Button>]} /> },
          { key: 'stockFlow', label: '库存流水', children: <ProTable<RetailStockFlowRecord> cardBordered rowKey="id" columns={stockFlowColumns} dataSource={filter(stockFlows) as RetailStockFlowRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} /> },
          { key: 'ship', label: '设备出货', children: <ProTable<DeviceShipRecord> cardBordered rowKey="id" columns={shipColumns} dataSource={filter(deviceShips) as DeviceShipRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重试设备出货')}>重试出货</Button>]} /> },
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
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('增值流水操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="订单 / 设备 / 流水号" rules={[{ required: true, message: '请输入订单、设备或流水号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={writeOffStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ValueFlowManagement;
