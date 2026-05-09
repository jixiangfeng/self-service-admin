import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, List, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { ProfileOutlined, ReloadOutlined } from '@ant-design/icons';
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
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
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
  const [actionModalType, setActionModalType] = useState<ActionModalType>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<{ status: string; note: string }>();
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
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.serviceOrder.updateStatus(Number(id), { status, remark: note }),
    onSuccess: () => {
      message.success('订单处置结果已更新');
      queryClient.invalidateQueries({ queryKey: ['tradeOrders'] });
    },
  });
  const updateRefundMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.refundOrder.updateStatus(Number(id), { status, note }),
    onSuccess: () => {
      message.success('退款审核结果已更新');
      queryClient.invalidateQueries({ queryKey: ['refundOrders'] });
    },
  });
  const updateAfterSaleMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.afterSaleTicket.updateStatus(Number(id), { status, note }),
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
  const exportTaskMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.file.importExportTasks.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operationImportExportTasks'] });
      message.success('订单导出任务已创建');
      navigate('/operations-support');
    },
  });
  const createExportTask = () => {
    exportTaskMutation.mutate({
      taskNo: `EXP-${Date.now()}`,
      taskName: '订单导出',
      taskType: 'TRADE_ORDER_EXPORT',
      bizNo: orderFilters.keyword || undefined,
      fileName: `订单导出-${Date.now()}.xlsx`,
      status: 'PENDING',
      createdBy: '系统管理员',
      createdAt: new Date().toISOString(),
    });
  };

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

  const openActionModal = (type: ActionModalType, id: string, currentStatus: string, currentNote?: string) => {
    setActionModalType(type);
    setActionTargetId(id);
    actionForm.setFieldsValue({ status: currentStatus, note: currentNote || '' });
  };

  const openDetailAction = () => {
    if (!detail) return;
    if ('refundNo' in detail) {
      openActionModal('refund', detail.id, detail.status, detail.auditNote);
      return;
    }
    if ('ticketNo' in detail) {
      openActionModal('afterSale', detail.id, detail.status, detail.result || detail.compensation);
      return;
    }
    openActionModal('order', detail.id, detail.status, detail.note);
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
      await updateOrderMutation.mutateAsync({ id: actionTargetId, status: values.status, note: values.note });
    }

    if (actionModalType === 'refund') {
      await updateRefundMutation.mutateAsync({ id: actionTargetId, status: values.status, note: values.note });
    }

    if (actionModalType === 'afterSale') {
      await updateAfterSaleMutation.mutateAsync({ id: actionTargetId, status: values.status, note: values.note });
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
          <Button size="small" onClick={() => setDetail(record)}>处置台</Button>
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
    { title: '退款类型', dataIndex: 'refundType', width: 120, search: false },
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
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('refund', record.id, record.status, record.auditNote)}>审核</Button>
        </Space>
      ),
    },
  ];

  const afterSaleColumns: ProColumns<AfterSaleRecord>[] = [
    { title: '售后单号', dataIndex: 'ticketNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '售后单号 / 订单号 / 内容 / 处理人' } },
    { title: '关联订单', dataIndex: 'orderNo', width: 180, search: false },
    { title: '售后类型', dataIndex: 'ticketType', width: 120, search: false },
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
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('afterSale', record.id, record.status, record.result || record.compensation)}>补偿 / 结论</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="交易中心"
        subtitle="把服务订单、退款中心和售后工单做成可处理、可审核、可回写结果的本地业务页。"
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
                  <Button key="export" loading={exportTaskMutation.isPending} onClick={createExportTask}>导出订单</Button>,
                  <Button key="exception" type="primary" onClick={() => {
                    const target = filteredOrders.find((item) => item.status !== 'COMPLETED') || filteredOrders[0];
                    if (target) setDetail(target);
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

      <Modal
        title="人工补单"
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          createOrderForm.resetFields();
        }}
        onOk={async () => {
          const values = await createOrderForm.validateFields();
          await createOrderMutation.mutateAsync({
            ...values,
            storeName: storeOptionMap.get(values.storeId),
            pointCode: servicePointOptionMap.get(values.servicePointId),
            serviceName: serviceProductOptionMap.get(values.serviceProductId),
          });
          setCreateOrderVisible(false);
          createOrderForm.resetFields();
        }}
        confirmLoading={createOrderMutation.isPending}
        width={880}
        destroyOnClose
      >
        <Form form={createOrderForm} layout="vertical" initialValues={{ orderType: 'SCAN', billingMode: 'TIME', payMode: 'WX', orderStatus: 'PAID' }}>
          <div className="modal-grid">
            <Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input /></Form.Item>
            <Form.Item name="merchantId" label="商户" rules={[{ required: true, message: '请选择商户' }]}><Select options={merchantOptions} /></Form.Item>
            <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}><Select options={storeOptions} /></Form.Item>
            <Form.Item name="servicePointId" label="服务点位"><Select options={servicePointOptions} allowClear /></Form.Item>
            <Form.Item name="serviceProductId" label="服务商品" rules={[{ required: true, message: '请选择服务商品' }]}><Select options={serviceProductOptions} /></Form.Item>
            <Form.Item name="orderType" label="订单类型" rules={[{ required: true, message: '请选择订单类型' }]}><Select options={orderTypeOptions} /></Form.Item>
            <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}><Select options={[{ value: 'TIME', label: '按时长' }, { value: 'COUNT', label: '按次' }, { value: 'PACKAGE', label: '套餐' }]} /></Form.Item>
            <Form.Item name="payMode" label="支付方式" rules={[{ required: true, message: '请选择支付方式' }]}><Select options={payModeOptions} /></Form.Item>
            <Form.Item name="orderStatus" label="订单状态" rules={[{ required: true, message: '请选择订单状态' }]}><Select options={orderStatusOptions} /></Form.Item>
            <Form.Item name="amount" label="订单金额" rules={[{ required: true, message: '请输入订单金额' }]}><Input type="number" /></Form.Item>
            <Form.Item name="payAmount" label="实付金额" rules={[{ required: true, message: '请输入实付金额' }]}><Input type="number" /></Form.Item>
            <Form.Item name="userName" label="用户"><Input /></Form.Item>
            <Form.Item name="startedAt" label="开始时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="finishedAt" label="结束时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item className="modal-span-2" name="note" label="补单说明"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={actionModalType === 'order' ? '订单处置' : actionModalType === 'refund' ? '退款审核' : actionModalType === 'afterSale' ? '售后处理' : '处理动作'}
        open={!!actionModalType}
        onOk={handleActionSubmit}
        onCancel={closeActionModal}
        width={820}
      >
        <Form form={actionForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select
                options={actionModalType === 'order' ? orderStatusOptions : actionModalType === 'refund' ? refundStatusOptions : ticketStatusOptions}
              />
            </Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="note" label="处理说明" rules={[{ required: true, message: '请输入处理说明' }]}>
              <Input.TextArea rows={4} placeholder="记录审核意见、补偿方案、异常结论等" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={detail && 'orderNo' in detail ? `订单处置台 · ${String(detail.orderNo)}` : '详情查看'}
        open={!!detail}
        width={760}
        onCancel={() => setDetail(null)}
        footer={(
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
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
                fields={('refundNo' in detail ? tradeDetailFields.refund : 'ticketNo' in detail ? tradeDetailFields.afterSale : tradeDetailFields.order) as DetailField<Record<string, any>>[]}
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
                      if ('refundNo' in detail) openActionModal('refund', detail.id, detail.status, detail.auditNote);
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
                    dataSource={[
                      '退款会同步影响结算单和活动成本分摊',
                      '售后补偿要同步到用户资产中心',
                      '异常设备建议回到设备中心做维护标记',
                    ]}
                    renderItem={(item: string) => <List.Item>{item}</List.Item>}
                  />
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </Modal>

    </div>
  );
};

export default TradeManagement;
