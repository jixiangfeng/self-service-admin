import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  deviceCommandStatusOptions,
  deviceFaultLevelOptions,
  deviceStatusOptions,
  maintainStatusOptions,
  publishStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface DeviceCommandRecord {
  id: string;
  commandNo: string;
  serviceOrderNo: string;
  deviceCode: string;
  commandType: string;
  commandPayload: string;
  status: string;
  ackAt: string;
}

interface CommandLogRecord {
  id: string;
  commandNo: string;
  deviceCode: string;
  requestPayload: string;
  responsePayload: string;
  retryCount: number;
  loggedAt: string;
}

interface FaultRecord {
  id: string;
  faultNo: string;
  deviceCode: string;
  storeName: string;
  faultType: string;
  level: string;
  relatedOrderNo: string;
  status: string;
  reportedAt: string;
}

interface HeartbeatRecord {
  id: string;
  deviceCode: string;
  storeName: string;
  signalStatus: string;
  payload: string;
  heartbeatAt: string;
}

interface MaintenanceRecord {
  id: string;
  maintainNo: string;
  deviceCode: string;
  maintainType: string;
  owner: string;
  status: string;
  plannedAt: string;
}

interface SparePartRecord {
  id: string;
  partCode: string;
  partName: string;
  deviceModel: string;
  stockQty: number;
  warningQty: number;
  status: string;
}

const commandStatusMap = buildValueEnum(deviceCommandStatusOptions);
const deviceStatusMap = buildValueEnum(deviceStatusOptions);
const faultLevelMap = buildValueEnum(deviceFaultLevelOptions);
const maintainStatusMap = buildValueEnum(maintainStatusOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);

const commands: DeviceCommandRecord[] = [
  { id: 'cmd1', commandNo: 'CMD202604180019', serviceOrderNo: 'SO202604180019', deviceCode: 'DEV-HQ-003', commandType: '启动高压冲洗', commandPayload: '{"duration":900}', status: 'SENT', ackAt: '-' },
  { id: 'cmd2', commandNo: 'CMD202604170101', serviceOrderNo: 'SO202604170101', deviceCode: 'DEV-JD-002', commandType: '套餐启动', commandPayload: '{"package":"FOAM"}', status: 'ACKED', ackAt: '2026-04-17 19:42:08' },
];

const commandLogs: CommandLogRecord[] = [
  { id: 'log1', commandNo: 'CMD202604180019', deviceCode: 'DEV-HQ-003', requestPayload: '{"action":"start"}', responsePayload: '{"code":0}', retryCount: 0, loggedAt: '2026-04-18 09:27:00' },
  { id: 'log2', commandNo: 'CMD202604170113', deviceCode: 'DEV-XH-007', requestPayload: '{"action":"dry"}', responsePayload: '{"code":504}', retryCount: 2, loggedAt: '2026-04-17 22:08:30' },
];

const faults: FaultRecord[] = [
  { id: 'ft1', faultNo: 'FT202604180001', deviceCode: 'DEV-XH-007', storeName: '徐汇夜洗门店', faultType: '回执超时', level: 'HIGH', relatedOrderNo: 'SO202604170113', status: 'PROCESSING', reportedAt: '2026-04-18 09:28:00' },
  { id: 'ft2', faultNo: 'FT202604180002', deviceCode: 'DEV-HQ-003', storeName: '虹桥旗舰洗车站', faultType: '心跳离线', level: 'MEDIUM', relatedOrderNo: '-', status: 'PENDING', reportedAt: '2026-04-18 08:57:00' },
];

const heartbeats: HeartbeatRecord[] = [
  { id: 'hb1', deviceCode: 'DEV-HQ-003', storeName: '虹桥旗舰洗车站', signalStatus: 'ONLINE', payload: '{"voltage":220,"temp":36}', heartbeatAt: '2026-04-18 10:20:00' },
  { id: 'hb2', deviceCode: 'DEV-XH-007', storeName: '徐汇夜洗门店', signalStatus: 'OFFLINE', payload: '{"lastError":"ACK_TIMEOUT"}', heartbeatAt: '2026-04-18 09:28:00' },
];

const maintenances: MaintenanceRecord[] = [
  { id: 'mt1', maintainNo: 'MT202604180006', deviceCode: 'DEV-HQ-003', maintainType: '月度保养', owner: '运维-周可', status: 'PENDING', plannedAt: '2026-04-19 09:00:00' },
  { id: 'mt2', maintainNo: 'MT202604170002', deviceCode: 'DEV-JD-002', maintainType: '喷头更换', owner: '运维-李维', status: 'DONE', plannedAt: '2026-04-17 16:00:00' },
];

