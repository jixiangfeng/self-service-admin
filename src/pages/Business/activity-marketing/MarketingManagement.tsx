import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { activityStatusOptions, costBearerOptions, couponTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type CouponTemplateRecord, type InviteActivityRecord, type RechargeActivityRecord } from '@/services/backendService';

type ActivityStatus = 'DRAFT' | 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'ENDED' | 'DISABLED' | 'ENABLED';
type ActivityTab = 'coupon' | 'invite' | 'recharge';
type MarketingRecord = CouponTemplateRecord | InviteActivityRecord | RechargeActivityRecord;

const statusMap = buildValueEnum([...activityStatusOptions, { label: '启用', value: 'ENABLED' }]);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const costBearerMap = buildValueEnum(costBearerOptions);

const marketingDetailFields: Record<ActivityTab, DetailField<any>[]> = {
  coupon: [
    { name: 'templateCode', label: '券模板编码' },
    { name: 'templateName', label: '券模板名称' },
    { name: 'couponType', label: '券类型' },
    { name: 'scope', label: '作用范围' },
    { name: 'issueRule', label: '发放规则' },
    { name: 'threshold', label: '使用门槛' },
    { name: 'stock', label: '库存' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  invite: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'activityName', label: '活动名称' },
    { name: 'qualifyRule', label: '达标规则' },
    { name: 'dailyLimit', label: '每日上限' },
    { name: 'inviterReward', label: '邀请人奖励' },
    { name: 'inviteeReward', label: '被邀请人奖励' },
    { name: 'antiFraud', label: '防刷规则' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  recharge: [
    { name: 'activityCode', label: '活动编码' },
    { name: 'activityName', label: '活动名称' },
    { name: 'rechargeRule', label: '充值规则' },
    { name: 'rewardRule', label: '奖励规则' },
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

  const couponActivities = couponQuery.data?.records || [];
  const inviteActivities = inviteQuery.data?.records || [];
  const rechargeActivities = rechargeQuery.data?.records || [];

  const filteredCoupons = useMemo(
    () => couponActivities.filter((item) => containsKeyword(keyword, [item.templateCode, item.templateName, item.couponType, item.scope, item.issueRule]) && (!status || item.status === status)),
    [couponActivities, keyword, status]
  );
  const filteredInvites = useMemo(
    () => inviteActivities.filter((item) => containsKeyword(keyword, [item.activityCode, item.activityName, item.qualifyRule, item.inviterReward, item.inviteeReward]) && (!status || item.status === status)),
    [inviteActivities, keyword, status]
  );
  const filteredRecharge = useMemo(
    () => rechargeActivities.filter((item) => containsKeyword(keyword, [item.activityCode, item.activityName, item.rechargeRule, item.rewardRule, item.scope]) && (!status || item.status === status)),
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
      form.setFieldsValue(record);
      return;
    }
    form.setFieldsValue({ status: 'DRAFT' });
  };

  const closeModal = () => {
    setModalType(null);
    setEditingRecord(null);
    form.resetFields();
  };

  const updateStatus = (type: ActivityTab, record: MarketingRecord, nextStatus: ActivityStatus) => {
    statusMutation.mutate({ type, record, nextStatus });
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
    { title: '范围', dataIndex: 'scope', width: 180, search: false },
    { title: '发放规则', dataIndex: 'issueRule', width: 220, search: false },
    { title: '使用门槛', dataIndex: 'threshold', width: 160, search: false },
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
    { title: '达标规则', dataIndex: 'qualifyRule', width: 200, search: false },
    { title: '邀请人奖励', dataIndex: 'inviterReward', width: 160, search: false },
    { title: '被邀请人奖励', dataIndex: 'inviteeReward', width: 160, search: false },
    { title: '上限规则', dataIndex: 'dailyLimit', width: 140, search: false },
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
    { title: '充值规则', dataIndex: 'rechargeRule', width: 180, search: false },
    { title: '奖励规则', dataIndex: 'rewardRule', width: 220, search: false },
    { title: '作用范围', dataIndex: 'scope', width: 140, search: false },
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
    await saveMutation.mutateAsync({
      type: modalType,
      values: editingRecord ? ({ ...values, id: editingRecord.id } as unknown as Record<string, unknown>) : (values as unknown as Record<string, unknown>),
    });
    closeModal();
  };

  const totalBudget = couponActivities.reduce((sum, item) => sum + Number(item.stock || 0), 0) + rechargeActivities.reduce((sum, item) => sum + Number(item.rewardValue || 0), 0) + inviteActivities.length * 2000;

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
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="预计奖励预算" value={formatAmount(totalBudget)} /></Card></Col>
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

      <Modal
        title={modalType === 'coupon' ? '活动配置 · 优惠券活动' : modalType === 'invite' ? '活动配置 · 邀请活动' : modalType === 'recharge' ? '活动配置 · 充值活动' : '活动配置'}
        open={!!modalType}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          {modalType === 'coupon' ? (
            <div className="modal-grid">
              <Form.Item name="templateCode" label="券模板编码" rules={[{ required: true, message: '请输入券模板编码' }]}><Input /></Form.Item>
              <Form.Item name="templateName" label="券模板名称" rules={[{ required: true, message: '请输入券模板名称' }]}><Input /></Form.Item>
              <Form.Item name="couponType" label="券类型"><Select options={couponTypeOptions} /></Form.Item>
              <Form.Item name="scope" label="作用范围"><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="issueRule" label="发放规则"><Input /></Form.Item>
              <Form.Item name="threshold" label="使用门槛"><Input /></Form.Item>
              <Form.Item name="stock" label="库存"><Input /></Form.Item>
              <Form.Item name="status" label="状态"><Select options={[...activityStatusOptions, { label: '启用', value: 'ENABLED' }]} /></Form.Item>
            </div>
          ) : null}
          {modalType === 'invite' ? (
            <div className="modal-grid">
              <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
              <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
              <Form.Item name="qualifyRule" label="达标规则"><Input /></Form.Item>
              <Form.Item name="dailyLimit" label="每日上限"><Input /></Form.Item>
              <Form.Item name="inviterReward" label="邀请人奖励"><Input /></Form.Item>
              <Form.Item name="inviteeReward" label="被邀请人奖励"><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="antiFraud" label="防刷规则"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
            </div>
          ) : null}
          {modalType === 'recharge' ? (
            <div className="modal-grid">
              <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
              <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
              <Form.Item name="rechargeRule" label="充值规则"><Input /></Form.Item>
              <Form.Item name="scope" label="作用范围"><Input /></Form.Item>
              <Form.Item name="costOwner" label="成本承担"><Select options={costBearerOptions} /></Form.Item>
              <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
              <Form.Item className="modal-span-2" name="rewardRule" label="奖励规则"><Input.TextArea rows={3} /></Form.Item>
            </div>
          ) : null}
        </Form>
      </Modal>

      <Modal title="活动详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('templateCode' in detail ? marketingDetailFields.coupon : 'qualifyRule' in detail ? marketingDetailFields.invite : marketingDetailFields.recharge) as DetailField<Record<string, any>>[]}
            column={1}
            labelWidth={120}
          />
        ) : null}
      </Modal>

    </div>
  );
};

export default MarketingManagement;
