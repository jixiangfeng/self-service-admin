# self-service-admin 代码 Review 与模块功能梳理

生成时间：2026-05-07

## 1. 项目定位

`self-service-admin` 是一个自助洗车/自助设备经营平台管理后台前端。当前代码已经不是纯空骨架，已经形成了较完整的演示型后台：

- 技术栈：React 18、TypeScript、Vite、Ant Design、Ant Design Pro Components、React Query、Axios。
- 页面形态：左侧 ProLayout 导航 + 工作台 + 系统管理 + 多个业务管理模块。
- 数据形态：部分页面通过 `backendService.ts` 统一 API facade 调本地 IndexedDB/localStorage 模拟数据；另一部分业务页直接在组件内维护 `initialRecords` + `useState` mock 数据。
- 当前成熟度：更接近“可交互业务原型/前端演示后台”，还不是稳定对接真实后端的生产后台。

## 2. 运行与构建状态

### 2.1 脚本

`package.json` 提供：

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### 2.2 当前构建验证

已尝试执行：

```bash
npm run build
```

结果失败：

```text
sh: 1: tsc: not found
```

说明当前工作目录没有可用的 `node_modules/.bin/tsc`，大概率是依赖未安装。需要先执行：

```bash
npm install
```

再重新验证 `npm run build` 和 `npm run lint`。

### 2.3 Git 状态

当前工作区已有大量修改文件，本文档新增时未改动原业务代码。后续继续开发前，建议按目标文件先看 `git diff -- <file>`，避免覆盖已有工作。

## 3. 总体架构

### 3.1 入口与全局 Provider

- `src/main.tsx`：React 应用入口。
- `src/App.tsx`：路由总入口，包裹 `QueryProvider`、Ant Design `ConfigProvider`、`BrowserRouter`。
- `src/utils/queryClient.tsx`：React Query client 封装，并启用 Devtools。

`App.tsx` 中所有业务页面都使用 `lazy` 动态加载。登录页单独暴露 `/login`，主应用挂在 `/` 下。

### 3.2 鉴权模型

`PrivateRoute` 只检查：

```ts
localStorage.getItem('satoken') || localStorage.getItem('token')
```

有 token 就进入后台，没有则跳转 `/login`。这只是前端本地门禁，不包含：

- token 有效性校验；
- 路由级权限；
- 菜单权限过滤；
- 按钮权限控制；
- 用户信息自动刷新。

### 3.3 布局与导航

`src/layouts/BasicLayout.tsx` 使用 `@ant-design/pro-components` 的 `ProLayout`。菜单是静态硬编码数组，不是由后端权限树动态生成。

菜单分组：

- 工作台
- 商户中心
- 门店运营
- 商品服务
- 交易履约
- 用户资产
- 活动营销
- 财务结算
- 数据报表
- 客服消息
- 增值规划
- 系统管理

优点：结构清楚，适合原型阶段快速浏览业务闭环。

风险：系统管理里维护的菜单/权限树不会真正影响左侧导航，权限管理页面目前与实际路由控制是脱节的。

### 3.4 请求与接口层

项目有两个并行的数据体系。

第一套是真实 HTTP 请求封装：

- `src/utils/request.ts`
- 使用 axios；
- 默认 `VITE_API_BASE_URL || http://localhost:8080/api`；
- 注入 `satoken` header；
- 统一处理 `code === 200`；
- 401/未登录/token 无效时清理本地登录并跳转 `/login`。

第二套是当前页面实际主要使用的本地 API facade：

- `src/services/backendService.ts`
- `src/services/localDataStore.ts`

`backendService.ts` 里大部分 API 不调用 `request.ts`，而是调用 `localDataStore`，并用 `run()` 模拟 80ms 延迟，返回统一 envelope：

```ts
{
  code: 200,
  message: 'success',
  data,
  timestamp
}
```

### 3.5 本地数据存储

`localDataStore.ts` 使用 `STORAGE_KEY = 'self-service-admin-local-db-v2'`，维护本地状态：

