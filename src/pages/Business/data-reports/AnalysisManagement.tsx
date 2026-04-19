import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Space, Table, Tag } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';
import { formatAmount } from '@/pages/Business/shared';

interface StoreRankingRecord {
  key: string;
  storeName: string;
  orders: number;
  revenue: number;
  utilization: number;
  hotService: string;
  owner: string;
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
  deviceName: string;
  storeName: string;
  fault: string;
  updatedAt: string;
  level: string;
}

const initialStoreRanking: StoreRankingRecord[] = [
  { key: '1', storeName: '虹桥旗舰洗车站', orders: 86, revenue: 2050, utilization: 92, hotService: '泡沫精洗套餐', owner: '店长-李思远' },
  { key: '2', storeName: '徐汇夜洗门店', orders: 61, revenue: 1530, utilization: 88, hotService: '夜间按时长服务', owner: '店长-黄允' },
  { key: '3', storeName: '嘉定联营门店', orders: 37, revenue: 960, utilization: 71, hotService: '快速冲洗套餐', owner: '店长-陈禾' },
];

const initialMarketingMetrics: MarketingMetricRecord[] = [
  { key: '1', name: '夜洗券包活动', exposure: 1280, click: 318, conversion: 78, roi: '1.82', owner: '平台运营-何铭' },
  { key: '2', name: '邀请首充返利', exposure: 920, click: 264, conversion: 49, roi: '1.34', owner: '增长运营-沈一' },
  { key: '3', name: '新人首单礼', exposure: 1660, click: 502, conversion: 132, roi: '2.15', owner: '活动运营-陶然' },
];

const initialFaultDevices: FaultDeviceRecord[] = [
  { key: '1', deviceName: '风干设备 C7', storeName: '徐汇夜洗门店', fault: '回执超时', updatedAt: '2026-04-18 09:28', level: '高' },
  { key: '2', deviceName: '泡沫设备 B2', storeName: '嘉定联营门店', fault: '压力异常', updatedAt: '2026-04-18 09:05', level: '中' },
  { key: '3', deviceName: '高压主机 A3', storeName: '虹桥旗舰洗车站', fault: '心跳离线', updatedAt: '2026-04-18 08:57', level: '高' },
];

const AnalysisManagement: React.FC = () => {
  const [storeRanking] = useState(initialStoreRanking);
  const [marketingMetrics] = useState(initialMarketingMetrics);
  const [faultDevices, setFaultDevices] = useState(initialFaultDevices);
  const [detail, setDetail] = useState<StoreRankingRecord | MarketingMetricRecord | FaultDeviceRecord | null>(null);
  const [metricVisible, setMetricVisible] = useState(false);
  const [metricForm] = Form.useForm<{ metricName: string; owner: string; note: string }>();

  const platformCards = useMemo(
    () => [
      { title: '今日订单', value: `${storeRanking.reduce((sum, item) => sum + item.orders, 0)} 单`, helper: '较昨日 +12%' },
      { title: '今日营收', value: formatAmount(storeRanking.reduce((sum, item) => sum + item.revenue, 0)), helper: '退款冲减 286 元' },
      { title: '今日充值', value: formatAmount(1660), helper: '首充用户 18 人' },
      { title: '在线设备', value: '47 台', helper: `故障设备 ${faultDevices.length} 台` },
    ],
    [faultDevices.length, storeRanking]
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

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} xl={14}>
          <Card title="门店经营排行" extra={<Button onClick={() => setMetricVisible(true)}>指标口径</Button>}>
            <Table
              pagination={false}
              dataSource={storeRanking}
              columns={[
                { title: '门店', dataIndex: 'storeName' },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '订单数', dataIndex: 'orders', width: 100 },
                { title: '营收', dataIndex: 'revenue', width: 120, render: (value: number) => formatAmount(value) },
                { title: '点位利用率', dataIndex: 'utilization', width: 120, render: (value: number) => `${value}%` },
                { title: '热门服务', dataIndex: 'hotService', width: 180 },
                {
                  title: '操作',
                  width: 100,
                  render: (_, record: StoreRankingRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button>,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="营销效果看板">
            <Table
              pagination={false}
              dataSource={marketingMetrics}
              columns={[
                { title: '活动', dataIndex: 'name' },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '曝光', dataIndex: 'exposure', width: 90 },
                { title: '点击', dataIndex: 'click', width: 90 },
                { title: '转化', dataIndex: 'conversion', width: 90 },
                { title: 'ROI', dataIndex: 'roi', width: 90, render: (value: string) => <Tag color={Number(value) >= 2 ? 'success' : 'gold'}>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24}>
          <Card title="设备异常关注清单">
            <Table
              pagination={false}
              dataSource={faultDevices}
              columns={[
                { title: '设备', dataIndex: 'deviceName', width: 180 },
                { title: '门店', dataIndex: 'storeName', width: 180 },
                { title: '故障表现', dataIndex: 'fault' },
                { title: '级别', dataIndex: 'level', width: 100, render: (value: string) => <Tag color={value === '高' ? 'red' : 'gold'}>{value}</Tag> },
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
        </Col>
      </Row>

      <Modal title="指标口径配置" open={metricVisible} onOk={handleMetricSubmit} onCancel={() => { setMetricVisible(false); metricForm.resetFields(); }} width={820}>
        <Form form={metricForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="metricName" label="指标名称" rules={[{ required: true, message: '请输入指标名称' }]}><Input placeholder="例如 门店利用率" /></Form.Item>
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
