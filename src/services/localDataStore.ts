import type {
  DictDataRecord,
  DictTypeRecord,
  DeviceRecord,
  LoginRequest,
  LoginResponse,
  MerchantRecord,
  PageResult,
  PermissionTreeNode,
  PricingRuleRecord,
  RoleOption,
  RoleRecord,
  SelectOptionRecord,
  ServicePointRecord,
  ServiceProductRecord,
  StoreRecord,
  UserInfo,
  UserRecord,
} from './backendService';

const STORAGE_KEY = 'self-service-admin-local-db-v2';
const BASE_TIME = '2026-04-18';

type LocalUserRecord = UserRecord & { password: string };

interface LocalState {
  users: LocalUserRecord[];
  roles: RoleRecord[];
  rolePermissionIds: Record<number, number[]>;
  permissions: PermissionTreeNode[];
  menus: PermissionTreeNode[];
  dictTypes: DictTypeRecord[];
  dictItems: DictDataRecord[];
  merchants: MerchantRecord[];
  stores: StoreRecord[];
  servicePoints: ServicePointRecord[];
  devices: DeviceRecord[];
  serviceProducts: ServiceProductRecord[];
  pricingRules: PricingRuleRecord[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const now = () => new Date().toISOString();

type TimestampedRecord = {
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
};

const ensureTimeFields = <T extends object>(record: T): T & Required<TimestampedRecord> => {
  const source = record as T & TimestampedRecord;
  const createdAt = source.createdAt || source.createTime || now();
  const updatedAt = source.updatedAt || source.updateTime || createdAt;

  return {
    ...source,
    createdAt,
    updatedAt,
    createTime: createdAt,
    updateTime: updatedAt,
  };
};

const matchesKeyword = (keyword: unknown, values: Array<unknown>) => {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return values
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value).toLowerCase().includes(normalized));
};

const paginate = <T,>(records: T[], params: Record<string, unknown> = {}): PageResult<T> => {
  const current = Number(params.current ?? params.pageNum ?? 1);
  const size = Number(params.size ?? params.pageSize ?? 10);
  const safeCurrent = Number.isFinite(current) && current > 0 ? current : 1;
  const safeSize = Number.isFinite(size) && size > 0 ? size : 10;
  const start = (safeCurrent - 1) * safeSize;
  const pagedRecords = records.slice(start, start + safeSize);

  return {
    records: pagedRecords,
    total: records.length,
    size: safeSize,
    current: safeCurrent,
    pages: Math.max(1, Math.ceil(records.length / safeSize)),
  };
};

const nextId = (records: Array<{ id: number }>) =>
  records.reduce((maxId, record) => Math.max(maxId, record.id), 0) + 1;

const asStringOrNumber = (value: unknown): string | number | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const toOptions = <T extends { id: number }>(records: T[], labelGetter: (record: T) => string): SelectOptionRecord[] =>
  records.map((record) => ({
    value: record.id,
    label: labelGetter(record),
  }));

const sortByUpdateDesc = <T extends { updateTime?: string; createTime?: string }>(records: T[]) =>
  records
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.updateTime || left.createTime || 0).getTime();
      const rightTime = new Date(right.updateTime || right.createTime || 0).getTime();
      return rightTime - leftTime;
    });

const flattenTree = (nodes: PermissionTreeNode[]): PermissionTreeNode[] =>
  nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);

const sortTree = (nodes: PermissionTreeNode[]): PermissionTreeNode[] =>
  nodes
    .slice()
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0) || left.id - right.id)
    .map((node) => ({
      ...node,
      children: node.children?.length ? sortTree(node.children) : [],
    }));

const updateTree = (
  nodes: PermissionTreeNode[],
  targetId: number,
  updater: (node: PermissionTreeNode) => PermissionTreeNode
): PermissionTreeNode[] =>
  nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node);
    }

    return {
      ...node,
      children: node.children?.length ? updateTree(node.children, targetId, updater) : [],
    };
  });

const removeTreeNode = (nodes: PermissionTreeNode[], targetId: number): PermissionTreeNode[] =>
  nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      children: node.children?.length ? removeTreeNode(node.children, targetId) : [],
    }));

const insertTreeNode = (nodes: PermissionTreeNode[], parentId: number, newNode: PermissionTreeNode): PermissionTreeNode[] => {
  if (!parentId) {
    return sortTree([...nodes, newNode]);
  }

  return sortTree(
    nodes.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: sortTree([...(node.children || []), newNode]),
        };
      }

      return {
        ...node,
        children: node.children?.length ? insertTreeNode(node.children, parentId, newNode) : [],
      };
    })
  );
};

const findTreeNode = (nodes: PermissionTreeNode[], targetId: number): PermissionTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children?.length) {
      const matched = findTreeNode(node.children, targetId);
      if (matched) {
        return matched;
      }
    }
  }
  return undefined;
};

