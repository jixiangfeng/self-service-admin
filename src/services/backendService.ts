import { localDataStore } from './localDataStore';
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
}

export interface MerchantRecord {
  id: number;
  merchantName: string;
  merchantCode: string;
  merchantType: string;
  creditCode?: string;
  contactName?: string;
  contactPhone?: string;
  settlementAccountName?: string;
  settlementAccountNo?: string;
  settlementCycle?: string;
  licenseUrl?: string;
  shortName?: string;
  contractStatus?: string;
  cityCoverage?: string;
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

export interface MerchantChangeLogRecord {
  id: number;
  changeNo: string;
  merchantId: number;
  merchantName?: string;
  changeType: string;
  beforeValue?: string;
  afterValue?: string;
  operator?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
  businessHours?: string;
  holidayHours?: string;
  serviceFlags?: string;
  marketingEnabled?: number;
  status: string;
  notice?: string;
  storePhone?: string;
  managerName?: string;
  managerPhone?: string;
  intro?: string;
  tempClosed?: number;
  coverUrl?: string;
  imageUrls?: string;
  openTime?: string;
  closeTime?: string;
  tempClosedReason?: string;
  tempClosedUntil?: string;
  serviceRadius?: number | string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface StoreImageRecord { id: number; storeId: number; storeName?: string; imageType: string; imageUrl: string; sortNo?: number; status: string; createdAt?: string; updatedAt?: string; }
export interface StoreBusinessHoursRecord { id: number; storeId: number; storeName?: string; weekday: string; openTime: string; closeTime: string; status: string; createdAt?: string; updatedAt?: string; }
export interface StoreTempCloseRecord { id: number; storeId: number; storeName?: string; closeReason: string; startAt?: string; endAt?: string; operator?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface StoreServiceCapabilityRecord { id: number; storeId: number; storeName?: string; capabilityCode: string; configJson?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface StoreChangeLogRecord { id: number; changeNo: string; storeId: number; storeName?: string; changeType: string; beforeValue?: string; afterValue?: string; operator?: string; changedAt?: string; createdAt?: string; updatedAt?: string; }

export interface ServicePointRecord {
  id: number;
  storeId: number;
  storeName?: string;
  pointCode: string;
  pointName?: string;
  pointType: string;
  abilityTags?: string;
  qrCode?: string;
  sortNo?: number;
  status: string;
  capacity?: number;
  queueEnabled?: number;
  temporaryClosedUntil?: string;
  deviceCount?: number;
  qrStatus?: string;
  maintainStatus?: string;
  lastMaintainAt?: string;
  bindDeviceCodes?: string;
  locationDesc?: string;
  queueRule?: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ServicePointQrRecord { id: number; servicePointId: number; pointCode?: string; qrCode: string; qrVersion?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface ServicePointMaintainRecord { id: number; servicePointId: number; maintainNo: string; pointCode?: string; maintainType: string; owner?: string; status: string; plannedAt?: string; createdAt?: string; updatedAt?: string; }
export interface PointDeviceBindLogRecord { id: number; bindNo: string; servicePointId: number; pointCode?: string; pointType?: string; beforeDevice?: string; afterDevice?: string; operator?: string; boundAt?: string; createdAt?: string; updatedAt?: string; }
export interface ServicePointStatusLogRecord { id: number; servicePointId: number; logNo: string; pointCode?: string; beforeStatus?: string; afterStatus: string; reason?: string; changedAt?: string; createdAt?: string; updatedAt?: string; }

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
  faultLevel?: string;
  signalStrength?: number;
  abilityTags?: string;
  lastHeartbeatAt?: string;
  installTime?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ServiceProductRecord {
  id: number;
  productName: string;
  productCode: string;
  categoryCode: string;
  billingMode: string;
  scopeType: string;
  scopeId?: number;
  scopeName?: string;
  priceDesc?: string;
  discountRule?: string;
  serviceDuration?: string;
  usageNotice?: string;
  sellingPoints?: string;
  rightsContent?: string;
  refundRule?: string;
  priceVersion?: string;
  effectiveAt?: string;
  expireAt?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PricingRuleRecord {
  id: number;
  ruleName: string;
  ruleCode: string;
  storeId?: number;
  storeName?: string;
  serviceProductId?: number;
  productName?: string;
  startPrice?: number | string;
  minutePrice?: number | string;
  countPrice?: number | string;
  capAmount?: number | string;
  freeMinutes?: number;
  nightPriceDesc?: string;
  holidayPriceDesc?: string;
  timeSegment?: string;
  holidayRule?: string;
  effectiveAt?: string;
  expireAt?: string;
  versionNo?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DeviceVendorRecord { id: number; vendorCode: string; vendorName: string; contactName?: string; contactPhone?: string; apiBaseUrl?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceModelRecord { id: number; vendorName?: string; modelCode: string; modelName: string; deviceType: string; protocolCode?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceProtocolRecord { id: number; protocolCode: string; protocolName: string; protocolType: string; version?: string; authConfig?: string; status: string; createdAt?: string; updatedAt?: string; }
export interface DeviceBindLogRecord { id: number; deviceId?: number; bindNo: string; deviceCode?: string; beforeStore?: string; afterStore?: string; beforePoint?: string; afterPoint?: string; boundAt?: string; createdAt?: string; updatedAt?: string; }

export interface CouponTemplateRecord {
  id: number;
  templateCode: string;
  templateName: string;
  couponType: string;
  scope?: string;
  threshold?: string;
  validity?: string;
  issueRule?: string;
  stackRule?: string;
  stock?: number;
  status: string;
  updatedAt?: string;
}

export interface InviteActivityRecord {
  id: number;
  activityCode: string;
  activityName: string;
  qualifyRule?: string;
  inviterReward?: string;
  inviterRewardType?: string;
  inviteeReward?: string;
  inviteeRewardType?: string;
  inviteCount?: number;
  qualifiedCount?: number;
  rewardStatus?: string;
  recordStatus?: string;
  antiFraud?: string;
  recoveryRule?: string;
  dailyLimit?: string;
  status: string;
  updatedAt?: string;
}

export interface RechargeActivityRecord {
  id: number;
  activityCode: string;
  activityName: string;
  rechargeRule?: string;
  rewardRule?: string;
  scope?: string;
  costOwner?: string;
  tierRule?: string;
  minAmount?: number;
  rewardType?: string;
  rewardValue?: string;
  rewardStatus?: string;
  issuedCount?: number;
  status: string;
  updatedAt?: string;
}

export interface ServiceOrderRecord {
  id: number;
  orderNo: string;
  merchantId: number;
  storeId: number;
  servicePointId?: number;
  serviceProductId?: number;
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
  updatedAt?: string;
}

export interface BalanceFlowRecord {
  id: number;
  flowNo: string;
  userId?: number;
  userName?: string;
  flowType: string;
  changeAmount?: number | string;
  balanceAfter?: number | string;
  relatedNo?: string;
  operator?: string;
  remark?: string;
  createdAt?: string;
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

export interface SubscribeRecord {
  id: number;
  appUserName: string;
  mobile?: string;
  templateCode: string;
  templateName?: string;
  channel?: string;
  subscribeStatus?: string;
  subscribedAt?: string;
  expiredAt?: string;
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

export const useRealBackendApi = import.meta.env.VITE_USE_REAL_API === 'true';

const pageParams = (params: Record<string, unknown>) => ({
  ...params,
  current: params.current ?? params.pageNum ?? 1,
  size: params.size ?? params.pageSize ?? 10,
});

const httpPage = <T,>(url: string, params: Record<string, unknown>) =>
  request.get<ApiEnvelope<PageResult<T>>>(url, { params: pageParams(params) });

const httpPut = <T,>(url: string, data?: Record<string, unknown>) =>
  request.put<ApiEnvelope<T>>(url, data);

const httpGet = <T,>(url: string, params?: Record<string, unknown>) =>
  request.get<ApiEnvelope<T>>(url, params ? { params } : undefined);

const httpPost = <T,>(url: string, data?: Record<string, unknown>) =>
  request.post<ApiEnvelope<T>>(url, data);

const httpDelete = <T,>(url: string) =>
  request.delete<ApiEnvelope<T>>(url);

const ok = <T,>(data: T, message = 'success'): ApiEnvelope<T> => ({
  code: 200,
  message,
  data,
  timestamp: Date.now(),
});

const wait = (ms = 80) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const run = async <T,>(runner: () => T | Promise<T>) => {
  await wait();
  return ok(await runner());
};

const stripUserSecret = (user: BackendUser) => ({
  id: user.id,
  username: user.username,
  nickname: user.nickname,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const authApi = {
  login: async (payload: LoginRequest) =>
    run(() => {
      const response = localDataStore.authenticate(payload);
      return {
        ...response,
        user: stripUserSecret(response.user),
      };
    }),
  logout: async () => run(() => undefined),
  getCurrentUser: async () => run(() => localDataStore.getCurrentUser()),
};

export const userApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listUsers(params)),
  add: async (data: Record<string, unknown>) => run(() => {
    localDataStore.createUser(data);
  }),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateUser(data);
  }),
  remove: async () => run(() => {
    throw new Error('当前版本暂不支持删除用户');
  }),
  changeStatus: async (id: number, status: number) => run(() => {
    localDataStore.changeUserStatus(id, status);
  }),
  roleList: async () => run(() => localDataStore.listRoleOptions()),
};

export const roleApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listRoles(params)),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createRole(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateRole(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeRole(id);
  }),
  permissionTree: async () => run(() => localDataStore.listPermissionTree()),
  permissionIds: async (id: number) => run(() => localDataStore.getRolePermissionIds(id)),
};

export const permissionApi = {
  tree: async () => run(() => localDataStore.listPermissionTree()),
  add: () => Promise.reject(new Error('当前前端演示版未开放权限新增')),
  edit: () => Promise.reject(new Error('当前前端演示版未开放权限编辑')),
  remove: () => Promise.reject(new Error('当前前端演示版未开放权限删除')),
};

export const menuApi = {
  tree: async () => run(() => localDataStore.listMenus()),
  add: async (data: Record<string, unknown>) => run(() => {
    localDataStore.createMenu(data);
  }),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateMenu(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeMenu(id);
  }),
};

export const dictApi = {
  typeList: async (params: Record<string, unknown>) => run(() => localDataStore.listDictionaryTypes(params)),
  typeAdd: async (data: Record<string, unknown>) => run(() => {
    localDataStore.createDictionaryType(data);
  }),
  typeEdit: async (id: number, data: Record<string, unknown>) => run(() => {
    localDataStore.updateDictionaryType(id, data);
  }),
  typeRemove: async (id: number) => run(() => {
    localDataStore.removeDictionaryType(id);
  }),
  dataList: async (params: Record<string, unknown>) =>
    run(() => {
      const records = localDataStore.listDictionaryItems(String(params.dictCode || ''));
      return {
        records,
        total: records.length,
        size: records.length,
        current: 1,
        pages: 1,
      } satisfies PageResult<DictDataRecord>;
    }),
  dataAdd: async (data: Record<string, unknown>) => run(() => {
    localDataStore.createDictionaryItem(data);
  }),
  dataEdit: async (id: number, data: Record<string, unknown>) => run(() => {
    localDataStore.updateDictionaryItem(id, data);
  }),
  dataRemove: async (id: number) => run(() => {
    localDataStore.removeDictionaryItem(id);
  }),
};

export const merchantApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<MerchantRecord>('/merchants', params) : run(() => localDataStore.listMerchants(params)),
  options: async () =>
    useRealBackendApi ? httpGet<SelectOptionRecord[]>('/merchants/options') : run(() => localDataStore.listMerchantOptions()),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<MerchantRecord>('/merchants', data) : run(() => localDataStore.createMerchant(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/merchants/${data.id}`, data) : run(() => {
    localDataStore.updateMerchant(data);
  }),
  changeStatus: async (id: number, status: number) => useRealBackendApi ? httpPut<void>(`/merchants/${id}/status`, { status }) : run(() => {
    localDataStore.changeMerchantStatus(id, status);
  }),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/merchants/${id}`) : run(() => {
    localDataStore.removeMerchant(id);
  }),
};

const localEmptyPage = <T,>(params: Record<string, unknown>) => ({
  records: [] as T[],
  total: 0,
  size: Number(params.size ?? params.pageSize ?? 10),
  current: Number(params.current ?? params.pageNum ?? 1),
  pages: 0,
});

const crudApi = <T,>(url: string) => ({
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<T>(url, params) : run(() => localEmptyPage<T>(params)),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<T>(url, data) : run(() => data as unknown as T),
  edit: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`${url}/${data.id}`, data) : run(() => undefined),
  remove: async (id: number) =>
    useRealBackendApi ? httpDelete<void>(`${url}/${id}`) : run(() => undefined),
});

export const merchantContactApi = crudApi<MerchantContactRecord>('/merchant-contacts');
export const merchantContractApi = crudApi<MerchantContractRecord>('/merchant-contracts');
export const merchantSettlementAccountApi = crudApi<MerchantSettlementAccountRecord>('/merchant-settlement-accounts');
export const merchantQualificationApi = crudApi<MerchantQualificationRecord>('/merchant-qualifications');
export const merchantChangeLogApi = crudApi<MerchantChangeLogRecord>('/merchant-change-logs');

export const storeApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<StoreRecord>('/stores', params) : run(() => localDataStore.listStores(params)),
  options: async (merchantId?: number) =>
    useRealBackendApi ? httpGet<SelectOptionRecord[]>('/stores/options', merchantId ? { merchantId } : undefined) : run(() => localDataStore.listStoreOptions(merchantId)),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<StoreRecord>('/stores', data) : run(() => localDataStore.createStore(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/stores/${data.id}`, data) : run(() => {
    localDataStore.updateStore(data);
  }),
  changeStatus: async (id: number, status: string) =>
    useRealBackendApi ? httpPut<void>(`/stores/${id}/status`, { status }) : run(() => localDataStore.updateStore({ id, status })),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/stores/${id}`) : run(() => {
    localDataStore.removeStore(id);
  }),
};

export const storeImageApi = crudApi<StoreImageRecord>('/store-images');
export const storeBusinessHoursApi = crudApi<StoreBusinessHoursRecord>('/store-business-hours');
export const storeTempCloseRecordApi = crudApi<StoreTempCloseRecord>('/store-temp-close-records');
export const storeServiceCapabilityApi = crudApi<StoreServiceCapabilityRecord>('/store-service-capabilities');
export const storeChangeLogApi = crudApi<StoreChangeLogRecord>('/store-change-logs');

export const servicePointApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<ServicePointRecord>('/service-points', params) : run(() => localDataStore.listServicePoints(params)),
  options: async (storeId?: number) =>
    useRealBackendApi ? httpGet<SelectOptionRecord[]>('/service-points/options', storeId ? { storeId } : undefined) : run(() => localDataStore.listServicePointOptions(storeId)),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<ServicePointRecord>('/service-points', data) : run(() => localDataStore.createServicePoint(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/service-points/${data.id}`, data) : run(() => {
    localDataStore.updateServicePoint(data);
  }),
  changeStatus: async (id: number, status: string) =>
    useRealBackendApi ? httpPut<void>(`/service-points/${id}/status`, { status }) : run(() => localDataStore.updateServicePoint({ id, status })),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/service-points/${id}`) : run(() => {
    localDataStore.removeServicePoint(id);
  }),
};

export const servicePointQrRecordApi = crudApi<ServicePointQrRecord>('/service-point-qr-records');
export const servicePointMaintainRecordApi = crudApi<ServicePointMaintainRecord>('/service-point-maintain-records');
export const pointDeviceBindLogApi = crudApi<PointDeviceBindLogRecord>('/point-device-bind-logs');
export const servicePointStatusLogApi = crudApi<ServicePointStatusLogRecord>('/service-point-status-logs');

export const deviceApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<DeviceRecord>('/devices', params) : run(() => localDataStore.listDevices(params)),
  options: async (params?: { storeId?: number; servicePointId?: number }) =>
    useRealBackendApi ? httpGet<SelectOptionRecord[]>('/devices/options', params) : run(() => localDataStore.listDevices(params || {}).records.map((item) => ({ value: item.id, label: `${item.deviceName}（${item.deviceCode}）` }))),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<DeviceRecord>('/devices', data) : run(() => localDataStore.createDevice(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/devices/${data.id}`, data) : run(() => {
    localDataStore.updateDevice(data);
  }),
  changeStatus: async (id: number, status: string) =>
    useRealBackendApi ? httpPut<void>(`/devices/${id}/status`, { status }) : run(() => localDataStore.updateDevice({ id, status })),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/devices/${id}`) : run(() => {
    localDataStore.removeDevice(id);
  }),
};

export const deviceVendorApi = crudApi<DeviceVendorRecord>('/device-vendors');
export const deviceModelApi = crudApi<DeviceModelRecord>('/device-models');
export const deviceProtocolApi = crudApi<DeviceProtocolRecord>('/device-protocols');
export const deviceBindLogApi = crudApi<DeviceBindLogRecord>('/device-bind-logs');

export const serviceProductApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<ServiceProductRecord>('/service-products', params) : run(() => localDataStore.listServiceProducts(params)),
  options: async () =>
    useRealBackendApi ? httpGet<SelectOptionRecord[]>('/service-products/options') : run(() => localDataStore.listServiceProductOptions()),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<ServiceProductRecord>('/service-products', data) : run(() => localDataStore.createServiceProduct(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/service-products/${data.id}`, data) : run(() => {
    localDataStore.updateServiceProduct(data);
  }),
  changeStatus: async (id: number, status: number) =>
    useRealBackendApi ? httpPut<void>(`/service-products/${id}/status`, { status }) : run(() => localDataStore.updateServiceProduct({ id, status })),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/service-products/${id}`) : run(() => {
    localDataStore.removeServiceProduct(id);
  }),
};

export const pricingRuleApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<PricingRuleRecord>('/pricing-rules', params) : run(() => localDataStore.listPricingRules(params)),
  add: async (data: Record<string, unknown>) =>
    useRealBackendApi ? httpPost<PricingRuleRecord>('/pricing-rules', data) : run(() => localDataStore.createPricingRule(data)),
  edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/pricing-rules/${data.id}`, data) : run(() => {
    localDataStore.updatePricingRule(data);
  }),
  changeStatus: async (id: number, status: number) =>
    useRealBackendApi ? httpPut<void>(`/pricing-rules/${id}/status`, { status }) : run(() => localDataStore.updatePricingRule({ id, status })),
  remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/pricing-rules/${id}`) : run(() => {
    localDataStore.removePricingRule(id);
  }),
};

export const serviceOrderApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<ServiceOrderRecord>('/service-orders', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`/service-orders/${id}/status`, data) : run(() => undefined),
};

export const refundOrderApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<RefundOrderRecord>('/refund-orders', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`/refund-orders/${id}/status`, data) : run(() => undefined),
};

export const afterSaleTicketApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<AfterSaleTicketRecord>('/after-sale-tickets', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`/after-sale-tickets/${id}/status`, data) : run(() => undefined),
};

export const serviceOrderItemApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<ServiceOrderItemRecord>('/service-order-items', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
};

export const orderBillingDetailApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<OrderBillingDetailRecord>('/order-billing-details', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
};

export const orderStatusLogApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<OrderStatusLogRecord>('/order-status-logs', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
};

export const writeOffRecordApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<WriteOffRecord>('/write-off-records', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`/write-off-records/${id}/status`, data) : run(() => undefined),
};

