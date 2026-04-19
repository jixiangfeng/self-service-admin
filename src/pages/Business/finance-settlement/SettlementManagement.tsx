import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

interface SettlementRecord {
  id: string;
  billNo: string;
  billType: string;
  subjectName: string;
  cycle: string;
  incomeAmount: number;
  refundAmount: number;
  costAmount: number;
  settlementAmount: number;
  payoutStatus: string;
  status: string;
  updatedAt: string;
}

interface ProfitShareRecord {
  id: string;
  storeName: string;
  partnerName: string;
  baseAmount: number;
  ratio: string;
  actualAmount: number;
  status: string;
  updatedAt: string;
}

const settlementStatusMap = {
  PENDING: { color: 'gold', text: '待生成' },
  WAIT_CONFIRM: { color: 'processing', text: '待确认' },
  SETTLED: { color: 'success', text: '已结算' },
  REJECTED: { color: 'default', text: '已驳回' },
};

const payoutStatusMap = {
  UNPAID: { color: 'gold', text: '待打款' },
  PAYING: { color: 'processing', text: '打款中' },
  PAID: { color: 'success', text: '已打款' },
};

const initialSettlementRecords: SettlementRecord[] = [
  { id: 's1', billNo: 'SB202604W001', billType: 'MERCHANT', subjectName: '鲸洗直营运营中心', cycle: '2026-04-13 至 2026-04-19', incomeAmount: 1850, refundAmount: 120, costAmount: 80, settlementAmount: 1650, payoutStatus: 'UNPAID', status: 'WAIT_CONFIRM', updatedAt: '2026-04-18 09:00:00' },
  { id: 's2', billNo: 'SB202604W007', billType: 'STORE', subjectName: '徐汇夜洗门店', cycle: '2026-04-13 至 2026-04-19', incomeAmount: 760, refundAmount: 36, costAmount: 36, settlementAmount: 688, payoutStatus: 'UNPAID', status: 'PENDING', updatedAt: '2026-04-18 08:42:00' },
];

const profitShareRecords: ProfitShareRecord[] = [
  { id: 'p1', storeName: '虹桥旗舰洗车站', partnerName: '直营经营主体', baseAmount: 1680, ratio: '100%', actualAmount: 1680, status: 'SETTLED', updatedAt: '2026-04-17 18:00:00' },
  { id: 'p2', storeName: '嘉定联营门店', partnerName: '联营合伙人-陈禾', baseAmount: 920, ratio: '30%', actualAmount: 276, status: 'WAIT_CONFIRM', updatedAt: '2026-04-18 09:12:00' },
];

