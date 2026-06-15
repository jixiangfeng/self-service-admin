import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { CalendarOutlined, GiftOutlined, PlusOutlined, SafetyOutlined, TagsOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityStatusOptions, costBearerOptions, couponTypeOptions, rewardTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type CouponTemplateRecord, type InviteActivityRecord, type MarketingBudgetRecord, type RechargeActivityRecord, type SelectOptionRecord } from '@/services/backendService';

type ActivityStatus = 'DRAFT' | 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'ENDED' | 'DISABLED' | 'ENABLED';
type ActivityTab = 'coupon' | 'invite' | 'recharge';
type MarketingRecord = CouponTemplateRecord | InviteActivityRecord | RechargeActivityRecord;

const statusMap = buildValueEnum([...activityStatusOptions, { label: '启用', value: 'ENABLED' }]);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
const closedRewardTypeOptions = rewardTypeOptions.filter((item) => item.value !== 'POINTS');
const scopeOptions = [
  { label: '全部门店', value: '全部门店' },
  { label: '指定门店组', value: '指定门店组' },
  { label: '新客专享', value: '新客专享' },
  { label: '会员专享', value: '会员专享' },
];
const thresholdOptions = [
  { label: '无门槛', value: 'NONE' },
  { label: '满额可用', value: 'AMOUNT' },
];
const validityOptions = [
  { label: '领券后固定天数', value: 'DAYS' },
  { label: '长期有效', value: 'LONG_TERM' },
];
const issueChannelOptions = [
  { label: '运营手动发放', value: '运营手动发放' },
  { label: '用户主动领取', value: '用户主动领取' },
  { label: '活动自动发放', value: '活动自动发放' },
];
const issueAudienceOptions = [
  { label: '全部用户', value: '全部用户' },
  { label: '新注册用户', value: '新注册用户' },
  { label: '沉睡用户', value: '沉睡用户' },
  { label: '指定会员等级', value: '指定会员等级' },
];
const qualifyConditionOptions = [
  { label: '被邀请人完成注册', value: '被邀请人完成注册' },
  { label: '被邀请人首单支付', value: '被邀请人首单支付' },
  { label: '被邀请人累计消费达标', value: '被邀请人累计消费达标' },
];
const fraudCheckOptions = [
  { label: '同手机号限制', value: '同手机号限制' },
  { label: '同设备限制', value: '同设备限制' },
  { label: '同支付账号限制', value: '同支付账号限制' },
  { label: '异常频次拦截', value: '异常频次拦截' },
];
const recoveryModeOptions = [
  { label: '不回收', value: 'NONE' },
  { label: '订单退款后回收', value: 'REFUND' },
  { label: '达标后冷静期内可回收', value: 'COOLING' },
];
const rechargeModeOptions = [
  { label: '固定档位充值', value: '固定档位充值' },
  { label: '任意金额充值', value: '任意金额充值' },
  { label: '首充专享', value: '首充专享' },
];
const rewardMethodOptions = [
  { label: '赠送余额', value: '赠送余额' },
  { label: '赠送优惠券', value: '赠送优惠券' },
  { label: '赠送积分', value: '赠送积分' },
];
const stackLimitOptions = [
  { label: '不可与同类型券叠加', value: '同类券不可叠加' },
  { label: '不可与平台促销同享', value: '不可与平台促销同享' },
  { label: '可与余额混用', value: '余额可与单张券混用' },
];
const rechargeTierOptions = [
  { label: '50 元', value: '50' },
  { label: '100 元', value: '100' },
  { label: '200 元', value: '200' },
  { label: '500 元', value: '500' },
  { label: '1000 元', value: '1000' },
];
const splitMultiValue = (value?: string) => String(value || '').split(/[\\/、,，；;]/).map((item) => item.trim().replace(/元$/, '')).filter(Boolean);
const joinMultiValue = (value: unknown, separator = '；') => Array.isArray(value) ? value.join(separator) : String(value || '');
const optionLabel = (options: { label: string; value: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const hasRewardType = (value: unknown, target: string) => Array.isArray(value)
  ? value.includes(target)
  : String(value || '').split(/[;；,，]/).map((item) => item.trim()).includes(target);
const rewardSummary = (type?: string, amount?: number | string, couponId?: number, cardId?: number) => {
  if (type === 'COUPON') return couponId ? `优惠券模板 #${couponId}` : '优惠券';
  if (type === 'CARD') return cardId ? `服务卡产品 #${cardId}` : '服务卡';
  if (type === 'POINTS') return amount ? `${amount}积分` : '积分';
  return amount ? `${amount}元余额` : '余额';
};
const couponThresholdText = (record: CouponTemplateRecord) => record.thresholdType === 'NONE'
  ? '无门槛'
  : record.thresholdAmount ? `满 ${record.thresholdAmount} 元可用` : optionLabel(thresholdOptions, record.thresholdType);
const couponValidityText = (record: CouponTemplateRecord) => record.validityType === 'LONG_TERM'
  ? '长期有效'
  : record.validityDays ? `领券后 ${record.validityDays} 天内有效` : optionLabel(validityOptions, record.validityType);
const inviteQualifyText = (record: InviteActivityRecord) => [
  record.qualifyCondition,
  record.qualifyAmount ? `消费满 ${record.qualifyAmount} 元` : undefined,
  record.qualifyDays ? `${record.qualifyDays} 天内完成` : undefined,
].filter(Boolean).join(' / ') || '-';

const buildModalPayload = (type: ActivityTab, values: Record<string, any>) => {
  if (type === 'coupon') {
    return { ...values, stackLimits: joinMultiValue(values.stackLimits) };
  }
  if (type === 'invite') {
    return { ...values, fraudChecks: joinMultiValue(values.fraudChecks) };
  }
  return {
    ...values,
    tierAmounts: joinMultiValue(values.tierAmounts, '/'),
    rewardType: joinMultiValue(values.rewardType),
  };
};

const marketingDetailFields: Record<ActivityTab, DetailField<any>[]> = {
  coupon: [
    { name: 'templateCode', label: '券模板编码' },
    { name: 'templateName', label: '券模板名称' },
    { name: 'couponType', label: '券类型' },
    { name: 'scope', label: '作用范围' },
    { name: 'thresholdType', label: '门槛类型' },
    { name: 'thresholdAmount', label: '满额门槛' },
    { name: 'validityType', label: '有效期类型' },
    { name: 'validityDays', label: '有效天数' },
    { name: 'issueChannel', label: '发放方式' },
    { name: 'issueAudience', label: '领取人群' },
    { name: 'perUserLimit', label: '每人限领' },
    { name: 'totalBudget', label: '预算上限' },
    { name: 'stackLimits', label: '叠加限制' },
    { name: 'stock', label: '库存' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  invite: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'activityName', label: '活动名称' },
    { name: 'qualifyCondition', label: '达标条件' },
    { name: 'qualifyAmount', label: '消费门槛' },
    { name: 'qualifyDays', label: '达标期限' },
    { name: 'dailyLimitCount', label: '每日上限' },
    { name: 'inviterReward', label: '邀请人奖励' },
    { name: 'inviteeReward', label: '被邀请人奖励' },
    { name: 'inviterRewardType', label: '邀请人奖励类型' },
    { name: 'inviterCouponTemplateId', label: '邀请人券模板' },
    { name: 'inviterServiceCardId', label: '邀请人服务卡' },
    { name: 'inviterRewardAmount', label: '邀请人金额/积分' },
    { name: 'inviteeRewardType', label: '被邀请人奖励类型' },
    { name: 'inviteeCouponTemplateId', label: '被邀请人券模板' },
    { name: 'inviteeServiceCardId', label: '被邀请人服务卡' },
    { name: 'inviteeRewardAmount', label: '被邀请人金额/积分' },
    { name: 'fraudChecks', label: '风控开关' },
    { name: 'recoveryMode', label: '奖励回收' },
    { name: 'recoveryDays', label: '回收期限' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  recharge: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'activityName', label: '活动名称' },
    { name: 'rechargeMode', label: '充值方式' },
    { name: 'tierAmounts', label: '固定档位' },
    { name: 'rewardMethod', label: '奖励方式' },
    { name: 'rewardValue', label: '奖励值' },
    { name: 'couponTemplateId', label: '奖励券模板' },
    { name: 'serviceCardId', label: '奖励服务卡' },
    { name: 'rewardCap', label: '单人奖励上限' },
    { name: 'scope', label: '作用范围' },
    { name: 'costOwner', label: '成本承担' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const MarketingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<MarketingRecord>();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ActivityTab>('coupon');
  const [modalType, setModalType] = useState<ActivityTab | null>(null);
  const [detail, setDetail] = useState<MarketingRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MarketingRecord | null>(null);
  const couponQuery = useQuery({
    queryKey: ['marketingOverview', 'couponTemplates', keyword, status],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status })).data,
  });
  const inviteQuery = useQuery({
    queryKey: ['marketingOverview', 'inviteActivities', keyword, status],
    queryFn: async () => (await api.marketing.inviteActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status })).data,
  });
  const rechargeQuery = useQuery({
    queryKey: ['marketingOverview', 'rechargeActivities', keyword, status],
    queryFn: async () => (await api.marketing.rechargeActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status })).data,
  });
  const budgetQuery = useQuery({
    queryKey: ['marketingOverview', 'budgets', keyword, status],
    queryFn: async () => (await api.marketing.budgets.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status })).data,
  });
  const couponTemplateOptionsQuery = useQuery({ queryKey: ['marketingOverview', 'couponTemplateOptions'], queryFn: async () => (await api.marketing.couponTemplates.options({ status: 'ENABLED' })).data });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['marketingOverview', 'serviceCardOptions'], queryFn: async () => (await api.asset.serviceCards.options({ status: 'ENABLED' })).data });

  const couponActivities = couponQuery.data?.records || [];
  const inviteActivities = inviteQuery.data?.records || [];
  const rechargeActivities = rechargeQuery.data?.records || [];
  const budgets = (budgetQuery.data?.records || []) as MarketingBudgetRecord[];
  const couponTemplateOptions = (couponTemplateOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceCardOptions = (serviceCardOptionsQuery.data || []) as SelectOptionRecord[];
  const inviterRewardType = Form.useWatch('inviterRewardType', form);
  const inviteeRewardType = Form.useWatch('inviteeRewardType', form);
  const selectedRechargeRewardType = Form.useWatch('rewardType', form);

  const filteredCoupons = useMemo(
    () => couponActivities.filter((item) => containsKeyword(keyword, [item.templateCode, item.templateName, item.couponType, item.scope, item.issueChannel, item.issueAudience, item.stackLimits]) && (!status || item.status === status)),
    [couponActivities, keyword, status]
  );
  const filteredInvites = useMemo(
    () => inviteActivities.filter((item) => containsKeyword(keyword, [item.activityCode, item.activityName, item.qualifyCondition, item.inviterReward, item.inviteeReward, item.fraudChecks]) && (!status || item.status === status)),
    [inviteActivities, keyword, status]
  );
  const filteredRecharge = useMemo(
    () => rechargeActivities.filter((item) => containsKeyword(keyword, [item.activityCode, item.activityName, item.rechargeMode, item.rewardMethod, item.tierAmounts, item.scope]) && (!status || item.status === status)),
    [keyword, rechargeActivities, status]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ type, values }: { type: ActivityTab; values: Record<string, unknown> }) => {
      if (type === 'coupon') {
        return values.id ? api.marketing.couponTemplates.edit(values) : api.marketing.couponTemplates.add(values);
      }
      if (type === 'invite') {
        return values.id ? api.marketing.inviteActivities.edit(values) : api.marketing.inviteActivities.add(values);
      }
      return values.id ? api.marketing.rechargeActivities.edit(values) : api.marketing.rechargeActivities.add(values);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketingOverview', variables.type === 'coupon' ? 'couponTemplates' : variables.type === 'invite' ? 'inviteActivities' : 'rechargeActivities'] });
      message.success(editingRecord ? '活动已更新' : '活动已创建');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ type, record, nextStatus }: { type: ActivityTab; record: MarketingRecord; nextStatus: ActivityStatus }) => {
      const values = { ...record, status: nextStatus };
      if (type === 'coupon') return api.marketing.couponTemplates.edit(values);
      if (type === 'invite') return api.marketing.inviteActivities.edit(values);
      return api.marketing.rechargeActivities.edit(values);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketingOverview', variables.type === 'coupon' ? 'couponTemplates' : variables.type === 'invite' ? 'inviteActivities' : 'rechargeActivities'] });
      message.success('活动状态已更新');
    },
  });

  const openModal = (type: ActivityTab, record?: MarketingRecord) => {
    setModalType(type);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        ...(type === 'coupon' ? { stackLimits: splitMultiValue((record as CouponTemplateRecord).stackLimits) } : {}),
        ...(type === 'invite' ? { fraudChecks: splitMultiValue((record as InviteActivityRecord).fraudChecks) } : {}),
        ...(type === 'recharge' ? {
          tierAmounts: splitMultiValue((record as RechargeActivityRecord).tierAmounts),
          rewardType: splitMultiValue((record as RechargeActivityRecord).rewardType),
        } : {}),
      } as any);
      return;
    }
    if (type === 'coupon') {
      form.setFieldsValue({ status: 'DRAFT', couponType: 'FULL_REDUCTION', scope: '全部门店', thresholdType: 'AMOUNT', validityType: 'DAYS', issueChannel: '用户主动领取', issueAudience: '全部用户', stock: 0 } as any);
      return;
    }
    if (type === 'invite') {
      form.setFieldsValue({ status: 'DRAFT', qualifyCondition: '被邀请人首单支付', recoveryMode: 'REFUND', fraudChecks: ['同手机号限制', '同设备限制'], inviterRewardType: 'BALANCE', inviteeRewardType: 'COUPON' } as any);
      return;
    }
    form.setFieldsValue({ status: 'DRAFT', tierAmounts: ['50', '100', '200'], rechargeMode: '固定档位充值', rewardMethod: '赠送余额', scope: '全部门店' } as any);
  };

  const closeModal = () => {
    setModalType(null);
    setEditingRecord(null);
    form.resetFields();
  };

  const updateStatus = (type: ActivityTab, record: MarketingRecord, nextStatus: ActivityStatus) => {
    const actionText = nextStatus === 'RUNNING' || nextStatus === 'ENABLED' ? '启动' : '暂停';
    const name = 'templateName' in record ? record.templateName : record.activityName;
    showBusinessConfirm({
      title: `确认${actionText}活动`,
      content: `确定${actionText}「${name}」吗？该操作会立即影响活动展示和权益发放。`,
      okText: `确认${actionText}`,
      danger: actionText !== '启动',
      onOk: () => statusMutation.mutate({ type, record, nextStatus }),
    });
  };

  const couponColumns: ProColumns<CouponTemplateRecord>[] = [
    {
      title: '券模板',
      dataIndex: 'templateName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.templateName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.templateCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '模板名称 / 编码 / 券类型 / 范围' } },
    { title: '券类型', dataIndex: 'couponType', width: 120, valueType: 'select', valueEnum: couponTypeMap, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '范围', dataIndex: 'scope', width: 180, search: false , render: (value) => formatEnumText(value, 'scope', '范围') },
    { title: '发放方式', dataIndex: 'issueChannel', width: 160, search: false , render: (value) => formatEnumText(value, 'issueChannel', '发放方式') },
    { title: '领取人群', dataIndex: 'issueAudience', width: 160, search: false , render: (value) => formatEnumText(value, 'issueAudience', '领取人群') },
    { title: '使用门槛', dataIndex: 'thresholdType', width: 160, search: false, render: (_, record) => couponThresholdText(record) },
    { title: '有效期', dataIndex: 'validityType', width: 160, search: false, render: (_, record) => couponValidityText(record) },
    { title: '库存', dataIndex: 'stock', width: 120, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => openModal('coupon', record)}>编辑</Button>
          <Button size="small" onClick={() => updateStatus('coupon', record, record.status === 'ENABLED' || record.status === 'RUNNING' ? 'PAUSED' : 'ENABLED')}>
            {record.status === 'RUNNING' || record.status === 'ENABLED' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const inviteColumns: ProColumns<InviteActivityRecord>[] = [
    {
      title: '活动名称',
      dataIndex: 'activityName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.activityName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.activityCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动名称 / 编码 / 达标规则 / 奖励' } },
    { title: '达标规则', dataIndex: 'qualifyCondition', width: 220, search: false, render: (_, record) => inviteQualifyText(record) },
    { title: '邀请人奖励', dataIndex: 'inviterReward', width: 160, search: false },
    { title: '被邀请人奖励', dataIndex: 'inviteeReward', width: 160, search: false },
    { title: '邀请人配置', dataIndex: 'inviterRewardType', width: 170, search: false, render: (_, record) => rewardSummary(record.inviterRewardType, record.inviterRewardAmount, record.inviterCouponTemplateId, record.inviterServiceCardId) },
    { title: '被邀请人配置', dataIndex: 'inviteeRewardType', width: 170, search: false, render: (_, record) => rewardSummary(record.inviteeRewardType, record.inviteeRewardAmount, record.inviteeCouponTemplateId, record.inviteeServiceCardId) },
    { title: '上限规则', dataIndex: 'dailyLimitCount', width: 140, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => openModal('invite', record)}>配置</Button>
          <Button size="small" onClick={() => updateStatus('invite', record, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const rechargeColumns: ProColumns<RechargeActivityRecord>[] = [
    {
      title: '活动名称',
      dataIndex: 'activityName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.activityName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.activityCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动名称 / 编码 / 充值门槛 / 奖励' } },
    { title: '充值方式', dataIndex: 'rechargeMode', width: 160, search: false , render: (value) => formatEnumText(value, 'rechargeMode', '充值方式') },
    { title: '奖励方式', dataIndex: 'rewardMethod', width: 160, search: false , render: (value) => formatEnumText(value, 'rewardMethod', '奖励方式') },
    { title: '固定档位', dataIndex: 'tierAmounts', width: 160, search: false },
    { title: '奖励券模板', dataIndex: 'couponTemplateId', width: 120, search: false, render: (_, record) => record.couponTemplateId ? `#${record.couponTemplateId}` : '-' },
    { title: '服务卡产品', dataIndex: 'serviceCardId', width: 120, search: false, render: (_, record) => record.serviceCardId ? `#${record.serviceCardId}` : '-' },
    { title: '作用范围', dataIndex: 'scope', width: 140, search: false , render: (value) => formatEnumText(value, 'scope', '作用范围') },
    { title: '成本承担', dataIndex: 'costOwner', width: 160, valueType: 'select', valueEnum: costBearerMap, render: (_, record) => renderStatusTag(record.costOwner, costBearerMap) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => openModal('recharge', record)}>编辑</Button>
          <Button size="small" onClick={() => updateStatus('recharge', record, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!modalType) return;
    const values = await form.validateFields();
    const payload = buildModalPayload(modalType, values as Record<string, any>);
    await saveMutation.mutateAsync({
      type: modalType,
      values: editingRecord ? ({ ...payload, id: editingRecord.id } as Record<string, unknown>) : (payload as Record<string, unknown>),
    });
    closeModal();
  };

  const totalBudget = budgets.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const modalTypeLabel = modalType === 'coupon' ? '优惠券活动' : modalType === 'invite' ? '邀请活动' : modalType === 'recharge' ? '充值活动' : '活动';

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="活动总览" subtitle="把优惠券活动、邀请活动、充值活动做成真实可维护的聚合运营页。" icon={<GiftOutlined />} />
      <WorkflowGuide
        title="活动投放闭环"
        summary="营销页要先选模板，再定范围、再定奖励、再看回收与 ROI，不能只把活动并排摆在三个 Tab 里。"
        steps={[
          { title: '券模板 / 活动模板', description: '先确定活动载体和发放规则', status: 'finish', tag: '券模板 / 固定档位' },
          { title: '范围与门店组', description: '选择门店组、跨店范围和核销边界', status: 'process', tag: '跨店活动 / 门店组' },
          { title: '奖励策略', description: '配置邀请奖励、首充赠送和预算控制', status: 'process', tag: '邀请 / 充值活动' },
          { title: '效果复盘', description: '回看到发券量、转化率、ROI 和回收规则', status: 'wait', tag: '活动复盘' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="优惠券活动" value={couponActivities.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="邀请活动" value={inviteActivities.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="充值活动" value={rechargeActivities.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动预算" value={formatAmount(totalBudget)} /></Card></Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ActivityTab)}
        items={[
          {
            key: 'coupon',
            label: '优惠券活动',
            children: (
              <ProTable<CouponTemplateRecord>
                cardBordered
                rowKey="id"
                columns={couponColumns}
                dataSource={filteredCoupons}
                loading={couponQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1800 }}
                toolBarRender={() => [<Button key="template" onClick={() => navigate('/marketing/coupon-templates')}>券模板管理</Button>, <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('coupon')}>新建券模板</Button>]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setStatus(values.status as string | undefined); }}
                onReset={() => { setKeyword(''); setStatus(undefined); }}
              />
            ),
          },
          {
            key: 'invite',
            label: '邀请裂变',
            children: (
              <ProTable<InviteActivityRecord>
                cardBordered
                rowKey="id"
                columns={inviteColumns}
                dataSource={filteredInvites}
                loading={inviteQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1720 }}
                toolBarRender={() => [<Button key="anti-fraud" onClick={() => navigate('/risk-schedule-alarms')}>防刷规则</Button>, <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('invite')}>新建邀请活动</Button>]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setStatus(values.status as string | undefined); }}
                onReset={() => { setKeyword(''); setStatus(undefined); }}
              />
            ),
          },
          {
            key: 'recharge',
            label: '充值活动',
            children: (
              <ProTable<RechargeActivityRecord>
                cardBordered
                rowKey="id"
                columns={rechargeColumns}
                dataSource={filteredRecharge}
                loading={rechargeQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1760 }}
                toolBarRender={() => [<Button key="tiers" onClick={() => navigate('/marketing/recharge-activities')}>固定档位模板</Button>, <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('recharge')}>新建充值活动</Button>]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setStatus(values.status as string | undefined); }}
                onReset={() => { setKeyword(''); setStatus(undefined); }}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="活动配置"
        title={editingRecord ? `编辑${modalTypeLabel}` : `新建${modalTypeLabel}`}
        subtitle="把活动载体、适用范围、奖励和风控拆成运营可配置字段，提交时再合并为后端需要的规则描述。"
        meta={[modalTypeLabel, editingRecord ? '编辑' : '新增']}
        open={!!modalType}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={saveMutation.isPending}
        forceRender
        destroyOnClose
        width={1120}
        okText="保存活动配置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          {modalType === 'coupon' ? (
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<TagsOutlined />} title="模板基础" desc="定义券模板编码、名称、类型和状态，作为活动投放的基础载体。">
                <div className="merchant-editor-fields">
                  <Form.Item name="templateCode" label="券模板编码" rules={[{ required: true, message: '请输入券模板编码' }]}><Input placeholder="例如：CP-NEW-202605" /></Form.Item>
                  <Form.Item name="templateName" label="券模板名称" rules={[{ required: true, message: '请输入券模板名称' }]}><Input placeholder="例如：新客首洗优惠券" /></Form.Item>
                  <Form.Item name="couponType" label="券类型"><Select options={couponTypeOptions} placeholder="请选择券类型" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={[...activityStatusOptions, { label: '启用', value: 'ENABLED' }]} placeholder="请选择状态" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<CalendarOutlined />} title="适用与门槛" desc="配置门店范围、使用门槛和库存，避免活动上线后再靠文本解释。">
                <div className="merchant-editor-fields">
                  <Form.Item name="scope" label="适用范围"><Select options={scopeOptions} placeholder="请选择适用范围" /></Form.Item>
                  <Form.Item name="thresholdType" label="使用门槛"><Select options={thresholdOptions} placeholder="请选择门槛类型" /></Form.Item>
                  <Form.Item name="thresholdAmount" label="满额门槛"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="validityType" label="有效期类型"><Select options={validityOptions} placeholder="请选择有效期类型" /></Form.Item>
                  <Form.Item name="validityDays" label="有效天数"><InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" /></Form.Item>
                  <Form.Item name="stock" label="库存"><InputNumber min={0} precision={0} addonAfter="张" style={{ width: '100%' }} placeholder="0" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<SafetyOutlined />} title="发放与叠加" desc="把发放渠道、领取限制、预算和叠加限制拆成明确选项，便于运营复核。">
                <div className="merchant-editor-fields">
                  <Form.Item name="issueChannel" label="发放方式"><Select options={issueChannelOptions} placeholder="请选择发放方式" /></Form.Item>
                  <Form.Item name="issueAudience" label="领取人群"><Select options={issueAudienceOptions} placeholder="请选择领取人群" /></Form.Item>
                  <Form.Item name="perUserLimit" label="每人限领"><InputNumber min={1} precision={0} addonAfter="张" style={{ width: '100%' }} placeholder="1" /></Form.Item>
                  <Form.Item name="totalBudget" label="预算上限"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="stackLimits" label="叠加限制"><Checkbox.Group options={stackLimitOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            </div>
          ) : null}
          {modalType === 'invite' ? (
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<TeamOutlined />} title="活动基础" desc="定义邀请活动的编码、名称和活动状态。">
                <div className="merchant-editor-fields">
                  <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input placeholder="例如：INVITE-202605" /></Form.Item>
                  <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input placeholder="例如：老带新首洗奖励" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={activityStatusOptions} placeholder="请选择状态" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<GiftOutlined />} title="达标与奖励" desc="配置被邀请人达标条件、邀请人和被邀请人的奖励内容。">
                <div className="merchant-editor-fields">
                  <Form.Item name="qualifyCondition" label="达标条件"><Select options={qualifyConditionOptions} placeholder="请选择达标条件" /></Form.Item>
                  <Form.Item name="qualifyAmount" label="消费门槛"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="qualifyDays" label="达标期限"><InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" /></Form.Item>
                  <Form.Item name="dailyLimitCount" label="每日奖励上限"><InputNumber min={0} precision={0} addonAfter="次" style={{ width: '100%' }} placeholder="0" /></Form.Item>
                  <Form.Item name="inviterRewardType" label="邀请人奖励类型"><Select options={closedRewardTypeOptions} placeholder="请选择奖励类型" /></Form.Item>
                  <Form.Item name="inviteeRewardType" label="被邀请人奖励类型"><Select options={closedRewardTypeOptions} placeholder="请选择奖励类型" /></Form.Item>
                  {inviterRewardType === 'BALANCE' ? <Form.Item name="inviterRewardAmount" label="邀请人金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="例如：10" /></Form.Item> : null}
                  {inviterRewardType === 'COUPON' ? <Form.Item name="inviterCouponTemplateId" label="邀请人券模板"><Select showSearch optionFilterProp="label" options={couponTemplateOptions} placeholder="请选择券模板" /></Form.Item> : null}
                  {(inviterRewardType === 'CARD' || inviterRewardType === 'SERVICE_CARD') ? <Form.Item name="inviterServiceCardId" label="邀请人服务卡"><Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择服务卡产品" /></Form.Item> : null}
                  {inviteeRewardType === 'BALANCE' ? <Form.Item name="inviteeRewardAmount" label="被邀请人金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="例如：10" /></Form.Item> : null}
                  {inviteeRewardType === 'COUPON' ? <Form.Item name="inviteeCouponTemplateId" label="被邀请人券模板"><Select showSearch optionFilterProp="label" options={couponTemplateOptions} placeholder="请选择券模板" /></Form.Item> : null}
                  {(inviteeRewardType === 'CARD' || inviteeRewardType === 'SERVICE_CARD') ? <Form.Item name="inviteeServiceCardId" label="被邀请人服务卡"><Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择服务卡产品" /></Form.Item> : null}
                  <Form.Item name="inviterReward" label="邀请人奖励说明"><Input placeholder="例如：邀请成功奖励，系统按上方配置发放" /></Form.Item>
                  <Form.Item name="inviteeReward" label="被邀请人奖励说明"><Input placeholder="例如：新客首单奖励，系统按上方配置发放" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<SafetyOutlined />} title="风控开关" desc="选择需要启用的防刷维度，提交后生成防刷规则。">
                <div className="merchant-editor-fields">
                  <Form.Item name="recoveryMode" label="奖励回收"><Select options={recoveryModeOptions} placeholder="请选择回收方式" /></Form.Item>
                  <Form.Item name="recoveryDays" label="回收期限"><InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="fraudChecks" label="风控开关"><Checkbox.Group options={fraudCheckOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            </div>
          ) : null}
          {modalType === 'recharge' ? (
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<WalletOutlined />} title="活动基础" desc="定义充值活动编码、名称和当前活动状态。">
                <div className="merchant-editor-fields">
                  <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input placeholder="例如：RCG-202605" /></Form.Item>
                  <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input placeholder="例如：会员充值赠送活动" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={activityStatusOptions} placeholder="请选择状态" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<CalendarOutlined />} title="充值范围" desc="配置充值方式、适用范围、成本承担和档位门槛。">
                <div className="merchant-editor-fields">
                  <Form.Item name="rechargeMode" label="充值方式"><Select options={rechargeModeOptions} placeholder="请选择充值方式" /></Form.Item>
                  <Form.Item name="scope" label="适用范围"><Select options={scopeOptions} placeholder="请选择适用范围" /></Form.Item>
                  <Form.Item name="costOwner" label="成本承担"><Select options={costBearerOptions} placeholder="请选择成本承担方" /></Form.Item>
                  <Form.Item name="tierAmounts" label="固定档位"><Select mode="multiple" options={rechargeTierOptions} placeholder="请选择充值档位" /></Form.Item>
                  <Form.Item name="minAmount" label="最低充值金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                </div>
              </BusinessEditorSection>
              <BusinessEditorSection icon={<GiftOutlined />} title="奖励规则" desc="配置奖励方式、奖励值和单人奖励上限。">
                <div className="merchant-editor-fields">
                  <Form.Item name="rewardMethod" label="奖励方式"><Select options={rewardMethodOptions} placeholder="请选择奖励方式" /></Form.Item>
                  <Form.Item name="rewardValue" label="奖励值"><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="例如：20" /></Form.Item>
                  <Form.Item name="rewardCap" label="单人奖励上限"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="rewardType" label="奖励类型"><Select mode="multiple" options={closedRewardTypeOptions} placeholder="请选择奖励类型" /></Form.Item>
                  {hasRewardType(selectedRechargeRewardType, 'COUPON') ? <Form.Item name="couponTemplateId" label="优惠券模板"><Select showSearch optionFilterProp="label" options={couponTemplateOptions} placeholder="请选择奖励券模板" /></Form.Item> : null}
                  {hasRewardType(selectedRechargeRewardType, 'CARD') || hasRewardType(selectedRechargeRewardType, 'SERVICE_CARD') ? <Form.Item name="serviceCardId" label="服务卡产品"><Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择奖励服务卡" /></Form.Item> : null}
                </div>
              </BusinessEditorSection>
            </div>
          ) : null}
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="活动详情" open={!!detail} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('templateCode' in detail ? marketingDetailFields.coupon : 'qualifyCondition' in detail ? marketingDetailFields.invite : marketingDetailFields.recharge) as DetailField<Record<string, any>>[]}
            column={1}
            labelWidth={120}
          />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default MarketingManagement;
