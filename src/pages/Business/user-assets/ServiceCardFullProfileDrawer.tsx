import React from 'react';
import { Descriptions, Drawer, Empty, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RechargeActivityRecord, ServiceCardFullProfileRecord, ServiceCardUsageRecord, UserServiceCardRecord } from '@/services/backendService';
import { formatAmount, formatDateTime, formatEnumText } from '@/pages/Business/shared';

interface Props {
  open: boolean;
  loading?: boolean;
  profile?: ServiceCardFullProfileRecord;
  onClose: () => void;
}

const ServiceCardFullProfileDrawer: React.FC<Props> = ({ open, loading, profile, onClose }) => {
  const card = profile?.card;
  const risks = [
    card?.status !== 'ENABLED' ? '卡产品未启用，不能继续售卖或发放' : null,
    Number(card?.stock || 0) <= 0 ? '库存不足' : null,
    !card?.rightsServiceTimes ? '未配置权益次数' : null,
    !card?.rightsServices ? '未配置适用权益' : null,
    (profile?.runningRechargeActivityCount || 0) > 0 ? `被 ${profile?.runningRechargeActivityCount} 个运行中充值活动引用` : null,
  ].filter(Boolean) as string[];

  const userCardColumns: ColumnsType<UserServiceCardRecord> = [
    { title: '用户卡号', dataIndex: 'cardNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value) => value || '-' },
    { title: '总次数', dataIndex: 'totalTimes', width: 90, render: (value) => value ?? 0 },
    { title: '剩余次数', dataIndex: 'remainTimes', width: 100, render: (value) => value ?? 0 },
    { title: '来源', dataIndex: 'sourceBizNo', width: 180, render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'serviceCardStatus', '状态') },
    { title: '有效期', width: 220, render: (_, record) => `${record.validFrom || '-'} ~ ${record.validTo || '-'}` },
  ];

  const usageColumns: ColumnsType<ServiceCardUsageRecord> = [
    { title: '流水号', dataIndex: 'usageNo', width: 180, render: (value) => value || '-' },
    { title: '用户卡号', dataIndex: 'cardNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120, render: (value) => value || '-' },
    { title: '服务订单', dataIndex: 'serviceOrderNo', width: 180, render: (value) => value || '-' },
    { title: '门店', dataIndex: 'storeName', width: 180, render: (value) => value || '-' },
    { title: '扣次', dataIndex: 'deductCount', width: 90, render: (_, record) => record.deductCount ?? record.useTimes ?? 0 },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const rechargeColumns: ColumnsType<RechargeActivityRecord> = [
    { title: '活动编码', dataIndex: 'activityCode', width: 170 },
    { title: '活动名称', dataIndex: 'activityName', width: 220 },
    { title: '充值方式', dataIndex: 'rechargeMode', width: 140, render: (value) => formatEnumText(value, 'rechargeMode', '充值方式') },
    { title: '奖励方式', dataIndex: 'rewardMethod', width: 140, render: (value) => formatEnumText(value, 'rewardMethod', '奖励方式') },
    { title: '奖励值', dataIndex: 'rewardValue', width: 160, render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'activityStatus', '活动状态') },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  return (
    <Drawer title={card ? `权益次卡完整档案 · ${card.cardName}` : '权益次卡完整档案'} open={open} onClose={onClose} width={1120} destroyOnClose>
      {!profile || !card ? <Empty description={loading ? '正在加载权益次卡档案...' : '暂无权益次卡档案'} /> : (
        <Tabs items={[
          { key: 'overview', label: '总览', children: (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap size="large">
                <Statistic title="已发卡" value={profile.userCardCount || 0} />
                <Statistic title="使用中" value={profile.activeUserCardCount || 0} />
                <Statistic title="已过期" value={profile.expiredUserCardCount || 0} />
                <Statistic title="发放总次数" value={profile.totalIssuedTimes || 0} />
                <Statistic title="剩余次数" value={profile.totalRemainTimes || 0} />
                <Statistic title="已核销次数" value={profile.totalUsedTimes || 0} />
              </Space>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="卡编码">{card.cardCode}</Descriptions.Item>
                <Descriptions.Item label="状态">{formatEnumText(card.status, 'status', '状态')}</Descriptions.Item>
                <Descriptions.Item label="卡类型">{formatEnumText(card.cardType, 'serviceCardType', '卡类型')}</Descriptions.Item>
                <Descriptions.Item label="售价">{formatAmount(card.salePrice)}</Descriptions.Item>
                <Descriptions.Item label="库存">{card.stock ?? 0}</Descriptions.Item>
                <Descriptions.Item label="权益次数">{card.rightsServiceTimes ?? 0} 次</Descriptions.Item>
                <Descriptions.Item label="适用范围">{card.scopeNote || card.scopeMode || '-'}</Descriptions.Item>
                <Descriptions.Item label="有效期">{card.validityMode === 'PERMANENT' ? '长期有效' : `${card.validityDays || 0} 天`}</Descriptions.Item>
                <Descriptions.Item label="发放渠道">{card.issueChannels || '-'}</Descriptions.Item>
                <Descriptions.Item label="每人限领">{card.issueLimitPerUser || '不限'}</Descriptions.Item>
                <Descriptions.Item label="权益说明" span={2}>{card.rightsNote || '-'}</Descriptions.Item>
              </Descriptions>
              <Space wrap>{risks.length ? risks.map((risk) => <Tag key={risk} color="warning">{risk}</Tag>) : <Tag color="success">权益次卡配置完整</Tag>}</Space>
              <Typography.Text type="secondary">聚合最近 100 张用户卡、100 条核销流水和最近 50 个关联充值活动。</Typography.Text>
            </Space>
          ) },
          { key: 'userCards', label: '用户持卡', children: <Table rowKey="id" size="small" columns={userCardColumns} dataSource={profile.userCards || []} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} /> },
          { key: 'usage', label: '核销流水', children: <Table rowKey="id" size="small" columns={usageColumns} dataSource={profile.usageRecords || []} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'recharge', label: '关联充值活动', children: <Table rowKey="id" size="small" columns={rechargeColumns} dataSource={profile.rechargeActivities || []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
        ]} />
      )}
    </Drawer>
  );
};

export default ServiceCardFullProfileDrawer;
