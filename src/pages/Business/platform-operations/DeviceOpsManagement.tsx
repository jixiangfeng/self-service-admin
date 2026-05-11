import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { SettingOutlined, ToolOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue } from '@/utils/formControls';
import api, {
  type DeviceCommandLogRecord,
  type DeviceCommandRecord,
  type DeviceFaultRecord,
  type DeviceHeartbeatRecord,
  type DeviceMaintenanceRecord,
  type DeviceSparePartRecord,
} from '@/services/backendService';


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};


const commandStatusMap = buildValueEnum(deviceCommandStatusOptions);
const deviceStatusMap = buildValueEnum(deviceStatusOptions);
const faultLevelMap = buildValueEnum(deviceFaultLevelOptions);
const maintainStatusMap = buildValueEnum(maintainStatusOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const deviceActionOptions = [
  { value: 'RETRY_COMMAND', label: '重发指令' },
  { value: 'ASSIGN_FAULT', label: '分派故障' },
  { value: 'CREATE_MAINTAIN', label: '新建保养' },
  { value: 'ADD_PART', label: '新增备件' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

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
  const [form] = Form.useForm<{ bizNo: string; status: string; deviceCode?: string; owner?: string; action?: string; faultLevel?: string; plannedAt?: string; partName?: string; stockQty?: number; warningQty?: number; supplement?: string }>();

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
    form.setFieldsValue({
      action: title === '重发设备指令' ? 'RETRY_COMMAND' : title === '分派故障处理' ? 'ASSIGN_FAULT' : title === '新建保养任务' ? 'CREATE_MAINTAIN' : 'ADD_PART',
      status: 'PENDING',
      faultLevel: 'MEDIUM',
    });
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入订单、设备、指令、故障、备件关键词"
        onSearch={setKeyword}
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

      <BusinessDetailModal title="设备运维详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('requestPayload' in detail ? deviceOpsDetailFields.log : 'faultNo' in detail ? deviceOpsDetailFields.fault : 'heartbeatAt' in detail ? deviceOpsDetailFields.heartbeat : 'maintainNo' in detail ? deviceOpsDetailFields.maintenance : 'partCode' in detail ? deviceOpsDetailFields.part : deviceOpsDetailFields.command) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="设备运维处理"
        title={modalTitle}
        subtitle="把设备指令、故障分派、保养和备件维护拆成结构化字段，提交时生成处理说明。"
        meta={[modalTitle || '设备运维', '平台运营']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          const remark = compactJoin([
            values.action ? `处理动作：${optionLabel(deviceActionOptions, values.action)}` : undefined,
            values.faultLevel ? `故障等级：${optionLabel(deviceFaultLevelOptions, values.faultLevel)}` : undefined,
            values.owner ? `负责人：${values.owner}` : undefined,
            values.plannedAt ? `计划时间：${values.plannedAt}` : undefined,
            values.supplement ? `补充说明：${values.supplement}` : undefined,
          ]);
          if (modalTitle === '重发设备指令') {
            await api.deviceOps.commands.add({ commandNo: values.bizNo, deviceCode: values.deviceCode || values.bizNo, commandType: '重发指令', commandPayload: remark, status: values.status || 'SENT', remark });
            await queryClient.invalidateQueries({ queryKey: ['device-commands'] });
          } else if (modalTitle === '分派故障处理') {
            await api.deviceOps.faults.add({ faultNo: values.bizNo, deviceCode: values.deviceCode || values.bizNo, faultType: '人工分派', level: values.faultLevel, status: values.status || 'PROCESSING', remark });
            await queryClient.invalidateQueries({ queryKey: ['device-faults'] });
          } else if (modalTitle === '新建保养任务') {
            await api.deviceOps.maintenances.add({ maintainNo: values.bizNo, deviceCode: values.deviceCode || values.bizNo, maintainType: '人工保养', owner: values.owner, plannedAt: values.plannedAt, status: values.status || 'PENDING', remark });
            await queryClient.invalidateQueries({ queryKey: ['device-maintenances'] });
          } else if (modalTitle === '新增备件') {
            await api.deviceOps.spareParts.add({ partCode: values.bizNo, partName: values.partName || values.bizNo, stockQty: values.stockQty, warningQty: values.warningQty, status: values.status || 'PENDING' });
            await queryClient.invalidateQueries({ queryKey: ['device-spare-parts'] });
          }
          setModalVisible(false);
          message.success('已保存到后端');
        }}
        width={1080}
        okText="保存运维处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ThunderboltOutlined />} title="处理对象" desc="录入设备、指令、故障、保养或备件编号。">
              <div className="merchant-editor-fields">
                <Form.Item name="bizNo" label="设备编号 / 指令号 / 故障单号" rules={[{ required: true, message: '请输入设备编号、指令号或故障单号' }]}><Input placeholder="例如：DEV-001 或 CMD-001" /></Form.Item>
                <Form.Item name="deviceCode" label="设备编号"><Input placeholder="例如：DEV-001" /></Form.Item>
                <Form.Item name="status" label="处理状态"><Select options={maintainStatusOptions} placeholder="请选择处理状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ToolOutlined />} title="动作与责任" desc="配置处理动作、故障等级、负责人和计划时间。">
              <div className="merchant-editor-fields">
                <Form.Item name="action" label="处理动作"><Select options={deviceActionOptions} placeholder="请选择处理动作" /></Form.Item>
                <Form.Item name="faultLevel" label="故障等级"><Select options={deviceFaultLevelOptions} placeholder="请选择故障等级" /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input placeholder="例如：设备运维-王敏" /></Form.Item>
                <Form.Item name="plannedAt" label="计划时间"><DateTimeField /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SettingOutlined />} title="备件与补充" desc="新增备件时维护名称和库存，其他处理可填写补充说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="partName" label="备件名称"><Input placeholder="例如：高压水枪喷头" /></Form.Item>
                <Form.Item name="stockQty" label="库存"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item name="warningQty" label="预警库存"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：设备离线后重发启动指令" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default DeviceOpsManagement;