- users
- roles
- rolePermissionIds
- permissions
- menus
- dictTypes
- dictItems
- merchants
- stores
- servicePoints
- devices
- serviceProducts
- pricingRules

它实现了分页、关键词匹配、树节点增删改、时间字段补齐、选项列表生成等原型数据能力。

## 4. 路由清单

| 路由 | 页面 | 模块 |
| --- | --- | --- |
| `/login` | Login | 登录 |
| `/dashboard` | Dashboard | 工作台 |
| `/merchant` | MerchantManagement | 商户管理 |
| `/merchant/groups` | MerchantGroupManagement | 门店组管理 |
| `/merchant-console` | MerchantWorkbench | 商户后台 |
| `/store` | StoreManagement | 门店管理 |
| `/store-operations` | StoreOperationsManagement | 门店运营台 |
| `/bay` | ServicePointManagement | 点位管理 |
| `/device` | DeviceManagement | 设备管理 |
| `/service` | ServiceManagement | 商品与服务 |
| `/trade` | TradeManagement | 交易中心 |
| `/order` | 重定向 `/trade` | 兼容入口 |
| `/fulfillment` | FulfillmentManagement | 核销履约 |
| `/asset` | AssetManagement | 资产总览 |
| `/asset/service-cards` | ServiceCardManagement | 服务卡与次卡 |
| `/marketing` | MarketingManagement | 活动总览 |
| `/marketing/coupon-templates` | CouponTemplateManagement | 券模板管理 |
| `/marketing/cross-store` | CrossStoreActivityManagement | 跨店活动 |
| `/marketing/invite-activities` | InviteActivityManagement | 邀请活动 |
| `/marketing/recharge-activities` | RechargeActivityManagement | 充值活动 |
| `/settlement` | SettlementManagement | 结算总览 |
| `/settlement/profit-sharing` | ProfitSharingManagement | 多合伙人分润 |
| `/analysis` | AnalysisManagement | 经营分析 |
| `/service-desk` | ServiceDeskManagement | 客服工单 |
| `/service-desk/messages` | MessageCenterManagement | 消息中心 |
| `/ads` | AdManagement | 广告中心 |
| `/retail` | RetailManagement | 商城零售 |
| `/system/user` | UserManagement | 用户管理 |
| `/system/role` | RoleManagement | 角色管理 |
| `/system/menu` | MenuManagement | 菜单管理 |
| `/system/dictionary` | Dictionary | 数据字典 |

## 5. 通用组件与工具

### 5.1 PageBanner

`src/components/PageBanner.tsx`

用于页面顶部标题、说明和图标展示。所有主要页面基本都使用它，保证了页面头部一致性。

### 5.2 WorkflowGuide

`src/pages/Business/shared/WorkflowGuide.tsx`

展示业务闭环步骤、说明、动作按钮。大量业务页用它表达业务流程，例如商户开店、点位投放、商品上架、订单处置、结算复盘等。

它适合原型说明，但后续生产化时应避免把过多“解释性文案”留在高频工作台页面。

### 5.3 managementUtils

`src/pages/Business/shared/managementUtils.tsx`

提供：

- `formatDateTime`
- `normalizeKeyword`
- `buildValueEnum`
- `renderBooleanTag`
- `renderStatusTag`
- `containsKeyword`
- `formatAmount`
- `renderOptionTags`

这些工具在业务 CRUD 页复用较多，是当前最主要的展示层复用点。

### 5.4 业务字典常量

`src/constants/businessCatalog.ts`

集中维护商户类型、门店状态、营销开关、点位类型、设备类型、设备状态、商品分类、计费模式、适用范围等选项。

这是接后端字典前的前端常量源。后续如果字典由后端管理，应统一迁移到字典接口或配置接口，避免前端常量与后端字典分叉。

## 6. 系统模块 Review

### 6.1 登录

文件：`src/pages/Login/index.tsx`

功能：

