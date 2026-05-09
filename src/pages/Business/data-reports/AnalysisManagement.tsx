import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Table, Tabs, message } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { analysisSnapshotTypeOptions, reportDimensionOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import api, { type AnalysisSnapshotRecord } from '@/services/backendService';

interface DerivedStoreRecord {
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

interface DerivedMarketingRecord {
  key: string;
  name: string;
  exposure: number;
  click: number;
  conversion: number;
  roi: string;
  owner: string;
}

const snapshotTypeMap = buildValueEnum(analysisSnapshotTypeOptions);
const dimensionMap = buildValueEnum(reportDimensionOptions);

const analysisDetailFields: Record<'snapshot' | 'store' | 'marketing', DetailField<any>[]> = {
  snapshot: [
    { name: 'snapshotDate', label: '快照日期' },
    { name: 'snapshotHour', label: '小时' },
    { name: 'snapshotType', label: '快照类型' },
    { name: 'dimension', label: '维度' },
    { name: 'scopeId', label: '范围ID' },
    { name: 'dimensionName', label: '维度名称' },
    { name: 'metricCode', label: '指标编码' },
    { name: 'metricValue', label: '指标值' },
    { name: 'compareValue', label: '对比值' },
    { name: 'orderCount', label: '订单数' },
    { name: 'incomeAmount', label: '收入', render: (value) => formatAmount(value) },
    { name: 'refundAmount', label: '退款', render: (value) => formatAmount(value) },
    { name: 'activeDeviceCount', label: '活跃设备' },
    { name: 'faultDeviceCount', label: '故障设备' },
    { name: 'createdAt', label: '生成时间' },
  ],
  store: [
    { name: 'storeName', label: '门店' },
    { name: 'owner', label: '负责人' },
    { name: 'orders', label: '订单数' },
    { name: 'revenue', label: '营收', render: (value) => formatAmount(value) },
    { name: 'utilization', label: '点位利用率', render: (value) => `${value ?? 0}%` },
    { name: 'refundRate', label: '退款率' },
    { name: 'faultCount', label: '故障数' },
    { name: 'hotService', label: '热门服务' },
  ],
  marketing: [
    { name: 'name', label: '活动' },
    { name: 'owner', label: '负责人' },
    { name: 'exposure', label: '曝光' },
    { name: 'click', label: '点击' },
    { name: 'conversion', label: '转化' },
    { name: 'roi', label: 'ROI' },
  ],
};

const parseDimensionJson = (value?: string) => {
  try {
    return value ? JSON.parse(value) as Record<string, any> : {};
  } catch {
    return {};
  }
};

const AnalysisManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<AnalysisSnapshotRecord | DerivedStoreRecord | DerivedMarketingRecord | null>(null);
  const [metricVisible, setMetricVisible] = useState(false);
  const [metricForm] = Form.useForm<AnalysisSnapshotRecord & { owner?: string; note?: string }>();

  const snapshotQuery = useQuery({
    queryKey: ['analysisSnapshots'],
    queryFn: async () => (await api.analysis.snapshots.page({ pageNum: 1, pageSize: 200 })).data,
  });
  const saveMetricMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.analysis.snapshots.add({
      snapshotDate: values.snapshotDate,
      snapshotType: values.snapshotType || 'PLATFORM_DAILY',
      dimension: values.dimension || 'PLATFORM',
      scopeId: values.scopeId || '0',
      dimensionName: values.dimensionName,
      metricCode: values.metricCode,
      metricValue: Number(values.metricValue || 0),
      compareValue: Number(values.compareValue || 0),
      dimensionJson: JSON.stringify({ owner: values.owner, note: values.note }),
      orderCount: Number(values.orderCount || 0),
      incomeAmount: Number(values.incomeAmount || 0),
      refundAmount: Number(values.refundAmount || 0),
      activeDeviceCount: Number(values.activeDeviceCount || 0),
      faultDeviceCount: Number(values.faultDeviceCount || 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysisSnapshots'] });
      message.success('指标口径已保存');
    },
  });

  const snapshots = (snapshotQuery.data?.records || []).map((item) => ({ ...item, key: String(item.id) }));
  const platform = snapshots.find((item) => item.dimension === 'PLATFORM') || snapshots[0];
  const storeRanking = useMemo<DerivedStoreRecord[]>(() => snapshots.filter((item) => item.dimension === 'STORE').map((item) => {
    const ext = parseDimensionJson(item.dimensionJson);
    return {
      key: String(item.id),
      storeName: item.dimensionName,
      orders: Number(item.orderCount || item.metricValue || 0),
      revenue: Number(item.incomeAmount || 0),
      utilization: Number(ext.utilization || 0),
      hotService: ext.hotService || '-',
      owner: ext.owner || '-',
      refundRate: ext.refundRate || '-',
      faultCount: Number(item.faultDeviceCount || 0),
    };
  }), [snapshots]);
  const marketingMetrics = useMemo<DerivedMarketingRecord[]>(() => snapshots.filter((item) => item.dimension === 'ACTIVITY').map((item) => {
    const ext = parseDimensionJson(item.dimensionJson);
    return {
      key: String(item.id),
      name: item.dimensionName,
      exposure: Number(ext.exposure || 0),
      click: Number(ext.click || 0),
      conversion: Number(ext.conversion || item.orderCount || 0),
      roi: String(item.metricValue || 0),
      owner: ext.owner || '-',
    };
  }), [snapshots]);
  const faultSnapshots = snapshots.filter((item) => Number(item.faultDeviceCount || 0) > 0);

  const platformCards = [
    { title: '今日订单', value: `${Number(platform?.orderCount || 0)} 单`, helper: `对比 ${platform?.compareValue ?? 0}` },
    { title: '今日营收', value: formatAmount(platform?.incomeAmount || 0), helper: `退款冲减 ${formatAmount(platform?.refundAmount || 0)}` },
    { title: '活跃设备', value: `${Number(platform?.activeDeviceCount || 0)} 台`, helper: `故障设备 ${Number(platform?.faultDeviceCount || 0)} 台` },
    { title: '分析快照', value: `${snapshots.length} 条`, helper: '已接入 analysis_snapshot' },
  ];

  const handleMetricSubmit = async () => {
    const values = await metricForm.validateFields();
    await saveMetricMutation.mutateAsync(values as unknown as Record<string, unknown>);
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
                <Table<AnalysisSnapshotRecord>
                  loading={snapshotQuery.isLoading}
                  pagination={{ pageSize: 8 }}
                  rowKey="id"
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
                    { title: '收入', dataIndex: 'incomeAmount', width: 120, render: (value: number | string) => formatAmount(value) },
                    { title: '退款', dataIndex: 'refundAmount', width: 120, render: (value: number | string) => formatAmount(value) },
                    { title: '活跃设备', dataIndex: 'activeDeviceCount', width: 100 },
                    { title: '故障设备', dataIndex: 'faultDeviceCount', width: 100 },
                    { title: '生成时间', dataIndex: 'createdAt', width: 180 },
                    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
                  ]}
                  scroll={{ x: 1700 }}
                />
              </Card>
            ),
          },
          {
            key: 'store',
            label: '门店排行',
            children: (
              <Card>
                <Table<DerivedStoreRecord>
                  pagination={{ pageSize: 8 }}
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
                    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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
                <Table<DerivedMarketingRecord>
                  pagination={{ pageSize: 8 }}
                  rowKey="key"
                  dataSource={marketingMetrics}
                  columns={[
                    { title: '活动', dataIndex: 'name' },
                    { title: '负责人', dataIndex: 'owner', width: 140 },
                    { title: '曝光', dataIndex: 'exposure', width: 90 },
                    { title: '点击', dataIndex: 'click', width: 90 },
                    { title: '转化', dataIndex: 'conversion', width: 90 },
                    { title: 'ROI', dataIndex: 'roi', width: 90 },
                    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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
                <Table<AnalysisSnapshotRecord>
                  pagination={{ pageSize: 8 }}
                  rowKey="id"
                  dataSource={faultSnapshots}
                  columns={[
                    { title: '维度名称', dataIndex: 'dimensionName' },
                    { title: '维度', dataIndex: 'dimension', width: 120 },
                    { title: '范围ID', dataIndex: 'scopeId', width: 120 },
                    { title: '故障设备', dataIndex: 'faultDeviceCount', width: 120 },
                    { title: '活跃设备', dataIndex: 'activeDeviceCount', width: 120 },
                    { title: '快照日期', dataIndex: 'snapshotDate', width: 140 },
                    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal title="指标口径配置" open={metricVisible} onOk={handleMetricSubmit} confirmLoading={saveMetricMutation.isPending} onCancel={() => { setMetricVisible(false); metricForm.resetFields(); }} width={820}>
        <Form form={metricForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="snapshotDate" label="快照日期" rules={[{ required: true, message: '请输入快照日期' }]}><Input placeholder="2026-05-09" /></Form.Item>
            <Form.Item name="snapshotType" label="快照类型"><Select options={analysisSnapshotTypeOptions} /></Form.Item>
            <Form.Item name="dimension" label="指标维度"><Select options={reportDimensionOptions} /></Form.Item>
            <Form.Item name="scopeId" label="范围ID"><Input /></Form.Item>
            <Form.Item name="dimensionName" label="维度名称" rules={[{ required: true, message: '请输入维度名称' }]}><Input /></Form.Item>
            <Form.Item name="metricCode" label="指标编码" rules={[{ required: true, message: '请输入指标编码' }]}><Input /></Form.Item>
            <Form.Item name="metricValue" label="指标值" rules={[{ required: true, message: '请输入指标值' }]}><Input /></Form.Item>
            <Form.Item name="compareValue" label="对比值"><Input /></Form.Item>
            <Form.Item name="orderCount" label="订单数"><Input /></Form.Item>
            <Form.Item name="incomeAmount" label="收入金额"><Input /></Form.Item>
            <Form.Item name="refundAmount" label="退款金额"><Input /></Form.Item>
            <Form.Item name="activeDeviceCount" label="活跃设备"><Input /></Form.Item>
            <Form.Item name="faultDeviceCount" label="故障设备"><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="note" label="口径说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={780}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('storeName' in detail ? analysisDetailFields.store : 'name' in detail ? analysisDetailFields.marketing : analysisDetailFields.snapshot) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={100}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default AnalysisManagement;