const buildInitialState = (): LocalState => {
  const permissions: PermissionTreeNode[] = [
    {
      id: 1,
      permissionName: '工作台',
      permissionCode: 'dashboard:view',
      permissionType: 'C',
      path: '/dashboard',
      sort: 1,
      children: [],
    },
    {
      id: 10,
      permissionName: '商户中心',
      permissionCode: 'merchant:center',
      permissionType: 'M',
      sort: 10,
      children: [
        { id: 11, parentId: 10, permissionName: '商户管理', permissionCode: 'merchant:view', permissionType: 'C', path: '/merchant', sort: 1, children: [] },
        { id: 12, parentId: 10, permissionName: '门店组管理', permissionCode: 'merchant-group:view', permissionType: 'C', path: '/merchant/groups', sort: 2, children: [] },
      ],
    },
    {
      id: 20,
      permissionName: '门店运营',
      permissionCode: 'store:center',
      permissionType: 'M',
      sort: 20,
      children: [
        { id: 21, parentId: 20, permissionName: '门店管理', permissionCode: 'store:view', permissionType: 'C', path: '/store', sort: 1, children: [] },
        { id: 22, parentId: 20, permissionName: '点位管理', permissionCode: 'point:view', permissionType: 'C', path: '/bay', sort: 2, children: [] },
        { id: 23, parentId: 20, permissionName: '设备管理', permissionCode: 'device:view', permissionType: 'C', path: '/device', sort: 3, children: [] },
      ],
    },
    {
      id: 30,
      permissionName: '商品服务',
      permissionCode: 'service:center',
      permissionType: 'M',
      sort: 30,
      children: [
        { id: 31, parentId: 30, permissionName: '商品与服务', permissionCode: 'service-product:view', permissionType: 'C', path: '/service', sort: 1, children: [] },
      ],
    },
    {
      id: 40,
      permissionName: '系统管理',
      permissionCode: 'system:center',
      permissionType: 'M',
      sort: 40,
      children: [
        { id: 41, parentId: 40, permissionName: '用户管理', permissionCode: 'system-user:view', permissionType: 'C', path: '/system/user', sort: 1, children: [] },
        { id: 42, parentId: 40, permissionName: '角色管理', permissionCode: 'system-role:view', permissionType: 'C', path: '/system/role', sort: 2, children: [] },
        { id: 43, parentId: 40, permissionName: '菜单管理', permissionCode: 'system-menu:view', permissionType: 'C', path: '/system/menu', sort: 3, children: [] },
        { id: 44, parentId: 40, permissionName: '字典管理', permissionCode: 'system-dict:view', permissionType: 'C', path: '/system/dictionary', sort: 4, children: [] },
      ],
    },
  ].map((item) => ensureTimeFields(item));

  const menus: PermissionTreeNode[] = [
    {
      id: 101,
      permissionName: '商户中心',
      permissionCode: 'merchant:center',
      permissionType: 'M',
      icon: 'ApartmentOutlined',
      sort: 10,
      visible: 1,
      status: 1,
      children: [
        { id: 102, parentId: 101, permissionName: '商户管理', permissionCode: 'merchant:view', permissionType: 'C', path: '/merchant', component: 'pages/Business/merchant-center/MerchantManagement', sort: 1, visible: 1, status: 1, children: [] },
        { id: 103, parentId: 101, permissionName: '门店组管理', permissionCode: 'merchant-group:view', permissionType: 'C', path: '/merchant/groups', component: 'pages/Business/merchant-center/MerchantGroupManagement', sort: 2, visible: 1, status: 1, children: [] },
      ],
    },
    {
      id: 111,
      permissionName: '门店运营',
      permissionCode: 'store:center',
      permissionType: 'M',
      icon: 'ShopOutlined',
      sort: 20,
      visible: 1,
      status: 1,
      children: [
        { id: 112, parentId: 111, permissionName: '门店管理', permissionCode: 'store:view', permissionType: 'C', path: '/store', component: 'pages/Business/store-operations/StoreManagement', sort: 1, visible: 1, status: 1, children: [] },
        { id: 113, parentId: 111, permissionName: '点位管理', permissionCode: 'point:view', permissionType: 'C', path: '/bay', component: 'pages/Business/store-operations/ServicePointManagement', sort: 2, visible: 1, status: 1, children: [] },
        { id: 114, parentId: 111, permissionName: '设备管理', permissionCode: 'device:view', permissionType: 'C', path: '/device', component: 'pages/Business/store-operations/DeviceManagement', sort: 3, visible: 1, status: 1, children: [] },
      ],
    },
    {
      id: 121,
      permissionName: '系统管理',
      permissionCode: 'system:center',
      permissionType: 'M',
      icon: 'SafetyOutlined',
      sort: 40,
      visible: 1,
      status: 1,
      children: [
        { id: 122, parentId: 121, permissionName: '用户管理', permissionCode: 'system-user:view', permissionType: 'C', path: '/system/user', component: 'pages/System/User', sort: 1, visible: 1, status: 1, children: [] },
        { id: 123, parentId: 121, permissionName: '角色管理', permissionCode: 'system-role:view', permissionType: 'C', path: '/system/role', component: 'pages/System/Role', sort: 2, visible: 1, status: 1, children: [] },
        { id: 124, parentId: 121, permissionName: '菜单管理', permissionCode: 'system-menu:view', permissionType: 'C', path: '/system/menu', component: 'pages/System/Menu', sort: 3, visible: 1, status: 1, children: [] },
        { id: 125, parentId: 121, permissionName: '字典管理', permissionCode: 'system-dict:view', permissionType: 'C', path: '/system/dictionary', component: 'pages/System/Dictionary', sort: 4, visible: 1, status: 1, children: [] },
      ],
    },
  ].map((item) => ensureTimeFields(item));

  const roles: RoleRecord[] = [
    ensureTimeFields({ id: 1, roleName: '超级管理员', roleCode: 'SUPER_ADMIN', description: '拥有全部平台权限', sort: 1, status: 1, permissionCount: flattenTree(permissions).length }),
    ensureTimeFields({ id: 2, roleName: '平台运营', roleCode: 'PLATFORM_OPERATOR', description: '负责商户、门店、商品和活动运营', sort: 2, status: 1, permissionCount: 8 }),
    ensureTimeFields({ id: 3, roleName: '客服专员', roleCode: 'CUSTOMER_SERVICE', description: '负责订单异常和客服工单处置', sort: 3, status: 1, permissionCount: 4 }),
  ];

  const users: LocalUserRecord[] = [
    ensureTimeFields({
      id: 1,
      username: 'admin',
      nickname: '平台管理员',
      phone: '13800000001',
      email: 'admin@self-service.local',
      role: 'SUPER_ADMIN',
      status: 1,
      lastLoginTime: `${BASE_TIME}T09:40:00.000Z`,
      password: 'admin123',
    }),
    ensureTimeFields({
      id: 2,
      username: 'operator',
      nickname: '平台运营',
      phone: '13800000002',
      email: 'operator@self-service.local',
      role: 'PLATFORM_OPERATOR',
      status: 1,
      lastLoginTime: `${BASE_TIME}T08:20:00.000Z`,
      password: 'operator123',
    }),
    ensureTimeFields({
      id: 3,
      username: 'service',
      nickname: '客服专员',
      phone: '13800000003',
      email: 'service@self-service.local',
      role: 'CUSTOMER_SERVICE',
      status: 1,
      lastLoginTime: `${BASE_TIME}T07:55:00.000Z`,
      password: 'service123',
    }),
  ];

  const merchants: MerchantRecord[] = [
    ensureTimeFields({
      id: 1,
      merchantName: '鲸洗直营运营中心',
      merchantCode: 'MER-DIRECT-001',
      merchantType: 'DIRECT',
      creditCode: '91310000MA1KJX0001',
      contactName: '周航',
      contactPhone: '13911110001',
      settlementAccountName: '上海鲸洗运营有限公司',
      settlementAccountNo: '622202020202020001',
      licenseUrl: 'https://example.com/licenses/jingxi-direct.jpg',
      remark: '直营网点为主，承担平台首期样板店运营。',
      status: 1,
      shortName: '鲸洗直营',
      contractStatus: 'ACTIVE',
      settlementCycle: '周结',
      cityCoverage: '上海 / 苏州',
    }),
    ensureTimeFields({
      id: 2,
      merchantName: '嘉定联营服务商',
      merchantCode: 'MER-JOINT-018',
      merchantType: 'JOINT',
      creditCode: '91310000MA1KJX0018',
      contactName: '陈禾',
      contactPhone: '13911110018',
      settlementAccountName: '嘉定联营服务有限公司',
      settlementAccountNo: '622202020202020018',
      licenseUrl: 'https://example.com/licenses/jiading-joint.jpg',
      remark: '联营门店按门店净收入分润。',
      status: 1,
      shortName: '嘉定联营',
      contractStatus: 'ACTIVE',
      settlementCycle: '月结',
      cityCoverage: '上海嘉定',
    }),
  ];

  const stores: StoreRecord[] = [
    ensureTimeFields({
      id: 1,
      merchantId: 1,
      storeName: '虹桥旗舰洗车站',
      storeCode: 'STR-HQ-001',
      province: '上海市',
      city: '上海',
      district: '长宁区',
      address: '虹桥路 1888 号',
      longitude: '121.31817',
      latitude: '31.19653',
      businessHours: '07:00-23:00',
      serviceFlags: 'SCAN,POINT_SELECT,BALANCE,COUPON,POINTS,NIGHT_PRICE',
      marketingEnabled: 1,
      status: 'OPEN',
      notice: '夜间时段 20:00 后启用夜洗价格。',
      storePhone: '021-55667701',
      managerName: '李思远',
      managerPhone: '13877770001',
      intro: '旗舰样板门店，覆盖快洗、泡沫精洗、吸尘、风干等全链路服务。',
      tempClosed: 0,
      holidayHours: '节假日 08:00-22:00',
    }),
    ensureTimeFields({
      id: 2,
      merchantId: 1,
      storeName: '徐汇夜洗门店',
      storeCode: 'STR-XH-006',
      province: '上海市',
      city: '上海',
      district: '徐汇区',
      address: '龙华中路 728 号',
      longitude: '121.45112',
      latitude: '31.18618',
      businessHours: '10:00-02:00',
      serviceFlags: 'SCAN,BALANCE,COUPON,RECHARGE,NIGHT_PRICE',
      marketingEnabled: 1,
      status: 'OPEN',
      notice: '主打夜洗场景，支持首充礼包和夜间限时活动。',
      storePhone: '021-55667706',
      managerName: '黄允',
      managerPhone: '13877770006',
      intro: '针对下班后洗车需求打造的夜洗门店。',
      tempClosed: 0,
      holidayHours: '节假日 10:00-00:00',
    }),
    ensureTimeFields({
      id: 3,
      merchantId: 2,
      storeName: '嘉定联营门店',
      storeCode: 'STR-JD-018',
      province: '上海市',
      city: '上海',
      district: '嘉定区',
      address: '城中路 218 号',
      longitude: '121.26791',
      latitude: '31.37457',
      businessHours: '08:00-22:00',
      serviceFlags: 'SCAN,POINT_SELECT,BALANCE,COUPON,RECHARGE,PICKUP',
      marketingEnabled: 0,
      status: 'PAUSED',
      notice: '本周进行设备升级，部分点位暂停接单。',
      storePhone: '021-55667718',
      managerName: '陈禾',
      managerPhone: '13877770018',
      intro: '联营门店，重点观察收益结构和分润表现。',
      tempClosed: 1,
      holidayHours: '节假日 09:00-21:00',
    }),
  ];

  const servicePoints: ServicePointRecord[] = [
    ensureTimeFields({
      id: 1,
      storeId: 1,
      pointCode: 'BAY-01',
      pointName: '一号快洗工位',
      pointType: 'CAR_WASH_BAY',
      abilityTags: 'SCAN,POINT_SELECT,COUPON_VERIFY',
      qrCode: 'QR-HQ-BAY-01',
      sortNo: 1,
      status: 'IDLE',
      capacity: 1,
      queueEnabled: 1,
      temporaryClosedUntil: '',
    }),
    ensureTimeFields({
      id: 2,
      storeId: 1,
      pointCode: 'BAY-03',
      pointName: '三号泡沫工位',
      pointType: 'CAR_WASH_BAY',
      abilityTags: 'SCAN,NIGHT_PRICE,QUEUE_HINT',
      qrCode: 'QR-HQ-BAY-03',
      sortNo: 3,
      status: 'RUNNING',
      capacity: 1,
      queueEnabled: 1,
      temporaryClosedUntil: '',
    }),
    ensureTimeFields({
      id: 3,
      storeId: 3,
      pointCode: 'BAY-02',
      pointName: '二号联营工位',
      pointType: 'CAR_WASH_BAY',
      abilityTags: 'SCAN,POINT_SELECT',
      qrCode: 'QR-JD-BAY-02',
      sortNo: 2,
      status: 'MAINTENANCE',
      capacity: 1,
      queueEnabled: 0,
      temporaryClosedUntil: `${BASE_TIME}T20:00:00.000Z`,
    }),
  ];

  const devices: DeviceRecord[] = [
    ensureTimeFields({
      id: 1,
      storeId: 1,
      servicePointId: 1,
      deviceName: '虹桥高压冲洗机 A',
      deviceCode: 'DEV-HP-001',
      deviceType: 'CAR_WASH_HIGH_PRESSURE',
      vendorName: '智洗科技',
      protocolType: 'MQTT',
      abilityTags: 'WASH,START_STOP,HEARTBEAT',
      lastHeartbeatAt: `${BASE_TIME}T09:12:00.000Z`,
      status: 'ONLINE',
      controlMode: 'REMOTE',
      protocolVersion: 'v2.3',
      faultLevel: 'LOW',
      signalStrength: 88,
      installTime: '2026-02-12',
    }),
    ensureTimeFields({
      id: 2,
      storeId: 1,
      servicePointId: 2,
      deviceName: '虹桥泡沫机 C',
      deviceCode: 'DEV-FOAM-003',
      deviceType: 'CAR_WASH_FOAM',
      vendorName: '智洗科技',
      protocolType: 'MQTT',
      abilityTags: 'FOAM,START_STOP,HEARTBEAT',
      lastHeartbeatAt: `${BASE_TIME}T09:27:00.000Z`,
      status: 'RUNNING',
      controlMode: 'REMOTE',
      protocolVersion: 'v2.3',
      faultLevel: 'LOW',
      signalStrength: 92,
      installTime: '2026-02-16',
    }),
    ensureTimeFields({
      id: 3,
      storeId: 3,
      servicePointId: 3,
      deviceName: '嘉定风干设备 B',
      deviceCode: 'DEV-DRY-018',
      deviceType: 'DRYER',
      vendorName: '洁风设备',
      protocolType: 'HTTP',
      abilityTags: 'DRYER,HEARTBEAT',
      lastHeartbeatAt: `${BASE_TIME}T07:42:00.000Z`,
      status: 'FAULT',
      controlMode: 'HYBRID',
      protocolVersion: 'v1.8',
      faultLevel: 'HIGH',
      signalStrength: 42,
      installTime: '2025-12-22',
    }),
  ];

  const serviceProducts: ServiceProductRecord[] = [
    ensureTimeFields({
      id: 1,
      productName: '快速冲洗套餐',
      productCode: 'SP-WASH-001',
      categoryCode: 'CAR_WASH_PACKAGE',
      billingMode: 'PACKAGE',
      scopeType: 'PLATFORM',
      priceDesc: '29 元 / 15 分钟',
      discountRule: '支持优惠券 + 余额混合支付',
      status: 1,
      serviceDuration: '15 分钟',
      usageNotice: '支付后 10 分钟内需启动设备，逾期自动取消。',
      sellingPoints: 'FAST_ENTRY,COUPON_STACK,BALANCE_DEDUCT',
    }),
    ensureTimeFields({
      id: 2,
      productName: '夜洗按时长服务',
      productCode: 'SP-NIGHT-006',
      categoryCode: 'TIME_PACK',
      billingMode: 'TIME',
      scopeType: 'STORE',
      scopeId: 2,
      priceDesc: '起步 8 元，1.2 元 / 分钟',
      discountRule: '支持夜间券，不支持与新人礼叠加',
      status: 1,
      serviceDuration: '按分钟计费',
      usageNotice: '仅在 20:00-02:00 可购买，结束后自动结算。',
      sellingPoints: 'NIGHT_DISCOUNT,MULTI_DEVICE',
    }),
    ensureTimeFields({
      id: 3,
      productName: '联营门店次卡',
      productCode: 'SP-CARD-018',
      categoryCode: 'COUNT_CARD',
      billingMode: 'COUNT',
      scopeType: 'MERCHANT',
      scopeId: 2,
      priceDesc: '199 元 / 10 次',
      discountRule: '不与首充活动叠加',
      status: 1,
      serviceDuration: '10 次权益',
      usageNotice: '单次使用仅限单门店核销，退款按剩余次数折算。',
      sellingPoints: 'COUPON_STACK',
    }),
  ];

  const pricingRules: PricingRuleRecord[] = [
    ensureTimeFields({
      id: 1,
      ruleName: '平台快速冲洗标准价',
      ruleCode: 'PR-WASH-001',
      serviceProductId: 1,
      startPrice: 29,
      minutePrice: 1.5,
      capAmount: 49,
      freeMinutes: 0,
      nightPriceDesc: '夜间无额外优惠',
      holidayPriceDesc: '法定节假日保持标准价',
      status: 1,
    }),
    ensureTimeFields({
      id: 2,
      ruleName: '徐汇夜洗价格',
      ruleCode: 'PR-NIGHT-006',
      storeId: 2,
      serviceProductId: 2,
      startPrice: 8,
      minutePrice: 1.2,
      capAmount: 39,
      freeMinutes: 2,
      nightPriceDesc: '20:00 后 1.2 元 / 分钟',
      holidayPriceDesc: '节假日夜间不变价',
      status: 1,
    }),
    ensureTimeFields({
      id: 3,
      ruleName: '联营次卡核销规则',
      ruleCode: 'PR-CARD-018',
      storeId: 3,
      serviceProductId: 3,
      countPrice: 19.9,
      capAmount: 199,
      freeMinutes: 0,
      nightPriceDesc: '次卡不区分夜间价格',
      holidayPriceDesc: '节假日扣次规则不变',
      status: 1,
    }),
  ];

  const dictTypes: DictTypeRecord[] = [
    ensureTimeFields({ id: 1, dictName: '商户主体类型', dictCode: 'merchant_type', status: 1, remark: '直营 / 加盟 / 联营主体' }),
    ensureTimeFields({ id: 2, dictName: '设备状态', dictCode: 'device_status', status: 1, remark: '设备在线、离线、故障状态定义' }),
  ];

  const dictItems: DictDataRecord[] = [
    { id: 1, dictCode: 'merchant_type', dictLabel: '直营主体', dictValue: 'DIRECT', dictSort: 1, status: 1, remark: '平台自营主体', updateTime: `${BASE_TIME}T08:00:00.000Z` },
    { id: 2, dictCode: 'merchant_type', dictLabel: '加盟主体', dictValue: 'FRANCHISE', dictSort: 2, status: 1, remark: '加盟商主体', updateTime: `${BASE_TIME}T08:00:00.000Z` },
    { id: 3, dictCode: 'merchant_type', dictLabel: '联营主体', dictValue: 'JOINT', dictSort: 3, status: 1, remark: '联营合作主体', updateTime: `${BASE_TIME}T08:00:00.000Z` },
    { id: 4, dictCode: 'device_status', dictLabel: '在线', dictValue: 'ONLINE', dictSort: 1, status: 1, remark: '设备可接收指令', updateTime: `${BASE_TIME}T08:00:00.000Z` },
    { id: 5, dictCode: 'device_status', dictLabel: '故障', dictValue: 'FAULT', dictSort: 2, status: 1, remark: '设备异常待处理', updateTime: `${BASE_TIME}T08:00:00.000Z` },
  ];

  return {
    users,
    roles,
    rolePermissionIds: {
      1: flattenTree(permissions).map((item) => item.id),
      2: [1, 10, 11, 12, 20, 21, 22, 23, 30, 31],
      3: [1, 40, 41],
    },
    permissions: sortTree(permissions),
    menus: sortTree(menus),
    dictTypes,
    dictItems,
    merchants,
    stores,
    servicePoints,
    devices,
    serviceProducts,
    pricingRules,
  };
};