- 用户名密码登录；
- 调用 `authApi.login`；
- 登录成功后写入 `satoken`、`token`、`user`；
- 跳转 `/dashboard`。

现状：

- 登录 API 当前走本地 `localDataStore.authenticate`。
- 认证只是本地模拟，适合演示。

问题：

- 登录态持久化没有过期时间。
- `satoken` 和 `token` 同时写入，语义重复。
- 没有处理后端真实 tokenName 差异以外的权限信息加载。

### 6.2 用户管理

文件：`src/pages/System/User/index.tsx`

功能：

- 用户分页查询；
- 关键词、角色、状态筛选；
- 新建用户；
- 编辑用户；
- 启用/禁用用户；
- 角色下拉来自 `api.user.roleList()`。

数据来源：

- `useUsers`
- `useRoleOptions`
- `useCreateUser`
- `useUpdateUser`
- `useUpdateUserStatus`

评价：

- 与 API facade 结合较好，是当前比较完整的 CRUD 页面。
- 表格、分页、搜索、表单闭环完整。

问题：

- 页面大量使用 `any`，类型收益有限。
- 角色字段是单个 `role` 字符串，但接口类型里也有 `roles?: RoleOption[]`，模型不统一。
- 修改用户时没有密码重置入口。

### 6.3 角色管理

文件：`src/pages/System/Role/index.tsx`

功能：

- 角色分页；
- 新建/编辑/删除角色；
- 启停状态；
- 权限树勾选；
- 编辑角色时加载已授权权限 ID。

数据来源：

- `useRoles`
- `usePermissionTree`
- `useRolePermissionIds`
- `useCreateRole`
- `useUpdateRole`
- `useDeleteRole`

评价：

- 已经覆盖角色授权的核心交互。

问题：

- 权限树实际来自本地 mock，不影响左侧菜单和路由。
- 权限 ID 与菜单树、按钮权限的生产关系还没有真正建模。
- 删除角色没有明显的用户引用校验。

### 6.4 菜单管理

文件：`src/pages/System/Menu/index.tsx`

功能：

- 菜单/权限树展示；
- 新建/编辑/删除菜单节点；
- 支持父级选择、类型、路径、组件、图标、排序、状态、可见性等字段。

评价：

- 形态接近真实后台权限菜单配置。

关键问题：

- `BasicLayout` 的左侧菜单完全静态，菜单管理改动不会生效。
- `permissionApi` 和 `menuApi` 数据边界有重叠，权限树与菜单树当前更像两份本地 mock。
- 图标字段只是字符串，不会映射为真实图标。

### 6.5 数据字典

文件：`src/pages/System/Dictionary.tsx`

功能：

- 字典类型列表；
- 字典类型新增/编辑/删除；
- 选择字典类型后展示字典项；
- 字典项新增/编辑/删除。

评价：

- 相对完整。
- 适合后续迁移真实 `/dict/type`、`/dict/data` 接口。

问题：

- 业务页面仍主要使用 `businessCatalog.ts` 常量，没有统一走字典模块。
- 删除字典类型时虽然本地会处理字典项，但真实后端需要明确级联/禁止删除策略。

## 7. 核心业务模块 Review

### 7.1 工作台

文件：`src/pages/Dashboard/index.tsx`

功能：

- 展示管理页数量、主链路、扩展页、看板维度；
- 展示经营建档闭环、活动投放闭环、订单处置闭环；
- 提供跳转到商户、门店、券模板、活动、交易、结算等入口；
- 展示设计取向和建议体验路径。

评价：

- 很适合作为演示入口，能解释后台业务结构。

问题：

- 统计数字是硬编码，不来自真实数据。
- “设计取向”“建议体验”偏说明型内容，生产后台应替换为待办、异常、审批、经营数据。

### 7.2 商户管理

文件：`src/pages/Business/merchant-center/MerchantManagement.tsx`

功能：

- 商户分页；
- 关键词、商户类型、状态筛选；
- 新建/编辑/删除商户；
- 启用/停用；
- 展示合同状态、联系人、城市覆盖、门店数、结算周期、结算账户；
- 提供去门店组、去门店管理入口。

