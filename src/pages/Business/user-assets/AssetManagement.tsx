import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, List, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, GiftOutlined, SafetyCertificateOutlined, TagsOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
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
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type AppUserProfileRecord, type BalanceFlowRecord, type CouponTemplateRecord, type RechargeOrderRecord, type UserAssetAccountRecord } from '@/services/backendService';

type UserAssetRecord = AppUserProfileRecord;

interface BalanceRecord extends UserAssetAccountRecord {
  accountNo?: string;
}

type CouponRecord = CouponTemplateRecord;

type AssetModalType = 'tag' | 'balance' | 'freeze' | 'coupon' | 'reward' | 'refund' | null;
type HelperType = 'batchTags' | 'riskBlacklist' | 'guide' | null;
type AssetDetailType = keyof typeof assetDetailFields;

const userLevelMap = buildValueEnum(userLevelOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const couponTypeMap = buildValueEnum(couponTypeOptions);
const couponStatusMap = buildValueEnum(templateStatusOptions);
const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);
const rechargeStatusMap = buildValueEnum(rechargeOrderStatusOptions);

const sceneOptions = [
  { value: '充值异常', label: '充值异常' },
  { value: '活动补偿', label: '活动补偿' },
  { value: '客服安抚', label: '客服安抚' },
  { value: '退款售后', label: '退款售后' },
  { value: '风控处置', label: '风控处置' },
];
const handleMethodOptions = [
  { value: '补发', label: '补发' },
  { value: '扣回', label: '扣回' },
  { value: '冻结', label: '冻结' },
  { value: '解冻', label: '解冻' },
  { value: '仅标记', label: '仅标记' },
];
const approvalOptions = [
  { value: '无需审批', label: '无需审批' },
  { value: '主管已审批', label: '主管已审批' },
  { value: '财务已审批', label: '财务已审批' },
  { value: '风控已审批', label: '风控已审批' },
];
const notifyOptions = [
  { value: '不通知', label: '不通知' },
  { value: '短信通知', label: '短信通知' },
  { value: '站内信通知', label: '站内信通知' },
  { value: '客服跟进', label: '客服跟进' },
];
const affectedAssetOptions = ['本金余额', '赠送余额', '优惠券', '会员等级', '风控状态'];

const buildOperationSummary = (values: Record<string, any>) => [
  values.businessScene ? `业务场景：${values.businessScene}` : '',
  values.handleMethod ? `处理方式：${values.handleMethod}` : '',
  values.affectedAssets?.length ? `影响资产：${values.affectedAssets.join('、')}` : '',
  values.notifyUser ? `通知用户：${values.notifyUser}` : '',
  values.approvalRequired ? `审批要求：${values.approvalRequired}` : '',
  values.ticketNo ? `关联工单：${values.ticketNo}` : '',
  values.operatorNote ? `补充说明：${values.operatorNote}` : '',
].filter(Boolean).join('；');

