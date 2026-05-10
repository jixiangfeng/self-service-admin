import React from 'react';
import { Card, Col, Row, Space, Spin, Statistic, Tag } from 'antd';
import { ApiOutlined, BellOutlined, CommentOutlined, FileDoneOutlined, MobileOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageBanner from '@/components/PageBanner';
import api, { type OperationsExtensionEntryRecord } from '@/services/backendService';

const iconMap: Record<string, React.ReactNode> = {
  MOBILE: <MobileOutlined />,
  BELL: <BellOutlined />,
  API: <ApiOutlined />,
  INVOICE: <FileDoneOutlined />,
  FEEDBACK: <CommentOutlined />,
};

const OperationsExtensionManagement: React.FC = () => {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: ['operationsExtensionOverview'],
    queryFn: async () => (await api.operationsExtension.overview()).data,
  });
  const overview = overviewQuery.data;
  const entries = overview?.entries || [];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="运营扩展中心" subtitle="按后端能力聚合运营入口、接入状态和真实数据量。" icon={<ApiOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="扩展能力" value={overview?.extensionCount ?? 0} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="已接入能力" value={overview?.activeCount ?? 0} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="重复维护表" value={overview?.duplicatedTableCount ?? 0} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card loading={overviewQuery.isLoading}><Statistic title="能力入口" value={overview?.entryType || '-'} /></Card></Col>
      </Row>

      <Spin spinning={overviewQuery.isLoading}>
        <Row gutter={[16, 16]}>
          {entries.map((entry: OperationsExtensionEntryRecord) => (
            <Col xs={24} md={12} xl={8} key={entry.path}>
              <Card hoverable onClick={() => navigate(entry.path)} bodyStyle={{ minHeight: 150 }}>
                <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space align="start">
                    <span style={{ fontSize: 24, color: '#1677ff' }}>{iconMap[entry.icon] || <ApiOutlined />}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{entry.title}</div>
                      <div style={{ marginTop: 8, color: '#667085', lineHeight: 1.6 }}>{entry.tables}</div>
                      <Space size={8} style={{ marginTop: 12 }}>
                        <Tag color={entry.recordCount > 0 ? 'processing' : 'default'}>{entry.status}</Tag>
                        <Tag>{entry.recordCount} 条数据</Tag>
                      </Space>
                    </div>
                  </Space>
                  <RightOutlined style={{ color: '#98a2b3', marginTop: 4 }} />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  );
};

export default OperationsExtensionManagement;
