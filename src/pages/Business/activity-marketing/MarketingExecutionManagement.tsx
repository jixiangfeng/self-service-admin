import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { FundProjectionScreenOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  activityRewardStatusOptions,
  activityStatusOptions,
  couponTypeOptions,
  rewardTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface ParticipationRecord {
  id: string;
  activityCode: string;
  activityName: string;
  userName: string;
  joinScene: string;
  qualifyStatus: string;
  relatedOrderNo: string;
  joinedAt: string;
}

interface RewardRecord {
  id: string;
  rewardNo: string;
  activityCode: string;
  userName: string;
  rewardType: string;
  rewardValue: string;
  costAmount: number;
  status: string;
  issuedAt: string;
}

interface BudgetRecord {
  id: string;
  activityCode: string;
  budgetName: string;
  totalAmount: number;
  usedAmount: number;
  frozenAmount: number;
  bearer: string;
  status: string;
}

interface CouponIssueRecord {
  id: string;
  issueNo: string;
  templateName: string;
  couponType: string;
  userName: string;
  sourceActivity: string;
  status: string;
  issuedAt: string;
}

interface CouponUsageRecord {
  id: string;
  couponNo: string;
  templateName: string;
  userName: string;
  serviceOrderNo: string;
  writeOffStore: string;
  status: string;
  usedAt: string;
}

const activityStatusMap = buildValueEnum(activityStatusOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);

const participationRecords: ParticipationRecord[] = [
  { id: 'p1', activityCode: 'INV-001', activityName: '邀请好友首充得奖励', userName: '张晨', joinScene: '邀请注册', qualifyStatus: 'RUNNING', relatedOrderNo: 'RO202604180009', joinedAt: '2026-04-18 09:20:00' },
  { id: 'p2', activityCode: 'RCG-006', activityName: '夜洗充值返利', userName: '李波', joinScene: '充值下单', qualifyStatus: 'ENDED', relatedOrderNo: 'RO202604170006', joinedAt: '2026-04-17 22:10:00' },
];

const rewardRecords: RewardRecord[] = [
  { id: 'r1', rewardNo: 'RWD202604180001', activityCode: 'INV-001', userName: '张晨', rewardType: 'BALANCE', rewardValue: '10 元余额', costAmount: 10, status: 'PENDING', issuedAt: '-' },
  { id: 'r2', rewardNo: 'RWD202604170006', activityCode: 'RCG-006', userName: '李波', rewardType: 'COUPON', rewardValue: '夜洗 5 元券', costAmount: 5, status: 'ISSUED', issuedAt: '2026-04-17 22:12:00' },
];

const budgets: BudgetRecord[] = [
  { id: 'b1', activityCode: 'INV-001', budgetName: '邀请奖励预算', totalAmount: 20000, usedAmount: 4680, frozenAmount: 320, bearer: '平台承担', status: 'RUNNING' },
  { id: 'b2', activityCode: 'RCG-006', budgetName: '夜洗返利预算', totalAmount: 12000, usedAmount: 8100, frozenAmount: 600, bearer: '门店承担', status: 'RUNNING' },
];

const couponIssues: CouponIssueRecord[] = [
  { id: 'ci1', issueNo: 'CPI202604180001', templateName: '夜洗 5 元券', couponType: 'DIRECT', userName: '李波', sourceActivity: 'RCG-006', status: 'SUCCESS', issuedAt: '2026-04-17 22:12:00' },
  { id: 'ci2', issueNo: 'CPI202604180002', templateName: '首单满减券', couponType: 'FULL_REDUCTION', userName: '陈越', sourceActivity: 'INV-001', status: 'PENDING', issuedAt: '-' },
];

const couponUsages: CouponUsageRecord[] = [
  { id: 'cu1', couponNo: 'CP202604170001', templateName: '夜洗 5 元券', userName: '李波', serviceOrderNo: 'SO202604180019', writeOffStore: '虹桥旗舰洗车站', status: 'SUCCESS', usedAt: '2026-04-18 09:30:00' },
  { id: 'cu2', couponNo: 'CP202604170002', templateName: '首单满减券', userName: '陈越', serviceOrderNo: '-', writeOffStore: '-', status: 'PENDING', usedAt: '-' },
];

const MarketingExecutionManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ParticipationRecord | RewardRecord | BudgetRecord | CouponIssueRecord | CouponUsageRecord | null>(null);
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

  const participationColumns = useMemo<ProColumns<ParticipationRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '活动名称', dataIndex: 'activityName', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '参与场景', dataIndex: 'joinScene', width: 130 },
    { title: '达标状态', dataIndex: 'qualifyStatus', width: 120, render: (_, record) => renderStatusTag(record.qualifyStatus, activityStatusMap) },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 170 },
    { title: '参与时间', dataIndex: 'joinedAt', width: 180, render: (_, record) => formatDateTime(record.joinedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const rewardColumns = useMemo<ProColumns<RewardRecord>[]>(() => [
    { title: '奖励单号', dataIndex: 'rewardNo', width: 180 },
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '奖励类型', dataIndex: 'rewardType', width: 120, render: (_, record) => renderStatusTag(record.rewardType, rewardTypeMap) },
    { title: '奖励内容', dataIndex: 'rewardValue', width: 160 },
    { title: '成本金额', dataIndex: 'costAmount', width: 120, render: (_, record) => formatAmount(record.costAmount) },
    { title: '发放状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, rewardStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
  ], []);

  const budgetColumns = useMemo<ProColumns<BudgetRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '预算名称', dataIndex: 'budgetName', width: 180 },
    { title: '总预算', dataIndex: 'totalAmount', width: 120, render: (_, record) => formatAmount(record.totalAmount) },
    { title: '已用预算', dataIndex: 'usedAmount', width: 120, render: (_, record) => formatAmount(record.usedAmount) },
    { title: '冻结金额', dataIndex: 'frozenAmount', width: 120, render: (_, record) => formatAmount(record.frozenAmount) },
    { title: '承担方', dataIndex: 'bearer', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, activityStatusMap) },
  ], []);

  const issueColumns = useMemo<ProColumns<CouponIssueRecord>[]>(() => [
    { title: '发放流水', dataIndex: 'issueNo', width: 180 },
    { title: '券模板', dataIndex: 'templateName', width: 160 },
    { title: '券类型', dataIndex: 'couponType', width: 130, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源活动', dataIndex: 'sourceActivity', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
  ], []);

  const usageColumns = useMemo<ProColumns<CouponUsageRecord>[]>(() => [
    { title: '券码', dataIndex: 'couponNo', width: 160 },
    { title: '券模板', dataIndex: 'templateName', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '核销门店', dataIndex: 'writeOffStore', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="营销执行台" subtitle="维护活动参与、奖励发放、预算消耗、券发放和券使用流水。" icon={<FundProjectionScreenOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="参与记录" value={participationRecords.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待发奖励" value={rewardRecords.filter((item) => item.status === 'PENDING').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="已用预算" value={formatAmount(budgets.reduce((sum, item) => sum + item.usedAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="券发放流水" value={couponIssues.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="券核销流水" value={couponUsages.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入活动、用户、订单、奖励、券码关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'participation', label: '参与记录', children: <ProTable<ParticipationRecord> cardBordered rowKey="id" columns={participationColumns} dataSource={filter(participationRecords) as ParticipationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'reward', label: '奖励发放', children: <ProTable<RewardRecord> cardBordered rowKey="id" columns={rewardColumns} dataSource={filter(rewardRecords) as RewardRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="issue" type="primary" onClick={() => openModal('补发活动奖励')}>补发奖励</Button>]} /> },
          { key: 'budget', label: '预算消耗', children: <ProTable<BudgetRecord> cardBordered rowKey="id" columns={budgetColumns} dataSource={filter(budgets) as BudgetRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="adjust" type="primary" onClick={() => openModal('调整活动预算')}>调整预算</Button>]} /> },
          { key: 'couponIssue', label: '券发放流水', children: <ProTable<CouponIssueRecord> cardBordered rowKey="id" columns={issueColumns} dataSource={filter(couponIssues) as CouponIssueRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重试发券')}>重试发券</Button>]} /> },
          { key: 'couponUsage', label: '券使用流水', children: <ProTable<CouponUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={filter(couponUsages) as CouponUsageRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
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
          message.success('营销执行操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="活动编码 / 奖励单号 / 券码" rules={[{ required: true, message: '请输入业务编码' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={activityRewardStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MarketingExecutionManagement;
