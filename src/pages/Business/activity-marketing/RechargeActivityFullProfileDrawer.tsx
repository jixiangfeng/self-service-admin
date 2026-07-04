import React from 'react';
import { Descriptions, Drawer, Empty, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  MarketingBudgetRecord,
  MarketingParticipationRecord,
  MarketingRewardRecord,
  RechargeActivityFullProfileRecord,
  RechargeOrderRecord,
  RechargeRewardRecord,
} from '@/services/backendService';
import { formatAmount, formatClearingRuleText, formatDateTime, formatEnumText } from '@/pages/Business/shared';

interface Props {
  open: boolean;
  loading?: boolean;
  profile?: RechargeActivityFullProfileRecord;
  formatScope?: (activity: RechargeActivityFullProfileRecord['activity']) => React.ReactNode;
  formatScopeObjects?: (activity: RechargeActivityFullProfileRecord['activity']) => React.ReactNode;
  onClose: () => void;
}

const RechargeActivityFullProfileDrawer: React.FC<Props> = ({ open, loading, profile, formatScope, formatScopeObjects, onClose }) => {
  const activity = profile?.activity;
  const risks = [
    activity?.status !== 'RUNNING' ? '活动未运行，用户端不会正常参与' : null,
    !activity?.tierAmounts ? '未配置充值档位' : null,
    !activity?.rewardType ? '未配置奖励类型' : null,
    activity?.rewardType === 'SERVICE_CARD' && !activity?.serviceCardId ? '服务卡奖励未选择卡产品' : null,
    (profile?.failedRewardCount || 0) > 0 ? `存在 ${profile?.failedRewardCount} 条奖励失败` : null,
  ].filter(Boolean) as string[];

  const orderColumns: ColumnsType<RechargeOrderRecord> = [
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value) => value || '-' },
    { title: '实付', dataIndex: 'payAmount', width: 100, render: formatAmount },
    { title: '赠送', dataIndex: 'giftAmount', width: 100, render: formatAmount },
    { title: '支付方式', dataIndex: 'payMode', width: 120, render: (value) => formatEnumText(value, 'payMode', '支付方式') },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'rechargeOrderStatus', '充值状态') },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const rechargeRewardColumns: ColumnsType<RechargeRewardRecord> = [
    { title: '奖励编号', dataIndex: 'rewardNo', width: 180 },
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '奖励类型', dataIndex: 'rewardType', width: 120, render: (value) => formatEnumText(value, 'rewardType', '奖励类型') },
    { title: '奖励金额', dataIndex: 'rewardAmount', width: 120, render: formatAmount },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'rewardStatus', '奖励状态') },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (value) => formatDateTime(value) },
    { title: '失败原因', dataIndex: 'failReason', width: 220, render: (value) => value || '-' },
  ];

  const participationColumns: ColumnsType<MarketingParticipationRecord> = [
    { title: '活动编码', dataIndex: 'activityCode', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '参与场景', dataIndex: 'joinScene', width: 140, render: (value) => formatEnumText(value, 'joinScene', '参与场景') },
    { title: '资格状态', dataIndex: 'qualifyStatus', width: 120, render: (value) => formatEnumText(value, 'qualifyStatus', '资格状态') },
    { title: '关联单号', dataIndex: 'relatedOrderNo', width: 180, render: (value) => value || '-' },
    { title: '参与时间', dataIndex: 'joinedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const marketingRewardColumns: ColumnsType<MarketingRewardRecord> = [
    { title: '奖励编号', dataIndex: 'rewardNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '奖励类型', dataIndex: 'rewardType', width: 120, render: (value) => formatEnumText(value, 'rewardType', '奖励类型') },
    { title: '奖励内容', dataIndex: 'rewardValue', width: 180, render: (value) => value || '-' },
    { title: '成本', dataIndex: 'costAmount', width: 100, render: formatAmount },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'rewardStatus', '奖励状态') },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const budgetColumns: ColumnsType<MarketingBudgetRecord> = [
    { title: '预算名称', dataIndex: 'budgetName', width: 180 },
    { title: '预算总额', dataIndex: 'totalAmount', width: 120, render: formatAmount },
    { title: '已用', dataIndex: 'usedAmount', width: 120, render: formatAmount },
    { title: '冻结', dataIndex: 'frozenAmount', width: 120, render: formatAmount },
    { title: '承担方', dataIndex: 'bearer', width: 120, render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'activityStatus', '预算状态') },
  ];

  return (
    <Drawer title={activity ? `充值套餐完整档案 · ${activity.activityName}` : '充值套餐完整档案'} open={open} onClose={onClose} width={1180} destroyOnClose>
      {!profile || !activity ? <Empty description={loading ? '正在加载充值套餐档案...' : '暂无充值套餐档案'} /> : (
        <Tabs items={[
          { key: 'overview', label: '总览', children: (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap size="large">
                <Statistic title="充值单" value={profile.rechargeOrderCount || 0} />
                <Statistic title="已支付单" value={profile.paidOrderCount || 0} />
                <Statistic title="充值实付" value={Number(profile.paidAmountTotal || 0)} precision={2} prefix="￥" />
                <Statistic title="赠送金额" value={Number(profile.giftAmountTotal || 0)} precision={2} prefix="￥" />
                <Statistic title="奖励记录" value={profile.rewardRecordCount || 0} />
                <Statistic title="奖励失败" value={profile.failedRewardCount || 0} />
              </Space>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="活动编码">{activity.activityCode}</Descriptions.Item>
                <Descriptions.Item label="状态">{formatEnumText(activity.status, 'activityStatus', '活动状态')}</Descriptions.Item>
                <Descriptions.Item label="充值方式">{formatEnumText(activity.rechargeMode, 'rechargeMode', '充值方式')}</Descriptions.Item>
                <Descriptions.Item label="适用范围">{formatScope ? formatScope(activity) : activity.scope || formatEnumText(activity.scopeMode, 'scopeType', '适用范围')}</Descriptions.Item>
                <Descriptions.Item label="范围对象">{formatScopeObjects ? formatScopeObjects(activity) : activity.scopeIds || '-'}</Descriptions.Item>
                <Descriptions.Item label="奖励类型">{formatEnumText(activity.rewardType || 'BALANCE', 'rewardType', '奖励类型')}</Descriptions.Item>
                <Descriptions.Item label="服务卡产品">{profile.serviceCard?.cardName || activity.serviceCardId || '-'}</Descriptions.Item>
                <Descriptions.Item label="成本承担">{formatEnumText(activity.costOwner, 'costOwner', '成本承担')}</Descriptions.Item>
                <Descriptions.Item label="清分规则" span={2}>{formatClearingRuleText(activity)}</Descriptions.Item>
                <Descriptions.Item label="资金主体">{activity.fundOwnerUnitId ? `#${activity.fundOwnerUnitId}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="成本主体">{activity.promotionCostUnitId ? `#${activity.promotionCostUnitId}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="最低充值">{formatAmount(activity.minAmount)}</Descriptions.Item>
              </Descriptions>
              <Space wrap>{risks.length ? risks.map((risk) => <Tag key={risk} color="warning">{risk}</Tag>) : <Tag color="success">套餐配置与权益链路完整</Tag>}</Space>
              <Typography.Text type="secondary">聚合最近 100 条充值单、奖励记录、参与记录与营销奖励；预算最多展示最近 50 条。</Typography.Text>
            </Space>
          ) },
          { key: 'orders', label: '充值单', children: <Table rowKey="id" size="small" columns={orderColumns} dataSource={profile.rechargeOrders || []} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'rewards', label: '充值奖励', children: <Table rowKey="id" size="small" columns={rechargeRewardColumns} dataSource={profile.rechargeRewards || []} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'participations', label: '参与记录', children: <Table rowKey="id" size="small" columns={participationColumns} dataSource={profile.participations || []} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} /> },
          { key: 'marketingRewards', label: '营销奖励', children: <Table rowKey="id" size="small" columns={marketingRewardColumns} dataSource={profile.marketingRewards || []} pagination={{ pageSize: 8 }} scroll={{ x: 1100 }} /> },
          { key: 'budgets', label: '预算', children: <Table rowKey="id" size="small" columns={budgetColumns} dataSource={profile.budgets || []} pagination={{ pageSize: 8 }} scroll={{ x: 900 }} /> },
        ]} />
      )}
    </Drawer>
  );
};

export default RechargeActivityFullProfileDrawer;