let cacheState: LocalState | null = null;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadState = (): LocalState => {
  if (cacheState) {
    return cacheState;
  }

  if (canUseStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cacheState = JSON.parse(raw) as LocalState;
      return cacheState;
    }
  }

  cacheState = buildInitialState();
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheState));
  }
  return cacheState;
};

const saveState = (state: LocalState) => {
  cacheState = state;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

const readState = <T,>(selector: (state: LocalState) => T) => clone(selector(loadState()));

const updateState = <T,>(updater: (state: LocalState) => T) => {
  const draft = clone(loadState());
  const result = updater(draft);
  saveState(draft);
  return clone(result);
};

const hydrateRole = (role: RoleRecord, state: LocalState): RoleRecord =>
  ensureTimeFields({
    ...role,
    permissionIds: state.rolePermissionIds[role.id] || [],
    permissionCount: (state.rolePermissionIds[role.id] || []).length,
  });

const hydrateMerchant = (merchant: MerchantRecord, state: LocalState): MerchantRecord => {
  const merchantStores = state.stores.filter((store) => store.merchantId === merchant.id);
  const cities = Array.from(new Set(merchantStores.map((store) => store.city).filter(Boolean)));

  return ensureTimeFields({
    ...merchant,
    storeCount: merchantStores.length,
    cityCoverage: merchant.cityCoverage || cities.join(' / ') || '-',
  });
};

const hydrateStore = (store: StoreRecord, state: LocalState): StoreRecord =>
  ensureTimeFields({
    ...store,
    merchantName: state.merchants.find((merchant) => merchant.id === store.merchantId)?.merchantName,
  });

const hydratePoint = (point: ServicePointRecord, state: LocalState): ServicePointRecord =>
  ensureTimeFields({
    ...point,
    storeName: state.stores.find((store) => store.id === point.storeId)?.storeName,
    deviceCount: state.devices.filter((device) => device.servicePointId === point.id).length,
  });

const hydrateDevice = (device: DeviceRecord, state: LocalState): DeviceRecord => {
  const relatedPoint = device.servicePointId ? state.servicePoints.find((point) => point.id === device.servicePointId) : undefined;

  return ensureTimeFields({
    ...device,
    storeName: state.stores.find((store) => store.id === device.storeId)?.storeName,
    pointCode: relatedPoint?.pointCode,
  });
};

const hydrateServiceProduct = (product: ServiceProductRecord, state: LocalState): ServiceProductRecord => {
  let scopeName = product.scopeName;
  if (product.scopeType === 'MERCHANT' && product.scopeId) {
    scopeName = state.merchants.find((merchant) => merchant.id === product.scopeId)?.merchantName;
  }
  if (product.scopeType === 'STORE' && product.scopeId) {
    scopeName = state.stores.find((store) => store.id === product.scopeId)?.storeName;
  }

  return ensureTimeFields({
    ...product,
    scopeName,
  });
};

const hydratePricingRule = (rule: PricingRuleRecord, state: LocalState): PricingRuleRecord =>
  ensureTimeFields({
    ...rule,
    storeName: rule.storeId ? state.stores.find((store) => store.id === rule.storeId)?.storeName : undefined,
    productName: rule.serviceProductId ? state.serviceProducts.find((product) => product.id === rule.serviceProductId)?.productName : undefined,
  });

const sanitizePermissionIds = (permissionIds?: number[]) =>
  Array.isArray(permissionIds) ? permissionIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];

