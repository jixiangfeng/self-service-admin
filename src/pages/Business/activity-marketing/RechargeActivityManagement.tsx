import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { CalendarOutlined, GiftOutlined, PlusOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { activityRewardStatusOptions, activityStatusOptions, costBearerOptions, rewardTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, { type RechargeActivityRecord, type SelectOptionRecord } from '@/services/backendService';

const statusMap = buildValueEnum(activityStatusOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const closedRewardTypeOptions = rewardTypeOptions.filter((item) => item.value !== 'POINTS');
const rechargeModeOptions = [
  { label: '固定档位充值', value: '固定档位充值' },
  { label: '任意金额充值', value: '任意金额充值' },
  { label: '首充专享', value: '首充专享' },
];
const scopeOptions = [
  { label: '全部门店', value: '全部门店' },
  { label: '指定门店组', value: '指定门店组' },
  { label: '新客专享', value: '新客专享' },
  { label: '会员专享', value: '会员专享' },
];
const rewardMethodOptions = [
  { label: '赠送余额', value: '赠送余额' },
  { label: '赠送优惠券', value: '赠送优惠券' },
  { label: '赠送积分', value: '赠送积分' },
];
const rechargeTierOptions = [
  { label: '50 元', value: '50' },
  { label: '100 元', value: '100' },
  { label: '200 元', value: '200' },
  { label: '500 元', value: '500' },
  { label: '1000 元', value: '1000' },
];

const splitMultiValue = (value?: string) => String(value || '').split(/[;；,，]/).map((item) => item.trim()).filter(Boolean);
const joinMultiValue = (value: unknown, separator = '；') => Array.isArray(value) ? value.join(separator) : String(value || '');
const tierGiftAmount = (values: Record<string, any>) => {
  const rewardCap = Number(values.rewardCap);
  if (Number.isFinite(rewardCap) && rewardCap > 0) return rewardCap;
  const rewardValue = Number(values.rewardValue);
  return Number.isFinite(rewardValue) && rewardValue > 0 ? rewardValue : 0;
};
const buildRechargeTierAmounts = (values: Record<string, any>) => {
  const amounts = Array.isArray(values.tierAmounts) ? values.tierAmounts : [];
  const gift = tierGiftAmount(values);
  return JSON.stringify(amounts.map((amount) => ({ amount: Number(amount), gift })));
};
const parseRechargeTierAmounts = (value?: string) => {
  if (!value) return [];
  try {
    const tiers = JSON.parse(value);
    return Array.isArray(tiers)
      ? tiers.map((item) => String(item?.amount ?? '')).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};
const formatRechargeTierAmounts = (value?: string) => {
  const amounts = parseRechargeTierAmounts(value);
  return amounts.length ? amounts.map((amount) => `${amount} 元`).join(' / ') : '-';
};
const buildRechargePayload = (values: Record<string, any>) => ({
  ...values,
  tierAmounts: buildRechargeTierAmounts(values),
  rewardType: joinMultiValue(values.rewardType),
});
const hasRewardType = (value: unknown, target: string) => Array.isArray(value)
  ? value.includes(target)
  : String(value || '').split(/[;；,，]/).map((item) => item.trim()).includes(target);

const rechargeDetailFields: DetailField<RechargeActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'rechargeMode', label: '充值方式' },
  { name: 'costOwner', label: '成本承担', render: (value) => value ? costBearerMap[value as keyof typeof costBearerMap]?.text || value : '-' },
  { name: 'tierAmounts', label: '固定档位', render: (value) => formatRechargeTierAmounts(value as string | undefined) },
  { name: 'minAmount', label: '最低充值金额' },
  { name: 'rewardMethod', label: '奖励方式' },
  { name: 'rewardValue', label: '奖励值' },
  { name: 'couponTemplateId', label: '奖励券模板' },
  { name: 'serviceCardId', label: '奖励服务卡' },
  { name: 'rewardCap', label: '单人奖励上限' },
  { name: 'rewardStatus', label: '发放状态', render: (value) => value ? rewardStatusMap[value as keyof typeof rewardStatusMap]?.text || value : '-' },
  { name: 'issuedCount', label: '发放数量' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const RechargeActivityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RechargeActivityRecord>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RechargeActivityRecord | null>(null);
  const [detail, setDetail] = useState<RechargeActivityRecord | null>(null);

  const activityQuery = useQuery({
    queryKey: ['rechargeActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.rechargeActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const couponTemplateOptionsQuery = useQuery({ queryKey: ['rechargeActivityCouponTemplateOptions'], queryFn: async () => (await api.marketing.couponTemplates.options({ status: 'ENABLED' })).data });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['rechargeActivityServiceCardOptions'], queryFn: async () => (await api.asset.serviceCards.options({ status: 'ENABLED' })).data });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.rechargeActivities.edit(values);
      } else {
        await api.marketing.rechargeActivities.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechargeActivities'] });
      message.success(editingRecord ? '充值活动已更新' : '充值活动已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: RechargeActivityRecord) => api.marketing.rechargeActivities.edit({ ...record, status: record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechargeActivities'] });
      message.success('充值活动状态已更新');
    },
  });

  const records = activityQuery.data?.records || [];
  const couponTemplateOptions = (couponTemplateOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceCardOptions = (serviceCardOptionsQuery.data || []) as SelectOptionRecord[];
  const selectedRewardType = Form.useWatch('rewardType', form);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.activityCode, item.activityName, item.rechargeMode, item.rewardMethod, item.tierAmounts, item.scope]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const columns: ProColumns<RechargeActivityRecord>[] = [
    {
      title: '活动',
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
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动 / 编码 / 充值门槛 / 奖励 / 范围' } },
    { title: '充值方式', dataIndex: 'rechargeMode', width: 160, search: false , render: (value) => formatEnumText(value, 'rechargeMode', '充值方式') },
    { title: '奖励方式', dataIndex: 'rewardMethod', width: 160, search: false , render: (value) => formatEnumText(value, 'rewardMethod', '奖励方式') },
    { title: '作用范围', dataIndex: 'scope', width: 160, search: false , render: (value) => formatEnumText(value, 'scope', '作用范围') },
    { title: '成本承担', dataIndex: 'costOwner', width: 160, valueType: 'select', valueEnum: costBearerMap, render: (_, record) => renderStatusTag(record.costOwner, costBearerMap) },
    { title: '固定档位', dataIndex: 'tierAmounts', width: 160, search: false, render: (value) => formatRechargeTierAmounts(value as string | undefined) },
    { title: '最低充值', dataIndex: 'minAmount', width: 100, search: false },
    { title: '奖励值', dataIndex: 'rewardValue', width: 160, search: false },
    { title: '奖励券模板', dataIndex: 'couponTemplateId', width: 120, search: false, render: (_, record) => record.couponTemplateId ? `#${record.couponTemplateId}` : '-' },
    { title: '服务卡产品', dataIndex: 'serviceCardId', width: 120, search: false, render: (_, record) => record.serviceCardId ? `#${record.serviceCardId}` : '-' },
    { title: '发放状态', dataIndex: 'rewardStatus', width: 120, valueType: 'select', valueEnum: rewardStatusMap, render: (_, record) => renderStatusTag(record.rewardStatus, rewardStatusMap) },
    { title: '发放数', dataIndex: 'issuedCount', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => { setEditingRecord(record); form.setFieldsValue({ ...record, tierAmounts: parseRechargeTierAmounts(record.tierAmounts), rewardType: splitMultiValue(record.rewardType) } as any); setModalVisible(true); }}>编辑</Button>
          <Button
            size="small"
            onClick={() => {
              statusMutation.mutate(record);
            }}
          >
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = buildRechargePayload(values as Record<string, any>);
    if (editingRecord) {
      await saveMutation.mutateAsync({ ...payload, id: editingRecord.id } as Record<string, unknown>);
    } else {
      await saveMutation.mutateAsync(payload as Record<string, unknown>);
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="充值活动" subtitle="补齐固定档位、赠送规则、成本承担和状态控制能力。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="充值活动" value={activityQuery.data?.total ?? records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="固定档位" value={records.reduce((sum, item) => sum + parseRechargeTierAmounts(item.tierAmounts).length, 0)} suffix="档" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="首充礼包" value={records.filter((item) => item.activityName.includes('首充')).length} suffix="套" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="赠送规则" value={records.filter((item) => item.rewardMethod || item.rewardValue).length} suffix="类" /></Card></Col>
      </Row>

      <ProTable<RechargeActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1860 }}
        toolBarRender={() => [
          <Button key="tiers" onClick={() => {
            setEditingRecord(null);
            form.resetFields();
            form.setFieldsValue({ status: 'DRAFT', tierAmounts: ['50', '100', '200', '500'], rechargeMode: '固定档位充值', rewardMethod: '赠送余额', rewardStatus: 'PENDING', scope: '全部门店' } as any);
            setModalVisible(true);
          }}>固定档位</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT', tierAmounts: ['50', '100', '200'], rechargeMode: '固定档位充值', rewardMethod: '赠送余额', rewardStatus: 'PENDING', scope: '全部门店' } as any); setModalVisible(true); }}>
            新建充值活动
          </Button>,
        ]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setStatusFilter(undefined);
        }}
      />

      <BusinessEditorModal
        eyebrow="充值活动配置"
        title={editingRecord ? `编辑充值活动 · ${editingRecord.activityName}` : '新建充值活动'}
        subtitle="把充值档位、适用范围、成本承担、奖励内容和发放状态拆成可配置字段，方便运营维护。"
        meta={[editingRecord ? '编辑' : '新增', '充值营销']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={saveMutation.isPending}
        onCancel={closeModal}
        width={1120}
        okText="保存充值活动"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<WalletOutlined />} title="活动基础" desc="定义充值活动编码、名称和活动状态。">
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
            <BusinessEditorSection icon={<GiftOutlined />} title="奖励发放" desc="配置奖励方式、奖励类型、奖励值、发放数量和单人上限。">
              <div className="merchant-editor-fields">
                <Form.Item name="rewardMethod" label="奖励方式"><Select options={rewardMethodOptions} placeholder="请选择奖励方式" /></Form.Item>
                <Form.Item name="rewardValue" label="奖励值"><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="例如：20" /></Form.Item>
                <Form.Item name="rewardStatus" label="发放状态"><Select options={activityRewardStatusOptions} placeholder="请选择发放状态" /></Form.Item>
                <Form.Item name="issuedCount" label="发放数量"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="rewardCap" label="单人奖励上限"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="rewardType" label="奖励类型"><Select mode="multiple" options={closedRewardTypeOptions} placeholder="请选择奖励类型" /></Form.Item>
                {hasRewardType(selectedRewardType, 'COUPON') ? (
                  <Form.Item name="couponTemplateId" label="优惠券模板"><Select showSearch optionFilterProp="label" options={couponTemplateOptions} placeholder="请选择奖励券模板" /></Form.Item>
                ) : null}
                {hasRewardType(selectedRewardType, 'CARD') || hasRewardType(selectedRewardType, 'SERVICE_CARD') ? (
                  <Form.Item name="serviceCardId" label="服务卡产品"><Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择奖励服务卡" /></Form.Item>
                ) : null}
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="充值活动详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={rechargeDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default RechargeActivityManagement;
