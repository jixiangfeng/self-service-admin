import React, { useState } from 'react';
import { Button, Card, Col, List, Row, Space, Spin, Statistic, Tag } from 'antd';
import { AlertOutlined, ApartmentOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, FundProjectionScreenOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageBanner from '@/components/PageBanner';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { PlatformDashboardCardRecord, PlatformDashboardItemRecord } from '@/services/backendService';
import { formatAmount } from '@/pages/Business/shared';

const dashboardItemFields: DetailField<PlatformDashboardItemRecord>[] = [
  { name: 'title', label: '标题' },
  { name: 'category', label: '分类' },
  { name: 'owner', label: '负责人' },
  { name: 'status', label: '状态' },
  { name: 'priority', label: '优先级' },
  { name: 'bizNo', label: '业务单号' },
  { name: 'route', label: '处理入口' },
  { name: 'occurredAt', label: '发生时间' },
];

const dashboardCardFields: DetailField<PlatformDashboardCardRecord>[] = [
  { name: 'title', label: '指标' },
  { name: 'value', label: '数值' },
  { name: 'suffix', label: '单位' },
  { name: 'status', label: '状态' },
  { name: 'route', label: '入口' },
];

const cardIcon = (key: string) => {
  if (key.includes('merchant')) return <ApartmentOutlined />;
  if (key.includes('revenue')) return <BarChartOutlined />;
  if (key.includes('alarm')) return <AlertOutlined />;
  if (key.includes('todo')) return <ClockCircleOutlined />;
  if (key.includes('settlement')) return <CheckCircleOutlined />;
  return <FundProjectionScreenOutlined />;
};

const statusColor = (status?: string) => {
  if (status === 'RISK' || status === 'FAILED' || status === 'HIGH') return 'red';
  if (status === 'WARN' || status === 'PENDING' || status === 'PROCESSING') return 'gold';
  if (status === 'SUCCESS' || status === 'DONE' || status === 'READY') return 'green';
  return 'blue';
};

const renderValue = (card: PlatformDashboardCardRecord) => (
  card.key === 'revenue' && typeof card.value === 'number' ? formatAmount(card.value) : card.value
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PlatformDashboardItemRecord | PlatformDashboardCardRecord | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['platformDashboardOverview'],
    queryFn: async () => (await api.platformDashboard.overview()).data,
  });

  const cards = data?.cards || [];
  const todos = data?.todos || [];
  const alerts = data?.alerts || [];
  const changes = data?.changes || [];
  const quickEntries = data?.quickEntries || [];

  const renderItemList = (items: PlatformDashboardItemRecord[], emptyText: string) => (
    <List
      dataSource={items}
      locale={{ emptyText }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key="detail" size="small" type="link" onClick={() => setDetail(item)}>详情</Button>,
            item.route ? <Button key="go" size="small" type="link" onClick={() => navigate(item.route || '/dashboard')}>进入</Button> : null,
          ]}
        >
          <List.Item.Meta
            title={<Space><span>{item.title}</span><Tag color={statusColor(item.status || item.priority)}>{item.status || item.priority || 'READY'}</Tag></Space>}
            description={[item.category, item.owner, item.bizNo, item.occurredAt].filter(Boolean).join(' / ')}
          />
        </List.Item>
      )}
    />
  );

  return (
    <Spin spinning={isLoading}>
      <div style={{ padding: 24 }}>
        <PageBanner
          title="工作台"
          subtitle="平台经营总览、待办处置、异常提醒和关键业务入口。"
          icon={<FundProjectionScreenOutlined />}
        />

        <Row gutter={[16, 16]}>
          {cards.map((item) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={item.key}>
              <Card hoverable onClick={() => item.route && navigate(item.route)}>
                <Statistic title={item.title} value={renderValue(item)} suffix={item.suffix} prefix={cardIcon(item.key)} />
                <Tag color={statusColor(item.status)} style={{ marginTop: 8 }}>{item.status || 'NORMAL'}</Tag>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          <Col xs={24} xl={8}>
            <Card title="统一待办" extra={<Button size="small" onClick={() => navigate('/merchant-console')}>待办中心 <RightOutlined /></Button>}>
              {renderItemList(todos, '暂无待办')}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title="异常提醒" extra={<Button size="small" onClick={() => navigate('/operations-support')}>运营支撑 <RightOutlined /></Button>}>
              {renderItemList(alerts, '暂无异常')}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title="最近变更" extra={<Button size="small" onClick={() => navigate('/system/auth-audit')}>审计日志 <RightOutlined /></Button>}>
              {renderItemList(changes, '暂无变更')}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          {quickEntries.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.id}>
              <Card>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space>
                    <SettingOutlined />
                    <strong>{item.title}</strong>
                    <Tag color={statusColor(item.priority)}>{item.category}</Tag>
                  </Space>
                  <span>{[item.owner, item.status].filter(Boolean).join(' / ')}</span>
                  <Button type="primary" block onClick={() => navigate(item.route || '/dashboard')}>进入处理</Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <BusinessDetailModal title="工作台事项详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
          {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('key' in detail ? dashboardCardFields : dashboardItemFields) as DetailField<Record<string, any>>[]} /> : null}
        </BusinessDetailModal>
      </div>
    </Spin>
  );
};

export default Dashboard;
