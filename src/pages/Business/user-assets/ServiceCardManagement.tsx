import React, { useState } from 'react';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Radio, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { WalletOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceCardStatusOptions, serviceCardTypeOptions } from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, CoreFlowPanel, formatAmount, OperatorTips, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { AppUserProfileRecord, ServiceCardFullProfileRecord, ServiceCardRecord, ServiceCardUsageRecord, ServiceOrderRecord, StoreRecord, UserServiceCardRecord } from '@/services/backendService';
import ServiceCardFullProfileDrawer from './ServiceCardFullProfileDrawer';

const cardProductTypeOptions = serviceCardTypeOptions.filter((item) => item.value === 'COUNT_CARD');
const cardTypeMap = buildValueEnum(cardProductTypeOptions);
const cardProductStatusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];
const statusMap = buildValueEnum(cardProductStatusOptions);
const userCardStatusMap = buildValueEnum(serviceCardStatusOptions);

const serviceScopeOptions = [
  { value: 'ALL_STORE', label: '全部门店可用' },
  { value: 'SELECTED_STORE', label: '指定门店可用' },
  { value: 'SERVICE_PACKAGE', label: '指定服务/套餐可用' },
  { value: 'MEMBER_LEVEL', label: '指定会员等级可用' },
];

const serviceRightOptions = [
  { value: 'CAR_WASH', label: '洗车服务' },
  { value: 'MAINTENANCE', label: '保养服务' },
  { value: 'INSPECTION', label: '检测服务' },
  { value: 'RESCUE', label: '道路救援' },
  { value: 'DISCOUNT', label: '专属折扣' },
];

const issueChannelOptions = [
  { value: 'BACKEND', label: '后台发放' },
  { value: 'PURCHASE', label: '购买后自动发放' },
  { value: 'ACTIVITY', label: '活动发放' },
  { value: 'COMPENSATION', label: '售后补偿' },
  { value: 'RECHARGE', label: '充值赠送' },
];

const issueReasonOptions = [
  { value: 'PURCHASE', label: '用户购买' },
  { value: 'ACTIVITY', label: '活动奖励' },
  { value: 'COMPENSATION', label: '售后补偿' },
  { value: 'MANUAL', label: '人工补发' },
];

const usageSceneOptions = [
  { value: 'SERVICE_ORDER', label: '服务订单核销' },
  { value: 'STORE_OFFLINE', label: '门店线下扣次' },
  { value: 'AFTER_SALES', label: '售后调整' },
  { value: 'MANUAL_CHECK', label: '人工校正' },
];

const optionLabel = (options: Array<{ value: string; label: string }>, value?: unknown) =>
  options.find((item) => item.value === value)?.label || String(value || '');

const optionLabels = (options: Array<{ value: string; label: string }>, values?: unknown) =>
  Array.isArray(values) ? values.map((value) => optionLabel(options, value)).filter(Boolean).join('、') : '';

const splitValues = (value?: unknown) => Array.isArray(value)
  ? value
  : String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

const compactJoin = (items: Array<string | false | undefined>) => items.filter(Boolean).join('；');

const buildServiceCardPayload = (values: Record<string, any>) => {
  return {
    ...values,
    rightsServices: splitValues(values.rightsServices).join(','),
    issueChannels: splitValues(values.issueChannels).join(','),
  };
};

const formatServiceScope = (record: ServiceCardRecord) => compactJoin([
  optionLabel(serviceScopeOptions, record.scopeMode),
  record.scopeNote,
]) || '-';

const formatServiceValidity = (record: ServiceCardRecord) =>
  record.validityMode === 'DAYS' ? `${record.validityDays || 0}天` : (record.validityText || '-');

const formatServiceRights = (record: ServiceCardRecord) => compactJoin([
  record.rightsServiceTimes ? `${record.rightsServiceTimes}次` : undefined,
  record.rightsDurationMinutes ? `每次${record.rightsDurationMinutes}分钟` : undefined,
  optionLabels(serviceRightOptions, splitValues(record.rightsServices)),
  record.rightsDiscount ? `${record.rightsDiscount}折` : undefined,
  record.rightsTransferable ? '可转赠' : undefined,
  record.rightsNote,
]) || '-';

