import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { TransactionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  balanceFlowTypeOptions,
  rechargeOrderStatusOptions,
  rewardTypeOptions,
  userLevelOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface BalanceFlowRecord {
  id: string;
  flowNo: string;
  userName: string;
  flowType: string;
  amount: number;
  beforeAmount: number;
  afterAmount: number;
  relatedNo: string;
  createdAt: string;
}

interface PointFlowRecord {
  id: string;
  flowNo: string;
  userName: string;
  scene: string;
  points: number;
  beforePoints: number;
  afterPoints: number;
  expireAt: string;
  createdAt: string;
}

interface RechargeOrderRecord {
  id: string;
  rechargeNo: string;
  userName: string;
  payOrderNo: string;
  payAmount: number;
  giftAmount: number;
  giftPoints: number;
  status: string;
  paidAt: string;
}

interface RechargeRewardRecord {
  id: string;
  rewardNo: string;
  rechargeNo: string;
  userName: string;
  rewardType: string;
  rewardValue: string;
  status: string;
  issuedAt: string;
}

interface UserTagRecord {
  id: string;
  tagCode: string;
  tagName: string;
  userName: string;
  source: string;
  status: string;
  updatedAt: string;
}

interface MemberLevelRecord {
  id: string;
  levelCode: string;
  levelName: string;
  minGrowth: number;
  discount: string;
  rights: string;
  status: string;
}

const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);
const rechargeStatusMap = buildValueEnum(rechargeOrderStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const userLevelMap = buildValueEnum(userLevelOptions);

const balanceFlows: BalanceFlowRecord[] = [
  { id: 'bf1', flowNo: 'BF202604180001', userName: '张晨', flowType: 'RECHARGE', amount: 100, beforeAmount: 20, afterAmount: 120, relatedNo: 'RO202604180009', createdAt: '2026-04-18 09:20:00' },
  { id: 'bf2', flowNo: 'BF202604180002', userName: '李波', flowType: 'CONSUME', amount: -29.9, beforeAmount: 88, afterAmount: 58.1, relatedNo: 'SO202604180019', createdAt: '2026-04-18 09:30:00' },
];

const pointFlows: PointFlowRecord[] = [
  { id: 'pf1', flowNo: 'PF202604180001', userName: '张晨', scene: '充值赠送', points: 100, beforePoints: 260, afterPoints: 360, expireAt: '2027-04-18 23:59:59', createdAt: '2026-04-18 09:20:00' },
  { id: 'pf2', flowNo: 'PF202604170006', userName: '陈越', scene: '积分兑换', points: -50, beforePoints: 180, afterPoints: 130, expireAt: '-', createdAt: '2026-04-17 21:15:00' },
];

const rechargeOrders: RechargeOrderRecord[] = [
  { id: 'ro1', rechargeNo: 'RO202604180009', userName: '张晨', payOrderNo: 'PAY202604180020', payAmount: 100, giftAmount: 10, giftPoints: 100, status: 'PAID', paidAt: '2026-04-18 09:20:00' },
  { id: 'ro2', rechargeNo: 'RO202604170006', userName: '李波', payOrderNo: 'PAY202604170006', payAmount: 50, giftAmount: 5, giftPoints: 50, status: 'REWARDED', paidAt: '2026-04-17 22:10:00' },
];

const rechargeRewards: RechargeRewardRecord[] = [
  { id: 'rr1', rewardNo: 'RR202604180001', rechargeNo: 'RO202604180009', userName: '张晨', rewardType: 'BALANCE', rewardValue: '10 元余额', status: 'PAID', issuedAt: '2026-04-18 09:20:10' },
  { id: 'rr2', rewardNo: 'RR202604170006', rechargeNo: 'RO202604170006', userName: '李波', rewardType: 'POINTS', rewardValue: '50 积分', status: 'REWARDED', issuedAt: '2026-04-17 22:10:20' },
];

const userTags: UserTagRecord[] = [
  { id: 'ut1', tagCode: 'NIGHT_USER', tagName: '夜洗用户', userName: '李波', source: '订单行为', status: 'MEMBER', updatedAt: '2026-04-18 09:30:00' },
  { id: 'ut2', tagCode: 'RISK_REFUND', tagName: '退款关注', userName: '陈越', source: '风控命中', status: 'NORMAL', updatedAt: '2026-04-17 22:30:00' },
];

const memberLevels: MemberLevelRecord[] = [
  { id: 'lv1', levelCode: 'NORMAL', levelName: '普通用户', minGrowth: 0, discount: '无折扣', rights: '基础权益', status: 'NORMAL' },
  { id: 'lv2', levelCode: 'MEMBER', levelName: '会员用户', minGrowth: 500, discount: '9.5 折', rights: '生日券 / 夜洗券', status: 'MEMBER' },
];

const AssetFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BalanceFlowRecord | PointFlowRecord | RechargeOrderRecord | RechargeRewardRecord | UserTagRecord | MemberLevelRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; type: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const balanceColumns = useMemo<ProColumns<BalanceFlowRecord>[]>(() => [
    { title: '流水号', dataIndex: 'flowNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '类型', dataIndex: 'flowType', width: 120, render: (_, record) => renderStatusTag(record.flowType, balanceFlowTypeMap) },
    { title: '变动金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '变动前', dataIndex: 'beforeAmount', width: 120, render: (_, record) => formatAmount(record.beforeAmount) },
    { title: '变动后', dataIndex: 'afterAmount', width: 120, render: (_, record) => formatAmount(record.afterAmount) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const pointColumns = useMemo<ProColumns<PointFlowRecord>[]>(() => [
    { title: '积分流水', dataIndex: 'flowNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '场景', dataIndex: 'scene', width: 130 },
    { title: '变动积分', dataIndex: 'points', width: 110 },
    { title: '变动前', dataIndex: 'beforePoints', width: 100 },
    { title: '变动后', dataIndex: 'afterPoints', width: 100 },
    { title: '过期时间', dataIndex: 'expireAt', width: 180, render: (_, record) => formatDateTime(record.expireAt) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const rechargeColumns = useMemo<ProColumns<RechargeOrderRecord>[]>(() => [
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '支付单号', dataIndex: 'payOrderNo', width: 180 },
    { title: '支付金额', dataIndex: 'payAmount', width: 120, render: (_, record) => formatAmount(record.payAmount) },
    { title: '赠送余额', dataIndex: 'giftAmount', width: 120, render: (_, record) => formatAmount(record.giftAmount) },
    { title: '赠送积分', dataIndex: 'giftPoints', width: 110 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, rechargeStatusMap) },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, render: (_, record) => formatDateTime(record.paidAt) },
  ], []);

  const rewardColumns = useMemo<ProColumns<RechargeRewardRecord>[]>(() => [
    { title: '奖励流水', dataIndex: 'rewardNo', width: 180 },
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '奖励类型', dataIndex: 'rewardType', width: 120, render: (_, record) => renderStatusTag(record.rewardType, rewardTypeMap) },
    { title: '奖励内容', dataIndex: 'rewardValue', width: 160 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, rechargeStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
  ], []);

  const tagColumns = useMemo<ProColumns<UserTagRecord>[]>(() => [
    { title: '标签编码', dataIndex: 'tagCode', width: 150 },
    { title: '标签名称', dataIndex: 'tagName', width: 150 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源', dataIndex: 'source', width: 130 },
    { title: '用户等级', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, userLevelMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const levelColumns = useMemo<ProColumns<MemberLevelRecord>[]>(() => [
    { title: '等级编码', dataIndex: 'levelCode', width: 140 },
    { title: '等级名称', dataIndex: 'levelName', width: 140 },
    { title: '成长值门槛', dataIndex: 'minGrowth', width: 120 },
    { title: '折扣', dataIndex: 'discount', width: 120 },
    { title: '权益', dataIndex: 'rights', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, userLevelMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产流水中心" subtitle="维护余额流水、积分流水、充值订单、充值奖励、用户标签和会员等级。" icon={<TransactionOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="余额流水" value={balanceFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="积分流水" value={pointFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="充值金额" value={formatAmount(rechargeOrders.reduce((sum, item) => sum + item.payAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="奖励流水" value={rechargeRewards.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="用户标签" value={userTags.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="会员等级" value={memberLevels.length} suffix="级" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入用户、流水、充值单、标签、等级关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'balance', label: '余额流水', children: <ProTable<BalanceFlowRecord> cardBordered rowKey="id" columns={balanceColumns} dataSource={filter(balanceFlows) as BalanceFlowRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} /> },
          { key: 'point', label: '积分流水', children: <ProTable<PointFlowRecord> cardBordered rowKey="id" columns={pointColumns} dataSource={filter(pointFlows) as PointFlowRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'recharge', label: '充值订单', children: <ProTable<RechargeOrderRecord> cardBordered rowKey="id" columns={rechargeColumns} dataSource={filter(rechargeOrders) as RechargeOrderRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('同步充值订单')}>同步订单</Button>]} /> },
          { key: 'reward', label: '充值奖励', children: <ProTable<RechargeRewardRecord> cardBordered rowKey="id" columns={rewardColumns} dataSource={filter(rechargeRewards) as RechargeRewardRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('补发充值奖励')}>补发奖励</Button>]} /> },
          { key: 'tag', label: '用户标签', children: <ProTable<UserTagRecord> cardBordered rowKey="id" columns={tagColumns} dataSource={filter(userTags) as UserTagRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('维护用户标签')}>维护标签</Button>]} /> },
          { key: 'level', label: '会员等级', children: <ProTable<MemberLevelRecord> cardBordered rowKey="id" columns={levelColumns} dataSource={filter(memberLevels) as MemberLevelRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建会员等级')}>新建等级</Button>]} /> },
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
          message.success('资产流水操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="用户 / 流水 / 配置编码" rules={[{ required: true, message: '请输入用户、流水或配置编码' }]}><Input /></Form.Item>
            <Form.Item name="type" label="类型"><Select options={balanceFlowTypeOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetFlowManagement;
