import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  billingModeOptions,
  orderStatusOptions,
  payModeOptions,
  settlementDetailTypeOptions,
  writeOffObjectTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface OrderItemRecord {
  id: string;
  orderNo: string;
  itemType: string;
  itemName: string;
  quantity: number;
  salePrice: number;
  discountAmount: number;
  payableAmount: number;
}

interface BillingDetailRecord {
  id: string;
  orderNo: string;
  billingMode: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  unitPrice: number;
  billingAmount: number;
  billingSnapshot: string;
}

interface DeductRecord {
  id: string;
  orderNo: string;
  deductType: string;
  deductName: string;
  deductAmount: number;
  costBearer: string;
  relatedNo: string;
}

interface OrderSnapshotRecord {
  id: string;
  orderNo: string;
  productSnapshot: string;
  priceSnapshot: string;
  storeSnapshot: string;
  userSnapshot: string;
  createdAt: string;
}

interface OrderStatusLogRecord {
  id: string;
  orderNo: string;
  beforeStatus: string;
  afterStatus: string;
  operator: string;
  remark: string;
  changedAt: string;
}

const itemTypeMap = buildValueEnum(writeOffObjectTypeOptions);
const billingModeMap = buildValueEnum(billingModeOptions);
const orderStatusMap = buildValueEnum(orderStatusOptions);
const payModeMap = buildValueEnum(payModeOptions);
const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);

const orderItems: OrderItemRecord[] = [
  { id: 'oi1', orderNo: 'SO202604180019', itemType: 'SERVICE_RIGHT', itemName: '泡沫精洗套餐', quantity: 1, salePrice: 39.9, discountAmount: 5, payableAmount: 34.9 },
  { id: 'oi2', orderNo: 'SO202604180020', itemType: 'COUPON', itemName: '夜洗 5 元券', quantity: 1, salePrice: 0, discountAmount: 5, payableAmount: 0 },
];

const billingDetails: BillingDetailRecord[] = [
  { id: 'bd1', orderNo: 'SO202604180019', billingMode: 'PACKAGE', startAt: '2026-04-18 09:27:00', endAt: '2026-04-18 09:45:00', durationMinutes: 18, unitPrice: 39.9, billingAmount: 39.9, billingSnapshot: '套餐价 V20260418' },
  { id: 'bd2', orderNo: 'SO202604170113', billingMode: 'TIME', startAt: '2026-04-17 22:08:00', endAt: '2026-04-17 22:15:00', durationMinutes: 7, unitPrice: 0.9, billingAmount: 6.3, billingSnapshot: '夜洗时段价 PRICE-XH-NIGHT' },
];

const deductRecords: DeductRecord[] = [
  { id: 'dr1', orderNo: 'SO202604180019', deductType: 'ACTIVITY_COST', deductName: '夜洗券抵扣', deductAmount: 5, costBearer: '平台承担', relatedNo: 'CP202604170001' },
  { id: 'dr2', orderNo: 'SO202604180020', deductType: 'ORDER_INCOME', deductName: '余额支付', deductAmount: 20, costBearer: '用户余额', relatedNo: 'BF202604180002' },
];

const snapshots: OrderSnapshotRecord[] = [
  { id: 'sn1', orderNo: 'SO202604180019', productSnapshot: '泡沫精洗套餐 / V20260418', priceSnapshot: '售价 39.9 / 券抵扣 5', storeSnapshot: '虹桥旗舰洗车站 / BAY-03', userSnapshot: '李波 / 会员用户', createdAt: '2026-04-18 09:14:00' },
  { id: 'sn2', orderNo: 'SO202604170113', productSnapshot: '夜洗时长包 / V20260417', priceSnapshot: '0.9 元/分钟', storeSnapshot: '徐汇夜洗门店 / BAY-07', userSnapshot: '陈越 / 普通用户', createdAt: '2026-04-17 22:08:00' },
];

const statusLogs: OrderStatusLogRecord[] = [
  { id: 'sl1', orderNo: 'SO202604180019', beforeStatus: 'PENDING_PAYMENT', afterStatus: 'PAID', operator: '支付回调', remark: '微信支付成功', changedAt: '2026-04-18 09:14:20' },
  { id: 'sl2', orderNo: 'SO202604180019', beforeStatus: 'PAID', afterStatus: 'IN_PROGRESS', operator: '设备回执', remark: '设备启动成功', changedAt: '2026-04-18 09:27:08' },
];

const OrderDetailManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<OrderItemRecord | BillingDetailRecord | DeductRecord | OrderSnapshotRecord | OrderStatusLogRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ orderNo: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]): T[] =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const itemColumns = useMemo<ProColumns<OrderItemRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '明细类型', dataIndex: 'itemType', width: 130, render: (_, record) => renderStatusTag(record.itemType, itemTypeMap) },
    { title: '明细名称', dataIndex: 'itemName', width: 180 },
    { title: '数量', dataIndex: 'quantity', width: 90 },
    { title: '售价', dataIndex: 'salePrice', width: 110, render: (_, record) => formatAmount(record.salePrice) },
    { title: '优惠', dataIndex: 'discountAmount', width: 110, render: (_, record) => formatAmount(record.discountAmount) },
    { title: '应付', dataIndex: 'payableAmount', width: 110, render: (_, record) => formatAmount(record.payableAmount) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const billingColumns = useMemo<ProColumns<BillingDetailRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '计费模式', dataIndex: 'billingMode', width: 120, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '开始时间', dataIndex: 'startAt', width: 180, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'endAt', width: 180, render: (_, record) => formatDateTime(record.endAt) },
    { title: '时长', dataIndex: 'durationMinutes', width: 90 },
    { title: '单价', dataIndex: 'unitPrice', width: 110, render: (_, record) => formatAmount(record.unitPrice) },
    { title: '计费金额', dataIndex: 'billingAmount', width: 120, render: (_, record) => formatAmount(record.billingAmount) },
    { title: '规则快照', dataIndex: 'billingSnapshot', width: 220 },
  ], []);

  const deductColumns = useMemo<ProColumns<DeductRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '抵扣类型', dataIndex: 'deductType', width: 140, render: (_, record) => renderStatusTag(record.deductType, detailTypeMap) },
    { title: '抵扣名称', dataIndex: 'deductName', width: 160 },
    { title: '抵扣金额', dataIndex: 'deductAmount', width: 120, render: (_, record) => formatAmount(record.deductAmount) },
    { title: '承担方', dataIndex: 'costBearer', width: 120 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
  ], []);

  const snapshotColumns = useMemo<ProColumns<OrderSnapshotRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '商品快照', dataIndex: 'productSnapshot', width: 220 },
    { title: '价格快照', dataIndex: 'priceSnapshot', width: 200 },
    { title: '门店快照', dataIndex: 'storeSnapshot', width: 220 },
    { title: '用户快照', dataIndex: 'userSnapshot', width: 180 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const statusColumns = useMemo<ProColumns<OrderStatusLogRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '变更前', dataIndex: 'beforeStatus', width: 130, render: (_, record) => renderStatusTag(record.beforeStatus, orderStatusMap) },
    { title: '变更后', dataIndex: 'afterStatus', width: 130, render: (_, record) => renderStatusTag(record.afterStatus, orderStatusMap) },
    { title: '操作方', dataIndex: 'operator', width: 130, render: (value) => value === '支付回调' ? renderStatusTag('WX', payModeMap) : value },
    { title: '备注', dataIndex: 'remark', width: 220 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="订单明细中心" subtitle="维护订单明细、计费过程、权益抵扣、交易快照和状态流转日志。" icon={<UnorderedListOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="订单明细" value={orderItems.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="计费记录" value={billingDetails.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="抵扣金额" value={formatAmount(deductRecords.reduce((sum, item) => sum + item.deductAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="交易快照" value={snapshots.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="状态流转" value={statusLogs.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入订单、商品、计费、券码、快照关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'items', label: '订单明细', children: <ProTable<OrderItemRecord> cardBordered rowKey="id" columns={itemColumns} dataSource={filter(orderItems)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} /> },
          { key: 'billing', label: '计费过程', children: <ProTable<BillingDetailRecord> cardBordered rowKey="id" columns={billingColumns} dataSource={filter(billingDetails)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="recalc" type="primary" onClick={() => openModal('重算计费过程')}>重算计费</Button>]} /> },
          { key: 'deduct', label: '权益抵扣', children: <ProTable<DeductRecord> cardBordered rowKey="id" columns={deductColumns} dataSource={filter(deductRecords)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'snapshot', label: '交易快照', children: <ProTable<OrderSnapshotRecord> cardBordered rowKey="id" columns={snapshotColumns} dataSource={filter(snapshots)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'status', label: '状态流转', children: <ProTable<OrderStatusLogRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={filter(statusLogs)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
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
          message.success('订单明细操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={orderStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderDetailManagement;
