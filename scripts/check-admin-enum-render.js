import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const pagesRoot = path.join(srcRoot, 'pages');

const enumLikeFieldPattern = /(status|type|mode|scope|level|category|priority|scene|source|channel|method|cycle|dimension|placement|protocol|fault|control|auth|signature|command|callback|realName|vehicle|qualify|issue|reward|orgType|changeType|operationType|refundType|ticketType)/i;
const enumLikeTitlePattern = /(状态|类型|方式|模式|级别|范围|场景|来源|渠道|周期|维度|优先级|投放|协议|故障|控制|认证|签名|指令|回调|实名|车辆|达标|发放|奖励|组织类型|变更类型|操作类型|退款类型|售后类型)/;

const allowedRawFieldPattern = /(id|code|name|no|value|content|payload|url|path|remark|description|title|time|date|amount|price|count|quantity|rate|phone|mobile|email|address|city|province|period|cycle|roleName|scopeName|sourceNo|sourceBizNo|channelTradeNo|channelRefundNo|channelName|protocolName|modelName|modelCode|deviceModel|protocolCode|vendorStatusCode|platformStatusCode|statusName|alarmContent|jobHandler|requestPath|applicant|inviterReward|inviteeReward)$/i;

const explicitAllowList = new Set([
  'pages/Business/activity-marketing/CrossStoreActivityManagement.tsx:cycle',
  'pages/Business/finance-settlement/SettlementManagement.tsx:cycle',
  'pages/Business/finance-settlement/ProfitSharingManagement.tsx:period',
  'pages/Business/service-messaging/ServiceDeskManagement.tsx:source',
]);

const walk = (dir) => {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else if (item.isFile() && full.endsWith('.tsx')) out.push(full);
  }
  return out;
};

const getLine = (text, index) => text.slice(0, index).split('\n').length;

const extractColumnObjects = (text) => {
  const objects = [];
  for (const match of text.matchAll(/\{\s*title:\s*(['"`])([^'"`]+)\1[\s\S]{0,700}?dataIndex:\s*(['"`])([^'"`]+)\3[\s\S]{0,900}?\}/g)) {
    objects.push({ start: match.index ?? 0, text: match[0], title: match[2], dataIndex: match[4] });
  }
  return objects;
};

const errors = [];

for (const filePath of walk(pagesRoot)) {
  const rel = path.relative(root, filePath).replaceAll(path.sep, '/');
  const pageRel = path.relative(srcRoot, filePath).replaceAll(path.sep, '/');
  const text = fs.readFileSync(filePath, 'utf8');
  for (const column of extractColumnObjects(text)) {
    const key = `${pageRel}:${column.dataIndex}`;
    if (explicitAllowList.has(key)) continue;
    const enumLike = enumLikeFieldPattern.test(column.dataIndex) || enumLikeTitlePattern.test(column.title);
    if (!enumLike) continue;
    if (allowedRawFieldPattern.test(column.dataIndex)) continue;
    const hasRenderer = /\b(render|renderText|valueEnum)\s*:/.test(column.text);
    if (!hasRenderer) {
      errors.push(`${rel}:${getLine(text, column.start)} ${column.title}(${column.dataIndex}) missing enum renderer`);
    }
  }
}

if (errors.length) {
  console.error('Admin enum render check failed:');
  for (const error of errors.slice(0, 80)) {
    console.error(`- ${error}`);
  }
  if (errors.length > 80) {
    console.error(`... ${errors.length - 80} more`);
  }
  process.exit(1);
}

console.log('Admin enum render check passed: enum-like table columns have render/valueEnum/renderText.');
