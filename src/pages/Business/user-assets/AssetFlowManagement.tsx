import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Row, Select, Space, Statistic, Tabs } from 'antd';
import { TransactionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  balanceFlowTypeOptions,
  riskStatusOptions,
  serviceCardStatusOptions,
  userLevelOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { AppUserProfileRecord, BalanceFlowRecord, BalanceLotRecord, ServiceCardRecord, ServiceCardUsageRecord, UserRiskRecord, UserServiceCardRecord } from '@/services/backendService';

type DetailRecord = BalanceFlowRecord | BalanceLotRecord | AppUserProfileRecord | UserServiceCardRecord | ServiceCardRecord | ServiceCardUsageRecord | UserRiskRecord;

const serviceCardProductStatusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);
const serviceCardProductStatusMap = buildValueEnum(serviceCardProductStatusOptions);
const userServiceCardStatusMap = buildValueEnum(serviceCardStatusOptions);
const usageStatusMap = buildValueEnum(writeOffStatusOptions);
const userLevelMap = buildValueEnum(userLevelOptions);
const serviceCardScopeMap: Record<string, string> = {
  ALL_STORE: '全部门店可用',
  SELECTED_STORE: '指定门店可用',
  SERVICE_PACKAGE: '指定服务/套餐可用',
  MEMBER_LEVEL: '指定会员等级可用',
};

const serviceRightMap: Record<string, string> = {
  CAR_WASH: '洗车服务',
  MAINTENANCE: '保养服务',
  INSPECTION: '检测服务',
  RESCUE: '道路救援',
  DISCOUNT: '专属折扣',
};

const formatCsvLabels = (value?: string, labels: Record<string, string> = {}) =>
  String(value || '').split(',').map((item) => labels[item.trim()] || item.trim()).filter(Boolean).join('、') || '-';

const compactJoin = (items: Array<string | false | undefined>) => items.filter(Boolean).join('；');

const formatServiceScope = (record: ServiceCardRecord) => compactJoin([
  serviceCardScopeMap[record.scopeMode || ''] || record.scopeMode,
  record.scopeNote,
]) || '-';

const formatServiceRights = (record: ServiceCardRecord) => compactJoin([
  record.rightsServiceTimes ? `${record.rightsServiceTimes}次` : undefined,
  formatCsvLabels(record.rightsServices, serviceRightMap),
  record.rightsDiscount ? `${record.rightsDiscount}折` : undefined,
  record.rightsTransferable ? '可转赠' : undefined,
  record.rightsNote,
]) || '-';

