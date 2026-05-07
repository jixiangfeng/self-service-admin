import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { PayCircleOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  payModeOptions,
  publishStatusOptions,
  reconciliationStatusOptions,
  refundStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface PaymentOrderRecord {
  id: string;
  payOrderNo: string;
  serviceOrderNo: string;
  payMode: string;
  payAmount: number;
  channelTradeNo: string;
  status: string;
  paidAt: string;
}

interface PayChannelRecord {
  id: string;
  channelCode: string;
  channelName: string;
  mchId: string;
  appId: string;
  settleAccount: string;
  status: string;
  updatedAt: string;
}

interface CallbackRecord {
  id: string;
  callbackNo: string;
  payOrderNo: string;
  channelTradeNo: string;
  notifyType: string;
  handleResult: string;
  retryCount: number;
  receivedAt: string;
}

interface RefundCallbackRecord {
  id: string;
  refundNo: string;
  payOrderNo: string;
  refundAmount: number;
  channelRefundNo: string;
  status: string;
  callbackAt: string;
}

interface ReconciliationRecord {
  id: string;
  reconNo: string;
  channelCode: string;
  billDate: string;
  platformAmount: number;
  channelAmount: number;
  diffAmount: number;
  status: string;
}

const payModeMap = buildValueEnum(payModeOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const refundStatusMap = buildValueEnum(refundStatusOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);

const paymentOrders: PaymentOrderRecord[] = [
  { id: 'po1', payOrderNo: 'PAY202604180019', serviceOrderNo: 'SO202604180019', payMode: 'WX', payAmount: 39.9, channelTradeNo: '4200002188202604180019', status: 'APPROVED', paidAt: '2026-04-18 09:14:12' },
  { id: 'po2', payOrderNo: 'PAY202604180020', serviceOrderNo: 'SO202604180020', payMode: 'MIXED', payAmount: 59.9, channelTradeNo: '4200002188202604180020', status: 'PENDING', paidAt: '2026-04-18 09:25:00' },
];

const payChannels: PayChannelRecord[] = [
  { id: 'ch1', channelCode: 'WX_MINI', channelName: '微信小程序支付', mchId: '1900000109', appId: 'wx9a000000000001', settleAccount: '平台微信商户', status: 'PUBLISHED', updatedAt: '2026-04-18 09:12:00' },
  { id: 'ch2', channelCode: 'BALANCE', channelName: '余额支付', mchId: '-', appId: '-', settleAccount: '用户余额账户', status: 'PUBLISHED', updatedAt: '2026-04-17 15:00:00' },
];

const callbacks: CallbackRecord[] = [
  { id: 'cb1', callbackNo: 'CB202604180001', payOrderNo: 'PAY202604180019', channelTradeNo: '4200002188202604180019', notifyType: '支付成功', handleResult: 'APPROVED', retryCount: 0, receivedAt: '2026-04-18 09:14:20' },
  { id: 'cb2', callbackNo: 'CB202604180002', payOrderNo: 'PAY202604180020', channelTradeNo: '4200002188202604180020', notifyType: '支付成功', handleResult: 'PENDING', retryCount: 2, receivedAt: '2026-04-18 09:26:05' },
];

const refundCallbacks: RefundCallbackRecord[] = [
  { id: 'rf1', refundNo: 'RF202604180006', payOrderNo: 'PAY202604170113', refundAmount: 29.9, channelRefundNo: '5030002188202604180006', status: 'SUCCESS', callbackAt: '2026-04-18 10:10:00' },
  { id: 'rf2', refundNo: 'RF202604180007', payOrderNo: 'PAY202604180019', refundAmount: 10, channelRefundNo: '5030002188202604180007', status: 'PROCESSING', callbackAt: '2026-04-18 10:18:00' },
];

const reconciliations: ReconciliationRecord[] = [
  { id: 'rc1', reconNo: 'REC20260418WX', channelCode: 'WX_MINI', billDate: '2026-04-18', platformAmount: 18560.5, channelAmount: 18560.5, diffAmount: 0, status: 'MATCHED' },
  { id: 'rc2', reconNo: 'REC20260417WX', channelCode: 'WX_MINI', billDate: '2026-04-17', platformAmount: 22018.8, channelAmount: 22008.8, diffAmount: 10, status: 'DIFF' },
];

const PaymentOpsManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<PaymentOrderRecord | PayChannelRecord | CallbackRecord | RefundCallbackRecord | ReconciliationRecord | null>(null);
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

  const paymentColumns = useMemo<ProColumns<PaymentOrderRecord>[]>(() => [
    { title: '支付单号', dataIndex: 'payOrderNo', width: 180 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '支付方式', dataIndex: 'payMode', width: 120, render: (_, record) => renderStatusTag(record.payMode, payModeMap) },
    { title: '支付金额', dataIndex: 'payAmount', width: 120, render: (_, record) => formatAmount(record.payAmount) },
    { title: '渠道流水', dataIndex: 'channelTradeNo', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const channelColumns = useMemo<ProColumns<PayChannelRecord>[]>(() => [
    { title: '渠道编码', dataIndex: 'channelCode', width: 140 },
    { title: '渠道名称', dataIndex: 'channelName', width: 180 },
    { title: '商户号', dataIndex: 'mchId', width: 150 },
    { title: 'AppID', dataIndex: 'appId', width: 180 },
    { title: '结算账户', dataIndex: 'settleAccount', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const callbackColumns = useMemo<ProColumns<CallbackRecord>[]>(() => [
    { title: '回调编号', dataIndex: 'callbackNo', width: 180 },
    { title: '支付单号', dataIndex: 'payOrderNo', width: 180 },
    { title: '渠道流水', dataIndex: 'channelTradeNo', width: 220 },
    { title: '通知类型', dataIndex: 'notifyType', width: 120 },
    { title: '处理结果', dataIndex: 'handleResult', width: 120, render: (_, record) => renderStatusTag(record.handleResult, auditStatusMap) },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '接收时间', dataIndex: 'receivedAt', width: 180, render: (_, record) => formatDateTime(record.receivedAt) },
  ], []);

  const refundColumns = useMemo<ProColumns<RefundCallbackRecord>[]>(() => [
    { title: '退款单号', dataIndex: 'refundNo', width: 180 },
    { title: '支付单号', dataIndex: 'payOrderNo', width: 180 },
    { title: '退款金额', dataIndex: 'refundAmount', width: 120, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '渠道退款流水', dataIndex: 'channelRefundNo', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, refundStatusMap) },
    { title: '回调时间', dataIndex: 'callbackAt', width: 180, render: (_, record) => formatDateTime(record.callbackAt) },
  ], []);

  const reconColumns = useMemo<ProColumns<ReconciliationRecord>[]>(() => [
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
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="支付单" value={paymentOrders.length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="支付渠道" value={payChannels.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待处理回调" value={callbacks.filter((item) => item.handleResult === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="退款回调" value={refundCallbacks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="差异对账" value={reconciliations.filter((item) => item.status === 'DIFF').length} suffix="单" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入支付单、订单号、渠道流水、对账单号' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'payment', label: '支付单', children: <ProTable<PaymentOrderRecord> cardBordered rowKey="id" columns={paymentColumns} dataSource={filter(paymentOrders) as PaymentOrderRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('同步支付状态')}>同步支付状态</Button>]} /> },
          { key: 'channel', label: '支付渠道', children: <ProTable<PayChannelRecord> cardBordered rowKey="id" columns={channelColumns} dataSource={filter(payChannels) as PayChannelRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建支付渠道')}>新建渠道</Button>]} /> },
          { key: 'callback', label: '支付回调', children: <ProTable<CallbackRecord> cardBordered rowKey="id" columns={callbackColumns} dataSource={filter(callbacks) as CallbackRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重放支付回调')}>重放回调</Button>]} /> },
          { key: 'refund', label: '退款回调', children: <ProTable<RefundCallbackRecord> cardBordered rowKey="id" columns={refundColumns} dataSource={filter(refundCallbacks) as RefundCallbackRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('同步退款结果')}>同步退款</Button>]} /> },
          { key: 'recon', label: '渠道对账', children: <ProTable<ReconciliationRecord> cardBordered rowKey="id" columns={reconColumns} dataSource={filter(reconciliations) as ReconciliationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理对账差异')}>处理差异</Button>]} /> },
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
          message.success('支付运维操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="业务单号 / 渠道编码" rules={[{ required: true, message: '请输入业务单号或渠道编码' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentOpsManagement;