数据来源：

- `api.merchant.page`
- `api.merchant.add`
- `api.merchant.edit`
- `api.merchant.remove`
- `api.merchant.changeStatus`

评价：

- 当前业务 CRUD 中最完整的页面之一。
- 字段覆盖商户主体、联系人、结算账户、状态控制，能支撑开店前置流程。

问题：

- 商户与门店的约束主要靠前端展示，本地删除商户没有严格检查门店引用。
- 合同状态、结算账户等字段没有细分校验。

### 7.3 门店组管理

文件：`src/pages/Business/merchant-center/MerchantGroupManagement.tsx`

功能：

- 管理区域组、活动组、核销组、统计组等门店组；
- 支持新建/编辑/删除；
- 维护组类型、适用业务、覆盖门店、成本承担、状态等；
- 提供批量配置门店说明。

数据来源：

- 组件内 `initialRecords` + `useState`。

评价：

- 页面表达了业务概念，但没有接入统一 API facade。

问题：

- 数据只在组件内存中，刷新即丢。
- 与商户、门店真实数据没有关联。
- 门店选择只是说明弹窗，没有真实配置能力。

### 7.4 商户后台

文件：`src/pages/Business/merchant-center/MerchantWorkbench.tsx`

功能：

- 商户视角经营概览；
- 商户待办管理；
- 门店经营概览；
- 新建/编辑待办；
- 查看门店详情。

数据来源：

- 组件内 `initialTodos`、`initialStores`。

评价：

- 适合展示商户运营工作台方向。

问题：

- 没有真实商户上下文切换。
- 待办只存在组件内存。
- 与结算、活动、门店实际数据没有打通。

### 7.5 门店管理

文件：`src/pages/Business/store-operations/StoreManagement.tsx`

功能：

- 门店分页；
- 按商户、状态、关键词筛选；
- 新建/编辑/删除门店；
- 维护地址、经纬度、营业时间、节假日营业、服务能力、营销开关、临时关闭、联系人等。

数据来源：

- `api.store.page`
- `api.store.options`
- `api.store.add`
- `api.store.edit`
- `api.store.remove`
- `api.merchant.options`

评价：

- 与本地 API facade 对接良好。
- 字段能支撑自助门店运营基本档案。

问题：

- 经纬度是字符串/数字混合类型，后续接地图应统一模型。
- 服务能力使用逗号字符串，结构化不足。
- 删除门店没有严格处理点位、设备引用。

### 7.6 点位管理

文件：`src/pages/Business/store-operations/ServicePointManagement.tsx`

功能：

- 点位分页；
- 按门店、点位类型、状态、关键词筛选；
- 新建/编辑/删除点位；
- 维护点位编码、名称、类型、能力标签、二维码、容量、排队开关、临时关闭等。

数据来源：

- `api.servicePoint.page`
- `api.servicePoint.options`
- `api.servicePoint.add`
- `api.servicePoint.edit`
- `api.servicePoint.remove`
- `api.store.options`

评价：

- 自助洗车场景中“点位”建模清楚，承接扫码、选位、设备绑定。

问题：

- 二维码只是字段，没有生成、预览、下载、绑定校验。
- 点位和设备绑定关系由设备侧引用，点位侧没有设备列表。

### 7.7 设备管理

文件：`src/pages/Business/store-operations/DeviceManagement.tsx`

功能：

- 设备分页；
- 按门店、点位、设备类型、状态、关键词筛选；
- 新建/编辑/删除设备；
- 维护设备编码、类型、厂商、协议、控制方式、故障等级、信号强度、心跳时间、安装时间等。

数据来源：

- `api.device.page`
- `api.device.add`
- `api.device.edit`
- `api.device.remove`
- `api.store.options`
- `api.servicePoint.options`

评价：

- 设备台账字段比较完整，适合后续接 IoT/设备管理后端。

问题：

