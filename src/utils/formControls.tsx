import React from 'react';
import { Cascader, DatePicker, TimePicker } from 'antd';
import type { CascaderProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import regionLevelData from 'province-city-china/dist/level.min.json';

dayjs.extend(customParseFormat);

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

const normalizePickerText = (value: unknown, format: string) => {
  const text = String(value).trim();
  if (!text) return '';

  if (format === DATE_FORMAT) {
    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    return match?.[0] || text;
  }

  if (format === TIME_FORMAT) {
    const match = text.match(/\d{2}:\d{2}/);
    return match?.[0] || text;
  }

  if (format === DATE_TIME_FORMAT) {
    const match = text.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/);
    if (match) {
      const normalized = match[0].replace('T', ' ');
      return normalized.length === 16 ? `${normalized}:00` : normalized;
    }
  }

  return text;
};

const toDayjs = (value: unknown, format: string): Dayjs | null => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const normalized = normalizePickerText(value, format);
  const parsed = dayjs(normalized, format);
  return parsed.isValid() ? parsed : null;
};

export const toDateTimePickerValue = (value: unknown) => toDayjs(value, DATE_TIME_FORMAT);
export const toDatePickerValue = (value: unknown) => toDayjs(value, DATE_FORMAT);
export const toTimePickerValue = (value: unknown) => toDayjs(value, TIME_FORMAT);
export const toDateRangePickerValue = (value: unknown) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [start, end] = value;
    const startValue = toDayjs(start, DATE_FORMAT);
    const endValue = toDayjs(end, DATE_FORMAT);
    return startValue && endValue ? [startValue, endValue] : null;
  }
  const match = String(value).match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const startValue = toDayjs(match[1], DATE_FORMAT);
  const endValue = toDayjs(match[2], DATE_FORMAT);
  return startValue && endValue ? [startValue, endValue] : null;
};

export const fromDateTimePickerValue = (value: Dayjs | null) => value?.format(DATE_TIME_FORMAT);
export const fromDatePickerValue = (value: Dayjs | null) => value?.format(DATE_FORMAT);
export const fromTimePickerValue = (value: Dayjs | null) => value?.format(TIME_FORMAT);
export const fromDateRangePickerValue = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const [start, end] = value;
  const startValue = dayjs.isDayjs(start) ? start.format(DATE_FORMAT) : undefined;
  const endValue = dayjs.isDayjs(end) ? end.format(DATE_FORMAT) : undefined;
  return startValue && endValue ? `${startValue} 至 ${endValue}` : undefined;
};

type DatePickerFieldProps = React.ComponentProps<typeof DatePicker>;
type RangePickerFieldProps = React.ComponentProps<typeof DatePicker.RangePicker>;
type TimePickerFieldProps = React.ComponentProps<typeof TimePicker>;
type RegionCascaderValue = string[];
type RegionCascaderProps = {
  value?: RegionCascaderValue;
  onChange?: (value: RegionCascaderValue, selectedOptions: RegionOption[]) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  id?: string;
  allowClear?: boolean;
  showSearch?: CascaderProps<RegionOption>['showSearch'];
};

export const DateTimeField: React.FC<DatePickerFieldProps> = ({ placeholder = '请选择日期时间', style, ...props }) => (
  <DatePicker {...props} showTime format={props.format ?? DATE_TIME_FORMAT} placeholder={placeholder} style={{ width: '100%', ...style }} />
);

export const DateField: React.FC<DatePickerFieldProps> = ({ placeholder = '请选择日期', style, ...props }) => (
  <DatePicker {...props} format={props.format ?? DATE_FORMAT} placeholder={placeholder} style={{ width: '100%', ...style }} />
);

export const DateRangeField: React.FC<RangePickerFieldProps> = ({ style, ...props }) => (
  <DatePicker.RangePicker {...props} format={props.format ?? DATE_FORMAT} style={{ width: '100%', ...style }} />
);

export const TimeField: React.FC<TimePickerFieldProps> = ({ placeholder = '请选择时间', style, ...props }) => (
  <TimePicker {...props} format={props.format ?? TIME_FORMAT} placeholder={placeholder} style={{ width: '100%', ...style }} />
);

export interface RegionOption {
  value: string;
  label: string;
  children?: RegionOption[];
}

type RegionLevelNode = {
  c: string;
  n: string;
  d?: RegionLevelNode[];
};

const toRegionOption = (node: RegionLevelNode): RegionOption => ({
  value: node.n,
  label: node.n,
  children: node.d?.map(toRegionOption),
});

const toRegionOptions = (nodes: RegionLevelNode[]): RegionOption[] =>
  nodes.map((province) => {
    const children = province.d || [];
    const hasCityLevel = children.some((item) => item.d?.length);
    return {
      value: province.n,
      label: province.n,
      children: hasCityLevel
        ? children.map(toRegionOption)
        : [
            {
              value: province.n,
              label: province.n,
              children: children.map(toRegionOption),
            },
          ],
    };
  });

export const regionOptions: RegionOption[] = toRegionOptions(regionLevelData as RegionLevelNode[]);

export const RegionCascader: React.FC<RegionCascaderProps> = ({ allowClear = true, showSearch = true, onChange, placeholder = '请选择省 / 市 / 区', style, ...props }) => (
  <Cascader
    {...props}
    allowClear={allowClear}
    showSearch={showSearch}
    options={regionOptions}
    onChange={onChange}
    placeholder={placeholder}
    style={{ width: '100%', ...style }}
  />
);
