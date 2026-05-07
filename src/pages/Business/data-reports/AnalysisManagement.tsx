import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, Tabs } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { analysisSnapshotTypeOptions, deviceFaultLevelOptions, reportDimensionOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';

interface SnapshotRecord {
  key: string;
  snapshotDate: string;
  snapshotHour?: number;
  snapshotType: string;
  dimension: string;
  scopeId: string;
  dimensionName: string;
  metricCode: string;
  metricValue: number;
  compareValue: number;
  dimensionJson: string;
  createdAt: string;
}

interface SnapshotViewRecord extends SnapshotRecord {
  orderCount: number;
  incomeAmount: number;
  refundAmount: number;
  activeDeviceCount: number;
  faultDeviceCount: number;
}

interface StoreRankingRecord {
  key: string;
  storeName: string;
  orders: number;
  revenue: number;
  utilization: number;
  hotService: string;
  owner: string;
  refundRate: string;
  faultCount: number;
}

interface MarketingMetricRecord {
  key: string;
  name: string;
  exposure: number;
  click: number;
  conversion: number;
  roi: string;
  owner: string;
}

interface FaultDeviceRecord {
  key: string;
  deviceCode: string;
  deviceName: string;
  storeName: string;
  fault: string;
  updatedAt: string;
  level: string;
  affectedOrderNo: string;
  owner: string;
}

const snapshotTypeMap = buildValueEnum(analysisSnapshotTypeOptions);
const dimensionMap = buildValueEnum(reportDimensionOptions);
const faultLevelMap = buildValueEnum(deviceFaultLevelOptions);

const initialSnapshots: SnapshotViewRecord[] = [
  { key: 's1', snapshotDate: '2026-04-18', snapshotType: 'PLATFORM_DAILY', dimension: 'PLATFORM', scopeId: '0', dimensionName: '平台汇总', metricCode: 'ORDER_INCOME', metricValue: 4540, compareValue: 4050, dimensionJson: '{"city":"ALL","cycle":"DAY"}', orderCount: 184, incomeAmount: 4540, refundAmount: 286, activeDeviceCount: 47, faultDeviceCount: 3, createdAt: '2026-04-19 00:10:00' },
  { key: 's2', snapshotDate: '2026-04-18', snapshotHour: 9, snapshotType: 'STORE_DAILY', dimension: 'STORE', scopeId: '1001', dimensionName: '虹桥旗舰洗车站', metricCode: 'STORE_ORDER_COUNT', metricValue: 86, compareValue: 72, dimensionJson: '{"merchantId":1,"city":"上海"}', orderCount: 86, incomeAmount: 2050, refundAmount: 40, activeDeviceCount: 16, faultDeviceCount: 1, createdAt: '2026-04-19 00:12:00' },
  { key: 's3', snapshotDate: '2026-04-18', snapshotType: 'MARKETING_DAILY', dimension: 'ACTIVITY', scopeId: 'MKT-NIGHT-202604', dimensionName: '夜洗券包活动', metricCode: 'ACTIVITY_ROI', metricValue: 1.82, compareValue: 1.46, dimensionJson: '{"activityType":"COUPON","owner":"平台运营"}', orderCount: 78, incomeAmount: 1680, refundAmount: 32, activeDeviceCount: 0, faultDeviceCount: 0, createdAt: '2026-04-19 00:15:00' },
];

const initialStoreRanking: StoreRankingRecord[] = [
  { key: '1', storeName: '虹桥旗舰洗车站', orders: 86, revenue: 2050, utilization: 92, hotService: '泡沫精洗套餐', owner: '店长-李思远', refundRate: '1.9%', faultCount: 1 },
  { key: '2', storeName: '徐汇夜洗门店', orders: 61, revenue: 1530, utilization: 88, hotService: '夜间按时长服务', owner: '店长-黄允', refundRate: '3.2%', faultCount: 1 },
  { key: '3', storeName: '嘉定联营门店', orders: 37, revenue: 960, utilization: 71, hotService: '快速冲洗套餐', owner: '店长-陈禾', refundRate: '2.4%', faultCount: 1 },
];

const initialMarketingMetrics: MarketingMetricRecord[] = [
  { key: '1', name: '夜洗券包活动', exposure: 1280, click: 318, conversion: 78, roi: '1.82', owner: '平台运营-何铭' },
  { key: '2', name: '邀请首充返利', exposure: 920, click: 264, conversion: 49, roi: '1.34', owner: '增长运营-沈一' },
  { key: '3', name: '新人首单礼', exposure: 1660, click: 502, conversion: 132, roi: '2.15', owner: '活动运营-陶然' },
];

const initialFaultDevices: FaultDeviceRecord[] = [
  { key: '1', deviceCode: 'DEV-XH-007', deviceName: '风干设备 C7', storeName: '徐汇夜洗门店', fault: '回执超时', updatedAt: '2026-04-18 09:28', level: 'HIGH', affectedOrderNo: 'SO202604170113', owner: '运维-周可' },
  { key: '2', deviceCode: 'DEV-JD-002', deviceName: '泡沫设备 B2', storeName: '嘉定联营门店', fault: '压力异常', updatedAt: '2026-04-18 09:05', level: 'MEDIUM', affectedOrderNo: 'SO202604180021', owner: '运维-李维' },
  { key: '3', deviceCode: 'DEV-HQ-003', deviceName: '高压主机 A3', storeName: '虹桥旗舰洗车站', fault: '心跳离线', updatedAt: '2026-04-18 08:57', level: 'HIGH', affectedOrderNo: '-', owner: '运维-李维' },
];

const AnalysisManagement: React.FC = () => {
  const [snapshots] = useState(initialSnapshots);
  const [storeRanking] = useState(initialStoreRanking);
  const [marketingMetrics] = useState(initialMarketingMetrics);
  const [faultDevices, setFaultDevices] = useState(initialFaultDevices);
  const [detail, setDetail] = useState<SnapshotViewRecord | StoreRankingRecord | MarketingMetricRecord | FaultDeviceRecord | null>(null);
  const [metricVisible, setMetricVisible] = useState(false);
  const [metricForm] = Form.useForm<{ metricName: string; owner: string; note: string }>();

  const platformCards = useMemo(
    () => [
      { title: '今日订单', value: `${snapshots[0].orderCount} 单`, helper: '较昨日 +12%' },
      { title: '今日营收', value: formatAmount(snapshots[0].incomeAmount), helper: `退款冲减 ${formatAmount(snapshots[0].refundAmount)}` },
      { title: '今日充值', value: formatAmount(1660), helper: '首充用户 18 人' },
      { title: '在线设备', value: '47 台', helper: `故障设备 ${faultDevices.length} 台` },
    ],
    [faultDevices.length, snapshots]
  );

  const handleMetricSubmit = async () => {
    await metricForm.validateFields();
    setMetricVisible(false);
    metricForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="经营分析" subtitle="查看平台、门店、营销和设备维度的经营分析，并支持下钻查看异常与指标口径。" icon={<BarChartOutlined />} />

      <Row gutter={[16, 16]}>
        {platformCards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card>
              <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}>{item.title}</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>{item.value}</div>
              <div style={{ marginTop: 8, color: '#1677ff' }}>{item.helper}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'snapshot',
            label: '经营快照',
            children: (
              <Card extra={<Button onClick={() => setMetricVisible(true)}>指标口径</Button>}>
                <div style={{ marginBottom: 12, color: '#667085' }}>
                  后端按 analysis_snapshot 一指标一行存储，当前表格把同一范围的订单、收入、退款和设备指标聚合成运营展示行。
                </div>
                <Table
                  pagination={false}
                  rowKey="key"
                  dataSource={snapshots}
                  columns={[
                    { title: '快照日期', dataIndex: 'snapshotDate', width: 120 },
                    { title: '小时', dataIndex: 'snapshotHour', width: 80, render: (value?: number) => value ?? '-' },
                    { title: '快照类型', dataIndex: 'snapshotType', width: 150, render: (value: string) => renderStatusTag(value, snapshotTypeMap) },
                    { title: '维度', dataIndex: 'dimension', width: 120, render: (value: string) => renderStatusTag(value, dimensionMap) },
                    { title: '范围ID', dataIndex: 'scopeId', width: 120 },
                    { title: '维度名称', dataIndex: 'dimensionName' },
                    { title: '指标编码', dataIndex: 'metricCode', width: 150 },
                    { title: '指标值', dataIndex: 'metricValue', width: 110 },
                    { title: '对比值', dataIndex: 'compareValue', width: 110 },
                    { title: '订单数', dataIndex: 'orderCount', width: 100 },
                    { title: '收入', dataIndex: 'incomeAmount', width: 120, render: (value: number) => formatAmount(value) },
                    { title: '退款', dataIndex: 'refundAmount', width: 120, render: (value: number) => formatAmount(value) },
                    { title: '活跃设备', dataIndex: 'activeDeviceCount', width: 100 },
                    { title: '故障设备', dataIndex: 'faultDeviceCount', width: 100 },
                    { title: '维度JSON', dataIndex: 'dimensionJson', width: 220 },
                    { title: '生成时间', dataIndex: 'createdAt', width: 180 },
                    { title: '操作', width: 100, render: (_, record: SnapshotViewRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
                  ]}
                  scroll={{ x: 1800 }}
                />
              </Card>
            ),
          },
          {
            key: 'store',
            label: '门店排行',
            children: (
              <Card>
            <Table
              pagination={false}
              rowKey="key"
              dataSource={storeRanking}
              columns={[
                { title: '门店', dataIndex: 'storeName' },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '订单数', dataIndex: 'orders', width: 100 },
                { title: '营收', dataIndex: 'revenue', width: 120, render: (value: number) => formatAmount(value) },
                { title: '点位利用率', dataIndex: 'utilization', width: 120, render: (value: number) => `${value}%` },
                { title: '退款率', dataIndex: 'refundRate', width: 100 },
                { title: '故障数', dataIndex: 'faultCount', width: 100 },
                { title: '热门服务', dataIndex: 'hotService', width: 180 },
                {
                  title: '操作',
                  width: 100,
                  render: (_, record: StoreRankingRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button>,
                },
              ]}
            />
              </Card>
            ),
          },
          {
            key: 'marketing',
            label: '营销效果',
            children: (
              <Card>
            <Table
              pagination={false}
              rowKey="key"
              dataSource={marketingMetrics}
              columns={[
                { title: '活动', dataIndex: 'name' },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '曝光', dataIndex: 'exposure', width: 90 },
                { title: '点击', dataIndex: 'click', width: 90 },
                { title: '转化', dataIndex: 'conversion', width: 90 },
                { title: 'ROI', dataIndex: 'roi', width: 90, render: (value: string) => renderStatusTag(Number(value) >= 2 ? 'HIGH' : 'MEDIUM', { HIGH: { text: value, color: 'success' }, MEDIUM: { text: value, color: 'gold' } }) },
                { title: '操作', width: 100, render: (_, record: MarketingMetricRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
              ]}
            />
              </Card>
            ),
          },
          {
            key: 'fault',
            label: '设备异常',
            children: (
              <Card>
            <Table
              pagination={false}
              rowKey="key"
              dataSource={faultDevices}
              columns={[
                { title: '设备编号', dataIndex: 'deviceCode', width: 140 },
                { title: '设备', dataIndex: 'deviceName', width: 180 },
                { title: '门店', dataIndex: 'storeName', width: 180 },
                { title: '故障表现', dataIndex: 'fault' },
                { title: '级别', dataIndex: 'level', width: 100, render: (value: string) => renderStatusTag(value, faultLevelMap) },
                { title: '影响订单', dataIndex: 'affectedOrderNo', width: 170 },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '最近时间', dataIndex: 'updatedAt', width: 160 },
                {
                  title: '操作',
                  width: 140,
                  render: (_, record: FaultDeviceRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setFaultDevices((prev) => prev.filter((item) => item.key !== record.key));
                        }}
                      >
                        标记已处理
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
              </Card>
            ),
          },
        ]}
      />

      <Modal title="指标口径配置" open={metricVisible} onOk={handleMetricSubmit} onCancel={() => { setMetricVisible(false); metricForm.resetFields(); }} width={820}>
        <Form form={metricForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="metricName" label="指标名称" rules={[{ required: true, message: '请输入指标名称' }]}><Input placeholder="例如 门店利用率" /></Form.Item>
            <Form.Item name="dimension" label="指标维度"><Select options={reportDimensionOptions} /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="note" label="口径说明" rules={[{ required: true, message: '请输入口径说明' }]}><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={780}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'number' && key === 'revenue' ? formatAmount(value) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
};

export default AnalysisManagement;
