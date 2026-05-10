import { Tag } from 'antd';
import { splitCommaValues } from '@/utils/csv';

export const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

export const normalizeKeyword = (value?: string) => String(value || '').trim().toLowerCase();

export const buildValueEnum = (items: Array<{ value: string | number; label: string }>) =>
  items.reduce(
    (acc, item) => ({
      ...acc,
      [item.value]: { text: item.label },
    }),
    {} as Record<string | number, { text: string }>
  );

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
