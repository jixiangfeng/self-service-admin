import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { activityStatusOptions, costBearerOptions, couponTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

type ActivityStatus = 'DRAFT' | 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'ENDED' | 'DISABLED';
type ActivityTab = 'coupon' | 'invite' | 'recharge';

interface CouponActivity {
  id: string;
  activityCode: string;
  activityName: string;
  couponType: string;
  scope: string;
  triggerRule: string;
  grantCount: number;
  budget: number;
  status: ActivityStatus;
  updatedAt: string;
}

interface InviteActivity {
  id: string;
  activityCode: string;
  activityName: string;
  qualifyRule: string;
  inviterReward: string;
  inviteeReward: string;
  dailyLimit: string;
  antiFraud: string;
  status: ActivityStatus;
  updatedAt: string;
}

interface RechargeActivity {
  id: string;
  activityCode: string;
  activityName: string;
  rechargeRule: string;
  rewardRule: string;
  scope: string;
  costOwner: string;
  status: ActivityStatus;
  updatedAt: string;
}

const statusMap = buildValueEnum(activityStatusOptions);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const costBearerMap = buildValueEnum(costBearerOptions);

const initialCouponActivities: CouponActivity[] = [
  { id: 'ca1', activityCode: 'MKT-CPN-001', activityName: '夜洗券包发放', couponType: 'FULL_REDUCTION', scope: '指定门店组', triggerRule: '晚 20:00 后下发', grantCount: 520, budget: 6800, status: 'RUNNING', updatedAt: '2026-04-18 09:20:00' },
  { id: 'ca2', activityCode: 'MKT-CPN-002', activityName: '新人首单礼', couponType: 'DIRECT', scope: '平台', triggerRule: '注册后自动领券', grantCount: 1600, budget: 4200, status: 'RUNNING', updatedAt: '2026-04-17 20:12:00' },
];

const initialInviteActivities: InviteActivity[] = [
  { id: 'ia1', activityCode: 'MKT-INV-001', activityName: '邀请好友首充得奖励', qualifyRule: '好友首充满 50 元', inviterReward: '10 元余额', inviteeReward: '5 元洗车券', dailyLimit: '10 人 / 天', antiFraud: '同设备 / 同手机号 / 同支付账户限制', status: 'DRAFT', updatedAt: '2026-04-18 08:45:00' },
  { id: 'ia2', activityCode: 'MKT-INV-003', activityName: '三人邀请进阶奖励', qualifyRule: '累计邀请 3 人达标', inviterReward: '30 元余额', inviteeReward: '新人礼券包', dailyLimit: '20 人 / 天', antiFraud: '黑名单 / 退款回收 / 人工审核', status: 'PAUSED', updatedAt: '2026-04-15 18:30:00' },
];

const initialRechargeActivities: RechargeActivity[] = [
  { id: 'ra1', activityCode: 'MKT-RCG-001', activityName: '首充礼包', rechargeRule: '首次充值满 50 元', rewardRule: '赠 10 元余额 + 5 元券', scope: '平台', costOwner: 'PLATFORM', status: 'DRAFT', updatedAt: '2026-04-18 09:00:00' },
  { id: 'ra2', activityCode: 'MKT-RCG-002', activityName: '夜洗充值返利', rechargeRule: '充值 100 元', rewardRule: '赠 15 元余额', scope: '指定门店', costOwner: 'STORE', status: 'PAUSED', updatedAt: '2026-04-16 21:10:00' },
];

const MarketingManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ActivityTab>('coupon');
  const [modalType, setModalType] = useState<ActivityTab | null>(null);
  const [detail, setDetail] = useState<CouponActivity | InviteActivity | RechargeActivity | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [couponActivities, setCouponActivities] = useState(initialCouponActivities);
  const [inviteActivities, setInviteActivities] = useState(initialInviteActivities);
  const [rechargeActivities, setRechargeActivities] = useState(initialRechargeActivities);

  const filteredCoupons = useMemo(
    () => couponActivities.filter((item) => containsKeyword(keyword, [item.activityCode, item.activityName, item.couponType, item.scope, item.triggerRule]) && (!status || item.status === status)),
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

  const openModal = (type: ActivityTab, record?: CouponActivity | InviteActivity | RechargeActivity) => {
    setModalType(type);
    setEditingId(record?.id || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(record);
      return;
    }
    form.setFieldsValue({ status: 'DRAFT' });
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    form.resetFields();
  };

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  const updateStatus = (type: ActivityTab, id: string, nextStatus: ActivityStatus) => {
    const stamp = new Date().toISOString();

    if (type === 'coupon') {
      setCouponActivities((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus, updatedAt: stamp } : item)));
    }
    if (type === 'invite') {
      setInviteActivities((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus, updatedAt: stamp } : item)));
    }
    if (type === 'recharge') {
      setRechargeActivities((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus, updatedAt: stamp } : item)));
    }
  };

  const couponColumns: ProColumns<CouponActivity>[] = [
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
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '活动名称 / 编码 / 券类型 / 范围' } },
    { title: '券类型', dataIndex: 'couponType', width: 120, valueType: 'select', valueEnum: couponTypeMap, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '范围', dataIndex: 'scope', width: 180, search: false },
    { title: '触发规则', dataIndex: 'triggerRule', width: 220, search: false },
    { title: '发券量', dataIndex: 'grantCount', width: 120, search: false },
    { title: '预算', dataIndex: 'budget', width: 120, search: false, render: (_, record) => formatAmount(record.budget) },
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
          <Button size="small" onClick={() => updateStatus('coupon', record.id, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const inviteColumns: ProColumns<InviteActivity>[] = [
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
          <Button size="small" onClick={() => updateStatus('invite', record.id, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const rechargeColumns: ProColumns<RechargeActivity>[] = [
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
          <Button size="small" onClick={() => updateStatus('recharge', record.id, record.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>
            {record.status === 'RUNNING' ? '暂停' : '启动'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const stamp = new Date().toISOString();

    if (modalType === 'coupon') {
      if (editingId) {
        setCouponActivities((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...values, updatedAt: stamp } : item)));
        message.success('优惠券活动已更新');
      } else {
        setCouponActivities((prev) => [{ ...values, id: `coupon-${Date.now()}`, updatedAt: stamp }, ...prev]);
        message.success('优惠券活动已创建');
      }
    }

    if (modalType === 'invite') {
      if (editingId) {
        setInviteActivities((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...values, updatedAt: stamp } : item)));
        message.success('邀请活动已更新');
      } else {
        setInviteActivities((prev) => [{ ...values, id: `invite-${Date.now()}`, updatedAt: stamp }, ...prev]);
        message.success('邀请活动已创建');
      }
    }

    if (modalType === 'recharge') {
      if (editingId) {
        setRechargeActivities((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...values, updatedAt: stamp } : item)));
        message.success('充值活动已更新');
      } else {
        setRechargeActivities((prev) => [{ ...values, id: `recharge-${Date.now()}`, updatedAt: stamp }, ...prev]);
        message.success('充值活动已创建');
      }
    }

    closeModal();
  };

  const totalBudget = couponActivities.reduce((sum, item) => sum + item.budget, 0) + rechargeActivities.length * 3000 + inviteActivities.length * 2000;

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
              <ProTable<CouponActivity>
                cardBordered
                rowKey="id"
                columns={couponColumns}
                dataSource={filteredCoupons}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1800 }}
                toolBarRender={() => [<Button key="template" onClick={() => openHelper('券模板管理')}>券模板管理</Button>, <Button key="new" type="primary" onClick={() => openModal('coupon')}>新建活动</Button>]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setStatus(values.status as string | undefined); }}
                onReset={() => { setKeyword(''); setStatus(undefined); }}
              />
            ),
          },
          {
            key: 'invite',
            label: '邀请裂变',
            children: (
              <ProTable<InviteActivity>
                cardBordered
                rowKey="id"
                columns={inviteColumns}
                dataSource={filteredInvites}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1720 }}
                toolBarRender={() => [<Button key="anti-fraud" onClick={() => openHelper('防刷规则')}>防刷规则</Button>, <Button key="new" type="primary" onClick={() => openModal('invite')}>新建邀请活动</Button>]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setStatus(values.status as string | undefined); }}
                onReset={() => { setKeyword(''); setStatus(undefined); }}
              />
            ),
          },
          {
            key: 'recharge',
            label: '充值活动',
            children: (
              <ProTable<RechargeActivity>
                cardBordered
                rowKey="id"
                columns={rechargeColumns}
                dataSource={filteredRecharge}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1760 }}
                toolBarRender={() => [<Button key="tiers" onClick={() => openHelper('固定档位模板')}>固定档位模板</Button>, <Button key="new" type="primary" onClick={() => openModal('recharge')}>新建充值活动</Button>]}
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
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          {modalType === 'coupon' ? (
            <div className="modal-grid">
              <Form.Item name="activityCode" label="活动编码" rules={[{ required: true, message: '请输入活动编码' }]}><Input /></Form.Item>
              <Form.Item name="activityName" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}><Input /></Form.Item>
              <Form.Item name="couponType" label="券类型"><Select options={couponTypeOptions} /></Form.Item>
              <Form.Item name="scope" label="作用范围"><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="triggerRule" label="触发规则"><Input /></Form.Item>
              <Form.Item name="grantCount" label="发券量"><Input /></Form.Item>
              <Form.Item name="budget" label="预算"><Input /></Form.Item>
              <Form.Item name="status" label="状态"><Select options={activityStatusOptions} /></Form.Item>
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
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'number' && (key === 'budget' || key === 'grantCount') ? String(value) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">这里保留聚合页的辅助配置入口，后续可以进一步拆到独立配置模块。</Descriptions.Item>
          <Descriptions.Item label="当前标签">{activeTab}</Descriptions.Item>
          <Descriptions.Item label="建议动作">根据当前活动类型继续维护模板、规则、门店组和奖励预算。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default MarketingManagement;
