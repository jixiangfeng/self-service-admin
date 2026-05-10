import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Radio, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { GiftOutlined, IdcardOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  couponTypeOptions,
  rewardTypeOptions,
  scopeTypeOptions,
  serviceCardStatusOptions,
  serviceCardTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { AppUserProfileRecord, CouponIssueRecord, CouponTemplateRecord, CouponUsageRecord, ServiceCardRecord, ServiceCardUsageRecord, UserCouponRecord, UserServiceCardRecord } from '@/services/backendService';

type DetailRecord = UserCouponRecord | CouponIssueRecord | CouponUsageRecord | UserCardViewRecord | CardUsageViewRecord;

type UserCardViewRecord = UserServiceCardRecord & {
  mobile?: string;
  cardType?: string;
  validStart?: string;
  validEnd?: string;
  sourceType?: string;
};

type CardUsageViewRecord = ServiceCardUsageRecord & {
  writeOffRecordNo?: string;
  usedTimes?: number;
  remainTimesBefore?: number;
  remainTimesAfter?: number;
  usageStatus?: string;
};

const sourceTypeOptions = [
  { value: 'RECEIVE', label: '主动领取' },
  { value: 'INVITE', label: '邀请奖励' },
  { value: 'RECHARGE', label: '充值赠送' },
  { value: 'BUY', label: '购买' },
  { value: 'ACTIVITY', label: '活动发放' },
  { value: 'BACKEND', label: '后台发放' },
  { value: 'COMPENSATION', label: '售后补偿' },
];

const couponStatusOptions = [
  { value: 'UNUSED', label: '未使用' },
  { value: 'LOCKED', label: '已锁定' },
  { value: 'USED', label: '已使用' },
  { value: 'EXPIRED', label: '已过期' },
  { value: 'RECYCLED', label: '已回收' },
];

const issueStatusOptions = [
  { value: 'SUCCESS', label: '发放成功' },
  { value: 'PENDING', label: '待发放' },
  { value: 'FAILED', label: '发放失败' },
  { value: 'RECYCLED', label: '已回收' },
];

const couponUsageStatusOptions = [
  { value: 'LOCKED', label: '已锁券' },
  { value: 'USED', label: '已核销' },
  { value: 'RELEASED', label: '已释放' },
  { value: 'ROLLBACK', label: '已回滚' },
];

const couponTypeMap = buildValueEnum(couponTypeOptions);
const sourceTypeMap = buildValueEnum(sourceTypeOptions);
const couponStatusMap = buildValueEnum(couponStatusOptions);
const issueStatusMap = buildValueEnum(issueStatusOptions);
const usageStatusMap = buildValueEnum(couponUsageStatusOptions);
const cardTypeMap = buildValueEnum(serviceCardTypeOptions);
const cardStatusMap = buildValueEnum(serviceCardStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const grantReasonOptions = [
  { value: 'CUSTOMER_SERVICE', label: '客服补发' },
  { value: 'ACTIVITY_REWARD', label: '活动奖励' },
  { value: 'ORDER_COMPENSATION', label: '订单补偿' },
  { value: 'MEMBER_BENEFIT', label: '会员权益' },
];

const costOwnerOptions = [
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'STORE', label: '门店承担' },
  { value: 'MERCHANT', label: '商户承担' },
  { value: 'NONE', label: '无需成本' },
];

const grantValidityModeOptions = [
  { value: 'DAYS', label: '按有效天数' },
  { value: 'TEMPLATE', label: '跟随模板/卡产品' },
];

const grantOptionLabel = (options: Array<{ value: string; label: string }>, value?: unknown) =>
  options.find((item) => item.value === value)?.label || String(value || '');

const compactGrantRemark = (items: Array<string | false | undefined>) => items.filter(Boolean).join('；');

const buildGrantPayload = (values: Record<string, any>) => {
  const {
    grantReason,
    costOwner,
    approvalRequired,
    notifyUser,
    validityMode,
    validDays,
    totalTimes,
    remainTimes,
    grantNote,
    ...payload
  } = values;
  const remark = compactGrantRemark([
    grantReason && `补发原因：${grantOptionLabel(grantReasonOptions, grantReason)}`,
    costOwner && `成本承担：${grantOptionLabel(costOwnerOptions, costOwner)}`,
    approvalRequired ? '需要审批' : '无需审批',
    notifyUser ? '通知用户' : '不通知用户',
    validityMode === 'DAYS' && validDays ? `有效天数：${validDays}天` : '有效期跟随模板',
    payload.assetType === 'CARD' && totalTimes ? `服务卡总次数：${totalTimes}次` : undefined,
    grantNote && `补充说明：${grantNote}`,
  ]);

  return {
    ...payload,
    validDays: validityMode === 'DAYS' ? validDays : undefined,
    totalTimes: payload.assetType === 'CARD' ? totalTimes : undefined,
    remainTimes: payload.assetType === 'CARD' ? remainTimes ?? totalTimes : undefined,
    remark,
  };
};

const couponCardDetailFields: Record<'coupon' | 'issue' | 'usage' | 'card' | 'cardUsage', DetailField<any>[]> = {
  coupon: [
    { name: 'couponNo', label: '券码' },
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'templateName', label: '券模板' },
    { name: 'couponType', label: '券类型' },
    { name: 'sourceType', label: '来源' },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'discountAmount', label: '抵扣金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'receivedAt', label: '领取时间', render: (value) => formatDateTime(value) },
    { name: 'validStart', label: '有效期开始', render: (value) => formatDateTime(value) },
    { name: 'validEnd', label: '有效期结束', render: (value) => formatDateTime(value) },
    { name: 'serviceOrderNo', label: '使用订单' },
  ],
  issue: [
    { name: 'issueNo', label: '发放单号' },
    { name: 'templateName', label: '券模板' },
    { name: 'userName', label: '用户' },
    { name: 'activityName', label: '活动' },
    { name: 'issueType', label: '发放方式' },
    { name: 'issueStatus', label: '状态' },
    { name: 'issuedAt', label: '发放时间', render: (value) => formatDateTime(value) },
    { name: 'failReason', label: '失败原因' },
    { name: 'operator', label: '操作人' },
  ],
  usage: [
    { name: 'usageNo', label: '使用流水号' },
    { name: 'couponNo', label: '券码' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'writeOffRecordNo', label: '核销流水' },
    { name: 'discountAmount', label: '抵扣金额', render: (value) => formatAmount(value) },
    { name: 'usageStatus', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
    { name: 'rollbackAt', label: '回滚时间', render: (value) => formatDateTime(value) },
  ],
  card: [
    { name: 'cardNo', label: '用户卡号' },
    { name: 'userName', label: '用户' },
    { name: 'phone', label: '手机号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'cardType', label: '卡类型' },
    { name: 'remainTimes', label: '剩余次数' },
    { name: 'totalTimes', label: '总次数' },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'status', label: '状态' },
    { name: 'validFrom', label: '有效期开始', render: (value) => formatDateTime(value) },
    { name: 'validTo', label: '有效期结束', render: (value) => formatDateTime(value) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  cardUsage: [
    { name: 'usageNo', label: '使用流水号' },
    { name: 'cardNo', label: '用户卡号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'useTimes', label: '本次扣次' },
    { name: 'deductCount', label: '扣减次数' },
    { name: 'status', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
  ],
};

const CouponCardDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const couponQuery = useQuery({
    queryKey: ['userCoupons', keyword],
    queryFn: async () => (await api.asset.userCoupons.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const issueQuery = useQuery({
    queryKey: ['couponIssues', keyword],
    queryFn: async () => (await api.asset.couponIssues.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const usageQuery = useQuery({
    queryKey: ['couponUsages', keyword],
    queryFn: async () => (await api.asset.couponUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const cardQuery = useQuery({
    queryKey: ['couponCardDetailUserServiceCards', keyword],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const cardUsageQuery = useQuery({
    queryKey: ['couponCardDetailServiceCardUsages', keyword],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const userQuery = useQuery({
    queryKey: ['couponCardGrantUsers'],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const couponTemplateQuery = useQuery({
    queryKey: ['couponCardGrantCouponTemplates'],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 500, status: 'ENABLED' })).data,
  });
  const serviceCardProductQuery = useQuery({
    queryKey: ['couponCardGrantServiceCards'],
    queryFn: async () => (await api.asset.serviceCards.page({ pageNum: 1, pageSize: 500, status: 'ENABLED' })).data,
  });
  const userCards = cardQuery.data?.records ?? [];
  const cardUsages = cardUsageQuery.data?.records ?? [];
  const userCoupons = couponQuery.data?.records ?? [];
  const couponIssues = issueQuery.data?.records ?? [];
  const couponUsages = usageQuery.data?.records ?? [];
  const users = userQuery.data?.records ?? [];
  const couponTemplates = couponTemplateQuery.data?.records ?? [];
  const serviceCardProducts = serviceCardProductQuery.data?.records ?? [];
  const userOptions = users.map((item: AppUserProfileRecord) => ({ value: item.userId ?? item.id, label: `${item.userName}${item.mobile ? `（${item.mobile}）` : ''}` }));
  const couponTemplateOptions = couponTemplates.map((item: CouponTemplateRecord) => ({ value: item.id, label: `${item.templateName} / ${item.templateCode}` }));
  const serviceCardOptions = serviceCardProducts.map((item: ServiceCardRecord) => ({ value: item.id, label: `${item.cardName} / ${item.cardCode}` }));

  const grantMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.assetType === 'CARD') {
        return api.asset.serviceCards.issue(Number(values.assetId), values);
      }
      return api.asset.userCoupons.add({
        templateId: values.assetId,
        templateName: values.assetName,
        couponType: values.couponType || 'DIRECT',
        userId: values.userId,
        userName: values.targetUser,
        mobile: values.mobile || values.targetUser,
        sourceType: values.sourceType,
        sourceBizNo: values.sourceBizNo,
        discountAmount: values.discountAmount || 0,
        remark: values.remark,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCoupons'] });
      queryClient.invalidateQueries({ queryKey: ['couponIssues'] });
      queryClient.invalidateQueries({ queryKey: ['couponCardDetailUserServiceCards'] });
      message.success('券卡已补发');
    },
  });

  const filter = <T extends object>(records: T[], fields: Array<keyof T>) =>
    records.filter((record) => containsKeyword(keyword, fields.map((field) => String(record[field] ?? ''))));

  const openGrantModal = () => {
    form.resetFields();
    form.setFieldsValue({
      assetType: 'COUPON',
      scopeType: 'SINGLE_USER',
      sourceType: 'BACKEND',
      grantReason: 'CUSTOMER_SERVICE',
      costOwner: 'PLATFORM',
      validityMode: 'TEMPLATE',
      validDays: 30,
      totalTimes: 1,
      remainTimes: 1,
      approvalRequired: true,
      notifyUser: true,
    });
    setModalVisible(true);
  };

  const handleGrant = async () => {
    const values = await form.validateFields();
    await grantMutation.mutateAsync(buildGrantPayload(values));
    setModalVisible(false);
  };

  const couponColumns = useMemo<ProColumns<UserCouponRecord>[]>(() => [
    { title: '券码', dataIndex: 'couponNo', width: 160, fixed: 'left' },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '手机号', dataIndex: 'mobile', width: 130, search: false },
    { title: '券模板', dataIndex: 'templateName', width: 170 },
    { title: '券类型', dataIndex: 'couponType', width: 130, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '来源', dataIndex: 'sourceType', width: 120, render: (_, record) => renderStatusTag(record.sourceType, sourceTypeMap) },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 170 },
    { title: '抵扣金额', dataIndex: 'discountAmount', width: 110, search: false, render: (_, record) => formatAmount(record.discountAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, couponStatusMap) },
    { title: '领取时间', dataIndex: 'receivedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.receivedAt) },
    { title: '有效期', dataIndex: 'validStart', width: 260, search: false, render: (_, record) => `${formatDateTime(record.validStart)} - ${formatDateTime(record.validEnd)}` },
    { title: '使用订单', dataIndex: 'serviceOrderNo', width: 160, search: false, renderText: (value) => value || '-' },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>, <a key="recycle" onClick={async () => { await api.asset.userCoupons.recycle(Number(record.id), { remark: '后台回收' }); queryClient.invalidateQueries({ queryKey: ['userCoupons'] }); queryClient.invalidateQueries({ queryKey: ['couponIssues'] }); message.success('已回收'); }}>回收</a>] },
  ], []);

  const issueColumns = useMemo<ProColumns<CouponIssueRecord>[]>(() => [
    { title: '发放单号', dataIndex: 'issueNo', width: 170, fixed: 'left' },
    { title: '券模板', dataIndex: 'templateName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '活动', dataIndex: 'activityName', width: 170, renderText: (value) => value || '-' },
    { title: '发放方式', dataIndex: 'issueType', width: 120, render: (_, record) => renderStatusTag(record.issueType, sourceTypeMap) },
    { title: '状态', dataIndex: 'issueStatus', width: 120, render: (_, record) => renderStatusTag(record.issueStatus, issueStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '失败原因', dataIndex: 'failReason', width: 180, renderText: (value) => value || '-' },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>, <a key="rollback" onClick={async () => { if (record.userCouponId) await api.asset.userCoupons.rollback(Number(record.userCouponId), { remark: '后台用券回滚' }); queryClient.invalidateQueries({ queryKey: ['userCoupons'] }); queryClient.invalidateQueries({ queryKey: ['couponUsages'] }); message.success('已回滚'); }}>回滚</a>] },
  ], []);

  const usageColumns = useMemo<ProColumns<CouponUsageRecord>[]>(() => [
    { title: '使用流水号', dataIndex: 'usageNo', width: 170, fixed: 'left' },
    { title: '券码', dataIndex: 'couponNo', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '核销流水', dataIndex: 'writeOffRecordNo', width: 170 },
    { title: '抵扣金额', dataIndex: 'discountAmount', width: 110, render: (_, record) => formatAmount(record.discountAmount) },
    { title: '状态', dataIndex: 'usageStatus', width: 120, render: (_, record) => renderStatusTag(record.usageStatus, usageStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '回滚时间', dataIndex: 'rollbackAt', width: 180, render: (_, record) => formatDateTime(record.rollbackAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const cardColumns = useMemo<ProColumns<UserCardViewRecord>[]>(() => [
    { title: '用户卡号', dataIndex: 'cardNo', width: 170, fixed: 'left' },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '卡类型', dataIndex: 'cardType', width: 120, render: (_, record) => renderStatusTag(record.cardType, cardTypeMap) },
    { title: '次数', dataIndex: 'remainTimes', width: 120, renderText: (_, record) => `${record.remainTimes}/${record.totalTimes}` },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 170 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, cardStatusMap) },
    { title: '有效期', dataIndex: 'validFrom', width: 260, render: (_, record) => `${formatDateTime(record.validFrom)} - ${formatDateTime(record.validTo)}` },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const cardUsageColumns = useMemo<ProColumns<CardUsageViewRecord>[]>(() => [
    { title: '使用流水号', dataIndex: 'usageNo', width: 170, fixed: 'left' },
    { title: '用户卡号', dataIndex: 'cardNo', width: 170 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '门店', dataIndex: 'storeName', width: 170 },
    { title: '本次扣次', dataIndex: 'useTimes', width: 100 },
    { title: '扣减次数', dataIndex: 'deductCount', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space>
              <GiftOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div>
                <h2 style={{ margin: 0 }}>用户券卡明细中心</h2>
                <div style={{ color: '#667085' }}>维护用户券库存、发放流水、使用流水、用户服务卡和服务卡扣次记录。</div>
              </div>
            </Space>
          </Col>
          <Col><Button type="primary" icon={<GiftOutlined />} onClick={openGrantModal}>后台补发券卡</Button></Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户券库存" value={couponQuery.data?.total ?? userCoupons.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="发券流水" value={issueQuery.data?.total ?? couponIssues.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用券流水" value={usageQuery.data?.total ?? couponUsages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户服务卡" value={cardQuery.data?.total ?? userCards.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="扣次流水" value={cardUsageQuery.data?.total ?? cardUsages.length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="用户 / 手机号 / 券码 / 卡号 / 订单"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'coupons', label: '用户券库存', children: <ProTable<UserCouponRecord> cardBordered rowKey="id" search={false} columns={couponColumns} dataSource={filter(userCoupons, ['couponNo', 'userName', 'mobile', 'templateName', 'sourceBizNo', 'serviceOrderNo']) as UserCouponRecord[]} loading={couponQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1760 }} /> },
          { key: 'issues', label: '发券流水', children: <ProTable<CouponIssueRecord> cardBordered rowKey="id" search={false} columns={issueColumns} dataSource={filter(couponIssues, ['issueNo', 'templateName', 'userName', 'activityName', 'operator']) as CouponIssueRecord[]} loading={issueQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'usage', label: '用券流水', children: <ProTable<CouponUsageRecord> cardBordered rowKey="id" search={false} columns={usageColumns} dataSource={filter(couponUsages, ['usageNo', 'couponNo', 'userName', 'serviceOrderNo', 'writeOffRecordNo']) as CouponUsageRecord[]} loading={usageQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1460 }} /> },
          { key: 'cards', label: '用户服务卡', children: <ProTable<UserCardViewRecord> cardBordered rowKey="id" search={false} columns={cardColumns} dataSource={userCards as UserCardViewRecord[]} loading={cardQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
          { key: 'cardUsage', label: '服务卡使用流水', children: <ProTable<CardUsageViewRecord> cardBordered rowKey="id" search={false} columns={cardUsageColumns} dataSource={cardUsages as CardUsageViewRecord[]} loading={cardUsageQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
        ]}
      />

      <BusinessDetailModal title="明细详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('couponNo' in detail && 'receivedAt' in detail ? couponCardDetailFields.coupon : 'issueNo' in detail ? couponCardDetailFields.issue : 'couponNo' in detail ? couponCardDetailFields.usage : 'usageNo' in detail ? couponCardDetailFields.cardUsage : couponCardDetailFields.card) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="券卡补发"
        title="后台补发券卡"
        subtitle="在同一张表单里完成券模板、卡产品和用户补发，字段尽量贴近实际发放闭环。"
        meta={['券 / 卡', '后台发放']}
        open={modalVisible}
        onOk={handleGrant}
        onCancel={() => setModalVisible(false)}
        width={760}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<GiftOutlined />} title="发放对象" desc="先确认资产类型、发放范围和目标用户，再进入发放内容。">
              <div className="merchant-editor-fields">
                <Form.Item name="assetType" label="资产类型" rules={[{ required: true, message: '请选择资产类型' }]}>
                  <Select
                    options={rewardTypeOptions.filter((item) => ['COUPON', 'CARD'].includes(String(item.value)))}
                    placeholder="请选择资产类型"
                    onChange={() => form.setFieldsValue({ assetId: undefined, assetName: undefined, assetCode: undefined, couponType: undefined })}
                  />
                </Form.Item>
                <Form.Item name="scopeType" label="发放范围" rules={[{ required: true, message: '请选择发放范围' }]}><Select options={scopeTypeOptions} placeholder="请选择发放范围" /></Form.Item>
                <Form.Item name="userId" label="目标用户" rules={[{ required: true, message: '请选择目标用户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={userOptions}
                    placeholder="请选择目标用户"
                    onChange={(value) => {
                      const user = users.find((item) => (item.userId ?? item.id) === value);
                      form.setFieldsValue({ targetUser: user?.userName, mobile: user?.mobile });
                    }}
                  />
                </Form.Item>
                <Form.Item name="targetUser" hidden><Input /></Form.Item>
                <Form.Item name="mobile" label="手机号"><Input disabled placeholder="选择用户后自动带出" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<GiftOutlined />} title="资产信息" desc="补齐券模板或卡产品标识，保证补发动作落到正确资产。">
              <div className="merchant-editor-fields">
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.assetType !== next.assetType}>
                  {({ getFieldValue }) => getFieldValue('assetType') === 'CARD' ? (
                    <Form.Item name="assetId" label="卡产品" rules={[{ required: true, message: '请选择卡产品' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={serviceCardOptions}
                        placeholder="请选择卡产品"
                        onChange={(value) => {
                          const card = serviceCardProducts.find((item) => item.id === value);
                          form.setFieldsValue({
                            assetName: card?.cardName,
                            assetCode: card?.cardCode,
                            totalTimes: card?.rightsServiceTimes || 1,
                            remainTimes: card?.rightsServiceTimes || 1,
                            validDays: card?.validityDays || 365,
                          });
                        }}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item name="assetId" label="券模板" rules={[{ required: true, message: '请选择券模板' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={couponTemplateOptions}
                        placeholder="请选择券模板"
                        onChange={(value) => {
                          const template = couponTemplates.find((item) => item.id === value);
                          form.setFieldsValue({
                            assetName: template?.templateName,
                            assetCode: template?.templateCode,
                            couponType: template?.couponType,
                            discountAmount: template?.thresholdType === 'NONE' ? 0 : template?.thresholdAmount || 0,
                            validityMode: 'TEMPLATE',
                          });
                        }}
                      />
                    </Form.Item>
                  )}
                </Form.Item>
                <Form.Item name="assetName" label="资产名称"><Input disabled placeholder="选择后自动带出" /></Form.Item>
                <Form.Item name="assetCode" hidden><Input /></Form.Item>
                <Form.Item name="couponType" hidden><Input /></Form.Item>
                <Form.Item name="discountAmount" label="抵扣金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="0.00" /></Form.Item>
                <Form.Item name="sourceType" label="发放来源" rules={[{ required: true, message: '请选择发放来源' }]}><Select options={sourceTypeOptions} placeholder="请选择发放来源" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<GiftOutlined />} title="发放策略" desc="通过补发原因、有效期、审批和通知设置替代手写说明，降低运营维护成本。">
              <div className="merchant-editor-fields">
                <Form.Item name="grantReason" label="补发原因" rules={[{ required: true, message: '请选择补发原因' }]}><Select options={grantReasonOptions} placeholder="请选择补发原因" /></Form.Item>
                <Form.Item name="costOwner" label="成本承担" rules={[{ required: true, message: '请选择成本承担方' }]}><Select options={costOwnerOptions} placeholder="请选择成本承担方" /></Form.Item>
                <Form.Item name="validityMode" label="有效期方式"><Radio.Group optionType="button" options={grantValidityModeOptions} /></Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.validityMode !== next.validityMode}>
                  {({ getFieldValue }) => getFieldValue('validityMode') === 'DAYS' ? (
                    <Form.Item name="validDays" label="有效天数"><InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="天" placeholder="例如：30" /></Form.Item>
                  ) : (
                    <Form.Item label="有效期说明"><Input disabled value="跟随券模板或卡产品配置" /></Form.Item>
                  )}
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.assetType !== next.assetType}>
                  {({ getFieldValue }) => getFieldValue('assetType') === 'CARD' ? (
                    <>
                      <Form.Item name="totalTimes" label="服务卡总次数"><InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="次" placeholder="例如：10" /></Form.Item>
                      <Form.Item name="remainTimes" label="初始剩余次数"><InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="次" placeholder="默认等于总次数" /></Form.Item>
                    </>
                  ) : null}
                </Form.Item>
                <Form.Item name="approvalRequired" label="审批要求" valuePropName="checked"><Checkbox>本次补发需要审批</Checkbox></Form.Item>
                <Form.Item name="notifyUser" label="通知设置" valuePropName="checked"><Checkbox>补发成功后通知用户</Checkbox></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<GiftOutlined />} title="发放闭环" desc="保留来源单号和简短补充说明，便于后续审计、回收和回滚。">
              <div className="merchant-editor-fields">
                <Form.Item name="sourceBizNo" label="来源单号"><Input placeholder="客服工单 / 活动 / 订单号" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="grantNote" label="补充说明"><Input placeholder="仅填写无法通过上方选项表达的补充信息" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
        <div style={{ display: 'none' }}>{renderStatusTag('COUPON', rewardTypeMap)}{renderStatusTag('PLATFORM', scopeMap)}<IdcardOutlined /></div>
      </BusinessEditorModal>
    </Space>
  );
};

export default CouponCardDetailManagement;
