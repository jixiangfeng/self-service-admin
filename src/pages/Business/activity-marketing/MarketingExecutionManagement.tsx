import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { FundProjectionScreenOutlined } from '@ant-design/icons';
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
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type CouponIssueRecord, type CouponUsageRecord, type MarketingBudgetRecord, type MarketingParticipationRecord, type MarketingRewardRecord } from '@/services/backendService';

const activityStatusMap = buildValueEnum(activityStatusOptions);
const rewardStatusMap = buildValueEnum(activityRewardStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);

const executionDetailFields: Record<'participation' | 'reward' | 'budget' | 'issue' | 'usage', DetailField<any>[]> = {
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string; amount?: string }>();
  const participationQuery = useQuery({ queryKey: ['marketingParticipations', keyword], queryFn: async () => (await api.marketing.participations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const rewardQuery = useQuery({ queryKey: ['marketingRewards', keyword], queryFn: async () => (await api.marketing.rewards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const budgetQuery = useQuery({ queryKey: ['marketingBudgets', keyword], queryFn: async () => (await api.marketing.budgets.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const issueQuery = useQuery({ queryKey: ['marketingCouponIssues', keyword], queryFn: async () => (await api.asset.couponIssues.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const usageQuery = useQuery({ queryKey: ['marketingCouponUsages', keyword], queryFn: async () => (await api.asset.couponUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
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

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string, id?: number) => {
    setModalTitle(title);
    setCurrentId(id ?? null);
    form.resetFields();
    setModalVisible(true);
  };

  const participationColumns = useMemo<ProColumns<MarketingParticipationRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '活动名称', dataIndex: 'activityName', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '参与场景', dataIndex: 'joinScene', width: 130 },
    { title: '达标状态', dataIndex: 'qualifyStatus', width: 120, render: (_, record) => renderStatusTag(record.qualifyStatus, activityStatusMap) },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 170 },
    { title: '参与时间', dataIndex: 'joinedAt', width: 180, render: (_, record) => formatDateTime(record.joinedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => openModal('补发活动奖励', record.id)}>发放</Button> },
  ], []);

  const budgetColumns = useMemo<ProColumns<MarketingBudgetRecord>[]>(() => [
    { title: '活动编码', dataIndex: 'activityCode', width: 140 },
    { title: '预算名称', dataIndex: 'budgetName', width: 180 },
    { title: '总预算', dataIndex: 'totalAmount', width: 120, render: (_, record) => formatAmount(record.totalAmount) },
    { title: '已用预算', dataIndex: 'usedAmount', width: 120, render: (_, record) => formatAmount(record.usedAmount) },
    { title: '冻结金额', dataIndex: 'frozenAmount', width: 120, render: (_, record) => formatAmount(record.frozenAmount) },
    { title: '承担方', dataIndex: 'bearer', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, activityStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => openModal('调整活动预算', record.id)}>调整</Button> },
  ], []);

  const issueColumns = useMemo<ProColumns<CouponIssueRecord>[]>(() => [
    { title: '发放流水', dataIndex: 'issueNo', width: 180 },
    { title: '券模板', dataIndex: 'templateName', width: 160 },
    { title: '券码', dataIndex: 'couponNo', width: 150 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源活动', dataIndex: 'activityName', width: 140 },
    { title: '状态', dataIndex: 'issueStatus', width: 120, render: (_, record) => renderStatusTag(record.issueStatus, writeOffStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
  ], []);

  const usageColumns = useMemo<ProColumns<CouponUsageRecord>[]>(() => [
    { title: '券码', dataIndex: 'couponNo', width: 160 },
    { title: '券模板', dataIndex: 'couponNo', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '核销流水', dataIndex: 'writeOffRecordNo', width: 180 },
    { title: '状态', dataIndex: 'usageStatus', width: 120, render: (_, record) => renderStatusTag(record.usageStatus, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
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

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入活动、用户、订单、奖励、券码关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
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

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('rewardNo' in detail ? executionDetailFields.reward : 'budgetName' in detail ? executionDetailFields.budget : 'issueNo' in detail ? executionDetailFields.issue : 'usageStatus' in detail ? executionDetailFields.usage : executionDetailFields.participation) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle.includes('预算')) {
            await adjustBudgetMutation.mutateAsync(values);
          } else {
            await issueRewardMutation.mutateAsync(values);
          }
          setModalVisible(false);
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="活动编码 / 奖励单号 / 券码" rules={[{ required: true, message: '请输入业务编码' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={activityRewardStatusOptions} /></Form.Item>
            <Form.Item name="amount" label="调整金额"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MarketingExecutionManagement;
