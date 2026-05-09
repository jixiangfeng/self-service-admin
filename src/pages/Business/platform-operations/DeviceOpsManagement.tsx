import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deviceCommandStatusOptions,
  deviceFaultLevelOptions,
  deviceStatusOptions,
  maintainStatusOptions,
  publishStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type DeviceCommandLogRecord,
  type DeviceCommandRecord,
  type DeviceFaultRecord,
  type DeviceHeartbeatRecord,
  type DeviceMaintenanceRecord,
  type DeviceSparePartRecord,
} from '@/services/backendService';

const commandStatusMap = buildValueEnum(deviceCommandStatusOptions);
const deviceStatusMap = buildValueEnum(deviceStatusOptions);
const faultLevelMap = buildValueEnum(deviceFaultLevelOptions);
const maintainStatusMap = buildValueEnum(maintainStatusOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);

const deviceOpsDetailFields: Record<'command' | 'log' | 'fault' | 'heartbeat' | 'maintenance' | 'part', DetailField<any>[]> = {
  command: [
    { name: 'commandNo', label: '指令编号' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'commandType', label: '指令类型' },
    { name: 'commandPayload', label: '指令内容' },
    { name: 'status', label: '状态' },
    { name: 'ackAt', label: '回执时间', render: (value) => formatDateTime(value) },
  ],
  log: [
    { name: 'commandNo', label: '指令编号' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'requestPayload', label: '请求报文' },
    { name: 'responsePayload', label: '回执报文' },
    { name: 'retryCount', label: '重试次数' },
    { name: 'loggedAt', label: '记录时间', render: (value) => formatDateTime(value) },
  ],
  fault: [
    { name: 'faultNo', label: '故障单号' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'storeName', label: '门店' },
    { name: 'faultType', label: '故障类型' },
    { name: 'level', label: '等级' },
    { name: 'relatedOrderNo', label: '关联订单' },
    { name: 'status', label: '状态' },
    { name: 'reportedAt', label: '上报时间', render: (value) => formatDateTime(value) },
  ],
  heartbeat: [
    { name: 'deviceCode', label: '设备编号' },
    { name: 'storeName', label: '门店' },
    { name: 'signalStatus', label: '信号状态' },
    { name: 'payload', label: '心跳内容' },
    { name: 'heartbeatAt', label: '心跳时间', render: (value) => formatDateTime(value) },
  ],
  maintenance: [
    { name: 'maintainNo', label: '保养单号' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'maintainType', label: '保养类型' },
    { name: 'owner', label: '负责人' },
    { name: 'status', label: '状态' },
    { name: 'plannedAt', label: '计划时间', render: (value) => formatDateTime(value) },
  ],
  part: [
    { name: 'partCode', label: '备件编码' },
    { name: 'partName', label: '备件名称' },
    { name: 'deviceModel', label: '适用型号' },
    { name: 'stockQty', label: '库存' },
    { name: 'warningQty', label: '预警库存' },
    { name: 'status', label: '状态' },
  ],
};

const DeviceOpsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DeviceCommandRecord | DeviceCommandLogRecord | DeviceFaultRecord | DeviceHeartbeatRecord | DeviceMaintenanceRecord | DeviceSparePartRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const commandsQuery = useQuery({ queryKey: ['device-commands', queryParams], queryFn: () => api.deviceOps.commands.page(queryParams) });
  const commandLogsQuery = useQuery({ queryKey: ['device-command-logs', queryParams], queryFn: () => api.deviceOps.commandLogs.page(queryParams) });
  const faultsQuery = useQuery({ queryKey: ['device-faults', queryParams], queryFn: () => api.deviceOps.faults.page(queryParams) });
  const heartbeatsQuery = useQuery({ queryKey: ['device-heartbeats', queryParams], queryFn: () => api.deviceOps.heartbeats.page(queryParams) });
  const maintenancesQuery = useQuery({ queryKey: ['device-maintenances', queryParams], queryFn: () => api.deviceOps.maintenances.page(queryParams) });
  const sparePartsQuery = useQuery({ queryKey: ['device-spare-parts', queryParams], queryFn: () => api.deviceOps.spareParts.page(queryParams) });

  const commands = commandsQuery.data?.data.records ?? [];
  const commandLogs = commandLogsQuery.data?.data.records ?? [];
  const faults = faultsQuery.data?.data.records ?? [];
  const heartbeats = heartbeatsQuery.data?.data.records ?? [];
  const maintenances = maintenancesQuery.data?.data.records ?? [];
  const spareParts = sparePartsQuery.data?.data.records ?? [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const commandColumns = useMemo<ProColumns<DeviceCommandRecord>[]>(() => [
    { title: '指令编号', dataIndex: 'commandNo', width: 180 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '指令类型', dataIndex: 'commandType', width: 140 },
    { title: '指令内容', dataIndex: 'commandPayload', width: 220 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, commandStatusMap) },
    { title: '回执时间', dataIndex: 'ackAt', width: 180, render: (_, record) => formatDateTime(record.ackAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const commandLogColumns = useMemo<ProColumns<DeviceCommandLogRecord>[]>(() => [
    { title: '指令编号', dataIndex: 'commandNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '请求报文', dataIndex: 'requestPayload', width: 220 },
    { title: '回执报文', dataIndex: 'responsePayload', width: 220 },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '记录时间', dataIndex: 'loggedAt', width: 180, render: (_, record) => formatDateTime(record.loggedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const faultColumns = useMemo<ProColumns<DeviceFaultRecord>[]>(() => [
    { title: '故障单号', dataIndex: 'faultNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '故障类型', dataIndex: 'faultType', width: 130 },
    { title: '等级', dataIndex: 'level', width: 100, render: (_, record) => renderStatusTag(record.level, faultLevelMap) },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, maintainStatusMap) },
    { title: '上报时间', dataIndex: 'reportedAt', width: 180, render: (_, record) => formatDateTime(record.reportedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const heartbeatColumns = useMemo<ProColumns<DeviceHeartbeatRecord>[]>(() => [
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '信号状态', dataIndex: 'signalStatus', width: 120, render: (_, record) => renderStatusTag(record.signalStatus, deviceStatusMap) },
    { title: '心跳内容', dataIndex: 'payload', width: 260 },
    { title: '心跳时间', dataIndex: 'heartbeatAt', width: 180, render: (_, record) => formatDateTime(record.heartbeatAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const maintenanceColumns = useMemo<ProColumns<DeviceMaintenanceRecord>[]>(() => [
    { title: '保养单号', dataIndex: 'maintainNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '保养类型', dataIndex: 'maintainType', width: 130 },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, maintainStatusMap) },
    { title: '计划时间', dataIndex: 'plannedAt', width: 180, render: (_, record) => formatDateTime(record.plannedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const sparePartColumns = useMemo<ProColumns<DeviceSparePartRecord>[]>(() => [
    { title: '备件编码', dataIndex: 'partCode', width: 160 },
    { title: '备件名称', dataIndex: 'partName', width: 160 },
    { title: '适用型号', dataIndex: 'deviceModel', width: 180 },
    { title: '库存', dataIndex: 'stockQty', width: 90 },
    { title: '预警库存', dataIndex: 'warningQty', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="设备履约运维" subtitle="维护设备指令、回执日志、故障记录、心跳日志、保养任务和备件库存。" icon={<ThunderboltOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待回执指令" value={commands.filter((item) => ['PENDING', 'SENT'].includes(item.status ?? '')).length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="指令日志" value={commandLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="故障中" value={faults.filter((item) => item.status !== 'DONE').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="离线设备" value={heartbeats.filter((item) => item.signalStatus === 'OFFLINE').length} suffix="台" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待保养" value={maintenances.filter((item) => item.status === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="低库存备件" value={spareParts.filter((item) => Number(item.stockQty ?? 0) <= Number(item.warningQty ?? 0)).length} suffix="种" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入订单、设备、指令、故障、备件关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'command', label: '设备指令', children: <ProTable<DeviceCommandRecord> cardBordered rowKey="id" columns={commandColumns} dataSource={commands} loading={commandsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重发设备指令')}>重发指令</Button>]} /> },
          { key: 'commandLog', label: '回执日志', children: <ProTable<DeviceCommandLogRecord> cardBordered rowKey="id" columns={commandLogColumns} dataSource={commandLogs} loading={commandLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'fault', label: '故障记录', children: <ProTable<DeviceFaultRecord> cardBordered rowKey="id" columns={faultColumns} dataSource={faults} loading={faultsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="assign" type="primary" onClick={() => openModal('分派故障处理')}>分派处理</Button>]} /> },
          { key: 'heartbeat', label: '心跳日志', children: <ProTable<DeviceHeartbeatRecord> cardBordered rowKey="id" columns={heartbeatColumns} dataSource={heartbeats} loading={heartbeatsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'maintenance', label: '保养任务', children: <ProTable<DeviceMaintenanceRecord> cardBordered rowKey="id" columns={maintenanceColumns} dataSource={maintenances} loading={maintenancesQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建保养任务')}>新建保养</Button>]} /> },
          { key: 'sparePart', label: '备件库存', children: <ProTable<DeviceSparePartRecord> cardBordered rowKey="id" columns={sparePartColumns} dataSource={spareParts} loading={sparePartsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增备件')}>新增备件</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('requestPayload' in detail ? deviceOpsDetailFields.log : 'faultNo' in detail ? deviceOpsDetailFields.fault : 'heartbeatAt' in detail ? deviceOpsDetailFields.heartbeat : 'maintainNo' in detail ? deviceOpsDetailFields.maintenance : 'partCode' in detail ? deviceOpsDetailFields.part : deviceOpsDetailFields.command) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle === '重发设备指令') {
            await api.deviceOps.commands.add({ commandNo: values.bizNo, deviceCode: values.bizNo, commandType: '重发指令', status: values.status || 'SENT', remark: values.remark });
            await queryClient.invalidateQueries({ queryKey: ['device-commands'] });
          } else if (modalTitle === '分派故障处理') {
            await api.deviceOps.faults.add({ faultNo: values.bizNo, deviceCode: values.bizNo, faultType: '人工分派', status: values.status || 'PROCESSING', remark: values.remark });
            await queryClient.invalidateQueries({ queryKey: ['device-faults'] });
          } else if (modalTitle === '新建保养任务') {
            await api.deviceOps.maintenances.add({ maintainNo: values.bizNo, deviceCode: values.bizNo, maintainType: '人工保养', status: values.status || 'PENDING', remark: values.remark });
            await queryClient.invalidateQueries({ queryKey: ['device-maintenances'] });
          } else if (modalTitle === '新增备件') {
            await api.deviceOps.spareParts.add({ partCode: values.bizNo, partName: values.bizNo, status: values.status || 'PENDING' });
            await queryClient.invalidateQueries({ queryKey: ['device-spare-parts'] });
          }
          setModalVisible(false);
          message.success('已保存到后端');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="设备编号 / 指令号 / 故障单号" rules={[{ required: true, message: '请输入设备编号、指令号或故障单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="处理状态"><Select options={maintainStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceOpsManagement;