const buildAssetActionItems = (record: UserAssetRecord | BalanceRecord | CouponRecord | RechargeOrderRecord | BalanceFlowRecord) => {
  if ('flowNo' in record) {
    return [
      `流水类型：${record.flowType || '未记录'}`,
      `变动金额：${formatAmount(record.changeAmount)}`,
      record.relatedNo ? `关联单号：${record.relatedNo}` : `操作人：${record.operator || '未记录'}`,
    ];
  }
  if ('rechargeNo' in record) {
    return [
      `充值状态：${record.status || '未记录'}`,
      `实付金额：${formatAmount(record.payAmount)}`,
      `赠送金额：${formatAmount(record.giftAmount || 0)}`,
    ];
  }
  if ('templateName' in record) {
    return [
      `券类型：${record.couponType || '未记录'}`,
      `作用范围：${record.scope || '未记录'}`,
      `库存：${record.stock ?? 0}`,
    ];
  }
  if ('balance' in record || 'phone' in record) {
    return [
      `账户余额：${formatAmount(record.balance)}`,
      `冻结金额：${formatAmount(record.freezeBalance || 0)}`,
      `账户状态：${record.status || '未记录'}`,
    ];
  }
  const profile = record as UserAssetRecord;
  return [
    `会员等级：${profile.memberLevel || '未记录'}`,
    `风控状态：${profile.riskStatus || '未记录'}`,
    profile.remark ? `用户备注：${profile.remark}` : `手机号：${profile.mobile || '未记录'}`,
  ];
};

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
    { name: 'storeName', label: '充值门店' },
    { name: 'scopeType', label: '可用范围' },
    { name: 'merchantGroupName', label: '门店组' },
    { name: 'settlementMode', label: '结算模式' },
    { name: 'settlementRule', label: '结算规则' },
    { name: 'settlementStatus', label: '结算状态' },
    { name: 'settlementRuleSnapshot', label: '规则快照' },
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
  const [detailType, setDetailType] = useState<AssetDetailType>('profile');
  const [modalType, setModalType] = useState<AssetModalType>(null);
  const [currentId, setCurrentId] = useState<string | number | null>(null);
  const [assetKeyword, setAssetKeyword] = useState('');
  const [assetRiskStatus, setAssetRiskStatus] = useState<string | undefined>();
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
    queryKey: ['assetProfilesOverview', assetKeyword, assetRiskStatus],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword: assetKeyword || undefined, riskStatus: assetRiskStatus })).data,
  });
  const couponQuery = useQuery({
    queryKey: ['assetCouponTemplatesOverview', couponKeyword],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 200, keyword: couponKeyword || undefined })).data,
  });
  const rechargeQuery = useQuery({
    queryKey: ['assetRechargeOrders', rechargeKeyword],
    queryFn: async () => (await api.asset.rechargeOrders.page({ pageNum: 1, pageSize: 200, keyword: rechargeKeyword || undefined })).data,
  });
  const overviewQuery = useQuery({
    queryKey: ['userAssetOverview'],
    queryFn: async () => (await api.asset.operations.overview()).data,
  });
  const allUserQuery = useQuery({
    queryKey: ['assetModalUsers'],
    queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 500 })).data,
  });
  const enabledCouponQuery = useQuery({
    queryKey: ['assetModalEnabledCouponTemplates'],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 500, status: 'ENABLED' })).data,
  });

  const balances = (accountQuery.data?.records || []) as BalanceRecord[];
  const balanceFlows = flowQuery.data?.records || [];
  const users = profileQuery.data?.records || [];
  const coupons = couponQuery.data?.records || [];
  const rechargeOrders = rechargeQuery.data?.records || [];
  const overview = overviewQuery.data;
  const modalUsers = allUserQuery.data?.records || [];
  const enabledCoupons = enabledCouponQuery.data?.records || [];
  const modalUserOptions = modalUsers.map((item) => ({ value: item.userId ?? item.id, label: `${item.userName}${item.mobile ? `（${item.mobile}）` : ''}` }));
  const enabledCouponOptions = enabledCoupons.map((item) => ({ value: item.id, label: `${item.templateName} / ${item.templateCode}` }));

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

  const openDetail = (record: UserAssetRecord | BalanceRecord | CouponRecord | RechargeOrderRecord | BalanceFlowRecord, type: AssetDetailType) => {
    setDetail(record);
    setDetailType(type);
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
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120, search: false , render: (value) => formatEnumText(value, 'realNameStatus', '实名状态') },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, search: false, render: (_, record) => formatDateTime(record.registeredAt) },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120, valueType: 'select', valueEnum: riskStatusMap, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail(record, 'profile')}>查看画像</Button>
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
          <Button size="small" onClick={() => openDetail(record, 'balance')}>查看</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('balance');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, amount: undefined, businessScene: '客服安抚', handleMethod: '补发', affectedAssets: ['本金余额'], notifyUser: '客服跟进', approvalRequired: '主管已审批' });
            }}
          >
            调账
          </Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('freeze');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, amount: undefined, action: 'freeze', businessScene: '风控处置', handleMethod: '冻结', affectedAssets: ['本金余额'], notifyUser: '不通知', approvalRequired: '风控已审批' });
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
    { title: '作用范围', dataIndex: 'scope', width: 180, search: false , render: (value) => formatEnumText(value, 'scope', '作用范围') },
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
          <Button size="small" onClick={() => openDetail(record, 'coupon')}>查看</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('coupon');
              setCurrentId(record.id);
              form.setFieldsValue({ couponName: record.templateName, couponType: record.couponType, amount: 1, businessScene: '客服安抚', handleMethod: '补发', affectedAssets: ['优惠券'], notifyUser: '短信通知', approvalRequired: '主管已审批' });
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
    { title: '充值门店', dataIndex: 'storeName', width: 160, search: false, renderText: (value) => value || '-' },
    { title: '门店组', dataIndex: 'merchantGroupName', width: 180, search: false, renderText: (value) => value || '-' },
    { title: '可用范围', dataIndex: 'scopeType', width: 120, search: false, renderText: (value) => value || '-' },
    { title: '结算规则', dataIndex: 'settlementRule', width: 160, search: false, renderText: (value, record) => [record.settlementMode, value].filter(Boolean).join(' / ') || '-' },
    { title: '结算状态', dataIndex: 'settlementStatus', width: 120, search: false, renderText: (value) => value || '-' },
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
          <Button size="small" onClick={() => openDetail(record, 'recharge')}>查看</Button>
          <Button size="small" onClick={() => { setModalType('reward'); setCurrentId(record.id); form.setFieldsValue({ rewardAmount: record.giftAmount, rewardType: 'BALANCE', businessScene: '充值异常', handleMethod: '补发', affectedAssets: ['赠送余额'], notifyUser: '短信通知', approvalRequired: '主管已审批' }); }}>补发奖励</Button>
          <Button size="small" onClick={() => { setModalType('refund'); setCurrentId(record.id); form.setFieldsValue({ refundAmount: record.payAmount, businessScene: '退款售后', handleMethod: '扣回', affectedAssets: ['本金余额', '赠送余额'], notifyUser: '客服跟进', approvalRequired: '财务已审批' }); }}>退款回收</Button>
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
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" onClick={() => openDetail(record, 'flow')}>查看</Button> },
  ];

  const handleModalSubmit = async () => {
    const values = await form.validateFields();
    if (!currentId || !modalType) {
      return;
    }

    const operationSummary = buildOperationSummary(values);

    if (modalType === 'tag') {
      await api.asset.profiles.edit({ id: currentId, memberLevel: values.tag, riskStatus: values.blacklist, remark: operationSummary });
      queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
      message.success('用户标签/风控状态已更新');
    }

    if (modalType === 'balance') {
      await api.asset.userAccounts.adjust(Number(currentId), { amount: values.amount, reason: operationSummary });
      queryClient.invalidateQueries({ queryKey: ['userAssetAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success('余额调账已完成');
    }

    if (modalType === 'freeze') {
      const action = values.action === 'unfreeze' ? api.asset.userAccounts.unfreeze : api.asset.userAccounts.freeze;
      await action(Number(currentId), { amount: values.amount, reason: operationSummary });
      queryClient.invalidateQueries({ queryKey: ['userAssetAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success(values.action === 'unfreeze' ? '余额解冻已完成' : '余额冻结已完成');
    }

    if (modalType === 'coupon') {
      await api.asset.userCoupons.add({
        templateId: currentId,
        templateName: values.couponName,
        couponType: values.couponType,
        userId: values.userId,
        userName: values.userName,
        mobile: values.mobile,
        discountAmount: values.discountAmount || 0,
        sourceType: 'BACKEND',
        remark: operationSummary,
      });
      queryClient.invalidateQueries({ queryKey: ['userCoupons'] });
      message.success('用户补券已完成');
    }

    if (modalType === 'reward') {
      await api.asset.rechargeOrders.reward(Number(currentId), { ...values, couponTemplateId: values.couponTemplateId, couponTemplateName: values.couponTemplateName, remark: operationSummary });
      queryClient.invalidateQueries({ queryKey: ['assetRechargeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      queryClient.invalidateQueries({ queryKey: ['userCoupons'] });
      queryClient.invalidateQueries({ queryKey: ['couponIssues'] });
      message.success('充值奖励已补发');
    }

    if (modalType === 'refund') {
      await api.asset.rechargeOrders.refund(Number(currentId), { ...values, remark: operationSummary });
      queryClient.invalidateQueries({ queryKey: ['assetRechargeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balanceFlows'] });
      message.success('充值退款回收已完成');
    }

    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产总览" subtitle="把用户资产页补成可识别用户、可调账、可补券、可风控处理的动态业务页。" icon={<WalletOutlined />} />
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
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="用户总量" value={overview?.userCount ?? 0} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="余额用户" value={overview?.balanceUserCount ?? 0} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="充值订单" value={overview?.rechargeOrderCount ?? 0} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="风控观察名单" value={overview?.riskWatchCount ?? 0} suffix="人" /></Card></Col>
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
                onSubmit={(values) => {
                  setAssetKeyword(String(values.keyword || ''));
                  setAssetRiskStatus(values.riskStatus as string | undefined);
                }}
                onReset={() => {
                  setAssetKeyword('');
                  setAssetRiskStatus(undefined);
                }}
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
                    form.setFieldsValue({ rewardAmount: target.giftAmount, rewardType: 'BALANCE', businessScene: '充值异常', handleMethod: '补发', affectedAssets: ['赠送余额'], notifyUser: '短信通知', approvalRequired: '主管已审批' });
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
                toolBarRender={() => [<Button key="export" onClick={() => {
                  helperForm.setFieldsValue({ keyword: flowKeyword || undefined, operator: '系统管理员', businessScene: '风控处置', approvalRequired: '主管已审批', notifyUser: '不通知' });
                }}>导出余额流水</Button>]}
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
                    form.setFieldsValue({ userName: target.userName, amount: undefined, action: 'freeze', businessScene: '风控处置', handleMethod: '冻结', affectedAssets: ['本金余额'], notifyUser: '不通知', approvalRequired: '风控已审批' });
                  }}>冻结 / 解冻</Button>,
                  <Button key="adjust" type="primary" onClick={() => {
                    const target = filteredBalances[0];
                    if (!target) return;
                    setModalType('balance');
                    setCurrentId(target.id);
                    form.setFieldsValue({ userName: target.userName, amount: undefined, businessScene: '客服安抚', handleMethod: '补发', affectedAssets: ['本金余额'], notifyUser: '客服跟进', approvalRequired: '主管已审批' });
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
                    form.setFieldsValue({ couponName: target.templateName, couponType: target.couponType, amount: 1, businessScene: '客服安抚', handleMethod: '补发', affectedAssets: ['优惠券'], notifyUser: '短信通知', approvalRequired: '主管已审批' });
                  }}>手动补券</Button>,
                ]}
                onSubmit={(values) => setCouponKeyword(String(values.keyword || ''))}
                onReset={() => setCouponKeyword('')}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="用户资产处理"
        title={modalType === 'tag' ? '用户标签 / 风控处理' : modalType === 'balance' ? '余额调账' : modalType === 'freeze' ? '冻结 / 解冻' : modalType === 'coupon' ? '手动补券' : modalType === 'reward' ? '充值奖励补发' : modalType === 'refund' ? '充值退款回收' : '资产操作'}
        subtitle="把标签、余额、券、奖励和退款放到同一条资产处理链路里。"
        meta={[modalType || '处理动作']}
        open={!!modalType}
        onCancel={closeModal}
        onOk={handleModalSubmit}
        width={820}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            {modalType === 'tag' ? (
              <>
                <BusinessEditorSection icon={<WalletOutlined />} title="用户主体" desc="先确认用户身份，再补充标签和风控状态。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
                    <Form.Item name="blacklist" label="风控状态"><Select options={riskStatusOptions} placeholder="请选择风控状态" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<WalletOutlined />} title="标签闭环" desc="记录用户标签，方便后续批量处理和圈选。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="tag" label="会员等级"><Select allowClear options={userLevelOptions} placeholder="请选择会员等级" /></Form.Item>
                    <Form.Item name="businessScene" label="业务场景" initialValue="风控处置"><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" initialValue="仅标记"><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求" initialValue="风控已审批"><Select options={approvalOptions} /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'balance' ? (
              <>
                <BusinessEditorSection icon={<WalletOutlined />} title="调账对象" desc="余额调账需要固定用户和调账金额。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
                    <Form.Item name="amount" label="调整金额" rules={[{ required: true, message: '请输入调整金额' }]}><InputNumber style={{ width: '100%' }} precision={2} placeholder="正数增加，负数扣减" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<WalletOutlined />} title="调账原因" desc="补充原因，保证财务和客服可以回查。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="businessScene" label="业务场景" rules={[{ required: true, message: '请选择业务场景' }]}><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" rules={[{ required: true, message: '请选择处理方式' }]}><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="affectedAssets" label="影响资产" rules={[{ required: true, message: '请选择影响资产' }]}><Checkbox.Group options={affectedAssetOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="通知用户"><Select options={notifyOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求"><Select options={approvalOptions} /></Form.Item>
                    <Form.Item name="ticketNo" label="关联工单"><Input placeholder="客服工单 / 审批单，可选" /></Form.Item>
                    <Form.Item name="operatorNote" label="补充说明"><Input placeholder="填写必要的补充说明" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'freeze' ? (
              <>
                <BusinessEditorSection icon={<WalletOutlined />} title="冻结对象" desc="冻结和解冻共用一套闭环字段，确保可追溯。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
                    <Form.Item name="action" label="操作" rules={[{ required: true, message: '请选择操作' }]}><Select options={[{ value: 'freeze', label: '冻结' }, { value: 'unfreeze', label: '解冻' }]} placeholder="请选择操作" /></Form.Item>
                    <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="请输入金额" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<WalletOutlined />} title="冻结原因" desc="说明冻结背景和处理结论。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="businessScene" label="业务场景" rules={[{ required: true, message: '请选择业务场景' }]}><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" rules={[{ required: true, message: '请选择处理方式' }]}><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="affectedAssets" label="影响资产" rules={[{ required: true, message: '请选择影响资产' }]}><Checkbox.Group options={affectedAssetOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="通知用户"><Select options={notifyOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求"><Select options={approvalOptions} /></Form.Item>
                    <Form.Item name="ticketNo" label="关联工单"><Input placeholder="风控单 / 客诉单，可选" /></Form.Item>
                    <Form.Item name="operatorNote" label="补充说明"><Input placeholder="填写必要的补充说明" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'coupon' ? (
              <>
                <BusinessEditorSection icon={<GiftOutlined />} title="补券对象" desc="确认券模板和发放用户，避免补发错资产。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="couponName" label="券模板"><Input disabled /></Form.Item>
                    <Form.Item name="couponType" hidden><Input /></Form.Item>
                    <Form.Item name="userId" label="用户" rules={[{ required: true, message: '请选择用户' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={modalUserOptions}
                        placeholder="请选择补券用户"
                        onChange={(value) => {
                          const user = modalUsers.find((item) => (item.userId ?? item.id) === value);
                          form.setFieldsValue({ userName: user?.userName, mobile: user?.mobile });
                        }}
                      />
                    </Form.Item>
                    <Form.Item name="userName" hidden><Input /></Form.Item>
                    <Form.Item name="mobile" label="手机号"><Input disabled placeholder="选择用户后自动带出" /></Form.Item>
                    <Form.Item name="discountAmount" label="抵扣金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="例如：10.00" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<GiftOutlined />} title="补券说明" desc="记录补券原因，方便后续核对。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="businessScene" label="业务场景" rules={[{ required: true, message: '请选择业务场景' }]}><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" rules={[{ required: true, message: '请选择处理方式' }]}><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="affectedAssets" label="影响资产" rules={[{ required: true, message: '请选择影响资产' }]}><Checkbox.Group options={affectedAssetOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="通知用户"><Select options={notifyOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求"><Select options={approvalOptions} /></Form.Item>
                    <Form.Item name="ticketNo" label="关联工单"><Input placeholder="客服工单 / 审批单，可选" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'reward' ? (
              <>
                <BusinessEditorSection icon={<WalletOutlined />} title="奖励类型" desc="奖励可以是余额或优惠券，金额和券码按需填写。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="rewardType" label="奖励类型" rules={[{ required: true, message: '请选择奖励类型' }]}>
                      <Select options={[{ value: 'BALANCE', label: '余额' }, { value: 'COUPON', label: '优惠券' }]} placeholder="请选择奖励类型" />
                    </Form.Item>
                    <Form.Item name="rewardAmount" label="奖励金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="例如：20.00" /></Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, next) => prev.rewardType !== next.rewardType}>
                      {({ getFieldValue }) => getFieldValue('rewardType') === 'COUPON' ? (
                        <Form.Item name="couponTemplateId" label="奖励券模板" rules={[{ required: true, message: '请选择奖励券模板' }]}>
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={enabledCouponOptions}
                            placeholder="请选择奖励券模板"
                            onChange={(value) => {
                              const template = enabledCoupons.find((item) => item.id === value);
                              form.setFieldsValue({ couponTemplateName: template?.templateName, couponType: template?.couponType });
                            }}
                          />
                        </Form.Item>
                      ) : null}
                    </Form.Item>
                    <Form.Item name="couponTemplateName" hidden><Input /></Form.Item>
                    <Form.Item name="couponType" hidden><Input /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<WalletOutlined />} title="奖励说明" desc="记录奖励说明，确保发放闭环完整。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="businessScene" label="业务场景" rules={[{ required: true, message: '请选择业务场景' }]}><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" rules={[{ required: true, message: '请选择处理方式' }]}><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="affectedAssets" label="影响资产" rules={[{ required: true, message: '请选择影响资产' }]}><Checkbox.Group options={affectedAssetOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="通知用户"><Select options={notifyOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求"><Select options={approvalOptions} /></Form.Item>
                    <Form.Item name="ticketNo" label="关联工单"><Input placeholder="充值单 / 审批单，可选" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
            {modalType === 'refund' ? (
              <>
                <BusinessEditorSection icon={<WalletOutlined />} title="退款信息" desc="只需要补录回收金额和说明。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="refundAmount" label="退款回收金额" rules={[{ required: true, message: '请输入金额' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="请输入金额" /></Form.Item>
                  </div>
                </BusinessEditorSection>
                <BusinessEditorSection icon={<WalletOutlined />} title="退款说明" desc="记录退款原因和处理依据。">
                  <div className="merchant-editor-fields">
                    <Form.Item name="businessScene" label="业务场景" rules={[{ required: true, message: '请选择业务场景' }]}><Select options={sceneOptions} /></Form.Item>
                    <Form.Item name="handleMethod" label="处理方式" rules={[{ required: true, message: '请选择处理方式' }]}><Select options={handleMethodOptions} /></Form.Item>
                    <Form.Item name="affectedAssets" label="影响资产" rules={[{ required: true, message: '请选择影响资产' }]}><Checkbox.Group options={affectedAssetOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="通知用户"><Select options={notifyOptions} /></Form.Item>
                    <Form.Item name="approvalRequired" label="审批要求"><Select options={approvalOptions} /></Form.Item>
                    <Form.Item name="ticketNo" label="关联单号"><Input placeholder="退款单 / 售后单，可选" /></Form.Item>
                  </div>
                </BusinessEditorSection>
              </>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="资产详情" open={!!detail} width={640} onCancel={() => setDetail(null)} destroyOnClose>
        {detail ? (
          <>
            <Card title="资产概览" style={{ marginBottom: 16 }}>
              <SchemaDetail
                record={detail as Record<string, any>}
                fields={assetDetailFields[detailType] as DetailField<Record<string, any>>[]}
                column={1}
                labelWidth={110}
              />
            </Card>
            <Card title="推荐处理动作">
              <List
                dataSource={buildAssetActionItems(detail)}
                renderItem={(item: string) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </>
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="用户资产辅助操作"
        title={helperTitle || '资产辅助操作'}
        subtitle={helperDesc}
        meta={[helperType === 'batchTags' ? '批量标签' : helperType === 'riskBlacklist' ? '风控名单' : '操作指引', '用户资产']}
        open={helperVisible}
        onCancel={() => setHelperVisible(false)}
        onOk={async () => {
          if (helperType === 'guide') {
            setHelperVisible(false);
            return;
          }
          const values = await helperForm.validateFields();
          const helperPayload = { ...values, remark: buildOperationSummary(values) };
          if (helperType === 'batchTags') {
            await api.asset.operations.batchTags(helperPayload);
            queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
            queryClient.invalidateQueries({ queryKey: ['userAssetOverview'] });
            message.success('批量标签已更新');
          }
          if (helperType === 'riskBlacklist') {
            await api.asset.operations.riskBlacklist(helperPayload);
            queryClient.invalidateQueries({ queryKey: ['assetProfilesOverview'] });
            queryClient.invalidateQueries({ queryKey: ['userRiskRecords'] });
            queryClient.invalidateQueries({ queryKey: ['userAssetOverview'] });
            message.success('风控名单已更新');
          }
          setHelperVisible(false);
        }}
        width={960}
        okText="保存处理结果"
      >
        {helperType !== 'guide' ? (
          <Form form={helperForm} layout="vertical" className="merchant-editor-form">
            <div className="merchant-editor-shell">
              {helperType === 'batchTags' ? (
                <>
                  <BusinessEditorSection icon={<UserOutlined />} title="处理对象" desc="按用户名或手机号批量圈选需要更新的用户。">
                    <div className="merchant-editor-fields merchant-editor-fields--single">
                      <Form.Item name="targets" label="用户 / 手机号" rules={[{ required: true, message: '请输入用户或手机号' }]}>
                        <Input.TextArea rows={3} placeholder="多个用户用逗号或换行分隔" />
                      </Form.Item>
                    </div>
                  </BusinessEditorSection>
                  <BusinessEditorSection icon={<TagsOutlined />} title="标签与风控" desc="运营可直接维护标签、会员等级和风控状态，不需要改后台数据。">
                    <div className="merchant-editor-fields">
                      <Form.Item name="tags" label="用户标签"><Input placeholder="例如：高频洗车、投诉待跟进" /></Form.Item>
                      <Form.Item name="memberLevel" label="会员等级"><Select allowClear options={userLevelOptions} placeholder="请选择会员等级" /></Form.Item>
                      <Form.Item name="riskStatus" label="风控状态"><Select allowClear options={riskStatusOptions} placeholder="请选择风控状态" /></Form.Item>
                      <Form.Item name="operator" label="操作人"><Input placeholder="例如：客服主管" /></Form.Item>
                    </div>
                  </BusinessEditorSection>
                </>
              ) : null}
              {helperType === 'riskBlacklist' ? (
                <>
                  <BusinessEditorSection icon={<SafetyCertificateOutlined />} title="名单对象" desc="按手机号或用户名维护资产风控名单。">
                    <div className="merchant-editor-fields">
                      <Form.Item name="targetType" label="名单类型" initialValue="MOBILE"><Select options={[{ value: 'MOBILE', label: '手机号' }, { value: 'USER_NAME', label: '用户名' }]} /></Form.Item>
                      <Form.Item className="merchant-editor-field-span-all" name="targets" label="用户 / 手机号" rules={[{ required: true, message: '请输入用户或手机号' }]}>
                        <Input.TextArea rows={3} placeholder="多个用户用逗号或换行分隔" />
                      </Form.Item>
                    </div>
                  </BusinessEditorSection>
                  <BusinessEditorSection icon={<AuditOutlined />} title="风控处置" desc="记录业务场景、审批要求和通知方式，方便客服与风控复核。">
                    <div className="merchant-editor-fields">
                      <Form.Item name="operator" label="操作人"><Input placeholder="例如：风控专员" /></Form.Item>
                      <Form.Item name="businessScene" label="业务场景" initialValue="风控处置"><Select options={sceneOptions} /></Form.Item>
                      <Form.Item name="approvalRequired" label="审批要求" initialValue="主管已审批"><Select options={approvalOptions} /></Form.Item>
                      <Form.Item name="notifyUser" label="通知用户" initialValue="客服跟进"><Select options={notifyOptions} /></Form.Item>
                    </div>
                  </BusinessEditorSection>
                </>
              ) : null}
              <BusinessEditorSection icon={<WalletOutlined />} title="补充说明" desc="记录工单、审批单或内部交接信息。">
                <div className="merchant-editor-fields merchant-editor-fields--single">
                  <Form.Item name="operatorNote" label="补充说明"><Input placeholder="填写必要的补充说明" /></Form.Item>
                </div>
              </BusinessEditorSection>
            </div>
          </Form>
        ) : null}
      </BusinessEditorModal>
    </div>
  );
};

export default AssetManagement;
