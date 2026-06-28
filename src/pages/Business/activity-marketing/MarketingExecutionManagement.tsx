import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { CheckCircleOutlined, FundProjectionScreenOutlined, NotificationOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  activityRewardStatusOptions,
  activityStatusOptions,
  rewardTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, { type CouponIssueRecord, type CouponUsageRecord, type MarketingBudgetRecord, type MarketingParticipationRecord, type MarketingRewardRecord, type SelectOptionRecord } from '@/services/backendService';

const activityStatusMap = buildValueEnum(activityStatusOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);

interface ExecutionActionFormValues {
  bizNo: string;
  status?: string;
  amount?: number;
  userId?: number;
  userName?: string;
  rewardType?: string;
  couponTemplateId?: number;
  serviceCardId?: number;
  totalTimes?: number;
  validDays?: number;
  discountAmount?: number;
  processScene?: string;
  processAction?: string;
  notifyUser?: string;
  approvalRequired?: string;
  owner?: string;
  supplement?: string;
}

type ExecutionDetailType = 'participation' | 'reward' | 'budget' | 'issue' | 'usage';

const processSceneOptions = [
  { value: 'USER_APPEAL', label: '用户申诉' },
  { value: 'DATA_REPAIR', label: '数据补录' },
  { value: 'ACTIVITY_REVIEW', label: '活动复核' },
  { value: 'FINANCE_RECONCILE', label: '财务对账' },
];

const rewardActionOptions = [
  { value: 'ISSUE_NOW', label: '立即补发' },
  { value: 'MARK_PENDING', label: '转待确认' },
  { value: 'REJECT_ISSUE', label: '不予发放' },
];
const closedRewardTypeOptions = rewardTypeOptions.filter((item) => item.value !== 'POINTS');

const budgetActionOptions = [
  { value: 'ADD_BUDGET', label: '追加预算' },
  { value: 'FREEZE_BUDGET', label: '冻结预算' },
  { value: 'RELEASE_BUDGET', label: '释放冻结' },
  { value: 'DEDUCT_BUDGET', label: '扣减预算' },
];

const yesNoOptions = [
  { value: 'YES', label: '是' },
  { value: 'NO', label: '否' },
];

const compactJoin = (items: Array<string | undefined | null | false>) => items.filter(Boolean).join('；');

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const executionDetailFields: Record<ExecutionDetailType, DetailField<any>[]> = {
  participation: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'activityName', label: '活动名称' },
    { name: 'userName', label: '用户' },
    { name: 'joinScene', label: '参与场景' },
    { name: 'qualifyStatus', label: '达标状态' },
    { name: 'relatedOrderNo', label: '关联订单' },
    { name: 'joinedAt', label: '参与时间', render: (value) => formatDateTime(value) },
  ],
  reward: [
    { name: 'rewardNo', label: '奖励单号' },
    { name: 'activityCode', label: '活动编码' },
    { name: 'userName', label: '用户' },
    { name: 'rewardType', label: '奖励类型' },
    { name: 'rewardValue', label: '奖励内容' },
    { name: 'costAmount', label: '成本金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '发放状态' },
    { name: 'issuedAt', label: '发放时间', render: (value) => formatDateTime(value) },
  ],
  budget: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'budgetName', label: '预算名称' },
    { name: 'totalAmount', label: '总预算', render: (value) => formatAmount(value) },
    { name: 'usedAmount', label: '已用预算', render: (value) => formatAmount(value) },
    { name: 'frozenAmount', label: '冻结金额', render: (value) => formatAmount(value) },
    { name: 'bearer', label: '承担方' },
    { name: 'status', label: '状态' },
  ],
  issue: [
    { name: 'issueNo', label: '发放流水' },
    { name: 'templateName', label: '券模板' },
    { name: 'couponNo', label: '券码' },
    { name: 'userName', label: '用户' },
    { name: 'activityName', label: '来源活动' },
    { name: 'issueStatus', label: '状态' },
    { name: 'issuedAt', label: '发放时间', render: (value) => formatDateTime(value) },
  ],
  usage: [
    { name: 'couponNo', label: '券码' },
    { name: 'templateName', label: '券模板' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'writeOffRecordNo', label: '核销流水' },
    { name: 'usageStatus', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
  ],
};

const MarketingExecutionManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<MarketingParticipationRecord | MarketingRewardRecord | MarketingBudgetRecord | CouponIssueRecord | CouponUsageRecord | null>(null);
  const [detailType, setDetailType] = useState<ExecutionDetailType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [form] = Form.useForm<ExecutionActionFormValues>();
  const participationQuery = useQuery({ queryKey: ['marketingParticipations', keyword], queryFn: async () => (await api.marketing.participations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const rewardQuery = useQuery({ queryKey: ['marketingRewards', keyword], queryFn: async () => (await api.marketing.rewards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const budgetQuery = useQuery({ queryKey: ['marketingBudgets', keyword], queryFn: async () => (await api.marketing.budgets.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const issueQuery = useQuery({ queryKey: ['marketingCouponIssues', keyword], queryFn: async () => (await api.asset.couponIssues.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const usageQuery = useQuery({ queryKey: ['marketingCouponUsages', keyword], queryFn: async () => (await api.asset.couponUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const userOptionsQuery = useQuery({ queryKey: ['marketingExecutionUserOptions'], queryFn: async () => (await api.asset.userOptions({ pageSize: 500 })).data });
  const couponTemplateOptionsQuery = useQuery({ queryKey: ['marketingExecutionCouponTemplateOptions'], queryFn: async () => (await api.marketing.couponTemplates.options({ status: 'ENABLED' })).data });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['marketingExecutionServiceCardOptions'], queryFn: async () => (await api.asset.serviceCards.options({ status: 'ENABLED' })).data });
  const issueRewardMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.marketing.rewards.issue(Number(currentId), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingRewards'] });
      message.success('活动奖励已处理');
    },
  });
  const adjustBudgetMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.marketing.budgets.adjust(Number(currentId), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingBudgets'] });
      message.success('活动预算已调整');
    },
  });
  const participationRecords = participationQuery.data?.records || [];
  const rewardRecords = rewardQuery.data?.records || [];
  const budgets = budgetQuery.data?.records || [];
  const couponIssues = issueQuery.data?.records || [];
  const couponUsages = usageQuery.data?.records || [];
  const userOptions = (userOptionsQuery.data || []) as SelectOptionRecord[];
  const couponTemplateOptions = (couponTemplateOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceCardOptions = (serviceCardOptionsQuery.data || []) as SelectOptionRecord[];
  const selectedRewardType = Form.useWatch('rewardType', form);

  const openDetail = (type: ExecutionDetailType, record: MarketingParticipationRecord | MarketingRewardRecord | MarketingBudgetRecord | CouponIssueRecord | CouponUsageRecord) => {
    setDetailType(type);
    setDetail(record);
  };

  const closeDetail = () => {
    setDetailType(null);
    setDetail(null);
  };

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string, id?: number, record?: MarketingRewardRecord | MarketingBudgetRecord) => {
    setModalTitle(title);
    setCurrentId(id ?? null);
    form.resetFields();
    const isBudget = title.includes('预算');
    form.setFieldsValue({
      bizNo: isBudget ? (record as MarketingBudgetRecord | undefined)?.activityCode : (record as MarketingRewardRecord | undefined)?.rewardNo,
      status: isBudget ? (record as MarketingBudgetRecord | undefined)?.status : 'ISSUED',
      amount: Number(isBudget ? 0 : ((record as MarketingRewardRecord | undefined)?.costAmount || 0)) || undefined,
      userName: isBudget ? undefined : (record as MarketingRewardRecord | undefined)?.userName,
      rewardType: isBudget ? undefined : ((record as MarketingRewardRecord | undefined)?.rewardType || 'BALANCE'),
      processScene: isBudget ? 'FINANCE_RECONCILE' : 'USER_APPEAL',
      processAction: isBudget ? 'ADD_BUDGET' : 'ISSUE_NOW',
      notifyUser: 'YES',
      approvalRequired: 'NO',
    });
    setModalVisible(true);
  };

  const buildActionPayload = (values: ExecutionActionFormValues) => {
    const isBudget = modalTitle.includes('预算');
    const actionOptions = isBudget ? budgetActionOptions : rewardActionOptions;
    const rewardTypeLabel = optionLabel(rewardTypeOptions, values.rewardType);
    return {
      ...values,
      remark: compactJoin([
        `处理场景：${optionLabel(processSceneOptions, values.processScene)}`,
        `处理动作：${optionLabel(actionOptions, values.processAction)}`,
        !isBudget && values.rewardType ? `奖励类型：${rewardTypeLabel}` : undefined,
        `通知用户：${optionLabel(yesNoOptions, values.notifyUser)}`,
        `需要审批：${optionLabel(yesNoOptions, values.approvalRequired)}`,
        values.owner ? `处理人：${values.owner}` : undefined,
        values.supplement ? `补充说明：${values.supplement}` : undefined,
      ]),
    };
  };

  const participationColumns = useMemo<ProColumns<MarketingParticipationRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '活动名称', dataIndex: 'activityName', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '参与场景', dataIndex: 'joinScene', width: 130 , render: (value) => formatEnumText(value, 'joinScene', '参与场景') },
    { title: '达标状态', dataIndex: 'qualifyStatus', width: 120, render: (_, record) => renderStatusTag(record.qualifyStatus, activityStatusMap) },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 170 },
    { title: '参与时间', dataIndex: 'joinedAt', width: 180, render: (_, record) => formatDateTime(record.joinedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => openDetail('participation', record)}>详情</Button> },
  ], []);

  const rewardColumns = useMemo<ProColumns<MarketingRewardRecord>[]>(() => [
    { title: '奖励单号', dataIndex: 'rewardNo', width: 180 },
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '奖励类型', dataIndex: 'rewardType', width: 120, render: (_, record) => renderStatusTag(record.rewardType, rewardTypeMap) },
    { title: '奖励内容', dataIndex: 'rewardValue', width: 160 },
    { title: '成本金额', dataIndex: 'costAmount', width: 120, render: (_, record) => formatAmount(record.costAmount) },
    { title: '发放状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, rewardStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '操作', width: 150, render: (_, record) => <><Button size="small" onClick={() => openDetail('reward', record)}>详情</Button><Button size="small" style={{ marginLeft: 8 }} onClick={() => openModal('补发活动奖励', record.id, record)}>发放</Button></> },
  ], []);

  const budgetColumns = useMemo<ProColumns<MarketingBudgetRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '预算名称', dataIndex: 'budgetName', width: 180 },
    { title: '总预算', dataIndex: 'totalAmount', width: 120, render: (_, record) => formatAmount(record.totalAmount) },
    { title: '已用预算', dataIndex: 'usedAmount', width: 120, render: (_, record) => formatAmount(record.usedAmount) },
    { title: '冻结金额', dataIndex: 'frozenAmount', width: 120, render: (_, record) => formatAmount(record.frozenAmount) },
    { title: '承担方', dataIndex: 'bearer', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, activityStatusMap) },
    { title: '操作', width: 150, render: (_, record) => <><Button size="small" onClick={() => openDetail('budget', record)}>详情</Button><Button size="small" style={{ marginLeft: 8 }} onClick={() => openModal('调整活动预算', record.id, record)}>调整</Button></> },
  ], []);

  const issueColumns = useMemo<ProColumns<CouponIssueRecord>[]>(() => [
    { title: '发放流水', dataIndex: 'issueNo', width: 180 },
    { title: '券模板', dataIndex: 'templateName', width: 160 },
    { title: '券码', dataIndex: 'couponNo', width: 150 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源活动', dataIndex: 'activityName', width: 140 },
    { title: '状态', dataIndex: 'issueStatus', width: 120, render: (_, record) => renderStatusTag(record.issueStatus, writeOffStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => openDetail('issue', record)}>详情</Button> },
  ], []);

  const usageColumns = useMemo<ProColumns<CouponUsageRecord>[]>(() => [
    { title: '券码', dataIndex: 'couponNo', width: 160 },
    { title: '券模板', dataIndex: 'templateName', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '核销流水', dataIndex: 'writeOffRecordNo', width: 180 },
    { title: '状态', dataIndex: 'usageStatus', width: 120, render: (_, record) => renderStatusTag(record.usageStatus, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => openDetail('usage', record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="营销执行台" subtitle="维护活动参与、奖励发放、预算消耗、券发放和券使用流水。" icon={<FundProjectionScreenOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="参与记录" value={participationQuery.data?.total ?? participationRecords.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待发奖励" value={rewardRecords.filter((item) => item.status === 'PENDING').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="已用预算" value={formatAmount(budgets.reduce((sum, item) => sum + Number(item.usedAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="券发放流水" value={issueQuery.data?.total ?? couponIssues.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="券核销流水" value={usageQuery.data?.total ?? couponUsages.length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入活动、用户、订单、奖励、券码关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'participation', label: '参与记录', children: <ProTable<MarketingParticipationRecord> cardBordered rowKey="id" columns={participationColumns} dataSource={filter(participationRecords) as MarketingParticipationRecord[]} loading={participationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'reward', label: '奖励发放', children: <ProTable<MarketingRewardRecord> cardBordered rowKey="id" columns={rewardColumns} dataSource={filter(rewardRecords) as MarketingRewardRecord[]} loading={rewardQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'budget', label: '预算消耗', children: <ProTable<MarketingBudgetRecord> cardBordered rowKey="id" columns={budgetColumns} dataSource={filter(budgets) as MarketingBudgetRecord[]} loading={budgetQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1260 }} /> },
          { key: 'couponIssue', label: '券发放流水', children: <ProTable<CouponIssueRecord> cardBordered rowKey="id" columns={issueColumns} dataSource={filter(couponIssues) as CouponIssueRecord[]} loading={issueQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'couponUsage', label: '券使用流水', children: <ProTable<CouponUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={filter(couponUsages) as CouponUsageRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
        ]}
      />

      <BusinessDetailModal title="营销执行详情" open={!!detail} onCancel={closeDetail} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={(detailType ? executionDetailFields[detailType] : executionDetailFields.participation) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={modalTitle.includes('预算') ? '预算处理' : '奖励发放'}
        title={modalTitle}
        subtitle={modalTitle.includes('预算') ? '按追加、冻结、释放、扣减处理活动预算，系统会同步预算金额和状态。' : '选择用户、奖励类型和奖励载体后发放，系统会同步写入余额、优惠券或服务卡资产。'}
        meta={[modalTitle.includes('预算') ? '预算闭环' : '奖励闭环', currentId ? `ID ${currentId}` : '待选择']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const payload = buildActionPayload(values);
          if (modalTitle.includes('预算')) {
            await adjustBudgetMutation.mutateAsync(payload);
          } else {
            await issueRewardMutation.mutateAsync(payload);
          }
          setModalVisible(false);
        }}
        width={980}
        okText={modalTitle.includes('预算') ? '提交预算处理' : '提交奖励处理'}
        confirmLoading={adjustBudgetMutation.isPending || issueRewardMutation.isPending}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<FundProjectionScreenOutlined />}
              title="处理对象"
              desc="选择处理对象和处理后的业务状态。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="bizNo" label="活动编码 / 奖励单号 / 券码" rules={[{ required: true, message: '请输入业务编码' }]}>
                  <Input placeholder="例如：ACT-20260510 或 RW-20260510-001" />
                </Form.Item>
                <Form.Item name="status" label="处理后状态">
                  <Select options={modalTitle.includes('预算') ? activityStatusOptions : activityRewardStatusOptions} placeholder="请选择处理后状态" />
                </Form.Item>
                <Form.Item
                  name="amount"
                  label={modalTitle.includes('预算') || selectedRewardType === 'BALANCE' ? '调整金额'
                    : selectedRewardType === 'POINTS' ? '积分数量'
                      : '成本金额'}
                  rules={modalTitle.includes('预算') || selectedRewardType === 'BALANCE' || selectedRewardType === 'POINTS'
                    ? [{ required: true, message: '请输入大于 0 的金额或数量' }]
                    : undefined}
                >
                  <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder={modalTitle.includes('预算') ? '请输入预算调整金额' : '请输入奖励金额或数量'} />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            {!modalTitle.includes('预算') ? (
              <BusinessEditorSection
                icon={<CheckCircleOutlined />}
                title="奖励资产"
                desc="按奖励类型选择具体资产载体，发放后会写入用户账户、券库存或服务卡库存。"
              >
                <div className="merchant-editor-fields">
                  <Form.Item name="userId" label="发放用户">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      options={userOptions}
                      placeholder="请选择用户"
                      onChange={(_, option) => {
                        const label = Array.isArray(option) ? undefined : option?.label;
                        form.setFieldValue('userName', typeof label === 'string' ? label.replace(/（.*）$/, '') : undefined);
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="userName" label="用户名称">
                    <Input placeholder="没有用户档案时填写用户名称" />
                  </Form.Item>
                  <Form.Item name="rewardType" label="奖励类型" rules={[{ required: true, message: '请选择奖励类型' }]}>
                    <Select options={closedRewardTypeOptions} placeholder="请选择奖励类型" />
                  </Form.Item>
                  {selectedRewardType === 'COUPON' ? (
                    <>
                      <Form.Item name="couponTemplateId" label="优惠券模板" rules={[{ required: true, message: '请选择优惠券模板' }]}>
                        <Select showSearch optionFilterProp="label" options={couponTemplateOptions} placeholder="请选择优惠券模板" />
                      </Form.Item>
                      <Form.Item name="discountAmount" label="抵扣金额">
                        <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="默认按奖励成本" />
                      </Form.Item>
                    </>
                  ) : null}
                  {selectedRewardType === 'CARD' || selectedRewardType === 'SERVICE_CARD' ? (
                    <>
                      <Form.Item name="serviceCardId" label="服务卡产品" rules={[{ required: true, message: '请选择服务卡产品' }]}>
                        <Select showSearch optionFilterProp="label" options={serviceCardOptions} placeholder="请选择服务卡产品" />
                      </Form.Item>
                      <Form.Item name="totalTimes" label="权益次数">
                        <InputNumber min={1} precision={0} addonAfter="次" style={{ width: '100%' }} placeholder="默认取服务卡配置" />
                      </Form.Item>
                      <Form.Item name="validDays" label="有效天数">
                        <InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="默认取服务卡配置" />
                      </Form.Item>
                    </>
                  ) : null}
                </div>
              </BusinessEditorSection>
            ) : null}

            <BusinessEditorSection
              icon={modalTitle.includes('预算') ? <WalletOutlined /> : <CheckCircleOutlined />}
              title="运营动作"
              desc="用明确选项描述处理原因和动作，避免运营人员维护大段规则或技术备注。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="processScene" label="处理场景" rules={[{ required: true, message: '请选择处理场景' }]}>
                  <Select options={processSceneOptions} placeholder="请选择处理场景" />
                </Form.Item>
                <Form.Item name="processAction" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}>
                  <Select options={modalTitle.includes('预算') ? budgetActionOptions : rewardActionOptions} placeholder="请选择处理动作" />
                </Form.Item>
                <Form.Item name="owner" label="处理人">
                  <Input placeholder="例如：活动运营-王敏" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<NotificationOutlined />}
              title="通知与审批"
              desc="明确是否通知用户、是否需要审批，并补充运营说明。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="notifyUser" label="通知用户">
                  <Select options={yesNoOptions} placeholder="请选择是否通知用户" />
                </Form.Item>
                <Form.Item name="approvalRequired" label="需要审批">
                  <Select options={yesNoOptions} placeholder="请选择是否需要审批" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明">
                  <Input placeholder="例如：用户申诉已核验，按活动规则补发" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MarketingExecutionManagement;
