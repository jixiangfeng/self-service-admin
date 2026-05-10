import React from 'react';
import { Button, Form, Input, Space } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

interface KeywordSearchBarProps {
  value?: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  style?: React.CSSProperties;
}

const KeywordSearchBar: React.FC<KeywordSearchBarProps> = ({
  value,
  placeholder = '请输入关键词',
  onSearch,
  style,
}) => {
  const [form] = Form.useForm<{ keyword?: string }>();

  React.useEffect(() => {
    form.setFieldsValue({ keyword: value });
  }, [form, value]);

  const submit = async () => {
    const values = await form.validateFields();
    onSearch(String(values.keyword || '').trim());
  };

  const reset = () => {
    form.resetFields();
    onSearch('');
  };

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={submit}
      style={{
        marginBottom: 16,
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        ...style,
      }}
    >
      <Form.Item name="keyword" style={{ flex: 1, marginBottom: 0 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder={placeholder} />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>
    </Form>
  );
};

export default KeywordSearchBar;
