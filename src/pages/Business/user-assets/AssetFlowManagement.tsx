import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Modal, Row, Statistic, Tabs } from 'antd';
import { TransactionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  balanceFlowTypeOptions,
  rechargeOrderStatusOptions,
  userLevelOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { AppUserProfileRecord, BalanceFlowRecord, ServiceCardRecord, ServiceCardUsageRecord, UserRiskRecord, UserServiceCardRecord } from '@/services/backendService';

type DetailRecord = BalanceFlowRecord | AppUserProfileRecord | UserServiceCardRecord | ServiceCardRecord | ServiceCardUsageRecord | UserRiskRecord;

const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);
const rechargeStatusMap = buildValueEnum(rechargeOrderStatusOptions);
const userLevelMap = buildValueEnum(userLevelOptions);

const assetFlowDetailFields: Record<'balance' | 'profile' | 'serviceCard' | 'userCard' | 'usage' | 'risk', DetailField<any>[]> = {
  balance: [
    { name: 'flowNo', label: '流水号' },
    { name: 'userName', label: '用户' },
    { name: 'flowType', label: '类型' },
    { name: 'changeAmount', label: '变动金额', render: (value) => formatAmount(value) },
    { name: 'balanceAfter', label: '变动后' , render: (value) => formatAmount(value) },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'operator', label: '操作人' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
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
    { name: 'scope', label: '适用范围' },
    { name: 'rights', label: '权益' },
    { name: 'salePrice', label: '售价', render: (value) => formatAmount(value) },
    { name: 'stock', label: '库存' },
    { name: 'status', label: '状态' },
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
    { name: 'status', label: '状态' },
  ],
  usage: [
    { name: 'usageNo', label: '使用流水' },
    { name: 'cardNo', label: '用户卡号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'deductCount', label: '扣减次数' },
    { name: 'status', label: '状态' },
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

const AssetFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const balanceFlowQuery = useQuery({
    queryKey: ['assetFlowBalanceFlows', keyword],
    queryFn: async () => (await api.asset.balanceFlows.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const profileQuery = useQuery({
    queryKey: ['assetFlowProfiles', keyword],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const serviceCardQuery = useQuery({
    queryKey: ['assetFlowServiceCards', keyword],
    queryFn: async () => (await api.asset.serviceCards.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const userServiceCardQuery = useQuery({
    queryKey: ['assetFlowUserServiceCards', keyword],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const serviceCardUsageQuery = useQuery({
    queryKey: ['assetFlowServiceCardUsages', keyword],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const riskQuery = useQuery({
    queryKey: ['assetFlowRiskRecords', keyword],
    queryFn: async () => (await api.asset.riskRecords.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const balanceFlows = balanceFlowQuery.data?.records || [];
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
    { title: '变动后', dataIndex: 'balanceAfter', width: 120, render: (_, record) => formatAmount(record.balanceAfter) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const profileColumns = useMemo<ProColumns<AppUserProfileRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '会员等级', dataIndex: 'memberLevel', width: 120, render: (_, record) => renderStatusTag(record.memberLevel, userLevelMap) },
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120 },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120 },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, render: (_, record) => formatDateTime(record.registeredAt) },
    { title: '备注', dataIndex: 'remark', width: 220 },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const serviceCardColumns = useMemo<ProColumns<ServiceCardRecord>[]>(() => [
    { title: '卡产品编码', dataIndex: 'cardCode', width: 160 },
    { title: '卡产品名称', dataIndex: 'cardName', width: 180 },
    { title: '卡类型', dataIndex: 'cardType', width: 120 },
    { title: '适用范围', dataIndex: 'scope', width: 160 },
    { title: '权益', dataIndex: 'rights', width: 220 },
    { title: '售价', dataIndex: 'salePrice', width: 120, render: (_, record) => formatAmount(record.salePrice) },
    { title: '库存', dataIndex: 'stock', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, rechargeStatusMap) },
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
    { title: '状态', dataIndex: 'status', width: 120 },
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
    { title: '状态', dataIndex: 'status', width: 120 },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const riskColumns = useMemo<ProColumns<UserRiskRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '风控场景', dataIndex: 'riskScene', width: 150 },
    { title: '风控原因', dataIndex: 'riskReason', width: 220 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180 },
    { title: '状态', dataIndex: 'riskStatus', width: 120 },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产流水中心" subtitle="维护余额流水、积分流水、充值订单、充值奖励、用户标签和会员等级。" icon={<TransactionOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="余额流水" value={balanceFlowQuery.data?.total ?? balanceFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="用户档案" value={profileQuery.data?.total ?? profiles.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="卡产品" value={serviceCardQuery.data?.total ?? serviceCards.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="用户服务卡" value={userServiceCardQuery.data?.total ?? userServiceCards.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="扣次流水" value={serviceCardUsageQuery.data?.total ?? serviceCardUsages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="风控记录" value={riskQuery.data?.total ?? riskRecords.length} suffix="条" /></Card></Col>
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
          { key: 'balance', label: '余额流水', children: <ProTable<BalanceFlowRecord> cardBordered rowKey="id" columns={balanceColumns} dataSource={balanceFlows} loading={balanceFlowQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} /> },
          { key: 'profile', label: '用户档案', children: <ProTable<AppUserProfileRecord> cardBordered rowKey="id" columns={profileColumns} dataSource={profiles} loading={profileQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'serviceCard', label: '服务卡产品', children: <ProTable<ServiceCardRecord> cardBordered rowKey="id" columns={serviceCardColumns} dataSource={serviceCards} loading={serviceCardQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} /> },
          { key: 'userCard', label: '用户服务卡', children: <ProTable<UserServiceCardRecord> cardBordered rowKey="id" columns={userCardColumns} dataSource={userServiceCards} loading={userServiceCardQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'cardUsage', label: '扣次流水', children: <ProTable<ServiceCardUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={serviceCardUsages} loading={serviceCardUsageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'risk', label: '风控记录', children: <ProTable<UserRiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={riskRecords} loading={riskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('flowNo' in detail ? assetFlowDetailFields.balance : 'cardCode' in detail ? assetFlowDetailFields.serviceCard : 'usageNo' in detail ? assetFlowDetailFields.usage : 'cardNo' in detail ? assetFlowDetailFields.userCard : 'riskScene' in detail ? assetFlowDetailFields.risk : assetFlowDetailFields.profile) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

    </div>
  );
};

export default AssetFlowManagement;
