import React from 'react';
import { Cascader, DatePicker, TimePicker } from 'antd';
import type { CascaderProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

const toDayjs = (value: unknown, format: string): Dayjs | null => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(String(value), format);
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

export const DateTimeField: React.FC<{ placeholder?: string }> = ({ placeholder = '请选择日期时间' }) => (
  <DatePicker showTime format={DATE_TIME_FORMAT} placeholder={placeholder} style={{ width: '100%' }} />
);

export const DateField: React.FC<{ placeholder?: string }> = ({ placeholder = '请选择日期' }) => (
  <DatePicker format={DATE_FORMAT} placeholder={placeholder} style={{ width: '100%' }} />
);

export const DateRangeField: React.FC = () => (
  <DatePicker.RangePicker format={DATE_FORMAT} style={{ width: '100%' }} />
);

export const TimeField: React.FC<{ placeholder?: string }> = ({ placeholder = '请选择时间' }) => (
  <TimePicker format={TIME_FORMAT} placeholder={placeholder} style={{ width: '100%' }} />
);

export interface RegionOption {
  value: string;
  label: string;
  children?: RegionOption[];
}

export const regionOptions: RegionOption[] = [
  {
    value: '上海市',
    label: '上海市',
    children: [
      { value: '上海市', label: '上海市', children: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '松江区', '青浦区', '奉贤区', '金山区', '崇明区'].map((name) => ({ value: name, label: name })) },
    ],
  },
  {
    value: '北京市',
    label: '北京市',
    children: [
      { value: '北京市', label: '北京市', children: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '顺义区', '房山区', '门头沟区', '怀柔区', '平谷区', '密云区', '延庆区'].map((name) => ({ value: name, label: name })) },
    ],
  },
  {
    value: '广东省',
    label: '广东省',
    children: ['广州市', '深圳市', '佛山市', '东莞市', '珠海市', '中山市', '惠州市', '江门市', '肇庆市', '汕头市'].map((city) => ({ value: city, label: city })),
  },
  {
    value: '浙江省',
    label: '浙江省',
    children: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '台州市'].map((city) => ({ value: city, label: city })),
  },
  {
    value: '江苏省',
    label: '江苏省',
    children: ['南京市', '苏州市', '无锡市', '常州市', '南通市', '扬州市', '徐州市'].map((city) => ({ value: city, label: city })),
  },
  {
    value: '四川省',
    label: '四川省',
    children: ['成都市', '绵阳市', '德阳市', '乐山市', '宜宾市'].map((city) => ({ value: city, label: city })),
  },
  {
    value: '湖北省',
    label: '湖北省',
    children: ['武汉市', '宜昌市', '襄阳市', '荆州市'].map((city) => ({ value: city, label: city })),
  },
];

export const RegionCascader: React.FC<{
  onChange?: CascaderProps<RegionOption>['onChange'];
  placeholder?: string;
}> = ({ onChange, placeholder = '请选择省 / 市 / 区' }) => (
  <Cascader
    allowClear
    showSearch
    options={regionOptions}
    onChange={onChange}
    placeholder={placeholder}
    style={{ width: '100%' }}
  />
);