- 设备运行状态没有实时刷新机制。
- 心跳、故障等级只是表单字段，没有事件日志和故障处理流。
- 选择门店后再加载点位的逻辑存在，但缺少“门店变更时清空不匹配点位”的严格校验。

### 7.8 门店运营台

文件：`src/pages/Business/store-operations/StoreOperationsManagement.tsx`

功能：

- 展示巡检、异常、值班、公告统计；
- 门店运营任务列表；
- 班次与公告列表；
- 新建运营任务；
- 新建公告/排班；
- 查看详情。

数据来源：

- 组件内 `initialTasks`、`initialNotices`。

评价：

- 是运营视角补充页，方向合理。

问题：

- 任务、公告、排班都未接统一 API。
- 任务类型、负责人、门店、状态没有和系统用户/门店数据关联。

### 7.9 商品与服务

文件：`src/pages/Business/product-service/ServiceManagement.tsx`

功能：

- Tab 1：服务商品管理；
- Tab 2：计费规则管理；
- 服务商品支持分类、计费模式、适用范围、价格描述、权益说明、卖点、状态；
- 计费规则支持门店、商品、起步价、分钟价、次价、封顶金额、免费分钟、夜间价、节假日价、状态。

数据来源：

- `api.serviceProduct.page`
- `api.serviceProduct.options`
- `api.serviceProduct.add/edit/remove`
- `api.pricingRule.page`
- `api.pricingRule.add/edit/remove`
- `api.merchant.options`
- `api.store.options`

评价：

- 商品和计费规则分层合理，是当前对接 facade 最完整的业务页之一。

问题：

- 商品适用范围同时支持平台/商户/门店，但表单校验不够严格。
- 价格字段存在字符串/数字混用。
- 计费规则与商品状态、门店状态没有联动校验。

### 7.10 交易中心

文件：`src/pages/Business/trade-fulfillment/TradeManagement.tsx`

功能：

- Tab 1：服务订单；
- Tab 2：退款中心；
- Tab 3：售后工单；
- 支持筛选、处置弹窗、详情查看、推荐动作、关联提醒。

数据来源：

- 组件内 `initialOrders`、`initialRefunds`、`initialAfterSales`。

评价：

- 业务闭环表达较完整，覆盖订单、退款、售后。

问题：

- 未接统一 API facade。
- 订单处置只是修改组件内状态，没有后端副作用。
- 订单、核销、结算、资产之间没有真实关联。

### 7.11 核销履约

文件：`src/pages/Business/trade-fulfillment/FulfillmentManagement.tsx`

功能：

- Tab 1：权益核销记录；
- Tab 2：履约日志；
- 统计待核销、履约中、异常回滚、异常履约；
- 支持记录详情、补核销/异常处理弹窗。

数据来源：

- 组件内 `initialWriteOffRecords`、`initialPerformRecords`。

评价：

- 能表达核销履约的关键业务对象。

问题：

- 没有接订单、设备、服务卡真实数据。
- 按钮“异常回滚”“后台补核销”等部分只是入口，没有完整行为。

## 8. 活动营销模块 Review

### 8.1 活动总览

文件：`src/pages/Business/activity-marketing/MarketingManagement.tsx`

功能：

- 聚合优惠券活动、邀请活动、充值活动；
- 展示预算、活动数量；
- Tab 列表展示不同活动；
- 支持活动详情与操作弹窗。

数据来源：

- 组件内 mock。

评价：

- 聚合页思路正确，能作为营销运营入口。

问题：

- 与独立券模板、邀请活动、充值活动页面的数据不是同一份来源。
- 活动状态流转没有抽象。

### 8.2 券模板管理

文件：`src/pages/Business/activity-marketing/CouponTemplateManagement.tsx`

功能：

- 管理券模板编码、名称、类型、作用范围、门槛、面额、库存、有效期、叠加规则、状态；
- 支持新增/编辑/删除/详情；
- 提供叠加规则说明。

数据来源：

- 组件内 mock。