const assetFlowDetailFields: Record<'balance' | 'lot' | 'profile' | 'serviceCard' | 'userCard' | 'usage' | 'risk', DetailField<any>[]> = {
  balance: [
    { name: 'flowNo', label: '流水号' },
    { name: 'userName', label: '用户' },
    { name: 'flowType', label: '类型' },
    { name: 'changeAmount', label: '变动金额', render: (value) => formatAmount(value) },
    { name: 'balanceAfter', label: '变动后' , render: (value) => formatAmount(value) },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'balanceLotId', label: '余额批次ID' },
    { name: 'principalAmount', label: '本金金额', render: (value) => formatAmount(value || 0) },
    { name: 'giftAmount', label: '赠送金额', render: (value) => formatAmount(value || 0) },
    { name: 'operator', label: '操作人' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  lot: [
    { name: 'lotNo', label: '批次号' },
    { name: 'userName', label: '用户' },
    { name: 'sourceType', label: '来源类型' },
    { name: 'sourceNo', label: '来源单号' },
    { name: 'rechargeNo', label: '充值单号' },
    { name: 'sourceScopeType', label: '余额范围', render: (_value, record) => [record.sourceScopeType, record.sourceScopeId ? `#${record.sourceScopeId}` : undefined].filter(Boolean).join('') || '-' },
    { name: 'principalAmount', label: '本金总额', render: (value) => formatAmount(value || 0) },
    { name: 'giftAmount', label: '赠送总额', render: (value) => formatAmount(value || 0) },
    { name: 'remainingPrincipal', label: '剩余本金', render: (value) => formatAmount(value || 0) },
    { name: 'remainingGift', label: '剩余赠送', render: (value) => formatAmount(value || 0) },
    { name: 'settlementRule', label: '清分规则' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  profile: [
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'memberLevel', label: '会员等级' },
    { name: 'realNameStatus', label: '实名状态' },
    { name: 'riskStatus', label: '风控状态' },
    { name: 'registeredAt', label: '注册时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '备注' },
  ],
  serviceCard: [
    { name: 'cardCode', label: '卡产品编码' },
    { name: 'cardName', label: '卡产品名称' },
    { name: 'cardType', label: '卡类型' },
    { name: 'scopeMode', label: '适用范围', render: (_, record) => formatServiceScope(record) },
    { name: 'rightsServiceTimes', label: '权益', render: (_, record) => formatServiceRights(record) },
    { name: 'salePrice', label: '售价', render: (value) => formatAmount(value) },
    { name: 'stock', label: '库存' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, serviceCardProductStatusMap) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  userCard: [
    { name: 'cardNo', label: '用户卡号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'phone', label: '手机号' },
    { name: 'remainTimes', label: '剩余次数' },
    { name: 'totalTimes', label: '总次数' },
    { name: 'validFrom', label: '有效期开始', render: (value) => formatDateTime(value) },
    { name: 'validTo', label: '有效期结束', render: (value) => formatDateTime(value) },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, userServiceCardStatusMap) },
  ],
  usage: [
    { name: 'usageNo', label: '使用流水' },
    { name: 'cardNo', label: '用户卡号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'deductCount', label: '扣减次数' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, usageStatusMap) },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
  ],
  risk: [
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'riskScene', label: '风控场景' },
    { name: 'riskReason', label: '风控原因' },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'riskStatus', label: '状态' },
    { name: 'owner', label: '负责人' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const resolveAssetFlowDetailTitle = (detail: DetailRecord | null) => {
  if (!detail) return '详情查看';
  if ('flowNo' in detail) return '余额流水详情';
  if ('lotNo' in detail) return '余额批次详情';
  if ('cardCode' in detail) return '服务卡产品详情';
  if ('usageNo' in detail) return '扣次流水详情';
  if ('cardNo' in detail) return '用户服务卡详情';
  if ('riskScene' in detail) return '用户风控详情';
  return '用户档案详情';
};

const AssetFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [flowTypeFilter, setFlowTypeFilter] = useState<string>();
  const [profileRiskStatusFilter, setProfileRiskStatusFilter] = useState<string>();
  const [serviceCardStatusFilter, setServiceCardStatusFilter] = useState<string>();
  const [userCardStatusFilter, setUserCardStatusFilter] = useState<string>();
  const [usageStatusFilter, setUsageStatusFilter] = useState<string>();
  const [riskStatusFilter, setRiskStatusFilter] = useState<string>();
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const balanceFlowQuery = useQuery({
    queryKey: ['assetFlowBalanceFlows', keyword, flowTypeFilter],
    queryFn: async () => (await api.asset.balanceFlows.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, flowType: flowTypeFilter })).data,
  });
  const balanceLotQuery = useQuery({
    queryKey: ['assetFlowBalanceLots', keyword],
    queryFn: async () => (await api.asset.balanceLots.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const profileQuery = useQuery({
    queryKey: ['assetFlowProfiles', keyword, profileRiskStatusFilter],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, riskStatus: profileRiskStatusFilter })).data,
  });
  const serviceCardQuery = useQuery({
    queryKey: ['assetFlowServiceCards', keyword, serviceCardStatusFilter],
    queryFn: async () => (await api.asset.serviceCards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: serviceCardStatusFilter })).data,
  });
  const userServiceCardQuery = useQuery({
    queryKey: ['assetFlowUserServiceCards', keyword, userCardStatusFilter],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: userCardStatusFilter })).data,
  });
  const serviceCardUsageQuery = useQuery({
    queryKey: ['assetFlowServiceCardUsages', keyword, usageStatusFilter],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: usageStatusFilter })).data,
  });
  const riskQuery = useQuery({
    queryKey: ['assetFlowRiskRecords', keyword, riskStatusFilter],
    queryFn: async () => (await api.asset.riskRecords.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, riskStatus: riskStatusFilter })).data,
  });
  const balanceFlows = balanceFlowQuery.data?.records || [];
  const balanceLots = balanceLotQuery.data?.records || [];
  const profiles = profileQuery.data?.records || [];
  const serviceCards = serviceCardQuery.data?.records || [];
  const userServiceCards = userServiceCardQuery.data?.records || [];
  const serviceCardUsages = serviceCardUsageQuery.data?.records || [];
  const riskRecords = riskQuery.data?.records || [];

  const balanceColumns = useMemo<ProColumns<BalanceFlowRecord>[]>(() => [
    { title: '流水号', dataIndex: 'flowNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '类型', dataIndex: 'flowType', width: 120, render: (_, record) => renderStatusTag(record.flowType, balanceFlowTypeMap) },
    { title: '变动金额', dataIndex: 'changeAmount', width: 120, render: (_, record) => formatAmount(record.changeAmount) },
    { title: '批次ID', dataIndex: 'balanceLotId', width: 100, render: (_, record) => record.balanceLotId ? `#${record.balanceLotId}` : '-' },
    { title: '本金/赠送', dataIndex: 'principalAmount', width: 150, renderText: (_, record) => `${formatAmount(record.principalAmount || 0)} / ${formatAmount(record.giftAmount || 0)}` },
    { title: '变动后', dataIndex: 'balanceAfter', width: 120, render: (_, record) => formatAmount(record.balanceAfter) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const balanceLotColumns = useMemo<ProColumns<BalanceLotRecord>[]>(() => [
    { title: '批次号', dataIndex: 'lotNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源', dataIndex: 'sourceNo', width: 180 },
    { title: '充值单号', dataIndex: 'rechargeNo', width: 170 },
    { title: '范围', dataIndex: 'sourceScopeType', width: 130, renderText: (_, record) => [record.sourceScopeType, record.sourceScopeId ? `#${record.sourceScopeId}` : undefined].filter(Boolean).join('') || '-' },
    { title: '资金主体', dataIndex: 'fundOwnerUnitId', width: 120, renderText: (_, record) => record.fundOwnerUnitId ? `#${record.fundOwnerUnitId}` : '-' },
    { title: '成本主体', dataIndex: 'promotionCostUnitId', width: 120, renderText: (_, record) => record.promotionCostUnitId ? `#${record.promotionCostUnitId}` : '-' },
    { title: '清分规则', dataIndex: 'settlementRule', width: 180, renderText: (_, record) => record.settlementRule || (record.settlementRuleId ? `规则#${record.settlementRuleId}` : '-') },
    { title: '结算模式', dataIndex: 'settlementMode', width: 140 },
    { title: '本金总额', dataIndex: 'principalAmount', width: 120, render: (_, record) => formatAmount(record.principalAmount || 0) },
    { title: '赠送总额', dataIndex: 'giftAmount', width: 120, render: (_, record) => formatAmount(record.giftAmount || 0) },
    { title: '剩余本金', dataIndex: 'remainingPrincipal', width: 120, render: (_, record) => formatAmount(record.remainingPrincipal || 0) },
    { title: '剩余赠送', dataIndex: 'remainingGift', width: 120, render: (_, record) => formatAmount(record.remainingGift || 0) },
    { title: '状态', dataIndex: 'status', width: 120 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const profileColumns = useMemo<ProColumns<AppUserProfileRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '会员等级', dataIndex: 'memberLevel', width: 120, render: (_, record) => renderStatusTag(record.memberLevel, userLevelMap) },
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120 , render: (value) => formatEnumText(value, 'realNameStatus', '实名状态') },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120 , render: (value) => formatEnumText(value, 'riskStatus', '风控状态') },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, render: (_, record) => formatDateTime(record.registeredAt) },
    { title: '备注', dataIndex: 'remark', width: 220 },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const serviceCardColumns = useMemo<ProColumns<ServiceCardRecord>[]>(() => [
    { title: '卡产品编码', dataIndex: 'cardCode', width: 160 },
    { title: '卡产品名称', dataIndex: 'cardName', width: 180 },
    { title: '卡类型', dataIndex: 'cardType', width: 120 , render: (value) => formatEnumText(value, 'cardType', '卡类型') },
    { title: '适用范围', dataIndex: 'scopeMode', width: 190, render: (_, record) => formatServiceScope(record) },
    { title: '权益', dataIndex: 'rightsServiceTimes', width: 260, render: (_, record) => formatServiceRights(record) },
    { title: '售价', dataIndex: 'salePrice', width: 120, render: (_, record) => formatAmount(record.salePrice) },
    { title: '库存', dataIndex: 'stock', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, serviceCardProductStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const userCardColumns = useMemo<ProColumns<UserServiceCardRecord>[]>(() => [
    { title: '用户卡号', dataIndex: 'cardNo', width: 170 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    { title: '剩余/总次数', dataIndex: 'remainTimes', width: 130, renderText: (_, record) => `${record.remainTimes ?? 0}/${record.totalTimes ?? 0}` },
    { title: '有效期', dataIndex: 'validFrom', width: 230, render: (_, record) => `${formatDateTime(record.validFrom)} - ${formatDateTime(record.validTo)}` },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, userServiceCardStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const usageColumns = useMemo<ProColumns<ServiceCardUsageRecord>[]>(() => [
    { title: '使用流水', dataIndex: 'usageNo', width: 170 },
    { title: '用户卡号', dataIndex: 'cardNo', width: 170 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '门店', dataIndex: 'storeName', width: 170 },
    { title: '扣减次数', dataIndex: 'deductCount', width: 110 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, usageStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const riskColumns = useMemo<ProColumns<UserRiskRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '风控场景', dataIndex: 'riskScene', width: 150 , render: (value) => formatEnumText(value, 'riskScene', '风控场景') },
    { title: '风控原因', dataIndex: 'riskReason', width: 220 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '状态', dataIndex: 'riskStatus', width: 120 , render: (value) => formatEnumText(value, 'riskStatus', '状态') },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产流水中心" subtitle="维护余额流水、积分流水、充值订单、充值奖励、用户标签和会员等级。" icon={<TransactionOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="余额流水" value={balanceFlowQuery.data?.total ?? balanceFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="余额批次" value={balanceLotQuery.data?.total ?? balanceLots.length} suffix="批" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="用户档案" value={profileQuery.data?.total ?? profiles.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="卡产品" value={serviceCardQuery.data?.total ?? serviceCards.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="用户服务卡" value={userServiceCardQuery.data?.total ?? userServiceCards.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="风控记录" value={riskQuery.data?.total ?? riskRecords.length} suffix="条" /></Card></Col>
      </Row>

      <Space size={12} wrap style={{ marginBottom: 16 }}>
        <KeywordSearchBar
          value={keyword}
          placeholder="输入用户、流水、卡号、风控关键词"
          onSearch={setKeyword}
        />
        <Select allowClear placeholder="流水类型" style={{ width: 140 }} options={balanceFlowTypeOptions} value={flowTypeFilter} onChange={setFlowTypeFilter} />
        <Select allowClear placeholder="档案风控" style={{ width: 140 }} options={riskStatusOptions} value={profileRiskStatusFilter} onChange={setProfileRiskStatusFilter} />
        <Select allowClear placeholder="卡产品状态" style={{ width: 140 }} options={serviceCardProductStatusOptions} value={serviceCardStatusFilter} onChange={setServiceCardStatusFilter} />
        <Select allowClear placeholder="用户卡状态" style={{ width: 140 }} options={serviceCardStatusOptions} value={userCardStatusFilter} onChange={setUserCardStatusFilter} />
        <Select allowClear placeholder="扣次状态" style={{ width: 140 }} options={writeOffStatusOptions} value={usageStatusFilter} onChange={setUsageStatusFilter} />
        <Select allowClear placeholder="风控状态" style={{ width: 140 }} options={riskStatusOptions} value={riskStatusFilter} onChange={setRiskStatusFilter} />
      </Space>

      <Tabs
        items={[
          { key: 'balance', label: '余额流水', children: <ProTable<BalanceFlowRecord> cardBordered rowKey="id" columns={balanceColumns} dataSource={balanceFlows} loading={balanceFlowQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} /> },
          { key: 'lot', label: '余额批次', children: <ProTable<BalanceLotRecord> cardBordered rowKey="id" columns={balanceLotColumns} dataSource={balanceLots} loading={balanceLotQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1580 }} /> },
          { key: 'profile', label: '用户档案', children: <ProTable<AppUserProfileRecord> cardBordered rowKey="id" columns={profileColumns} dataSource={profiles} loading={profileQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'serviceCard', label: '服务卡产品', children: <ProTable<ServiceCardRecord> cardBordered rowKey="id" columns={serviceCardColumns} dataSource={serviceCards} loading={serviceCardQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} /> },
          { key: 'userCard', label: '用户服务卡', children: <ProTable<UserServiceCardRecord> cardBordered rowKey="id" columns={userCardColumns} dataSource={userServiceCards} loading={userServiceCardQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'cardUsage', label: '扣次流水', children: <ProTable<ServiceCardUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={serviceCardUsages} loading={serviceCardUsageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'risk', label: '风控记录', children: <ProTable<UserRiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={riskRecords} loading={riskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
        ]}
      />

      <BusinessDetailModal
        title={resolveAssetFlowDetailTitle(detail)}
        eyebrow="用户资产详情"
        subtitle="查看流水、卡产品、用户卡和风控记录的统一详情视图。"
        open={!!detail}
        onCancel={() => setDetail(null)}
        width={760}
      >
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('flowNo' in detail ? assetFlowDetailFields.balance : 'lotNo' in detail ? assetFlowDetailFields.lot : 'cardCode' in detail ? assetFlowDetailFields.serviceCard : 'usageNo' in detail ? assetFlowDetailFields.usage : 'cardNo' in detail ? assetFlowDetailFields.userCard : 'riskScene' in detail ? assetFlowDetailFields.risk : assetFlowDetailFields.profile) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default AssetFlowManagement;
