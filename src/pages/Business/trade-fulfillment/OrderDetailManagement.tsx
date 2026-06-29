import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Radio, Row, Select, Statistic, Tabs, message } from 'antd';
import { CalculatorOutlined, FieldTimeOutlined, FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons';
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
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { ServiceOrderRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import { DateTimeField } from '@/utils/formControls';

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

const billingRuleOptions = [
  { value: 'STANDARD_TIME', label: '标准时长计费' },
  { value: 'PACKAGE_DEDUCTION', label: '套餐权益抵扣' },
  { value: 'PROMOTION_PRICE', label: '活动优惠价' },
  { value: 'MANUAL_OVERRIDE', label: '人工改价' },
];

const recalcReasonOptions = [
  { value: 'PAYMENT_REPAIR', label: '支付回调补录' },
  { value: 'DEVICE_EXCEPTION', label: '设备异常纠偏' },
  { value: 'CUSTOMER_SERVICE', label: '客服人工处理' },
  { value: 'FINANCE_RECONCILE', label: '财务对账调整' },
];

const formatPickerValue = (value: any) => value?.format?.('YYYY-MM-DD HH:mm:ss') || value;

const buildBillingSnapshot = (values: Record<string, any>) => [
  `计费规则：${billingRuleOptions.find((item) => item.value === values.billingRule)?.label || '未选择'}`,
  `优惠处理：${values.discountApplied === 'YES' ? '已应用优惠/权益抵扣' : '未应用优惠'}`,
  `封顶规则：${values.capEnabled ? '已启用封顶' : '未启用封顶'}`,
  `重算原因：${recalcReasonOptions.find((item) => item.value === values.recalcReason)?.label || '未选择'}`,
  values.recalcNote ? `补充说明：${values.recalcNote}` : '',
].filter(Boolean).join('；');

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
    { name: 'billingSnapshot', label: '计费依据' },
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
  const serviceOrderQuery = useQuery({
    queryKey: ['serviceOrderOptionsForOrderDetails'],
    queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const orderItems = (((itemQuery.data as any)?.records || []) as OrderItemRecord[]).map((item) => ({ ...item, id: String(item.id) }));
  const billingDetails = (((billingQuery.data as any)?.records || []) as BillingDetailRecord[]).map((item) => ({ ...item, id: String(item.id) }));
  const statusLogs = (((statusQuery.data as any)?.records || []) as OrderStatusLogRecord[]).map((item: any) => ({
    ...item,
    id: String(item.id),
    operator: item.operator ?? item.operatorName ?? item.operatorType,
  }));
  const serviceOrders = (serviceOrderQuery.data?.records || []) as ServiceOrderRecord[];
  const serviceOrderOptions = serviceOrders.map((item) => ({ value: item.id, label: `${item.orderNo} / ${item.storeName || '-'} / ${item.serviceName || '-'}` }));
  const serviceOrderMap = useMemo(() => new Map(serviceOrders.map((item) => [item.id, item])), [serviceOrders]);
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

  const handleOrderSelect = (value?: number) => {
    const order = value ? serviceOrderMap.get(value) : undefined;
    form.setFieldsValue({
      orderNo: order?.orderNo,
      billingMode: order?.billingMode,
      startAt: undefined,
      endAt: undefined,
      billingAmount: order?.amount,
    });
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
    { title: '计费依据', dataIndex: 'billingSnapshot', width: 220 },
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入订单、商品、计费、券码、快照关键词"
        onSearch={setKeyword}
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

      <BusinessDetailModal title="订单明细详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('itemType' in detail ? orderDetailFields.item : 'billingMode' in detail ? orderDetailFields.billing : 'deductType' in detail ? orderDetailFields.deduct : 'productSnapshot' in detail ? orderDetailFields.snapshot : orderDetailFields.status) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="计费补录"
        title={modalTitle}
        subtitle="重算并写入订单计费过程，补齐订单关联、计费金额和计费依据，支撑对账与状态复盘。"
        meta={['计费过程', '人工重算']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createBillingMutation.mutateAsync({
            orderNo: values.orderNo,
            serviceOrderId: values.serviceOrderId,
            billingMode: values.billingMode,
            durationMinutes: values.durationMinutes,
            unitPrice: values.unitPrice,
            billingAmount: values.billingAmount,
            startAt: formatPickerValue(values.startAt),
            endAt: formatPickerValue(values.endAt),
            billingSnapshot: buildBillingSnapshot(values),
          });
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createBillingMutation.isPending}
        width={860}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form" initialValues={{ billingMode: 'TIME', discountApplied: 'NO', capEnabled: false, billingRule: 'STANDARD_TIME', recalcReason: 'CUSTOMER_SERVICE' }}>
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<FileTextOutlined />} title="订单关联" desc="确认需要重算的服务订单，确保计费过程能关联回订单明细。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="serviceOrderId" label="服务订单" rules={[{ required: true, message: '请选择服务订单' }]}><Select showSearch optionFilterProp="label" options={serviceOrderOptions} placeholder="请选择服务订单" onChange={handleOrderSelect} /></Form.Item>
                <Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请选择服务订单或输入订单号' }]}><Input placeholder="选择订单后自动回填" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<CalculatorOutlined />} title="计费结果" desc="写入计费模式、时长、单价和最终计费金额，供支付、退款和结算读取。">
              <div className="merchant-editor-fields">
                <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}><Select options={billingModeOptions} placeholder="选择计费模式" /></Form.Item>
                <Form.Item name="durationMinutes" label="计费时长"><InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="分钟" placeholder="分钟数" /></Form.Item>
                <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请输入单价' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="计费单价" /></Form.Item>
                <Form.Item name="billingAmount" label="计费金额" rules={[{ required: true, message: '请输入计费金额' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="重算后的应计金额" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<FieldTimeOutlined />} title="计费区间与依据" desc="选择计费时间、适用规则和重算原因，系统会生成可追溯的计费说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="startAt" label="开始时间"><DateTimeField placeholder="选择开始时间" /></Form.Item>
                <Form.Item name="endAt" label="结束时间"><DateTimeField placeholder="选择结束时间" /></Form.Item>
                <Form.Item name="billingRule" label="适用规则" rules={[{ required: true, message: '请选择适用规则' }]}><Select options={billingRuleOptions} placeholder="选择计费规则" /></Form.Item>
                <Form.Item name="recalcReason" label="重算原因" rules={[{ required: true, message: '请选择重算原因' }]}><Select options={recalcReasonOptions} placeholder="选择重算原因" /></Form.Item>
                <Form.Item name="discountApplied" label="优惠处理"><Radio.Group options={[{ value: 'YES', label: '已抵扣优惠' }, { value: 'NO', label: '不抵扣优惠' }]} optionType="button" /></Form.Item>
                <Form.Item name="capEnabled" label="封顶规则" valuePropName="checked"><Checkbox>启用封顶或套餐上限</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="recalcNote" label="补充说明"><Input placeholder="例如：客服确认设备断电后按 30 分钟计费" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default OrderDetailManagement;
