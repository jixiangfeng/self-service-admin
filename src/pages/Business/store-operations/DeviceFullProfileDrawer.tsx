import React from 'react';
import { Descriptions, Drawer, Empty, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  DeviceBindLogRecord,
  DeviceCommandLogRecord,
  DeviceCommandRecord,
  DeviceFaultRecord,
  DeviceFullProfileRecord,
  DeviceHeartbeatRecord,
  DeviceMaintenanceRecord,
} from '@/services/backendService';
import { formatDateTime, formatEnumText } from '@/pages/Business/shared';

interface DeviceFullProfileDrawerProps {
  open: boolean;
  loading?: boolean;
  profile?: DeviceFullProfileRecord;
  onClose: () => void;
}

const jsonSummary = (value?: string) => {
  if (!value) return '-';
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
};

const healthStatusMap: Record<string, { text: string; color: string }> = {
  HEALTHY: { text: '健康', color: 'success' },
  ATTENTION: { text: '需关注', color: 'warning' },
  RISK: { text: '风险', color: 'error' },
};

const formatOfflineMinutes = (value?: number) => {
  if (value === undefined || value === null) return '-';
  if (value < 60) return `${value} 分钟`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours} 小时${minutes ? ` ${minutes} 分钟` : ''}`;
};

const DeviceFullProfileDrawer: React.FC<DeviceFullProfileDrawerProps> = ({ open, loading, profile, onClose }) => {
  const device = profile?.device;
  const health = profile?.healthStatus ? healthStatusMap[profile.healthStatus] : undefined;
  const risks = (profile?.operationWarnings && profile.operationWarnings.length ? profile.operationWarnings : [
    !device?.storeId ? '未绑定门店' : null,
    !device?.servicePointId ? '未绑定点位' : null,
    !profile?.latestHeartbeatAt ? '暂无心跳记录' : null,
    (profile?.openFaultCount || 0) > 0 ? `存在 ${profile?.openFaultCount} 条未关闭故障` : null,
    (profile?.pendingCommandCount || 0) > 0 ? `存在 ${profile?.pendingCommandCount} 条待完成指令` : null,
    (profile?.pendingMaintenanceCount || 0) > 0 ? `存在 ${profile?.pendingMaintenanceCount} 条待处理维护` : null,
  ].filter(Boolean)) as string[];

  const bindColumns: ColumnsType<DeviceBindLogRecord> = [
    { title: '绑定单号', dataIndex: 'bindNo', width: 160 },
    { title: '原门店', dataIndex: 'beforeStore', render: (value) => value || '-' },
    { title: '新门店', dataIndex: 'afterStore', render: (value) => value || '-' },
    { title: '原点位', dataIndex: 'beforePoint', render: (value) => value || '-' },
    { title: '新点位', dataIndex: 'afterPoint', render: (value) => value || '-' },
    { title: '绑定时间', dataIndex: 'boundAt', render: (value) => formatDateTime(value) },
  ];

  const commandColumns: ColumnsType<DeviceCommandRecord> = [
    { title: '指令编号', dataIndex: 'commandNo', width: 170 },
    { title: '订单号', dataIndex: 'serviceOrderNo', render: (value) => value || '-' },
    { title: '类型', dataIndex: 'commandType', render: (value) => formatEnumText(value, 'commandType', '指令类型') },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'commandStatus', '指令状态') },
    { title: '确认时间', dataIndex: 'ackAt', render: (value) => formatDateTime(value) },
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
  ];

  const commandLogColumns: ColumnsType<DeviceCommandLogRecord> = [
    { title: '指令编号', dataIndex: 'commandNo', width: 170 },
    { title: '重试次数', dataIndex: 'retryCount', width: 100, render: (value) => value ?? 0 },
    { title: '请求', dataIndex: 'requestPayload', ellipsis: true, render: jsonSummary },
    { title: '响应', dataIndex: 'responsePayload', ellipsis: true, render: jsonSummary },
    { title: '记录时间', dataIndex: 'loggedAt', render: (value) => formatDateTime(value) },
  ];

  const faultColumns: ColumnsType<DeviceFaultRecord> = [
    { title: '故障编号', dataIndex: 'faultNo', width: 160 },
    { title: '故障类型', dataIndex: 'faultType', render: (value) => formatEnumText(value, 'faultType', '故障类型') },
    { title: '级别', dataIndex: 'level', render: (value) => formatEnumText(value, 'faultLevel', '故障级别') },
    { title: '关联订单', dataIndex: 'relatedOrderNo', render: (value) => value || '-' },
    { title: '负责人', dataIndex: 'owner', render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '上报时间', dataIndex: 'reportedAt', render: (value) => formatDateTime(value) },
  ];

  const heartbeatColumns: ColumnsType<DeviceHeartbeatRecord> = [
    { title: '信号状态', dataIndex: 'signalStatus', render: (value) => formatEnumText(value, 'signalStatus', '信号状态') },
    { title: '载荷', dataIndex: 'payload', ellipsis: true, render: jsonSummary },
    { title: '心跳时间', dataIndex: 'heartbeatAt', render: (value) => formatDateTime(value) },
  ];

  const maintenanceColumns: ColumnsType<DeviceMaintenanceRecord> = [
    { title: '维护单号', dataIndex: 'maintainNo', width: 160 },
    { title: '类型', dataIndex: 'maintainType', render: (value) => formatEnumText(value, 'maintainType', '维护类型') },
    { title: '负责人', dataIndex: 'owner', render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '计划时间', dataIndex: 'plannedAt', render: (value) => formatDateTime(value) },
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
  ];

  return (
    <Drawer title={device ? `设备完整档案 · ${device.deviceName}` : '设备完整档案'} open={open} onClose={onClose} width={1160} destroyOnClose>
      {!profile || !device ? (
        <Empty description={loading ? '正在加载设备档案...' : '暂无设备档案'} />
      ) : (
        <Tabs
          items={[
            {
              key: 'overview',
              label: '总览',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space wrap size="large">
                    <Statistic title="绑定记录" value={profile.bindLogCount || 0} />
                    <Statistic title="指令" value={profile.commandCount || 0} />
                    <Statistic title="待完成指令" value={profile.pendingCommandCount || 0} />
                    <Statistic title="故障" value={profile.faultCount || 0} />
                    <Statistic title="未关闭故障" value={profile.openFaultCount || 0} />
                    <Statistic title="心跳" value={profile.heartbeatCount || 0} />
                    <Statistic title="维护" value={profile.maintenanceCount || 0} />
                    <Statistic title="离线时长" value={formatOfflineMinutes(profile.offlineMinutes)} />
                  </Space>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="设备编号">{device.deviceCode}</Descriptions.Item>
                    <Descriptions.Item label="健康状态">{health ? <Tag color={health.color}>{health.text}</Tag> : '-'}</Descriptions.Item>
                    <Descriptions.Item label="设备状态">{formatEnumText(device.status, 'deviceStatus', '设备状态')}</Descriptions.Item>
                    <Descriptions.Item label="设备类型">{formatEnumText(device.deviceType, 'deviceType', '设备类型')}</Descriptions.Item>
                    <Descriptions.Item label="厂商">{device.vendorName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="门店">{profile.store?.storeName || device.storeName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="点位">{profile.servicePoint?.pointCode || device.pointCode || '-'}</Descriptions.Item>
                    <Descriptions.Item label="故障级别">{formatEnumText(device.faultLevel, 'faultLevel', '故障级别')}</Descriptions.Item>
                    <Descriptions.Item label="信号强度">{device.signalStrength != null ? `${device.signalStrength}%` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="最近心跳">{formatDateTime(profile.latestHeartbeatAt || device.lastHeartbeatAt)}</Descriptions.Item>
                    <Descriptions.Item label="安装时间">{formatDateTime(device.installTime)}</Descriptions.Item>
                    <Descriptions.Item label="能力标签" span={2}>{device.abilityTags || '-'}</Descriptions.Item>
                  </Descriptions>
                  <Space wrap>{risks.length ? risks.map((risk) => <Tag key={risk} color="warning">{risk}</Tag>) : <Tag color="success">设备运行上下文完整</Tag>}</Space>
                  <Typography.Text type="secondary">运行轨迹聚合最近 50 条绑定、指令、回执、故障、心跳和维护记录。</Typography.Text>
                </Space>
              ),
            },
            { key: 'bind', label: '绑定轨迹', children: <Table rowKey="id" size="small" columns={bindColumns} dataSource={profile.bindLogs || []} pagination={{ pageSize: 8 }} /> },
            { key: 'commands', label: '指令', children: <Table rowKey="id" size="small" columns={commandColumns} dataSource={profile.commands || []} pagination={{ pageSize: 8 }} /> },
            { key: 'logs', label: '回执日志', children: <Table rowKey="id" size="small" columns={commandLogColumns} dataSource={profile.commandLogs || []} pagination={{ pageSize: 8 }} /> },
            { key: 'faults', label: '故障', children: <Table rowKey="id" size="small" columns={faultColumns} dataSource={profile.faults || []} pagination={{ pageSize: 8 }} /> },
            { key: 'heartbeats', label: '心跳', children: <Table rowKey="id" size="small" columns={heartbeatColumns} dataSource={profile.heartbeats || []} pagination={{ pageSize: 8 }} /> },
            { key: 'maintenances', label: '维护', children: <Table rowKey="id" size="small" columns={maintenanceColumns} dataSource={profile.maintenances || []} pagination={{ pageSize: 8 }} /> },
          ]}
        />
      )}
    </Drawer>
  );
};

export default DeviceFullProfileDrawer;
