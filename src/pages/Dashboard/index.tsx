import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Empty, List, Progress, Row, Space, Spin, Statistic, Tag } from 'antd';
import {
  AlertOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FundProjectionScreenOutlined,
  LineChartOutlined,
  RightOutlined,
  RiseOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageBanner from '@/components/PageBanner';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type {
  PlatformDashboardCardRecord,
  PlatformDashboardDistributionItemRecord,
  PlatformDashboardItemRecord,
  PlatformDashboardRankItemRecord,
} from '@/services/backendService';
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

const statusLabels: Record<string, string> = {
  NORMAL: '正常',
  WARN: '待关注',
  RISK: '风险',
  FAILED: '失败',
  HIGH: '高优先级',
  LOW: '低优先级',
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUCCESS: '成功',
  DONE: '已完成',
  READY: '就绪',
  UNKNOWN: '未知',
  PAID: '已支付',
  IN_PROGRESS: '服务中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  SETTLED: '已结算',
  WAIT_CONFIRM: '待确认',
  REJECTED: '已驳回',
  ENABLED: '启用',
  DISABLED: '停用',
  OPEN: '营业',
  CLOSED: '关闭',
};

const cardIcon = (key: string) => {
  if (key.includes('merchant')) return <ApartmentOutlined />;
  if (key.includes('revenue')) return <BarChartOutlined />;
  if (key.includes('alarm')) return <AlertOutlined />;
  if (key.includes('todo')) return <ClockCircleOutlined />;
  if (key.includes('settlement')) return <CheckCircleOutlined />;
  if (key.includes('user')) return <TeamOutlined />;
  return <FundProjectionScreenOutlined />;
};

const statusColor = (status?: string) => {
  if (status === 'RISK' || status === 'FAILED' || status === 'HIGH' || status === 'REJECTED') return 'red';
  if (status === 'WARN' || status === 'PENDING' || status === 'PROCESSING' || status === 'WAIT_CONFIRM') return 'gold';
  if (status === 'SUCCESS' || status === 'DONE' || status === 'READY' || status === 'NORMAL' || status === 'SETTLED') return 'green';
  return 'blue';
};

const renderStatus = (status?: string) => (
  <Tag color={statusColor(status)}>{status ? statusLabels[status] || status : '正常'}</Tag>
);

const toNumber = (value?: number | string) => Number(value || 0);

const renderValue = (card: PlatformDashboardCardRecord) => (
  card.key === 'revenue' && typeof card.value === 'number' ? formatAmount(card.value) : card.value
);

const itemMeta = (item: PlatformDashboardItemRecord) => [
  item.category ? statusLabels[item.category] || item.category : undefined,
  item.owner,
  item.bizNo,
  item.occurredAt,
].filter(Boolean).join(' / ');

const normalizeDistribution = (items: PlatformDashboardDistributionItemRecord[] = []) =>
  items.map((item) => ({ ...item, name: statusLabels[item.name] || item.name }));

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
  const trend = data?.trend || [];
  const storeRevenueRank = data?.storeRevenueRank || [];

  const trendData = useMemo(() => trend.flatMap((item) => [
    { date: item.date, type: '订单数', value: toNumber(item.orders) },
    { date: item.date, type: '营收', value: toNumber(item.revenue) },
    { date: item.date, type: '新增用户', value: toNumber(item.users) },
  ]), [trend]);

  const orderDistribution = useMemo(() => normalizeDistribution(data?.orderStatusDistribution), [data?.orderStatusDistribution]);
  const storeDistribution = useMemo(() => normalizeDistribution(data?.storeStatusDistribution), [data?.storeStatusDistribution]);
  const settlementDistribution = useMemo(() => normalizeDistribution(data?.settlementStatusDistribution), [data?.settlementStatusDistribution]);
  const maxRankRevenue = Math.max(...storeRevenueRank.map((item) => toNumber(item.revenue)), 1);

  const lineConfig = {
    data: trendData,
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    height: 300,
    smooth: true,
    point: { sizeField: 3 },
    legend: { color: { position: 'top' as const } },
    axis: { y: { labelFormatter: '~s' } },
  };

  const rankConfig = {
    data: storeRevenueRank.map((item) => ({ ...item, revenue: toNumber(item.revenue) })).reverse(),
    xField: 'name',
    yField: 'revenue',
    height: 300,
    transpose: true,
    colorField: 'status',
    label: { text: (item: PlatformDashboardRankItemRecord) => formatAmount(toNumber(item.revenue)), position: 'right' as const },
    axis: { y: { labelFormatter: (value: number) => formatAmount(value) } },
    tooltip: {
      title: (item: PlatformDashboardRankItemRecord) => item.name,
      items: [
        { field: 'revenue', name: '营收', valueFormatter: (value: number) => formatAmount(value) },
        { field: 'orders', name: '订单数' },
      ],
    },
  };

  const pieConfig = (items: PlatformDashboardDistributionItemRecord[]) => ({
    data: items,
    angleField: 'value',
    colorField: 'name',
    height: 220,
    innerRadius: 0.62,
    label: { text: 'value', position: 'spider' as const },
    legend: { color: { position: 'bottom' as const } },
  });

  const renderItemList = (items: PlatformDashboardItemRecord[], emptyText: string) => (
    <List
      className="dashboard-list"
      dataSource={items}
      locale={{ emptyText }}
      pagination={items.length > 4 ? { pageSize: 4, size: 'small' } : false}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key="detail" size="small" type="link" onClick={() => setDetail(item)}>详情</Button>,
            item.route ? <Button key="go" size="small" type="link" onClick={() => navigate(item.route || '/dashboard')}>进入</Button> : null,
          ]}
        >
          <List.Item.Meta
            title={(
              <div className="dashboard-list__title">
                <span>{item.title}</span>
                {renderStatus(item.status || item.priority)}
              </div>
            )}
            description={<span className="dashboard-list__meta">{itemMeta(item)}</span>}
          />
        </List.Item>
      )}
    />
  );

  return (
    <Spin spinning={isLoading}>
      <div className="dashboard-page">
        <PageBanner
          title="经营工作台"
          subtitle="登录后优先看到累计订单、实收营收、新增用户、状态分布、门店排行、告警和待办。"
          icon={<FundProjectionScreenOutlined />}
        />

        <Row gutter={[16, 16]} className="dashboard-kpi-row">
          {cards.map((item) => (
            <Col xs={24} sm={12} lg={8} xl={6} xxl={6} key={item.key}>
              <Card className="dashboard-kpi-card" hoverable={Boolean(item.route)} onClick={() => item.route && navigate(item.route)}>
                <div className="dashboard-kpi-card__head">
                  <span className="dashboard-kpi-card__icon">{cardIcon(item.key)}</span>
                  {renderStatus(item.status)}
                </div>
                <Statistic title={item.title} value={renderValue(item)} suffix={item.suffix} />
                <div className="dashboard-kpi-card__foot">点击查看相关业务</div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} className="dashboard-section-row">
          <Col xs={24} xl={16}>
            <Card title={<Space><LineChartOutlined />近 14 天趋势（订单 / 营收 / 新增用户）</Space>} className="dashboard-chart-card">
              {trendData.length ? <Line {...lineConfig} /> : <Empty description="暂无趋势数据" />}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title={<Space><RiseOutlined />门店营收排行</Space>} className="dashboard-chart-card">
              {storeRevenueRank.length ? <Column {...rankConfig} /> : <Empty description="暂无门店营收数据" />}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="dashboard-section-row">
          <Col xs={24} lg={8}>
            <Card title="订单状态分布" className="dashboard-chart-card dashboard-chart-card--compact">
              {orderDistribution.length ? <Pie {...pieConfig(orderDistribution)} /> : <Empty description="暂无订单状态数据" />}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="门店状态分布" className="dashboard-chart-card dashboard-chart-card--compact">
              {storeDistribution.length ? <Pie {...pieConfig(storeDistribution)} /> : <Empty description="暂无门店状态数据" />}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="结算状态分布" className="dashboard-chart-card dashboard-chart-card--compact">
              {settlementDistribution.length ? <Pie {...pieConfig(settlementDistribution)} /> : <Empty description="暂无结算状态数据" />}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="dashboard-section-row">
          <Col xs={24} xl={8}>
            <Card className="dashboard-list-card" title="统一待办" extra={<Button size="small" onClick={() => navigate('/merchant-console')}>待办中心 <RightOutlined /></Button>}>
              {renderItemList(todos, '暂无待办')}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card className="dashboard-list-card" title="异常提醒" extra={<Button size="small" onClick={() => navigate('/device-ops')}>设备运维 <RightOutlined /></Button>}>
              {renderItemList(alerts, '暂无异常')}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card className="dashboard-list-card" title="最近变更" extra={<Button size="small" onClick={() => navigate('/system/auth-audit')}>审计日志 <RightOutlined /></Button>}>
              {renderItemList(changes, '暂无变更')}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="dashboard-section-row">
          <Col xs={24} xl={16}>
            <Card title="关键入口" className="dashboard-entry-panel">
              <Row gutter={[12, 12]}>
                {quickEntries.map((item) => (
                  <Col xs={24} sm={12} xl={6} key={item.id}>
                    <Card className="dashboard-entry-card">
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space>
                          <SettingOutlined />
                          <strong>{item.title}</strong>
                          {renderStatus(item.priority)}
                        </Space>
                        <span>{[item.owner, item.bizNo].filter(Boolean).join(' / ')}</span>
                        <Button type="primary" block onClick={() => navigate(item.route || '/dashboard')}>进入处理</Button>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title={<Space><ShopOutlined />营收健康度</Space>} className="dashboard-health-card">
              {(storeRevenueRank.length ? storeRevenueRank : []).slice(0, 5).map((item) => (
                <div className="dashboard-health-item" key={item.name}>
                  <div className="dashboard-health-item__head">
                    <span>{item.name}</span>
                    <strong>{formatAmount(toNumber(item.revenue))}</strong>
                  </div>
                  <Progress percent={Math.round((toNumber(item.revenue) / maxRankRevenue) * 100)} showInfo={false} strokeColor="#0f766e" />
                </div>
              ))}
              {!storeRevenueRank.length ? <Empty description="暂无营收排行" /> : null}
            </Card>
          </Col>
        </Row>

        <BusinessDetailModal title="工作台事项详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
          {detail ? <SchemaDetail record={detail as unknown as Record<string, unknown>} fields={('key' in detail ? dashboardCardFields : dashboardItemFields) as unknown as DetailField<Record<string, unknown>>[]} /> : null}
        </BusinessDetailModal>
      </div>
    </Spin>
  );
};

export default Dashboard;
