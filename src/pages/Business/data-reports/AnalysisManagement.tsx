import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChartOutlined } from '@ant-design/icons';
import { Alert, Card, Col, Row, Table, Tabs } from 'antd';
import PageBanner from '@/components/PageBanner';
import { formatAmount, formatDateTime, formatEnumText } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type {
  DeviceRecord,
  MarketingParticipationRecord,
  PlatformDashboardCardRecord,
  PlatformDashboardChartPointRecord,
  PlatformDashboardRankItemRecord,
} from '@/services/backendService';

interface MarketingAnalysisRecord {
  key: string;
  activityCode: string;
  activityName: string;
  participationCount: number;
  qualifiedCount: number;
  pendingCount: number;
  conversionRate: number;
  latestJoinedAt?: string;
}

const abnormalDeviceStatuses = new Set(['OFFLINE', 'FAULT', 'MAINTENANCE', 'ABNORMAL', 'DISABLED']);

const aggregateMarketing = (records: MarketingParticipationRecord[]): MarketingAnalysisRecord[] => {
  const grouped = new Map<string, MarketingAnalysisRecord>();
  records.forEach((item) => {
    const key = item.activityCode || item.activityName || `activity-${item.id}`;
    const current = grouped.get(key) || {
      key,
      activityCode: item.activityCode || '-',
      activityName: item.activityName || item.activityCode || '未命名活动',
      participationCount: 0,
      qualifiedCount: 0,
      pendingCount: 0,
      conversionRate: 0,
      latestJoinedAt: undefined,
    };
    current.participationCount += 1;
    if (item.qualifyStatus === 'QUALIFIED') current.qualifiedCount += 1;
    if (item.qualifyStatus === 'PENDING') current.pendingCount += 1;
    if (item.joinedAt && (!current.latestJoinedAt || item.joinedAt > current.latestJoinedAt)) current.latestJoinedAt = item.joinedAt;
    grouped.set(key, current);
  });
  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      conversionRate: item.participationCount ? Number((item.qualifiedCount * 100 / item.participationCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.participationCount - a.participationCount);
};

const AnalysisManagement: React.FC = () => {
  const dashboardQuery = useQuery({
    queryKey: ['operatingAnalysisDashboard'],
    queryFn: async () => (await api.platformDashboard.overview()).data,
  });
  const participationQuery = useQuery({
    queryKey: ['operatingAnalysisParticipations'],
    queryFn: async () => (await api.marketing.participations.page({ pageNum: 1, pageSize: 1000 })).data,
  });
  const deviceQuery = useQuery({
    queryKey: ['operatingAnalysisDevices'],
    queryFn: async () => (await api.device.page({ pageNum: 1, pageSize: 1000 })).data,
  });

  const dashboard = dashboardQuery.data;
  const cards = (dashboard?.cards || []).filter((item) => ['merchant', 'order', 'revenue', 'alarm'].includes(item.key));
  const trend = (dashboard?.trend || []) as PlatformDashboardChartPointRecord[];
  const storeRanking = (dashboard?.storeRevenueRank || []) as PlatformDashboardRankItemRecord[];
  const marketing = useMemo(() => aggregateMarketing(participationQuery.data?.records || []), [participationQuery.data]);
  const abnormalDevices = useMemo(
    () => (deviceQuery.data?.records || []).filter((item) => abnormalDeviceStatuses.has(String(item.status || '').toUpperCase())),
    [deviceQuery.data],
  );
  const hasError = dashboardQuery.isError || participationQuery.isError || deviceQuery.isError;

  const cardValue = (item: PlatformDashboardCardRecord) => item.key === 'revenue'
    ? formatAmount(item.value)
    : `${item.value}${item.suffix ? ` ${item.suffix}` : ''}`;

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="经营分析" subtitle="订单、营收、门店、营销参与和设备异常均来自实时业务数据。" icon={<BarChartOutlined />} />
      {hasError ? <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="部分经营数据加载失败，请刷新后重试" /> : null}

      <Row gutter={[16, 16]}>
        {cards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.key}>
            <Card loading={dashboardQuery.isLoading}>
              <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}>{item.title}</div>
              <div style={{ marginTop: 8, fontSize: 26, fontWeight: 600 }}>{cardValue(item)}</div>
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>累计业务数据</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'trend',
            label: '近14日趋势',
            children: (
              <Card>
                <Table<PlatformDashboardChartPointRecord>
                  rowKey="date"
                  loading={dashboardQuery.isLoading}
                  dataSource={trend}
                  pagination={false}
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 140 },
                    { title: '订单数', dataIndex: 'orders', width: 140, render: (value) => `${Number(value || 0)} 单` },
                    { title: '实收金额', dataIndex: 'revenue', width: 160, render: (value) => formatAmount(value) },
                    { title: '新增用户', dataIndex: 'users', width: 140, render: (value) => `${Number(value || 0)} 人` },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'store',
            label: '门店排行',
            children: (
              <Card>
                <Table<PlatformDashboardRankItemRecord>
                  rowKey="name"
                  loading={dashboardQuery.isLoading}
                  dataSource={storeRanking}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '门店', dataIndex: 'name' },
                    { title: '订单数', dataIndex: 'orders', width: 140, render: (value) => `${Number(value || 0)} 单` },
                    { title: '实收金额', dataIndex: 'revenue', width: 160, render: (value) => formatAmount(value) },
                    { title: '门店状态', dataIndex: 'status', width: 140, render: (value) => formatEnumText(value, 'storeStatus', '门店状态') },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'marketing',
            label: '营销参与',
            children: (
              <Card>
                <Table<MarketingAnalysisRecord>
                  rowKey="key"
                  loading={participationQuery.isLoading}
                  dataSource={marketing}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '活动', dataIndex: 'activityName' },
                    { title: '活动编码', dataIndex: 'activityCode', width: 170 },
                    { title: '参与人数', dataIndex: 'participationCount', width: 120 },
                    { title: '已达标', dataIndex: 'qualifiedCount', width: 110 },
                    { title: '待判定', dataIndex: 'pendingCount', width: 110 },
                    { title: '达标率', dataIndex: 'conversionRate', width: 110, render: (value) => `${Number(value || 0)}%` },
                    { title: '最近参与', dataIndex: 'latestJoinedAt', width: 180, render: (value) => formatDateTime(value) },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'device',
            label: `设备异常 (${abnormalDevices.length})`,
            children: (
              <Card>
                <Table<DeviceRecord>
                  rowKey="id"
                  loading={deviceQuery.isLoading}
                  dataSource={abnormalDevices}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '设备', dataIndex: 'deviceName' },
                    { title: '设备编号', dataIndex: 'deviceCode', width: 170 },
                    { title: '门店', dataIndex: 'storeName', width: 180, render: (value) => value || '-' },
                    { title: '工位', dataIndex: 'pointCode', width: 120, render: (value) => value || '-' },
                    { title: '状态', dataIndex: 'status', width: 120, render: (value) => formatEnumText(value, 'deviceStatus', '设备状态') },
                    { title: '最后心跳', dataIndex: 'lastHeartbeatAt', width: 180, render: (value) => formatDateTime(value) },
                    { title: '厂商', dataIndex: 'vendorName', width: 140, render: (value) => value || '-' },
                  ]}
                  scroll={{ x: 1120 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AnalysisManagement;
