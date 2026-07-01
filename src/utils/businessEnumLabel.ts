import { getBusinessEnumOptions, type BusinessEnumKey, type BusinessOption, FALLBACK_BUSINESS_ENUMS } from '@/constants/businessCatalog';

const normalizeValue = (value: unknown) => String(value ?? '');

export const getOptionLabel = (options: BusinessOption[] | undefined, value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  const matched = options?.find((item) => normalizeValue(item.value) === normalizeValue(value));
  return matched?.label;
};

const hasEnumKey = (key: string): key is BusinessEnumKey => key in FALLBACK_BUSINESS_ENUMS;

export const getBusinessEnumLabel = (key: BusinessEnumKey | string | undefined, value: unknown) => {
  if (!key || !hasEnumKey(key)) {
    return undefined;
  }
  return getOptionLabel(getBusinessEnumOptions(key), value);
};

const FIELD_ENUM_KEY_MAP: Record<string, BusinessEnumKey> = {
  memberLevel: 'userLevelOptions',
  userLevel: 'userLevelOptions',
  riskStatus: 'riskStatusOptions',
  flowType: 'balanceFlowTypeOptions',
  balanceFlowType: 'balanceFlowTypeOptions',
  rechargeStatus: 'rechargeOrderStatusOptions',
  rechargeOrderStatus: 'rechargeOrderStatusOptions',
  writeOffStatus: 'writeOffStatusOptions',
  writeoffStatus: 'writeOffStatusOptions',
  usageStatus: 'writeOffStatusOptions',
  writeOffMethod: 'writeOffMethodOptions',
  writeoffMethod: 'writeOffMethodOptions',
  writeoffMode: 'writeOffMethodOptions',
  performStatus: 'performStatusOptions',
  performScene: 'performSceneOptions',
  payMode: 'payModeOptions',
  refundStatus: 'refundStatusOptions',
  couponType: 'couponTypeOptions',
  cardType: 'serviceCardTypeOptions',
  serviceCardType: 'serviceCardTypeOptions',
  sourceType: 'ticketSourceOptions',
  issueStatus: 'activityRewardStatusOptions',
  rewardStatus: 'activityRewardStatusOptions',
  rewardType: 'rewardTypeOptions',
  inviteStatus: 'inviteRecordStatusOptions',
  inviteRecordStatus: 'inviteRecordStatusOptions',
  activityType: 'activityTypeOptions',
  activityStatus: 'activityStatusOptions',
  costOwner: 'costBearerOptions',
  costBearer: 'costBearerOptions',
  settlementCycle: 'settlementCycleOptions',
  contractStatus: 'merchantContractStatusOptions',
  auditStatus: 'auditStatusOptions',
  qualificationType: 'qualificationTypeOptions',
  merchantType: 'merchantTypeOptions',
  accountType: 'merchantAccountTypeOptions',
  entityStatus: 'merchantEntityStatusOptions',
  storeStatus: 'storeStatusOptions',
  pointType: 'pointTypeOptions',
  pointStatus: 'pointStatusOptions',
  deviceType: 'deviceTypeOptions',
  deviceStatus: 'deviceStatusOptions',
  controlMode: 'deviceControlModeOptions',
  faultLevel: 'deviceFaultLevelOptions',
  protocolType: 'deviceProtocolTypeOptions',
  maintainStatus: 'maintainStatusOptions',
  category: 'categoryOptions',
  billingMode: 'billingModeOptions',
  scopeType: 'scopeTypeOptions',
  scopeLevel: 'scopeLevelOptions',
  groupType: 'merchantGroupTypeOptions',
  relationStatus: 'profitRelationStatusOptions',
  partnerRole: 'partnerRoleOptions',
  settlementStatus: 'settlementStatusOptions',
  settlementMode: 'settlementModeOptions',
  payoutStatus: 'payoutStatusOptions',
  subjectType: 'settlementSubjectTypeOptions',
  detailType: 'settlementDetailTypeOptions',
  reconciliationStatus: 'reconciliationStatusOptions',
  publishStatus: 'publishStatusOptions',
  deliveryType: 'retailDeliveryTypeOptions',
  productStatus: 'retailProductStatusOptions',
  stockScope: 'retailStockScopeOptions',
  placement: 'adSlotPlacementOptions',
  contentType: 'adContentTypeOptions',
  adStatus: 'adStatusOptions',
  deliveryStatus: 'adDeliveryStatusOptions',
  subscribeStatus: 'subscribeStatusOptions',
  commandStatus: 'deviceCommandStatusOptions',
  snapshotType: 'analysisSnapshotTypeOptions',
  dimension: 'reportDimensionOptions',
  ticketSource: 'ticketSourceOptions',
  ticketStatus: 'ticketStatusOptions',
  priority: 'ticketPriorityOptions',
  compensationType: 'compensationTypeOptions',
  todoStatus: 'todoStatusOptions',
  todoCategory: 'merchantTodoCategoryOptions',
  realNameStatus: 'realNameStatusOptions',
  vehicleType: 'vehicleTypeOptions',
  riskScene: 'riskSceneOptions',
  issueChannel: 'issueChannelOptions',
  issueAudience: 'issueAudienceOptions',
  rechargeMode: 'rechargeModeOptions',
  rewardMethod: 'rewardMethodOptions',
  joinScene: 'joinSceneOptions',
  commandType: 'commandTypeOptions',
  callbackType: 'callbackTypeOptions',
  requestMethod: 'requestMethodOptions',
  callStatus: 'callStatusOptions',
  authMethod: 'authMethodOptions',
  signatureMethod: 'signatureMethodOptions',
  callbackRequired: 'yesNoTextOptions',
  statusGroup: 'statusGroupOptions',
  bizType: 'businessTypeOptions',
  fileType: 'fileTypeOptions',
  refType: 'refTypeOptions',
  actionType: 'actionTypeOptions',
  alarmScene: 'alarmSceneOptions',
  orgType: 'orgTypeOptions',
  configType: 'configTypeOptions',
  eventType: 'eventTypeOptions',
  changeType: 'changeTypeOptions',
  operationType: 'operationTypeOptions',
  refundType: 'refundTypeOptions',
  ticketType: 'ticketTypeOptions',
  defaultFlag: 'defaultFlagOptions',
  imageType: 'imageTypeOptions',
  contactType: 'contactTypeOptions',
  qualifyStatus: 'qualifyStatusOptions',
};

