import { useQuery } from '@tanstack/react-query';
import api from '@/services/backendService';

export interface BusinessOption<T = string | number> {
  value: T;
  label: string;
}

export type BusinessEnumMap = Record<string, BusinessOption[]>;

export const FALLBACK_BUSINESS_ENUMS = {
  merchantTypeOptions: [
  { value: 'DIRECT', label: '直营主体' },
  { value: 'FRANCHISE', label: '加盟主体' },
  { value: 'JOINT', label: '联营主体' },
],
  merchantContractStatusOptions: [
  { value: 'ACTIVE', label: '履约中' },
  { value: 'PENDING', label: '待生效' },
  { value: 'EXPIRED', label: '已到期' },
],
  settlementCycleOptions: [
  { value: 'DAY', label: '日结' },
  { value: 'WEEK', label: '周结' },
  { value: 'MONTH', label: '月结' },
],
  auditStatusOptions: [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
],
  qualificationTypeOptions: [
  { value: 'BUSINESS_LICENSE', label: '营业执照' },
  { value: 'LEGAL_ID', label: '法人身份证' },
  { value: 'CERTIFICATE', label: '经营许可' },
  { value: 'OTHER', label: '其他资质' },
],
  statusOptions: [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
],
  merchantAccountTypeOptions: [
  { value: 'MERCHANT_ADMIN', label: '商户管理员' },
  { value: 'STORE_MANAGER', label: '门店店长' },
  { value: 'FINANCE', label: '财务账号' },
  { value: 'OPERATOR', label: '运营账号' },
],
  merchantEntityStatusOptions: [
  { value: 'ACTIVE', label: '启用' },
  { value: 'DISABLED', label: '停用' },
],
  storeStatusOptions: [
  { value: 'OPEN', label: '营业中' },
  { value: 'PAUSED', label: '暂停营业' },
  { value: 'CLOSED', label: '已停业' },
],
  marketingOptions: [
  { value: 1, label: '开启' },
  { value: 0, label: '关闭' },
],
  storeServiceCapabilityOptions: [
  { value: 'SCAN', label: '扫码消费' },
  { value: 'POINT_SELECT', label: '点位选择' },
  { value: 'BALANCE', label: '余额支付' },
  { value: 'COUPON', label: '优惠券' },
  { value: 'POINTS', label: '积分抵扣' },
  { value: 'RECHARGE', label: '充值活动' },
  { value: 'NIGHT_PRICE', label: '夜间价格' },
  { value: 'PICKUP', label: '门店自提' },
],
  pointTypeOptions: [
  { value: 'CAR_WASH_BAY', label: '洗车工位' },
  { value: 'LAUNDRY_SLOT', label: '洗衣机位' },
  { value: 'RETAIL_SLOT', label: '零售点位' },
],
  pointStatusOptions: [
  { value: 'IDLE', label: '空闲' },
  { value: 'RUNNING', label: '使用中' },
  { value: 'MAINTENANCE', label: '维护中' },
  { value: 'DISABLED', label: '停用' },
],
  pointAbilityOptions: [
  { value: 'SCAN', label: '扫码识别' },
  { value: 'POINT_SELECT', label: '自主选位' },
  { value: 'NIGHT_PRICE', label: '夜间价格' },
  { value: 'QUEUE_HINT', label: '排队提示' },
  { value: 'COUPON_VERIFY', label: '券核销' },
],
  deviceTypeOptions: [
  { value: 'CAR_WASH_HIGH_PRESSURE', label: '高压冲洗设备' },
  { value: 'CAR_WASH_FOAM', label: '泡沫设备' },
  { value: 'VACUUM', label: '吸尘设备' },
  { value: 'DRYER', label: '风干设备' },
  { value: 'LAUNDRY', label: '洗衣设备' },
  { value: 'DRINK', label: '饮料机' },
],
  deviceStatusOptions: [
  { value: 'ONLINE', label: '在线' },
  { value: 'RUNNING', label: '运行中' },
  { value: 'FAULT', label: '故障' },
  { value: 'OFFLINE', label: '离线' },
  { value: 'MAINTENANCE', label: '维护中' },
],
  deviceControlModeOptions: [
  { value: 'REMOTE', label: '远程控制' },
  { value: 'LOCAL', label: '本地控制' },
  { value: 'HYBRID', label: '混合控制' },
],
  deviceFaultLevelOptions: [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
],
  deviceProtocolTypeOptions: [
  { value: 'TCP', label: 'TCP' },
  { value: 'HTTP', label: 'HTTP' },
  { value: 'MQTT', label: 'MQTT' },
  { value: 'OTHER', label: '其他' },
],
  maintainStatusOptions: [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'DONE', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
],
  categoryOptions: [
  { value: 'CAR_WASH_PACKAGE', label: '洗车套餐' },
  { value: 'TIME_PACK', label: '时长包' },
  { value: 'SERVICE_PACK', label: '服务包' },
  { value: 'COUNT_CARD', label: '次卡' },
  { value: 'MONTH_CARD', label: '月卡' },
],
  billingModeOptions: [
  { value: 'PACKAGE', label: '套餐计费' },
  { value: 'TIME', label: '按分钟计费' },
  { value: 'COUNT', label: '按次计费' },
  { value: 'MIXED', label: '混合计费' },
],
  scopeTypeOptions: [
  { value: 'PLATFORM', label: '平台' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
  { value: 'GROUP', label: '门店组' },
],
  serviceSellingPointOptions: [
  { value: 'FAST_ENTRY', label: '快速开洗' },
  { value: 'NIGHT_DISCOUNT', label: '夜洗优惠' },
  { value: 'MULTI_DEVICE', label: '多设备联动' },
  { value: 'COUPON_STACK', label: '支持叠券' },
  { value: 'BALANCE_DEDUCT', label: '余额抵扣' },
],
  activityStatusOptions: [
  { value: 'DRAFT', label: '草稿' },
  { value: 'NOT_STARTED', label: '未开始' },
  { value: 'RUNNING', label: '进行中' },
  { value: 'PAUSED', label: '暂停' },
  { value: 'ENDED', label: '已结束' },
  { value: 'DISABLED', label: '已停用' },
],
  activityTypeOptions: [
  { value: 'COUPON', label: '优惠券活动' },
  { value: 'INVITE', label: '邀请活动' },
  { value: 'RECHARGE', label: '充值活动' },
  { value: 'CROSS_STORE', label: '跨店活动' },
  { value: 'JOINT', label: '联名活动' },
],
  couponTypeOptions: [
  { value: 'FULL_REDUCTION', label: '满减券' },
  { value: 'DIRECT', label: '立减券' },
  { value: 'DISCOUNT', label: '折扣券' },
  { value: 'FREE_SERVICE', label: '免费服务券' },
  { value: 'DURATION', label: '时长抵扣券' },
],
  templateStatusOptions: [
  { value: 'ENABLED', label: '启用' },
  { value: 'PAUSED', label: '暂停' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'EXPIRED', label: '失效' },
  { value: 'DISABLED', label: '停用' },
],
  merchantGroupTypeOptions: [
  { value: 'REGION', label: '区域分组' },
  { value: 'ACTIVITY', label: '活动门店组' },
  { value: 'WRITEOFF', label: '核销门店组' },
  { value: 'REPORT', label: '统计门店组' },
],
  scopeLevelOptions: [
  { value: 'MERCHANT', label: '商户级' },
  { value: 'STORE_GROUP', label: '门店组级' },
  { value: 'CITY', label: '城市级' },
],
  serviceCardTypeOptions: [
  { value: 'SERVICE_CARD', label: '服务卡' },
  { value: 'COUNT_CARD', label: '次卡' },
  { value: 'MONTH_CARD', label: '月卡' },
],
  messageChannelOptions: [
  { value: 'WECHAT', label: '小程序模板消息' },
  { value: 'SMS', label: '短信' },
  { value: 'IN_APP', label: '站内消息' },
],
  rewardTypeOptions: [
  { value: 'BALANCE', label: '余额' },
  { value: 'COUPON', label: '优惠券' },
  { value: 'POINTS', label: '积分' },
  { value: 'CARD', label: '服务卡' },
],
  costBearerOptions: [
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'MERCHANT', label: '商户承担' },
  { value: 'STORE', label: '门店承担' },
  { value: 'RATIO', label: '按比例分摊' },
],
  orderStatusOptions: [
  { value: 'PENDING_PAYMENT', label: '待支付' },
  { value: 'PAID', label: '待启动' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REFUNDED', label: '已退款' },
  { value: 'AFTER_SALE', label: '售后中' },
  { value: 'CLOSED', label: '已关闭' },
],
  payModeOptions: [
  { value: 'WX', label: '微信支付' },
  { value: 'BALANCE', label: '余额支付' },
  { value: 'MIXED', label: '混合支付' },
],
  refundStatusOptions: [
  { value: 'PENDING', label: '待审核' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'SUCCESS', label: '已成功' },
  { value: 'REJECTED', label: '已拒绝' },
],
  ticketStatusOptions: [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'CLOSED', label: '已关闭' },
],
  ticketPriorityOptions: [
  { value: 'HIGH', label: '高优先级' },
  { value: 'MEDIUM', label: '中优先级' },
  { value: 'LOW', label: '低优先级' },
],
  messageStatusOptions: [
  { value: 'SENT', label: '已发送' },
  { value: 'PENDING', label: '待发送' },
  { value: 'FAILED', label: '失败' },
],
  partnerRoleOptions: [
  { value: 'PLATFORM', label: '平台方' },
  { value: 'MERCHANT', label: '商户方' },
  { value: 'PARTNER', label: '门店合伙人' },
],
  profitRelationStatusOptions: [
  { value: 'EFFECTIVE', label: '生效中' },
  { value: 'PENDING', label: '待确认' },
  { value: 'CLOSED', label: '已结束' },
],
  userLevelOptions: [
  { value: 'NORMAL', label: '普通用户' },
  { value: 'MEMBER', label: '会员用户' },
  { value: 'VIP', label: 'VIP 用户' },
],
  riskStatusOptions: [
  { value: 'NORMAL', label: '正常' },
  { value: 'WATCH', label: '观察名单' },
  { value: 'BLOCKED', label: '黑名单' },
],
  balanceFlowTypeOptions: [
  { value: 'RECHARGE', label: '充值' },
  { value: 'GIFT', label: '赠送' },
  { value: 'CONSUME', label: '消费扣减' },
  { value: 'REFUND', label: '退款回退' },
  { value: 'ADJUST', label: '人工调账' },
  { value: 'FREEZE', label: '冻结' },
  { value: 'UNFREEZE', label: '解冻' },
],
  rechargeOrderStatusOptions: [
  { value: 'PENDING_PAYMENT', label: '待支付' },
  { value: 'PAID', label: '已支付' },
  { value: 'REWARDED', label: '已发奖' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'REFUNDED', label: '已退款' },
],
  writeOffObjectTypeOptions: [
  { value: 'COUPON', label: '优惠券' },
  { value: 'SERVICE_RIGHT', label: '服务权益' },
  { value: 'SERVICE_CARD', label: '服务卡' },
  { value: 'PICKUP', label: '自提资格' },
],
  writeOffMethodOptions: [
  { value: 'AUTO', label: '自动核销' },
  { value: 'DEVICE_AUTO', label: '设备自动核销' },
  { value: 'STAFF_SCAN', label: '店员扫码' },
  { value: 'MANUAL', label: '后台补核销' },
  { value: 'STORE_GROUP', label: '门店组通用' },
  { value: 'ASSIGNED_STORE', label: '指定门店核销' },
],
  writeOffStatusOptions: [
  { value: 'SUCCESS', label: '核销成功' },
  { value: 'PENDING', label: '待核销' },
  { value: 'ROLLED_BACK', label: '已回滚' },
  { value: 'EXCEPTION', label: '异常处理' },
],
  performSceneOptions: [
  { value: 'SCAN_CAR_WASH', label: '扫码洗车' },
  { value: 'PACKAGE_CAR_WASH', label: '套餐洗车' },
  { value: 'TIME_CAR_WASH', label: '夜洗按时长' },
  { value: 'LAUNDRY', label: '自助洗衣' },
  { value: 'RETAIL', label: '零售自提' },
],
  performStatusOptions: [
  { value: 'STARTED', label: '履约中' },
  { value: 'FINISHED', label: '已完成' },
  { value: 'ABNORMAL', label: '异常中断' },
],
  settlementStatusOptions: [
  { value: 'PENDING', label: '待生成' },
  { value: 'WAIT_CONFIRM', label: '待确认' },
  { value: 'SETTLED', label: '已结算' },
  { value: 'REJECTED', label: '已驳回' },
],
  payoutStatusOptions: [
  { value: 'UNPAID', label: '待打款' },
  { value: 'PAYING', label: '打款中' },
  { value: 'PAID', label: '已打款' },
  { value: 'FAILED', label: '打款失败' },
],
  settlementSubjectTypeOptions: [
  { value: 'PLATFORM', label: '平台' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
],
  settlementDetailTypeOptions: [
  { value: 'ORDER_INCOME', label: '订单收入' },
  { value: 'REFUND_DEDUCT', label: '退款冲减' },
  { value: 'ACTIVITY_COST', label: '活动成本' },
  { value: 'MANUAL_ADJUST', label: '人工调整' },
],
  reconciliationStatusOptions: [
  { value: 'MATCHED', label: '已平账' },
  { value: 'DIFF', label: '存在差异' },
  { value: 'PROCESSING', label: '处理中' },
],
  storeOperationTaskTypeOptions: [
  { value: 'INSPECTION', label: '门店巡检' },
  { value: 'DEVICE_MAINTAIN', label: '设备保养' },
  { value: 'NOTICE_UPDATE', label: '公告更新' },
  { value: 'EXCEPTION_HANDLE', label: '异常处理' },
],
  storeOperationTaskStatusOptions: [
  { value: 'PENDING', label: '待分派' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'CONFIRMING', label: '待确认' },
  { value: 'DONE', label: '已完成' },
],
  storeNoticeTypeOptions: [
  { value: 'SHIFT', label: '排班' },
  { value: 'STORE_NOTICE', label: '门店公告' },
  { value: 'PRICE_NOTICE', label: '价格公告' },
  { value: 'MAINTAIN_NOTICE', label: '维护公告' },
],
  publishStatusOptions: [
  { value: 'PENDING', label: '待发布' },
  { value: 'CONFIRMING', label: '待确认' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'OFFLINE', label: '已下线' },
],
  retailCategoryOptions: [
  { value: 'DRINK', label: '饮料商品' },
  { value: 'SNACK', label: '零食商品' },
  { value: 'CAR_SUPPLY', label: '洗车用品' },
  { value: 'POINT_EXCHANGE', label: '积分兑换' },
],
  retailDeliveryTypeOptions: [
  { value: 'DEVICE_SHIP', label: '设备出货' },
  { value: 'STORE_PICKUP', label: '门店自提' },
  { value: 'VIRTUAL_GRANT', label: '虚拟发放' },
],
  retailStockScopeOptions: [
  { value: 'PLATFORM_WAREHOUSE', label: '平台总仓' },
  { value: 'STORE', label: '门店' },
  { value: 'DEVICE', label: '设备' },
],
  retailProductStatusOptions: [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ON_SALE', label: '在售' },
  { value: 'OFF_SALE', label: '下架' },
],
  adSlotPlacementOptions: [
  { value: 'HOME_BANNER', label: '首页 Banner' },
  { value: 'PAY_SUCCESS', label: '支付成功页' },
  { value: 'STORE_DETAIL', label: '门店详情页' },
  { value: 'POPUP', label: '弹窗' },
],
  adContentTypeOptions: [
  { value: 'IMAGE', label: '图片' },
  { value: 'VIDEO', label: '视频' },
  { value: 'TEXT_IMAGE', label: '图文' },
  { value: 'POPUP', label: '弹窗' },
],
  adStatusOptions: [
  { value: 'DRAFT', label: '草稿' },
  { value: 'DESIGNING', label: '设计中' },
  { value: 'PUBLISHED', label: '已上线' },
  { value: 'OFFLINE', label: '已下线' },
],
  adDeliveryStatusOptions: [
  { value: 'PENDING', label: '待发布' },
  { value: 'RUNNING', label: '运行中' },
  { value: 'PAUSED', label: '暂停' },
  { value: 'ENDED', label: '已结束' },
],
  subscribeStatusOptions: [
  { value: 'SUBSCRIBED', label: '已订阅' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXPIRED', label: '授权过期' },
],
  deviceCommandStatusOptions: [
  { value: 'PENDING', label: '待下发' },
  { value: 'SENT', label: '已下发' },
  { value: 'ACKED', label: '已回执' },
  { value: 'FAILED', label: '失败' },
  { value: 'CLOSED', label: '已关闭' },
],
  analysisSnapshotTypeOptions: [
  { value: 'PLATFORM_DAILY', label: '平台日快照' },
  { value: 'STORE_DAILY', label: '门店日快照' },
  { value: 'DEVICE_HOURLY', label: '设备小时快照' },
  { value: 'MARKETING_DAILY', label: '营销日快照' },
],
  reportDimensionOptions: [
  { value: 'PLATFORM', label: '平台' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
  { value: 'CITY', label: '城市' },
  { value: 'ACTIVITY', label: '活动' },
],
  ticketSourceOptions: [
  { value: 'DEVICE_FAULT', label: '设备故障反馈' },
  { value: 'ORDER_COMPLAINT', label: '订单投诉' },
  { value: 'STORE_EVALUATION', label: '门店评价' },
  { value: 'USER_CONSULT', label: '用户咨询' },
],
  ticketTypeOptions: [
  { value: 'FAULT', label: '故障处理' },
  { value: 'COMPLAINT', label: '投诉处理' },
  { value: 'CONSULT', label: '咨询答复' },
  { value: 'COMPENSATION', label: '补偿处理' },
],
  compensationTypeOptions: [
  { value: 'NONE', label: '无补偿' },
  { value: 'BALANCE', label: '余额补偿' },
  { value: 'COUPON', label: '优惠券补偿' },
  { value: 'SERVICE_CARD', label: '服务卡补偿' },
],
  activityRewardStatusOptions: [
  { value: 'PENDING', label: '待发放' },
  { value: 'ISSUED', label: '已发放' },
  { value: 'RECOVERED', label: '已回收' },
  { value: 'FAILED', label: '发放失败' },
],
  inviteRecordStatusOptions: [
  { value: 'INVITED', label: '已邀请' },
  { value: 'QUALIFIED', label: '已达标' },
  { value: 'REWARDED', label: '已发奖' },
  { value: 'RISK_REJECTED', label: '风控拦截' },
],
  serviceCardStatusOptions: [
  { value: 'UNUSED', label: '未使用' },
  { value: 'USING', label: '使用中' },
  { value: 'USED_UP', label: '已用完' },
  { value: 'EXPIRED', label: '已过期' },
  { value: 'FROZEN', label: '已冻结' },
],
  merchantTodoCategoryOptions: [
  { value: 'ACTIVITY_CONFIG', label: '活动配置' },
  { value: 'BUDGET_APPROVAL', label: '预算审批' },
  { value: 'AFTER_SALE', label: '售后处理' },
  { value: 'SETTLEMENT_CONFIRM', label: '结算确认' },
  { value: 'DEVICE_EXCEPTION', label: '设备异常' },
],
  todoStatusOptions: [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'DONE', label: '已完成' },
],
  yesNoOptions: [
  { value: 1, label: '是' },
  { value: 0, label: '否' },
]
} satisfies BusinessEnumMap;

export type BusinessEnumKey = keyof typeof FALLBACK_BUSINESS_ENUMS;

const normalizeOption = (option: BusinessOption): BusinessOption => ({
  value: option.value,
  label: option.label,
});

let cachedBusinessEnums: BusinessEnumMap = FALLBACK_BUSINESS_ENUMS;

const replaceOptionsInPlace = (target: BusinessOption[], source: BusinessOption[]) => {
  target.splice(0, target.length, ...source.map(normalizeOption));
};

const mergeBusinessEnums = (enums: BusinessEnumMap = {}) => {
  const merged: BusinessEnumMap = { ...FALLBACK_BUSINESS_ENUMS };

  Object.entries(enums).forEach(([key, options]) => {
    if (!Array.isArray(options)) {
      return;
    }

    const fallbackOptions = FALLBACK_BUSINESS_ENUMS[key as BusinessEnumKey];
    if (fallbackOptions) {
      replaceOptionsInPlace(fallbackOptions, options);
      merged[key] = fallbackOptions;
      return;
    }

    merged[key] = options.map(normalizeOption);
  });

  return merged;
};

export const getBusinessEnumOptions = <K extends BusinessEnumKey>(key: K): (typeof FALLBACK_BUSINESS_ENUMS)[K] => {
  return (cachedBusinessEnums[key] || FALLBACK_BUSINESS_ENUMS[key]) as (typeof FALLBACK_BUSINESS_ENUMS)[K];
};

export const useBusinessEnums = () => useQuery({
  queryKey: ['businessEnums'],
  queryFn: async () => {
    const enums = (await api.businessEnums.list()).data;
    cachedBusinessEnums = mergeBusinessEnums(enums);
    return { ...cachedBusinessEnums };
  },
  staleTime: 10 * 60 * 1000,
  initialData: FALLBACK_BUSINESS_ENUMS,
  initialDataUpdatedAt: 0,
});

export const useBusinessEnumOptions = <K extends BusinessEnumKey>(key: K): (typeof FALLBACK_BUSINESS_ENUMS)[K] => {
  const { data } = useBusinessEnums();
  return (data?.[key] || FALLBACK_BUSINESS_ENUMS[key]) as (typeof FALLBACK_BUSINESS_ENUMS)[K];
};

export const useBackendBusinessEnumOptions = (key: string): BusinessOption[] => {
  const { data } = useBusinessEnums();
  return data?.[key] || [];
};

export const merchantTypeOptions = getBusinessEnumOptions('merchantTypeOptions');
export const merchantContractStatusOptions = getBusinessEnumOptions('merchantContractStatusOptions');
export const settlementCycleOptions = getBusinessEnumOptions('settlementCycleOptions');
export const auditStatusOptions = getBusinessEnumOptions('auditStatusOptions');
export const qualificationTypeOptions = getBusinessEnumOptions('qualificationTypeOptions');
export const statusOptions = getBusinessEnumOptions('statusOptions');
export const merchantAccountTypeOptions = getBusinessEnumOptions('merchantAccountTypeOptions');
export const merchantEntityStatusOptions = getBusinessEnumOptions('merchantEntityStatusOptions');
export const storeStatusOptions = getBusinessEnumOptions('storeStatusOptions');
export const marketingOptions = getBusinessEnumOptions('marketingOptions');
export const storeServiceCapabilityOptions = getBusinessEnumOptions('storeServiceCapabilityOptions');
export const pointTypeOptions = getBusinessEnumOptions('pointTypeOptions');
export const pointStatusOptions = getBusinessEnumOptions('pointStatusOptions');
export const pointAbilityOptions = getBusinessEnumOptions('pointAbilityOptions');
export const deviceTypeOptions = getBusinessEnumOptions('deviceTypeOptions');
export const deviceStatusOptions = getBusinessEnumOptions('deviceStatusOptions');
export const deviceControlModeOptions = getBusinessEnumOptions('deviceControlModeOptions');
export const deviceFaultLevelOptions = getBusinessEnumOptions('deviceFaultLevelOptions');
export const deviceProtocolTypeOptions = getBusinessEnumOptions('deviceProtocolTypeOptions');
export const maintainStatusOptions = getBusinessEnumOptions('maintainStatusOptions');
export const categoryOptions = getBusinessEnumOptions('categoryOptions');
export const billingModeOptions = getBusinessEnumOptions('billingModeOptions');
export const scopeTypeOptions = getBusinessEnumOptions('scopeTypeOptions');
export const serviceSellingPointOptions = getBusinessEnumOptions('serviceSellingPointOptions');
export const activityStatusOptions = getBusinessEnumOptions('activityStatusOptions');
export const activityTypeOptions = getBusinessEnumOptions('activityTypeOptions');
export const couponTypeOptions = getBusinessEnumOptions('couponTypeOptions');
export const templateStatusOptions = getBusinessEnumOptions('templateStatusOptions');
export const merchantGroupTypeOptions = getBusinessEnumOptions('merchantGroupTypeOptions');
export const scopeLevelOptions = getBusinessEnumOptions('scopeLevelOptions');
export const serviceCardTypeOptions = getBusinessEnumOptions('serviceCardTypeOptions');
export const messageChannelOptions = getBusinessEnumOptions('messageChannelOptions');
export const rewardTypeOptions = getBusinessEnumOptions('rewardTypeOptions');
export const costBearerOptions = getBusinessEnumOptions('costBearerOptions');
export const orderStatusOptions = getBusinessEnumOptions('orderStatusOptions');
export const payModeOptions = getBusinessEnumOptions('payModeOptions');
export const refundStatusOptions = getBusinessEnumOptions('refundStatusOptions');
export const ticketStatusOptions = getBusinessEnumOptions('ticketStatusOptions');
export const ticketPriorityOptions = getBusinessEnumOptions('ticketPriorityOptions');
export const messageStatusOptions = getBusinessEnumOptions('messageStatusOptions');
export const partnerRoleOptions = getBusinessEnumOptions('partnerRoleOptions');
export const profitRelationStatusOptions = getBusinessEnumOptions('profitRelationStatusOptions');
export const userLevelOptions = getBusinessEnumOptions('userLevelOptions');
export const riskStatusOptions = getBusinessEnumOptions('riskStatusOptions');
export const balanceFlowTypeOptions = getBusinessEnumOptions('balanceFlowTypeOptions');
export const rechargeOrderStatusOptions = getBusinessEnumOptions('rechargeOrderStatusOptions');
export const writeOffObjectTypeOptions = getBusinessEnumOptions('writeOffObjectTypeOptions');
export const writeOffMethodOptions = getBusinessEnumOptions('writeOffMethodOptions');
export const writeOffStatusOptions = getBusinessEnumOptions('writeOffStatusOptions');
export const performSceneOptions = getBusinessEnumOptions('performSceneOptions');
export const performStatusOptions = getBusinessEnumOptions('performStatusOptions');
export const settlementStatusOptions = getBusinessEnumOptions('settlementStatusOptions');
export const payoutStatusOptions = getBusinessEnumOptions('payoutStatusOptions');
export const settlementSubjectTypeOptions = getBusinessEnumOptions('settlementSubjectTypeOptions');
export const settlementDetailTypeOptions = getBusinessEnumOptions('settlementDetailTypeOptions');
export const reconciliationStatusOptions = getBusinessEnumOptions('reconciliationStatusOptions');
export const storeOperationTaskTypeOptions = getBusinessEnumOptions('storeOperationTaskTypeOptions');
export const storeOperationTaskStatusOptions = getBusinessEnumOptions('storeOperationTaskStatusOptions');
export const storeNoticeTypeOptions = getBusinessEnumOptions('storeNoticeTypeOptions');
export const publishStatusOptions = getBusinessEnumOptions('publishStatusOptions');
export const retailCategoryOptions = getBusinessEnumOptions('retailCategoryOptions');
export const retailDeliveryTypeOptions = getBusinessEnumOptions('retailDeliveryTypeOptions');
export const retailStockScopeOptions = getBusinessEnumOptions('retailStockScopeOptions');
export const retailProductStatusOptions = getBusinessEnumOptions('retailProductStatusOptions');
export const adSlotPlacementOptions = getBusinessEnumOptions('adSlotPlacementOptions');
export const adContentTypeOptions = getBusinessEnumOptions('adContentTypeOptions');
export const adStatusOptions = getBusinessEnumOptions('adStatusOptions');
export const adDeliveryStatusOptions = getBusinessEnumOptions('adDeliveryStatusOptions');
export const subscribeStatusOptions = getBusinessEnumOptions('subscribeStatusOptions');
export const deviceCommandStatusOptions = getBusinessEnumOptions('deviceCommandStatusOptions');
export const analysisSnapshotTypeOptions = getBusinessEnumOptions('analysisSnapshotTypeOptions');
export const reportDimensionOptions = getBusinessEnumOptions('reportDimensionOptions');
export const ticketSourceOptions = getBusinessEnumOptions('ticketSourceOptions');
export const ticketTypeOptions = getBusinessEnumOptions('ticketTypeOptions');
export const compensationTypeOptions = getBusinessEnumOptions('compensationTypeOptions');
export const activityRewardStatusOptions = getBusinessEnumOptions('activityRewardStatusOptions');
export const inviteRecordStatusOptions = getBusinessEnumOptions('inviteRecordStatusOptions');
export const serviceCardStatusOptions = getBusinessEnumOptions('serviceCardStatusOptions');
export const merchantTodoCategoryOptions = getBusinessEnumOptions('merchantTodoCategoryOptions');
export const todoStatusOptions = getBusinessEnumOptions('todoStatusOptions');
export const yesNoOptions = getBusinessEnumOptions('yesNoOptions');
