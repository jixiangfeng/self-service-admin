import { localDataStore } from './localDataStore';

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
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

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
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

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
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
}

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
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listMerchants(params)),
  options: async () => run(() => localDataStore.listMerchantOptions()),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createMerchant(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateMerchant(data);
  }),
  changeStatus: async (id: number, status: number) => run(() => {
    localDataStore.changeMerchantStatus(id, status);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeMerchant(id);
  }),
};

export const storeApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listStores(params)),
  options: async (merchantId?: number) => run(() => localDataStore.listStoreOptions(merchantId)),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createStore(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateStore(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeStore(id);
  }),
};

export const servicePointApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listServicePoints(params)),
  options: async (storeId?: number) => run(() => localDataStore.listServicePointOptions(storeId)),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createServicePoint(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateServicePoint(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeServicePoint(id);
  }),
};

export const deviceApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listDevices(params)),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createDevice(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateDevice(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeDevice(id);
  }),
};

export const serviceProductApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listServiceProducts(params)),
  options: async () => run(() => localDataStore.listServiceProductOptions()),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createServiceProduct(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updateServiceProduct(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removeServiceProduct(id);
  }),
};

export const pricingRuleApi = {
  page: async (params: Record<string, unknown>) => run(() => localDataStore.listPricingRules(params)),
  add: async (data: Record<string, unknown>) => run(() => localDataStore.createPricingRule(data)),
  edit: async (data: Record<string, unknown>) => run(() => {
    localDataStore.updatePricingRule(data);
  }),
  remove: async (id: number) => run(() => {
    localDataStore.removePricingRule(id);
  }),
};

export default {
  auth: authApi,
  user: userApi,
  role: roleApi,
  menu: menuApi,
  permission: permissionApi,
  dict: dictApi,
  merchant: merchantApi,
  store: storeApi,
  servicePoint: servicePointApi,
  device: deviceApi,
  serviceProduct: serviceProductApi,
  pricingRule: pricingRuleApi,
};
