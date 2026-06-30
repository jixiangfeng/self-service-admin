# self-service-admin / self-service-backend 模块闭环 Review

更新时间：2026-05-12

## 1. 总体结论

`self-service-admin` 与 `self-service-backend` 当前已经从“页面原型 + 本地数据”推进到“前端页面通过统一服务层调用后端真实 CRUD/API”的阶段。整体分层是：

- 前端路由与菜单：`src/App.tsx`、`src/layouts/BasicLayout.tsx`
- 前端 API 适配层：`src/services/backendService.ts`
- 前端业务字典：`src/constants/businessCatalog.ts`，启动时请求 `/business-enums`，本地 fallback 兜底
- 后端统一响应：`Result<T>`
- 后端鉴权：Sa-Token，`/api` 下业务接口，部分登录、健康、业务枚举放行
- 后端模块：按 `system / merchant / store / product / trade / asset / marketing / finance / customer / value / operations / reports / dashboard` 分包
- 数据初始化：`src/main/resources/db/ddl.sql` 与 `dml.sql`

从闭环角度看，项目已经形成一条完整经营链路：

系统权限 -> 商户建档 -> 门店/点位/设备建档 -> 服务商品与计费配置 -> 订单交易 -> 履约核销 -> 用户资产沉淀 -> 营销活动 -> 结算/分润/发票 -> 客服消息与评价反馈 -> 数据分析与运营支撑。

主要风险不在“有没有模块”，而在：

- 大多数模块是通用 CRUD + 少量状态动作，跨模块事务级联有限。
- 前端 `backendService.ts` 承担大量字段兼容和状态映射，后续字段变更要优先维护这里。
- 菜单是前端硬编码，后端也有菜单/权限表，二者仍需持续对齐。
- 部分页面是“运营动作面板”，后端已有对应记录表，但动作之间的业务联动还比较弱。

## 2. 前后端串联方式

### 2.1 请求链路

前端页面不直接散落请求后端，大多数通过：

`页面组件 -> src/services/backendService.ts -> src/utils/request.ts -> 后端 /api/* -> Controller -> Service -> Mapper -> DB`

`backendService.ts` 的作用很关键：

- 包装分页：后端 MyBatis Plus page -> 前端 `PageResult`
- 兼容字段名：例如 `status` 与 `billStatus`、`refundStatus`、`ticketStatus`
- 转换字典/详情展示字段：例如订单、退款、售后列表的展示字段补齐
- 聚合 API 分组：`merchant`、`store`、`serviceProduct`、`serviceOrder`、`asset`、`marketing`、`settlementBill` 等

### 2.2 字典链路

业务字典链路是：

`dml.sql 初始化 dictionary/dictionary_item -> BusinessEnumController /business-enums -> admin businessCatalog.ts -> 页面 Select/valueEnum/renderStatusTag`

系统字典维护页面通过：

- `/dictionaries`
- `/dictionaries/code/{code}`
- `/dictionary-items`
- `/dictionary-items/code/{dictCode}`

admin 修改字典后会刷新 `businessEnums` query，使业务页面能拿到更新后的字典值。

### 2.3 权限链路

权限链路是：

`用户登录 -> token/roles/permissions 存 localStorage -> BasicLayout filterMenuByPermission -> 菜单展示 -> 页面按钮/接口受后端 SaCheckPermission 约束`

后端 system 模块维护用户、角色、菜单、权限、角色权限关系、用户角色关系、数据权限和权限变更日志。

## 3. 模块职责与闭环

