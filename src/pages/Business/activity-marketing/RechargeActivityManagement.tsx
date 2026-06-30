import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { CalendarOutlined, GiftOutlined, PlusOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityStatusOptions, costBearerOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import OssImageUpload from '@/components/OssImageUpload';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, CoreFlowPanel, formatDateTime, OperatorTips, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, { type RechargeActivityFullProfileRecord, type RechargeActivityRecord } from '@/services/backendService';
import RechargeActivityFullProfileDrawer from './RechargeActivityFullProfileDrawer';

const statusMap = buildValueEnum(activityStatusOptions);
const costBearerMap = buildValueEnum(costBearerOptions);
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
const buildRechargeTierAmounts = (values: Record<string, any>) => {
  const tiers = Array.isArray(values.tierAmounts) ? values.tierAmounts : [];
  return JSON.stringify(tiers
    .map((tier) => ({
      amount: Number(typeof tier === 'object' ? tier.amount : tier),
      gift: Number(typeof tier === 'object' ? tier.gift : 0),
    }))
    .filter((tier) => Number.isFinite(tier.amount) && tier.amount > 0)
    .sort((a, b) => a.amount - b.amount));
};
const parseRechargeTierAmounts = (value?: string) => {
  if (!value) return [];
  try {
    const tiers = JSON.parse(value);
    return Array.isArray(tiers)
      ? tiers.map((item) => ({ amount: Number(item?.amount || 0), gift: Number(item?.gift || 0) })).filter((item) => item.amount > 0)
      : [];
  } catch {
    return [];
  }
};
const formatRechargeTierAmounts = (value?: string) => {
  const tiers = parseRechargeTierAmounts(value);
  return tiers.length ? tiers.map((tier) => `${tier.amount} 元送 ${tier.gift || 0} 元`).join(' / ') : '-';
};
const buildRechargePayload = (values: Record<string, any>) => ({
  ...values,
  tierAmounts: buildRechargeTierAmounts(values),
});

const rechargeDetailFields: DetailField<RechargeActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'rechargeMode', label: '充值方式' },
  { name: 'costOwner', label: '成本承担', render: (value) => value ? costBearerMap[value as keyof typeof costBearerMap]?.text || value : '-' },
  { name: 'tierAmounts', label: '固定档位', render: (value) => formatRechargeTierAmounts(value as string | undefined) },
  { name: 'minAmount', label: '最低充值金额' },
  { name: 'bannerImageUrl', label: '活动条Banner' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const RechargeActivityManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Record<string, any>>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fullProfile, setFullProfile] = useState<RechargeActivityFullProfileRecord | undefined>();
  const [editingRecord, setEditingRecord] = useState<RechargeActivityRecord | null>(null);
  const [detail, setDetail] = useState<RechargeActivityRecord | null>(null);

  const activityQuery = useQuery({
    queryKey: ['rechargeActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.rechargeActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
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
    mutationFn: (record: RechargeActivityRecord) => api.marketing.rechargeActivities.changeStatus(record.id, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechargeActivities'] });
      message.success('充值活动状态已更新');
    },
  });

  const records = activityQuery.data?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.activityCode, item.activityName, item.rechargeMode, item.tierAmounts, item.scope]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const confirmRechargeStatus = (record: RechargeActivityRecord) => {
    const nextStatus = record.status === 'RUNNING' ? '暂停' : '启动';
    showBusinessConfirm({
      title: `确认${nextStatus}充值活动`,
      content: `确定${nextStatus}「${record.activityName}」吗？该操作会影响用户端活动展示和充值奖励发放。`,
      okText: `确认${nextStatus}`,
      danger: nextStatus === '暂停',
      onOk: () => statusMutation.mutate(record),
    });
  };

  const openFullProfile = async (record: RechargeActivityRecord) => {
    setProfileVisible(true);
    setProfileLoading(true);
    try {
      const res = await api.marketing.rechargeActivities.fullProfile(record.id);
      setFullProfile(res.data);
    } finally {
      setProfileLoading(false);
    }
  };

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
    { title: '作用范围', dataIndex: 'scope', width: 160, search: false , render: (value) => formatEnumText(value, 'scope', '作用范围') },
    { title: '成本承担', dataIndex: 'costOwner', width: 160, valueType: 'select', valueEnum: costBearerMap, render: (_, record) => renderStatusTag(record.costOwner, costBearerMap) },
    { title: '固定档位', dataIndex: 'tierAmounts', width: 160, search: false, render: (value) => formatRechargeTierAmounts(value as string | undefined) },
    { title: '最低充值', dataIndex: 'minAmount', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openFullProfile(record)}>档案</Button>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => { setEditingRecord(record); form.setFieldsValue({ ...record, tierAmounts: parseRechargeTierAmounts(record.tierAmounts) } as any); setModalVisible(true); }}>编辑</Button>
          <Button
            size="small"
            loading={statusMutation.isPending}
            onClick={() => confirmRechargeStatus(record)}
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
      <PageBanner title="充值活动" subtitle="补齐固定档位、赠送金额、成本承担和状态控制能力。" icon={<GiftOutlined />} />
      <CoreFlowPanel
        title="充值套餐与权益闭环"
        subtitle="充值活动不是单独一张规则表，要同时确认充值档位、赠送权益、适用范围、成本承担和上线状态，用户充值后才能正确落到账户和权益资产。"
        config={[
          { label: '充值档位', desc: '固定档位按金额排序展示，启动后不建议直接改金额，避免用户认知和对账口径变化。', tag: '套餐' },
          { label: '赠送金额', desc: '赠送金额直接随固定档位配置，用户支付后按档位写入赠送余额。', tag: '权益' },
          { label: '适用范围', desc: '明确全部门店、指定门店组或活动门店，跨店核销要同步考虑结算规则。', tag: '范围' },
        ]}
        landing={[
          { label: '用户资产', desc: '支付成功后会沉淀余额流水、用户优惠券或用户服务卡。' },
          { label: '营销执行', desc: '参与记录、奖励状态、预算消耗和异常补发在执行台复盘。' },
          { label: '结算清分', desc: '跨店充值和消费会进入结算明细、分润明细或清分台账。' },
        ]}
        verify={[
          { label: '启动前', desc: '确认档位、赠送金额、成本承担、门店范围和有效期都已配置。' },
          { label: '用户充值后', desc: '去资产总览和营销执行台核对余额、券卡和奖励记录是否落地。' },
          { label: '活动复盘', desc: '重点看充值单、奖励失败、预算异常和券卡核销结果。' },
        ]}
        actions={[
          { key: 'cards', label: '维护权益产品', onClick: () => navigate('/asset/service-cards') },
          { key: 'execution', label: '营销执行台', type: 'primary', onClick: () => navigate('/marketing/execution') },
        ]}
      />
      <OperatorTips
        items={[
          { label: '先建草稿', desc: '先配置充值档位、赠送规则和适用范围，确认成本承担后再启动。', tag: '配置' },
          { label: '启动活动', desc: '活动启动前会二次确认；启动后用户端可见，尽量避免直接改金额档位。', tag: '上线' },
          { label: '查看效果', desc: '用营销执行台看参与、奖励、预算和券核销，活动页只负责规则和状态。', tag: '复盘' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="充值活动" value={activityQuery.data?.total ?? records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="固定档位" value={records.reduce((sum, item) => sum + parseRechargeTierAmounts(item.tierAmounts).length, 0)} suffix="档" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="首充礼包" value={records.filter((item) => item.activityName.includes('首充')).length} suffix="套" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="运行活动" value={records.filter((item) => item.status === 'RUNNING').length} suffix="个" /></Card></Col>
      </Row>

      <ProTable<RechargeActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1360 }}
        toolBarRender={() => [
          <Button key="tiers" onClick={() => {
            setEditingRecord(null);
            form.resetFields();
            form.setFieldsValue({ status: 'DRAFT', tierAmounts: [{ amount: 50, gift: 0 }, { amount: 100, gift: 10 }, { amount: 200, gift: 30 }, { amount: 500, gift: 100 }], rechargeMode: '固定档位充值', scope: '全部门店' } as any);
            setModalVisible(true);
          }}>固定档位</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT', tierAmounts: [{ amount: 50, gift: 0 }, { amount: 100, gift: 10 }, { amount: 200, gift: 30 }], rechargeMode: '固定档位充值', scope: '全部门店' } as any); setModalVisible(true); }}>
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
        subtitle="把充值档位、适用范围、成本承担和奖励内容拆成可配置字段，方便运营维护。"
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
                <Form.Item className="merchant-editor-field-span-all" name="bannerImageUrl" label="活动条Banner图片"><OssImageUpload prefix="activity/banners" placeholder="上传活动条Banner" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="充值范围" desc="配置充值方式、适用范围、成本承担和档位门槛。">
              <div className="merchant-editor-fields">
                <Form.Item name="rechargeMode" label="充值方式"><Select options={rechargeModeOptions} placeholder="请选择充值方式" /></Form.Item>
                <Form.Item name="scope" label="适用范围"><Select options={scopeOptions} placeholder="请选择适用范围" /></Form.Item>
                <Form.Item name="costOwner" label="成本承担"><Select options={costBearerOptions} placeholder="请选择成本承担方" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" label="固定档位">
                  <Form.List name="tierAmounts">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <Space key={field.key} align="baseline" wrap>
                            <Form.Item {...field} name={[field.name, 'amount']} rules={[{ required: true, message: '请输入充值金额' }]}>
                              <InputNumber min={0} precision={2} addonBefore="充" addonAfter="元" placeholder="100" />
                            </Form.Item>
                            <Form.Item {...field} name={[field.name, 'gift']} rules={[{ required: true, message: '请输入赠送金额' }]}>
                              <InputNumber min={0} precision={2} addonBefore="送" addonAfter="元" placeholder="10" />
                            </Form.Item>
                            <Button danger onClick={() => remove(field.name)}>删除</Button>
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add({ amount: 100, gift: 0 })} icon={<PlusOutlined />}>添加档位</Button>
                      </Space>
                    )}
                  </Form.List>
                </Form.Item>
                <Form.Item name="minAmount" label="最低充值金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <RechargeActivityFullProfileDrawer
        open={profileVisible}
        loading={profileLoading}
        profile={fullProfile}
        onClose={() => {
          setProfileVisible(false);
          setFullProfile(undefined);
        }}
      />

      <BusinessDetailModal title="充值活动详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={rechargeDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default RechargeActivityManagement;