export const performRecordApi = {
  page: async (params: Record<string, unknown>) =>
    useRealBackendApi ? httpPage<PerformRecord>('/perform-records', params) : run(() => ({ records: [], total: 0, size: Number(params.size ?? params.pageSize ?? 10), current: Number(params.current ?? params.pageNum ?? 1), pages: 1 })),
  updateStatus: async (id: number, data: Record<string, unknown>) =>
    useRealBackendApi ? httpPut<void>(`/perform-records/${id}/status`, data) : run(() => undefined),
};

export const marketingApi = {
  couponTemplates: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<CouponTemplateRecord>('/coupon-templates', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
    add: async (data: Record<string, unknown>) => useRealBackendApi ? httpPost<CouponTemplateRecord>('/coupon-templates', data) : run(() => data as unknown as CouponTemplateRecord),
    edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/coupon-templates/${data.id}`, data) : run(() => undefined),
    remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/coupon-templates/${id}`) : run(() => undefined),
  },
  inviteActivities: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<InviteActivityRecord>('/invite-activities', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
    add: async (data: Record<string, unknown>) => useRealBackendApi ? httpPost<InviteActivityRecord>('/invite-activities', data) : run(() => data as unknown as InviteActivityRecord),
    edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/invite-activities/${data.id}`, data) : run(() => undefined),
    remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/invite-activities/${id}`) : run(() => undefined),
  },
  rechargeActivities: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<RechargeActivityRecord>('/recharge-activities', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
    add: async (data: Record<string, unknown>) => useRealBackendApi ? httpPost<RechargeActivityRecord>('/recharge-activities', data) : run(() => data as unknown as RechargeActivityRecord),
    edit: async (data: Record<string, unknown>) => useRealBackendApi ? httpPut<void>(`/recharge-activities/${data.id}`, data) : run(() => undefined),
    remove: async (id: number) => useRealBackendApi ? httpDelete<void>(`/recharge-activities/${id}`) : run(() => undefined),
  },
};

