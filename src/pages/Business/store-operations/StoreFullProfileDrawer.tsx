import React from 'react';
import { Descriptions, Drawer, Empty, Image, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  DeviceRecord,
  ServicePointRecord,
  StoreBusinessHoursRecord,
  StoreChangeLogRecord,
  StoreFullProfileRecord,
  StoreImageRecord,
  StoreServiceCapabilityRecord,
  StoreTempCloseRecord,
} from '@/services/backendService';
import { formatDateTime, formatEnumText } from '@/pages/Business/shared';

interface StoreFullProfileDrawerProps {
  open: boolean;
  loading?: boolean;
  profile?: StoreFullProfileRecord;
  onClose: () => void;
}

type ChangeDiffRow = {
  key: string;
  field: string;
  before: unknown;
  after: unknown;
};

const storeFieldLabelMap: Record<string, string> = {
  merchantId: '所属商户',
  storeName: '门店名称',
  storeCode: '门店编号',
  storePhone: '门店电话',
  managerName: '店长',
  managerPhone: '负责人电话',
  province: '省份',
  city: '城市',
  district: '区县',
  address: '详细地址',
  longitude: '经度',
  latitude: '纬度',
  businessHours: '营业时间',
  openTime: '开门时间',
  closeTime: '闭店时间',
  holidayHours: '节假日营业',
  serviceRadius: '服务半径',
  marketingEnabled: '营销开关',
  tempClosed: '临停状态',
  tempClosedReason: '临停原因',
  tempClosedUntil: '临停截止',
  intro: '门店介绍',
  coverUrl: '封面图',
  imageUrls: '图片集',
  status: '门店状态',
  notice: '公告',
};

const changeTypeMap: Record<string, string> = {
  STORE_CREATE: '门店创建',
  STORE_UPDATE: '门店主档修改',
  STORE_STATUS: '门店启停',
  STORE_DELETE: '门店删除',
  BUSINESS_HOURS_CREATE: '营业时间新增',
  BUSINESS_HOURS_UPDATE: '营业时间修改',
  BUSINESS_HOURS_DELETE: '营业时间删除',
  TEMP_CLOSE_CREATE: '临停新增',
  TEMP_CLOSE_UPDATE: '临停修改',
  TEMP_CLOSE_DELETE: '临停删除',
  CAPABILITY_CREATE: '能力新增',
  CAPABILITY_UPDATE: '能力修改',
  CAPABILITY_DELETE: '能力删除',
  IMAGE_CREATE: '图片新增',
  IMAGE_UPDATE: '图片修改',
  IMAGE_DELETE: '图片删除',
};

const parseJsonObject = (value?: string): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value };
  } catch {
    return { value };
  }
};

const formatDiffValue = (value: unknown, field?: string) => {
  if (value === undefined || value === null || value === '') return '-';
  if (field === 'marketingEnabled' || field === 'tempClosed') return Number(value) === 1 ? '是' : '否';
  if (field === 'status') return formatEnumText(String(value), 'storeStatus', '门店状态');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildDiffRows = (record: StoreChangeLogRecord): ChangeDiffRow[] => {
  const before = parseJsonObject(record.beforeValue);
  const after = parseJsonObject(record.afterValue);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys
    .filter((key) => formatDiffValue(before[key], key) !== formatDiffValue(after[key], key))
    .map((key) => ({
      key,
      field: storeFieldLabelMap[key] || key,
      before: before[key],
      after: after[key],
    }));
};

const formatMoney = (value?: number | string) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const ChangeDiffTable: React.FC<{ record: StoreChangeLogRecord }> = ({ record }) => {
  const rows = buildDiffRows(record);
  if (!rows.length) return <Typography.Text type="secondary">暂无字段差异</Typography.Text>;
  return (
    <Table<ChangeDiffRow>
      rowKey="key"
      size="small"
      pagination={false}
      columns={[
        { title: '字段', dataIndex: 'field', width: 160 },
        { title: '变更前', dataIndex: 'before', render: (value, row) => formatDiffValue(value, row.key) },
        { title: '变更后', dataIndex: 'after', render: (value, row) => formatDiffValue(value, row.key) },
      ]}
      dataSource={rows}
    />
  );
};

const StoreFullProfileDrawer: React.FC<StoreFullProfileDrawerProps> = ({ open, loading, profile, onClose }) => {
  const store = profile?.store;
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
    { title: '配置', dataIndex: 'configJson', ellipsis: true, render: (value) => value || '-' },
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

  const changeColumns: ColumnsType<StoreChangeLogRecord> = [
    { title: '变更时间', dataIndex: 'changedAt', width: 170, render: (value) => formatDateTime(value) },
    { title: '类型', dataIndex: 'changeType', width: 150, render: (value) => changeTypeMap[value] || value },
    { title: '操作人', dataIndex: 'operator', width: 100, render: (value) => value || '-' },
    { title: '字段数', width: 90, render: (_, record) => `${buildDiffRows(record).length} 项` },
    { title: '摘要', render: (_, record) => buildDiffRows(record).slice(0, 3).map((row) => `${row.field}: ${formatDiffValue(row.before, row.key)} → ${formatDiffValue(row.after, row.key)}`).join('；') || '-' },
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
                    <Descriptions.Item label="门店状态">{formatEnumText(store.status, 'storeStatus', '门店状态')}</Descriptions.Item>
                    <Descriptions.Item label="门店电话">{store.storePhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="负责人">{store.managerName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="负责人电话">{store.managerPhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="服务半径">{store.serviceRadius ? `${store.serviceRadius}km` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="城市">{[store.province, store.city, store.district].filter(Boolean).join(' / ') || '-'}</Descriptions.Item>
                    <Descriptions.Item label="详细地址">{store.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label="公告" span={2}>{store.notice || '-'}</Descriptions.Item>
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
            { key: 'capabilities', label: '服务能力', children: <Table rowKey="id" size="small" columns={capabilityColumns} dataSource={profile.capabilities || []} pagination={false} /> },
            { key: 'points', label: '点位', children: <Table rowKey="id" size="small" columns={pointColumns} dataSource={profile.servicePoints || []} pagination={false} /> },
            { key: 'devices', label: '设备', children: <Table rowKey="id" size="small" columns={deviceColumns} dataSource={profile.devices || []} pagination={false} /> },
            {
              key: 'changes',
              label: '变更轨迹',
              children: <Table rowKey="id" size="small" columns={changeColumns} dataSource={profile.changeLogs || []} expandable={{ expandedRowRender: (record) => <ChangeDiffTable record={record} /> }} pagination={{ pageSize: 8 }} />,
            },
          ]}
        />
      )}
    </Drawer>
  );
};

export default StoreFullProfileDrawer;