问题：

- 没有接字典、门店组、商品服务。
- 库存只是数字字段，没有发放/锁定/核销明细。

### 8.3 充值活动

文件：`src/pages/Business/activity-marketing/RechargeActivityManagement.tsx`

功能：

- 管理充值活动、固定档位、赠送规则、成本承担、状态；
- 支持新建/编辑/删除/详情。

数据来源：

- 组件内 mock。

问题：

- 与用户余额/资产模块没有打通。
- 赠送规则是文本字段，缺少结构化档位模型。

### 8.4 邀请活动

文件：`src/pages/Business/activity-marketing/InviteActivityManagement.tsx`

功能：

- 管理邀请活动编码、达标规则、邀请人奖励、被邀请人奖励、预算、防刷策略、状态；
- 支持新建/编辑/删除/详情；
- 提供防刷策略说明。

数据来源：

- 组件内 mock。

问题：

- 防刷规则没有结构化配置。
- 邀请关系、奖励发放、奖励回收没有数据链路。

### 8.5 跨店活动

文件：`src/pages/Business/activity-marketing/CrossStoreActivityManagement.tsx`

功能：

- 管理跨店活动、适用门店组、核销方式、成本承担、预算、状态；
- 支持新建/编辑/删除/详情；
- 提供门店组选择说明。

数据来源：

- 组件内 mock。

问题：

- 没有真实引用 `MerchantGroupManagement` 中的门店组。
- 跨店核销与履约模块没有打通。

## 9. 用户资产模块 Review

### 9.1 资产总览

文件：`src/pages/Business/user-assets/AssetManagement.tsx`

功能：

- Tab 1：用户识别；
- Tab 2：余额账户；
- Tab 3：优惠券资产；
- 支持用户标签/风控处理、余额调账、手动补券、资产详情；
- 展示用户总量、余额用户、券模板、风控观察名单。

数据来源：

- 组件内 mock。

评价：

- 资产域的业务对象比较齐全，覆盖识别、余额、券、风控。

问题：

- 未接真实用户、订单、充值、券模板数据。
- 调账/补券只是本地弹窗行为，没有审计记录。
- 风控标签没有规则来源。

### 9.2 服务卡与次卡

文件：`src/pages/Business/user-assets/ServiceCardManagement.tsx`

功能：

- 管理服务卡、次卡、月卡；
- 配置产品编码、售价、权益、有效期、发放规则、库存、状态；
- 支持新建/编辑/删除/详情；
- 提供批量发卡说明。

数据来源：

- 组件内 mock。

问题：

- 与商品服务、核销履约、用户资产没有真实关联。
- 卡权益是文本描述，缺少结构化权益包模型。

## 10. 财务结算模块 Review

### 10.1 结算总览

文件：`src/pages/Business/finance-settlement/SettlementManagement.tsx`

功能：

- Tab 1：结算单；
- Tab 2：分润明细；
- 展示待确认结算单、本周期收入、退款冲减、分润待确认；
- 支持生成结算单、成本分摊配置、结算单详情、分润明细、确认结算。

数据来源：

- 组件内 mock。

评价：

- 把收入、退款、成本、分润串在一个页面，方向正确。

问题：

- 没有接订单、退款、分润关系。
- 金额计算只是 mock 数组汇总。
- 结算状态流转没有明确后端模型。

### 10.2 多合伙人分润

文件：`src/pages/Business/finance-settlement/ProfitSharingManagement.tsx`

功能：

- Tab 1：合伙关系；
- Tab 2：分润明细；
- 管理合伙人、门店、分润比例、收款账户、版本、状态；
- 支持新建/编辑关系、版本管理、分润调整、详情查看。

数据来源：

- 组件内 mock。

问题：

- 合伙关系没有和门店真实数据关联。
- 分润比例、版本生效范围、结算单生成之间没有真实校验。
- 收款账户字段缺少安全处理。

## 11. 数据报表模块 Review

### 11.1 经营分析

