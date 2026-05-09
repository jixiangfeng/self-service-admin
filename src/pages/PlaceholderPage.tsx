import React from 'react';
import { Card, List, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const defaultTodos = [
  '模块入口已纳入平台导航和权限菜单',
  '业务数据统一通过后端服务层读取和维护',
  '列表、详情、编辑和操作记录按模块配置持续对齐',
];

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <div style={{ padding: 24 }}>
    <PageBanner
      title={title}
      subtitle={description || '该模块入口已纳入运营后台，可按业务权限进入对应功能页处理。'}
      icon={<AppstoreOutlined />}
    />

    <Card title="模块能力">
      <List
        dataSource={defaultTodos}
        renderItem={(item) => (
          <List.Item>
            <Tag color="success">已纳入</Tag>
            {item}
          </List.Item>
        )}
      />
    </Card>
  </div>
);

export default PlaceholderPage;
