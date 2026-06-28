import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, List, Radio, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, FieldTimeOutlined, FileAddOutlined, ProfileOutlined, ReloadOutlined, SolutionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  orderStatusOptions,
  payModeOptions as catalogPayModeOptions,
  refundStatusOptions,
  ticketStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

interface TradeOrderRecord {
  id: string;
  orderNo: string;
  orderType: string;
  storeName: string;
  pointCode: string;
  serviceName: string;
  payMode: string;
  amount: number;
  userName: string;
  status: string;
  createdAt: string;
  note?: string;
}

interface RefundRecord {
  id: string;
  refundNo: string;
  orderNo: string;
  refundType: string;
  amount: number;
  reason: string;
  applicant: string;
  status: string;
  createdAt: string;
  auditNote?: string;
}

interface AfterSaleRecord {
  id: string;
  ticketNo: string;
  orderNo: string;
  ticketType: string;
  content: string;
  owner: string;
  compensation: string;
  status: string;
  createdAt: string;
  result?: string;
}

type ActionModalType = 'order' | 'refund' | 'afterSale' | null;
type TradeDetailType = Exclude<ActionModalType, null>;

const orderTypeOptions = [
  { value: 'SCAN', label: '扫码订单' },
  { value: 'POINT_SELECT', label: '选点位订单' },
  { value: 'PACKAGE', label: '套餐订单' },
  { value: 'MIXED', label: '混合计费订单' },
];

const payModeOptions = catalogPayModeOptions;
const orderStatusMap = buildValueEnum(orderStatusOptions);
const refundStatusMap = buildValueEnum(refundStatusOptions);
const afterSaleStatusMap = buildValueEnum(ticketStatusOptions);

const refundAuditStatusOptions = [
  { value: 'APPROVED', label: '审核通过' },
  { value: 'REJECTED', label: '审核拒绝' },
  { value: 'PROCESSING', label: '继续处理' },
];

const supplementSourceOptions = [
  { value: 'STORE', label: '门店补录' },
  { value: 'CUSTOMER_SERVICE', label: '客服补录' },
  { value: 'PAYMENT_REPAIR', label: '支付补偿' },
  { value: 'FINANCE_RECONCILE', label: '财务对账' },
];

const actionReasonOptions = {
  order: [
    { value: 'PAYMENT_EXCEPTION', label: '支付异常' },
    { value: 'DEVICE_EXCEPTION', label: '设备异常' },
    { value: 'CUSTOMER_REQUEST', label: '用户要求处理' },
    { value: 'STORE_CONFIRM', label: '门店确认调整' },
  ],
  refund: [
    { value: 'SERVICE_FAILED', label: '服务未完成' },
    { value: 'DUPLICATE_PAYMENT', label: '重复支付' },
    { value: 'CUSTOMER_APPEAL', label: '用户申诉通过' },
    { value: 'RISK_REJECT', label: '风控拒绝' },
  ],
  afterSale: [
    { value: 'DEVICE_FAULT', label: '设备故障' },
    { value: 'SERVICE_DISPUTE', label: '服务争议' },
    { value: 'COMPENSATION_APPROVED', label: '补偿通过' },
    { value: 'NO_COMPENSATION', label: '无需补偿' },
  ],
};

const responsibilityOptions = [
  { value: 'PLATFORM', label: '平台' },
  { value: 'STORE', label: '门店' },
  { value: 'USER', label: '用户' },
  { value: 'DEVICE', label: '设备' },
  { value: 'THIRD_PARTY', label: '第三方' },
];