| 业务域 | admin 页面 | backend 模块/API | 作用 | 闭环位置 |
| --- | --- | --- | --- | --- |
| 登录与首页 | `Login`、`Dashboard` | `/auth`、`/platform-dashboard`、`/business/overview` | 登录、拿 token、查看平台概览 | 全链路入口 |
| 系统管理 | 用户、角色、菜单、字典、权限审计、组织架构 | `/users`、`/roles`、`/menus`、`/permissions`、`/dictionaries`、`/dictionary-items`、`/permission-change-logs`、`/platform-organizations` 等 | 账号、权限、菜单、字典、组织基础治理 | 控制谁能操作、页面如何展示 |
| 商户中心 | 商户管理、商户档案、账号、门店组、商户工作台 | `/merchants`、`/merchant-contacts`、`/merchant-contracts`、`/merchant-settlement-accounts`、`/merchant-qualifications`、`/merchant-groups`、`/merchant-group-stores`、`/merchant-accounts`、`/merchant-todos`、`/merchant-workbench` | 建立经营主体、合同、联系人、结算账户、账号和门店分组 | 经营主体源头 |
| 门店运营 | 门店、门店档案、点位、点位档案、设备、设备档案、运营任务/公告 | `/stores`、`/store-images`、`/store-business-hours`、`/store-temp-close-records`、`/store-service-capabilities`、`/service-points`、`/devices`、`/device-vendors`、`/device-models`、`/store-operation-tasks`、`/store-notices` 等 | 管理线下服务承载对象：门店、点位、设备、营业时间、临停、公告、运维任务 | 把商户能力落到可履约资源 |
| 商品服务 | 服务商品、计费规则、商品/价格变更 | `/service-products`、`/pricing-rules`、`/product-status-logs`、`/product-change-logs`、`/pricing-rule-versions`、`/pricing-change-logs` | 定义用户能购买/使用的服务，以及计费规则和版本 | 交易前置配置 |
| 交易履约 | 订单处置台、履约核销、订单明细 | `/service-orders`、`/service-order-items`、`/refund-orders`、`/after-sale-tickets`、`/write-off-records`、`/perform-records`、`/order-billing-details`、`/order-status-logs` | 订单、退款、售后、核销、履约、计费明细 | 核心收入和服务交付链路 |
| 用户资产 | 用户资产、用户档案、服务卡、优惠券/卡券明细、资产流水 | `/app-user-profiles`、`/user-asset-accounts`、`/balance-flows`、`/user-coupons`、`/service-cards`、`/user-service-cards`、`/service-card-usages`、`/user-risk-records`、`/user-vehicles` | 用户账户余额、优惠券、服务卡、车辆、收藏、风险记录和资产操作 | 交易结果沉淀与二次消费 |
| 活动营销 | 综合营销、券模板、跨店活动、邀请活动、充值活动、执行中心 | `/coupon-templates`、`/coupon-issue-records`、`/coupon-usage-records`、`/cross-store-activities`、`/invite-activities`、`/recharge-activities`、`/marketing-participations`、`/marketing-rewards`、`/marketing-budgets`、`/recharge-orders` | 券、邀请、充值、跨店活动和预算奖励记录 | 拉新、复购、促活 |
| 财务结算 | 结算单、分润、结算明细、分润明细、发票 | `/settlement-bills`、`/settlement-bill-details`、`/settlement-cost-details`、`/settlement-payouts`、`/settlement-confirms`、`/profit-partner-relations`、`/profit-ratio-versions`、`/profit-share-details`、`/profit-chargebacks`、`/profit-confirms`、`/invoice-titles`、`/invoice-applies` | 交易后对账、结算、成本归集、打款、分润、发票 | 资金闭环 |
| 客服消息 | 工单、消息中心、评价反馈、订阅授权 | `/message-templates`、`/message-records`、`/service-evaluations`、`/user-feedbacks`、`/subscribe-records`、`/after-sale-tickets` | 消息触达、评价处理、用户反馈、售后工单 | 用户体验和售后闭环 |
| 增值规划 | 广告中心、商城零售、增值流水 | `/ad-slots`、`/ad-campaigns`、`/ad-events`、`/ad-conversions`、`/retail-products`、`/retail-stocks`、`/retail-stock-flows`、`/retail-orders`、`/retail-shipments` | 广告投放、零售商品、库存、订单、发货和转化 | 非洗车主业的增值收入 |
| 运营支撑 | 支付运维、设备履约运维、小程序运营配置、文件与开放接口 | `/payment-orders`、`/payment-channels`、`/payment-reconciliations`、`/device-commands`、`/device-faults`、`/file-assets`、`/mini-program-page-configs`、`/open-api-clients` 等 | 支付和设备运维、文件留存、小程序和开放 API | 保障经营链路稳定运行 |
| 数据报表 | 分析中心 | `/analysis-snapshots`、`/platform-dashboard`、`/business/overview` | 固化经营分析快照、看板指标 | 复盘与决策 |

