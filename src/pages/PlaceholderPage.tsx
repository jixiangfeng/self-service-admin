import React from 'react';
import { Card, Empty } from 'antd';
import PageBanner from '@/components/PageBanner';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <div style={{ padding: 24 }}>
    <PageBanner title={title} subtitle={description} />
    <Card>
      <Empty
        description="该模块当前仅保留路由占位，页面交互和视觉方案后续单独设计。"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </Card>
  </div>
);

export default PlaceholderPage;
