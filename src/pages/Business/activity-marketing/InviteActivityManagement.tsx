import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { CalendarOutlined, GiftOutlined, PlusOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityStatusOptions, rewardTypeOptions, scopeTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import OssImageUpload from '@/components/OssImageUpload';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type InviteActivityRecord, type SelectOptionRecord } from '@/services/backendService';

const statusMap = buildValueEnum(activityStatusOptions);
const inviteRewardTypeOptions = rewardTypeOptions.filter((item) => item.value !== 'COUPON' && item.value !== 'MIXED' && item.value !== 'POINTS');
const rewardTypeMap = buildValueEnum(inviteRewardTypeOptions);
const scopeModeMap = buildValueEnum(scopeTypeOptions);
const inviteScopeOptions = scopeTypeOptions.map((item) => ({
  ...item,
  label: item.value === 'PLATFORM' ? '平台通用' : item.value === 'STORE' ? '指定门店' : item.value === 'STORE_GROUP' ? '指定储值通用组' : item.value === 'MERCHANT' ? '指定商户' : item.label,
}));
const closedRewardTypeOptions = inviteRewardTypeOptions;
const qualifyConditionOptions = [
  { label: '被邀请人完成注册', value: '被邀请人完成注册' },
  { label: '被邀请人首单支付', value: '被邀请人首单支付' },
  { label: '被邀请人累计消费达标', value: '被邀请人累计消费达标' },
  { label: '被邀请人充值达标', value: '被邀请人充值达标' },
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

const amountQualifyConditions = new Set(['被邀请人累计消费达标', '被邀请人充值达标']);
const hasAmountQualifyCondition = (value?: string) => amountQualifyConditions.has(String(value || ''));
const qualifyAmountLabel = (value?: string) => String(value || '').includes('充值') ? '充值门槛' : '消费门槛';
const hasRecoveryDays = (value?: string) => String(value || '') === 'COOLING';
const splitMultiValue = (value?: string) => String(value || '').split(/[;；,，]/).map((item) => item.trim()).filter(Boolean);
const splitScopeValues = (value?: unknown) => Array.isArray(value) ? value : String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const normalizeSelectOptions = (options: Array<{ value: number | string; label: string }>) => options.map((item) => ({ value: item.value, label: item.label }));
const joinMultiValue = (value: unknown) => Array.isArray(value) ? value.join('；') : String(value || '');
const optionLabel = (options: { label: string; value: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const qualifyText = (record: InviteActivityRecord) => [
  record.qualifyCondition,
  hasAmountQualifyCondition(record.qualifyCondition) && record.qualifyAmount ? `${qualifyAmountLabel(record.qualifyCondition)} ${record.qualifyAmount} 元` : undefined,
  record.qualifyDays ? `${record.qualifyDays} 天内完成` : undefined,
].filter(Boolean).join(' / ') || '-';
const recoveryText = (record: InviteActivityRecord) => [
  optionLabel(recoveryModeOptions, record.recoveryMode),
  record.recoveryDays ? `${record.recoveryDays} 天` : undefined,
].filter(Boolean).join(' / ') || '-';

const buildInvitePayload = (values: Record<string, any>) => ({
  ...values,
  qualifyAmount: hasAmountQualifyCondition(values.qualifyCondition) ? values.qualifyAmount : 0,
  recoveryDays: hasRecoveryDays(values.recoveryMode) ? values.recoveryDays : 0,
  scopeIds: values.scopeMode === 'PLATFORM' ? '' : splitScopeValues(values.scopeIds).join(','),
  fraudChecks: joinMultiValue(values.fraudChecks),
});
const rewardSummary = (type?: string, amount?: number | string, cardId?: number) => {
  if (type === 'SERVICE_CARD') return cardId ? `服务卡产品 #${cardId}` : '服务卡';
  if (type === 'POINTS') return amount ? `${amount}积分` : '积分';
  return amount ? `${amount}元余额` : '余额';
};

const inviteDetailFields: DetailField<InviteActivityRecord>[] = [
  { name: 'activityCode', label: '活动编码' },
  { name: 'activityName', label: '活动名称' },
  { name: 'scopeMode', label: '适用范围', render: (_, record) => record.scope || scopeModeMap[record.scopeMode as keyof typeof scopeModeMap]?.text || '-' },
  { name: 'scopeIds', label: '范围对象ID' },
  { name: 'qualifyCondition', label: '达标条件' },
  { name: 'qualifyAmount', label: '消费门槛' },
  { name: 'qualifyDays', label: '达标期限' },
  { name: 'inviterReward', label: '邀请人奖励' },
  { name: 'dailyLimitCount', label: '每日上限' },
  { name: 'inviteCount', label: '邀请数' },
  { name: 'qualifiedCount', label: '达标数' },
  { name: 'inviterRewardType', label: '邀请人奖励类型', render: (value) => value ? rewardTypeMap[value as keyof typeof rewardTypeMap]?.text || value : '-' },
  { name: 'inviterServiceCardId', label: '邀请人服务卡' },
  { name: 'inviterRewardAmount', label: '邀请人金额/积分' },
  { name: 'tierRewardRules', label: '阶梯返利规则' },
  { name: 'bannerImageUrl', label: '活动条Banner' },
  { name: 'fraudChecks', label: '风控开关' },
  { name: 'recoveryMode', label: '奖励回收' },
  { name: 'recoveryDays', label: '回收期限' },
  { name: 'status', label: '状态', render: (value) => value ? statusMap[value as keyof typeof statusMap]?.text || value : '-' },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const InviteActivityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<Record<string, any>>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InviteActivityRecord | null>(null);
  const [detail, setDetail] = useState<InviteActivityRecord | null>(null);

  const activityQuery = useQuery({
    queryKey: ['inviteActivities', keyword, statusFilter],
    queryFn: async () => (await api.marketing.inviteActivities.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: statusFilter })).data,
  });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['inviteActivityServiceCardOptions'], queryFn: async () => (await api.asset.serviceCards.options({ status: 'ENABLED' })).data });
  const storeQuery = useQuery({ queryKey: ['inviteActivityScopeStores'], queryFn: async () => (await api.store.page({ pageNum: 1, pageSize: 500 })).data });
  const merchantOptionsQuery = useQuery({ queryKey: ['inviteActivityScopeMerchants'], queryFn: async () => (await api.merchant.options()).data });
  const merchantGroupOptionsQuery = useQuery({
    queryKey: ['inviteActivityScopeStoredValueGroups'],
    queryFn: async () => (await api.merchantGroup.storedValueOptions()).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.inviteActivities.edit(values);
      } else {
        await api.marketing.inviteActivities.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteActivities'] });
      message.success(editingRecord ? '邀请活动已更新' : '邀请活动已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: InviteActivityRecord) => api.marketing.inviteActivities.edit({ ...record, status: record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteActivities'] });
      message.success('邀请活动状态已更新');
    },
  });

  const records = activityQuery.data?.records || [];
  const serviceCardOptions = (serviceCardOptionsQuery.data || []) as SelectOptionRecord[];
  const stores = storeQuery.data?.records || [];
  const storeOptions = stores.map((item) => ({ value: item.id, label: `${item.storeName}${item.storeCode ? `（${item.storeCode}）` : ''}` }));
  const merchantOptions = normalizeSelectOptions(merchantOptionsQuery.data || []);
  const merchantGroupOptions = normalizeSelectOptions(merchantGroupOptionsQuery.data || []);
  const scopeMode = Form.useWatch('scopeMode', form);
  const scopeTargetOptions = scopeMode === 'STORE'
    ? storeOptions
    : scopeMode === 'STORE_GROUP'
      ? merchantGroupOptions
      : scopeMode === 'MERCHANT'
        ? merchantOptions
        : [];
  const inviterRewardType = Form.useWatch('inviterRewardType', form);
  const qualifyCondition = Form.useWatch('qualifyCondition', form);
  const recoveryMode = Form.useWatch('recoveryMode', form);
  const showQualifyAmount = hasAmountQualifyCondition(qualifyCondition);
  const showRecoveryDays = hasRecoveryDays(recoveryMode);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.activityCode, item.activityName, item.qualifyCondition, item.scope, item.scopeMode, item.inviterReward, item.fraudChecks]) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter]
  );

  const columns: ProColumns<InviteActivityRecord>[] = [
    {
      title: '活动',
      dataIndex: 'activityName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.activityName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.activityCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动 / 编码 / 达标规则 / 奖励' } },
    { title: '适用范围', dataIndex: 'scopeMode', width: 180, search: false, render: (_, record) => record.scope || renderStatusTag(record.scopeMode || 'PLATFORM', scopeModeMap) },
    { title: '达标规则', dataIndex: 'qualifyCondition', width: 220, search: false, render: (_, record) => qualifyText(record) },
    { title: '邀请人奖励', dataIndex: 'inviterReward', width: 160, search: false },
    { title: '阶梯返利', dataIndex: 'tierRewardRules', width: 220, search: false, ellipsis: true, render: (_, record) => record.tierRewardRules || '-' },
    { title: '邀请人奖励配置', dataIndex: 'inviterRewardType', width: 180, search: false, render: (_, record) => rewardSummary(record.inviterRewardType, record.inviterRewardAmount, record.inviterServiceCardId) },
    { title: '邀请数', dataIndex: 'inviteCount', width: 100, search: false },
    { title: '达标数', dataIndex: 'qualifiedCount', width: 100, search: false },
    { title: '防刷规则', dataIndex: 'fraudChecks', width: 220, search: false },
    { title: '奖励回收', dataIndex: 'recoveryMode', width: 180, search: false, render: (_, record) => recoveryText(record) },
    { title: '每日上限', dataIndex: 'dailyLimitCount', width: 120, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => { setEditingRecord(record); form.setFieldsValue({ ...record, scopeIds: splitScopeValues(record.scopeIds), fraudChecks: splitMultiValue(record.fraudChecks) } as any); setModalVisible(true); }}>编辑</Button>
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
    const payload = buildInvitePayload(values as Record<string, any>);
    if (editingRecord) {
      await saveMutation.mutateAsync({ ...payload, id: editingRecord.id } as Record<string, unknown>);
    } else {
      await saveMutation.mutateAsync(payload as Record<string, unknown>);
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="邀请活动" subtitle="补齐邀请活动的编码、达标规则、奖励、回收和防刷策略。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="邀请活动" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="进行中" value={records.filter((item) => item.status === 'RUNNING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="防刷维度" value={new Set(records.flatMap((item) => String(item.fraudChecks || '').split(/[;；]/).filter(Boolean))).size} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="奖励回收规则" value={new Set(records.map((item) => item.recoveryMode).filter(Boolean)).size} suffix="类" /></Card></Col>
      </Row>

      <ProTable<InviteActivityRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={activityQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 2160 }}
        toolBarRender={() => [
          <Button key="fraud" onClick={() => navigate('/risk-schedule-alarms')}>防刷策略</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ status: 'DRAFT', qualifyCondition: '被邀请人首单支付', scopeMode: 'PLATFORM', scopeIds: [], inviterRewardType: 'BALANCE', recoveryMode: 'REFUND', fraudChecks: ['同手机号限制', '同设备限制'] } as any); setModalVisible(true); }}>
            新建邀请活动
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
        eyebrow="邀请活动配置"
        title={editingRecord ? `编辑邀请活动 · ${editingRecord.activityName}` : '新建邀请活动'}
        subtitle="配置被邀请人的达标条件、邀请人奖励、回收和防刷规则。"
        meta={[editingRecord ? '编辑' : '新增', '邀请裂变']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={saveMutation.isPending}
        onCancel={closeModal}
        width={1120}
        okText="保存邀请活动"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="活动基础" desc="定义邀请活动的编码、名称和运行状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="activityCode" label="活动编码"><Input readOnly placeholder="保存后由系统自动生成" /></Form.Item>
                <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input placeholder="例如：老带新首洗奖励" /></Form.Item>
                <Form.Item name="status" label="活动状态"><Select options={activityStatusOptions} placeholder="请选择活动状态" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="bannerImageUrl" label="活动条Banner图片"><OssImageUpload prefix="activity/banners" placeholder="上传活动条Banner" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="适用范围" desc="邀请活动只在命中的平台、商户、门店组或门店充值达标时生效。">
              <div className="merchant-editor-fields">
                <Form.Item name="scopeMode" label="适用范围" rules={[{ required: true, message: '请选择适用范围' }]}>
                  <Select
                    options={inviteScopeOptions}
                    placeholder="请选择适用范围"
                    onChange={(value) => {
                      if (value === 'PLATFORM') {
                        form.setFieldsValue({ scopeIds: [] });
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.scopeMode !== next.scopeMode}>
                  {({ getFieldValue }) => {
                    const currentScopeMode = getFieldValue('scopeMode') || 'PLATFORM';
                    return currentScopeMode === 'PLATFORM' ? (
                      <Form.Item label="范围对象"><Input disabled value="平台通用，无需选择范围对象" /></Form.Item>
                    ) : (
                      <Form.Item name="scopeIds" label="范围对象" rules={[{ required: true, message: '请选择范围对象' }]}>
                        <Select
                          mode="multiple"
                          showSearch
                          optionFilterProp="label"
                          options={scopeTargetOptions}
                          placeholder={currentScopeMode === 'STORE' ? '请选择门店' : currentScopeMode === 'STORE_GROUP' ? '请选择储值通用组' : '请选择商户'}
                        />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="scope" label="范围说明"><Input placeholder="例如：仅华东门店组，本说明不作为达标范围依据" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<GiftOutlined />} title="达标与奖励" desc="被邀请人只作为达标对象，奖励发放给邀请人。">
              <div className="merchant-editor-fields">
                <Form.Item name="qualifyCondition" label="达标条件">
                  <Select
                    options={qualifyConditionOptions}
                    placeholder="请选择达标条件"
                    onChange={(value) => {
                      if (!hasAmountQualifyCondition(value)) {
                        form.setFieldsValue({ qualifyAmount: 0 });
                      }
                    }}
                  />
                </Form.Item>
                {showQualifyAmount ? (
                  <Form.Item
                    name="qualifyAmount"
                    label={qualifyAmountLabel(qualifyCondition)}
                    rules={[{ required: true, message: `请输入${qualifyAmountLabel(qualifyCondition)}` }]}
                  >
                    <InputNumber min={0.01} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                  </Form.Item>
                ) : null}
                <Form.Item name="qualifyDays" label="达标期限"><InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" /></Form.Item>
                <Form.Item name="dailyLimitCount" label="每日奖励上限"><InputNumber min={0} precision={0} addonAfter="次" style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="inviterRewardType" label="邀请人奖励类型"><Select options={closedRewardTypeOptions} placeholder="请选择奖励类型" /></Form.Item>
                {inviterRewardType === 'BALANCE' ? <Form.Item name="inviterRewardAmount" label="邀请人奖励金额"><InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="例如：10" /></Form.Item> : null}
                {(inviterRewardType === 'CARD' || inviterRewardType === 'SERVICE_CARD') ? <Form.Item name="inviterServiceCardId" label="邀请人服务卡"><Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择服务卡产品" /></Form.Item> : null}
                <Form.Item name="inviterReward" label="邀请人奖励说明"><Input placeholder="例如：邀请成功奖励，系统按上方配置发放" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="tierRewardRules" label="阶梯返利规则"><Input.TextArea rows={3} placeholder="例如：邀请3个新人各充值满100元返30元；邀请5个新人各充值满100元返80元" /></Form.Item>
                <Form.Item name="inviteCount" label="邀请数"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="qualifiedCount" label="达标数"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyOutlined />} title="回收与风控" desc="明确奖励回收方式、回收期限和防刷开关。">
              <div className="merchant-editor-fields">
                <Form.Item name="recoveryMode" label="奖励回收">
                  <Select
                    options={recoveryModeOptions}
                    placeholder="请选择回收方式"
                    onChange={(value) => {
                      if (!hasRecoveryDays(value)) {
                        form.setFieldsValue({ recoveryDays: 0 });
                      }
                    }}
                  />
                </Form.Item>
                {showRecoveryDays ? (
                  <Form.Item name="recoveryDays" label="回收期限" rules={[{ required: true, message: '请输入回收期限' }]}>
                    <InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" />
                  </Form.Item>
                ) : null}
                <Form.Item className="merchant-editor-field-span-all" name="fraudChecks" label="风控开关"><Checkbox.Group options={fraudCheckOptions} /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="邀请活动详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={inviteDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default InviteActivityManagement;