## 4. 关键闭环链路

### 4.1 商户开店闭环

1. 系统管理创建平台用户、角色、菜单权限。
2. 商户中心创建商户主体、联系人、合同、资质、结算账户。
3. 商户账号中心给商户人员开账号并授权。
4. 门店管理在商户下创建门店，补齐营业时间、服务能力、图片、公告。
5. 点位和设备绑定到门店，形成可履约资源。
6. 门店组把多个门店组织成活动/核销/区域统计范围。

对应模块：`merchant -> store -> servicePoint -> device -> merchantGroup`

### 4.2 服务售卖闭环

1. 商品服务定义服务商品。
2. 计费规则配置价格、时段、门店/商品适用范围。
3. 订单模块产生或补录服务订单。
4. 订单明细和计费明细记录商品、计费和优惠口径。
5. 履约模块记录核销或执行过程。
6. 退款/售后模块处理异常。
7. 用户资产沉淀余额、券、服务卡和流水。
8. 财务模块进入结算/分润/发票。

对应模块：`product -> pricing -> trade -> fulfillment -> asset -> finance`

### 4.3 营销促活闭环

1. 券模板、跨店活动、邀请活动、充值活动定义营销策略。
2. 活动执行记录参与、预算、奖励、券发放和券使用。
3. 用户资产模块接收券、余额、服务卡等权益。
4. 交易履约消耗权益并形成订单。
5. 财务结算按订单、优惠成本、分润规则归集。
6. 数据报表分析活动效果。

对应模块：`marketing -> asset -> trade -> finance -> reports`

### 4.4 运维保障闭环

1. 设备/点位/门店产生运维任务、故障、命令、心跳、维修记录。
2. 支付运维跟踪支付订单、回调、对账差异。
3. 审批流处理人工审核事项。
4. 风控调度告警覆盖规则、黑名单、命中记录、定时任务。
5. 文件关联中心沉淀合同、凭证、审核资料。
6. 小程序运营配置、开放 API、系统配置支撑前台和外部系统。

对应模块：`store operations -> device ops -> payment ops -> approval -> risk/schedule -> file/openapi/config`

## 5. admin 页面层 Review

### 5.1 页面组织

admin 当前页面按业务域分目录：

- `merchant-center`
- `store-operations`
- `product-service`
- `trade-fulfillment`
- `user-assets`
- `activity-marketing`
- `finance-settlement`
- `service-messaging`
- `value-planning`
- `platform-operations`
- `data-reports`
- `System`

这与 backend 分包基本一致，只是 backend 将客服消息放在 `customer`，将增值规划放在 `value`，将平台运营支撑放在 `operations`。

### 5.2 共享组件

admin 形成了几个通用组件：

- `BusinessEditorModal`：统一编辑弹框
- `BusinessDetailModal`：统一详情弹框
- `SchemaDetail`：详情字段渲染
- `PageBanner`：页面标题
- `BusinessConfirm`：确认弹窗
- `OssImageUpload`：文件/图片上传
- `WorkflowGuide`、`KeywordSearchBar`、`managementUtils`：业务页辅助

这使页面风格比较统一，也降低了新增 CRUD 页面成本。

### 5.3 API 适配层

`backendService.ts` 是 admin 的关键中间层。它不是简单 request 封装，还做了：

- DTO 类型声明
- CRUD 工厂 `crudApi`
- 后端字段到前端字段的兼容转换
- 状态字段别名兼容
- 字典维护字段转换
- 复杂模块聚合：营销、资产、文件、审批、运营扩展、平台基础等

后续如果后端字段变化，应优先修改这里，而不是每个页面散修。

## 6. backend 模块层 Review

### 6.1 通用结构

backend 基本是标准 Spring Boot + MyBatis Plus CRUD 分层：

