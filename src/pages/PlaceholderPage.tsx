import React from 'react';
import { Card, List, Tag } from 'antd';
import { HourglassOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const defaultTodos = [
  '补充该模块的数据模型与接口设计',
  '补齐列表、详情和编辑页面',
  '接入权限点、状态流转和操作日志',
];

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <div style={{ padding: 24 }}>
    <PageBanner
      title={title}
      subtitle={description || '该模块暂未完成，后续会结合业务文档逐步设计与接入。'}
      icon={<HourglassOutlined />}
    />

    <Card title="当前状态">
      <List
        dataSource={defaultTodos}
        renderItem={(item) => (
          <List.Item>
            <Tag color="processing">待建设</Tag>
            {item}
          </List.Item>
        )}
      />
    </Card>
  </div>
);

export default PlaceholderPage;