const nextStepOptions = [
  { value: 'NONE', label: '无需后续动作' },
  { value: 'REFUND', label: '发起退款' },
  { value: 'COMPENSATE', label: '补偿用户' },
  { value: 'RETRY_SERVICE', label: '重新履约' },
  { value: 'FOLLOW_UP', label: '客服跟进' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || '未选择';
const formatPickerValue = (value: any) => value?.format?.('YYYY-MM-DD HH:mm:ss') || value;
const buildActionNote = (type: Exclude<ActionModalType, null>, values: Record<string, any>) => [
  `处理原因：${optionLabel(actionReasonOptions[type], values.actionReason)}`,
  `责任归属：${optionLabel(responsibilityOptions, values.responsibility)}`,
  `后续动作：${optionLabel(nextStepOptions, values.nextStep)}`,
  `通知用户：${values.notifyUser ? '已通知' : '未通知'}`,
  values.actionNote ? `补充说明：${values.actionNote}` : '',
].filter(Boolean).join('；');

const buildSupplementNote = (values: Record<string, any>) => [
  `补单来源：${optionLabel(supplementSourceOptions, values.supplementSource)}`,
  `用户确认：${values.userConfirmed ? '已确认' : '未确认'}`,
  values.supplementNote ? `补充说明：${values.supplementNote}` : '',
].filter(Boolean).join('；');

const buildTradeReminderItems = (record: TradeOrderRecord | RefundRecord | AfterSaleRecord) => {
  if ('refundNo' in record) {
    return [
      `退款状态：${record.status || '未记录'}`,
      `退款金额：${formatAmount(record.amount)}`,
      record.auditNote ? `审核备注：${record.auditNote}` : `关联订单：${record.orderNo}`,
    ];
  }
  if ('ticketNo' in record) {
    return [
      `工单状态：${record.status || '未记录'}`,
      record.compensation ? `补偿方案：${record.compensation}` : `处理人：${record.owner || '未分派'}`,
      record.result ? `处理结果：${record.result}` : `关联订单：${record.orderNo}`,
    ];
  }
  return [
    `订单状态：${record.status || '未记录'}`,
    `支付方式：${record.payMode || '未记录'}`,
    record.note ? `订单备注：${record.note}` : `订单金额：${formatAmount(record.amount)}`,
  ];
};

const tradeDetailFields: Record<'order' | 'refund' | 'afterSale', DetailField<any>[]> = {
  order: [
    { name: 'orderNo', label: '订单号' },
    { name: 'orderType', label: '订单类型' },
    { name: 'storeName', label: '门店' },
    { name: 'pointCode', label: '点位' },
    { name: 'serviceName', label: '服务商品' },
    { name: 'payMode', label: '支付方式' },
    { name: 'amount', label: '订单金额', render: (value) => formatAmount(value) },
    { name: 'userName', label: '用户' },
    { name: 'status', label: '状态' },
    { name: 'note', label: '备注' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  refund: [
    { name: 'refundNo', label: '退款单号' },
    { name: 'orderNo', label: '关联订单' },
    { name: 'refundType', label: '退款类型' },
    { name: 'amount', label: '退款金额', render: (value) => formatAmount(value) },
    { name: 'reason', label: '退款原因' },
    { name: 'applicant', label: '申请来源' },
    { name: 'status', label: '状态' },
    { name: 'auditNote', label: '审核备注' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  afterSale: [
    { name: 'ticketNo', label: '售后单号' },
    { name: 'orderNo', label: '关联订单' },
    { name: 'ticketType', label: '售后类型' },
    { name: 'content', label: '问题描述' },
    { name: 'owner', label: '处理人' },
    { name: 'compensation', label: '补偿方案' },
    { name: 'status', label: '状态' },
    { name: 'result', label: '处理结果' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
};

const TradeManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TradeOrderRecord | RefundRecord | AfterSaleRecord | null>(null);
  const [detailType, setDetailType] = useState<TradeDetailType | null>(null);
  const [actionModalType, setActionModalType] = useState<ActionModalType>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<Record<string, any>>();
  const [createOrderVisible, setCreateOrderVisible] = useState(false);
  const [orderFilters, setOrderFilters] = useState({ keyword: '', orderType: undefined as string | undefined, payMode: undefined as string | undefined, status: undefined as string | undefined });
  const [refundFilters, setRefundFilters] = useState({ keyword: '', status: undefined as string | undefined });
  const [afterSaleFilters, setAfterSaleFilters] = useState({ keyword: '', status: undefined as string | undefined });
  const orderQuery = useQuery({
    queryKey: ['tradeOrders', orderFilters],
    queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 200, ...orderFilters })).data,
  });
  const refundQuery = useQuery({
    queryKey: ['refundOrders', refundFilters],
    queryFn: async () => (await api.refundOrder.page({ pageNum: 1, pageSize: 200, ...refundFilters })).data,
  });
  const afterSaleQuery = useQuery({
    queryKey: ['afterSaleTickets', afterSaleFilters],
    queryFn: async () => (await api.afterSaleTicket.page({ pageNum: 1, pageSize: 200, ...afterSaleFilters })).data,
  });
  const orders = ((orderQuery.data as any)?.records || []) as TradeOrderRecord[];
  const refunds = ((refundQuery.data as any)?.records || []) as RefundRecord[];
  const afterSales = ((afterSaleQuery.data as any)?.records || []) as AfterSaleRecord[];
  const [createOrderForm] = Form.useForm();
  const merchantOptionsQuery = useQuery({ queryKey: ['merchantOptionsForTrade'], queryFn: async () => (await api.merchant.options()).data });
  const storeOptionsQuery = useQuery({ queryKey: ['storeOptionsForTrade'], queryFn: async () => (await api.store.options()).data });
  const servicePointOptionsQuery = useQuery({ queryKey: ['servicePointOptionsForTrade'], queryFn: async () => (await api.servicePoint.options()).data });
  const serviceProductOptionsQuery = useQuery({ queryKey: ['serviceProductOptionsForTrade'], queryFn: async () => (await api.serviceProduct.options()).data });
  const merchantOptions = (merchantOptionsQuery.data || []) as SelectOptionRecord[];
  const storeOptions = (storeOptionsQuery.data || []) as SelectOptionRecord[];
  const servicePointOptions = (servicePointOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceProductOptions = (serviceProductOptionsQuery.data || []) as SelectOptionRecord[];
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item.label])), [storeOptions]);
  const servicePointOptionMap = useMemo(() => new Map(servicePointOptions.map((item) => [item.value, item.label])), [servicePointOptions]);
  const serviceProductOptionMap = useMemo(() => new Map(serviceProductOptions.map((item) => [item.value, item.label])), [serviceProductOptions]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.serviceOrder.updateStatus(Number(id), { orderStatus: status, remark: note, operatorType: 'ADMIN', operatorName: '后台操作' }),
    onSuccess: () => {
      message.success('订单处置结果已更新');
      queryClient.invalidateQueries({ queryKey: ['tradeOrders'] });
    },
  });
  const updateRefundMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.refundOrder.updateStatus(Number(id), { refundStatus: status, reason: note, auditNote: note }),
    onSuccess: () => {
      message.success('退款审核结果已更新');
      queryClient.invalidateQueries({ queryKey: ['refundOrders'] });
    },
  });
  const updateAfterSaleMutation = useMutation({
    mutationFn: async ({ id, status, note, owner }: { id: string; status: string; note?: string; owner?: string }) => api.afterSaleTicket.updateStatus(Number(id), { ticketStatus: status, compensationType: 'MANUAL', compensationValue: note, result: note, owner }),
    onSuccess: () => {
      message.success('售后工单已更新');
      queryClient.invalidateQueries({ queryKey: ['afterSaleTickets'] });
    },
  });
  const createOrderMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => api.serviceOrder.add(data),
    onSuccess: () => {
      message.success('人工补单已创建');
      queryClient.invalidateQueries({ queryKey: ['tradeOrders'] });
    },
  });
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          containsKeyword(orderFilters.keyword, [item.orderNo, item.storeName, item.serviceName, item.userName, item.note]) &&
          (!orderFilters.orderType || item.orderType === orderFilters.orderType) &&
          (!orderFilters.payMode || item.payMode === orderFilters.payMode) &&
          (!orderFilters.status || item.status === orderFilters.status)
      ),
    [orderFilters, orders]
  );

  const filteredRefunds = useMemo(
    () =>
      refunds.filter(
        (item) =>
          containsKeyword(refundFilters.keyword, [item.refundNo, item.orderNo, item.reason, item.applicant, item.auditNote]) &&
          (!refundFilters.status || item.status === refundFilters.status)
      ),
    [refundFilters, refunds]
  );

  const filteredAfterSales = useMemo(
    () =>
      afterSales.filter(
        (item) =>
          containsKeyword(afterSaleFilters.keyword, [item.ticketNo, item.orderNo, item.content, item.owner, item.result]) &&
          (!afterSaleFilters.status || item.status === afterSaleFilters.status)
      ),
    [afterSaleFilters, afterSales]
  );

  const openDetail = (type: TradeDetailType, record: TradeOrderRecord | RefundRecord | AfterSaleRecord) => {
    setDetailType(type);
    setDetail(record);
  };

  const openActionModal = (type: ActionModalType, id: string, currentStatus: string, currentNote?: string) => {
    setActionModalType(type);
    setActionTargetId(id);
    if (type) {
      actionForm.setFieldsValue({ status: type === 'refund' && (currentStatus === 'SUCCESS' || currentStatus === 'REFUNDED') ? 'APPROVED' : currentStatus, actionReason: actionReasonOptions[type][0].value, responsibility: 'PLATFORM', nextStep: 'FOLLOW_UP', notifyUser: true, owner: '后台客服', actionNote: currentNote || '' });
    }
  };

  const openDetailAction = () => {
    if (!detail || !detailType) return;
    if (detailType === 'refund') {
      const refund = detail as RefundRecord;
      openActionModal('refund', refund.id, refund.status, refund.auditNote);
      return;
    }
    if (detailType === 'afterSale') {
      const afterSale = detail as AfterSaleRecord;
      openActionModal('afterSale', afterSale.id, afterSale.status, afterSale.result || afterSale.compensation);
      return;
    }
    const order = detail as TradeOrderRecord;
    openActionModal('order', order.id, order.status, order.note);
  };

  const closeActionModal = () => {
    setActionModalType(null);
    setActionTargetId(null);
    actionForm.resetFields();
  };

  const handleActionSubmit = async () => {
    const values = await actionForm.validateFields();
    if (!actionTargetId || !actionModalType) {
      return;
    }

    if (actionModalType === 'order') {
      await updateOrderMutation.mutateAsync({ id: actionTargetId, status: values.status, note: buildActionNote(actionModalType, values) });
    }

    if (actionModalType === 'refund') {
      await updateRefundMutation.mutateAsync({ id: actionTargetId, status: values.status, note: buildActionNote(actionModalType, values) });
    }

    if (actionModalType === 'afterSale') {
      await updateAfterSaleMutation.mutateAsync({ id: actionTargetId, status: values.status, owner: values.owner, note: buildActionNote(actionModalType, values) });
    }

    closeActionModal();
  };

  const orderColumns: ProColumns<TradeOrderRecord>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 门店 / 服务 / 用户' } },
    { title: '订单类型', dataIndex: 'orderType', width: 130, valueType: 'select', valueEnum: buildValueEnum(orderTypeOptions), render: (_, record) => renderStatusTag(record.orderType, buildValueEnum(orderTypeOptions) as any) },
    { title: '门店', dataIndex: 'storeName', width: 160, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '服务商品', dataIndex: 'serviceName', width: 180, search: false },
    { title: '支付方式', dataIndex: 'payMode', width: 120, valueType: 'select', valueEnum: buildValueEnum(payModeOptions), render: (_, record) => renderStatusTag(record.payMode, buildValueEnum(payModeOptions) as any) },
    { title: '订单金额', dataIndex: 'amount', width: 120, search: false, render: (_, record) => formatAmount(record.amount) },
    { title: '用户', dataIndex: 'userName', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: orderStatusMap, render: (_, record) => renderStatusTag(record.status, orderStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 240,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail('order', record)}>处置台</Button>
          <Button
            size="small"
            onClick={() => {
              createOrderForm.setFieldsValue({
                orderType: record.orderType,
                payMode: record.payMode,
                orderStatus: record.status,
                amount: record.amount,
                payAmount: record.amount,
              });
              setCreateOrderVisible(true);
            }}
          >
            人工补单
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => openActionModal('order', record.id, record.status, record.note)}
          >
            关单 / 调整
          </Button>
        </Space>
      ),
    },
  ];

  const refundColumns: ProColumns<RefundRecord>[] = [
    { title: '退款单号', dataIndex: 'refundNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '退款单号 / 订单号 / 原因 / 申请人' } },
    { title: '关联订单', dataIndex: 'orderNo', width: 180, search: false },
    { title: '退款类型', dataIndex: 'refundType', width: 120, search: false , render: (value) => formatEnumText(value, 'refundType', '退款类型') },
    { title: '退款金额', dataIndex: 'amount', width: 120, search: false, render: (_, record) => formatAmount(record.amount) },
    { title: '退款原因', dataIndex: 'reason', width: 220, search: false },
    { title: '申请来源', dataIndex: 'applicant', width: 140, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: refundStatusMap, render: (_, record) => renderStatusTag(record.status, refundStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail('refund', record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('refund', record.id, record.status, record.auditNote)}>审核</Button>
        </Space>
      ),
    },
  ];

  const afterSaleColumns: ProColumns<AfterSaleRecord>[] = [
    { title: '售后单号', dataIndex: 'ticketNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '售后单号 / 订单号 / 内容 / 处理人' } },
    { title: '关联订单', dataIndex: 'orderNo', width: 180, search: false },
    { title: '售后类型', dataIndex: 'ticketType', width: 120, search: false , render: (value) => formatEnumText(value, 'ticketType', '售后类型') },
    { title: '问题描述', dataIndex: 'content', width: 260, search: false },
    { title: '处理人', dataIndex: 'owner', width: 140, search: false },
    { title: '补偿方案', dataIndex: 'compensation', width: 160, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: afterSaleStatusMap, render: (_, record) => renderStatusTag(record.status, afterSaleStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail('afterSale', record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('afterSale', record.id, record.status, record.result || record.compensation)}>补偿 / 结论</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="交易中心"
        subtitle="把服务订单、退款中心和售后工单做成可处理、可审核、可回写结果的动态业务页。"
        icon={<ProfileOutlined />}
      />
      <WorkflowGuide
        title="订单处置闭环"
        summary="交易页要能从订单识别一路走到退款、售后、核销和结算，而不是只停在三张表。"
        steps={[
          { title: '订单识别', description: '扫码、选点位、套餐和混合计费统一归口', status: 'finish', tag: '服务订单' },
          { title: '支付与启动', description: '确认支付方式和设备启动结果', status: 'process', tag: '支付状态' },
          { title: '退款与售后', description: '处理异常退款、故障申诉和补偿', status: 'process', tag: '退款 / 售后工单' },
          { title: '回看履约结果', description: '最后回到核销履约和结算复盘', status: 'wait', tag: '下一步：核销 / 结算' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="服务订单" value={orders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="进行中订单" value={orders.filter((item) => item.status === 'IN_PROGRESS').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款处理中" value={refunds.filter((item) => item.status === 'PROCESSING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="售后待处理" value={afterSales.filter((item) => item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'orders',
            label: '服务订单',
            children: (
              <ProTable<TradeOrderRecord>
                cardBordered
                rowKey="id"
                columns={orderColumns}
                dataSource={filteredOrders}
                loading={orderQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1820 }}
                toolBarRender={() => [
                  <Button key="new" icon={<FileAddOutlined />} onClick={() => { createOrderForm.resetFields(); setCreateOrderVisible(true); }}>人工补单</Button>,
                  <Button key="exception" type="primary" onClick={() => {
                    const target = filteredOrders.find((item) => item.status !== 'COMPLETED') || filteredOrders[0];
                    if (target) openDetail('order', target);
                  }} disabled={!filteredOrders.length}>异常订单处理</Button>,
                ]}
                onSubmit={(values) => setOrderFilters({ keyword: String(values.keyword || ''), orderType: values.orderType as string | undefined, payMode: values.payMode as string | undefined, status: values.status as string | undefined })}
                onReset={() => setOrderFilters({ keyword: '', orderType: undefined, payMode: undefined, status: undefined })}
              />
            ),
          },
          {
            key: 'refunds',
            label: '退款中心',
            children: (
              <ProTable<RefundRecord>
                cardBordered
                rowKey="id"
                columns={refundColumns}
                dataSource={filteredRefunds}
                loading={refundQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1600 }}
                toolBarRender={() => [<Button key="audit" type="primary" onClick={() => {
                  const target = filteredRefunds.find((item) => item.status !== 'APPROVED' && item.status !== 'REJECTED') || filteredRefunds[0];
                  if (target) openActionModal('refund', target.id, target.status, target.auditNote);
                }} disabled={!filteredRefunds.length}>批量审核</Button>]}
                onSubmit={(values) => setRefundFilters({ keyword: String(values.keyword || ''), status: values.status as string | undefined })}
                onReset={() => setRefundFilters({ keyword: '', status: undefined })}
              />
            ),
          },
          {
            key: 'after-sales',
            label: '售后工单',
            children: (
              <ProTable<AfterSaleRecord>
                cardBordered
                rowKey="id"
                columns={afterSaleColumns}
                dataSource={filteredAfterSales}
                loading={afterSaleQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1680 }}
                toolBarRender={() => [
                  <Button key="assign" onClick={() => {
                    const target = filteredAfterSales.find((item) => item.status !== 'CLOSED') || filteredAfterSales[0];
                    if (target) openActionModal('afterSale', target.id, target.status, target.result || target.compensation);
                  }} disabled={!filteredAfterSales.length}>批量分派</Button>,
                  <Button key="new" type="primary" onClick={() => navigate('/service-desk')}>创建售后工单</Button>,
                ]}
                onSubmit={(values) => setAfterSaleFilters({ keyword: String(values.keyword || ''), status: values.status as string | undefined })}
                onReset={() => setAfterSaleFilters({ keyword: '', status: undefined })}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="交易补录"
        title="人工补单"
        subtitle="补齐订单主体、履约对象、支付金额和时间备注，写入后继续进入履约与结算链路。"
        meta={['服务订单', '后台补录']}
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          createOrderForm.resetFields();
        }}
        onOk={async () => {
          const values = await createOrderForm.validateFields();
          await createOrderMutation.mutateAsync({
            orderNo: values.orderNo,
            merchantId: values.merchantId,
            storeId: values.storeId,
            servicePointId: values.servicePointId,
            serviceProductId: values.serviceProductId,
            orderType: values.orderType,
            billingMode: values.billingMode,
            payMode: values.payMode,
            orderStatus: values.orderStatus,
            amount: values.amount,
            payAmount: values.payAmount,
            userName: values.userName,
            startedAt: formatPickerValue(values.startedAt),
            finishedAt: formatPickerValue(values.finishedAt),
            note: buildSupplementNote(values),
            storeName: storeOptionMap.get(values.storeId),
            pointCode: servicePointOptionMap.get(values.servicePointId),
            serviceName: serviceProductOptionMap.get(values.serviceProductId),
          });
          setCreateOrderVisible(false);
          createOrderForm.resetFields();
        }}
        confirmLoading={createOrderMutation.isPending}
        width={920}
        forceRender
        destroyOnClose
      >
        <Form form={createOrderForm} layout="vertical" className="merchant-editor-form" initialValues={{ orderType: 'SCAN', billingMode: 'TIME', payMode: 'WX', orderStatus: 'PAID', supplementSource: 'CUSTOMER_SERVICE', userConfirmed: true }}>
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<FileAddOutlined />} title="订单归属" desc="确认订单号、商户、门店、点位和服务商品，保证补录订单能回到履约对象。">
              <div className="merchant-editor-fields">
                <Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input placeholder="例如：SO202605100001" /></Form.Item>
                <Form.Item name="merchantId" label="商户" rules={[{ required: true, message: '请选择商户' }]}><Select options={merchantOptions} placeholder="选择商户主体" /></Form.Item>
                <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}><Select options={storeOptions} placeholder="选择发生门店" /></Form.Item>
                <Form.Item name="servicePointId" label="服务点位"><Select options={servicePointOptions} allowClear placeholder="选择点位，非点位订单可为空" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="serviceProductId" label="服务商品" rules={[{ required: true, message: '请选择服务商品' }]}><Select options={serviceProductOptions} placeholder="选择本次补录的服务商品" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<AuditOutlined />} title="交易计费" desc="补齐订单类型、计费模式、支付方式和金额，供退款、对账和结算复盘使用。">
              <div className="merchant-editor-fields">
                <Form.Item name="orderType" label="订单类型" rules={[{ required: true, message: '请选择订单类型' }]}><Select options={orderTypeOptions} placeholder="选择订单来源类型" /></Form.Item>
                <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}><Select options={[{ value: 'TIME', label: '按时长' }, { value: 'COUNT', label: '按次' }, { value: 'PACKAGE', label: '套餐' }]} placeholder="选择计费方式" /></Form.Item>
                <Form.Item name="payMode" label="支付方式" rules={[{ required: true, message: '请选择支付方式' }]}><Select options={payModeOptions} placeholder="选择支付渠道" /></Form.Item>
                <Form.Item name="orderStatus" label="订单状态" rules={[{ required: true, message: '请选择订单状态' }]}><Select options={orderStatusOptions} placeholder="选择写入状态" /></Form.Item>
                <Form.Item name="amount" label="订单金额" rules={[{ required: true, message: '请输入订单金额' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="订单应收金额" /></Form.Item>
                <Form.Item name="payAmount" label="实付金额" rules={[{ required: true, message: '请输入实付金额' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="用户实际支付金额" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<FieldTimeOutlined />} title="履约补充" desc="记录用户、服务起止时间和补单原因，形成后续异常处置依据。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="userName" label="用户"><Input placeholder="用户昵称、手机号或会员标识" /></Form.Item>
                <Form.Item name="supplementSource" label="补单来源" rules={[{ required: true, message: '请选择补单来源' }]}><Select options={supplementSourceOptions} placeholder="选择补单来源" /></Form.Item>
                <Form.Item name="startedAt" label="开始时间"><DatePicker showTime style={{ width: '100%' }} placeholder="选择开始时间" /></Form.Item>
                <Form.Item name="finishedAt" label="结束时间"><DatePicker showTime style={{ width: '100%' }} placeholder="选择结束时间" /></Form.Item>
                <Form.Item name="userConfirmed" label="用户确认" valuePropName="checked"><Checkbox>已完成用户或门店确认</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="supplementNote" label="补充说明"><Input placeholder="例如：支付成功但订单未生成，已按支付凭证补录" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="交易处理"
        title={actionModalType === 'order' ? '订单处置' : actionModalType === 'refund' ? '退款审核' : actionModalType === 'afterSale' ? '售后处理' : '处理动作'}
        subtitle="更新业务状态并记录处理意见，结果会回写到对应订单、退款单或售后工单。"
        meta={[actionModalType === 'order' ? '订单状态' : actionModalType === 'refund' ? '退款审核' : '售后结论', actionTargetId ? `ID ${actionTargetId}` : '待选择']}
        open={!!actionModalType}
        onOk={handleActionSubmit}
        onCancel={closeActionModal}
        width={760}
      >
        <Form form={actionForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SolutionOutlined />} title="处理结果" desc="选择最终状态并沉淀可追溯的处置说明。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select
                    options={actionModalType === 'order' ? orderStatusOptions : actionModalType === 'refund' ? refundAuditStatusOptions : ticketStatusOptions}
                    placeholder="选择本次处理后的状态"
                  />
                </Form.Item>
                <Form.Item name="actionReason" label="处理原因" rules={[{ required: true, message: '请选择处理原因' }]}>
                  <Select options={actionModalType ? actionReasonOptions[actionModalType] : []} placeholder="选择处理原因" />
                </Form.Item>
                <Form.Item name="responsibility" label="责任归属" rules={[{ required: true, message: '请选择责任归属' }]}>
                  <Radio.Group options={responsibilityOptions} optionType="button" />
                </Form.Item>
                <Form.Item name="nextStep" label="后续动作" rules={[{ required: true, message: '请选择后续动作' }]}>
                  <Select options={nextStepOptions} placeholder="选择后续动作" />
                </Form.Item>
                {actionModalType === 'afterSale' ? (
                  <Form.Item name="owner" label="处理人" rules={[{ required: true, message: '请输入处理人' }]}>
                    <Input placeholder="例如：后台客服" />
                  </Form.Item>
                ) : null}
                <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="actionNote" label="补充说明"><Input placeholder="例如：退款审核通过，预计 1 个工作日原路退回" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal
        title={detailType === 'order' && detail && 'orderNo' in detail ? `订单处置台 · ${String(detail.orderNo)}` : '详情查看'}
        eyebrow="交易履约详情"
        subtitle="核对订单、退款或售后记录，并快速进入后续处理动作。"
        meta={[detailType === 'refund' ? '退款单' : detailType === 'afterSale' ? '售后单' : '订单记录', '可处理']}
        open={!!detail}
        width={900}
        onCancel={() => {
          setDetail(null);
          setDetailType(null);
        }}
        footer={(
          <Space>
            <Button onClick={() => {
              setDetail(null);
              setDetailType(null);
            }}>关闭</Button>
            <Button
              type="primary"
              onClick={openDetailAction}
            >
              记录处理动作
            </Button>
          </Space>
        )}
        destroyOnClose
      >
        {detail ? (
          <>
            <Card title="记录概览" style={{ marginBottom: 16 }}>
              <SchemaDetail
                record={detail as Record<string, any>}
                fields={(detailType === 'refund' ? tradeDetailFields.refund : detailType === 'afterSale' ? tradeDetailFields.afterSale : tradeDetailFields.order) as DetailField<Record<string, any>>[]}
                column={1}
                labelWidth={110}
              />
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="推荐动作">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button block onClick={() => navigate('/fulfillment')}>查看履约日志</Button>
                    <Button block onClick={() => {
                      if (detailType === 'refund') {
                        const refund = detail as RefundRecord;
                        openActionModal('refund', refund.id, refund.status, refund.auditNote);
                      }
                      else navigate('/trade');
                    }}>发起退款审核</Button>
                    <Button block onClick={() => navigate('/service-desk')}>创建售后工单</Button>
                    <Button block onClick={() => navigate('/asset')}>补偿余额 / 券</Button>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="关联提醒">
                  <List
                    dataSource={buildTradeReminderItems(detail)}
                    renderItem={(item: string) => <List.Item>{item}</List.Item>}
                  />
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default TradeManagement;
