import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
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
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
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

const orderDetailFields: Record<'item' | 'billing' | 'deduct' | 'snapshot' | 'status', DetailField<any>[]> = {
  item: [
    { name: 'orderNo', label: '订单号' },
    { name: 'itemType', label: '项目类型' },
    { name: 'itemName', label: '项目名称' },
    { name: 'quantity', label: '数量' },
    { name: 'salePrice', label: '销售单价', render: (value) => formatAmount(value) },
    { name: 'discountAmount', label: '优惠金额', render: (value) => formatAmount(value) },
    { name: 'payableAmount', label: '应付金额', render: (value) => formatAmount(value) },
  ],
  billing: [
    { name: 'orderNo', label: '订单号' },
    { name: 'billingMode', label: '计费模式' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'endAt', label: '结束时间', render: (value) => formatDateTime(value) },
    { name: 'durationMinutes', label: '计费时长' },
    { name: 'unitPrice', label: '单价', render: (value) => formatAmount(value) },
    { name: 'billingAmount', label: '计费金额', render: (value) => formatAmount(value) },
    { name: 'billingSnapshot', label: '规则快照' },
  ],
  deduct: [
    { name: 'orderNo', label: '订单号' },
    { name: 'deductType', label: '抵扣类型' },
    { name: 'deductName', label: '抵扣名称' },
    { name: 'deductAmount', label: '抵扣金额', render: (value) => formatAmount(value) },
    { name: 'costBearer', label: '承担方' },
    { name: 'relatedNo', label: '关联单号' },
  ],
  snapshot: [
    { name: 'orderNo', label: '订单号' },
    { name: 'productSnapshot', label: '商品快照' },
    { name: 'priceSnapshot', label: '价格快照' },
    { name: 'storeSnapshot', label: '门店快照' },
    { name: 'userSnapshot', label: '用户快照' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  status: [
    { name: 'orderNo', label: '订单号' },
    { name: 'beforeStatus', label: '原状态' },
    { name: 'afterStatus', label: '新状态' },
    { name: 'operator', label: '操作人' },
    { name: 'remark', label: '备注' },
    { name: 'changedAt', label: '变更时间', render: (value) => formatDateTime(value) },
  ],
};

const OrderDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<OrderItemRecord | BillingDetailRecord | DeductRecord | OrderSnapshotRecord | OrderStatusLogRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const filter = <T extends object>(items: T[]): T[] =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const itemQuery = useQuery({
    queryKey: ['serviceOrderItems', keyword],
    queryFn: async () => (await api.serviceOrderItem.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const billingQuery = useQuery({
    queryKey: ['orderBillingDetails', keyword],
    queryFn: async () => (await api.orderBillingDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const statusQuery = useQuery({
    queryKey: ['orderStatusLogs', keyword],
    queryFn: async () => (await api.orderStatusLog.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const orderItems = (((itemQuery.data as any)?.records || []) as OrderItemRecord[]).map((item) => ({ ...item, id: String(item.id) }));
  const billingDetails = (((billingQuery.data as any)?.records || []) as BillingDetailRecord[]).map((item) => ({ ...item, id: String(item.id) }));
  const statusLogs = (((statusQuery.data as any)?.records || []) as OrderStatusLogRecord[]).map((item: any) => ({
    ...item,
    id: String(item.id),
    operator: item.operator ?? item.operatorName ?? item.operatorType,
  }));
  const createBillingMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => api.orderBillingDetail.add(data),
    onSuccess: () => {
      message.success('计费过程已写入');
      queryClient.invalidateQueries({ queryKey: ['orderBillingDetails'] });
    },
  });
  const deductRecords = orderItems
    .filter((item) => Number(item.discountAmount || 0) > 0)
    .map((item) => ({
      id: `deduct-${item.id}`,
      orderNo: item.orderNo,
      deductType: item.itemType,
      deductName: item.itemName,
      deductAmount: Number(item.discountAmount || 0),
      costBearer: '订单优惠',
      relatedNo: item.orderNo,
    }));
  const snapshots = [
    ...orderItems.filter((item: any) => item.snapshotJson).map((item: any) => ({
      id: `item-snapshot-${item.id}`,
      orderNo: item.orderNo,
      productSnapshot: item.snapshotJson || '-',
      priceSnapshot: `${formatAmount(item.salePrice)} / 优惠 ${formatAmount(item.discountAmount)}`,
      storeSnapshot: '-',
      userSnapshot: '-',
      createdAt: item.createdAt,
    })),
    ...billingDetails.filter((item) => item.billingSnapshot).map((item) => ({
      id: `billing-snapshot-${item.id}`,
      orderNo: item.orderNo,
      productSnapshot: '-',
      priceSnapshot: item.billingSnapshot || '-',
      storeSnapshot: '-',
      userSnapshot: '-',
      createdAt: item.startAt || item.endAt || '',
    })),
  ];

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
        <Col xs={24} sm={12} xl={5}><Card loading={itemQuery.isLoading}><Statistic title="订单明细" value={orderItems.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card loading={billingQuery.isLoading}><Statistic title="计费记录" value={billingDetails.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="抵扣金额" value={formatAmount(deductRecords.reduce((sum, item) => sum + item.deductAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="交易快照" value={snapshots.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card loading={statusQuery.isLoading}><Statistic title="状态流转" value={statusLogs.length} suffix="条" /></Card></Col>
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
          { key: 'items', label: '订单明细', children: <ProTable<OrderItemRecord> cardBordered rowKey="id" columns={itemColumns} dataSource={filter(orderItems)} loading={itemQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} /> },
          { key: 'billing', label: '计费过程', children: <ProTable<BillingDetailRecord> cardBordered rowKey="id" columns={billingColumns} dataSource={filter(billingDetails)} loading={billingQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="recalc" type="primary" onClick={() => openModal('重算计费过程')}>重算计费</Button>]} /> },
          { key: 'deduct', label: '权益抵扣', children: <ProTable<DeductRecord> cardBordered rowKey="id" columns={deductColumns} dataSource={filter(deductRecords)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'snapshot', label: '交易快照', children: <ProTable<OrderSnapshotRecord> cardBordered rowKey="id" columns={snapshotColumns} dataSource={filter(snapshots)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'status', label: '状态流转', children: <ProTable<OrderStatusLogRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={filter(statusLogs)} loading={statusQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('itemType' in detail ? orderDetailFields.item : 'billingMode' in detail ? orderDetailFields.billing : 'deductType' in detail ? orderDetailFields.deduct : 'productSnapshot' in detail ? orderDetailFields.snapshot : orderDetailFields.status) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createBillingMutation.mutateAsync(values);
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createBillingMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical" initialValues={{ billingMode: 'TIME' }}>
          <div className="modal-grid">
            <Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input /></Form.Item>
            <Form.Item name="serviceOrderId" label="订单ID"><Input type="number" /></Form.Item>
            <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}><Select options={billingModeOptions} /></Form.Item>
            <Form.Item name="durationMinutes" label="计费时长"><Input type="number" /></Form.Item>
            <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请输入单价' }]}><Input type="number" /></Form.Item>
            <Form.Item name="billingAmount" label="计费金额" rules={[{ required: true, message: '请输入计费金额' }]}><Input type="number" /></Form.Item>
            <Form.Item name="startAt" label="开始时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="endAt" label="结束时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item className="modal-span-2" name="billingSnapshot" label="规则快照"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderDetailManagement;
