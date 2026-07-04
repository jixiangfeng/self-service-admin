import React from 'react';
import { Descriptions, Drawer, Empty, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  AppUserFullProfileRecord,
  BalanceFlowRecord,
  ServiceCardUsageRecord,
  UserFavoriteStoreRecord,
  UserServiceCardRecord,
  UserVehicleRecord,
  UserRiskRecord,
  RechargeOrderRecord,
  ServiceOrderRecord,
} from '@/services/backendService';
import { formatAmount, formatDateTime, formatEnumText, formatOperatorText } from '@/pages/Business/shared';

interface Props {
  open: boolean;
  loading?: boolean;
  profile?: AppUserFullProfileRecord;
  onClose: () => void;
}

const UserAssetFullProfileDrawer: React.FC<Props> = ({ open, loading, profile, onClose }) => {
  const user = profile?.profile;
  const account = profile?.account;
  const risks = [
    user?.riskStatus && user.riskStatus !== 'NORMAL' ? `用户风控状态：${formatEnumText(user.riskStatus, 'riskStatus', '风控状态')}` : null,
    account?.status && account.status !== 'NORMAL' ? `账户状态：${formatEnumText(account.status, 'riskStatus', '账户状态')}` : null,
    (profile?.activeRiskCount || 0) > 0 ? `存在 ${profile?.activeRiskCount} 条观察/黑名单记录` : null,
    !account ? '尚未找到余额账户' : null,
  ].filter(Boolean) as string[];

  const vehicleColumns: ColumnsType<UserVehicleRecord> = [
    { title: '车牌号', dataIndex: 'plateNo', width: 140 },
    { title: '车型', dataIndex: 'vehicleType', width: 120, render: (value) => formatEnumText(value, 'vehicleType', '车型') },
    { title: '品牌', dataIndex: 'brand', width: 120, render: (value) => value || '-' },
    { title: '颜色', dataIndex: 'color', width: 100, render: (value) => value || '-' },
    { title: '默认', dataIndex: 'defaultFlag', width: 90, render: (value) => formatEnumText(value, 'defaultFlag', '默认') },
    { title: '状态', dataIndex: 'status', width: 100, render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const storeColumns: ColumnsType<UserFavoriteStoreRecord> = [
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '城市', dataIndex: 'city', width: 120, render: (value) => value || '-' },
    { title: '下单次数', dataIndex: 'orderCount', width: 100, render: (value) => value ?? 0 },
    { title: '最近订单', dataIndex: 'lastOrderNo', width: 180, render: (value) => value || '-' },
    { title: '最近到访', dataIndex: 'lastVisitAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const cardColumns: ColumnsType<UserServiceCardRecord> = [
    { title: '卡号', dataIndex: 'cardNo', width: 180 },
    { title: '卡名称', dataIndex: 'cardName', width: 180 },
    { title: '总次数', dataIndex: 'totalTimes', width: 90, render: (value) => value ?? 0 },
    { title: '剩余次数', dataIndex: 'remainTimes', width: 100, render: (value) => value ?? 0 },
    { title: '来源', dataIndex: 'sourceBizNo', width: 180, render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'serviceCardStatus', '状态') },
    { title: '有效期', width: 220, render: (_, record) => `${record.validFrom || '-'} ~ ${record.validTo || '-'}` },
  ];

  const usageColumns: ColumnsType<ServiceCardUsageRecord> = [
    { title: '流水号', dataIndex: 'usageNo', width: 180, render: (value) => value || '-' },
    { title: '卡名称', dataIndex: 'cardName', width: 160, render: (value) => value || '-' },
    { title: '服务订单', dataIndex: 'serviceOrderNo', width: 180, render: (value) => value || '-' },
    { title: '门店', dataIndex: 'storeName', width: 180, render: (value) => value || '-' },
    { title: '扣次', dataIndex: 'deductCount', width: 90, render: (_, record) => record.deductCount ?? record.useTimes ?? 0 },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'writeOffStatus', '核销状态') },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const rechargeColumns: ColumnsType<RechargeOrderRecord> = [
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180 },
    { title: '活动', dataIndex: 'activityName', width: 180, render: (value) => value || '-' },
    { title: '充值门店', dataIndex: 'storeName', width: 160, render: (value) => value || '-' },
    { title: '可用范围', dataIndex: 'scopeType', width: 120, render: (value) => formatEnumText(value, 'scopeType', '可用范围') },
    { title: '实付金额', dataIndex: 'payAmount', width: 120, render: (value) => formatAmount(value) },
    { title: '赠送金额', dataIndex: 'giftAmount', width: 120, render: (value) => formatAmount(value) },
    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'rechargeOrderStatus', '状态') },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const serviceOrderColumns: ColumnsType<ServiceOrderRecord> = [
    { title: '服务订单', dataIndex: 'orderNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 160, render: (value) => value || '-' },
    { title: '服务', dataIndex: 'serviceName', width: 160, render: (value) => value || '-' },
    { title: '车牌', dataIndex: 'plateNo', width: 120, render: (value) => value || '-' },
    { title: '支付方式', dataIndex: 'payMode', width: 120, render: (value) => formatEnumText(value, 'payMode', '支付方式') },
    { title: '实付金额', dataIndex: 'payAmount', width: 120, render: (value) => formatAmount(value) },
    { title: '状态', dataIndex: 'orderStatus', width: 120, render: (value) => formatEnumText(value, 'orderStatus', '状态') },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const flowColumns: ColumnsType<BalanceFlowRecord> = [
    { title: '流水号', dataIndex: 'flowNo', width: 180 },
    { title: '类型', dataIndex: 'flowType', width: 120, render: (value) => formatEnumText(value, 'balanceFlowType', '流水类型') },
    { title: '变动金额', dataIndex: 'changeAmount', width: 120, render: (value) => formatAmount(value) },
    { title: '变动后余额', dataIndex: 'balanceAfter', width: 130, render: (value) => formatAmount(value) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180, render: (value) => value || '-' },
    { title: '操作人', dataIndex: 'operator', width: 120, render: (value) => formatOperatorText(value) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  const riskColumns: ColumnsType<UserRiskRecord> = [
    { title: '风控场景', dataIndex: 'riskScene', width: 150, render: (value) => formatEnumText(value, 'riskScene', '风控场景') },
    { title: '原因', dataIndex: 'riskReason', width: 220, render: (value) => value || '-' },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180, render: (value) => value || '-' },
    { title: '状态', dataIndex: 'riskStatus', width: 120, render: (value) => formatEnumText(value, 'riskStatus', '状态') },
    { title: '负责人', dataIndex: 'owner', width: 120, render: (value) => value || '-' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value) => formatDateTime(value) },
  ];

  return (
    <Drawer title={user ? `用户资产完整档案 · ${user.userName}` : '用户资产完整档案'} open={open} onClose={onClose} width={1180} destroyOnClose>
      {!profile || !user ? <Empty description={loading ? '正在加载用户资产档案...' : '暂无用户资产档案'} /> : (
        <Tabs items={[
          { key: 'overview', label: '总览', children: (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap size="large">
                <Statistic title="总余额" value={Number(profile.totalBalance || 0)} precision={2} prefix="¥" />
                <Statistic title="可用余额" value={Number(profile.availableBalance || 0)} precision={2} prefix="¥" />
                <Statistic title="车辆" value={profile.vehicleCount || 0} suffix="辆" />
                <Statistic title="充值实付" value={Number(profile.totalRechargePayAmount || 0)} precision={2} prefix="¥" />
                <Statistic title="服务消费" value={Number(profile.totalServicePayAmount || 0)} precision={2} prefix="¥" />
                <Statistic title="服务卡" value={profile.activeServiceCardCount || 0} suffix="张" />
                <Statistic title="剩余服务次数" value={profile.totalRemainTimes || 0} suffix="次" />
              </Space>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="用户ID">{user.userId || user.id}</Descriptions.Item>
                <Descriptions.Item label="手机号">{user.mobile || '-'}</Descriptions.Item>
                <Descriptions.Item label="会员等级">{formatEnumText(user.memberLevel, 'userLevel', '会员等级')}</Descriptions.Item>
                <Descriptions.Item label="实名状态">{formatEnumText(user.realNameStatus, 'realNameStatus', '实名状态')}</Descriptions.Item>
                <Descriptions.Item label="风控状态">{formatEnumText(user.riskStatus, 'riskStatus', '风控状态')}</Descriptions.Item>
                <Descriptions.Item label="注册时间">{formatDateTime(user.registeredAt)}</Descriptions.Item>
                <Descriptions.Item label="账户状态">{formatEnumText(account?.status, 'riskStatus', '账户状态')}</Descriptions.Item>
                <Descriptions.Item label="冻结金额">{formatAmount(account?.freezeBalance)}</Descriptions.Item>
                <Descriptions.Item label="用户标签" span={2}>{user.userTags || '-'}</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{user.remark || '-'}</Descriptions.Item>
              </Descriptions>
              <Space wrap>{risks.length ? risks.map((risk) => <Tag key={risk} color="warning">{risk}</Tag>) : <Tag color="success">用户资产状态正常</Tag>}</Space>
              <Typography.Text type="secondary">聚合最近 50 条车辆/常用门店/风控记录、100 条服务卡/充值订单/服务订单/余额流水和 100 条核销记录。</Typography.Text>
            </Space>
          ) },
          { key: 'vehicles', label: '车辆', children: <Table rowKey="id" size="small" columns={vehicleColumns} dataSource={profile.vehicles || []} pagination={{ pageSize: 8 }} scroll={{ x: 960 }} /> },
          { key: 'stores', label: '常用门店', children: <Table rowKey="id" size="small" columns={storeColumns} dataSource={profile.favoriteStores || []} pagination={{ pageSize: 8 }} scroll={{ x: 900 }} /> },
          { key: 'cards', label: '服务卡', children: <Table rowKey="id" size="small" columns={cardColumns} dataSource={profile.serviceCards || []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'usage', label: '核销流水', children: <Table rowKey="id" size="small" columns={usageColumns} dataSource={profile.serviceCardUsages || []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'recharges', label: '充值订单', children: <Table rowKey="id" size="small" columns={rechargeColumns} dataSource={profile.rechargeOrders || []} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'orders', label: '服务订单', children: <Table rowKey="id" size="small" columns={serviceOrderColumns} dataSource={profile.serviceOrders || []} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'flows', label: '余额流水', children: <Table rowKey="id" size="small" columns={flowColumns} dataSource={profile.balanceFlows || []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'risks', label: '风控记录', children: <Table rowKey="id" size="small" columns={riskColumns} dataSource={profile.riskRecords || []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
        ]} />
      )}
    </Drawer>
  );
};

export default UserAssetFullProfileDrawer;
