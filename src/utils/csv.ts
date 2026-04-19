export const splitCommaValues = (value?: string) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const joinCommaValues = (values?: Array<string | number>) =>
  Array.isArray(values) ? values.map((item) => String(item).trim()).filter(Boolean).join(',') : '';