文件：`src/pages/Business/data-reports/AnalysisManagement.tsx`

功能：

- 门店经营排行；
- 营销效果看板；
- 设备异常关注清单；
- 指标口径配置；
- 详情查看。

数据来源：

- 组件内 mock。

评价：

- 覆盖平台、门店、营销、设备几个关键分析维度。

问题：

- 指标全部来自前端静态数据。
- 没有图表复用，虽然项目引入了 `@ant-design/charts` 和 `@ant-design/plots`。
- 指标口径配置只是表单提示，没有影响报表结果。

## 12. 客服消息模块 Review

### 12.1 客服工单

文件：`src/pages/Business/service-messaging/ServiceDeskManagement.tsx`

功能：

- Tab 1：消息发送记录；
- Tab 2：客服工单；
- 展示今日消息发送、待处理工单、消息失败、高优先级工单；
- 支持新建/处理工单、模板管理、手工发送、详情查看。

数据来源：

- 组件内 mock。

问题：

- 消息发送记录与消息模板页没有共用数据。
- 工单没有关联订单、设备、用户。
- “手工发送”“模板管理”等是说明弹窗，不是实际流程。

### 12.2 消息中心

文件：`src/pages/Business/service-messaging/MessageCenterManagement.tsx`

功能：

- 管理消息模板编码、场景、渠道、触发条件、目标用户、状态；
- 支持新建/编辑/删除/详情；
- 提供发送记录说明。

数据来源：

- 组件内 mock。

问题：

- 未接真实消息发送 API。
- 渠道、触发条件、目标用户只是文本或简单字段，缺少可执行规则。

## 13. 增值规划模块 Review

### 13.1 广告中心

文件：`src/pages/Business/value-planning/AdManagement.tsx`

功能：

- 广告位管理；
- 投放计划管理；
- 支持新建广告位、新建投放、详情查看；
- 展示广告位类型、投放计划、统计口径、版本阶段。

数据来源：

- 组件内 mock。

问题：

- 没有素材上传、排期、投放规则、曝光统计。
- 更像规划阶段原型。

### 13.2 商城零售

文件：`src/pages/Business/value-planning/RetailManagement.tsx`

功能：

- Tab 1：零售商品；
- Tab 2：库存台账；
- 支持新建零售商品、新建库存台账、详情查看；
- 展示商品域、库存层级、履约方式、版本阶段。

数据来源：

- 组件内 mock。

问题：

- 没有接商品、库存、设备出货、订单履约。
- 更适合后续二/三期规划，不应被误认为已可生产使用。

## 14. API facade 与本地数据能力

`backendService.ts` 当前统一导出：

- `auth`
- `user`
- `role`
- `menu`
- `permission`
- `dict`
- `merchant`
- `store`
- `servicePoint`
- `device`
- `serviceProduct`
- `pricingRule`

这些模块已具备较标准的 CRUD/查询能力，是后续接真实后端的优先迁移对象。

但以下页面没有接入该 facade，主要靠组件内 mock：

- 门店组管理
- 商户后台
- 门店运营台
- 交易中心
- 核销履约
- 活动总览
- 券模板管理
- 充值活动
- 邀请活动
- 跨店活动
- 资产总览
- 服务卡与次卡
- 结算总览
- 多合伙人分润
- 经营分析
- 客服工单
- 消息中心
- 广告中心
- 商城零售

这意味着当前“页面已完成”和“业务能力已接通”之间差距较大。

## 15. 主要问题清单

### 15.1 高优先级问题

1. 权限管理与真实路由菜单脱节

   `BasicLayout` 静态菜单不会读取 `menuApi.tree()` 或角色权限。系统管理里的菜单、角色、权限树当前不会影响用户看到的菜单和可访问路由。

2. 数据层不统一

   一部分模块走 `backendService + localDataStore`，另一部分直接组件内 `useState(initialRecords)`。这会导致刷新丢数据、模块之间无法联动、后续接后端时改造成本不一致。