export const assetApi = {
  userAccounts: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<UserAssetAccountRecord>('/user-asset-accounts', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
  balanceFlows: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<BalanceFlowRecord>('/balance-flows', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
};

export const messageApi = {
  templates: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<MessageTemplateRecord>('/message-templates', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
  recordsPage: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<MessageRecord>('/message-records', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  records: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<MessageRecord>('/message-records', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
  messageRecords: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<MessageRecord>('/message-records', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
  subscribes: {
    page: async (params: Record<string, unknown>) => useRealBackendApi ? httpPage<SubscribeRecord>('/subscribe-records', params) : run(() => ({ records: [], total: 0, size: 10, current: 1, pages: 1 })),
  },
};

export default {
  auth: authApi,
  user: userApi,
  role: roleApi,
  menu: menuApi,
  permission: permissionApi,
  dict: dictApi,
  merchant: merchantApi,
  merchantContact: merchantContactApi,
  merchantContract: merchantContractApi,
  merchantSettlementAccount: merchantSettlementAccountApi,
  merchantQualification: merchantQualificationApi,
  merchantChangeLog: merchantChangeLogApi,
  store: storeApi,
  storeImage: storeImageApi,
  storeBusinessHours: storeBusinessHoursApi,
  storeTempCloseRecord: storeTempCloseRecordApi,
  storeServiceCapability: storeServiceCapabilityApi,
  storeChangeLog: storeChangeLogApi,
  servicePoint: servicePointApi,
  servicePointQrRecord: servicePointQrRecordApi,
  servicePointMaintainRecord: servicePointMaintainRecordApi,
  pointDeviceBindLog: pointDeviceBindLogApi,
  servicePointStatusLog: servicePointStatusLogApi,
  device: deviceApi,
  deviceVendor: deviceVendorApi,
  deviceModel: deviceModelApi,
  deviceProtocol: deviceProtocolApi,
  deviceBindLog: deviceBindLogApi,
  serviceProduct: serviceProductApi,
  pricingRule: pricingRuleApi,
  serviceOrder: serviceOrderApi,
  refundOrder: refundOrderApi,
  afterSaleTicket: afterSaleTicketApi,
  serviceOrderItem: serviceOrderItemApi,
  orderBillingDetail: orderBillingDetailApi,
  orderStatusLog: orderStatusLogApi,
  writeOffRecord: writeOffRecordApi,
  performRecord: performRecordApi,
  marketing: marketingApi,
  asset: assetApi,
  message: messageApi,
};