const LABEL_ENUM_RULES: Array<[RegExp, BusinessEnumKey]> = [
  [/会员等级|用户等级/, 'userLevelOptions'],
  [/风控/, 'riskStatusOptions'],
  [/流水类型/, 'balanceFlowTypeOptions'],
  [/充值.*状态/, 'rechargeOrderStatusOptions'],
  [/核销.*方式/, 'writeOffMethodOptions'],
  [/核销.*状态|使用状态/, 'writeOffStatusOptions'],
  [/履约.*状态/, 'performStatusOptions'],
  [/支付方式/, 'payModeOptions'],
  [/退款.*状态/, 'refundStatusOptions'],
  [/券类型|优惠券类型/, 'couponTypeOptions'],
  [/卡类型|服务卡类型/, 'serviceCardTypeOptions'],
  [/奖励类型/, 'rewardTypeOptions'],
  [/活动类型/, 'activityTypeOptions'],
  [/活动.*状态/, 'activityStatusOptions'],
  [/成本承担/, 'costBearerOptions'],
  [/结算周期/, 'settlementCycleOptions'],
  [/合同状态/, 'merchantContractStatusOptions'],
  [/审核状态/, 'auditStatusOptions'],
  [/资质类型/, 'qualificationTypeOptions'],
  [/商户类型/, 'merchantTypeOptions'],
  [/账号类型/, 'merchantAccountTypeOptions'],
  [/门店状态/, 'storeStatusOptions'],
  [/点位类型/, 'pointTypeOptions'],
  [/点位状态/, 'pointStatusOptions'],
  [/设备类型/, 'deviceTypeOptions'],
  [/设备状态/, 'deviceStatusOptions'],
  [/控制模式/, 'deviceControlModeOptions'],
  [/故障等级/, 'deviceFaultLevelOptions'],
  [/协议类型/, 'deviceProtocolTypeOptions'],
  [/维护状态/, 'maintainStatusOptions'],
  [/计费模式/, 'billingModeOptions'],
  [/适用范围|作用范围/, 'scopeTypeOptions'],
  [/范围层级/, 'scopeLevelOptions'],
  [/分润角色|合伙人角色/, 'partnerRoleOptions'],
  [/分润关系状态|关系状态/, 'profitRelationStatusOptions'],
  [/结算状态/, 'settlementStatusOptions'],
  [/结算模式/, 'settlementModeOptions'],
  [/打款状态/, 'payoutStatusOptions'],
  [/结算主体类型/, 'settlementSubjectTypeOptions'],
  [/结算明细类型/, 'settlementDetailTypeOptions'],
  [/对账状态/, 'reconciliationStatusOptions'],
  [/发布状态/, 'publishStatusOptions'],
  [/订阅状态/, 'subscribeStatusOptions'],
  [/消息状态|发送状态/, 'messageStatusOptions'],
  [/渠道/, 'messageChannelOptions'],
  [/工单状态/, 'ticketStatusOptions'],
  [/工单类型/, 'ticketTypeOptions'],
  [/工单来源/, 'ticketSourceOptions'],
  [/优先级/, 'ticketPriorityOptions'],
  [/补偿类型/, 'compensationTypeOptions'],
  [/待办状态/, 'todoStatusOptions'],
  [/实名状态/, 'realNameStatusOptions'],
  [/车辆类型/, 'vehicleTypeOptions'],
  [/风控场景|命中类型/, 'riskSceneOptions'],
  [/发放方式/, 'issueChannelOptions'],
  [/领取人群/, 'issueAudienceOptions'],
  [/充值方式/, 'rechargeModeOptions'],
  [/奖励方式/, 'rewardMethodOptions'],
  [/参与场景/, 'joinSceneOptions'],
  [/指令类型/, 'commandTypeOptions'],
  [/回调类型/, 'callbackTypeOptions'],
  [/请求方法|方法/, 'requestMethodOptions'],
  [/认证方式/, 'authMethodOptions'],
  [/签名算法/, 'signatureMethodOptions'],
  [/业务类型/, 'businessTypeOptions'],
  [/文件类型/, 'fileTypeOptions'],
  [/关联类型/, 'refTypeOptions'],
  [/处置动作/, 'actionTypeOptions'],
  [/告警类型/, 'alarmSceneOptions'],
  [/组织类型/, 'orgTypeOptions'],
  [/配置类型/, 'configTypeOptions'],
  [/事件类型/, 'eventTypeOptions'],
  [/变更类型/, 'changeTypeOptions'],
  [/操作类型/, 'operationTypeOptions'],
  [/退款类型/, 'refundTypeOptions'],
  [/售后类型/, 'ticketTypeOptions'],
  [/图片类型/, 'imageTypeOptions'],
  [/联系人类型/, 'contactTypeOptions'],
  [/达标状态/, 'qualifyStatusOptions'],
  [/状态$/, 'templateStatusOptions'],
];