3. `request.ts` 基本未接入当前业务 API

   项目有真实 HTTP 封装，但 API facade 主要调用本地 store。后续接真实后端时，需要决定是替换 facade 内部实现，还是为每个业务域新建真实 service。

4. 类型约束不足

   系统 hooks 和页面里存在大量 `any`、`Record<string, unknown>`。这在原型阶段方便，但对接真实接口后容易出现字段错位、状态码错位、表单 payload 错位。

5. 权限与安全边界弱

   登录态只看 localStorage token；没有路由权限、按钮权限、token 刷新、会话过期时间、用户权限重拉机制。

### 15.2 中优先级问题

1. 业务状态没有统一枚举模型

   状态值混用数字、字符串，例如商户 `1/0`，门店 `OPEN/PAUSED/CLOSED`，活动 `RUNNING/ENDED`，设备 `ONLINE/FAULT`。目前能展示，但后续应集中定义状态枚举和后端契约。

2. 金额、时间、经纬度等字段类型不稳定

   多处字段允许 `string | number`，会给表单校验、计算、接口转换带来隐患。

3. 业务关联不完整

   商户、门店、点位、设备、商品、订单、核销、资产、结算之间大部分还只是页面上的概念关联，没有统一 ID 关系和后端数据链路。

4. 删除操作缺少引用校验

   删除商户、门店、点位、商品等操作没有统一的依赖检查策略。

5. UI 说明性内容偏多

   WorkflowGuide 在原型阶段有价值，但生产管理后台应把大量说明文字收敛为真实待办、异常、指标和操作入口。

### 15.3 低优先级问题

1. README 与当前页面数量不完全匹配

   README 仍描述“第一版最小后台骨架”和“业务模块占位路由”，但代码里已经有大量业务管理页。

2. console 日志较多

   `request.ts` 打印请求和响应，生产环境应按环境变量控制。

3. 图表依赖未充分使用

   项目引入 charts/plots，但经营分析主要用表格和卡片，没有发挥图表能力。

## 16. 推荐改造顺序

### 第一阶段：收敛基础工程

1. 安装依赖并跑通 `npm run build`、`npm run lint`。
2. 修复构建/类型错误。
3. 更新 README，让它准确描述当前项目状态。
4. 明确“本地演示模式”和“真实后端模式”的边界。

### 第二阶段：统一数据访问层

1. 保留 `backendService.ts` 作为页面唯一 API facade。
2. 把组件内 mock 页面逐步迁移到 `backendService + localDataStore`。
3. 每个业务域定义明确的 Record 类型、PageResult、create/update payload。
4. 后续接后端时只替换 facade 内部实现，页面尽量不改。

### 第三阶段：权限和菜单真实化

1. 登录后加载用户信息、角色、权限。
2. `BasicLayout` 菜单从权限树/菜单树生成。
3. 路由层做权限守卫。
4. 表格按钮、工具栏按钮支持权限控制。

### 第四阶段：核心链路真实闭环

优先选择一条主链路做真实打通：

```text
商户 -> 门店 -> 点位 -> 设备 -> 商品服务 -> 订单 -> 核销 -> 结算
```

建议先接这些 facade：

- merchant
- store
- servicePoint
- device
- serviceProduct
- pricingRule

再补：

- trade
- fulfillment
- asset
- settlement

### 第五阶段：二期/三期模块降噪

广告中心、商城零售、部分营销页目前偏规划。若短期不接后端，建议标注为“规划/演示”，避免运营误用。

## 17. 结论

当前项目已经具备一个自助设备经营后台的完整页面轮廓，菜单结构和业务模块覆盖面比较广，适合作为产品原型和后续对接后端的前端基底。

核心风险不在 UI，而在“数据和权限还没有统一落地”：真实 HTTP 请求封装、本地 API facade、组件内 mock 三套形态并存。后续如果继续扩展，建议优先统一 API facade 和类型模型，再逐步把组件内 mock 模块迁移出去。这样可以避免页面越做越多，但每个模块的数据契约都不一样。
