import { Tag } from 'antd';
import { splitCommaValues } from '@/utils/csv';
import { inferBusinessEnumLabel } from '@/utils/businessEnumLabel';

export const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

export const normalizeKeyword = (value?: string) => String(value || '').trim().toLowerCase();

const findOption = (
  items: Array<{ value: string | number; label: string; color?: string }>,
  value: string | number
) => items.find((item) => String(item.value) === String(value));

export const buildValueEnum = (items: Array<{ value: string | number; label: string; color?: string }>) =>
  new Proxy({} as Record<string | number, { color?: string; text: string }>, {
    get(_target, property) {
      if (typeof property === 'symbol') {
        return undefined;
      }
      const option = findOption(items, property);
      return option ? { color: option.color, text: option.label } : undefined;
    },
    has(_target, property) {
      if (typeof property === 'symbol') {
        return false;
      }
      return Boolean(findOption(items, property));
    },
    ownKeys() {
      return Array.from(new Set(items.map((item) => String(item.value))));
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property === 'symbol') {
        return undefined;
      }
      const option = findOption(items, property);
      if (!option) {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        value: { color: option.color, text: option.label },
      };
    },
  });

export const renderBooleanTag = (value?: number, enabledText = '开启', disabledText = '关闭') => (
  <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? enabledText : disabledText}</Tag>
);

export const renderStatusTag = (value?: string | number, map?: Record<string | number, { color?: string; text: string }>) => {
  const matched = value != null && map ? map[value] : undefined;
  if (matched) {
    return <Tag color={matched.color || 'processing'}>{matched.text}</Tag>;
  }
  return <Tag>{String(value ?? '-')}</Tag>;
};

export const formatEnumText = (value: unknown, fieldName?: string, fieldLabel?: string) => {
  const label = inferBusinessEnumLabel(fieldName, fieldLabel, value);
  return label || String(value ?? '-');
};

const operatorLabelMap: Record<string, string> = {
  APP_PAY_CALLBACK: '支付回调',
  APP_ORDER: '用户下单',
};

export const formatOperatorText = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '-';
  }
  return operatorLabelMap[raw] || raw;
};

export const renderEnumTag = (value: unknown, fieldName?: string, fieldLabel?: string) => {
  const text = formatEnumText(value, fieldName, fieldLabel);
  return <Tag color={text === '-' ? 'default' : 'processing'}>{text}</Tag>;
};

export const containsKeyword = (keyword: string | undefined, values: Array<string | number | undefined | null>) => {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) {
    return true;
  }

  return values
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value).toLowerCase().includes(normalized));
};

export const formatAmount = (value?: string | number) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  return typeof value === 'number' ? `￥${value.toFixed(2)}` : `￥${value}`;
};

const clearingModeLabelMap: Record<string, string> = {
  STORE_CLEARING: '门店清分',
  MERCHANT_CLEARING: '商户清分',
  GROUP_UNIFIED_SETTLEMENT: '门店组统一结算',
  PLATFORM_CLEARING: '平台统一清分',
  OFFLINE_CLEARING: '线下清分',
};

const scopeLabelMap: Record<string, string> = {
  PLATFORM: '平台通用',
  MERCHANT: '商户',
  STORE: '门店',
  STORE_GROUP: '门店组',
  CUSTOM_STORE_SET: '自定义门店集合',
  SERVICE_STORE: '履约门店',
  SOURCE_STORE: '充值门店',
  ISSUER_MERCHANT: '发行商户',
  FIXED_UNIT: '指定主体',
  SHARED: '多方分摊',
};

const snapshotField = (snapshot: string | undefined, keys: string[]) => {
  const parsed = safeJsonParse<Record<string, unknown> | null>(snapshot, null);
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }
  const matchedKey = keys.find((key) => parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== '');
  return matchedKey ? String(parsed[matchedKey]) : undefined;
};

export const formatOwnerRef = (type?: string, id?: number | string) => {
  const label = type ? scopeLabelMap[type] || type : undefined;
  return [label, id !== undefined && id !== null ? `#${id}` : undefined].filter(Boolean).join('') || '-';
};

export const formatClearingRuleText = (record?: {
  settlementRule?: string;
  settlementRuleId?: number | string;
  settlementMode?: string;
  settlementRuleSnapshot?: string;
  balanceScopeType?: string;
  balanceScopeId?: number | string;
  sourceScopeType?: string;
  sourceScopeId?: number | string;
  fundOwnerUnitId?: number | string;
  revenueOwnerUnitId?: number | string;
  giftCostBearerUnitId?: number | string;
  promotionCostUnitId?: number | string;
}) => {
  if (!record) return '-';
  const ruleName = record.settlementRule || snapshotField(record.settlementRuleSnapshot, ['ruleName', 'name']);
  const ruleId = record.settlementRuleId ? `规则#${record.settlementRuleId}` : undefined;
  const mode = record.settlementMode
    ? clearingModeLabelMap[record.settlementMode] || record.settlementMode
    : snapshotField(record.settlementRuleSnapshot, ['settlementMode', 'mode']);
  const scopeType = record.balanceScopeType || record.sourceScopeType || snapshotField(record.settlementRuleSnapshot, ['balanceScopeType', 'scopeType']);
  const scopeId = record.balanceScopeId || record.sourceScopeId || snapshotField(record.settlementRuleSnapshot, ['balanceScopeId', 'scopeId']);
  const scope = scopeType ? formatOwnerRef(scopeType, scopeId) : undefined;
  const platformFee = snapshotField(record.settlementRuleSnapshot, ['platformFeeRate', 'platformRate', 'feeRate']);
  const cycle = snapshotField(record.settlementRuleSnapshot, ['settlementCycle', 'cycle']);
  return [
    ruleName || ruleId,
    mode,
    scope ? `范围：${scope}` : undefined,
    record.fundOwnerUnitId ? `资金#${record.fundOwnerUnitId}` : undefined,
    record.revenueOwnerUnitId ? `收入#${record.revenueOwnerUnitId}` : undefined,
    record.giftCostBearerUnitId ? `赠送成本#${record.giftCostBearerUnitId}` : undefined,
    record.promotionCostUnitId ? `成本#${record.promotionCostUnitId}` : undefined,
    platformFee ? `平台费${platformFee}` : undefined,
    cycle ? `周期${cycle}` : undefined,
  ].filter(Boolean).join('；') || '-';
};

export const renderOptionTags = (
  value: string | number | Array<string | number> | undefined,
  options: Array<{ value: string | number; label: string }> = []
) => {
  const labelMap = options.reduce<Record<string, string>>((acc, item) => {
    acc[String(item.value)] = item.label;
    return acc;
  }, {});

  const values = Array.isArray(value) ? value.map((item) => String(item)) : splitCommaValues(String(value || ''));
  if (!values.length) {
    return '-';
  }

  return (
    <>
      {values.map((item) => (
        <Tag key={item} color="processing" style={{ marginInlineEnd: 6, marginBottom: 6 }}>
          {labelMap[item] || item}
        </Tag>
      ))}
    </>
  );
};

export const safeJsonParse = <T,>(value: string | undefined | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};