const getTokenUserId = (token?: string) => {
  const matched = String(token || '').match(/mock-token-(\d+)/);
  return matched ? Number(matched[1]) : undefined;
};

const getCurrentToken = () => {
  if (!canUseStorage()) {
    return undefined;
  }
  return window.localStorage.getItem('satoken') || window.localStorage.getItem('token') || undefined;
};

const stripSensitiveUserFields = (user: LocalUserRecord): UserRecord => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

export const localDataStore = {
  authenticate(payload: LoginRequest): LoginResponse {
    const state = loadState();
    const user = state.users.find((record) => record.username === payload.username);

    if (!user || user.password !== payload.password) {
      throw new Error('用户名或密码错误');
    }

    if (user.status !== 1) {
      throw new Error('当前账号已被禁用');
    }

    return {
      user: clone(user),
      token: `mock-token-${user.id}`,
      tokenName: 'satoken',
    };
  },

  getCurrentUser(token = getCurrentToken()): UserInfo {
    const userId = getTokenUserId(token);
    const state = loadState();
    const user = state.users.find((record) => record.id === userId) || state.users[0];
    const role = state.roles.find((item) => item.roleCode === user.role);
    const permissionIds = role ? state.rolePermissionIds[role.id] || [] : [];
    const permissionCodes = flattenTree(state.permissions)
      .filter((item) => permissionIds.includes(item.id))
      .map((item) => item.permissionCode)
      .filter(Boolean) as string[];

    return ensureTimeFields({
      ...stripSensitiveUserFields(user),
      roles: user.role ? [user.role] : [],
      permissions: permissionCodes,
    });
  },

  listUsers(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.users)
      .filter((record) => matchesKeyword(params.keyword, [record.username, record.nickname, record.phone, record.email]))
      .filter((record) => (params.status === undefined ? true : record.status === params.status))
      .filter((record) => (params.role === undefined ? true : record.role === params.role))
      .map((record) => ensureTimeFields({ ...stripSensitiveUserFields(record), roles: record.role ? [{ id: 0, roleCode: record.role, roleName: record.role }] : [] }));

    return paginate(records, params);
  },

  createUser(payload: Record<string, unknown>) {
    return updateState((state) => {
      const id = nextId(state.users);
      const created = ensureTimeFields({
        id,
        username: String(payload.username || `user-${id}`),
        nickname: String(payload.nickname || payload.username || `用户${id}`),
        phone: payload.phone ? String(payload.phone) : '',
        email: payload.email ? String(payload.email) : '',
        role: payload.role ? String(payload.role) : 'PLATFORM_OPERATOR',
        status: Number(payload.status ?? 1),
        password: String(payload.password || '123456'),
      } satisfies LocalUserRecord);

      state.users.unshift(created);
      return created;
    });
  },

  updateUser(payload: Record<string, unknown>) {
    return updateState((state) => {
      const user = state.users.find((item) => item.id === Number(payload.id));
      if (!user) {
        throw new Error('用户不存在');
      }

      Object.assign(user, ensureTimeFields({
        ...user,
        username: String(payload.username || user.username),
        nickname: String(payload.nickname || user.nickname || payload.username || user.username),
        phone: payload.phone !== undefined ? String(payload.phone || '') : user.phone,
        email: payload.email !== undefined ? String(payload.email || '') : user.email,
        role: payload.role !== undefined ? String(payload.role || '') : user.role,
        status: payload.status !== undefined ? Number(payload.status) : user.status,
        updatedAt: now(),
      }));

      return ensureTimeFields(user);
    });
  },

  changeUserStatus(id: number, status: number) {
    return updateState((state) => {
      const user = state.users.find((item) => item.id === id);
      if (!user) {
        throw new Error('用户不存在');
      }

      user.status = status;
      user.updatedAt = now();
      user.updateTime = user.updatedAt;
      return ensureTimeFields(user);
    });
  },

  listRoles(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.roles)
      .map((record) => hydrateRole(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.roleName, record.roleCode, record.description]))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  listRoleOptions(): RoleOption[] {
    return readState((state) =>
      sortByUpdateDesc(state.roles).map((role) => ({
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
      }))
    );
  },

  createRole(payload: Record<string, unknown>) {
    return updateState((state) => {
      const id = nextId(state.roles);
      const permissionIds = sanitizePermissionIds(payload.permissionIds as number[]);
      const role = ensureTimeFields({
        id,
        roleName: String(payload.roleName || ''),
        roleCode: String(payload.roleCode || ''),
        description: payload.description ? String(payload.description) : '',
        sort: Number(payload.sort ?? state.roles.length + 1),
        status: Number(payload.status ?? 1),
        permissionIds,
        permissionCount: permissionIds.length,
      } satisfies RoleRecord);

      state.roles.unshift(role);
      state.rolePermissionIds[id] = permissionIds;
      return hydrateRole(role, state);
    });
  },

  updateRole(payload: Record<string, unknown>) {
    return updateState((state) => {
      const role = state.roles.find((item) => item.id === Number(payload.id));
      if (!role) {
        throw new Error('角色不存在');
      }

      role.roleName = String(payload.roleName || role.roleName);
      role.roleCode = String(payload.roleCode || role.roleCode);
      role.description = payload.description !== undefined ? String(payload.description || '') : role.description;
      role.sort = Number(payload.sort ?? role.sort ?? 0);
      role.status = Number(payload.status ?? role.status);
      role.updatedAt = now();
      role.updateTime = role.updatedAt;

      state.rolePermissionIds[role.id] = sanitizePermissionIds(payload.permissionIds as number[]);
      return hydrateRole(role, state);
    });
  },

  removeRole(id: number) {
    return updateState((state) => {
      const targetRoleCode = state.roles.find((item) => item.id === id)?.roleCode;
      state.roles = state.roles.filter((item) => item.id !== id);
      delete state.rolePermissionIds[id];
      state.users = state.users.map((user) => (user.role === targetRoleCode ? { ...user, role: '' } : user));
      return true;
    });
  },

  listPermissionTree() {
    return readState((state) => sortTree(state.permissions));
  },

  getRolePermissionIds(id: number) {
    return readState((state) => state.rolePermissionIds[id] || []);
  },

  listMenus() {
    return readState((state) => sortTree(state.menus));
  },

  createMenu(payload: Record<string, unknown>) {
    return updateState((state) => {
      const id = nextId(flattenTree(state.menus));
      const parentId = Number(payload.parentId ?? 0);
      const newNode = ensureTimeFields({
        id,
        parentId,
        permissionName: String(payload.permissionName || ''),
        name: String(payload.permissionName || ''),
        permissionCode: String(payload.permissionCode || ''),
        permissionType: String(payload.permissionType ?? 'C'),
        path: payload.path ? String(payload.path) : '',
        component: payload.component ? String(payload.component) : '',
        icon: payload.icon ? String(payload.icon) : '',
        sort: Number(payload.sort ?? 0),
        status: Number(payload.status ?? 1),
        visible: Number(payload.visible ?? 1),
        children: [],
      } satisfies PermissionTreeNode);

      state.menus = insertTreeNode(state.menus, parentId, newNode);
      return newNode;
    });
  },

  updateMenu(payload: Record<string, unknown>) {
    return updateState((state) => {
      const id = Number(payload.id);
      const currentNode = findTreeNode(state.menus, id);
      if (!currentNode) {
        throw new Error('菜单不存在');
      }

      const updatedNode = ensureTimeFields({
        ...currentNode,
        parentId: Number(payload.parentId ?? currentNode.parentId ?? 0),
        permissionName: String(payload.permissionName || currentNode.permissionName || ''),
        name: String(payload.permissionName || currentNode.name || ''),
        permissionCode: String(payload.permissionCode || currentNode.permissionCode || ''),
        permissionType: String(payload.permissionType ?? currentNode.permissionType ?? 'C'),
        path: payload.path !== undefined ? String(payload.path || '') : currentNode.path,
        component: payload.component !== undefined ? String(payload.component || '') : currentNode.component,
        icon: payload.icon !== undefined ? String(payload.icon || '') : currentNode.icon,
        sort: Number(payload.sort ?? currentNode.sort ?? 0),
        status: Number(payload.status ?? currentNode.status ?? 1),
        visible: Number(payload.visible ?? currentNode.visible ?? 1),
        updatedAt: now(),
      });

      state.menus = removeTreeNode(state.menus, id);
      state.menus = insertTreeNode(state.menus, updatedNode.parentId ?? 0, { ...updatedNode, children: currentNode.children || [] });
      return updatedNode;
    });
  },

  removeMenu(id: number) {
    return updateState((state) => {
      state.menus = removeTreeNode(state.menus, id);
      return true;
    });
  },

  listDictionaryTypes(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.dictTypes)
      .filter((record) => matchesKeyword(params.keyword, [record.dictName, record.dictCode, record.remark]))
      .filter((record) => (params.status === undefined ? true : record.status === params.status))
      .map(ensureTimeFields);

    return paginate(records, params);
  },

  createDictionaryType(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.dictTypes),
        dictName: String(payload.dictName || ''),
        dictCode: String(payload.dictCode || ''),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : '',
      } satisfies DictTypeRecord);

      state.dictTypes.unshift(record);
      return record;
    });
  },

  updateDictionaryType(id: number, payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.dictTypes.find((item) => item.id === id);
      if (!record) {
        throw new Error('字典不存在');
      }

      record.dictName = String(payload.dictName || record.dictName);
      record.dictCode = String(payload.dictCode || record.dictCode);
      record.status = Number(payload.status ?? record.status);
      record.remark = payload.remark !== undefined ? String(payload.remark || '') : record.remark;
      record.updatedAt = now();
      record.updateTime = record.updatedAt;
      return ensureTimeFields(record);
    });
  },

  removeDictionaryType(id: number) {
    return updateState((state) => {
      const record = state.dictTypes.find((item) => item.id === id);
      if (!record) {
        return true;
      }

      state.dictItems = state.dictItems.filter((item) => item.dictCode !== record.dictCode);
      state.dictTypes = state.dictTypes.filter((item) => item.id !== id);
      return true;
    });
  },

  listDictionaryItems(dictCode: string) {
    return readState((state) =>
      state.dictItems
        .filter((item) => item.dictCode === dictCode)
        .sort((left, right) => (left.dictSort ?? 0) - (right.dictSort ?? 0) || left.id - right.id)
    );
  },

  createDictionaryItem(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.dictItems),
        dictCode: String(payload.dictCode || ''),
        dictLabel: String(payload.dictLabel || ''),
        dictValue: String(payload.dictValue || ''),
        dictSort: Number(payload.dictSort ?? 0),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : '',
      } satisfies DictDataRecord);

      state.dictItems.unshift(record);
      return record;
    });
  },

  updateDictionaryItem(id: number, payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.dictItems.find((item) => item.id === id);
      if (!record) {
        throw new Error('字典项不存在');
      }

      record.dictLabel = String(payload.dictLabel || record.dictLabel);
      record.dictValue = String(payload.dictValue || record.dictValue);
      record.dictSort = Number(payload.dictSort ?? record.dictSort ?? 0);
      record.status = Number(payload.status ?? record.status);
      record.remark = payload.remark !== undefined ? String(payload.remark || '') : record.remark;
      record.updateTime = now();
      record.updatedAt = record.updateTime;
      return ensureTimeFields(record);
    });
  },

  removeDictionaryItem(id: number) {
    return updateState((state) => {
      state.dictItems = state.dictItems.filter((item) => item.id !== id);
      return true;
    });
  },

  listMerchants(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.merchants)
      .map((record) => hydrateMerchant(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.merchantName, record.shortName, record.merchantCode, record.contactName, record.contactPhone]))
      .filter((record) => (params.merchantType === undefined ? true : record.merchantType === params.merchantType))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  listMerchantOptions() {
    return readState((state) => toOptions(sortByUpdateDesc(state.merchants), (record) => record.merchantName));
  },

  createMerchant(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.merchants),
        merchantName: String(payload.merchantName || ''),
        merchantCode: String(payload.merchantCode || ''),
        merchantType: String(payload.merchantType || 'DIRECT'),
        creditCode: payload.creditCode ? String(payload.creditCode) : '',
        contactName: payload.contactName ? String(payload.contactName) : '',
        contactPhone: payload.contactPhone ? String(payload.contactPhone) : '',
        settlementAccountName: payload.settlementAccountName ? String(payload.settlementAccountName) : '',
        settlementAccountNo: payload.settlementAccountNo ? String(payload.settlementAccountNo) : '',
        licenseUrl: payload.licenseUrl ? String(payload.licenseUrl) : '',
        remark: payload.remark ? String(payload.remark) : '',
        status: Number(payload.status ?? 1),
        shortName: payload.shortName ? String(payload.shortName) : '',
        contractStatus: payload.contractStatus ? String(payload.contractStatus) : 'PENDING',
        settlementCycle: payload.settlementCycle ? String(payload.settlementCycle) : '月结',
      } satisfies MerchantRecord);

      state.merchants.unshift(record);
      return hydrateMerchant(record, state);
    });
  },

  updateMerchant(payload: Record<string, unknown>) {
    return updateState((state) => {
      const merchant = state.merchants.find((item) => item.id === Number(payload.id));
      if (!merchant) {
        throw new Error('商户不存在');
      }

      Object.assign(merchant, ensureTimeFields({
        ...merchant,
        merchantName: String(payload.merchantName || merchant.merchantName),
        merchantCode: String(payload.merchantCode || merchant.merchantCode),
        merchantType: String(payload.merchantType || merchant.merchantType),
        creditCode: payload.creditCode !== undefined ? String(payload.creditCode || '') : merchant.creditCode,
        contactName: payload.contactName !== undefined ? String(payload.contactName || '') : merchant.contactName,
        contactPhone: payload.contactPhone !== undefined ? String(payload.contactPhone || '') : merchant.contactPhone,
        settlementAccountName: payload.settlementAccountName !== undefined ? String(payload.settlementAccountName || '') : merchant.settlementAccountName,
        settlementAccountNo: payload.settlementAccountNo !== undefined ? String(payload.settlementAccountNo || '') : merchant.settlementAccountNo,
        licenseUrl: payload.licenseUrl !== undefined ? String(payload.licenseUrl || '') : merchant.licenseUrl,
        remark: payload.remark !== undefined ? String(payload.remark || '') : merchant.remark,
        status: Number(payload.status ?? merchant.status),
        shortName: payload.shortName !== undefined ? String(payload.shortName || '') : merchant.shortName,
        contractStatus: payload.contractStatus !== undefined ? String(payload.contractStatus || '') : merchant.contractStatus,
        settlementCycle: payload.settlementCycle !== undefined ? String(payload.settlementCycle || '') : merchant.settlementCycle,
        updatedAt: now(),
      }));

      return hydrateMerchant(merchant, state);
    });
  },

  changeMerchantStatus(id: number, status: number) {
    return updateState((state) => {
      const merchant = state.merchants.find((item) => item.id === id);
      if (!merchant) {
        throw new Error('商户不存在');
      }
      merchant.status = status;
      merchant.updatedAt = now();
      merchant.updateTime = merchant.updatedAt;
      return hydrateMerchant(merchant, state);
    });
  },

  removeMerchant(id: number) {
    return updateState((state) => {
      const removedStoreIds = state.stores.filter((store) => store.merchantId === id).map((store) => store.id);
      state.merchants = state.merchants.filter((item) => item.id !== id);
      state.stores = state.stores.filter((store) => store.merchantId !== id);
      state.servicePoints = state.servicePoints.filter((point) => !removedStoreIds.includes(point.storeId));
      state.devices = state.devices.filter((device) => !removedStoreIds.includes(device.storeId));
      state.pricingRules = state.pricingRules.filter((rule) => !removedStoreIds.includes(rule.storeId || -1));
      return true;
    });
  },

  listStores(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.stores)
      .map((record) => hydrateStore(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.storeName, record.storeCode, record.address, record.storePhone, record.managerName]))
      .filter((record) => (params.merchantId === undefined ? true : record.merchantId === params.merchantId))
      .filter((record) => (params.city === undefined ? true : String(record.city || '').includes(String(params.city))))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  listStoreOptions(merchantId?: number) {
    return readState((state) =>
      toOptions(
        sortByUpdateDesc(state.stores).filter((record) => (merchantId ? record.merchantId === merchantId : true)),
        (record) => record.storeName
      )
    );
  },

  createStore(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.stores),
        merchantId: Number(payload.merchantId),
        storeName: String(payload.storeName || ''),
        storeCode: String(payload.storeCode || ''),
        province: payload.province ? String(payload.province) : '',
        city: payload.city ? String(payload.city) : '',
        district: payload.district ? String(payload.district) : '',
        address: payload.address ? String(payload.address) : '',
        longitude: payload.longitude ? String(payload.longitude) : '',
        latitude: payload.latitude ? String(payload.latitude) : '',
        businessHours: payload.businessHours ? String(payload.businessHours) : '',
        serviceFlags: payload.serviceFlags ? String(payload.serviceFlags) : '',
        marketingEnabled: Number(payload.marketingEnabled ?? 1),
        status: String(payload.status || 'OPEN'),
        notice: payload.notice ? String(payload.notice) : '',
        storePhone: payload.storePhone ? String(payload.storePhone) : '',
        managerName: payload.managerName ? String(payload.managerName) : '',
        managerPhone: payload.managerPhone ? String(payload.managerPhone) : '',
        intro: payload.intro ? String(payload.intro) : '',
        tempClosed: Number(payload.tempClosed ?? 0),
        holidayHours: payload.holidayHours ? String(payload.holidayHours) : '',
      } satisfies StoreRecord);

      state.stores.unshift(record);
      return hydrateStore(record, state);
    });
  },

  updateStore(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.stores.find((item) => item.id === Number(payload.id));
      if (!record) {
        throw new Error('门店不存在');
      }

      Object.assign(record, ensureTimeFields({
        ...record,
        merchantId: Number(payload.merchantId ?? record.merchantId),
        storeName: String(payload.storeName || record.storeName),
        storeCode: String(payload.storeCode || record.storeCode),
        province: payload.province !== undefined ? String(payload.province || '') : record.province,
        city: payload.city !== undefined ? String(payload.city || '') : record.city,
        district: payload.district !== undefined ? String(payload.district || '') : record.district,
        address: payload.address !== undefined ? String(payload.address || '') : record.address,
        longitude: payload.longitude !== undefined ? String(payload.longitude || '') : record.longitude,
        latitude: payload.latitude !== undefined ? String(payload.latitude || '') : record.latitude,
        businessHours: payload.businessHours !== undefined ? String(payload.businessHours || '') : record.businessHours,
        serviceFlags: payload.serviceFlags !== undefined ? String(payload.serviceFlags || '') : record.serviceFlags,
        marketingEnabled: Number(payload.marketingEnabled ?? record.marketingEnabled ?? 1),
        status: String(payload.status || record.status),
        notice: payload.notice !== undefined ? String(payload.notice || '') : record.notice,
        storePhone: payload.storePhone !== undefined ? String(payload.storePhone || '') : record.storePhone,
        managerName: payload.managerName !== undefined ? String(payload.managerName || '') : record.managerName,
        managerPhone: payload.managerPhone !== undefined ? String(payload.managerPhone || '') : record.managerPhone,
        intro: payload.intro !== undefined ? String(payload.intro || '') : record.intro,
        tempClosed: Number(payload.tempClosed ?? record.tempClosed ?? 0),
        holidayHours: payload.holidayHours !== undefined ? String(payload.holidayHours || '') : record.holidayHours,
        updatedAt: now(),
      }));

      return hydrateStore(record, state);
    });
  },

  removeStore(id: number) {
    return updateState((state) => {
      const removedPointIds = state.servicePoints.filter((point) => point.storeId === id).map((point) => point.id);
      state.stores = state.stores.filter((store) => store.id !== id);
      state.servicePoints = state.servicePoints.filter((point) => point.storeId !== id);
      state.devices = state.devices.filter((device) => device.storeId !== id);
      state.pricingRules = state.pricingRules.filter((rule) => rule.storeId !== id);
      state.devices = state.devices.map((device) =>
        removedPointIds.includes(device.servicePointId || -1)
          ? { ...device, servicePointId: undefined, pointCode: '' }
          : device
      );
      return true;
    });
  },

  listServicePoints(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.servicePoints)
      .map((record) => hydratePoint(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.pointCode, record.pointName, record.abilityTags]))
      .filter((record) => (params.storeId === undefined ? true : record.storeId === params.storeId))
      .filter((record) => (params.pointType === undefined ? true : record.pointType === params.pointType))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  listServicePointOptions(storeId?: number) {
    return readState((state) =>
      toOptions(
        sortByUpdateDesc(state.servicePoints).filter((record) => (storeId ? record.storeId === storeId : true)),
        (record) => `${record.pointCode}${record.pointName ? ` / ${record.pointName}` : ''}`
      )
    );
  },

  createServicePoint(payload: Record<string, unknown>) {
    return updateState((state) => {
      const id = nextId(state.servicePoints);
      const record = ensureTimeFields({
        id,
        storeId: Number(payload.storeId),
        pointCode: String(payload.pointCode || `POINT-${id}`),
        pointName: payload.pointName ? String(payload.pointName) : '',
        pointType: String(payload.pointType || 'CAR_WASH_BAY'),
        abilityTags: payload.abilityTags ? String(payload.abilityTags) : '',
        qrCode: payload.qrCode ? String(payload.qrCode) : `QR-${id}`,
        sortNo: Number(payload.sortNo ?? 0),
        status: String(payload.status || 'IDLE'),
        capacity: Number(payload.capacity ?? 1),
        queueEnabled: Number(payload.queueEnabled ?? 0),
        temporaryClosedUntil: payload.temporaryClosedUntil ? String(payload.temporaryClosedUntil) : '',
      } satisfies ServicePointRecord);

      state.servicePoints.unshift(record);
      return hydratePoint(record, state);
    });
  },

  updateServicePoint(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.servicePoints.find((item) => item.id === Number(payload.id));
      if (!record) {
        throw new Error('点位不存在');
      }

      Object.assign(record, ensureTimeFields({
        ...record,
        storeId: Number(payload.storeId ?? record.storeId),
        pointCode: String(payload.pointCode || record.pointCode),
        pointName: payload.pointName !== undefined ? String(payload.pointName || '') : record.pointName,
        pointType: String(payload.pointType || record.pointType),
        abilityTags: payload.abilityTags !== undefined ? String(payload.abilityTags || '') : record.abilityTags,
        qrCode: payload.qrCode !== undefined ? String(payload.qrCode || '') : record.qrCode,
        sortNo: Number(payload.sortNo ?? record.sortNo ?? 0),
        status: String(payload.status || record.status),
        capacity: Number(payload.capacity ?? record.capacity ?? 1),
        queueEnabled: Number(payload.queueEnabled ?? record.queueEnabled ?? 0),
        temporaryClosedUntil: payload.temporaryClosedUntil !== undefined ? String(payload.temporaryClosedUntil || '') : record.temporaryClosedUntil,
        updatedAt: now(),
      }));

      return hydratePoint(record, state);
    });
  },

  removeServicePoint(id: number) {
    return updateState((state) => {
      state.servicePoints = state.servicePoints.filter((point) => point.id !== id);
      state.devices = state.devices.map((device) =>
        device.servicePointId === id
          ? ensureTimeFields({ ...device, servicePointId: undefined, pointCode: '', updatedAt: now() })
          : device
      );
      return true;
    });
  },

  listDevices(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.devices)
      .map((record) => hydrateDevice(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.deviceName, record.deviceCode, record.vendorName, record.protocolType]))
      .filter((record) => (params.storeId === undefined ? true : record.storeId === params.storeId))
      .filter((record) => (params.deviceType === undefined ? true : record.deviceType === params.deviceType))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  createDevice(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.devices),
        storeId: Number(payload.storeId),
        servicePointId: payload.servicePointId ? Number(payload.servicePointId) : undefined,
        deviceName: String(payload.deviceName || ''),
        deviceCode: String(payload.deviceCode || ''),
        deviceType: String(payload.deviceType || 'CAR_WASH_HIGH_PRESSURE'),
        vendorName: payload.vendorName ? String(payload.vendorName) : '',
        protocolType: payload.protocolType ? String(payload.protocolType) : '',
        abilityTags: payload.abilityTags ? String(payload.abilityTags) : '',
        lastHeartbeatAt: payload.lastHeartbeatAt ? String(payload.lastHeartbeatAt) : now(),
        status: String(payload.status || 'OFFLINE'),
        controlMode: payload.controlMode ? String(payload.controlMode) : 'REMOTE',
        protocolVersion: payload.protocolVersion ? String(payload.protocolVersion) : 'v1.0',
        faultLevel: payload.faultLevel ? String(payload.faultLevel) : 'LOW',
        signalStrength: Number(payload.signalStrength ?? 80),
        installTime: payload.installTime ? String(payload.installTime) : BASE_TIME,
      } satisfies DeviceRecord);

      state.devices.unshift(record);
      return hydrateDevice(record, state);
    });
  },

  updateDevice(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.devices.find((item) => item.id === Number(payload.id));
      if (!record) {
        throw new Error('设备不存在');
      }

      Object.assign(record, ensureTimeFields({
        ...record,
        storeId: Number(payload.storeId ?? record.storeId),
        servicePointId: payload.servicePointId !== undefined && payload.servicePointId !== null && payload.servicePointId !== ''
          ? Number(payload.servicePointId)
          : undefined,
        deviceName: String(payload.deviceName || record.deviceName),
        deviceCode: String(payload.deviceCode || record.deviceCode),
        deviceType: String(payload.deviceType || record.deviceType),
        vendorName: payload.vendorName !== undefined ? String(payload.vendorName || '') : record.vendorName,
        protocolType: payload.protocolType !== undefined ? String(payload.protocolType || '') : record.protocolType,
        abilityTags: payload.abilityTags !== undefined ? String(payload.abilityTags || '') : record.abilityTags,
        lastHeartbeatAt: payload.lastHeartbeatAt !== undefined ? String(payload.lastHeartbeatAt || '') : record.lastHeartbeatAt,
        status: String(payload.status || record.status),
        controlMode: payload.controlMode !== undefined ? String(payload.controlMode || '') : record.controlMode,
        protocolVersion: payload.protocolVersion !== undefined ? String(payload.protocolVersion || '') : record.protocolVersion,
        faultLevel: payload.faultLevel !== undefined ? String(payload.faultLevel || '') : record.faultLevel,
        signalStrength: Number(payload.signalStrength ?? record.signalStrength ?? 0),
        installTime: payload.installTime !== undefined ? String(payload.installTime || '') : record.installTime,
        updatedAt: now(),
      }));

      return hydrateDevice(record, state);
    });
  },

  removeDevice(id: number) {
    return updateState((state) => {
      state.devices = state.devices.filter((device) => device.id !== id);
      return true;
    });
  },

  listServiceProducts(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.serviceProducts)
      .map((record) => hydrateServiceProduct(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.productName, record.productCode, record.priceDesc, record.sellingPoints]))
      .filter((record) => (params.categoryCode === undefined ? true : record.categoryCode === params.categoryCode))
      .filter((record) => (params.billingMode === undefined ? true : record.billingMode === params.billingMode))
      .filter((record) => (params.scopeType === undefined ? true : record.scopeType === params.scopeType))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  listServiceProductOptions() {
    return readState((state) => toOptions(sortByUpdateDesc(state.serviceProducts), (record) => record.productName));
  },

  createServiceProduct(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.serviceProducts),
        productName: String(payload.productName || ''),
        productCode: String(payload.productCode || ''),
        categoryCode: String(payload.categoryCode || 'CAR_WASH_PACKAGE'),
        billingMode: String(payload.billingMode || 'PACKAGE'),
        scopeType: String(payload.scopeType || 'PLATFORM'),
        scopeId: payload.scopeId ? Number(payload.scopeId) : undefined,
        priceDesc: payload.priceDesc ? String(payload.priceDesc) : '',
        discountRule: payload.discountRule ? String(payload.discountRule) : '',
        status: Number(payload.status ?? 1),
        serviceDuration: payload.serviceDuration ? String(payload.serviceDuration) : '',
        usageNotice: payload.usageNotice ? String(payload.usageNotice) : '',
        sellingPoints: payload.sellingPoints ? String(payload.sellingPoints) : '',
      } satisfies ServiceProductRecord);

      state.serviceProducts.unshift(record);
      return hydrateServiceProduct(record, state);
    });
  },

  updateServiceProduct(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.serviceProducts.find((item) => item.id === Number(payload.id));
      if (!record) {
        throw new Error('服务商品不存在');
      }

      Object.assign(record, ensureTimeFields({
        ...record,
        productName: String(payload.productName || record.productName),
        productCode: String(payload.productCode || record.productCode),
        categoryCode: String(payload.categoryCode || record.categoryCode),
        billingMode: String(payload.billingMode || record.billingMode),
        scopeType: String(payload.scopeType || record.scopeType),
        scopeId: payload.scopeId !== undefined && payload.scopeId !== null && payload.scopeId !== '' ? Number(payload.scopeId) : undefined,
        priceDesc: payload.priceDesc !== undefined ? String(payload.priceDesc || '') : record.priceDesc,
        discountRule: payload.discountRule !== undefined ? String(payload.discountRule || '') : record.discountRule,
        status: Number(payload.status ?? record.status),
        serviceDuration: payload.serviceDuration !== undefined ? String(payload.serviceDuration || '') : record.serviceDuration,
        usageNotice: payload.usageNotice !== undefined ? String(payload.usageNotice || '') : record.usageNotice,
        sellingPoints: payload.sellingPoints !== undefined ? String(payload.sellingPoints || '') : record.sellingPoints,
        updatedAt: now(),
      }));

      return hydrateServiceProduct(record, state);
    });
  },

  removeServiceProduct(id: number) {
    return updateState((state) => {
      state.serviceProducts = state.serviceProducts.filter((item) => item.id !== id);
      state.pricingRules = state.pricingRules.filter((item) => item.serviceProductId !== id);
      return true;
    });
  },

  listPricingRules(params: Record<string, unknown>) {
    const state = loadState();
    const records = sortByUpdateDesc(state.pricingRules)
      .map((record) => hydratePricingRule(record, state))
      .filter((record) => matchesKeyword(params.keyword, [record.ruleName, record.ruleCode, record.nightPriceDesc, record.holidayPriceDesc]))
      .filter((record) => (params.storeId === undefined ? true : record.storeId === params.storeId))
      .filter((record) => (params.serviceProductId === undefined ? true : record.serviceProductId === params.serviceProductId))
      .filter((record) => (params.status === undefined ? true : record.status === params.status));

    return paginate(records, params);
  },

  createPricingRule(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = ensureTimeFields({
        id: nextId(state.pricingRules),
        ruleName: String(payload.ruleName || ''),
        ruleCode: String(payload.ruleCode || ''),
        storeId: payload.storeId ? Number(payload.storeId) : undefined,
        serviceProductId: payload.serviceProductId ? Number(payload.serviceProductId) : undefined,
        startPrice: asStringOrNumber(payload.startPrice),
        minutePrice: asStringOrNumber(payload.minutePrice),
        countPrice: asStringOrNumber(payload.countPrice),
        capAmount: asStringOrNumber(payload.capAmount),
        freeMinutes: payload.freeMinutes ? Number(payload.freeMinutes) : undefined,
        nightPriceDesc: payload.nightPriceDesc ? String(payload.nightPriceDesc) : '',
        holidayPriceDesc: payload.holidayPriceDesc ? String(payload.holidayPriceDesc) : '',
        status: Number(payload.status ?? 1),
      } satisfies PricingRuleRecord);

      state.pricingRules.unshift(record);
      return hydratePricingRule(record, state);
    });
  },

  updatePricingRule(payload: Record<string, unknown>) {
    return updateState((state) => {
      const record = state.pricingRules.find((item) => item.id === Number(payload.id));
      if (!record) {
        throw new Error('计费规则不存在');
      }

      Object.assign(record, ensureTimeFields({
        ...record,
        ruleName: String(payload.ruleName || record.ruleName),
        ruleCode: String(payload.ruleCode || record.ruleCode),
        storeId: payload.storeId !== undefined && payload.storeId !== null && payload.storeId !== '' ? Number(payload.storeId) : undefined,
        serviceProductId: payload.serviceProductId !== undefined && payload.serviceProductId !== null && payload.serviceProductId !== '' ? Number(payload.serviceProductId) : undefined,
        startPrice: payload.startPrice !== undefined ? asStringOrNumber(payload.startPrice) : record.startPrice,
        minutePrice: payload.minutePrice !== undefined ? asStringOrNumber(payload.minutePrice) : record.minutePrice,
        countPrice: payload.countPrice !== undefined ? asStringOrNumber(payload.countPrice) : record.countPrice,
        capAmount: payload.capAmount !== undefined ? asStringOrNumber(payload.capAmount) : record.capAmount,
        freeMinutes: payload.freeMinutes !== undefined ? Number(payload.freeMinutes) : record.freeMinutes,
        nightPriceDesc: payload.nightPriceDesc !== undefined ? String(payload.nightPriceDesc || '') : record.nightPriceDesc,
        holidayPriceDesc: payload.holidayPriceDesc !== undefined ? String(payload.holidayPriceDesc || '') : record.holidayPriceDesc,
        status: Number(payload.status ?? record.status),
        updatedAt: now(),
      }));

      return hydratePricingRule(record, state);
    });
  },

  removePricingRule(id: number) {
    return updateState((state) => {
      state.pricingRules = state.pricingRules.filter((item) => item.id !== id);
      return true;
    });
  },
};
