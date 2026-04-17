# 自助洗车管理后台

基于 React、TypeScript、Vite、Ant Design Pro Components 搭建的自助洗车管理端前端项目。

当前仓库已完成第一版最小后台骨架，包含：

- 登录页
- 工作台
- 系统管理
  - 用户管理
  - 角色管理
  - 菜单权限管理
  - 数据字典管理
- 业务模块占位路由
  - 商户管理
  - 门店管理
  - 工位管理
  - 设备管理
  - 服务商品
  - 订单中心

## 技术栈

- React 18
- TypeScript
- Vite
- Ant Design
- Ant Design Pro Components
- React Query
- Axios

## 启动方式

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 环境变量

本地开发请自行创建 `.env.development`，示例：

```bash
VITE_API_BASE_URL=http://localhost:8081/api
```

## 对接说明

当前系统管理模块已按 `sz-web` 现有接口做适配，主要包括：

- `/auth/login`
- `/auth/user/info`
- `/user/page`
- `/user/edit`
- `/user/{id}/status`
- `/user/role/list`
- `/role/page`
- `/role/add`
- `/role/edit`
- `/role/{id}`
- `/role/permission/tree`
- `/permission/tree`
- `/permission/add`
- `/permission/edit`
- `/permission/{id}`
- `/dict/type/list`
- `/dict/type`
- `/dict/type/{id}`
- `/dict/data/list`

## 当前状态

这不是完整业务后台，而是用于后续继续设计和扩展的基础工程版本。
