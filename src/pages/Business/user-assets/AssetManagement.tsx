import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Descriptions, Form, Input, List, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import {
  balanceFlowTypeOptions,
  couponTypeOptions,
  rechargeOrderStatusOptions,
  riskStatusOptions,
  templateStatusOptions,
  userLevelOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type AppUserProfileRecord, type BalanceFlowRecord, type CouponTemplateRecord, type RechargeOrderRecord, type UserAssetAccountRecord } from '@/services/backendService';

type UserAssetRecord = AppUserProfileRecord;

interface BalanceRecord extends UserAssetAccountRecord {
  accountNo?: string;
}

type CouponRecord = CouponTemplateRecord;

type AssetModalType = 'tag' | 'balance' | 'freeze' | 'coupon' | 'reward' | 'refund' | null;
type HelperType = 'batchTags' | 'riskBlacklist' | 'flowExport' | 'guide' | null;

const userLevelMap = buildValueEnum(userLevelOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const couponStatusMap = buildValueEnum(templateStatusOptions);
const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);
const rechargeStatusMap = buildValueEnum(rechargeOrderStatusOptions);

const assetDetailFields: Record<'profile' | 'balance' | 'coupon' | 'recharge' | 'flow', DetailField<any>[]> = {
  profile: [
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'memberLevel', label: '会员等级' },
    { name: 'realNameStatus', label: '实名状态' },
    { name: 'riskStatus', label: '风控状态' },
    { name: 'registeredAt', label: '注册时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '备注' },
  ],
  balance: [
    { name: 'accountNo', label: '账户号' },
    { name: 'userName', label: '用户' },
    { name: 'phone', label: '手机号' },
    { name: 'balance', label: '余额', render: (value) => formatAmount(value) },
    { name: 'giftBalance', label: '赠送余额', render: (value) => formatAmount(value) },
    { name: 'freezeBalance', label: '冻结金额', render: (value) => formatAmount(value) },
    { name: 'rechargeCount', label: '充值次数' },
    { name: 'status', label: '风控状态' },
    { name: 'latestChange', label: '最近变动' },
  ],
  coupon: [
    { name: 'templateCode', label: '模板编码' },
    { name: 'templateName', label: '券模板' },
    { name: 'couponType', label: '券类型' },
    { name: 'scope', label: '作用范围' },
    { name: 'threshold', label: '门槛' },
    { name: 'validity', label: '有效期' },
    { name: 'stock', label: '库存' },
    { name: 'status', label: '状态' },
  ],
  recharge: [
    { name: 'rechargeNo', label: '充值单号' },
    { name: 'userName', label: '用户' },
    { name: 'phone', label: '手机号' },
    { name: 'activityName', label: '活动' },
    { name: 'payAmount', label: '实付金额', render: (value) => formatAmount(value) },
    { name: 'giftAmount', label: '赠送金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'paidAt', label: '支付时间', render: (value) => formatDateTime(value) },
  ],
  flow: [
    { name: 'flowNo', label: '流水号' },
    { name: 'userName', label: '用户' },
    { name: 'flowType', label: '流水类型' },
    { name: 'changeAmount', label: '变动金额', render: (value) => formatAmount(value) },
    { name: 'balanceAfter', label: '变动后余额', render: (value) => formatAmount(value) },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'operator', label: '操作人' },
    { name: 'remark', label: '说明' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
};

const AssetManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<UserAssetRecord | BalanceRecord | CouponRecord | RechargeOrderRecord | BalanceFlowRecord | null>(null);
  const [modalType, setModalType] = useState<AssetModalType>(null);
  const [currentId, setCurrentId] = useState<string | number | null>(null);
  const [assetKeyword, setAssetKeyword] = useState('');
  const [balanceKeyword, setBalanceKeyword] = useState('');
  const [couponKeyword, setCouponKeyword] = useState('');
  const [rechargeKeyword, setRechargeKeyword] = useState('');
  const [flowKeyword, setFlowKeyword] = useState('');
  const [form] = Form.useForm();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperType, setHelperType] = useState<HelperType>(null);
  const [helperTitle, setHelperTitle] = useState('');
  const [helperDesc, setHelperDesc] = useState('');
  const [helperForm] = Form.useForm();

  const accountQuery = useQuery({
    queryKey: ['userAssetAccounts', balanceKeyword],
    queryFn: async () => (await api.asset.userAccounts.page({ pageNum: 1, pageSize: 200, keyword: balanceKeyword || undefined })).data,
  });
  const flowQuery = useQuery({
    queryKey: ['balanceFlows', flowKeyword],
    queryFn: async () => (await api.asset.balanceFlows.page({ pageNum: 1, pageSize: 200, keyword: flowKeyword || undefined })).data,
  });
  const profileQuery = useQuery({
    queryKey: ['assetProfilesOverview', assetKeyword],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword: assetKeyword || undefined })).data,
  });
  const couponQuery = useQuery({
    queryKey: ['assetCouponTemplatesOverview', couponKeyword],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 200, keyword: couponKeyword || undefined })).data,
  });
  const rechargeQuery = useQuery({
    queryKey: ['assetRechargeOrders', rechargeKeyword],
    queryFn: async () => (await api.asset.rechargeOrders.page({ pageNum: 1, pageSize: 200, keyword: rechargeKeyword || undefined })).data,
  });

  const balances = (accountQuery.data?.records || []) as BalanceRecord[];
  const balanceFlows = flowQuery.data?.records || [];
  const users = profileQuery.data?.records || [];
  const coupons = couponQuery.data?.records || [];
  const rechargeOrders = rechargeQuery.data?.records || [];

  const closeModal = () => {
    setModalType(null);
    setCurrentId(null);
    form.resetFields();
  };

  const openHelper = (type: HelperType, title: string, desc: string) => {
    setHelperType(type);
    setHelperTitle(title);
    setHelperDesc(desc);
    helperForm.resetFields();
    setHelperVisible(true);
  };

  const createFlowExportTask = async () => {
    await api.file.importExportTasks.add({
      taskNo: `EXP-${Date.now()}`,
      taskType: 'EXPORT',
      bizType: 'BALANCE_FLOW',
      bizNo: flowKeyword || undefined,
      fileName: `balance-flow-${Date.now()}.xlsx`,
      operator: '系统管理员',
      status: 'PENDING',
      remark: flowKeyword || '余额流水导出',
    });
    message.success('余额流水导出任务已创建');
    navigate('/operations-support');
  };

  const filteredUsers = useMemo(() => users.filter((item) => containsKeyword(assetKeyword, [item.userName, item.mobile, item.memberLevel, item.riskStatus, item.remark])), [assetKeyword, users]);
  const filteredBalances = useMemo(() => balances.filter((item) => containsKeyword(balanceKeyword, [item.accountNo, item.userName, item.phone, item.latestChange])), [balanceKeyword, balances]);
  const filteredCoupons = useMemo(() => coupons.filter((item) => containsKeyword(couponKeyword, [item.templateCode, item.templateName, item.couponType, item.scope])), [couponKeyword, coupons]);
  const filteredRechargeOrders = useMemo(() => rechargeOrders.filter((item) => containsKeyword(rechargeKeyword, [item.rechargeNo, item.userName, item.phone, item.activityName])), [rechargeKeyword, rechargeOrders]);
  const filteredBalanceFlows = useMemo(() => balanceFlows.filter((item) => containsKeyword(flowKeyword, [item.flowNo, item.userName, item.relatedNo, item.operator, item.remark])), [balanceFlows, flowKeyword]);

  const userColumns: ProColumns<UserAssetRecord>[] = [
    { title: '用户', dataIndex: 'userName', width: 120, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '用户 / 手机号 / 标签' } },
    { title: '手机号', dataIndex: 'mobile', width: 140, search: false },
    { title: '等级', dataIndex: 'memberLevel', width: 120, valueType: 'select', valueEnum: userLevelMap, render: (_, record) => renderStatusTag(record.memberLevel, userLevelMap) },
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120, search: false },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, search: false, render: (_, record) => formatDateTime(record.registeredAt) },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120, valueType: 'select', valueEnum: riskStatusMap, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看画像</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('tag');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, tag: record.memberLevel, blacklist: record.riskStatus });
            }}
          >
            加标签
          </Button>
        </Space>
      ),
    },
  ];

  const balanceColumns: ProColumns<BalanceRecord>[] = [
    { title: '账户号', dataIndex: 'accountNo', width: 170, hideInSearch: true, renderText: (_, record) => record.accountNo || `UA${record.id}` },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '账户号 / 用户 / 手机号 / 最新变动' } },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '余额', dataIndex: 'balance', width: 120, search: false, render: (_, record) => formatAmount(record.balance) },
    { title: '赠送余额', dataIndex: 'giftBalance', width: 120, search: false, render: (_, record) => formatAmount(record.giftBalance) },
    { title: '冻结金额', dataIndex: 'freezeBalance', width: 120, search: false, render: (_, record) => formatAmount(record.freezeBalance) },
    { title: '充值次数', dataIndex: 'rechargeCount', width: 100, search: false },
    { title: '风控状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: riskStatusMap, render: (_, record) => renderStatusTag(record.status, riskStatusMap) },
    { title: '最近变动', dataIndex: 'latestChange', width: 220, search: false },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('balance');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, amount: '', reason: '' });
            }}
          >
            调账
          </Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('freeze');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, amount: '', reason: '', action: 'freeze' });
            }}
          >
            冻结 / 解冻
          </Button>
        </Space>
      ),
    },
  ];

  const couponColumns: ProColumns<CouponRecord>[] = [
    { title: '券模板', dataIndex: 'templateName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '券模板 / 券类型 / 作用范围' } },
    { title: '券类型', dataIndex: 'couponType', width: 120, valueType: 'select', valueEnum: couponTypeMap, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '作用范围', dataIndex: 'scope', width: 180, search: false },
    { title: '门槛', dataIndex: 'threshold', width: 140, search: false },
    { title: '有效期', dataIndex: 'validity', width: 140, search: false },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: couponStatusMap, render: (_, record) => renderStatusTag(record.status, couponStatusMap) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('coupon');
              setCurrentId(record.id);
              form.setFieldsValue({ couponName: record.templateName, amount: 1, reason: '' });
            }}
          >
            补券
          </Button>
        </Space>
      ),
    },
  ];

  const rechargeColumns: ProColumns<RechargeOrderRecord>[] = [
    { title: '充值单号', dataIndex: 'rechargeNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '充值单号 / 用户 / 手机号 / 活动' } },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '活动', dataIndex: 'activityName', width: 180, search: false },
    { title: '实付金额', dataIndex: 'payAmount', width: 120, search: false, render: (_, record) => formatAmount(record.payAmount) },
    { title: '赠送金额', dataIndex: 'giftAmount', width: 120, search: false, render: (_, record) => formatAmount(record.giftAmount) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: rechargeStatusMap, render: (_, record) => renderStatusTag(record.status, rechargeStatusMap) },
    { title: '支付时间', dataIndex: 'paidAt', width: 180, search: false, render: (_, record) => formatDateTime(record.paidAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button size="small" onClick={() => { setModalType('reward'); setCurrentId(record.id); form.setFieldsValue({ rewardAmount: record.giftAmount, rewardType: 'BALANCE', remark: '充值奖励补发' }); }}>补发奖励</Button>
          <Button size="small" onClick={() => { setModalType('refund'); setCurrentId(record.id); form.setFieldsValue({ refundAmount: record.payAmount, remark: '充值退款回收' }); }}>退款回收</Button>
        </Space>
      ),
    },
  ];

  const flowColumns: ProColumns<BalanceFlowRecord>[] = [
    { title: '流水号', dataIndex: 'flowNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '流水号 / 用户 / 关联单 / 操作人' } },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '流水类型', dataIndex: 'flowType', width: 120, valueType: 'select', valueEnum: balanceFlowTypeMap, render: (_, record) => renderStatusTag(record.flowType, balanceFlowTypeMap) },
    { title: '变动金额', dataIndex: 'changeAmount', width: 120, search: false, render: (_, record) => formatAmount(record.changeAmount) },
    { title: '变动后余额', dataIndex: 'balanceAfter', width: 130, search: false, render: (_, record) => formatAmount(record.balanceAfter) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 180, search: false, renderText: (value) => value || '-' },
    { title: '操作人', dataIndex: 'operator', width: 120, search: false },
    { title: '说明', dataIndex: 'remark', width: 220, search: false },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>查看</Button> },
  ];

  const handleModalSubmit = async () => {
    const values = await form.validateFields();
    if (!currentId || !modalType) {
      return;
    }

    if (modalType === 'tag') {
      await api.asset.profiles.edit({ id: currentId, memberLevel: values.tag, riskStatus: values.blacklist, remark: values.reason });
      queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
      message.success('用户标签/风控状态已更新');
    }

    if (modalType === 'balance') {
      await api.asset.userAccounts.adjust(Number(currentId), { amount: values.amount, reason: values.reason });
      queryClient.invalidateQueries({ queryKey: ['userAssetAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success('余额调账已完成');
    }

    if (modalType === 'freeze') {
      const action = values.action === 'unfreeze' ? api.asset.userAccounts.unfreeze : api.asset.userAccounts.freeze;
      await action(Number(currentId), { amount: values.amount, reason: values.reason });
      queryClient.invalidateQueries({ queryKey: ['userAssetAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success(values.action === 'unfreeze' ? '余额解冻已完成' : '余额冻结已完成');
    }

    if (modalType === 'coupon') {
      await api.asset.userCoupons.add({
        templateId: currentId,
        templateName: values.couponName,
        userName: values.userName,
        mobile: values.mobile,
        discountAmount: values.discountAmount || 0,
        sourceType: 'BACKEND',
        remark: values.reason,
      });
      queryClient.invalidateQueries({ queryKey: ['userCoupons'] });
      message.success('用户补券已完成');
    }

    if (modalType === 'reward') {
      await api.asset.rechargeOrders.reward(Number(currentId), values);
      queryClient.invalidateQueries({ queryKey: ['assetRechargeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success('充值奖励已补发');
    }

    if (modalType === 'refund') {
      await api.asset.rechargeOrders.refund(Number(currentId), values);
      queryClient.invalidateQueries({ queryKey: ['assetRechargeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success('充值退款回收已完成');
    }

    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产总览" subtitle="把用户资产页补成可识别用户、可调账、可补券、可风控处理的本地业务页。" icon={<WalletOutlined />} />
      <WorkflowGuide
        title="用户资产闭环"
        summary="资产页要从用户识别一路走到账户调整、券发放和风险控制，不能只剩三张表。"
        steps={[
          { title: '识别用户', description: '查看画像、等级、标签和风控状态', status: 'finish', tag: '用户档案' },
          { title: '账户动作', description: '处理充值、赠送、冻结和调账', status: 'process', tag: '余额账户' },
          { title: '权益发放', description: '发券、补券、服务卡和活动奖励统一进资产', status: 'process', tag: '卡券权益 / 服务卡与次卡' },
          { title: '回写营销与售后', description: '最终把奖励、补偿和黑名单反馈给营销与客服', status: 'wait', tag: '营销 / 客服' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="用户总量" value={users.length * 138} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="余额用户" value={balances.length * 26} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="充值订单" value={rechargeOrders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="风控观察名单" value={users.filter((item) => item.riskStatus && item.riskStatus !== 'NORMAL').length} suffix="人" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'users',
            label: '用户档案',
            children: (
              <ProTable<UserAssetRecord>
                cardBordered
                rowKey="id"
                columns={userColumns}
                dataSource={filteredUsers}
                loading={profileQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1500 }}
                toolBarRender={() => [<Button key="tag" onClick={() => openHelper('batchTags', '批量打标签', '按手机号或用户名批量更新用户标签、会员等级和风控状态。')}>批量打标签</Button>, <Button key="blacklist" type="primary" onClick={() => openHelper('riskBlacklist', '风控名单管理', '按手机号或用户名加入资产风控名单，并同步更新用户风控状态。')}>风控名单管理</Button>]}
                onSubmit={(values) => setAssetKeyword(String(values.keyword || ''))}
                onReset={() => setAssetKeyword('')}
              />
            ),
          },
          {
            key: 'recharge',
            label: '充值订单',
            children: (
              <ProTable<RechargeOrderRecord>
                cardBordered
                rowKey="id"
                columns={rechargeColumns}
                dataSource={filteredRechargeOrders}
                loading={rechargeQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1540 }}
                toolBarRender={() => [<Button key="new" type="primary" onClick={() => {
                  const target = filteredRechargeOrders[0];
                  if (target) {
                    setModalType('reward');
                    setCurrentId(target.id);
                    form.setFieldsValue({ rewardAmount: target.giftAmount, rewardType: 'BALANCE', remark: '充值奖励补发' });
                  } else {
                    navigate('/marketing/recharge-activities');
                  }
                }}>奖励补发</Button>]}
                onSubmit={(values) => setRechargeKeyword(String(values.keyword || ''))}
                onReset={() => setRechargeKeyword('')}
              />
            ),
          },
          {
            key: 'flows',
            label: '余额流水',
            children: (
              <ProTable<BalanceFlowRecord>
                cardBordered
                rowKey="id"
                columns={flowColumns}
                dataSource={filteredBalanceFlows}
                loading={flowQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1680 }}
                toolBarRender={() => [<Button key="export" onClick={createFlowExportTask}>导出余额流水</Button>]}
                onSubmit={(values) => setFlowKeyword(String(values.keyword || ''))}
                onReset={() => setFlowKeyword('')}
              />
            ),
          },
          {
            key: 'balances',
            label: '余额账户',
            children: (
              <ProTable<BalanceRecord>
                cardBordered
                rowKey="id"
                columns={balanceColumns}
                dataSource={filteredBalances}
                loading={accountQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1460 }}
                toolBarRender={() => [
                  <Button key="freeze" onClick={() => {
                    const target = filteredBalances[0];
                    if (!target) return;
                    setModalType('freeze');
                    setCurrentId(target.id);
                    form.setFieldsValue({ userName: target.userName, amount: '', reason: '', action: 'freeze' });
                  }}>冻结 / 解冻</Button>,
                  <Button key="adjust" type="primary" onClick={() => {
                    const target = filteredBalances[0];
                    if (!target) return;
                    setModalType('balance');
                    setCurrentId(target.id);
                    form.setFieldsValue({ userName: target.userName, amount: '', reason: '' });
                  }}>人工调账</Button>,
                ]}
                onSubmit={(values) => setBalanceKeyword(String(values.keyword || ''))}
                onReset={() => setBalanceKeyword('')}
              />
            ),
          },
          {
            key: 'coupons',
            label: '卡券权益',
            children: (
              <ProTable<CouponRecord>
                cardBordered
                rowKey="id"
                columns={couponColumns}
                dataSource={filteredCoupons}
                loading={couponQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1420 }}
                toolBarRender={() => [
                  <Button key="template" onClick={() => navigate('/marketing/coupon-templates')}>新建券模板</Button>,
                  <Button key="grant" type="primary" onClick={() => {
                    const target = filteredCoupons[0];
                    if (!target) return;
                    setModalType('coupon');
                    setCurrentId(target.id);
                    form.setFieldsValue({ couponName: target.templateName, amount: 1, reason: '' });
                  }}>手动补券</Button>,
                ]}
                onSubmit={(values) => setCouponKeyword(String(values.keyword || ''))}
                onReset={() => setCouponKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal
        title={modalType === 'tag' ? '用户标签 / 风控处理' : modalType === 'balance' ? '余额调账' : modalType === 'freeze' ? '冻结 / 解冻' : modalType === 'coupon' ? '手动补券' : modalType === 'reward' ? '充值奖励补发' : modalType === 'refund' ? '充值退款回收' : '资产操作'}
        open={!!modalType}
        onCancel={closeModal}
        onOk={handleModalSubmit}
        width={820}
      >
        <Form form={form} layout="vertical">
          {modalType === 'tag' ? (
            <div className="modal-grid">
              <Form.Item name="userName" label="用户">
                <Input disabled />
              </Form.Item>
              <Form.Item name="blacklist" label="风控状态">
                <Select options={riskStatusOptions} />
              </Form.Item>
              <Form.Item className="modal-span-2" name="tag" label="用户标签">
                <Input />
              </Form.Item>
            </div>
          ) : null}
          {modalType === 'balance' ? (
            <div className="modal-grid">
              <Form.Item name="userName" label="用户">
                <Input disabled />
              </Form.Item>
              <Form.Item name="amount" label="调整金额" rules={[{ required: true, message: '请输入调整金额' }]}>
                <Input placeholder="例如 +10 或 -5" />
              </Form.Item>
              <Form.Item className="modal-span-2" name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>
          ) : null}
          {modalType === 'freeze' ? (
            <div className="modal-grid">
              <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
              <Form.Item name="action" label="操作" rules={[{ required: true, message: '请选择操作' }]}><Select options={[{ value: 'freeze', label: '冻结' }, { value: 'unfreeze', label: '解冻' }]} /></Form.Item>
              <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}><Input.TextArea rows={4} /></Form.Item>
            </div>
          ) : null}
          {modalType === 'coupon' ? (
            <div className="modal-grid">
              <Form.Item name="couponName" label="券模板">
                <Input disabled />
              </Form.Item>
              <Form.Item name="userName" label="用户" rules={[{ required: true, message: '请输入用户' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="mobile" label="手机号">
                <Input />
              </Form.Item>
              <Form.Item name="discountAmount" label="抵扣金额"><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="reason" label="补券说明" rules={[{ required: true, message: '请输入补券说明' }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>
          ) : null}
          {modalType === 'reward' ? (
            <div className="modal-grid">
              <Form.Item name="rewardType" label="奖励类型" rules={[{ required: true, message: '请选择奖励类型' }]}><Select options={[{ value: 'BALANCE', label: '余额' }, { value: 'COUPON', label: '优惠券' }]} /></Form.Item>
              <Form.Item name="rewardAmount" label="奖励金额"><Input /></Form.Item>
              <Form.Item name="couponNo" label="奖励券码"><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="remark" label="说明" rules={[{ required: true, message: '请输入说明' }]}><Input.TextArea rows={4} /></Form.Item>
            </div>
          ) : null}
          {modalType === 'refund' ? (
            <div className="modal-grid">
              <Form.Item name="refundAmount" label="退款回收金额" rules={[{ required: true, message: '请输入金额' }]}><Input /></Form.Item>
              <Form.Item className="modal-span-2" name="remark" label="说明" rules={[{ required: true, message: '请输入说明' }]}><Input.TextArea rows={4} /></Form.Item>
            </div>
          ) : null}
        </Form>
      </Modal>

      <Modal title="资产详情" open={!!detail} width={640} footer={null} onCancel={() => setDetail(null)} destroyOnClose>
        {detail ? (
          <>
            <Card title="资产概览" style={{ marginBottom: 16 }}>
              <SchemaDetail
                record={detail as Record<string, any>}
                fields={('flowNo' in detail ? assetDetailFields.flow : 'rechargeNo' in detail ? assetDetailFields.recharge : 'templateName' in detail ? assetDetailFields.coupon : 'balance' in detail ? assetDetailFields.balance : assetDetailFields.profile) as DetailField<Record<string, any>>[]}
                column={1}
                labelWidth={110}
              />
            </Card>
            <Card title="推荐处理动作">
              <List
                dataSource={[
                  '先确认该用户是否命中风控名单或观察名单',
                  '涉及补偿时先区分余额补偿和优惠券补偿',
                  '活动奖励类资产需同步检查是否命中回收规则',
                ]}
                renderItem={(item: string) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </>
        ) : null}
      </Modal>

      <Modal
        title={helperTitle}
        open={helperVisible}
        onCancel={() => setHelperVisible(false)}
        onOk={async () => {
          if (helperType === 'guide') {
            setHelperVisible(false);
            return;
          }
          const values = await helperForm.validateFields();
          if (helperType === 'batchTags') {
            await api.asset.operations.batchTags(values);
            queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
            message.success('批量标签已更新');
          }
          if (helperType === 'riskBlacklist') {
            await api.asset.operations.riskBlacklist(values);
            queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
            message.success('风控名单已更新');
          }
          if (helperType === 'flowExport') {
            await api.file.importExportTasks.add({ taskType: 'EXPORT', bizType: 'BALANCE_FLOW', fileName: `balance-flow-${Date.now()}.xlsx`, operator: values.operator, status: 'PENDING', remark: values.remark || values.keyword });
            message.success('余额流水导出任务已创建');
          }
          setHelperVisible(false);
        }}
        width={680}
      >
        <Descriptions column={1} labelStyle={{ width: 120 }} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="说明">{helperDesc}</Descriptions.Item>
          <Descriptions.Item label="当前模块">{helperTitle}</Descriptions.Item>
        </Descriptions>
        {helperType !== 'guide' ? (
          <Form form={helperForm} layout="vertical">
            <Form.Item name="targets" label="用户 / 手机号" rules={helperType === 'flowExport' ? [] : [{ required: true, message: '请输入用户或手机号' }]}>
              <Input.TextArea rows={3} placeholder="多个用户用逗号或换行分隔" />
            </Form.Item>
            {helperType === 'batchTags' ? (
              <>
                <Form.Item name="tags" label="用户标签"><Input /></Form.Item>
                <Form.Item name="memberLevel" label="会员等级"><Select allowClear options={userLevelOptions} /></Form.Item>
                <Form.Item name="riskStatus" label="风控状态"><Select allowClear options={riskStatusOptions} /></Form.Item>
              </>
            ) : null}
            {helperType === 'riskBlacklist' ? (
              <>
                <Form.Item name="targetType" label="名单类型" initialValue="MOBILE"><Select options={[{ value: 'MOBILE', label: '手机号' }, { value: 'USER_NAME', label: '用户名' }]} /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
              </>
            ) : null}
            {helperType === 'flowExport' ? (
              <>
                <Form.Item name="keyword" label="导出条件"><Input placeholder="流水号 / 用户 / 关联单 / 操作人" /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
              </>
            ) : null}
            <Form.Item name="remark" label="说明"><Input.TextArea rows={3} /></Form.Item>
          </Form>
        ) : null}
      </Modal>
    </div>
  );
};

export default AssetManagement;
