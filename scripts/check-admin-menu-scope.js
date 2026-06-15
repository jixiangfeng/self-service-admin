import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutPath = path.join(root, 'src/layouts/BasicLayout.tsx');
const appPath = path.join(root, 'src/App.tsx');

const layout = fs.readFileSync(layoutPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const requiredMenuLabels = [
  '工作台',
  '商户中心',
  '商户管理',
  '商户账号',
  '门店运营',
  '门店管理',
  '门店组管理',
  '点位管理',
  '设备管理',
  '门店运营台',
  '设备接入',
  '设备接入管理',
  '套餐权益',
  '套餐管理',
  '套餐价格',
  '交易履约',
  '交易订单',
  '订单明细',
  '核销履约',
  '用户资产',
  '用户档案',
  '资产总览',
  '次卡/月卡',
  '优惠券明细',
  '资产流水',
  '活动营销',
  '活动总览',
  '券模板管理',
  '充值活动',
  '邀请活动',
  '跨店经营',
  '营销执行台',
  '财务结算',
  '结算总览',
  '结算明细',
  '合伙人分润',
  '分润明细',
  '数据报表',
  '经营分析',
  '客服消息',
  '客服工单',
  '消息中心',
  '评价反馈',
  '运营支撑',
  '支付运维',
  '设备运维',
  '小程序运营配置',
  '平台基础配置',
  '系统管理',
  '用户管理',
  '角色管理',
  '权限/菜单管理',
  '字典管理',
  '日志管理',
  '组织架构',
];

const hiddenMenuLabels = [
  '商户档案中心',
  '商户后台',
  '门店档案中心',
  '点位档案中心',
  '设备档案中心',
  '商品服务',
  '商品与服务',
  '商品价格中心',
  '商品变更中心',
  '跨店活动',
  '结算明细中心',
  '多合伙人分润',
  '分润明细中心',
  '发票中心',
  '评价反馈中心',
  '订阅授权中心',
  '增值规划',
  '广告中心',
  '商城零售',
  '增值流水中心',
  '运营支撑中心',
  '运营配置中心',
  '文件关联中心',
  '审批流中心',
  '风控调度告警',
  '开放接口中心',
  '权限审计中心',
  '组织架构中心',
];

const requiredRoutes = [
  'path="device-access"',
  'path="device-ops"',
  'path="mini-program-ops"',
  'path="platform-base"',
];

const removedRoutes = [
  'path="service/changes"',
  'path="settlement/invoices"',
  'path="service-desk/subscribes"',
  'path="ads"',
  'path="retail"',
  'path="value-flows"',
  'path="operations-support"',
  'path="operations-config"',
  'path="operations-extension"',
  'path="file-relations"',
  'path="approval-flows"',
  'path="risk-schedule-alarms"',
  'path="open-api"',
];

const removedPageSymbols = [
  'ProductChangeManagement',
  'InvoiceManagement',
  'SubscribeAuthManagement',
  'AdManagement',
  'RetailManagement',
  'ValueFlowManagement',
  'OperationsSupportManagement',
  'OperationsConfigManagement',
  'OperationsExtensionManagement',
  'FileRelationManagement',
  'ApprovalFlowManagement',
  'RiskScheduleAlarmManagement',
  'OpenApiManagement',
];

const requiredRedirects = [
  'path="merchant/profiles" element={<Navigate to="/merchant" replace />} />',
  'path="store/profiles" element={<Navigate to="/store" replace />} />',
  'path="bay/profiles" element={<Navigate to="/bay" replace />} />',
  'path="device/profiles" element={<Navigate to="/device" replace />} />',
];

const errors = [];

for (const label of requiredMenuLabels) {
  if (!layout.includes(`name: '${label}'`)) {
    errors.push(`missing required menu label: ${label}`);
  }
}

for (const label of hiddenMenuLabels) {
  if (layout.includes(`name: '${label}'`)) {
    errors.push(`hidden menu label is still visible: ${label}`);
  }
}

for (const route of requiredRoutes) {
  if (!app.includes(route)) {
    errors.push(`missing required route: ${route}`);
  }
}

for (const route of removedRoutes) {
  if (app.includes(route)) {
    errors.push(`removed hidden route is still registered: ${route}`);
  }
}

for (const symbol of removedPageSymbols) {
  if (app.includes(symbol)) {
    errors.push(`removed hidden page is still lazy-loaded: ${symbol}`);
  }
}

for (const redirect of requiredRedirects) {
  if (!app.includes(redirect)) {
    errors.push(`missing required collapsed profile redirect: ${redirect}`);
  }
}

if (errors.length) {
  console.error('Admin menu scope check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Admin menu scope check passed: ${requiredMenuLabels.length} visible labels, ${hiddenMenuLabels.length} hidden labels, ${requiredRoutes.length} routes verified.`);
