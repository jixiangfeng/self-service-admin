import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { BankOutlined, DiffOutlined, PayCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditStatusOptions,
  payModeOptions,
  publishStatusOptions,
  reconciliationStatusOptions,
  refundStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { PaymentCallbackLogRecord, PaymentChannelRecord, PaymentOrderRecord, PaymentReconciliationRecord, RefundCallbackLogRecord } from '@/services/backendService';
import { DateField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue } from '@/utils/formControls';


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};


const payModeMap = buildValueEnum(payModeOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const refundStatusMap = buildValueEnum(refundStatusOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);
const callbackTypeOptions = [
  { value: 'PAY_SUCCESS', label: '支付成功回调' },
  { value: 'PAY_FAIL', label: '支付失败回调' },
  { value: 'REFUND_SUCCESS', label: '退款成功回调' },
  { value: 'REPLAY', label: '人工重放' },
];
const reconcileReasonOptions = [
  { value: 'CHANNEL_DELAY', label: '渠道延迟入账' },
  { value: 'REFUND_DIFF', label: '退款差异' },
  { value: 'MANUAL_REVIEW', label: '人工复核' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const paymentDetailFields: Record<'order' | 'channel' | 'callback' | 'refund' | 'recon', DetailField<any>[]> = {
  order: [
    { name: 'paymentNo', label: '支付单号' },
    { name: 'orderNo', label: '订单号' },
    { name: 'payChannel', label: '支付方式' },
    { name: 'payAmount', label: '支付金额', render: (value) => formatAmount(value) },
    { name: 'channelTradeNo', label: '渠道流水' },
    { name: 'payStatus', label: '状态' },
    { name: 'paidAt', label: '支付时间', render: (value) => formatDateTime(value) },
  ],
  channel: [
    { name: 'channelCode', label: '渠道编码' },
    { name: 'channelName', label: '渠道名称' },
    { name: 'mchId', label: '商户号' },
    { name: 'appId', label: 'AppID' },
    { name: 'settleAccount', label: '结算账户' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  callback: [
    { name: 'requestId', label: '请求编号' },
    { name: 'paymentNo', label: '支付单号' },
    { name: 'callbackType', label: '回调类型' },
    { name: 'callbackStatus', label: '处理结果' },
    { name: 'remark', label: '备注' },
    { name: 'handledAt', label: '处理时间', render: (value) => formatDateTime(value) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  refund: [
    { name: 'refundNo', label: '退款单号' },
    { name: 'payOrderNo', label: '支付单号' },
    { name: 'refundAmount', label: '退款金额', render: (value) => formatAmount(value) },
    { name: 'channelRefundNo', label: '渠道退款流水' },
    { name: 'status', label: '状态' },
    { name: 'callbackAt', label: '回调时间', render: (value) => formatDateTime(value) },
  ],
  recon: [
    { name: 'reconNo', label: '对账单号' },
    { name: 'channelCode', label: '支付渠道' },
    { name: 'billDate', label: '账单日期' },
    { name: 'platformAmount', label: '平台金额', render: (value) => formatAmount(value) },
    { name: 'channelAmount', label: '渠道金额', render: (value) => formatAmount(value) },
    { name: 'diffAmount', label: '差异金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
  ],
};

const PaymentOpsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<PaymentOrderRecord | PaymentChannelRecord | PaymentCallbackLogRecord | RefundCallbackLogRecord | PaymentReconciliationRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, any>>();
  const paymentQuery = useQuery({
    queryKey: ['paymentOrders', keyword],
    queryFn: async () => (await api.payment.orders.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const callbackQuery = useQuery({
    queryKey: ['paymentCallbackLogs', keyword],
    queryFn: async () => (await api.payment.callbackLogs.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const channelQuery = useQuery({
    queryKey: ['paymentChannels', keyword],
    queryFn: async () => (await api.payment.channels.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const refundCallbackQuery = useQuery({
    queryKey: ['refundCallbackLogs', keyword],
    queryFn: async () => (await api.payment.refundCallbacks.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['paymentReconciliations', keyword],
    queryFn: async () => (await api.payment.reconciliations.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: number; payStatus: string }) => api.payment.orders.updateStatus(payload.id, payload.payStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentOrders'] });
      message.success('支付状态已更新');
    },
  });
  const syncPaymentMutation = useMutation({
    mutationFn: async (id: number) => api.payment.orders.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentOrders'] });
      message.success('支付状态已同步');
    },
  });
  const replayCallbackMutation = useMutation({
    mutationFn: async (id: number) => api.payment.callbackLogs.replay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentCallbackLogs'] });
      message.success('回调已重放');
    },
  });

  const confirmMarkSuccess = (record: PaymentOrderRecord) => {
    showBusinessConfirm({
      title: '确认标记支付成功',
      content: `确定将支付单「${record.paymentNo || record.orderNo || record.id}」标记为支付成功吗？该操作会影响订单支付状态。`,
      okText: '确认标记成功',
      danger: false,
      onOk: () => updateStatusMutation.mutate({ id: record.id, payStatus: 'SUCCESS' }),
    });
  };

  const confirmSyncPayment = (record?: PaymentOrderRecord) => {
    if (!record) return;
    showBusinessConfirm({
      title: '确认同步支付状态',
      content: `确定同步支付单「${record.paymentNo || record.orderNo || record.id}」的渠道状态吗？`,
      okText: '确认同步',
      danger: false,
      onOk: () => syncPaymentMutation.mutate(record.id),
    });
  };

  const confirmReplayCallback = (record: PaymentCallbackLogRecord) => {
    showBusinessConfirm({
      title: '确认重放支付回调',
      content: `确定重放回调「${record.requestId || record.paymentNo || record.id}」吗？重复回调可能触发状态重算。`,
      okText: '确认重放',
      onOk: () => replayCallbackMutation.mutate(record.id),
    });
  };

  const paymentOrderRecords = paymentQuery.data?.records || [];
  const callbackRecords = callbackQuery.data?.records || [];
  const payChannels = channelQuery.data?.records || [];
  const refundCallbacks = refundCallbackQuery.data?.records || [];
  const reconciliations = reconciliationQuery.data?.records || [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    form.setFieldsValue({
      status: 'PENDING',
      callbackType: title.includes('退款') ? 'REFUND_SUCCESS' : 'PAY_SUCCESS',
      reconcileReason: 'MANUAL_REVIEW',
    });
    setModalVisible(true);
  };

  const paymentColumns = useMemo<ProColumns<PaymentOrderRecord>[]>(() => [
    { title: '支付单号', dataIndex: 'paymentNo', width: 180 },
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '支付方式', dataIndex: 'payChannel', width: 120, render: (_, record) => renderStatusTag(record.payChannel, payModeMap) },
    { title: '支付金额', dataIndex: 'payAmount', width: 120, render: (_, record) => formatAmount(record.payAmount) },
    { title: '渠道流水', dataIndex: 'channelTradeNo', width: 220 },
    { title: '状态', dataIndex: 'payStatus', width: 120, render: (_, record) => renderStatusTag(record.payStatus, auditStatusMap) },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            type="link"
            loading={updateStatusMutation.isPending}
            onClick={() => confirmMarkSuccess(record)}
          >
            标记成功
          </Button>
          <Button
            size="small"
            type="link"
            loading={syncPaymentMutation.isPending}
            onClick={() => confirmSyncPayment(record)}
          >
            同步
          </Button>
        </>
      ),
    },
  ], [syncPaymentMutation, updateStatusMutation]);

  const channelColumns = useMemo<ProColumns<PaymentChannelRecord>[]>(() => [
    { title: '渠道编码', dataIndex: 'channelCode', width: 140 },
    { title: '渠道名称', dataIndex: 'channelName', width: 180 },
    { title: '商户号', dataIndex: 'mchId', width: 150 },
    { title: 'AppID', dataIndex: 'appId', width: 180 },
    { title: '结算账户', dataIndex: 'settleAccount', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const callbackColumns = useMemo<ProColumns<PaymentCallbackLogRecord>[]>(() => [
    { title: '请求编号', dataIndex: 'requestId', width: 180 },
    { title: '支付单号', dataIndex: 'paymentNo', width: 180 },
    { title: '回调类型', dataIndex: 'callbackType', width: 120 },
    { title: '处理结果', dataIndex: 'callbackStatus', width: 120, render: (_, record) => renderStatusTag(record.callbackStatus, auditStatusMap) },
    { title: '处理时间', dataIndex: 'handledAt', width: 180, render: (_, record) => formatDateTime(record.handledAt) },
    { title: '备注', dataIndex: 'remark', width: 220, ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 120,
      render: (_, record) => <Button size="small" type="link" loading={replayCallbackMutation.isPending} onClick={() => confirmReplayCallback(record)}>重放</Button>,
    },
  ], [replayCallbackMutation]);

  const refundColumns = useMemo<ProColumns<RefundCallbackLogRecord>[]>(() => [
    { title: '退款单号', dataIndex: 'refundNo', width: 180 },
    { title: '支付单号', dataIndex: 'payOrderNo', width: 180 },
    { title: '退款金额', dataIndex: 'refundAmount', width: 120, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '渠道退款流水', dataIndex: 'channelRefundNo', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, refundStatusMap) },
    { title: '回调时间', dataIndex: 'callbackAt', width: 180, render: (_, record) => formatDateTime(record.callbackAt) },
  ], []);

  const reconColumns = useMemo<ProColumns<PaymentReconciliationRecord>[]>(() => [
    { title: '对账单号', dataIndex: 'reconNo', width: 180 },
    { title: '支付渠道', dataIndex: 'channelCode', width: 130 },
    { title: '账单日期', dataIndex: 'billDate', width: 130 },
    { title: '平台金额', dataIndex: 'platformAmount', width: 120, render: (_, record) => formatAmount(record.platformAmount) },
    { title: '渠道金额', dataIndex: 'channelAmount', width: 120, render: (_, record) => formatAmount(record.channelAmount) },
    { title: '差异金额', dataIndex: 'diffAmount', width: 120, render: (_, record) => formatAmount(record.diffAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, reconciliationStatusMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="支付运维中心" subtitle="维护支付单、支付渠道、回调日志、退款回调和渠道对账差异。" icon={<PayCircleOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="支付单" value={paymentOrderRecords.length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="支付渠道" value={payChannels.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待处理回调" value={callbackRecords.filter((item) => item.callbackStatus === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="退款回调" value={refundCallbacks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="差异对账" value={reconciliations.filter((item) => item.status === 'DIFF').length} suffix="单" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入支付单、订单号、渠道流水、对账单号"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'payment', label: '支付单', children: <ProTable<PaymentOrderRecord> cardBordered rowKey="id" columns={paymentColumns} dataSource={paymentOrderRecords} loading={paymentQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1460 }} toolBarRender={() => [<Button key="sync" type="primary" disabled={!paymentOrderRecords.length} loading={syncPaymentMutation.isPending} onClick={() => confirmSyncPayment(paymentOrderRecords[0])}>同步支付状态</Button>]} /> },
          { key: 'channel', label: '支付渠道', children: <ProTable<PaymentChannelRecord> cardBordered rowKey="id" columns={channelColumns} dataSource={payChannels} loading={channelQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建支付渠道')}>新建渠道</Button>]} /> },
          { key: 'callback', label: '支付回调', children: <ProTable<PaymentCallbackLogRecord> cardBordered rowKey="id" columns={callbackColumns} dataSource={callbackRecords} loading={callbackQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('登记支付回调')}>登记回调</Button>]} /> },
          { key: 'refund', label: '退款回调', children: <ProTable<RefundCallbackLogRecord> cardBordered rowKey="id" columns={refundColumns} dataSource={refundCallbacks} loading={refundCallbackQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('登记退款回调')}>登记回调</Button>]} /> },
          { key: 'recon', label: '渠道对账', children: <ProTable<PaymentReconciliationRecord> cardBordered rowKey="id" columns={reconColumns} dataSource={reconciliations} loading={reconciliationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理对账差异')}>处理差异</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="支付运维详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('paymentNo' in detail ? paymentDetailFields.order : 'channelCode' in detail && 'mchId' in detail ? paymentDetailFields.channel : 'requestId' in detail ? paymentDetailFields.callback : 'refundNo' in detail ? paymentDetailFields.refund : paymentDetailFields.recon) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="支付运维处理"
        title={modalTitle}
        subtitle="把渠道、回调、退款和对账处理拆成结构化字段，避免运营直接维护回调报文或大段处理说明。"
        meta={[modalTitle || '支付运维', '平台运营']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          const payloadSummary = compactJoin([
            values.callbackType ? `回调类型：${optionLabel(callbackTypeOptions, values.callbackType)}` : undefined,
            values.requestId ? `请求编号：${values.requestId}` : undefined,
            values.paymentNo ? `支付单号：${values.paymentNo}` : undefined,
            values.reconcileReason ? `处理原因：${optionLabel(reconcileReasonOptions, values.reconcileReason)}` : undefined,
            values.owner ? `处理人：${values.owner}` : undefined,
          ]);
          if (modalTitle.includes('支付渠道')) {
            await api.payment.channels.add(values);
            queryClient.invalidateQueries({ queryKey: ['paymentChannels'] });
            message.success('支付渠道已创建');
          } else if (modalTitle.includes('支付回调')) {
            await api.payment.callbackLogs.add({ ...values, payload: payloadSummary, remark: payloadSummary, callbackType: values.callbackType || 'REPLAY', callbackStatus: values.status || 'PENDING' });
            queryClient.invalidateQueries({ queryKey: ['paymentCallbackLogs'] });
            message.success('支付回调已登记');
          } else if (modalTitle.includes('退款回调')) {
            await api.payment.refundCallbacks.add({ ...values, payload: payloadSummary, remark: payloadSummary });
            queryClient.invalidateQueries({ queryKey: ['refundCallbackLogs'] });
            message.success('退款回调已登记');
          } else if (modalTitle.includes('对账')) {
            await api.payment.reconciliations.add({ ...values, handleRemark: payloadSummary });
            queryClient.invalidateQueries({ queryKey: ['paymentReconciliations'] });
            message.success('对账记录已保存');
          }
          setModalVisible(false);
        }}
        width={1120}
        okText="保存处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            {modalTitle.includes('支付渠道') ? (
              <BusinessEditorSection icon={<BankOutlined />} title="渠道基础" desc="配置渠道编码、商户号、AppID 和结算账户。">
                <div className="merchant-editor-fields">
                  <Form.Item name="channelCode" label="渠道编码" rules={[{ required: true, message: '请输入渠道编码' }]}><Input placeholder="例如：WX_PAY" /></Form.Item>
                  <Form.Item name="channelName" label="渠道名称" rules={[{ required: true, message: '请输入渠道名称' }]}><Input placeholder="例如：微信支付" /></Form.Item>
                  <Form.Item name="mchId" label="商户号"><Input placeholder="请输入商户号" /></Form.Item>
                  <Form.Item name="appId" label="AppID"><Input placeholder="请输入 AppID" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="settleAccount" label="结算账户"><Input placeholder="例如：招商银行 6222 **** 8888" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle.includes('回调') ? (
              <BusinessEditorSection icon={<PayCircleOutlined />} title="回调对象" desc="登记支付或退款回调的关键业务编号。">
                <div className="merchant-editor-fields">
                  <Form.Item name="callbackType" label="回调类型"><Select options={callbackTypeOptions} placeholder="请选择回调类型" /></Form.Item>
                  <Form.Item name="requestId" label="请求编号"><Input placeholder="例如：REQ-20260510-001" /></Form.Item>
                  <Form.Item name="paymentNo" label="支付单号"><Input placeholder="请输入支付单号" /></Form.Item>
                  <Form.Item name="payOrderNo" label="支付单号"><Input placeholder="退款回调对应支付单号" /></Form.Item>
                  <Form.Item name="refundNo" label="退款单号"><Input placeholder="退款回调时填写" /></Form.Item>
                  <Form.Item name="channelRefundNo" label="渠道退款流水"><Input placeholder="退款回调时填写" /></Form.Item>
                  <Form.Item name="refundAmount" label="退款金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle.includes('对账') ? (
              <BusinessEditorSection icon={<DiffOutlined />} title="对账差异" desc="维护对账金额、差异金额和处理原因。">
                <div className="merchant-editor-fields">
                  <Form.Item name="reconNo" label="对账单号"><Input placeholder="例如：RECON-20260510-001" /></Form.Item>
                  <Form.Item name="channelCode" label="渠道编码"><Input placeholder="例如：WX_PAY" /></Form.Item>
                  <Form.Item name="billDate" label="账单日期"><DateField /></Form.Item>
                  <Form.Item name="platformAmount" label="平台金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="channelAmount" label="渠道金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="diffAmount" label="差异金额"><InputNumber precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="reconcileReason" label="处理原因"><Select options={reconcileReasonOptions} placeholder="请选择处理原因" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            <BusinessEditorSection icon={<SafetyOutlined />} title="处理状态" desc="选择处理状态和处理人，系统生成回调报文摘要或对账处理说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
                <Form.Item name="owner" label="处理人"><Input placeholder="例如：支付运营-王敏" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default PaymentOpsManagement;