- `controller`
- `service`
- `service.impl`
- `mapper`
- `entity`
- 少量 `dto`

大部分 controller 的接口形态一致：

- `GET /xxx` 分页或列表
- `GET /xxx/{id}`
- `POST /xxx`
- `PUT /xxx/{id}`
- `DELETE /xxx/{id}`
- 状态类接口：`PUT /xxx/{id}/status`
- 业务动作接口：如退款审核、售后处理、资产冻结/解冻、文件上传等

### 6.2 数据脚本

- `ddl.sql` 包含结构定义。
- `dml.sql` 包含菜单、权限、字典、业务枚举和初始化数据。
- 业务枚举与 admin fallback 当前已对齐，字典名称已中文化。

### 6.3 测试覆盖

backend 已有较多 controller/service 测试，覆盖范围包括：

- system
- merchant
- store
- product
- trade
- asset
- marketing
- finance
- operations
- reports
- customer

测试存在说明后端已不是纯脚手架，但仍需关注测试是否覆盖跨模块联动，而不只是单 controller CRUD。

## 7. 当前风险与建议

### 7.1 闭环联动仍偏弱

很多模块都有表和接口，但业务动作之间未必自动联动。例如：

- 服务订单完成后是否自动生成结算明细、资产流水、评价入口？
- 优惠券使用后是否自动写券使用记录和营销参与效果？
- 核销/履约完成后是否自动更新订单状态和设备/点位状态？
- 退款审核通过后是否自动写资产流水、结算冲正和售后记录？

建议后续按“真实业务事件”补服务层编排，而不是只补页面按钮。

### 7.2 前端服务层过重

`backendService.ts` 已经承担大量字段映射和兼容。优点是页面稳定，缺点是这个文件会越来越难维护。

建议：

- 保持页面组件不直接写接口路径。
- 对超大业务域逐步拆分为 `services/modules/*.ts`。
- 保留一个聚合 export，避免页面 import 大改。

### 7.3 菜单权限双源

admin `BasicLayout` 有硬编码菜单，backend `dml.sql` 也初始化菜单权限。

建议：

- 短期继续硬编码，但每次新增页面同步更新 `dml.sql` 菜单权限。
- 中期改成后端菜单树驱动前端菜单，前端只保留 route component 映射。

### 7.4 字典维护已可用，但要统一使用

业务字典已从 `/business-enums` 注入，但仍有页面内局部 options。局部 options 不一定是问题，有些是页面动作原因、辅助字段，不适合进全局字典。

建议判断标准：

- 会持久化进业务表、后端也要理解的状态/类型：进字典。
- 只用于当前弹框的操作原因、说明模板、前端辅助选项：可保留局部。

### 7.5 构建环境问题

admin 完整 `npm run build` 目前会受 Rollup optional dependency 缺失影响：

`Cannot find module @rollup/rollup-linux-x64-gnu`

这属于 `node_modules` 安装状态问题。`npx tsc -b` 可以用于先验证 TypeScript。

## 8. 推荐后续验收路径

按闭环验收比按页面验收更有效。建议按以下顺序：

1. 系统权限：创建用户、角色、菜单权限，验证登录和菜单可见性。
2. 商户开店：商户 -> 联系人/合同/资质/结算账户 -> 商户账号 -> 门店组。
3. 门店履约资源：门店 -> 点位 -> 设备 -> 营业时间/服务能力/公告。
4. 商品计费：服务商品 -> 计费规则 -> 价格版本/变更记录。
5. 交易履约：订单 -> 明细 -> 核销/履约 -> 退款/售后 -> 状态日志。
6. 用户资产：余额、券、服务卡、流水、风险记录。
7. 营销：券模板/活动 -> 发券/参与/奖励 -> 订单消耗。
8. 财务：结算单 -> 结算明细/成本 -> 打款 -> 分润 -> 发票。
9. 客服与消息：消息模板/发送记录 -> 评价反馈 -> 售后工单。
10. 运维支撑：支付对账、设备命令/故障、审批、风控、文件、小程序和开放 API。

如果这 10 条链路能跑通，项目就不只是“模块齐全”，而是具备经营闭环。
