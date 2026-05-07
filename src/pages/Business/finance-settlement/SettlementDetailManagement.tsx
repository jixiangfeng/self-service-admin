import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
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
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface BillDetailRecord {
  id: string;
  billNo: string;
  serviceOrderNo: string;
  detailType: string;
  amount: number;
  merchantName: string;
  storeName: string;
  occurredAt: string;
}

interface CostDetailRecord {
  id: string;
  billNo: string;
  costType: string;
  costName: string;
  costAmount: number;
  bearer: string;
  relatedNo: string;
  createdAt: string;
}

interface PayoutRecord {
  id: string;
  payoutNo: string;
  billNo: string;
  accountName: string;
  bankName: string;
  payoutAmount: number;
  status: string;
  paidAt: string;
}

interface ReconciliationRecord {
  id: string;
  reconNo: string;
  billNo: string;
  channelName: string;
  platformAmount: number;
  channelAmount: number;
  diffAmount: number;
  status: string;
}

interface ConfirmRecord {
  id: string;
  billNo: string;
  subjectName: string;
  confirmer: string;
  confirmStatus: string;
  confirmNote: string;
  confirmedAt: string;
}

const detailTypeMap = buildValueEnum(settlementDetailTypeOptions);
const payoutStatusMap = buildValueEnum(payoutStatusOptions);
const reconciliationStatusMap = buildValueEnum(reconciliationStatusOptions);
const settlementStatusMap = buildValueEnum(settlementStatusOptions);

const billDetails: BillDetailRecord[] = [
  { id: 'bd1', billNo: 'SET202604180001', serviceOrderNo: 'SO202604180019', detailType: 'ORDER_INCOME', amount: 39.9, merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', occurredAt: '2026-04-18 09:30:00' },
  { id: 'bd2', billNo: 'SET202604180001', serviceOrderNo: 'RF202604180006', detailType: 'REFUND_DEDUCT', amount: -10, merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', occurredAt: '2026-04-18 10:10:00' },
];

const costDetails: CostDetailRecord[] = [
  { id: 'cd1', billNo: 'SET202604180001', costType: 'ACTIVITY_COST', costName: '夜洗券成本', costAmount: 5, bearer: '平台承担', relatedNo: 'CPI202604180001', createdAt: '2026-04-18 09:30:00' },
  { id: 'cd2', billNo: 'SET202604180002', costType: 'MANUAL_ADJUST', costName: '人工调账', costAmount: 12, bearer: '商户承担', relatedNo: 'ADJ202604180002', createdAt: '2026-04-18 10:02:00' },
];

const payouts: PayoutRecord[] = [
  { id: 'po1', payoutNo: 'PO202604180001', billNo: 'SET202604180001', accountName: '上海鲸洗科技有限公司', bankName: '招商银行上海分行', payoutAmount: 18560.5, status: 'PAYING', paidAt: '-' },
  { id: 'po2', payoutNo: 'PO202604170006', billNo: 'SET202604170006', accountName: '嘉定联营服务商', bankName: '建设银行嘉定支行', payoutAmount: 9200, status: 'PAID', paidAt: '2026-04-18 09:20:00' },
];

const reconciliations: ReconciliationRecord[] = [
  { id: 'rc1', reconNo: 'SRC202604180001', billNo: 'SET202604180001', channelName: '微信支付', platformAmount: 18560.5, channelAmount: 18560.5, diffAmount: 0, status: 'MATCHED' },
  { id: 'rc2', reconNo: 'SRC202604170006', billNo: 'SET202604170006', channelName: '微信支付', platformAmount: 9210, channelAmount: 9200, diffAmount: 10, status: 'DIFF' },
];

const confirms: ConfirmRecord[] = [
  { id: 'cf1', billNo: 'SET202604180001', subjectName: '鲸洗直营', confirmer: '财务-许鸣', confirmStatus: 'WAIT_CONFIRM', confirmNote: '待商户确认结算金额', confirmedAt: '-' },
  { id: 'cf2', billNo: 'SET202604170006', subjectName: '嘉定联营服务商', confirmer: '财务-许鸣', confirmStatus: 'SETTLED', confirmNote: '已确认并打款', confirmedAt: '2026-04-18 09:20:00' },
];

const SettlementDetailManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BillDetailRecord | CostDetailRecord | PayoutRecord | ReconciliationRecord | ConfirmRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ billNo: string; status: string; remark: string }>();

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
  ], []);

  const payoutColumns = useMemo<ProColumns<PayoutRecord>[]>(() => [
    { title: '打款流水', dataIndex: 'payoutNo', width: 180 },
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '户名', dataIndex: 'accountName', width: 220 },
    { title: '开户行', dataIndex: 'bankName', width: 200 },
    { title: '打款金额', dataIndex: 'payoutAmount', width: 120, render: (_, record) => formatAmount(record.payoutAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, payoutStatusMap) },
    { title: '打款时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
  ], []);

  const reconciliationColumns = useMemo<ProColumns<ReconciliationRecord>[]>(() => [
    { title: '对账单号', dataIndex: 'reconNo', width: 180 },
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '渠道', dataIndex: 'channelName', width: 120 },
    { title: '平台金额', dataIndex: 'platformAmount', width: 120, render: (_, record) => formatAmount(record.platformAmount) },
    { title: '渠道金额', dataIndex: 'channelAmount', width: 120, render: (_, record) => formatAmount(record.channelAmount) },
    { title: '差异金额', dataIndex: 'diffAmount', width: 120, render: (_, record) => formatAmount(record.diffAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, reconciliationStatusMap) },
  ], []);

  const confirmColumns = useMemo<ProColumns<ConfirmRecord>[]>(() => [
    { title: '结算单号', dataIndex: 'billNo', width: 180 },
    { title: '结算主体', dataIndex: 'subjectName', width: 180 },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认状态', dataIndex: 'confirmStatus', width: 130, render: (_, record) => renderStatusTag(record.confirmStatus, settlementStatusMap) },
    { title: '确认备注', dataIndex: 'confirmNote', width: 260 },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="结算明细中心" subtitle="维护结算账单明细、成本明细、打款流水、结算对账和确认记录。" icon={<FileSearchOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="账单明细" value={billDetails.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="成本金额" value={formatAmount(costDetails.reduce((sum, item) => sum + item.costAmount, 0))} /></Card></Col>
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
          { key: 'billDetail', label: '账单明细', children: <ProTable<BillDetailRecord> cardBordered rowKey="id" columns={billDetailColumns} dataSource={filter(billDetails) as BillDetailRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'cost', label: '成本明细', children: <ProTable<CostDetailRecord> cardBordered rowKey="id" columns={costColumns} dataSource={filter(costDetails) as CostDetailRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="adjust" type="primary" onClick={() => openModal('新增成本调整')}>成本调整</Button>]} /> },
          { key: 'payout', label: '打款流水', children: <ProTable<PayoutRecord> cardBordered rowKey="id" columns={payoutColumns} dataSource={filter(payouts) as PayoutRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重试打款')}>重试打款</Button>]} /> },
          { key: 'reconciliation', label: '结算对账', children: <ProTable<ReconciliationRecord> cardBordered rowKey="id" columns={reconciliationColumns} dataSource={filter(reconciliations) as ReconciliationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理对账差异')}>处理差异</Button>]} /> },
          { key: 'confirm', label: '确认记录', children: <ProTable<ConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as ConfirmRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openModal('确认结算单')}>确认结算</Button>]} /> },
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
          message.success('结算明细操作已记录');
        }}
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