const GLOBAL_LOOKUP_KEYS: BusinessEnumKey[] = [
  'statusOptions',
  'templateStatusOptions',
  'activityStatusOptions',
  'orderStatusOptions',
  'riskStatusOptions',
  'auditStatusOptions',
  'writeOffStatusOptions',
  'rechargeOrderStatusOptions',
  'serviceCardStatusOptions',
  'deviceCommandStatusOptions',
  'callStatusOptions',
  'realNameStatusOptions',
  'qualifyStatusOptions',
];

export const inferBusinessEnumLabel = (fieldName: string | undefined, fieldLabel: string | undefined, value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const name = fieldName || '';
  const label = fieldLabel || '';
  const directKey = FIELD_ENUM_KEY_MAP[name];
  const directLabel = getBusinessEnumLabel(directKey, value);
  if (directLabel) {
    return directLabel;
  }

  const lowerName = name.toLowerCase();
  const suffixKey = Object.entries(FIELD_ENUM_KEY_MAP).find(([field]) => lowerName.endsWith(field.toLowerCase()))?.[1];
  const suffixLabel = getBusinessEnumLabel(suffixKey, value);
  if (suffixLabel) {
    return suffixLabel;
  }

  const ruleKey = LABEL_ENUM_RULES.find(([rule]) => rule.test(label))?.[1];
  const ruleLabel = getBusinessEnumLabel(ruleKey, value);
  if (ruleLabel) {
    return ruleLabel;
  }

  if (/[A-Z_]{2,}/.test(String(value)) || /status|type|mode|scope|level|category|priority/i.test(name)) {
    for (const key of GLOBAL_LOOKUP_KEYS) {
      const found = getBusinessEnumLabel(key, value);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
};
