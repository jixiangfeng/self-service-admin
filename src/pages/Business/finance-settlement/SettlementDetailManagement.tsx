import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  payoutStatusOptions,
  reconciliationStatusOptions,
  settlementDetailTypeOptions,
  settlementStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type PaymentReconciliationRecord,
  type SettlementBillDetailRecord,
  type SettlementConfirmRecord,
  type SettlementCostDetailRecord,
  type SettlementPayoutRecord,
} from '@/services/backendService';

interface BillDetailRecord extends SettlementBillDetailRecord {
  id: number;
  billNo: string;
  serviceOrderNo: string;
  detailType: string;
  amount: number;
  merchantName: string;
  storeName: string;
  occurredAt: string;
}

interface CostDetailRecord extends SettlementCostDetailRecord {
  id: number;
  billNo: string;
  costType: string;
  costName: string;
  costAmount: number;
  bearer: string;
  relatedNo: string;
  createdAt: string;
}

const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const payoutStatusMap = buildValueEnum(payoutStatusOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);
const settlementStatusMap = buildValueEnum(settlementStatusOptions);

const settlementDetailFields: Record<'bill' | 'cost' | 'payout' | 'reconciliation' | 'confirm', DetailField<any>[]> = {
  bill: [
    { name: 'billNo', label: '结算单号' },
    { name: 'serviceOrderNo', label: '业务单号' },
    { name: 'detailType', label: '明细类型' },
    { name: 'amount', label: '金额', render: (value) => formatAmount(value) },
    { name: 'merchantName', label: '商户' },
    { name: 'storeName', label: '门店' },
    { name: 'occurredAt', label: '发生时间', render: (value) => formatDateTime(value) },
  ],
  cost: [
    { name: 'billNo', label: '结算单号' },
    { name: 'costType', label: '成本类型' },
    { name: 'costName', label: '成本名称' },
    { name: 'costAmount', label: '成本金额', render: (value) => formatAmount(value) },
    { name: 'bearer', label: '承担方' },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  payout: [
    { name: 'payoutNo', label: '打款流水' },
    { name: 'billNo', label: '结算单号' },
    { name: 'accountName', label: '户名' },
    { name: 'bankName', label: '开户行' },
    { name: 'bankAccount', label: '银行账号' },
    { name: 'payoutAmount', label: '打款金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'failureReason', label: '失败原因' },
    { name: 'paidAt', label: '打款时间', render: (value) => formatDateTime(value) },
  ],
  reconciliation: [
    { name: 'reconNo', label: '对账单号' },
    { name: 'channelCode', label: '渠道编码' },
    { name: 'billDate', label: '账期日期' },
    { name: 'platformAmount', label: '平台金额', render: (value) => formatAmount(value) },
    { name: 'channelAmount', label: '渠道金额', render: (value) => formatAmount(value) },
    { name: 'diffAmount', label: '差异金额', render: (value) => formatAmount(value) },
    { name: 'handleRemark', label: '处理说明' },
    { name: 'status', label: '状态' },
    { name: 'handledAt', label: '处理时间', render: (value) => formatDateTime(value) },
  ],
  confirm: [
    { name: 'billNo', label: '结算单号' },
    { name: 'subjectName', label: '结算主体' },
    { name: 'confirmer', label: '确认人' },
    { name: 'confirmStatus', label: '确认状态' },
    { name: 'confirmNote', label: '确认备注' },
    { name: 'confirmedAt', label: '确认时间', render: (value) => formatDateTime(value) },
  ],
};

const SettlementDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BillDetailRecord | CostDetailRecord | SettlementPayoutRecord | PaymentReconciliationRecord | SettlementConfirmRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ billNo: string; status: string; remark: string }>();

  const billDetailQuery = useQuery({
    queryKey: ['settlementBillDetailsCenter', keyword],
    queryFn: async () => (await api.settlementBillDetail.page({ pageNum: 1, pageSize: 200, billNo: keyword || undefined })).data,
  });
  const costDetailQuery = useQuery({
    queryKey: ['settlementCostDetailsCenter', keyword],
    queryFn: async () => (await api.settlementCostDetail.page({ pageNum: 1, pageSize: 200, billNo: keyword || undefined })).data,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['settlementReconciliationsCenter', keyword],
    queryFn: async () => (await api.payment.reconciliations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const payoutQuery = useQuery({
    queryKey: ['settlementPayoutsCenter', keyword],
    queryFn: async () => (await api.settlementPayout.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const confirmQuery = useQuery({
    queryKey: ['settlementConfirmsCenter', keyword],
    queryFn: async () => (await api.settlementConfirm.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const createCostMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementCostDetail.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementCostDetailsCenter'] });
      message.success('成本明细已保存');
    },
  });
  const retryPayoutMutation = useMutation({
    mutationFn: (record: SettlementPayoutRecord) => api.settlementPayout.updateStatus(record.id, { status: 'PAYING', failureReason: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementPayoutsCenter'] });
      message.success('已发起重试打款');
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settlementConfirm.add({ ...values, confirmStatus: 'SETTLED', confirmer: values.confirmer || '财务管理员' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementConfirmsCenter'] });
      message.success('结算确认记录已保存');
    },
  });
  const handleReconciliationMutation = useMutation({
    mutationFn: (record: PaymentReconciliationRecord) => api.payment.reconciliations.updateStatus(record.id, { status: 'HANDLED', handleRemark: '财务结算中心已处理差异' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementReconciliationsCenter'] });
      message.success('对账差异已处理');
    },
  });

  const billDetails = (billDetailQuery.data?.records || []) as BillDetailRecord[];
  const costDetails = (costDetailQuery.data?.records || []) as CostDetailRecord[];
  const reconciliations = reconciliationQuery.data?.records || [];
  const payouts = (payoutQuery.data?.records || []) as SettlementPayoutRecord[];
  const confirms = (confirmQuery.data?.records || []) as SettlementConfirmRecord[];

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const billDetailColumns = useMemo<ProColumns<BillDetailRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '业务单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '明细类型', dataIndex: 'detailType', width: 140, render: (_, record) => renderStatusTag(record.detailType, detailTypeMap) },
    { title: '金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '商户', dataIndex: 'merchantName', width: 160 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '发生时间', dataIndex: 'occurredAt', width: 180, render: (_, record) => formatDateTime(record.occurredAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const costColumns = useMemo<ProColumns<CostDetailRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '成本类型', dataIndex: 'costType', width: 140, render: (_, record) => renderStatusTag(record.costType, detailTypeMap) },
    { title: '成本名称', dataIndex: 'costName', width: 160 },
    { title: '成本金额', dataIndex: 'costAmount', width: 120, render: (_, record) => formatAmount(record.costAmount) },
    { title: '承担方', dataIndex: 'bearer', width: 120 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const payoutColumns = useMemo<ProColumns<SettlementPayoutRecord>[]>(() => [
    { title: '打款流水', dataIndex: 'payoutNo', width: 180 },
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '户名', dataIndex: 'accountName', width: 220 },
    { title: '开户行', dataIndex: 'bankName', width: 200 },
    { title: '打款金额', dataIndex: 'payoutAmount', width: 120, render: (_, record) => formatAmount(record.payoutAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, payoutStatusMap) },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" loading={retryPayoutMutation.isPending} onClick={() => retryPayoutMutation.mutate(record)}>重试</Button>
      </Space>
    ) },
  ], []);

  const reconciliationColumns = useMemo<ProColumns<PaymentReconciliationRecord>[]>(() => [
    { title: '对账单号', dataIndex: 'reconNo', width: 180 },
    { title: '渠道编码', dataIndex: 'channelCode', width: 140 },
    { title: '账期日期', dataIndex: 'billDate', width: 140 },
    { title: '平台金额', dataIndex: 'platformAmount', width: 120, render: (_, record) => formatAmount(record.platformAmount || 0) },
    { title: '渠道金额', dataIndex: 'channelAmount', width: 120, render: (_, record) => formatAmount(record.channelAmount || 0) },
    { title: '差异金额', dataIndex: 'diffAmount', width: 120, render: (_, record) => formatAmount(record.diffAmount || 0) },
    { title: '处理说明', dataIndex: 'handleRemark', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, reconciliationStatusMap) },
    { title: '处理时间', dataIndex: 'handledAt', width: 180, render: (_, record) => formatDateTime(record.handledAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" loading={handleReconciliationMutation.isPending} onClick={() => handleReconciliationMutation.mutate(record)}>处理</Button>
      </Space>
    ) },
  ], [handleReconciliationMutation]);

  const confirmColumns = useMemo<ProColumns<SettlementConfirmRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '结算主体', dataIndex: 'subjectName', width: 180 },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认状态', dataIndex: 'confirmStatus', width: 130, render: (_, record) => renderStatusTag(record.confirmStatus, settlementStatusMap) },
    { title: '确认备注', dataIndex: 'confirmNote', width: 260 },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="结算明细中心" subtitle="维护结算账单明细、成本明细、打款流水、结算对账和确认记录。" icon={<FileSearchOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="账单明细" value={billDetails.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="成本金额" value={formatAmount(costDetails.reduce((sum, item) => sum + Number(item.costAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待打款" value={payouts.filter((item) => item.status !== 'PAID').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="对账差异" value={reconciliations.filter((item) => item.status === 'DIFF').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待确认" value={confirms.filter((item) => item.confirmStatus === 'WAIT_CONFIRM').length} suffix="单" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入结算单、订单、商户、门店、打款流水、对账单号' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'billDetail', label: '账单明细', children: <ProTable<BillDetailRecord> cardBordered rowKey="id" columns={billDetailColumns} dataSource={filter(billDetails) as BillDetailRecord[]} loading={billDetailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'cost', label: '成本明细', children: <ProTable<CostDetailRecord> cardBordered rowKey="id" columns={costColumns} dataSource={filter(costDetails) as CostDetailRecord[]} loading={costDetailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="adjust" type="primary" onClick={() => openModal('新增成本调整')}>成本调整</Button>]} /> },
          { key: 'payout', label: '打款流水', children: <ProTable<SettlementPayoutRecord> cardBordered rowKey="id" columns={payoutColumns} dataSource={filter(payouts) as SettlementPayoutRecord[]} loading={payoutQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="retry" type="primary" disabled={!payouts.length} loading={retryPayoutMutation.isPending} onClick={() => payouts[0] && retryPayoutMutation.mutate(payouts[0])}>重试打款</Button>]} /> },
          { key: 'reconciliation', label: '结算对账', children: <ProTable<PaymentReconciliationRecord> cardBordered rowKey="id" columns={reconciliationColumns} dataSource={filter(reconciliations) as PaymentReconciliationRecord[]} loading={reconciliationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="handle" type="primary" disabled={!reconciliations.some((item) => item.status === 'DIFF')} loading={handleReconciliationMutation.isPending} onClick={() => reconciliations.find((item) => item.status === 'DIFF') && handleReconciliationMutation.mutate(reconciliations.find((item) => item.status === 'DIFF') as PaymentReconciliationRecord)}>处理差异</Button>]} /> },
          { key: 'confirm', label: '确认记录', children: <ProTable<SettlementConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as SettlementConfirmRecord[]} loading={confirmQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openModal('确认结算')}>确认结算</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('costType' in detail ? settlementDetailFields.cost : 'payoutNo' in detail ? settlementDetailFields.payout : 'reconNo' in detail ? settlementDetailFields.reconciliation : 'confirmStatus' in detail ? settlementDetailFields.confirm : settlementDetailFields.bill) as DetailField<Record<string, any>>[]}
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
          if (modalTitle === '确认结算') {
            await confirmMutation.mutateAsync({ billNo: values.billNo, subjectName: values.remark || '-', confirmNote: values.remark });
          } else {
            await createCostMutation.mutateAsync({ ...values, costAmount: 0, costType: values.status || 'MANUAL_ADJUST', costName: values.remark || '成本调整', bearer: '-', relatedNo: values.billNo });
          }
          setModalVisible(false);
        }}
        confirmLoading={createCostMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="billNo" label="结算单号 / 业务单号" rules={[{ required: true, message: '请输入结算单号或业务单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={settlementStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SettlementDetailManagement;