const formatIssueRule = (record: ServiceCardRecord) => compactJoin([
  optionLabels(issueChannelOptions, splitValues(record.issueChannels)),
  record.issueLimitPerUser ? `每人${record.issueLimitPerUser}张` : '不限张数',
  record.issueNeedApproval ? '需审批' : '免审批',
  record.issueAutoNotify ? '自动通知' : undefined,
  record.issueNote,
]) || '-';

const buildIssuePayload = (values: Record<string, any>) => {
  const { issueReason, approvalRequired, notifyUser, issueRemark, ...payload } = values;
  return {
    ...payload,
    remark: compactJoin([
      issueReason && `发放原因：${optionLabel(issueReasonOptions, issueReason)}`,
      approvalRequired ? '需要审批' : '无需审批',
      notifyUser ? '通知用户' : '不通知用户',
      issueRemark && `说明：${issueRemark}`,
    ]),
  };
};

const buildDeductPayload = (values: Record<string, any>) => {
  const { usageScene, notifyUser, operatorConfirm, deductRemark, ...payload } = values;
  return {
    ...payload,
    remark: compactJoin([
      usageScene && `扣次场景：${optionLabel(usageSceneOptions, usageScene)}`,
      operatorConfirm && '已核对服务完成',
      notifyUser ? '通知用户' : '不通知用户',
      deductRemark && `说明：${deductRemark}`,
    ]),
  };
};

const buildCardDefaults = (cardType: string) => ({
  cardType,
  status: 'ENABLED',
  stock: 0,
  salePrice: 0,
  scopeMode: 'ALL_STORE',
  validityMode: 'DAYS',
  validityDays: 365,
  rightsServiceTimes: 10,
  rightsDurationMinutes: 30,
  rightsServices: ['CAR_WASH'],
  issueChannels: ['BACKEND', 'PURCHASE'],
  issueNeedApproval: false,
  issueAutoNotify: true,
});

const serviceCardDetailFields: DetailField<ServiceCardRecord>[] = [
  { name: 'cardCode', label: '编码' },
  { name: 'cardName', label: '名称' },
  { name: 'cardType', label: '类型', render: (value) => cardTypeMap[value as keyof typeof cardTypeMap]?.text || value },
  { name: 'scopeMode', label: '作用范围', render: (_, record) => formatServiceScope(record) },
  { name: 'rightsServiceTimes', label: '权益内容', render: (_, record) => formatServiceRights(record) },
  { name: 'salePrice', label: '售价', render: (value) => formatAmount(value) },
  { name: 'validityMode', label: '有效期', render: (_, record) => formatServiceValidity(record) },
  { name: 'stock', label: '库存' },
  { name: 'issueChannels', label: '发放规则', render: (_, record) => formatIssueRule(record) },
  { name: 'status', label: '状态', render: (value) => statusMap[value as keyof typeof statusMap]?.text || value },
];

const userServiceCardDetailFields: DetailField<UserServiceCardRecord>[] = [
  { name: 'cardNo', label: '用户卡号' },
  { name: 'cardName', label: '卡名称' },
  { name: 'userName', label: '用户' },
  { name: 'phone', label: '手机号' },
  { name: 'totalTimes', label: '总次数' },
  { name: 'remainTimes', label: '剩余次数' },
  { name: 'validFrom', label: '有效期开始' },
  { name: 'validTo', label: '有效期结束' },
  { name: 'status', label: '状态', render: (value) => userCardStatusMap[value as keyof typeof userCardStatusMap]?.text || value },
];

const serviceCardUsageDetailFields: DetailField<ServiceCardUsageRecord>[] = [
  { name: 'cardNo', label: '用户卡号' },
  { name: 'serviceOrderNo', label: '服务订单' },
  { name: 'storeName', label: '门店' },
  { name: 'useTimes', label: '使用次数' },
  { name: 'usedAt', label: '使用时间' },
  { name: 'remark', label: '备注' },
];

const ServiceCardManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Record<string, any>>();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fullProfile, setFullProfile] = useState<ServiceCardFullProfileRecord | undefined>();
  const [editingRecord, setEditingRecord] = useState<ServiceCardRecord | null>(null);
  const [detail, setDetail] = useState<ServiceCardRecord | UserServiceCardRecord | ServiceCardUsageRecord | null>(null);
  const [issueVisible, setIssueVisible] = useState(false);
  const [deductVisible, setDeductVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState<ServiceCardRecord | null>(null);
  const [currentUserCard, setCurrentUserCard] = useState<UserServiceCardRecord | null>(null);
  const [issueForm] = Form.useForm();
  const [deductForm] = Form.useForm();
  const cardQuery = useQuery({
    queryKey: ['serviceCards', keyword, typeFilter, statusFilter],
    queryFn: async () => (await api.asset.serviceCards.page({ pageNum: 1, pageSize: 200, keyword, cardType: typeFilter, status: statusFilter })).data,
  });
  const userCardQuery = useQuery({
    queryKey: ['userServiceCards', keyword],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const usageQuery = useQuery({
    queryKey: ['serviceCardUsages', keyword],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const userQuery = useQuery({
    queryKey: ['serviceCardIssueUsers'],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const storeQuery = useQuery({
    queryKey: ['serviceCardDeductStores'],
    queryFn: async () => (await api.store.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const orderQuery = useQuery({
    queryKey: ['serviceCardDeductOrders'],
    queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => editingRecord?.id ? api.asset.serviceCards.edit({ ...values, id: editingRecord.id }) : api.asset.serviceCards.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      message.success(editingRecord ? '卡产品已更新' : '卡产品已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: async (record: ServiceCardRecord) => api.asset.serviceCards.changeStatus(record.id, record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      message.success('卡产品状态已更新');
    },
  });

  const confirmCardStatus = (record: ServiceCardRecord) => {
    const nextStatus = record.status === 'ENABLED' ? '停用' : '启用';
    showBusinessConfirm({
      title: `确认${nextStatus}卡产品`,
      content: `确定${nextStatus}「${record.cardName}」吗？该操作会影响用户购买和发放。`,
      okText: `确认${nextStatus}`,
      danger: nextStatus === '停用',
      onOk: () => statusMutation.mutate(record),
    });
  };

  const confirmRollbackUsage = (record: ServiceCardUsageRecord) => {
    showBusinessConfirm({
      title: '确认回滚扣次',
      content: `确定回滚使用流水「${record.usageNo || record.serviceOrderNo || record.id}」吗？回滚后用户卡次数会恢复。`,
      okText: '确认回滚',
      onOk: async () => {
        await api.asset.serviceCardUsages.rollback(record.id, { remark: '后台回滚扣次' });
        queryClient.invalidateQueries({ queryKey: ['serviceCardUsages'] });
        queryClient.invalidateQueries({ queryKey: ['userServiceCards'] });
        message.success('扣次已回滚');
      },
    });
  };
  const issueMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.asset.serviceCards.issue(Number(currentCard?.id), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceCards'] });
      message.success('服务卡已发放');
    },
  });
  const deductMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.asset.userServiceCards.deduct(Number(currentUserCard?.id), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userServiceCards'] });
      queryClient.invalidateQueries({ queryKey: ['serviceCardUsages'] });
      message.success('扣次已完成');
    },
  });

  const cards = cardQuery.data?.records || [];
  const userCards = userCardQuery.data?.records || [];
  const usageRecords = usageQuery.data?.records || [];
  const users = userQuery.data?.records || [];
  const stores = storeQuery.data?.records || [];
  const serviceOrders = orderQuery.data?.records || [];
  const userOptions = users.map((item: AppUserProfileRecord) => ({
    value: item.userId ?? item.id,
    label: `${item.userName}${item.mobile ? `（${item.mobile}）` : ''}`,
  }));
  const storeOptions = stores.map((item: StoreRecord) => ({
    value: item.id,
    label: `${item.storeName}${item.storeCode ? `（${item.storeCode}）` : ''}`,
  }));
  const orderOptions = serviceOrders.map((item: ServiceOrderRecord) => ({
    value: item.orderNo,
    label: `${item.orderNo} / ${item.storeName || '未记录门店'} / ${item.userName || '未记录用户'}`,
  }));

  const openIssue = (record: ServiceCardRecord) => {
    setCurrentCard(record);
    issueForm.resetFields();
    issueForm.setFieldsValue({
      totalTimes: record.rightsServiceTimes || 1,
      remainTimes: record.rightsServiceTimes || 1,
      validDays: record.validityDays || 365,
      sourceBizNo: 'BACKEND',
      issueReason: 'MANUAL',
      approvalRequired: false,
      notifyUser: true,
    });
    setIssueVisible(true);
  };

  const openCreateCard = (cardType: string) => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue(buildCardDefaults(cardType));
    setModalVisible(true);
  };

  const openDeduct = (record: UserServiceCardRecord) => {
    setCurrentUserCard(record);
    deductForm.resetFields();
    deductForm.setFieldsValue({ cardNo: record.cardNo, userName: record.userName, deductCount: 1, usageScene: 'SERVICE_ORDER', notifyUser: true, operatorConfirm: true });
    setDeductVisible(true);
  };

  const openFullProfile = async (record: ServiceCardRecord) => {
    setProfileVisible(true);
    setProfileLoading(true);
    try {
      const res = await api.asset.serviceCards.fullProfile(record.id);
      setFullProfile(res.data);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const columns: ProColumns<ServiceCardRecord>[] = [
    {
      title: '卡产品',
      dataIndex: 'cardName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.cardName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.cardCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡名称 / 编码 / 范围 / 权益' } },
    {
      title: '卡类型',
      dataIndex: 'cardType',
      width: 120,
      valueType: 'select',
      valueEnum: cardTypeMap,
      render: (_, record) => renderStatusTag(record.cardType, cardTypeMap),
    },
    { title: '作用范围', dataIndex: 'scopeMode', width: 190, search: false, render: (_, record) => formatServiceScope(record) },
    { title: '权益内容', dataIndex: 'rightsServiceTimes', width: 260, search: false, render: (_, record) => formatServiceRights(record) },
    { title: '售价', dataIndex: 'salePrice', width: 120, search: false, render: (_, record) => formatAmount(record.salePrice) },
    { title: '有效期', dataIndex: 'validityMode', width: 120, search: false, render: (_, record) => formatServiceValidity(record) },
    { title: '发放规则', dataIndex: 'issueChannels', width: 240, search: false, render: (_, record) => formatIssueRule(record) },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openFullProfile(record)}>档案</Button>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({
                ...record,
                rightsServices: splitValues(record.rightsServices),
                issueChannels: splitValues(record.issueChannels),
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            loading={statusMutation.isPending}
            onClick={() => confirmCardStatus(record)}
          >
            {record.status === 'ENABLED' ? '停用' : '启用'}
          </Button>
          <Button
            size="small"
            disabled={record.status !== 'ENABLED' || Number(record.stock || 0) <= 0}
            title={record.status !== 'ENABLED' ? '卡产品启用后才能发卡' : Number(record.stock || 0) <= 0 ? '库存大于 0 后才能发卡' : undefined}
            onClick={() => openIssue(record)}
          >
            发卡
          </Button>
        </Space>
      ),
    },
  ];

  const userCardColumns: ProColumns<UserServiceCardRecord>[] = [
    { title: '用户卡号', dataIndex: 'cardNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡号 / 卡名称 / 用户 / 手机号' } },
    { title: '卡名称', dataIndex: 'cardName', width: 160, search: false },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '总次数', dataIndex: 'totalTimes', width: 100, search: false },
    { title: '剩余次数', dataIndex: 'remainTimes', width: 100, search: false },
    { title: '有效期开始', dataIndex: 'validFrom', width: 120, search: false },
    { title: '有效期结束', dataIndex: 'validTo', width: 120, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: userCardStatusMap, render: (_, record) => renderStatusTag(record.status, userCardStatusMap) },
    { title: '操作', width: 150, search: false, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button
          size="small"
          disabled={record.status !== 'USING' || Number(record.remainTimes || 0) <= 0}
          title={record.status !== 'USING' ? '使用中的服务卡才能扣次' : Number(record.remainTimes || 0) <= 0 ? '剩余次数不足，不能扣次' : undefined}
          onClick={() => openDeduct(record)}
        >
          扣次
        </Button>
      </Space>
    ) },
  ];

  const usageColumns: ProColumns<ServiceCardUsageRecord>[] = [
    { title: '用户卡号', dataIndex: 'cardNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡号 / 订单 / 门店 / 备注' } },
    { title: '服务订单', dataIndex: 'serviceOrderNo', width: 180, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '使用次数', dataIndex: 'useTimes', width: 100, search: false },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, search: false },
    { title: '备注', dataIndex: 'remark', width: 220, search: false },
    { title: '操作', width: 150, search: false, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" onClick={() => confirmRollbackUsage(record)}>回滚</Button>
      </Space>
    ) },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveMutation.mutateAsync(buildServiceCardPayload(values));
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="次卡" subtitle="维护次卡的产品配置、单次分钟数、售价、发放规则和上下架状态。" icon={<WalletOutlined />} />
      <CoreFlowPanel
        title="权益次卡产品闭环"
        subtitle="权益产品要同时串起产品配置、可售库存、用户持卡、核销流水和充值活动赠送，避免只维护卡面规则却无法追踪发放与消耗。"
        config={[
          { label: '权益定义', desc: '维护次数、单次分钟数、适用服务、有效期和范围，是购买、发放和扣次的统一口径。', tag: '产品' },
          { label: '库存与状态', desc: '库存决定能否继续发卡，状态决定后续售卖/发放，不影响用户已持有权益。', tag: '控制' },
          { label: '发放渠道', desc: '后台发放、购买自动发放、充值赠送和活动奖励需要在同一产品上留痕。', tag: '渠道' },
        ]}
        landing={[
          { label: '用户持卡', desc: '每张用户卡记录总次数、剩余次数、有效期和来源单号。' },
          { label: '核销流水', desc: '每次服务订单或人工扣次都写入使用记录，支持售后回滚。' },
          { label: '充值套餐', desc: '充值活动可引用次卡作为赠送权益，需确认卡产品启用且库存充足。' },
        ]}
        verify={[
          { label: '上架前', desc: '确认权益次数、有效期、适用范围、发放渠道和库存配置完整。' },
          { label: '发卡后', desc: '查看用户持卡和核销流水，确认次数与有效期符合产品规则。' },
          { label: '活动引用', desc: '被充值套餐赠送时，先检查卡产品是否启用并保留充足库存。' },
        ]}
      />
      <OperatorTips
        items={[
          { label: '新建产品', desc: '填写售价、次数、单次分钟数、有效期、适用门店和可用服务。', tag: '产品' },
          { label: '上架/停用', desc: '上架后可购买或发放；停用只影响后续发放，不应影响用户已持有卡。', tag: '状态' },
          { label: '人工发放', desc: '售后补偿、活动奖励和人工补发都走“发卡”，备注要写清业务原因。', tag: '发放' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="卡产品" value={cards.length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="次卡" value={cards.filter((item) => item.cardType === 'COUNT_CARD').length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="总次数" value={cards.reduce((sum, item) => sum + Number(item.rightsServiceTimes || 0), 0)} suffix="次" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="可售库存" value={cards.reduce((sum, item) => sum + Number(item.stock || 0), 0)} suffix="份" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'product',
            label: '卡产品',
            children: (
              <ProTable<ServiceCardRecord>
                cardBordered
                rowKey="id"
                columns={columns}
                dataSource={cards}
                loading={cardQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1780 }}
                toolBarRender={() => [
                  <Button
                    key="count"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openCreateCard('COUNT_CARD')}
                  >
                    新建次卡
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setKeyword(String(values.keyword || ''));
                  setTypeFilter(values.cardType as string | undefined);
                  setStatusFilter(values.status as string | undefined);
                }}
                onReset={() => {
                  setKeyword('');
                  setTypeFilter(undefined);
                  setStatusFilter(undefined);
                }}
              />
            ),
          },
          {
            key: 'userCard',
            label: '用户服务卡',
            children: (
              <ProTable<UserServiceCardRecord>
                cardBordered
                rowKey="id"
                columns={userCardColumns}
                dataSource={userCards}
                loading={userCardQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1480 }}
              />
            ),
          },
          {
            key: 'usage',
            label: '使用记录',
            children: (
              <ProTable<ServiceCardUsageRecord>
                cardBordered
                rowKey="id"
                columns={usageColumns}
                dataSource={usageRecords}
                loading={usageQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1320 }}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '卡产品维护' : '卡产品新增'}
        title={editingRecord ? `编辑卡产品 · ${editingRecord.cardName}` : '新建卡产品'}
        subtitle="维护卡产品编码、权益、售价、有效期和上下架状态，确保发卡与扣次使用同一套配置。"
        meta={[editingRecord ? '编辑模式' : '新建模式', '卡产品']}
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saveMutation.isPending}
        width={860}
        forceRender
        destroyOnClose
        okText={editingRecord ? '保存变更' : '保存卡产品'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<WalletOutlined />} title="卡产品基础" desc="维护卡产品编码、名称、类型和上下架状态，作为发卡和用户服务卡的统一来源。">
              <div className="merchant-editor-fields">
                <Form.Item name="cardCode" label="卡产品编码" rules={[{ required: true, message: '请输入卡产品编码' }]}>
                  <Input placeholder="例如：CARD-SERVICE-001" />
                </Form.Item>
                <Form.Item name="cardName" label="卡名称" rules={[{ required: true, message: '请输入卡名称' }]}>
                  <Input placeholder="例如：10 次洗车卡" />
                </Form.Item>
                <Form.Item name="cardType" label="卡类型" rules={[{ required: true, message: '请选择卡类型' }]}>
                  <Select options={cardProductTypeOptions} placeholder="请选择卡类型" />
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select options={cardProductStatusOptions} placeholder="请选择状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<WalletOutlined />} title="售卖与适用范围" desc="补齐售价、有效期、库存和适用范围，支撑后续发卡、售卖和扣次。">
              <div className="merchant-editor-fields">
                <Form.Item name="scopeMode" label="适用范围">
                  <Select options={serviceScopeOptions} placeholder="请选择适用范围" />
                </Form.Item>
                <Form.Item name="salePrice" label="售价">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="0.00" />
                </Form.Item>
                <Form.Item name="validityMode" label="有效期方式">
                  <Radio.Group optionType="button" options={[{ value: 'DAYS', label: '按天数' }, { value: 'TEXT', label: '固定说明' }]} />
                </Form.Item>
                <Form.Item name="stock" label="库存">
                  <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="可售库存" />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.validityMode !== next.validityMode}>
                  {({ getFieldValue }) => getFieldValue('validityMode') === 'TEXT' ? (
                    <Form.Item name="validityText" label="有效期说明">
                      <Input placeholder="例如：2026-12-31 前有效" />
                    </Form.Item>
                  ) : (
                    <Form.Item name="validityDays" label="有效天数">
                      <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="天" placeholder="365" />
                    </Form.Item>
                  )}
                </Form.Item>
                <Form.Item name="scopeNote" label="范围补充">
                  <Input placeholder="指定门店、服务套餐或会员等级名称" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<WalletOutlined />} title="权益与规则" desc="记录权益内容和发放规则，便于运营、客服和发卡动作统一理解。">
              <div className="merchant-editor-fields">
                <Form.Item name="rightsServiceTimes" label="权益次数">
                  <InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="次" placeholder="例如：10" />
                </Form.Item>
                <Form.Item name="rightsDurationMinutes" label="单次分钟数" rules={[{ required: true, message: '请输入单次可用分钟数' }]}>
                  <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="分钟" placeholder="例如：30" />
                </Form.Item>
                <Form.Item name="rightsServices" label="适用权益">
                  <Select mode="multiple" options={serviceRightOptions} placeholder="请选择可用权益" />
                </Form.Item>
                <Form.Item name="rightsDiscount" label="专属折扣">
                  <InputNumber style={{ width: '100%' }} min={0} max={10} precision={1} addonAfter="折" placeholder="例如：8.5" />
                </Form.Item>
                <Form.Item name="issueChannels" label="发放方式">
                  <Select mode="multiple" options={issueChannelOptions} placeholder="请选择发放方式" />
                </Form.Item>
                <Form.Item name="issueLimitPerUser" label="每人限领">
                  <InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="张" placeholder="不填表示不限" />
                </Form.Item>
                <Form.Item name="rightsTransferable" label="转赠设置" valuePropName="checked">
                  <Checkbox>允许用户转赠</Checkbox>
                </Form.Item>
                <Form.Item name="issueNeedApproval" label="审批要求" valuePropName="checked">
                  <Checkbox>发放前需要审批</Checkbox>
                </Form.Item>
                <Form.Item name="issueAutoNotify" label="通知设置" valuePropName="checked">
                  <Checkbox>发放成功后通知用户</Checkbox>
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="rightsNote" label="权益补充说明">
                  <Input placeholder="例如：节假日可用、需提前预约" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="issueNote" label="发放补充说明">
                  <Input placeholder="例如：仅限客服工单审批后发放" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <ServiceCardFullProfileDrawer
        open={profileVisible}
        loading={profileLoading}
        profile={fullProfile}
        onClose={() => {
          setProfileVisible(false);
          setFullProfile(undefined);
        }}
      />

      <BusinessDetailModal title={detail && 'serviceOrderNo' in detail ? '使用记录详情' : detail && 'cardNo' in detail ? '用户服务卡详情' : '卡产品详情'} open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('serviceOrderNo' in detail ? serviceCardUsageDetailFields : 'cardNo' in detail ? userServiceCardDetailFields : serviceCardDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={100}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="服务卡发放"
        title={`发放服务卡 · ${currentCard?.cardName || ''}`}
        subtitle="把卡产品发到用户名下，并同步记录总次数、剩余次数、有效期和来源单号。"
        meta={[currentCard?.cardType || '卡产品', currentCard?.status || '']}
        open={issueVisible}
        onCancel={() => setIssueVisible(false)}
        onOk={async () => {
          const values = await issueForm.validateFields();
          await issueMutation.mutateAsync(buildIssuePayload(values));
          setIssueVisible(false);
        }}
        confirmLoading={issueMutation.isPending}
        width={760}
      >
        <Form form={issueForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<WalletOutlined />} title="发放对象" desc="先确认用户，再补齐手机号和来源单号，保证发放记录可追溯。">
              <div className="merchant-editor-fields">
                <Form.Item name="userId" label="用户" rules={[{ required: true, message: '请选择用户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={userOptions}
                    placeholder="请选择用户"
                    onChange={(value) => {
                      const user = users.find((item) => (item.userId ?? item.id) === value);
                      issueForm.setFieldsValue({ userName: user?.userName, phone: user?.mobile });
                    }}
                  />
                </Form.Item>
                <Form.Item name="userName" hidden><Input /></Form.Item>
                <Form.Item name="phone" label="手机号"><Input disabled placeholder="选择用户后自动带出" /></Form.Item>
                <Form.Item name="sourceBizNo" label="来源单号"><Input placeholder="客服工单 / 活动 / 订单号" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<WalletOutlined />} title="次数与期限" desc="记录总次数、剩余次数和有效天数，形成用户服务卡闭环。">
              <div className="merchant-editor-fields">
                <Form.Item name="totalTimes" label="总次数" rules={[{ required: true, message: '请输入总次数' }]}><InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="次" placeholder="请输入总次数" /></Form.Item>
                <Form.Item name="remainTimes" label="剩余次数"><InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="次" placeholder="默认可与总次数一致" /></Form.Item>
                <Form.Item name="validDays" label="有效天数"><InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="天" placeholder="例如：365" /></Form.Item>
                <Form.Item name="issueReason" label="发放原因" rules={[{ required: true, message: '请选择发放原因' }]}><Select options={issueReasonOptions} placeholder="请选择发放原因" /></Form.Item>
                <Form.Item name="approvalRequired" label="审批要求" valuePropName="checked"><Checkbox>本次发放需要审批</Checkbox></Form.Item>
                <Form.Item name="notifyUser" label="通知设置" valuePropName="checked"><Checkbox>发放成功后通知用户</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="issueRemark" label="发放补充说明"><Input placeholder="填写工单、活动或客服补充说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="服务卡扣次"
        title={`服务卡扣次 · ${currentUserCard?.cardNo || ''}`}
        subtitle="扣减用户服务卡次数，并保留订单、门店和备注，方便售后回溯。"
        meta={[currentUserCard?.cardName || '用户服务卡', currentUserCard?.status || '']}
        open={deductVisible}
        onCancel={() => setDeductVisible(false)}
        onOk={async () => {
          const values = await deductForm.validateFields();
          await deductMutation.mutateAsync(buildDeductPayload(values));
          setDeductVisible(false);
        }}
        confirmLoading={deductMutation.isPending}
        width={760}
      >
        <Form form={deductForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<WalletOutlined />} title="扣次对象" desc="卡号和用户信息保持只读，确保操作对象明确。">
              <div className="merchant-editor-fields">
                <Form.Item name="cardNo" label="用户卡号"><Input disabled /></Form.Item>
                <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
                <Form.Item name="serviceOrderNo" label="服务订单号">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={orderOptions}
                    placeholder="选择对应服务订单"
                    onChange={(value) => {
                      const order = serviceOrders.find((item) => item.orderNo === value);
                      deductForm.setFieldsValue({ storeId: order?.storeId, storeName: order?.storeName });
                    }}
                  />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<WalletOutlined />} title="扣次信息" desc="记录扣减次数、门店和备注，支撑服务卡核销闭环。">
              <div className="merchant-editor-fields">
                <Form.Item name="deductCount" label="扣减次数" rules={[{ required: true, message: '请输入扣减次数' }]}><InputNumber style={{ width: '100%' }} min={1} max={currentUserCard?.remainTimes && currentUserCard.remainTimes > 0 ? currentUserCard.remainTimes : undefined} precision={0} addonAfter="次" placeholder="请输入扣减次数" /></Form.Item>
                <Form.Item name="storeId" label="门店">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions}
                    placeholder="请选择扣次门店"
                    onChange={(value) => {
                      const store = stores.find((item) => item.id === value);
                      deductForm.setFieldsValue({ storeName: store?.storeName });
                    }}
                  />
                </Form.Item>
                <Form.Item name="storeName" hidden><Input /></Form.Item>
                <Form.Item name="usageScene" label="扣次场景" rules={[{ required: true, message: '请选择扣次场景' }]}><Select options={usageSceneOptions} placeholder="请选择扣次场景" /></Form.Item>
                <Form.Item name="operatorConfirm" label="服务确认" valuePropName="checked"><Checkbox>已核对服务完成</Checkbox></Form.Item>
                <Form.Item name="notifyUser" label="通知设置" valuePropName="checked"><Checkbox>扣次后通知用户</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="deductRemark" label="扣次补充说明"><Input placeholder="记录门店、客服或售后补充说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ServiceCardManagement;
