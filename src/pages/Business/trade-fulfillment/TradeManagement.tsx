import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, List, Radio, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { ProfileOutlined, ReloadOutlined, SolutionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  orderStatusOptions,
  orderTypeOptions,
  payModeOptions as catalogPayModeOptions,
  refundStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import { buildValueEnum, containsKeyword, CoreFlowPanel, formatAmount, formatDateTime, OperatorTips, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
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

type ActionModalType = 'order' | 'refund' | null;
type TradeDetailType = Exclude<ActionModalType, null>;

const payModeOptions = catalogPayModeOptions;
const orderStatusMap = buildValueEnum(orderStatusOptions);
const refundStatusMap = buildValueEnum(refundStatusOptions);

const refundAuditStatusOptions = [
  { value: 'APPROVED', label: '审核通过' },
  { value: 'REJECTED', label: '审核拒绝' },
  { value: 'PROCESSING', label: '继续处理' },
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
const buildActionNote = (type: Exclude<ActionModalType, null>, values: Record<string, any>) => [
  `处理原因：${optionLabel(actionReasonOptions[type], values.actionReason)}`,
  `责任归属：${optionLabel(responsibilityOptions, values.responsibility)}`,
  `后续动作：${optionLabel(nextStepOptions, values.nextStep)}`,
  `通知用户：${values.notifyUser ? '已通知' : '未通知'}`,
  values.actionNote ? `补充说明：${values.actionNote}` : '',
].filter(Boolean).join('；');

const buildTradeReminderItems = (record: TradeOrderRecord | RefundRecord) => {
  if ('refundNo' in record) {
    return [
      `退款状态：${formatEnumText(record.status, 'refundStatus', '退款状态')}` ,
      `退款金额：${formatAmount(record.amount)}`,
      record.auditNote ? `审核备注：${record.auditNote}` : `关联订单：${record.orderNo}`,
    ];
  }
  return [
    `订单状态：${formatEnumText(record.status, 'orderStatus', '订单状态')}` ,
    `支付方式：${formatEnumText(record.payMode, 'payMode', '支付方式')}` ,
    record.note ? `订单备注：${record.note}` : `订单金额：${formatAmount(record.amount)}`,
  ];
};

const tradeDetailFields: Record<'order' | 'refund', DetailField<any>[]> = {
  order: [
    { name: 'orderNo', label: '订单号' },
    { name: 'orderType', label: '订单类型', render: (value) => formatEnumText(value, 'orderType', '订单类型') },
    { name: 'storeName', label: '门店' },
    { name: 'pointCode', label: '点位' },
    { name: 'serviceName', label: '服务内容' },
    { name: 'payMode', label: '支付方式', render: (value) => formatEnumText(value, 'payMode', '支付方式') },
    { name: 'amount', label: '订单金额', render: (value) => formatAmount(value) },
    { name: 'userName', label: '用户' },
    { name: 'status', label: '状态', render: (value) => formatEnumText(value, 'orderStatus', '订单状态') },
    { name: 'note', label: '备注' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  refund: [
    { name: 'refundNo', label: '退款单号' },
    { name: 'orderNo', label: '关联订单' },
    { name: 'refundType', label: '退款类型', render: (value) => formatEnumText(value, 'refundType', '退款类型') },
    { name: 'amount', label: '退款金额', render: (value) => formatAmount(value) },
    { name: 'reason', label: '退款原因' },
    { name: 'applicant', label: '申请来源' },
    { name: 'status', label: '状态', render: (value) => formatEnumText(value, 'refundStatus', '退款状态') },
    { name: 'auditNote', label: '审核备注' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
};

const TradeManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TradeOrderRecord | RefundRecord | null>(null);
  const [detailType, setDetailType] = useState<TradeDetailType | null>(null);
  const [actionModalType, setActionModalType] = useState<ActionModalType>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<Record<string, any>>();
  const [orderFilters, setOrderFilters] = useState({ keyword: '', orderType: undefined as string | undefined, payMode: undefined as string | undefined, status: undefined as string | undefined });
  const [refundFilters, setRefundFilters] = useState({ keyword: '', status: undefined as string | undefined });
  const orderQuery = useQuery({
    queryKey: ['tradeOrders', orderFilters],
    queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 200, ...orderFilters })).data,
  });
  const refundQuery = useQuery({
    queryKey: ['refundOrders', refundFilters],
    queryFn: async () => (await api.refundOrder.page({ pageNum: 1, pageSize: 200, ...refundFilters })).data,
  });
  const orders = ((orderQuery.data as any)?.records || []) as TradeOrderRecord[];
  const refunds = ((refundQuery.data as any)?.records || []) as RefundRecord[];

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => api.serviceOrder.updateStatus(Number(id), { orderStatus: status, remark: note, operatorType: 'ADMIN', operatorName: '后台操作' }),
    onSuccess: () => {
      message.success('订单状态已更新');
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

  const openDetail = (type: TradeDetailType, record: TradeOrderRecord | RefundRecord) => {
    setDetailType(type);
    setDetail(record);
  };

  const openActionModal = (type: ActionModalType, id: string, currentStatus: string, currentNote?: string) => {
    setActionModalType(type);
    setActionTargetId(id);
    if (type) {
      actionForm.setFieldsValue({ status: type === 'refund' && (currentStatus === 'SUCCESS' || currentStatus === 'REFUNDED') ? 'APPROVED' : currentStatus, actionReason: actionReasonOptions[type][0].value, responsibility: 'PLATFORM', nextStep: 'FOLLOW_UP', notifyUser: true, actionNote: currentNote || '' });
    }
  };

  const openDetailAction = () => {
    if (!detail || !detailType) return;
    if (detailType === 'refund') {
      const refund = detail as RefundRecord;
      openActionModal('refund', refund.id, refund.status, refund.auditNote);
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

    const actionType = actionModalType;
    const targetId = actionTargetId;
    const actionName = actionType === 'order' ? '订单状态处理' : '退款审核';
    showBusinessConfirm({
      title: `确认提交${actionName}`,
      content: `确定将该记录更新为「${formatEnumText(values.status, actionType === 'order' ? 'orderStatus' : 'refundStatus', '状态')}」吗？处理结果会回写到对应业务单据。`,
      okText: '确认提交',
      danger: actionType === 'refund',
      onOk: async () => {
        if (actionType === 'order') {
          await updateOrderMutation.mutateAsync({ id: targetId, status: values.status, note: buildActionNote(actionType, values) });
        }

        if (actionType === 'refund') {
          await updateRefundMutation.mutateAsync({ id: targetId, status: values.status, note: buildActionNote(actionType, values) });
        }

        closeActionModal();
      },
    });
  };

  const orderColumns: ProColumns<TradeOrderRecord>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 门店 / 服务 / 用户' } },
    { title: '订单类型', dataIndex: 'orderType', width: 130, valueType: 'select', valueEnum: buildValueEnum(orderTypeOptions), render: (_, record) => renderStatusTag(record.orderType, buildValueEnum(orderTypeOptions) as any) },
    { title: '门店', dataIndex: 'storeName', width: 160, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '服务内容', dataIndex: 'serviceName', width: 180, search: false },
    { title: '支付方式', dataIndex: 'payMode', width: 120, valueType: 'select', valueEnum: buildValueEnum(payModeOptions), render: (_, record) => renderStatusTag(record.payMode, buildValueEnum(payModeOptions) as any) },
    { title: '订单金额', dataIndex: 'amount', width: 120, search: false, render: (_, record) => formatAmount(record.amount) },
    { title: '用户', dataIndex: 'userName', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: orderStatusMap, render: (_, record) => renderStatusTag(record.status, orderStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 150,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail('order', record)}>查看</Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => openActionModal('order', record.id, record.status, record.note)}
          >
            处理
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

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="交易中心"
        subtitle="集中处理服务订单和退款审核，核销与结算通过关联入口查看。"
        icon={<ProfileOutlined />}
      />
      <WorkflowGuide
        title="订单处置闭环"
        summary="交易页从订单识别一路连接退款、核销和结算，减少重复业务单据。"
        steps={[
          { title: '订单识别', description: '扫码、选点位、套餐和混合计费统一归口', status: 'finish', tag: '服务订单' },
          { title: '支付与启动', description: '确认支付方式和设备启动结果', status: 'process', tag: '支付状态' },
          { title: '退款处理', description: '审核异常退款并记录处理结论', status: 'process', tag: '退款' },
          { title: '回看履约结果', description: '最后回到核销履约和结算复盘', status: 'wait', tag: '下一步：核销 / 结算' },
        ]}
      />
      <CoreFlowPanel
        title="订单履约与异常闭环"
        subtitle="订单中心串联下单、支付、设备启动、退款、权益扣减和结算，运营看到订单即可判断下一步动作。"
        config={[
          { label: '订单识别', desc: '商户、门店、点位、设备和服务项目是后续履约与结算的关键字段。', tag: '主线' },
          { label: '异常处理', desc: '查看订单并处理状态，写清原因、责任归属和处理结论。', tag: '处理' },
          { label: '权益联动', desc: '次卡、优惠券、余额和混合支付要在订单里保留扣减与核销痕迹。', tag: '资产' },
        ]}
        landing={[
          { label: '履约结果', desc: '服务订单记录支付状态、设备启动结果和最终订单状态。' },
          { label: '资产流水', desc: '退款、补偿和权益核销会沉淀到余额流水或券卡记录。' },
          { label: '结算明细', desc: '完成订单进入结算明细，退款和补偿会影响应结金额。' },
        ]}
        verify={[
          { label: '处置前', desc: '先核支付状态、设备状态、用户权益和订单时间线。' },
          { label: '退款前', desc: '确认退款金额、支付方式、是否已享受权益和责任归属。' },
          { label: '结案后', desc: '去资产总览和结算总览核对补偿、退款和收入冲减是否落地。' },
        ]}
        actions={[
          { key: 'asset', label: '核对用户资产', onClick: () => navigate('/asset') },
          { key: 'settlement', label: '去结算总览', type: 'primary', onClick: () => navigate('/settlement') },
        ]}
      />
      <OperatorTips
        items={[
          { label: '处理异常订单', desc: '在服务订单行内点“处理”，选择原因、责任归属和后续动作，处理备注会自动拼接。', tag: '订单' },
          { label: '审核退款', desc: '在退款中心行内点“审核”，确认金额、原因和申请来源后再提交，避免批量误审。', tag: '退款' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="服务订单" value={orders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="进行中订单" value={orders.filter((item) => item.status === 'IN_PROGRESS').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款处理中" value={refunds.filter((item) => item.status === 'PROCESSING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款总数" value={refunds.length} suffix="单" /></Card></Col>
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
                        toolBarRender={() => []}
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
                        toolBarRender={() => []}
                onSubmit={(values) => setRefundFilters({ keyword: String(values.keyword || ''), status: values.status as string | undefined })}
                onReset={() => setRefundFilters({ keyword: '', status: undefined })}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="交易处理"
        title={actionModalType === 'order' ? '订单处置' : actionModalType === 'refund' ? '退款审核' : '处理动作'}
        subtitle="更新业务状态并记录处理意见，结果会回写到对应订单或退款单。"
        meta={[actionModalType === 'order' ? '订单状态' : '退款审核', actionTargetId ? `ID ${actionTargetId}` : '待选择']}
        open={!!actionModalType}
                onOk={handleActionSubmit}
                onCancel={closeActionModal}
                confirmLoading={updateOrderMutation.isPending || updateRefundMutation.isPending}
                width={760}
              >
        <Form form={actionForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SolutionOutlined />} title="处理结果" desc="选择最终状态并沉淀可追溯的处置说明。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select
                    options={actionModalType === 'order' ? orderStatusOptions : refundAuditStatusOptions}
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
                <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="actionNote" label="补充说明"><Input placeholder="例如：退款审核通过，预计 1 个工作日原路退回" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal
        title={detailType === 'order' && detail && 'orderNo' in detail ? `订单详情 · ${String(detail.orderNo)}` : '详情查看'}
        eyebrow="交易履约详情"
        subtitle="核对订单或退款记录，并快速进入后续处理动作。"
        meta={[detailType === 'refund' ? '退款单' : '订单记录', '可处理']}
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
                fields={(detailType === 'refund' ? tradeDetailFields.refund : tradeDetailFields.order) as DetailField<Record<string, any>>[]}
                column={1}
                labelWidth={110}
              />
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="推荐动作">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button block onClick={() => navigate('/fulfillment')}>查看核销记录</Button>
                    <Button block onClick={() => {
                      if (detailType === 'refund') {
                        const refund = detail as RefundRecord;
                        openActionModal('refund', refund.id, refund.status, refund.auditNote);
                      }
                      else navigate('/trade');
                    }}>发起退款审核</Button>
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
