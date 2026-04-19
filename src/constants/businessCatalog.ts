export const merchantTypeOptions = [
  { value: 'DIRECT', label: '直营主体' },
  { value: 'FRANCHISE', label: '加盟主体' },
  { value: 'JOINT', label: '联营主体' },
];

export const merchantContractStatusOptions = [
  { value: 'ACTIVE', label: '履约中' },
  { value: 'PENDING', label: '待生效' },
  { value: 'EXPIRED', label: '已到期' },
];

export const statusOptions = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
];

export const storeStatusOptions = [
  { value: 'OPEN', label: '营业中' },
  { value: 'PAUSED', label: '暂停营业' },
  { value: 'CLOSED', label: '已停业' },
];

export const marketingOptions = [
  { value: 1, label: '开启' },
  { value: 0, label: '关闭' },
];

export const storeServiceCapabilityOptions = [
  { value: 'SCAN', label: '扫码消费' },
  { value: 'POINT_SELECT', label: '点位选择' },
  { value: 'BALANCE', label: '余额支付' },
  { value: 'COUPON', label: '优惠券' },
  { value: 'POINTS', label: '积分抵扣' },
  { value: 'RECHARGE', label: '充值活动' },
  { value: 'NIGHT_PRICE', label: '夜间价格' },
  { value: 'PICKUP', label: '门店自提' },
];

export const pointTypeOptions = [
  { value: 'CAR_WASH_BAY', label: '洗车工位' },
  { value: 'LAUNDRY_SLOT', label: '洗衣机位' },
  { value: 'RETAIL_SLOT', label: '零售点位' },
];

export const pointStatusOptions = [
  { value: 'IDLE', label: '空闲' },
  { value: 'RUNNING', label: '使用中' },
  { value: 'MAINTENANCE', label: '维护中' },
  { value: 'DISABLED', label: '停用' },
];

export const pointAbilityOptions = [
  { value: 'SCAN', label: '扫码识别' },
  { value: 'POINT_SELECT', label: '自主选位' },
  { value: 'NIGHT_PRICE', label: '夜间价格' },
  { value: 'QUEUE_HINT', label: '排队提示' },
  { value: 'COUPON_VERIFY', label: '券核销' },
];

export const deviceTypeOptions = [
  { value: 'CAR_WASH_HIGH_PRESSURE', label: '高压冲洗设备' },
  { value: 'CAR_WASH_FOAM', label: '泡沫设备' },
  { value: 'VACUUM', label: '吸尘设备' },
  { value: 'DRYER', label: '风干设备' },
  { value: 'LAUNDRY', label: '洗衣设备' },
  { value: 'DRINK', label: '饮料机' },
];

export const deviceStatusOptions = [
  { value: 'ONLINE', label: '在线' },
  { value: 'RUNNING', label: '运行中' },
  { value: 'FAULT', label: '故障' },
  { value: 'OFFLINE', label: '离线' },
  { value: 'MAINTENANCE', label: '维护中' },
];

export const deviceControlModeOptions = [
  { value: 'REMOTE', label: '远程控制' },
  { value: 'LOCAL', label: '本地控制' },
  { value: 'HYBRID', label: '混合控制' },
];

export const deviceFaultLevelOptions = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
];

export const categoryOptions = [
  { value: 'CAR_WASH_PACKAGE', label: '洗车套餐' },
  { value: 'TIME_PACK', label: '时长包' },
  { value: 'SERVICE_PACK', label: '服务包' },
  { value: 'COUNT_CARD', label: '次卡' },
  { value: 'MONTH_CARD', label: '月卡' },
];

export const billingModeOptions = [
  { value: 'PACKAGE', label: '套餐计费' },
  { value: 'TIME', label: '按分钟计费' },
  { value: 'COUNT', label: '按次计费' },
  { value: 'MIXED', label: '混合计费' },
];

export const scopeTypeOptions = [
  { value: 'PLATFORM', label: '平台' },
  { value: 'MERCHANT', label: '商户' },
  { value: 'STORE', label: '门店' },
];

export const serviceSellingPointOptions = [
  { value: 'FAST_ENTRY', label: '快速开洗' },
  { value: 'NIGHT_DISCOUNT', label: '夜洗优惠' },
  { value: 'MULTI_DEVICE', label: '多设备联动' },
  { value: 'COUPON_STACK', label: '支持叠券' },
  { value: 'BALANCE_DEDUCT', label: '余额抵扣' },
];