const SettlementManagement: React.FC = () => {
  const [billKeyword, setBillKeyword] = useState('');
  const [shareKeyword, setShareKeyword] = useState('');
  const [bills, setBills] = useState(initialSettlementRecords);
  const [detail, setDetail] = useState<SettlementRecord | null>(null);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [costVisible, setCostVisible] = useState(false);
  const [shareDetail, setShareDetail] = useState<ProfitShareRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [helperDesc, setHelperDesc] = useState('');
  const [costForm] = Form.useForm<{ couponCost: string; rechargeCost: string; inviteCost: string; owner: string }>();
  const [generateForm] = Form.useForm<{ billType: string; subjectName: string; cycle: string }>();

  const filteredBills = useMemo(() => bills.filter((item) => containsKeyword(billKeyword, [item.billNo, item.subjectName, item.cycle])), [billKeyword, bills]);
  const filteredShares = useMemo(() => profitShareRecords.filter((item) => containsKeyword(shareKeyword, [item.storeName, item.partnerName, item.ratio])), [shareKeyword]);

  const billColumns: ProColumns<SettlementRecord>[] = [
    { title: '结算单号', dataIndex: 'billNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '结算单号 / 主体 / 周期' } },
    { title: '结算层级', dataIndex: 'billType', width: 120, search: false, render: (_, record) => renderStatusTag(record.billType, { MERCHANT: { color: 'blue', text: '商户' }, STORE: { color: 'purple', text: '门店' }, PLATFORM: { color: 'cyan', text: '平台' } }) },
    { title: '结算主体', dataIndex: 'subjectName', width: 180, search: false },
    { title: '周期', dataIndex: 'cycle', width: 220, search: false },
    { title: '收入金额', dataIndex: 'incomeAmount', width: 120, search: false, render: (_, record) => formatAmount(record.incomeAmount) },
    { title: '退款冲减', dataIndex: 'refundAmount', width: 120, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '活动成本', dataIndex: 'costAmount', width: 120, search: false, render: (_, record) => formatAmount(record.costAmount) },
    { title: '应结金额', dataIndex: 'settlementAmount', width: 120, search: false, render: (_, record) => formatAmount(record.settlementAmount) },
    { title: '打款状态', dataIndex: 'payoutStatus', width: 120, search: false, render: (_, record) => renderStatusTag(record.payoutStatus, payoutStatusMap) },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setBills((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'SETTLED', payoutStatus: 'PAID', updatedAt: new Date().toISOString() } : item));
              message.success('结算单已确认');
            }}
          >
            确认
          </Button>
          <Button size="small" onClick={() => { setHelperTitle('导出结算单'); setHelperDesc(`已为 ${record.billNo} 创建导出任务，后续可以继续补下载队列与导出记录。`); setHelperVisible(true); }}>导出</Button>
        </Space>
      ),
    },
  ];

  const shareColumns: ProColumns<ProfitShareRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例' } },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, search: false, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '比例', dataIndex: 'ratio', width: 100, search: false },
    { title: '应分金额', dataIndex: 'actualAmount', width: 120, search: false, render: (_, record) => formatAmount(record.actualAmount) },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, settlementStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setShareDetail(record)}>明细</Button>
          <Button size="small" onClick={() => { setHelperTitle('分润调整'); setHelperDesc(`当前记录为 ${record.partnerName}，建议在分润中心补充正式调整单流程。`); setHelperVisible(true); }}>调整</Button>
        </Space>
      ),
    },
  ];

  const handleGenerate = async () => {
    const values = await generateForm.validateFields();
    setBills((prev) => [
      {
        id: `bill-${Date.now()}`,
        billNo: `SB${Date.now()}`,
        billType: values.billType,
        subjectName: values.subjectName,
        cycle: values.cycle,
        incomeAmount: 0,
        refundAmount: 0,
        costAmount: 0,
        settlementAmount: 0,
        payoutStatus: 'UNPAID',
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setGenerateVisible(false);
    generateForm.resetFields();
    message.success('结算单已生成');
  };

  const handleCostSubmit = async () => {
    await costForm.validateFields();
    setCostVisible(false);
    costForm.resetFields();
    message.success('成本分摊配置已保存');
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="结算总览" subtitle="补齐结算单、退款冲减、成本分摊、打款状态和确认动作。" icon={<AccountBookOutlined />} />
      <WorkflowGuide
        title="结算复盘闭环"
        summary="结算页要把收入归集、退款冲减、成本分摊和分润确认串起来，而不是把两个表平铺出来。"
        steps={[
          { title: '收入归集', description: '先归集服务收入、充值收入和门店维度金额', status: 'finish', tag: '结算单管理' },
          { title: '退款冲减', description: '把退款、补偿和活动成本同步冲减', status: 'process', tag: '成本分摊' },
          { title: '分润确认', description: '按门店和合伙关系确认实际分润结果', status: 'process', tag: '合伙人分润' },
          { title: '导出复盘', description: '最终输出结算单、分润明细和经营复盘数据', status: 'wait', tag: '报表 / 导出' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认结算单" value={bills.filter((item) => item.status === 'WAIT_CONFIRM').length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="本周期收入" value={formatAmount(bills.reduce((sum, item) => sum + item.incomeAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款冲减" value={formatAmount(bills.reduce((sum, item) => sum + item.refundAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="分润待确认" value={profitShareRecords.filter((item) => item.status !== 'SETTLED').length} suffix="条" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'bill',
            label: '结算单管理',
            children: (
              <ProTable<SettlementRecord>
                cardBordered
                rowKey="id"
                columns={billColumns}
                dataSource={filteredBills}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 2100 }}
                toolBarRender={() => [
                  <Button
                    key="cost"
                    onClick={() => {
                      costForm.setFieldsValue({ couponCost: '200', rechargeCost: '360', inviteCost: '120', owner: '平台承担 30%，门店承担 70%' });
                      setCostVisible(true);
                    }}
                  >
                    成本分摊配置
                  </Button>,
                  <Button key="generate" type="primary" onClick={() => setGenerateVisible(true)}>生成结算单</Button>,
                ]}
                onSubmit={(values) => setBillKeyword(String(values.keyword || ''))}
                onReset={() => setBillKeyword('')}
              />
            ),
          },
          {
            key: 'share',
            label: '合伙人分润',
            children: (
              <ProTable<ProfitShareRecord>
                cardBordered
                rowKey="id"
                columns={shareColumns}
                dataSource={filteredShares}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1440 }}
                toolBarRender={() => [
                  <Button key="partner" onClick={() => { setHelperTitle('合伙关系配置'); setHelperDesc('合伙关系维护已在「多合伙人分润」完成，这里保留跨模块快捷入口。'); setHelperVisible(true); }}>合伙关系配置</Button>,
                  <Button key="rule" type="primary" onClick={() => { setHelperTitle('分润规则'); setHelperDesc('这里作为分润规则的聚合入口，后续可拆成独立规则配置页。'); setHelperVisible(true); }}>分润规则</Button>,
                ]}
                onSubmit={(values) => setShareKeyword(String(values.keyword || ''))}
                onReset={() => setShareKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal title="结算单详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="结算单号">{detail.billNo}</Descriptions.Item>
            <Descriptions.Item label="结算主体">{detail.subjectName}</Descriptions.Item>
            <Descriptions.Item label="周期">{detail.cycle}</Descriptions.Item>
            <Descriptions.Item label="收入金额">{formatAmount(detail.incomeAmount)}</Descriptions.Item>
            <Descriptions.Item label="退款冲减">{formatAmount(detail.refundAmount)}</Descriptions.Item>
            <Descriptions.Item label="活动成本">{formatAmount(detail.costAmount)}</Descriptions.Item>
            <Descriptions.Item label="应结金额">{formatAmount(detail.settlementAmount)}</Descriptions.Item>
            <Descriptions.Item label="打款状态">{payoutStatusMap[detail.payoutStatus as keyof typeof payoutStatusMap]?.text || detail.payoutStatus}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="成本分摊配置" open={costVisible} onOk={handleCostSubmit} onCancel={() => { setCostVisible(false); costForm.resetFields(); }} width={820}>
        <Form form={costForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="couponCost" label="优惠券成本" rules={[{ required: true, message: '请输入优惠券成本' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="rechargeCost" label="充值赠送成本" rules={[{ required: true, message: '请输入充值成本' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="inviteCost" label="邀请奖励成本" rules={[{ required: true, message: '请输入邀请成本' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="承担方式" rules={[{ required: true, message: '请输入承担方式' }]}>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="分润明细" open={!!shareDetail} footer={null} onCancel={() => setShareDetail(null)} width={760}>
        {shareDetail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店">{shareDetail.storeName}</Descriptions.Item>
            <Descriptions.Item label="合伙人">{shareDetail.partnerName}</Descriptions.Item>
            <Descriptions.Item label="分润基数">{formatAmount(shareDetail.baseAmount)}</Descriptions.Item>
            <Descriptions.Item label="比例">{shareDetail.ratio}</Descriptions.Item>
            <Descriptions.Item label="应分金额">{formatAmount(shareDetail.actualAmount)}</Descriptions.Item>
            <Descriptions.Item label="状态">{settlementStatusMap[shareDetail.status as keyof typeof settlementStatusMap]?.text || shareDetail.status}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(shareDetail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="生成结算单" open={generateVisible} onOk={handleGenerate} onCancel={() => { setGenerateVisible(false); generateForm.resetFields(); }} width={820}>
        <Form form={generateForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="billType" label="结算层级" rules={[{ required: true, message: '请选择结算层级' }]}>
              <Select options={[{ value: 'MERCHANT', label: '商户' }, { value: 'STORE', label: '门店' }, { value: 'PLATFORM', label: '平台' }]} />
            </Form.Item>
            <Form.Item name="subjectName" label="结算主体" rules={[{ required: true, message: '请输入结算主体' }]}>
              <Input />
            </Form.Item>
            <Form.Item className="modal-span-2" name="cycle" label="结算周期" rules={[{ required: true, message: '请输入结算周期' }]}>
              <Input placeholder="例如 2026-04-13 至 2026-04-19" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">{helperDesc}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default SettlementManagement;
