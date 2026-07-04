import { request } from '@/utils/request';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface BackendUser {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: BackendUser;
  roles?: string[];
  permissions?: string[];
  token: string;
  tokenName?: string;
}

export interface UserInfo extends BackendUser {
  roles?: string[];
  permissions?: string[];
  createTime?: string;
  updateTime?: string;
}

export interface RoleOption {
  id: number;
  roleCode: string;
  roleName: string;
}

export interface UserRecord {
  id: number;
  username: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
  lastLoginTime?: string;
  roles?: RoleOption[];
}

export interface RoleRecord {
  id: number;
  roleName: string;
  roleCode: string;
  description?: string;
  sort?: number;
  status: number;
  permissionCount?: number;
  permissionIds?: number[];
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PermissionTreeNode {
  id: number;
  parentId?: number;
  permissionName?: string;
  name?: string;
  permissionCode?: string;
  permissionType?: number | string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  status?: number;
  visible?: number;
  createdAt?: string;
  updatedAt?: string;
  updateTime?: string;
  children?: PermissionTreeNode[];
}

export interface DictTypeRecord {
  id: number;
  dictName: string;
  dictCode: string;
  status: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DictDataRecord {
  id: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort?: number;
  status: number;
  remark?: string;
  updatedAt?: string;
  updateTime?: string;
}

export interface SelectOptionRecord {
  value: number;
  label: string;
  code?: string;
}

export interface BusinessEnumOption {
  value: string | number;
  label: string;
}

export type BusinessEnumMap = Record<string, BusinessEnumOption[]>;

export interface MerchantRecord {
  id: number;
  merchantName: string;
  merchantCode: string;
  merchantType: string;
  creditCode?: string;
  licenseUrl?: string;
  shortName?: string;
  storeCount?: number;
  remark?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface MerchantContactRecord {
  id: number;
  merchantId: number;
  merchantName?: string;
  contactType: string;
  contactName: string;
  mobile: string;
  email?: string;
  primaryFlag: number;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantContractRecord {
  id: number;
  merchantId: number;
  merchantName?: string;
  contractNo: string;
  contractName: string;
  settlementCycle?: string;
  contractStatus: string;
  fileUrl?: string;
  startAt?: string;
  endAt?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantSettlementAccountRecord {
  id: number;
  merchantId: number;
  merchantName?: string;
  accountName: string;
  accountNo: string;
  bankName?: string;
  auditStatus: string;
  effectiveAt?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantQualificationRecord {
  id: number;
  merchantId: number;
  merchantName?: string;
  qualificationType: string;
  qualificationNo: string;
  fileName?: string;
  fileUrl?: string;
  auditStatus: string;
  expireAt?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantFullProfileRecord {
  merchant: MerchantRecord;
  contacts: MerchantContactRecord[];
  qualifications: MerchantQualificationRecord[];
  contracts: MerchantContractRecord[];
  settlementAccounts: MerchantSettlementAccountRecord[];
  accounts: MerchantAccountRecord[];
  groups: MerchantGroupRecord[];
  stores: StoreRecord[];
  storeCount?: number;
  activeStoreCount?: number;
  deviceCount?: number;
  activeContractCount?: number;
  pendingQualificationCount?: number;
  pendingSettlementAccountCount?: number;
}

export interface MerchantGroupRecord {
  id: number;
  groupCode: string;
  groupName: string;
  merchantId?: number;
  merchantName?: string;
  groupType: string;
  storeCount?: number;
  writeoffRule?: string;
  settlementMode?: string;
  settlementCycle?: string;
  cashHolder?: string;
  revenueOwner?: string;
  clearingBase?: string;
  rechargeMerchantRate?: number | string;
  consumeMerchantRate?: number | string;
  platformRate?: number | string;
  clearingRemark?: string;
  linkedSettlementRuleId?: number;
  linkedSettlementRuleCode?: string;
  owner?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantGroupStoreRecord {
  id: number;
  groupId: number;
  merchantId?: number;
  storeId: number;
  storeName?: string;
  storeCode?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantAccountRecord {
  id: number;
  userId?: number;
  userName: string;
  mobile?: string;
  accountType: string;
  merchantId?: number;
  merchantName?: string;
  storeId?: number;
  storeName?: string;
  dataScopeType: string;
  status: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantTodoRecord {
  id: number;
  merchantId?: number;
  merchantName?: string;
  storeId?: number;
  title: string;
  owner?: string;
  deadline?: string;
  priority: string;
  status: string;
  category?: string;
  relatedStore?: string;
  relatedNo?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantWorkbenchStoreOverviewRecord {
  id: number;
  store: string;
  manager?: string;
  orders: number;
  revenue: number | string;
  activeCampaigns: number;
  settlementStatus: string;
  faultCount: number;
  afterSaleCount: number;
  status: string;
}

export interface MerchantWorkbenchOverviewRecord {
  stores: MerchantWorkbenchStoreOverviewRecord[];
  storeCount: number;
  revenue: number | string;
  runningCampaigns: number;
  pendingSettlement: number;
}

export interface StoreRecord {
  id: number;
  merchantId: number;
  merchantName?: string;
  storeName: string;
  storeCode: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  longitude?: number | string;
  latitude?: number | string;
  status: string;
  storePhone?: string;
  managerName?: string;
  managerPhone?: string;
  intro?: string;
  coverUrl?: string;
  imageUrls?: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface StoreFullProfileRecord {
  store: StoreRecord;
  images: StoreImageRecord[];
  capabilities: StoreServiceCapabilityRecord[];
  servicePoints: ServicePointRecord[];
  devices: DeviceRecord[];
  imageCount?: number;
  publishedCapabilityCount?: number;
  servicePointCount?: number;
  onlineDeviceCount?: number;
  offlineDeviceCount?: number;
  faultDeviceCount?: number;
  todayOrderCount?: number;
  processingOrderCount?: number;
  completedOrderCount?: number;
  todayPayAmount?: number | string;
  totalPayAmount?: number | string;
  todayWriteOffCount?: number;
  todayWriteOffAmount?: number | string;
  operationWarnings?: string[];
}

export interface StoreImageRecord { id: number; storeId: number; storeName?: string; imageType: string; imageUrl: string; sortNo?: number; status: string; createdAt?: string; updatedAt?: string; }
export interface StoreServiceCapabilityRecord {
  id: number;
  storeId: number;
  storeName?: string;
  capabilityCode: string;
  configJson?: string;
  limitMode?: string;
  pointScope?: string;
  extraLimit?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface ServicePointRecord {
  id: number;
  storeId: number;
  storeName?: string;
  pointCode: string;
  pointName?: string;
  pointType: string;
  abilityTags?: string;
  sortNo?: number;
  status: string;
  capacity?: number;
  locationDesc?: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ServicePointQrRecord { id: number; servicePointId: number; pointCode?: string; qrCode: string; qrVersion?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface ServicePointMaintainRecord { id: number; servicePointId: number; maintainNo: string; pointCode?: string; maintainType: string; owner?: string; status: string; plannedAt?: string; createdAt?: string; updatedAt?: string; }
export interface PointDeviceBindLogRecord { id: number; bindNo: string; servicePointId: number; pointCode?: string; pointType?: string; beforeDevice?: string; afterDevice?: string; operator?: string; boundAt?: string; createdAt?: string; updatedAt?: string; }

export interface DeviceRecord {
  id: number;
  storeId: number;
  storeName?: string;
  servicePointId?: number;
  pointCode?: string;
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  vendorName?: string;
  protocolType?: string;
  protocolVersion?: string;
  controlMode?: string;
  abilityTags?: string;
  lastHeartbeatAt?: string;
  installTime?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DeviceFullProfileRecord {
  device: DeviceRecord;
  store?: StoreRecord;
  servicePoint?: ServicePointRecord;
  bindLogs: DeviceBindLogRecord[];
  commands: DeviceCommandRecord[];
  commandLogs: DeviceCommandLogRecord[];
  faults: DeviceFaultRecord[];
  heartbeats: DeviceHeartbeatRecord[];
  maintenances: DeviceMaintenanceRecord[];
  bindLogCount?: number;
  commandCount?: number;
  pendingCommandCount?: number;
  commandLogCount?: number;
  faultCount?: number;
  openFaultCount?: number;
  heartbeatCount?: number;
  latestHeartbeatAt?: string;
  maintenanceCount?: number;
  pendingMaintenanceCount?: number;
  offlineMinutes?: number;
  healthStatus?: string;
  operationWarnings?: string[];
}

export interface PricingRuleRecord {
  id: number;
  ruleName: string;
  ruleCode: string;
  storeId?: number;
  storeName?: string;
  startPrice?: number | string;
  minutePrice?: number | string;
  countPrice?: number | string;
  capAmount?: number | string;
  freeMinutes?: number;
  nightPriceDesc?: string;
  holidayPriceDesc?: string;
  timeStart?: string;
  timeEnd?: string;
  nightPriceMode?: string;
  nightPriceValue?: string;
  holidayPriceMode?: string;
  holidayDates?: string;
  holidayPriceValue?: string;
  holidayStackPolicy?: string;
  effectiveAt?: string;
  expireAt?: string;
  versionNo?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ProductStatusLogRecord { id: number; productId?: number; productCode?: string; productName?: string; beforeStatus?: string; afterStatus?: string; operator?: string; changedAt?: string; createdAt?: string; updatedAt?: string; }

export interface PricingRuleVersionRecord { id: number; pricingRuleId?: number; ruleCode?: string; versionNo: string; billingMode?: string; basePrice?: number | string; effectiveAt?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface PricingChangeLogRecord { id: number; changeNo: string; pricingRuleId?: number; ruleCode?: string; versionNo?: string; changeField: string; beforeValue?: string; afterValue?: string; auditStatus?: string; changedAt?: string; createdAt?: string; updatedAt?: string; }

export interface DeviceCommandRecord {
  id: number;
  commandNo: string;
  serviceOrderNo?: string;
  deviceCode: string;
  commandType: string;
  commandPayload?: string;
  status?: string;
  ackAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceCommandLogRecord {
  id: number;
  commandNo: string;
  deviceCode?: string;
  requestPayload?: string;
  responsePayload?: string;
  retryCount?: number;
  loggedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceFaultRecord {
  id: number;
  faultNo: string;
  deviceCode: string;
  storeName?: string;
  faultType: string;
  level?: string;
  relatedOrderNo?: string;
  status?: string;
  owner?: string;
  reportedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceHeartbeatRecord {
  id: number;
  deviceCode: string;
  storeName?: string;
  signalStatus?: string;
  payload?: string;
  heartbeatAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceMaintenanceRecord {
  id: number;
  maintainNo: string;
  deviceCode: string;
  maintainType: string;
  owner?: string;
  status?: string;
  plannedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceVendorRecord { id: number; vendorCode: string; vendorName: string; contactName?: string; contactPhone?: string; apiBaseUrl?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceModelRecord { id: number; vendorName?: string; modelCode: string; modelName: string; deviceType: string; protocolCode?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceCommandTemplateRecord { id: number; templateCode: string; templateName: string; protocolCode?: string; deviceType?: string; commandType: string; commandPayload?: string; description?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceStatusMappingRecord { id: number; mappingCode: string; protocolCode?: string; statusGroup: string; vendorStatusCode: string; platformStatusCode: string; statusName: string; description?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceCallbackConfigRecord { id: number; callbackCode: string; callbackName: string; protocolCode?: string; vendorCode?: string; callbackType: string; callbackUrl: string; appKey?: string; appSecret?: string; signatureMethod?: string; ipWhitelist?: string; parserConfig?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceProtocolRecord {
  id: number;
  protocolCode: string;
  protocolName: string;
  protocolType: string;
  version?: string;
  authConfig?: string;
  authMethod?: string;
  signatureMethod?: string;
  callbackRequired?: string;
  securityOwner?: string;
  authRemark?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface DeviceBindLogRecord { id: number; deviceId?: number; bindNo: string; deviceCode?: string; beforeStore?: string; afterStore?: string; beforePoint?: string; afterPoint?: string; boundAt?: string; createdAt?: string; updatedAt?: string; }

export interface InviteActivityRecord {
  id: number;
  activityCode: string;
  activityName: string;
  scope?: string;
  scopeMode?: string;
  scopeIds?: string;
  qualifyCondition?: string;
  qualifyAmount?: number | string;
  qualifyDays?: number;
  inviterReward?: string;
  inviterRewardType?: string;
  inviterServiceCardId?: number;
  inviterRewardAmount?: number | string;
  tierRewardRules?: string;
  inviteCount?: number;
  qualifiedCount?: number;
  fraudChecks?: string;
  recoveryMode?: string;
  recoveryDays?: number;
  dailyLimitCount?: number;
  bannerImageUrl?: string;
  status: string;
  updatedAt?: string;
}

export interface RechargeActivityRecord {
  id: number;
  activityCode: string;
  activityName: string;
  rechargeMode?: string;
  scope?: string;
  scopeMode?: string;
  scopeIds?: string;
  costOwner?: string;
  usageScopePolicyId?: number;
  settlementRuleId?: number;
  fundOwnerUnitId?: number;
  promotionCostUnitId?: number;
  rewardType?: string;
  serviceCardId?: number;
  tierAmounts?: string;
  minAmount?: number;
  bannerImageUrl?: string;
  status: string;
  updatedAt?: string;
}

export interface RechargeActivityFullProfileRecord {
  activity: RechargeActivityRecord;
  serviceCard?: ServiceCardRecord;
  rechargeOrders: RechargeOrderRecord[];
  rechargeRewards: RechargeRewardRecord[];
  participations: MarketingParticipationRecord[];
  marketingRewards: MarketingRewardRecord[];
  budgets: MarketingBudgetRecord[];
  rechargeOrderCount?: number;
  paidOrderCount?: number;
  paidAmountTotal?: number | string;
  giftAmountTotal?: number | string;
  rewardRecordCount?: number;
  failedRewardCount?: number;
  participationCount?: number;
  issuedMarketingRewardCount?: number;
  budgetTotalAmount?: number | string;
  budgetUsedAmount?: number | string;
}

export interface MarketingParticipationRecord {
  id: number;
  activityCode: string;
  activityName?: string;
  userName?: string;
  joinScene?: string;
  qualifyStatus?: string;
  relatedOrderNo?: string;
  joinedAt?: string;
  updatedAt?: string;
}

export interface MarketingRewardRecord {
  id: number;
  rewardNo: string;
  activityCode: string;
  userName?: string;
  rewardType?: string;
  rewardValue?: string;
  costAmount?: number | string;
  status?: string;
  issuedAt?: string;
  remark?: string;
  updatedAt?: string;
}

export interface MarketingBudgetRecord {
  id: number;
  activityCode: string;
  budgetName: string;
  totalAmount?: number | string;
  usedAmount?: number | string;
  frozenAmount?: number | string;
  bearer?: string;
  status?: string;
  remark?: string;
  updatedAt?: string;
}

export interface ServiceOrderRecord {
  id: number;
  orderNo: string;
  merchantId: number;
  merchantName?: string;
  storeId: number;
  servicePointId?: number;
  orderType: string;
  billingMode: string;
  payMode: string;
  orderStatus: string;
  amount: number | string;
  payAmount: number | string;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  storeName?: string;
  pointCode?: string;
  serviceName?: string;
  userName?: string;
  plateNo?: string;
  status?: string;
  note?: string;
}

export interface OrderBalanceSettlementSnapshotRecord {
  id: number;
  serviceOrderNo: string;
  userId?: number;
  consumeStoreId?: number;
  rechargeNo?: string;
  scopeType?: string;
  scopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  fundOwnerType?: string;
  fundOwnerId?: number;
  revenueOwnerType?: string;
  revenueOwnerId?: number;
  giftCostBearerType?: string;
  giftCostBearerId?: number;
  cashAmount?: number | string;
  giftAmount?: number | string;
  settlementBaseAmount?: number | string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceOrderFinancialTraceRecord {
  order: ServiceOrderRecord;
  balanceSnapshots: OrderBalanceSettlementSnapshotRecord[];
  settlementAllocations: SettlementAllocationRecord[];
  settlementBillDetails: SettlementBillDetailRecord[];
  profitShareDetails: ProfitShareDetailRecord[];
  summary: {
    cashAmount?: number | string;
    giftAmount?: number | string;
    settlementBaseAmount?: number | string;
    principalAmount?: number | string;
    platformFeeAmount?: number | string;
    merchantReceivableAmount?: number | string;
    settlementBillAmount?: number | string;
    profitShareAmount?: number | string;
    snapshotCount?: number;
    allocationCount?: number;
    settlementBillDetailCount?: number;
    profitShareDetailCount?: number;
  };
}

export interface RefundOrderRecord {
  id: number;
  refundNo: string;
  serviceOrderId: number;
  refundType: string;
  refundStatus: string;
  refundAmount: number | string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
  orderNo?: string;
  amount?: number | string;
  applicant?: string;
  status?: string;
  auditNote?: string;
}

export interface AfterSaleTicketRecord {
  id: number;
  ticketNo: string;
  serviceOrderId?: number;
  ticketType: string;
  ticketStatus: string;
  content?: string;
  compensationType?: string;
  compensationValue?: string;
  createdAt?: string;
  updatedAt?: string;
  orderNo?: string;
  owner?: string;
  compensation?: string;
  status?: string;
  result?: string;
}

export interface ServiceEvaluationRecord {
  id: number;
  serviceOrderNo: string;
  appUserName: string;
  storeName: string;
  deviceCode: string;
  score: number;
  content: string;
  imageUrls?: string;
  replyContent?: string;
  replyUserName?: string;
  status: string;
  createdAt?: string;
  repliedAt?: string;
}

export interface UserFeedbackRecord {
  id: number;
  appUserName: string;
  feedbackType: string;
  content: string;
  contactPhone?: string;
  imageUrls?: string;
  handleStatus: string;
  ownerUserName?: string;
  result?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceOrderItemRecord {
  id: number;
  serviceOrderId: number;
  orderNo: string;
  itemType: string;
  itemName: string;
  objectId?: number;
  objectNo?: string;
  quantity: number;
  salePrice: number | string;
  discountAmount: number | string;
  payableAmount: number | string;
  snapshotJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderBillingDetailRecord {
  id: number;
  serviceOrderId: number;
  orderNo: string;
  billingMode: string;
  startAt?: string;
  endAt?: string;
  durationMinutes?: number;
  unitPrice?: number | string;
  billingAmount: number | string;
  billingSnapshot?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderStatusLogRecord {
  id: number;
  serviceOrderId: number;
  orderNo: string;
  beforeStatus?: string;
  afterStatus: string;
  operatorType?: string;
  operatorName?: string;
  remark?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WriteOffRecord {
  id: number;
  writeoffNo: string;
  serviceOrderId?: number;
  serviceOrderNo?: string;
  objectType: string;
  objectId?: number;
  objectName?: string;
  userId?: number;
  userName?: string;
  method: string;
  storeId?: number;
  storeName?: string;
  operatorName?: string;
  amount: number | string;
  result?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PerformRecord {
  id: number;
  relationNo: string;
  scene: string;
  storeId?: number;
  storeName?: string;
  servicePointId?: number;
  pointCode?: string;
  deviceId?: number;
  deviceCode?: string;
  commandNo?: string;
  commandStatus?: string;
  startAt?: string;
  finishAt?: string;
  status: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementBillRecord {
  id: number;
  billNo: string;
  billType: string;
  subjectId?: number;
  subjectName?: string;
  cycleType?: string;
  periodStart?: string;
  periodEnd?: string;
  cycle?: string;
  incomeAmount: number | string;
  refundAmount: number | string;
  costAmount: number | string;
  settlementAmount: number | string;
  billStatus: string;
  payoutStatus?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementRuleRecord {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleType: string;
  settlementMode: string;
  revenueOwnerType: string;
  giftCostBearerType?: string;
  ruleSnapshot?: string;
  versionNo?: string;
  status: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  balanceScopeType?: string;
  activityId?: number;
  issuerType?: string;
  issuerId?: number;
  sourceMerchantId?: number;
  sourceStoreId?: number;
  serviceMerchantId?: number;
  serviceStoreId?: number;
  merchantGroupId?: number;
  crossMerchantFlag?: string;
  revenueOwnerUnitType?: string;
  revenueOwnerUnitId?: number;
  principalCostBearerType?: string;
  principalCostBearerUnitId?: number;
  giftCostBearerUnitId?: number;
  giftCostShareRule?: string;
  platformFeeType?: string;
  platformFeeRate?: number | string;
  platformFeeFixedAmount?: number | string;
  platformFeeBase?: string;
  minPlatformFee?: number | string;
  maxPlatformFee?: number | string;
  platformFeeBearerType?: string;
  settlementCycle?: string;
  settlementDelayDays?: number;
  refundFreezeDays?: number;
  minSettlementAmount?: number | string;
  autoSettlement?: string;
  nettingEnabled?: string;
  refundRule?: string;
  serviceFeeRefundRule?: string;
  principalRestoreRule?: string;
  giftRestoreRule?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateSettlementBillsResponse {
  billCount: number;
  detailCount: number;
  totalSettlementAmount: number | string;
  bills: SettlementBillRecord[];
}

export interface SettlementBillDetailRecord {
  id: number;
  settlementBillId?: number;
  billNo: string;
  serviceOrderNo: string;
  detailType: string;
  amount: number | string;
  merchantName?: string;
  storeName?: string;
  settlementAllocationId?: number;
  balanceLotId?: number;
  rechargeNo?: string;
  balanceScopeType?: string;
  balanceScopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  fundOwnerType?: string;
  fundOwnerId?: number;
  revenueOwnerType?: string;
  revenueOwnerId?: number;
  giftCostBearerType?: string;
  giftCostBearerId?: number;
  principalAmount?: number | string;
  cashAmount?: number | string;
  giftAmount?: number | string;
  settlementBaseAmount?: number | string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  occurredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementCostDetailRecord {
  id: number;
  settlementBillId?: number;
  billNo: string;
  costType: string;
  costName: string;
  costAmount: number | string;
  bearer?: string;
  relatedNo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementPayoutRecord {
  id: number;
  payoutNo: string;
  billNo: string;
  accountName: string;
  bankName?: string;
  bankAccount?: string;
  payoutAmount: number | string;
  amount?: number | string;
  status: string;
  failureReason?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementConfirmRecord {
  id: number;
  billNo: string;
  subjectName?: string;
  confirmer?: string;
  confirmStatus: string;
  confirmNote?: string;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitPartnerRelationRecord {
  id: number;
  relationNo: string;
  storeId?: number;
  storeName: string;
  partnerName: string;
  partnerSubjectType?: string;
  partnerSubjectId?: number;
  partnerSubjectName?: string;
  partnerRole: string;
  distributionMode?: string;
  role?: string;
  shareRatio: number | string;
  ratio?: string;
  settleAccount?: string;
  primarySettlement?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  period?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitRatioVersionRecord {
  id: number;
  versionNo: string;
  relationNo: string;
  beforeRatio?: number | string;
  afterRatio: number | string;
  effectiveAt?: string;
  auditStatus: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitShareDetailRecord {
  id: number;
  detailNo: string;
  settlementBillNo?: string;
  serviceOrderNo?: string;
  orderNo?: string;
  storeName?: string;
  rechargeNo?: string;
  balanceScopeType?: string;
  balanceScopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  fundOwnerType?: string;
  fundOwnerId?: number;
  revenueOwnerType?: string;
  revenueOwnerId?: number;
  giftCostBearerType?: string;
  giftCostBearerId?: number;
  cashAmount?: number | string;
  giftAmount?: number | string;
  settlementBaseAmount?: number | string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  partnerName: string;
  partnerSubjectType?: string;
  partnerSubjectId?: number;
  partnerSubjectName?: string;
  distributionMode?: string;
  baseAmount: number | string;
  shareRatio?: number | string;
  ratio?: string;
  shareAmount: number | string;
  actualAmount?: number | string;
  refundAmount?: number | string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitChargebackRecord {
  id: number;
  chargebackNo: string;
  detailNo: string;
  refundNo?: string;
  partnerName: string;
  chargebackAmount: number | string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitConfirmRecord {
  id: number;
  confirmNo: string;
  settlementBillNo?: string;
  partnerName: string;
  confirmAmount: number | string;
  confirmer?: string;
  confirmStatus?: string;
  confirmRemark?: string;
  confirmedAt?: string;
  payoutStatus?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerPayableSummaryRecord {
  partnerName: string;
  confirmCount: number;
  pendingAmount: number | string;
  payableAmount: number | string;
  paidAmount?: number | string;
  rejectedAmount: number | string;
  totalAmount: number | string;
  latestSettlementBillNo?: string;
  latestConfirmedAt?: string;
  payoutStatus?: string;
}

export interface GenerateProfitConfirmResponse {
  generatedCount: number;
  totalConfirmAmount: number | string;
  confirms: ProfitConfirmRecord[];
}

export interface UserAssetAccountRecord {
  id: number;
  userId?: number;
  userName: string;
  phone?: string;
  balance?: number | string;
  giftBalance?: number | string;
  freezeBalance?: number | string;
  rechargeCount?: number;
  status?: string;
  latestChange?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BalanceFlowRecord {
  id: number;
  flowNo: string;
  userId?: number;
  userName?: string;
  storeId?: number;
  scopeType?: string;
  scopeId?: number;
  scopeName?: string;
  balanceLotId?: number;
  flowType: string;
  changeAmount?: number | string;
  principalAmount?: number | string;
  giftAmount?: number | string;
  balanceAfter?: number | string;
  relatedNo?: string;
  operator?: string;
  remark?: string;
  createdAt?: string;
}

export interface BalanceLotRecord {
  id: number;
  lotNo: string;
  walletId?: number;
  userId?: number;
  userName?: string;
  phone?: string;
  sourceType?: string;
  sourceNo?: string;
  rechargeNo?: string;
  activityId?: number;
  sourceStoreId?: number;
  sourceMerchantId?: number;
  sourceScopeType?: string;
  sourceScopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  usageScopePolicyId?: number;
  settlementRuleId?: number;
  fundOwnerUnitId?: number;
  promotionCostUnitId?: number;
  principalAmount?: number | string;
  giftAmount?: number | string;
  remainingPrincipal?: number | string;
  remainingGift?: number | string;
  settlementMode?: string;
  settlementRule?: string;
  status?: string;
  validFrom?: string;
  validTo?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementAllocationRecord {
  id: number;
  allocationNo: string;
  relatedNo?: string;
  serviceOrderNo?: string;
  balanceLotId?: number;
  walletId?: number;
  rechargeNo?: string;
  userId?: number;
  sourceStoreId?: number;
  sourceMerchantId?: number;
  serviceStoreId?: number;
  serviceMerchantId?: number;
  usageScopePolicyId?: number;
  settlementRuleId?: number;
  fundOwnerUnitId?: number;
  revenueOwnerUnitId?: number;
  giftCostBearerUnitId?: number;
  balanceScopeType?: string;
  balanceScopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  principalAmount?: number | string;
  giftAmount?: number | string;
  serviceAmount?: number | string;
  platformFeeAmount?: number | string;
  merchantReceivableAmount?: number | string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  allocationStatus?: string;
  occurredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppUserProfileRecord {
  id: number;
  userId?: number;
  userName: string;
  mobile?: string;
  memberLevel?: string;
  userTags?: string;
  realNameStatus?: string;
  riskStatus?: string;
  registeredAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserVehicleRecord {
  id: number;
  userId?: number;
  userName?: string;
  mobile?: string;
  plateNo: string;
  vehicleType?: string;
  brand?: string;
  color?: string;
  defaultFlag?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFavoriteStoreRecord {
  id: number;
  userId?: number;
  userName?: string;
  storeId?: number;
  storeName: string;
  city?: string;
  lastOrderNo?: string;
  orderCount?: number;
  lastVisitAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRiskRecord {
  id: number;
  userId?: number;
  userName?: string;
  mobile?: string;
  riskScene: string;
  riskReason?: string;
  relatedNo?: string;
  riskStatus?: string;
  owner?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppUserFullProfileRecord {
  profile: AppUserProfileRecord;
  account?: UserAssetAccountRecord;
  vehicles: UserVehicleRecord[];
  favoriteStores: UserFavoriteStoreRecord[];
  serviceCards: UserServiceCardRecord[];
  serviceCardUsages: ServiceCardUsageRecord[];
  rechargeOrders: RechargeOrderRecord[];
  serviceOrders: ServiceOrderRecord[];
  balanceFlows: BalanceFlowRecord[];
  riskRecords: UserRiskRecord[];
  vehicleCount?: number;
  favoriteStoreCount?: number;
  serviceCardCount?: number;
  activeServiceCardCount?: number;
  totalRemainTimes?: number;
  serviceCardUsageCount?: number;
  totalDeductCount?: number;
  rechargeOrderCount?: number;
  totalRechargePayAmount?: number | string;
  totalRechargeGiftAmount?: number | string;
  serviceOrderCount?: number;
  totalServicePayAmount?: number | string;
  balanceFlowCount?: number;
  riskRecordCount?: number;
  activeRiskCount?: number;
  totalBalance?: number | string;
  availableBalance?: number | string;
}

export interface AlarmRecord {
  id: number;
  ruleName?: string;
  alarmScene: string;
  alarmLevel: string;
  bizType: string;
  bizId: string;
  alarmContent?: string;
  handleStatus?: string;
  handledBy?: string;
  handledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface OpenApiCallLogRecord {
  id: number;
  clientName?: string;
  apiPath: string;
  requestMethod: string;
  requestPayload?: string;
  responsePayload?: string;
  responseCode?: number;
  callStatus?: string;
  costMs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerConfigRecord {
  id: number;
  bannerName: string;
  pageCode: string;
  slotCode?: string;
  title?: string;
  subtitle?: string;
  imageFileAssetId?: string;
  imageUrl?: string;
  jumpType?: string;
  jumpValue?: string;
  startAt?: string;
  endAt?: string;
  sortNo?: number;
  status?: number;
  extraJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgreementContentRecord {
  id: number;
  agreementType: string;
  title: string;
  content?: string;
  versionNo: string;
  effectiveAt?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformOrganizationRecord {
  id: number;
  orgCode: string;
  orgName: string;
  orgType?: string;
  parentName?: string;
  merchantName?: string;
  storeName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformDepartmentRecord {
  id: number;
  deptCode: string;
  deptName: string;
  organizationId?: number;
  organizationName?: string;
  parentDeptId?: number;
  parentDept?: string;
  manager?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformPositionRecord {
  id: number;
  positionCode: string;
  positionName: string;
  departmentId?: number;
  departmentName?: string;
  dataScope?: string;
  roleName?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformOrganizationChangeLogRecord {
  id: number;
  changeNo: string;
  objectName: string;
  changeType?: string;
  beforeValue?: string;
  afterValue?: string;
  operator?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRoleRelationRecord {
  id: number;
  userId?: number;
  userName: string;
  roleId?: number;
  roleName: string;
  roleCode: string;
  grantUser?: string;
  status?: number;
  grantedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataScopeRelationRecord {
  id: number;
  roleId?: number;
  roleName: string;
  scopeType: string;
  scopeName: string;
  merchantName?: string;
  storeName?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginLogRecord {
  id: number;
  userName: string;
  loginIp?: string;
  loginLocation?: string;
  device?: string;
  result: string;
  loginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationLogRecord {
  id: number;
  userName: string;
  moduleCode?: string;
  operationType?: string;
  bizNo?: string;
  result: string;
  operatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionChangeLogRecord {
  id: number;
  changeNo: string;
  targetUser: string;
  changeType?: string;
  beforeValue?: string;
  afterValue?: string;
  auditStatus: string;
  remark?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BizEventRecord {
  id: number;
  eventNo: string;
  eventType: string;
  bizNo?: string;
  idempotentKey?: string;
  processStatus?: string;
  retryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCardRecord {
  id: number;
  cardCode: string;
  cardName: string;
  cardType: string;
  scopeMode?: string;
  scopeIds?: string;
  scopeNote?: string;
  salePrice?: number | string;
  validityMode?: string;
  validityDays?: number;
  validityText?: string;
  stock?: number;
  rightsServiceTimes?: number;
  rightsDurationMinutes?: number;
  rightsServices?: string;
  rightsDiscount?: number | string;
  rightsTransferable?: boolean;
  issueChannels?: string;
  issueNeedApproval?: boolean;
  issueLimitPerUser?: number;
  issueAutoNotify?: boolean;
  rightsNote?: string;
  issueNote?: string;
  status?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCardFullProfileRecord {
  card: ServiceCardRecord;
  userCards: UserServiceCardRecord[];
  usageRecords: ServiceCardUsageRecord[];
  rechargeActivities: RechargeActivityRecord[];
  userCardCount?: number;
  activeUserCardCount?: number;
  expiredUserCardCount?: number;
  totalIssuedTimes?: number;
  totalRemainTimes?: number;
  usageCount?: number;
  totalUsedTimes?: number;
  rechargeActivityCount?: number;
  runningRechargeActivityCount?: number;
}

export interface UserServiceCardRecord {
  id: number;
  cardId?: number;
  cardNo: string;
  cardName: string;
  userId?: number;
  userName?: string;
  phone?: string;
  totalTimes?: number;
  remainTimes?: number;
  validFrom?: string;
  validTo?: string;
  sourceBizNo?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCardUsageRecord {
  id: number;
  userCardId?: number;
  usageNo?: string;
  cardNo: string;
  cardName?: string;
  userId?: number;
  userName?: string;
  serviceOrderNo?: string;
  storeId?: number;
  storeName?: string;
  useTimes?: number;
  deductCount?: number;
  status?: string;
  usedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RechargeOrderRecord {
  id: number;
  rechargeNo: string;
  userId?: number;
  userName?: string;
  phone?: string;
  storeId?: number;
  storeName?: string;
  scopeType?: string;
  scopeId?: number;
  merchantGroupId?: number;
  merchantGroupName?: string;
  settlementMode?: string;
  settlementRule?: string;
  settlementRuleSnapshot?: string;
  settlementStatus?: string;
  activityId?: number;
  activityName?: string;
  payAmount?: number | string;
  giftAmount?: number | string;
  payMode?: string;
  status?: string;
  paidAt?: string;
  rewardedAt?: string;
  refundedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RechargeRewardRecord {
  id: number;
  rewardNo: string;
  rechargeOrderId?: number;
  rechargeNo?: string;
  userId?: number;
  userName?: string;
  rewardType?: string;
  rewardAmount?: number | string;
  couponNo?: string;
  status?: string;
  issuedAt?: string;
  failReason?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationTaskRecord {
  id: number;
  taskNo: string;
  taskType?: string;
  bizType?: string;
  fileName?: string;
  operator?: string;
  status?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAssetOverviewRecord {
  userCount: number;
  balanceUserCount: number;
  rechargeOrderCount: number;
  balanceFlowCount: number;
  riskWatchCount: number;
}

export interface MessageRecord {
  id: number;
  messageNo: string;
  templateCode: string;
  receiver?: string;
  phone?: string;
  channel?: string;
  subscribeStatus?: string;
  status?: string;
  failReason?: string;
  sentAt?: string;
}
export interface MessageTemplateRecord {
  id: number;
  templateCode: string;
  templateName: string;
  scene?: string;
  channel?: string;
  triggerCondition?: string;
  targetUser?: string;
  status?: string;
  updatedAt?: string;
}

export interface AnalysisSnapshotRecord {
  id: number;
  key?: string;
  snapshotDate: string;
  snapshotHour?: number;
  snapshotType: string;
  dimension: string;
  scopeId: string;
  dimensionName: string;
  metricCode: string;
  metricValue: number | string;
  compareValue?: number | string;
  owner?: string;
  metricScene?: string;
  compareBasis?: string;
  supplement?: string;
  utilizationRate?: number | string;
  hotServiceName?: string;
  refundRate?: number | string;
  exposureCount?: number;
  clickCount?: number;
  conversionCount?: number;
  orderCount?: number;
  incomeAmount?: number | string;
  refundAmount?: number | string;
  activeDeviceCount?: number;
  faultDeviceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentReconciliationRecord {
  id: number;
  reconNo: string;
  channelCode: string;
  billDate?: string;
  platformAmount?: number | string;
  channelAmount?: number | string;
  diffAmount?: number | string;
  status?: string;
  handleRemark?: string;
  handledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface PlatformDashboardCardRecord {
  key: string;
  title: string;
  value: number | string;
  suffix?: string;
  route?: string;
  status?: string;
}

export interface PlatformDashboardItemRecord {
  id: number;
  title: string;
  category?: string;
  owner?: string;
  status?: string;
  priority?: string;
  route?: string;
  bizNo?: string;
  occurredAt?: string;
}

export interface PlatformDashboardChartPointRecord {
  date: string;
  orders: number;
  revenue: number | string;
  users: number;
}

export interface PlatformDashboardDistributionItemRecord {
  name: string;
  value: number;
  amount?: number | string;
}

export interface PlatformDashboardRankItemRecord {
  name: string;
  orders: number;
  revenue: number | string;
  status?: string;
}

export interface PlatformDashboardOverviewRecord {
  cards: PlatformDashboardCardRecord[];
  todos: PlatformDashboardItemRecord[];
  alerts: PlatformDashboardItemRecord[];
  changes: PlatformDashboardItemRecord[];
  quickEntries: PlatformDashboardItemRecord[];
  trend?: PlatformDashboardChartPointRecord[];
  orderStatusDistribution?: PlatformDashboardDistributionItemRecord[];
  storeStatusDistribution?: PlatformDashboardDistributionItemRecord[];
  settlementStatusDistribution?: PlatformDashboardDistributionItemRecord[];
  storeRevenueRank?: PlatformDashboardRankItemRecord[];
  balanceClearingCards?: PlatformDashboardCardRecord[];
  balanceScopeDistribution?: PlatformDashboardDistributionItemRecord[];
  revenueOwnerDistribution?: PlatformDashboardDistributionItemRecord[];
  giftCostBearerDistribution?: PlatformDashboardDistributionItemRecord[];
}

export interface FileAssetRecord {
  id?: number;
  fileAssetId: string;
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  storageProvider?: string;
  status?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const pageParams = (params: Record<string, unknown>) => ({
  ...params,
  current: params.current ?? params.pageNum ?? 1,
  size: params.size ?? params.pageSize ?? 10,
});

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Object.prototype.toString.call(value) === '[object Object]';

const normalizeRecordFields = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRecordFields(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const next: Record<string, any> = {};
  Object.entries(value).forEach(([key, item]) => {
    next[key] = normalizeRecordFields(item);
  });

  next.createdAt = next.createdAt ?? next.createTime;
  next.updatedAt = next.updatedAt ?? next.updateTime;
  next.createTime = next.createTime ?? next.createdAt;
  next.updateTime = next.updateTime ?? next.updatedAt;

  return next as T;
};

const normalizeEnvelope = <T,>(res: ApiEnvelope<T>): ApiEnvelope<T> => ({
  ...res,
  data: normalizeRecordFields(res.data),
});

const httpPage = async <T,>(url: string, params: Record<string, unknown>) =>
  normalizeEnvelope(await request.get<ApiEnvelope<PageResult<T>>>(url, { params: pageParams(params) }));

const httpPut = async <T,>(url: string, data?: Record<string, unknown>) =>
  normalizeEnvelope(await request.put<ApiEnvelope<T>>(url, data));

const httpGet = async <T,>(url: string, params?: Record<string, unknown>) =>
  normalizeEnvelope(await request.get<ApiEnvelope<T>>(url, params ? { params } : undefined));

const httpPost = async <T,>(url: string, data?: Record<string, unknown>) =>
  normalizeEnvelope(await request.post<ApiEnvelope<T>>(url, data));

const httpDelete = async <T,>(url: string) =>
  normalizeEnvelope(await request.delete<ApiEnvelope<T>>(url));

const mapPageRecords = <T, U>(page: PageResult<T>, mapper: (item: T) => U): PageResult<U> => ({
  ...page,
  records: (page.records || []).map(mapper),
});

const normalizeTimeFields = <T extends Record<string, any>>(item: T) => ({
  ...item,
  createdAt: item.createdAt ?? item.createTime,
  updatedAt: item.updatedAt ?? item.updateTime,
  createTime: item.createTime ?? item.createdAt,
  updateTime: item.updateTime ?? item.updatedAt,
});

const toRoleRecord = (role: Record<string, any>): RoleRecord => ({
  ...normalizeTimeFields(role),
  roleName: role.roleName ?? role.name,
  roleCode: role.roleCode ?? role.code,
  permissionCount: role.permissionCount ?? 0,
  permissionIds: role.permissionIds ?? [],
} as RoleRecord);

const toRolePayload = (data: Record<string, unknown>) => ({
  ...data,
  name: data.name ?? data.roleName,
  code: data.code ?? data.roleCode,
});

const toRoleOption = (role: Record<string, any>): RoleOption => ({
  id: role.id,
  roleName: role.roleName ?? role.name,
  roleCode: role.roleCode ?? role.code,
});

const toPermissionNode = (node: Record<string, any>): PermissionTreeNode => ({
  ...(normalizeTimeFields(node) as any),
  permissionName: node.permissionName ?? node.name,
  permissionCode: node.permissionCode ?? node.code ?? node.permission,
  permissionType: node.permissionType ?? node.type,
  children: (node.children || []).map(toPermissionNode),
});

const toMenuNode = (node: Record<string, any>): PermissionTreeNode => ({
  ...(normalizeTimeFields(node) as any),
  permissionName: node.permissionName ?? node.name,
  permissionCode: node.permissionCode ?? node.permission ?? node.code,
  permissionType: node.permissionType ?? node.type,
  children: (node.children || []).map(toMenuNode),
});

const toMenuPayload = (data: Record<string, unknown>) => ({
  ...data,
  name: data.name ?? data.permissionName,
  permission: data.permission ?? data.permissionCode,
  type: data.type ?? data.permissionType,
  parentId: data.parentId === 0 ? null : data.parentId,
});

const toDictTypeRecord = (dict: Record<string, any>): DictTypeRecord => ({
  ...normalizeTimeFields(dict),
  dictName: dict.dictName ?? dict.name,
  dictCode: dict.dictCode ?? dict.code,
  remark: dict.remark ?? dict.description,
} as DictTypeRecord);

const toDictTypePayload = (data: Record<string, unknown>) => ({
  ...data,
  name: data.name ?? data.dictName,
  code: data.code ?? data.dictCode,
  description: data.description ?? data.remark,
});

const toDictDataRecord = (item: Record<string, any>, dictCode?: string): DictDataRecord => ({
  ...normalizeTimeFields(item),
  dictCode: item.dictCode ?? dictCode ?? '',
  dictLabel: item.dictLabel ?? item.label,
  dictValue: item.dictValue ?? item.value,
  dictSort: item.dictSort ?? item.sort,
} as unknown as DictDataRecord);

const toDictDataPayload = async (data: Record<string, unknown>) => {
  let dictId = data.dictId;
  if (!dictId && data.dictCode) {
    const dict = await httpGet<Record<string, any>>(`/dictionaries/code/${data.dictCode}`);
    dictId = dict.data?.id;
  }

  const payload: Record<string, unknown> = {
    dictId,
    label: data.label ?? data.dictLabel,
    value: data.value ?? data.dictValue,
    sort: data.sort ?? data.dictSort,
    status: data.status,
    remark: data.remark,
  };

  return payload;
};

const toServiceOrderRecord = (order: Record<string, any>): ServiceOrderRecord => ({
  ...normalizeTimeFields(order),
  status: order.status ?? order.orderStatus,
  storeName: order.storeName ?? (order.storeId ? `门店#${order.storeId}` : '-'),
  pointCode: order.pointCode ?? (order.servicePointId ? `点位#${order.servicePointId}` : '-'),
  serviceName: order.serviceName ?? '自助洗车',
  userName: order.userName ?? '-',
} as unknown as ServiceOrderRecord);

const toRefundOrderRecord = (refund: Record<string, any>): RefundOrderRecord => ({
  ...normalizeTimeFields(refund),
  status: refund.status ?? refund.refundStatus,
  amount: refund.amount ?? refund.refundAmount,
  orderNo: refund.orderNo ?? (refund.serviceOrderId ? `订单#${refund.serviceOrderId}` : '-'),
  applicant: refund.applicant ?? '-',
} as unknown as RefundOrderRecord);

const toAfterSaleTicketRecord = (ticket: Record<string, any>): AfterSaleTicketRecord => ({
  ...normalizeTimeFields(ticket),
  status: ticket.status ?? ticket.ticketStatus,
  orderNo: ticket.orderNo ?? (ticket.serviceOrderId ? `订单#${ticket.serviceOrderId}` : '-'),
  owner: ticket.owner ?? '-',
  compensation: ticket.compensation ?? [ticket.compensationType, ticket.compensationValue].filter(Boolean).join(' / '),
  result: ticket.result ?? ticket.compensationValue,
} as unknown as AfterSaleTicketRecord);

const toWriteOffRecord = (record: Record<string, any>): WriteOffRecord => ({
  ...normalizeTimeFields(record),
  operator: record.operator ?? record.operatorName,
} as unknown as WriteOffRecord & { operator?: string });

const toPerformRecord = (record: Record<string, any>): PerformRecord => ({
  ...normalizeTimeFields(record),
} as unknown as PerformRecord);

const toSettlementBillRecord = (bill: Record<string, any>): SettlementBillRecord => ({
  ...normalizeTimeFields(bill),
  subjectName: bill.subjectName ?? (bill.subjectId ? `主体#${bill.subjectId}` : '-'),
  cycle: bill.cycle ?? [bill.periodStart, bill.periodEnd].filter(Boolean).join(' 至 '),
  status: bill.status ?? bill.billStatus,
  payoutStatus: bill.payoutStatus ?? (bill.billStatus === 'SETTLED' ? 'PAID' : 'UNPAID'),
} as unknown as SettlementBillRecord);

const toSettlementBillDetailRecord = (detail: Record<string, any>): SettlementBillDetailRecord => ({
  ...normalizeTimeFields(detail),
} as unknown as SettlementBillDetailRecord);

const toSettlementCostDetailRecord = (detail: Record<string, any>): SettlementCostDetailRecord => ({
  ...normalizeTimeFields(detail),
} as unknown as SettlementCostDetailRecord);

const formatRatio = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}%` : String(value);
};

const toProfitPartnerRelationRecord = (record: Record<string, any>): ProfitPartnerRelationRecord => ({
  ...normalizeTimeFields(record),
  role: record.role ?? record.partnerRole,
  partnerName: record.partnerSubjectName ?? record.partnerName,
  ratio: record.ratio ?? formatRatio(record.shareRatio),
  period: record.period ?? [record.effectiveStart, record.effectiveEnd].filter(Boolean).join(' ~ '),
} as unknown as ProfitPartnerRelationRecord);

const toProfitShareDetailRecord = (record: Record<string, any>): ProfitShareDetailRecord => ({
  ...normalizeTimeFields(record),
  orderNo: record.orderNo ?? record.serviceOrderNo,
  actualAmount: record.actualAmount ?? record.shareAmount,
  ratio: record.ratio ?? formatRatio(record.shareRatio),
} as unknown as ProfitShareDetailRecord);

const toSettlementPayoutRecord = (record: Record<string, any>): SettlementPayoutRecord => ({
  ...normalizeTimeFields(record),
  amount: record.amount ?? record.payoutAmount,
} as unknown as SettlementPayoutRecord);

const ok = <T,>(data: T, message = 'success'): ApiEnvelope<T> => ({
  code: 200,
  message,
  data,
  timestamp: Date.now(),
});

export const authApi = {
  login: async (payload: LoginRequest) =>
    request.post<ApiEnvelope<LoginResponse>>('/auth/login', payload),
  logout: async () => request.post<ApiEnvelope<void>>('/auth/logout'),
  getCurrentUser: async () => httpGet<LoginResponse>('/auth/me'),
};

export const userApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<UserRecord>('/users', params),
  add: async (data: Record<string, unknown>) => httpPost<UserRecord>('/users', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/users/${data.id}`, data),
  updateRoles: async (id: number, roleCodes: string[], grantUser?: string) =>
    httpPut<void>(`/users/${id}/roles`, { roleCodes, grantUser }),
  remove: async (id: number) => httpDelete<void>(`/users/${id}`),
  changeStatus: async (id: number, status: number) => httpPut<void>(`/users/${id}/status`, { status }),
  resetPassword: async (id: number, newPassword: string) => request.post<ApiEnvelope<void>>(`/users/${id}/reset-password`, { newPassword }),
  roleList: async () => (async () => {
    const res = await httpPage<Record<string, any>>('/roles', { pageNum: 1, pageSize: 500, status: 1 });
    return ok(res.data.records.map(toRoleOption));
  })(),
};

export const roleApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/roles', params);
    return ok(mapPageRecords(res.data, toRoleRecord));
  })(),
  add: async (data: Record<string, unknown>) => (async () => {
    const roleRes = await httpPost<Record<string, any>>('/roles', toRolePayload(data));
    if (roleRes.data?.id && Array.isArray(data.permissionIds)) {
      await httpPut<void>(`/roles/${roleRes.data.id}/permission-ids`, { permissionIds: data.permissionIds });
    }
    return ok(toRoleRecord(roleRes.data));
  })(),
  edit: async (data: Record<string, unknown>) => (async () => {
    await httpPut<void>(`/roles/${data.id}`, toRolePayload(data));
    if (Array.isArray(data.permissionIds)) {
      await httpPut<void>(`/roles/${data.id}/permission-ids`, { permissionIds: data.permissionIds });
    }
    return ok(undefined);
  })(),
  remove: async (id: number) => httpDelete<void>(`/roles/${id}`),
  permissionTree: async () => (async () => {
    const res = await httpGet<Record<string, any>[]>('/permissions');
    return ok(res.data.map(toPermissionNode));
  })(),
  permissionIds: async (id: number) => httpGet<number[]>(`/roles/${id}/permission-ids`),
};

export const permissionApi = {
  tree: async () => roleApi.permissionTree(),
  add: (data: Record<string, unknown>) => menuApi.add(data),
  edit: (data: Record<string, unknown>) => menuApi.edit(data),
  remove: (id: number) => menuApi.remove(id),
};

export const menuApi = {
  tree: async () => (async () => {
    const res = await httpGet<Record<string, any>[]>('/menus');
    return ok(res.data.map(toMenuNode));
  })(),
  add: async (data: Record<string, unknown>) => (async () => {
    const res = await httpPost<Record<string, any>>('/menus', toMenuPayload(data));
    return ok(toMenuNode(res.data));
  })(),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/menus/${data.id}`, toMenuPayload(data)),
  remove: async (id: number) => httpDelete<void>(`/menus/${id}`),
};

export const businessEnumApi = {
  list: async () => httpGet<BusinessEnumMap>('/business-enums'),
};

export const dictApi = {
  typeList: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/dictionaries', params);
    return ok(mapPageRecords(res.data, toDictTypeRecord));
  })(),
  typeAdd: async (data: Record<string, unknown>) => (async () => {
    const res = await httpPost<Record<string, any>>('/dictionaries', toDictTypePayload(data));
    return ok(toDictTypeRecord(res.data));
  })(),
  typeEdit: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/dictionaries/${id}`, toDictTypePayload(data)),
  typeRemove: async (id: number) => httpDelete<void>(`/dictionaries/${id}`),
  dataList: async (params: Record<string, unknown>) =>
    (async () => {
      const dictCode = String(params.dictCode || '');
      const res = await httpGet<Record<string, any>[]>(`/dictionary-items/code/${dictCode}`);
      const records = res.data.map((item) => toDictDataRecord(item, dictCode));
      return ok({
        records,
        total: records.length,
        size: records.length,
        current: 1,
        pages: 1,
      } satisfies PageResult<DictDataRecord>);
    })(),
  dataAdd: async (data: Record<string, unknown>) => (async () => {
    const payload = await toDictDataPayload(data);
    const res = await httpPost<Record<string, any>>('/dictionary-items', payload);
    return ok(toDictDataRecord(res.data, String(data.dictCode || '')));
  })(),
  dataEdit: async (id: number, data: Record<string, unknown>) => (async () => {
    const payload = await toDictDataPayload(data);
    return httpPut<void>(`/dictionary-items/${id}`, payload);
  })(),
  dataRemove: async (id: number) => httpDelete<void>(`/dictionary-items/${id}`),
};

export const merchantApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantRecord>('/merchants', params),
  options: async (params?: { includeDisabled?: boolean }) =>
    httpGet<SelectOptionRecord[]>('/merchants/options', params),
  fullProfile: async (id: number) =>
    httpGet<MerchantFullProfileRecord>(`/merchants/${id}/full-profile`),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantRecord>('/merchants', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/merchants/${data.id}`, data),
  changeStatus: async (id: number, status: number) => httpPut<void>(`/merchants/${id}/status`, { status }),
  remove: async (id: number) => httpDelete<void>(`/merchants/${id}`),
};

const crudApi = <T,>(url: string) => ({
  page: async (params: Record<string, unknown>) =>
    httpPage<T>(url, params),
  add: async (data: Record<string, unknown>) =>
    httpPost<T>(url, data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`${url}/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`${url}/${id}`),
});

export const merchantContactApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantContactRecord>('/merchant-contacts', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantContactRecord>('/merchant-contacts', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-contacts/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-contacts/${id}`),
};
export const merchantContractApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantContractRecord>('/merchant-contracts', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantContractRecord>('/merchant-contracts', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-contracts/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-contracts/${id}`),
};
export const merchantSettlementAccountApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantSettlementAccountRecord>('/merchant-settlement-accounts', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantSettlementAccountRecord>('/merchant-settlement-accounts', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-settlement-accounts/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-settlement-accounts/${id}`),
};
export const merchantQualificationApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantQualificationRecord>('/merchant-qualifications', params),
  detail: async (id: number) =>
    httpGet<MerchantQualificationRecord>(`/merchant-qualifications/${id}`),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantQualificationRecord>('/merchant-qualifications', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-qualifications/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-qualifications/${id}`),
};
export const merchantGroupApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantGroupRecord>('/merchant-groups', params),
  options: async () =>
    httpGet<SelectOptionRecord[]>('/merchant-groups/options'),
  storedValueOptions: async () =>
    httpGet<SelectOptionRecord[]>('/merchant-groups/stored-value-options'),
  syncSettlementRule: async (id: number) =>
    httpPost<SettlementRuleRecord | null>(`/merchant-groups/${id}/settlement-rule/sync`, {}),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantGroupRecord>('/merchant-groups', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-groups/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-groups/${id}`),
  changeStatus: async (id: number, status: string) =>
    httpPut<void>(`/merchant-groups/${id}/status`, { status }),
};
export const merchantGroupStoreApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantGroupStoreRecord>('/merchant-group-stores', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantGroupStoreRecord>('/merchant-group-stores', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-group-stores/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-group-stores/${id}`),
};
export const merchantAccountApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantAccountRecord>('/merchant-accounts', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantAccountRecord>('/merchant-accounts', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-accounts/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-accounts/${id}`),
  changeStatus: async (id: number, status: number) =>
    httpPut<void>(`/merchant-accounts/${id}/status`, { status }),
};
export const merchantTodoApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<MerchantTodoRecord>('/merchant-todos', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<MerchantTodoRecord>('/merchant-todos', data),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/merchant-todos/${data.id}`, data),
  remove: async (id: number) =>
    httpDelete<void>(`/merchant-todos/${id}`),
  changeStatus: async (id: number, status: string) =>
    httpPut<void>(`/merchant-todos/${id}/status`, { status }),
};
export const merchantWorkbenchApi = {
  overview: async (params?: Record<string, unknown>) =>
    httpGet<MerchantWorkbenchOverviewRecord>('/merchant-workbench/overview', params),
};

export const storeApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<StoreRecord>('/stores', params),
  options: async (merchantId?: number) =>
    httpGet<SelectOptionRecord[]>('/stores/options', merchantId ? { merchantId } : undefined),
  fullProfile: async (id: number) =>
    httpGet<StoreFullProfileRecord>(`/stores/${id}/full-profile`),
  add: async (data: Record<string, unknown>) =>
    httpPost<StoreRecord>('/stores', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/stores/${data.id}`, data),
  changeStatus: async (id: number, status: string) =>
    httpPut<void>(`/stores/${id}/status`, { status }),
  remove: async (id: number) => httpDelete<void>(`/stores/${id}`),
};

export const storeImageApi = crudApi<StoreImageRecord>('/store-images');
export const storeServiceCapabilityApi = crudApi<StoreServiceCapabilityRecord>('/store-service-capabilities');
export const servicePointApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<ServicePointRecord>('/service-points', params),
  options: async (storeId?: number) =>
    httpGet<SelectOptionRecord[]>('/service-points/options', storeId ? { storeId } : undefined),
  add: async (data: Record<string, unknown>) =>
    httpPost<ServicePointRecord>('/service-points', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/service-points/${data.id}`, data),
  remove: async (id: number) => httpDelete<void>(`/service-points/${id}`),
};

export const servicePointQrRecordApi = crudApi<ServicePointQrRecord>('/service-point-qr-records');
export const servicePointMaintainRecordApi = crudApi<ServicePointMaintainRecord>('/service-point-maintain-records');
export const pointDeviceBindLogApi = crudApi<PointDeviceBindLogRecord>('/point-device-bind-logs');

export const deviceApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<DeviceRecord>('/devices', params),
  options: async (params?: { storeId?: number; servicePointId?: number }) =>
    httpGet<SelectOptionRecord[]>('/devices/options', params),
  fullProfile: async (id: number) =>
    httpGet<DeviceFullProfileRecord>(`/devices/${id}/full-profile`),
  add: async (data: Record<string, unknown>) =>
    httpPost<DeviceRecord>('/devices', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/devices/${data.id}`, data),
  remove: async (id: number) => httpDelete<void>(`/devices/${id}`),
};

export const deviceVendorApi = crudApi<DeviceVendorRecord>('/device-vendors');
export const deviceModelApi = crudApi<DeviceModelRecord>('/device-models');
export const deviceProtocolApi = crudApi<DeviceProtocolRecord>('/device-protocols');
export const deviceCommandTemplateApi = crudApi<DeviceCommandTemplateRecord>('/device-command-templates');
export const deviceStatusMappingApi = crudApi<DeviceStatusMappingRecord>('/device-status-mappings');
export const deviceCallbackConfigApi = crudApi<DeviceCallbackConfigRecord>('/device-callback-configs');
export const deviceBindLogApi = crudApi<DeviceBindLogRecord>('/device-bind-logs');

export const deviceOpsApi = {
  commandLogs: crudApi<DeviceCommandLogRecord>('/device-command-logs'),
};

export const pricingRuleApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<PricingRuleRecord>('/pricing-rules', params),
  options: async () =>
    httpGet<SelectOptionRecord[]>('/pricing-rules/options'),
  add: async (data: Record<string, unknown>) =>
    httpPost<PricingRuleRecord>('/pricing-rules', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/pricing-rules/${data.id}`, data),
  changeStatus: async (id: number, status: number) =>
    httpPut<void>(`/pricing-rules/${id}/status`, { status }),
  remove: async (id: number) => httpDelete<void>(`/pricing-rules/${id}`),
};

export const productStatusLogApi = crudApi<ProductStatusLogRecord>('/product-status-logs');
export const pricingRuleVersionApi = crudApi<PricingRuleVersionRecord>('/pricing-rule-versions');
export const pricingChangeLogApi = crudApi<PricingChangeLogRecord>('/pricing-change-logs');

export const serviceOrderApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/service-orders', { ...params, orderStatus: params.orderStatus ?? params.status });
    return ok(mapPageRecords(res.data, toServiceOrderRecord));
  })(),
  add: async (data: Record<string, unknown>) =>
    httpPost<ServiceOrderRecord>('/service-orders', data),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    httpPut<void>(`/service-orders/${id}/status`, { ...data, orderStatus: data.orderStatus ?? data.status }),
  financialTrace: async (id: number) => httpGet<ServiceOrderFinancialTraceRecord>(`/service-orders/${id}/financial-trace`),
};

export const refundOrderApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/refund-orders', { ...params, refundStatus: params.refundStatus ?? params.status });
    return ok(mapPageRecords(res.data, toRefundOrderRecord));
  })(),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    request.post<ApiEnvelope<void>>(`/refund-orders/${id}/audit`, { ...data, refundStatus: data.refundStatus ?? data.status, reason: data.reason ?? data.note, auditNote: data.auditNote ?? data.note }),
};

export const afterSaleTicketApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/after-sale-tickets', { ...params, ticketStatus: params.ticketStatus ?? params.status });
    return ok(mapPageRecords(res.data, toAfterSaleTicketRecord));
  })(),
  add: async (data: Record<string, unknown>) =>
    httpPost<AfterSaleTicketRecord>('/after-sale-tickets', { ...data, ticketStatus: data.ticketStatus ?? data.status }),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    request.post<ApiEnvelope<void>>(`/after-sale-tickets/${id}/handle`, { ...data, ticketStatus: data.ticketStatus ?? data.status, compensationValue: data.compensationValue ?? data.result ?? data.note, result: data.result ?? data.note }),
};

export const serviceEvaluationApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<ServiceEvaluationRecord>('/service-evaluations', params),
  update: async (id: number, data: Record<string, unknown>) =>
    httpPut<void>(`/service-evaluations/${id}`, data),
};

export const userFeedbackApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<UserFeedbackRecord>('/user-feedbacks', { ...params, handleStatus: params.handleStatus ?? params.status }),
  update: async (id: number, data: Record<string, unknown>) =>
    httpPut<void>(`/user-feedbacks/${id}`, data),
};

export const serviceOrderItemApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<ServiceOrderItemRecord>('/service-order-items', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<ServiceOrderItemRecord>('/service-order-items', data),
};

export const orderBillingDetailApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<OrderBillingDetailRecord>('/order-billing-details', params),
  add: async (data: Record<string, unknown>) =>
    httpPost<OrderBillingDetailRecord>('/order-billing-details', data),
};

export const orderStatusLogApi = {
  page: async (params: Record<string, unknown>) =>
    httpPage<OrderStatusLogRecord>('/order-status-logs', params),
};

export const writeOffRecordApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/write-off-records', params);
    return ok(mapPageRecords(res.data, toWriteOffRecord));
  })(),
  add: async (data: Record<string, unknown>) =>
    httpPost<WriteOffRecord>('/write-off-records', data),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    httpPut<void>(`/write-off-records/${id}/status`, data),
};

export const performRecordApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/perform-records', params);
    return ok(mapPageRecords(res.data, toPerformRecord));
  })(),
  add: async (data: Record<string, unknown>) =>
    httpPost<PerformRecord>('/perform-records', data),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    httpPut<void>(`/perform-records/${id}/status`, data),
};

export const settlementRuleApi = crudApi<SettlementRuleRecord>('/settlement-rules');

export const settlementBillApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/settlement-bills', { ...params, billStatus: params.billStatus ?? params.status });
    return ok(mapPageRecords(res.data, toSettlementBillRecord));
  })(),
  add: async (data: Record<string, unknown>) => (async () => {
    const res = await httpPost<Record<string, any>>('/settlement-bills', { ...data, billStatus: data.billStatus ?? data.status });
    return ok(toSettlementBillRecord(res.data));
  })(),
  generateFromAllocations: async (data: Record<string, unknown>) => (async () => {
    const res = await httpPost<GenerateSettlementBillsResponse>('/settlement-bills/generate-from-allocations', data);
    return ok({
      ...res.data,
      bills: (res.data.bills || []).map((bill) => toSettlementBillRecord(bill as unknown as Record<string, any>)),
    });
  })(),
  edit: async (data: Record<string, unknown>) =>
    httpPut<void>(`/settlement-bills/${data.id}`, { ...data, billStatus: data.billStatus ?? data.status }),
  remove: async (id: number) =>
    httpDelete<void>(`/settlement-bills/${id}`),
};

export const settlementBillDetailApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/settlement-bill-details', params);
    return ok(mapPageRecords(res.data, toSettlementBillDetailRecord));
  })(),
};

export const settlementAllocationApi = {
  page: async (params: Record<string, unknown>) => httpPage<SettlementAllocationRecord>('/settlement-allocations', params),
};

export const settlementCostDetailApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/settlement-cost-details', params);
    return ok(mapPageRecords(res.data, toSettlementCostDetailRecord));
  })(),
  add: async (data: Record<string, unknown>) =>
    httpPost<SettlementCostDetailRecord>('/settlement-cost-details', data),
};

export const settlementPayoutApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/settlement-payouts', params);
    return ok(mapPageRecords(res.data, toSettlementPayoutRecord));
  })(),
  add: async (data: Record<string, unknown>) => httpPost<SettlementPayoutRecord>('/settlement-payouts', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/settlement-payouts/${data.id}`, data),
  updateStatus: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/settlement-payouts/${id}/status`, data),
};

export const settlementConfirmApi = crudApi<SettlementConfirmRecord>('/settlement-confirms');
export const profitPartnerRelationApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/profit-partner-relations', params);
    return ok(mapPageRecords(res.data, toProfitPartnerRelationRecord));
  })(),
  add: async (data: Record<string, unknown>) => httpPost<ProfitPartnerRelationRecord>('/profit-partner-relations', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/profit-partner-relations/${data.id}`, data),
  remove: async (id: number) => httpDelete<void>(`/profit-partner-relations/${id}`),
};
export const profitRatioVersionApi = crudApi<ProfitRatioVersionRecord>('/profit-ratio-versions');
export const profitShareDetailApi = {
  page: async (params: Record<string, unknown>) => (async () => {
    const res = await httpPage<Record<string, any>>('/profit-share-details', params);
    return ok(mapPageRecords(res.data, toProfitShareDetailRecord));
  })(),
  add: async (data: Record<string, unknown>) => httpPost<ProfitShareDetailRecord>('/profit-share-details', data),
  edit: async (data: Record<string, unknown>) => httpPut<void>(`/profit-share-details/${data.id}`, data),
  remove: async (id: number) => httpDelete<void>(`/profit-share-details/${id}`),
};
export const profitChargebackApi = crudApi<ProfitChargebackRecord>('/profit-chargebacks');
export const profitConfirmApi = {
  ...crudApi<ProfitConfirmRecord>('/profit-confirms'),
  generate: async (data: Record<string, unknown>) => httpPost<GenerateProfitConfirmResponse>('/profit-confirms/generate', data),
  updatePayoutStatus: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/profit-confirms/${id}/payout-status`, data),
  payableSummary: async (params: Record<string, unknown>) => httpGet<PartnerPayableSummaryRecord[]>('/profit-confirms/payable-summary', params),
};
export const marketingApi = {
  inviteActivities: {
    page: async (params: Record<string, unknown>) => httpPage<InviteActivityRecord>('/invite-activities', params),
    add: async (data: Record<string, unknown>) => httpPost<InviteActivityRecord>('/invite-activities', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/invite-activities/${data.id}`, data),
    remove: async (id: number) => httpDelete<void>(`/invite-activities/${id}`),
  },
  rechargeActivities: {
    page: async (params: Record<string, unknown>) => httpPage<RechargeActivityRecord>('/recharge-activities', params),
    fullProfile: async (id: number) => httpGet<RechargeActivityFullProfileRecord>(`/recharge-activities/${id}/full-profile`),
    add: async (data: Record<string, unknown>) => httpPost<RechargeActivityRecord>('/recharge-activities', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/recharge-activities/${data.id}`, data),
    changeStatus: async (id: number, status: string) => httpPut<void>(`/recharge-activities/${id}/status`, { status }),
    remove: async (id: number) => httpDelete<void>(`/recharge-activities/${id}`),
  },
  participations: {
    page: async (params: Record<string, unknown>) => httpPage<MarketingParticipationRecord>('/marketing-participations', params),
    add: async (data: Record<string, unknown>) => httpPost<MarketingParticipationRecord>('/marketing-participations', data),
  },
  rewards: {
    page: async (params: Record<string, unknown>) => httpPage<MarketingRewardRecord>('/marketing-rewards', params),
    add: async (data: Record<string, unknown>) => httpPost<MarketingRewardRecord>('/marketing-rewards', data),
    issue: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<MarketingRewardRecord>>(`/marketing-rewards/${id}/issue`, data),
  },
  budgets: {
    page: async (params: Record<string, unknown>) => httpPage<MarketingBudgetRecord>('/marketing-budgets', params),
    add: async (data: Record<string, unknown>) => httpPost<MarketingBudgetRecord>('/marketing-budgets', data),
    adjust: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<MarketingBudgetRecord>>(`/marketing-budgets/${id}/adjust`, data),
  },
};

export const assetApi = {
  userAccounts: {
    page: async (params: Record<string, unknown>) => httpPage<UserAssetAccountRecord>('/user-asset-accounts', params),
    adjust: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<UserAssetAccountRecord>>(`/user-asset-accounts/${id}/adjust`, data),
    freeze: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<UserAssetAccountRecord>>(`/user-asset-accounts/${id}/freeze`, data),
    unfreeze: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<UserAssetAccountRecord>>(`/user-asset-accounts/${id}/unfreeze`, data),
  },
  balanceFlows: {
    page: async (params: Record<string, unknown>) => httpPage<BalanceFlowRecord>('/balance-flows', params),
  },
  balanceLots: {
    page: async (params: Record<string, unknown>) => httpPage<BalanceLotRecord>('/balance-lots', params),
  },
  rechargeOrders: {
    page: async (params: Record<string, unknown>) => httpPage<RechargeOrderRecord>('/recharge-orders', params),
    add: async (data: Record<string, unknown>) => httpPost<RechargeOrderRecord>('/recharge-orders', data),
    reward: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<RechargeRewardRecord>>(`/recharge-orders/${id}/reward`, data),
    refund: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<RechargeOrderRecord>>(`/recharge-orders/${id}/refund`, data),
  },
  rechargeRewards: {
    page: async (params: Record<string, unknown>) => httpPage<RechargeRewardRecord>('/recharge-reward-records', params),
  },
  profiles: {
    ...crudApi<AppUserProfileRecord>('/app-user-profiles'),
    fullProfile: async (id: number) => httpGet<AppUserFullProfileRecord>(`/app-user-profiles/${id}/full-profile`),
  },
  vehicles: crudApi<UserVehicleRecord>('/user-vehicles'),
  favoriteStores: {
    page: async (params: Record<string, unknown>) => httpPage<UserFavoriteStoreRecord>('/user-favorite-stores', params),
    add: async (data: Record<string, unknown>) => httpPost<UserFavoriteStoreRecord>('/user-favorite-stores', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/user-favorite-stores/${data.id}`, data),
    remove: async (id: number) => httpDelete<void>(`/user-favorite-stores/${id}`),
  },
  riskRecords: {
    page: async (params: Record<string, unknown>) => httpPage<UserRiskRecord>('/user-risk-records', params),
    add: async (data: Record<string, unknown>) => httpPost<UserRiskRecord>('/user-risk-records', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/user-risk-records/${data.id}`, data),
  },
  serviceCards: {
    page: async (params: Record<string, unknown>) => httpPage<ServiceCardRecord>('/service-cards', params),
    options: async (params?: Record<string, unknown>) => httpGet<SelectOptionRecord[]>('/service-cards/options', params),
    fullProfile: async (id: number) => httpGet<ServiceCardFullProfileRecord>(`/service-cards/${id}/full-profile`),
    add: async (data: Record<string, unknown>) => httpPost<ServiceCardRecord>('/service-cards', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/service-cards/${data.id}`, data),
    changeStatus: async (id: number, status: string) => httpPut<void>(`/service-cards/${id}/status`, { status }),
    issue: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<UserServiceCardRecord>>(`/service-cards/${id}/issue`, data),
    remove: async (id: number) => httpDelete<void>(`/service-cards/${id}`),
  },
  userServiceCards: {
    page: async (params: Record<string, unknown>) => httpPage<UserServiceCardRecord>('/user-service-cards', params),
    add: async (data: Record<string, unknown>) => httpPost<UserServiceCardRecord>('/user-service-cards', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/user-service-cards/${data.id}`, data),
    deduct: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<ServiceCardUsageRecord>>(`/user-service-cards/${id}/deduct`, data),
  },
  serviceCardUsages: {
    page: async (params: Record<string, unknown>) => httpPage<ServiceCardUsageRecord>('/service-card-usages', params),
    add: async (data: Record<string, unknown>) => httpPost<ServiceCardUsageRecord>('/service-card-usages', data),
    rollback: async (id: number, data: Record<string, unknown>) => request.post<ApiEnvelope<ServiceCardUsageRecord>>(`/service-card-usages/${id}/rollback`, data),
  },
  operations: {
    overview: async () => httpGet<UserAssetOverviewRecord>('/user-asset-operations/overview'),
    batchTags: async (data: Record<string, unknown>) => request.post<ApiEnvelope<number>>('/user-asset-operations/batch-tags', data),
    riskBlacklist: async (data: Record<string, unknown>) => request.post<ApiEnvelope<number>>('/user-asset-operations/risk-blacklist', data),
  },
  userOptions: async (params?: Record<string, unknown>) => httpGet<SelectOptionRecord[]>('/app-user-profiles/options', params),
};

export const messageApi = {
  templates: {
    page: async (params: Record<string, unknown>) => httpPage<MessageTemplateRecord>('/message-templates', params),
    add: async (data: Record<string, unknown>) => httpPost<MessageTemplateRecord>('/message-templates', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/message-templates/${data.id}`, data),
  },
  serviceEvaluations: {
    page: async (params: Record<string, unknown>) => httpPage<ServiceEvaluationRecord>('/service-evaluations', params),
    update: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/service-evaluations/${id}`, data),
  },
  userFeedbacks: {
    page: async (params: Record<string, unknown>) => httpPage<UserFeedbackRecord>('/user-feedbacks', { ...params, handleStatus: params.handleStatus ?? params.status }),
    update: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/user-feedbacks/${id}`, data),
  },
  recordsPage: async (params: Record<string, unknown>) => httpPage<MessageRecord>('/message-records', params),
  records: {
    page: async (params: Record<string, unknown>) => httpPage<MessageRecord>('/message-records', params),
  },
  messageRecords: {
    page: async (params: Record<string, unknown>) => httpPage<MessageRecord>('/message-records', params),
    add: async (data: Record<string, unknown>) => httpPost<MessageRecord>('/message-records', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/message-records/${data.id}`, data),
    resend: async (id: number) => request.post<ApiEnvelope<void>>(`/message-records/${id}/resend`),
  },
};

export const analysisApi = {
  snapshots: {
    page: async (params: Record<string, unknown>) => httpPage<AnalysisSnapshotRecord>('/analysis-snapshots', params),
    add: async (data: Record<string, unknown>) => httpPost<AnalysisSnapshotRecord>('/analysis-snapshots', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/analysis-snapshots/${data.id}`, data),
  },
};
export const fileApi = {
  assets: {
    page: async (params: Record<string, unknown>) => httpPage<FileAssetRecord>('/file-assets', params),
    add: async (data: Record<string, unknown>) => httpPost<FileAssetRecord>('/file-assets', data),
    uploadImage: async (file: File, prefix = 'images', fileType?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);
      if (fileType) formData.append('fileType', fileType);
      return request.post<ApiEnvelope<FileAssetRecord>>('/file-assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    uploadFile: async (file: File, prefix = 'files', fileType?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);
      if (fileType) formData.append('fileType', fileType);
      return request.post<ApiEnvelope<FileAssetRecord>>('/file-assets/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  },
};

export const openApi = {
  callLogs: {
    page: async (params: Record<string, unknown>) => httpPage<OpenApiCallLogRecord>('/open-api-call-logs', params),
    add: async (data: Record<string, unknown>) => httpPost<OpenApiCallLogRecord>('/open-api-call-logs', data),
  },
};


export const miniProgramOpsApi = {
  banners: crudApi<BannerConfigRecord>('/banner-configs'),
  agreements: crudApi<AgreementContentRecord>('/agreement-contents'),
};

export const platformBaseApi = {
  organizations: crudApi<PlatformOrganizationRecord>('/platform-organizations'),
  departments: crudApi<PlatformDepartmentRecord>('/platform-departments'),
  positions: crudApi<PlatformPositionRecord>('/platform-positions'),
  organizationChangeLogs: {
    page: async (params: Record<string, unknown>) => httpPage<PlatformOrganizationChangeLogRecord>('/platform-organization-change-logs', params),
    add: async (data: Record<string, unknown>) => httpPost<PlatformOrganizationChangeLogRecord>('/platform-organization-change-logs', data),
  },
  events: {
    page: async (params: Record<string, unknown>) => httpPage<BizEventRecord>('/biz-events', params),
    add: async (data: Record<string, unknown>) => httpPost<BizEventRecord>('/biz-events', data),
    retry: async (id: number) => request.post<ApiEnvelope<BizEventRecord>>(`/biz-events/${id}/retry`),
  },
};

export const authAuditApi = {
  userRoles: {
    page: async (params: Record<string, unknown>) =>
      httpPage<UserRoleRelationRecord>('/user-role-relations', params),
    add: async (data: Record<string, unknown>) =>
      httpPost<UserRoleRelationRecord>('/user-role-relations', data),
    edit: async (data: Record<string, unknown>) =>
      httpPut<void>(`/user-role-relations/${data.id}`, data),
    remove: async (id: number) =>
      httpDelete<void>(`/user-role-relations/${id}`),
  },
  dataScopes: crudApi<DataScopeRelationRecord>('/data-scope-relations'),
  loginLogs: {
    page: async (params: Record<string, unknown>) => httpPage<LoginLogRecord>('/login-logs', params),
    add: async (data: Record<string, unknown>) => httpPost<LoginLogRecord>('/login-logs', data),
  },
  operationLogs: {
    page: async (params: Record<string, unknown>) => httpPage<OperationLogRecord>('/operation-logs', params),
    add: async (data: Record<string, unknown>) => httpPost<OperationLogRecord>('/operation-logs', data),
  },
  permissionChanges: {
    page: async (params: Record<string, unknown>) => httpPage<PermissionChangeLogRecord>('/permission-change-logs', params),
    add: async (data: Record<string, unknown>) => httpPost<PermissionChangeLogRecord>('/permission-change-logs', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/permission-change-logs/${data.id}`, data),
  },
};

export const paymentApi = {
  reconciliations: {
    page: async (params: Record<string, unknown>) =>
      httpPage<PaymentReconciliationRecord>('/payment-reconciliations', params),
    add: async (data: Record<string, unknown>) => httpPost<PaymentReconciliationRecord>('/payment-reconciliations', data),
    edit: async (data: Record<string, unknown>) => httpPut<void>(`/payment-reconciliations/${data.id}`, data),
    updateStatus: async (id: number, data: Record<string, unknown>) => httpPut<void>(`/payment-reconciliations/${id}/status`, data),
  },
};

export const platformDashboardApi = {
  overview: async () => httpGet<PlatformDashboardOverviewRecord>('/platform-dashboard/overview'),
};

export default {
  auth: authApi,
  user: userApi,
  role: roleApi,
  menu: menuApi,
  permission: permissionApi,
  businessEnums: businessEnumApi,
  dict: dictApi,
  merchant: merchantApi,
  merchantContact: merchantContactApi,
  merchantContract: merchantContractApi,
  merchantSettlementAccount: merchantSettlementAccountApi,
  merchantQualification: merchantQualificationApi,
  merchantGroup: merchantGroupApi,
  merchantGroupStore: merchantGroupStoreApi,
  merchantAccount: merchantAccountApi,
  merchantTodo: merchantTodoApi,
  merchantWorkbench: merchantWorkbenchApi,
  store: storeApi,
  storeImage: storeImageApi,
  storeServiceCapability: storeServiceCapabilityApi,
  servicePoint: servicePointApi,
  servicePointQrRecord: servicePointQrRecordApi,
  servicePointMaintainRecord: servicePointMaintainRecordApi,
  pointDeviceBindLog: pointDeviceBindLogApi,
  device: deviceApi,
  deviceVendor: deviceVendorApi,
  deviceModel: deviceModelApi,
  deviceProtocol: deviceProtocolApi,
  deviceCommandTemplate: deviceCommandTemplateApi,
  deviceStatusMapping: deviceStatusMappingApi,
  deviceCallbackConfig: deviceCallbackConfigApi,
  deviceBindLog: deviceBindLogApi,
  deviceOps: deviceOpsApi,
  pricingRule: pricingRuleApi,
  productStatusLog: productStatusLogApi,
  pricingRuleVersion: pricingRuleVersionApi,
  pricingChangeLog: pricingChangeLogApi,
  serviceOrder: serviceOrderApi,
  refundOrder: refundOrderApi,
  afterSaleTicket: afterSaleTicketApi,
  serviceOrderItem: serviceOrderItemApi,
  orderBillingDetail: orderBillingDetailApi,
  orderStatusLog: orderStatusLogApi,
  writeOffRecord: writeOffRecordApi,
  performRecord: performRecordApi,
  settlementRule: settlementRuleApi,
  settlementBill: settlementBillApi,
  settlementBillDetail: settlementBillDetailApi,
  settlementAllocation: settlementAllocationApi,
  settlementCostDetail: settlementCostDetailApi,
  settlementPayout: settlementPayoutApi,
  settlementConfirm: settlementConfirmApi,
  profitPartnerRelation: profitPartnerRelationApi,
  profitRatioVersion: profitRatioVersionApi,
  profitShareDetail: profitShareDetailApi,
  profitChargeback: profitChargebackApi,
  profitConfirm: profitConfirmApi,
  marketing: marketingApi,
  asset: assetApi,
  message: messageApi,
  analysis: analysisApi,
  file: fileApi,
  openApi,
  miniProgramOps: miniProgramOpsApi,
  platformBase: platformBaseApi,
  authAudit: authAuditApi,
  payment: paymentApi,
  platformDashboard: platformDashboardApi,
};
