import React from 'react';
import { Descriptions } from 'antd';

export interface DetailField<T extends Record<string, any> = Record<string, any>> {
  name: keyof T | string;
  label: string;
  render?: (value: any, record: T) => React.ReactNode;
}

interface SchemaDetailProps<T extends Record<string, any>> {
  record: T;
  fields: DetailField<T>[];
  column?: number;
  labelWidth?: number;
}

const SchemaDetail = <T extends Record<string, any>>({ record, fields, column = 2, labelWidth = 110 }: SchemaDetailProps<T>) => (
  <Descriptions column={column} labelStyle={{ width: labelWidth }}>
    {fields.map((field) => {
      const value = record[field.name as keyof T];
      return (
        <Descriptions.Item key={String(field.name)} label={field.label}>
          {field.render ? field.render(value, record) : String(value ?? '-')}
        </Descriptions.Item>
      );
    })}
  </Descriptions>
);

export default SchemaDetail;
