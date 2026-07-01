import React from 'react';
import { Descriptions, Drawer, Empty, Image, Space, Statistic, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  DeviceRecord,
  ServicePointRecord,
  StoreBusinessHoursRecord,
  StoreFullProfileRecord,
  StoreImageRecord,
  StoreServiceCapabilityRecord,
  StoreTempCloseRecord,
} from '@/services/backendService';
import { formatDateTime, formatEnumText, safeJsonParse } from '@/pages/Business/shared';

interface StoreFullProfileDrawerProps {
  open: boolean;
  loading?: boolean;
  profile?: StoreFullProfileRecord;
  onClose: () => void;
}

const formatMoney = (value?: number | string) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const capabilityLimitOptions = [
  { value: 'ALL_DAY', label: '全天开放' },
  { value: 'BUSINESS_HOURS', label: '营业时间内开放' },
  { value: 'APPOINTMENT_ONLY', label: '仅预约可用' },
];

const capabilityPointOptions = [
  { value: 'ALL_POINTS', label: '全部点位' },
  { value: 'CAR_WASH_ONLY', label: '洗车点位' },
  { value: 'RETAIL_ONLY', label: '零售点位' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const parseCapabilityConfig = (configJson?: string) =>
  safeJsonParse<{ limitMode?: string; pointScope?: string; extraLimit?: string }>(configJson, {});

const StoreFullProfileDrawer: React.FC<StoreFullProfileDrawerProps> = ({ open, loading, profile, onClose }) => {
  const store = profile?.store;
  const capabilities = (profile?.capabilities || []).map((record) => ({ ...record, ...parseCapabilityConfig(record.configJson) }));
  const risks = (profile?.operationWarnings && profile.operationWarnings.length ? profile.operationWarnings : [
    !store?.address ? '未配置详细地址' : null,
    !(profile?.businessHours || []).some((item) => item.status === 'PUBLISHED') ? '暂无已发布营业时间' : null,
    !(profile?.images || []).some((item) => item.status === 'PUBLISHED') ? '暂无已发布门店图片' : null,
    (profile?.servicePointCount || 0) === 0 ? '尚未配置服务点位' : null,
    (profile?.onlineDeviceCount || 0) === 0 ? '暂无在线设备' : null,
    (profile?.processingTempCloseCount || 0) > 0 ? `当前有 ${profile?.processingTempCloseCount} 条临停进行中` : null,
  ].filter(Boolean)) as string[];

  const imageColumns: ColumnsType<StoreImageRecord> = [
    { title: '类型', dataIndex: 'imageType', width: 110, render: (value) => formatEnumText(value, 'imageType', '图片类型') },
    { title: '图片', dataIndex: 'imageUrl', width: 140, render: (value) => value ? <Image src={value} width={72} height={48} style={{ objectFit: 'cover' }} /> : '-' },
    { title: '排序', dataIndex: 'sortNo', width: 80 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value) => formatEnumText(value, 'status', '状态') },
  ];

  const hoursColumns: ColumnsType<StoreBusinessHoursRecord> = [
    { title: '星期', dataIndex: 'weekday' },
    { title: '开门', dataIndex: 'openTime' },
    { title: '闭店', dataIndex: 'closeTime' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
  ];

  const tempCloseColumns: ColumnsType<StoreTempCloseRecord> = [
    { title: '原因', dataIndex: 'closeReason' },
    { title: '开始', dataIndex: 'startAt', render: (value) => formatDateTime(value) },
    { title: '结束', dataIndex: 'endAt', render: (value) => formatDateTime(value) },
    { title: '操作人', dataIndex: 'operator', render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
  ];

  const capabilityColumns: ColumnsType<StoreServiceCapabilityRecord> = [
    { title: '能力', dataIndex: 'capabilityCode', render: (value) => formatEnumText(value, 'capabilityCode', '能力') },
    { title: '开放限制', dataIndex: 'limitMode', render: (_, record) => optionLabel(capabilityLimitOptions, record.limitMode) || '-' },
    { title: '适用点位', dataIndex: 'pointScope', render: (_, record) => optionLabel(capabilityPointOptions, record.pointScope) || '-' },
    { title: '补充限制', dataIndex: 'extraLimit', render: (_, record) => record.extraLimit || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
  ];

  const pointColumns: ColumnsType<ServicePointRecord> = [
    { title: '点位编号', dataIndex: 'pointCode' },
    { title: '点位名称', dataIndex: 'pointName', render: (value) => value || '-' },
    { title: '类型', dataIndex: 'pointType', render: (value) => formatEnumText(value, 'pointType', '点位类型') },
    { title: '设备数', dataIndex: 'deviceCount', render: (value) => value ?? '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
  ];

  const deviceColumns: ColumnsType<DeviceRecord> = [
    { title: '设备编号', dataIndex: 'deviceCode' },
    { title: '设备名称', dataIndex: 'deviceName' },
    { title: '类型', dataIndex: 'deviceType', render: (value) => formatEnumText(value, 'deviceType', '设备类型') },
    { title: '点位', dataIndex: 'pointCode', render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '心跳', dataIndex: 'lastHeartbeatAt', render: (value) => formatDateTime(value) },
  ];

  return (
    <Drawer title={store ? `门店完整档案 · ${store.storeName}` : '门店完整档案'} open={open} onClose={onClose} width={1160} destroyOnClose>
      {!profile || !store ? (
        <Empty description={loading ? '正在加载门店档案...' : '暂无门店档案'} />
      ) : (
        <Tabs
          items={[
            {
              key: 'overview',
              label: '总览',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space wrap size="large">
                    <Statistic title="图片" value={profile.imageCount || 0} />
                    <Statistic title="营业时段" value={profile.businessHourCount || 0} />
                    <Statistic title="临停中" value={profile.processingTempCloseCount || 0} />
                    <Statistic title="服务能力" value={profile.publishedCapabilityCount || 0} />
                    <Statistic title="点位" value={profile.servicePointCount || 0} />
                    <Statistic title="在线设备" value={profile.onlineDeviceCount || 0} />
                    <Statistic title="离线设备" value={profile.offlineDeviceCount || 0} />
                    <Statistic title="故障设备" value={profile.faultDeviceCount || 0} />
                    <Statistic title="今日订单" value={profile.todayOrderCount || 0} />
                    <Statistic title="进行中订单" value={profile.processingOrderCount || 0} />
                    <Statistic title="今日实收" value={formatMoney(profile.todayPayAmount)} prefix="￥" />
                    <Statistic title="累计实收" value={formatMoney(profile.totalPayAmount)} prefix="￥" />
                    <Statistic title="今日核销" value={profile.todayWriteOffCount || 0} />
                  </Space>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="门店编号">{store.storeCode}</Descriptions.Item>
                    <Descriptions.Item label="所属商户">{store.merchantName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="门店状态">{formatEnumText(store.status, 'storeStatus', '门店状态')}</Descriptions.Item>
                    <Descriptions.Item label="门店电话">{store.storePhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="负责人">{store.managerName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="负责人电话">{store.managerPhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="城市">{[store.province, store.city, store.district].filter(Boolean).join(' / ') || '-'}</Descriptions.Item>
                    <Descriptions.Item label="详细地址">{store.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label="经度">{store.longitude ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="纬度">{store.latitude ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="今日核销金额">￥{formatMoney(profile.todayWriteOffAmount)}</Descriptions.Item>
                    <Descriptions.Item label="累计完成订单">{profile.completedOrderCount || 0}</Descriptions.Item>
                    <Descriptions.Item label="介绍" span={2}>{store.intro || '-'}</Descriptions.Item>
                  </Descriptions>
                  <Space wrap>
                    {risks.length ? risks.map((risk) => <Tag key={risk} color="warning">{risk}</Tag>) : <Tag color="success">上线资料完整</Tag>}
                  </Space>
                </Space>
              ),
            },
            { key: 'images', label: '图片', children: <Table rowKey="id" size="small" columns={imageColumns} dataSource={profile.images || []} pagination={false} /> },
            { key: 'hours', label: '营业时间', children: <Table rowKey="id" size="small" columns={hoursColumns} dataSource={profile.businessHours || []} pagination={false} /> },
            { key: 'tempClose', label: '临停', children: <Table rowKey="id" size="small" columns={tempCloseColumns} dataSource={profile.tempCloseRecords || []} pagination={false} /> },
            { key: 'capabilities', label: '服务能力', children: <Table rowKey="id" size="small" columns={capabilityColumns} dataSource={capabilities} pagination={false} /> },
            { key: 'points', label: '点位', children: <Table rowKey="id" size="small" columns={pointColumns} dataSource={profile.servicePoints || []} pagination={false} /> },
            { key: 'devices', label: '设备', children: <Table rowKey="id" size="small" columns={deviceColumns} dataSource={profile.devices || []} pagination={false} /> },
          ]}
        />
      )}
    </Drawer>
  );
};

export default StoreFullProfileDrawer;