const spareParts: SparePartRecord[] = [
  { id: 'sp1', partCode: 'PART-NOZZLE-01', partName: '高压喷头', deviceModel: '高压主机 A 系列', stockQty: 18, warningQty: 5, status: 'PUBLISHED' },
  { id: 'sp2', partCode: 'PART-DRYER-FAN', partName: '风干机风扇', deviceModel: '风干设备 C 系列', stockQty: 3, warningQty: 4, status: 'PENDING' },
];

const DeviceOpsManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DeviceCommandRecord | CommandLogRecord | FaultRecord | HeartbeatRecord | MaintenanceRecord | SparePartRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

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

  const commandLogColumns = useMemo<ProColumns<CommandLogRecord>[]>(() => [
    { title: '指令编号', dataIndex: 'commandNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '请求报文', dataIndex: 'requestPayload', width: 220 },
    { title: '回执报文', dataIndex: 'responsePayload', width: 220 },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '记录时间', dataIndex: 'loggedAt', width: 180, render: (_, record) => formatDateTime(record.loggedAt) },
  ], []);

  const faultColumns = useMemo<ProColumns<FaultRecord>[]>(() => [
    { title: '故障单号', dataIndex: 'faultNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '故障类型', dataIndex: 'faultType', width: 130 },
    { title: '等级', dataIndex: 'level', width: 100, render: (_, record) => renderStatusTag(record.level, faultLevelMap) },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, maintainStatusMap) },
    { title: '上报时间', dataIndex: 'reportedAt', width: 180, render: (_, record) => formatDateTime(record.reportedAt) },
  ], []);

  const heartbeatColumns = useMemo<ProColumns<HeartbeatRecord>[]>(() => [
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '信号状态', dataIndex: 'signalStatus', width: 120, render: (_, record) => renderStatusTag(record.signalStatus, deviceStatusMap) },
    { title: '心跳内容', dataIndex: 'payload', width: 260 },
    { title: '心跳时间', dataIndex: 'heartbeatAt', width: 180, render: (_, record) => formatDateTime(record.heartbeatAt) },
  ], []);

  const maintenanceColumns = useMemo<ProColumns<MaintenanceRecord>[]>(() => [
    { title: '保养单号', dataIndex: 'maintainNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: '保养类型', dataIndex: 'maintainType', width: 130 },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, maintainStatusMap) },
    { title: '计划时间', dataIndex: 'plannedAt', width: 180, render: (_, record) => formatDateTime(record.plannedAt) },
  ], []);

  const sparePartColumns = useMemo<ProColumns<SparePartRecord>[]>(() => [
    { title: '备件编码', dataIndex: 'partCode', width: 160 },
    { title: '备件名称', dataIndex: 'partName', width: 160 },
    { title: '适用型号', dataIndex: 'deviceModel', width: 180 },
    { title: '库存', dataIndex: 'stockQty', width: 90 },
    { title: '预警库存', dataIndex: 'warningQty', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="设备履约运维" subtitle="维护设备指令、回执日志、故障记录、心跳日志、保养任务和备件库存。" icon={<ThunderboltOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待回执指令" value={commands.filter((item) => ['PENDING', 'SENT'].includes(item.status)).length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="指令日志" value={commandLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="故障中" value={faults.filter((item) => item.status !== 'DONE').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="离线设备" value={heartbeats.filter((item) => item.signalStatus === 'OFFLINE').length} suffix="台" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待保养" value={maintenances.filter((item) => item.status === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="低库存备件" value={spareParts.filter((item) => item.stockQty <= item.warningQty).length} suffix="种" /></Card></Col>
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
          { key: 'command', label: '设备指令', children: <ProTable<DeviceCommandRecord> cardBordered rowKey="id" columns={commandColumns} dataSource={filter(commands) as DeviceCommandRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重发设备指令')}>重发指令</Button>]} /> },
          { key: 'commandLog', label: '回执日志', children: <ProTable<CommandLogRecord> cardBordered rowKey="id" columns={commandLogColumns} dataSource={filter(commandLogs) as CommandLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'fault', label: '故障记录', children: <ProTable<FaultRecord> cardBordered rowKey="id" columns={faultColumns} dataSource={filter(faults) as FaultRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => [<Button key="assign" type="primary" onClick={() => openModal('分派故障处理')}>分派处理</Button>]} /> },
          { key: 'heartbeat', label: '心跳日志', children: <ProTable<HeartbeatRecord> cardBordered rowKey="id" columns={heartbeatColumns} dataSource={filter(heartbeats) as HeartbeatRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'maintenance', label: '保养任务', children: <ProTable<MaintenanceRecord> cardBordered rowKey="id" columns={maintenanceColumns} dataSource={filter(maintenances) as MaintenanceRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建保养任务')}>新建保养</Button>]} /> },
          { key: 'sparePart', label: '备件库存', children: <ProTable<SparePartRecord> cardBordered rowKey="id" columns={sparePartColumns} dataSource={filter(spareParts) as SparePartRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增备件')}>新增备件</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('设备运维操作已记录');
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
