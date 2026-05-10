import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { CheckCircleOutlined, LineChartOutlined, SyncOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  adDeliveryStatusOptions,
  retailDeliveryTypeOptions,
  retailProductStatusOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api, { type AdConversionRecord, type AdEventRecord, type RetailOrderRecord, type RetailShipmentRecord, type RetailStockFlowRecord } from '@/services/backendService';

const deliveryTypeMap = buildValueEnum(retailDeliveryTypeOptions);
const retailStatusMap = buildValueEnum(retailProductStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const adDeliveryStatusMap = buildValueEnum(adDeliveryStatusOptions);
const flowSceneOptions = [
  { value: 'ORDER_SYNC', label: '订单同步' },
  { value: 'SHIP_RETRY', label: '设备出货重试' },
  { value: 'STOCK_REPAIR', label: '库存流水修正' },
];
const flowActionOptions = [
  { value: 'SYNC_NOW', label: '立即同步' },
  { value: 'RETRY_NOW', label: '立即重试' },
  { value: 'MARK_EXCEPTION', label: '标记异常' },
];
const yesNoOptions = [
  { value: 'YES', label: '是' },
  { value: 'NO', label: '否' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const valueFlowDetailFields: Record<'adEvent' | 'conversion' | 'order' | 'stockFlow' | 'ship', DetailField<any>[]> = {
  adEvent: [
    { name: 'eventNo', label: '事件编号' },
    { name: 'campaignCode', label: '广告活动' },
    { name: 'slotName', label: '广告位' },
    { name: 'eventType', label: '事件类型' },
    { name: 'storeName', label: '门店' },
    { name: 'orderNo', label: '关联订单' },
    { name: 'eventTime', label: '事件时间', render: (value) => formatDateTime(value) },
  ],
  conversion: [
    { name: 'campaignCode', label: '广告活动' },
    { name: 'userName', label: '用户' },
    { name: 'sourceEvent', label: '来源事件' },
    { name: 'orderNo', label: '转化订单' },
    { name: 'conversionAmount', label: '转化金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'convertedAt', label: '转化时间', render: (value) => formatDateTime(value) },
  ],
  order: [
    { name: 'orderNo', label: '零售订单' },
    { name: 'userName', label: '用户' },
    { name: 'storeName', label: '门店' },
    { name: 'productName', label: '商品' },
    { name: 'deliveryType', label: '履约方式' },
    { name: 'orderAmount', label: '金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  stockFlow: [
    { name: 'flowNo', label: '库存流水' },
    { name: 'skuName', label: 'SKU' },
    { name: 'scopeName', label: '库存范围' },
    { name: 'flowType', label: '流水类型' },
    { name: 'quantity', label: '数量' },
    { name: 'beforeQty', label: '变动前' },
    { name: 'afterQty', label: '变动后' },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  ship: [
    { name: 'shipNo', label: '出货流水' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'skuName', label: 'SKU' },
    { name: 'orderNo', label: '订单号' },
    { name: 'shipResult', label: '出货结果' },
    { name: 'stockFlowNo', label: '库存流水' },
    { name: 'status', label: '状态' },
    { name: 'shippedAt', label: '出货时间', render: (value) => formatDateTime(value) },
  ],
};

const ValueFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const queryClient = useQueryClient();
  const adEventQuery = useQuery({ queryKey: ['valueAdEvents'], queryFn: async () => (await api.valuePlanning.adEvents.page({ pageNum: 1, pageSize: 200 })).data });
  const conversionQuery = useQuery({ queryKey: ['valueAdConversions'], queryFn: async () => (await api.valuePlanning.adConversions.page({ pageNum: 1, pageSize: 200 })).data });
  const retailOrderQuery = useQuery({ queryKey: ['valueRetailOrders'], queryFn: async () => (await api.valuePlanning.retailOrders.page({ pageNum: 1, pageSize: 200 })).data });
  const stockFlowQuery = useQuery({ queryKey: ['valueRetailStockFlows'], queryFn: async () => (await api.valuePlanning.retailStockFlows.page({ pageNum: 1, pageSize: 200 })).data });
  const shipmentQuery = useQuery({ queryKey: ['valueRetailShipments'], queryFn: async () => (await api.valuePlanning.retailShipments.page({ pageNum: 1, pageSize: 200 })).data });
  const adEvents = adEventQuery.data?.records || [];
  const conversions = conversionQuery.data?.records || [];
  const retailOrders = retailOrderQuery.data?.records || [];
  const stockFlows = stockFlowQuery.data?.records || [];
  const deviceShips = shipmentQuery.data?.records || [];
  const [detail, setDetail] = useState<AdEventRecord | RetailOrderRecord | RetailStockFlowRecord | AdConversionRecord | RetailShipmentRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; processScene?: string; processAction?: string; notifyOwner?: string; owner?: string; supplement?: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    form.setFieldsValue({
      processScene: title === '同步零售订单' ? 'ORDER_SYNC' : 'SHIP_RETRY',
      processAction: title === '同步零售订单' ? 'SYNC_NOW' : 'RETRY_NOW',
      notifyOwner: 'YES',
    });
    setModalVisible(true);
  };

  const adEventColumns = useMemo<ProColumns<AdEventRecord>[]>(() => [
    { title: '事件编号', dataIndex: 'eventNo', width: 180 },
    { title: '广告活动', dataIndex: 'campaignCode', width: 160 },
    { title: '广告位', dataIndex: 'slotName', width: 180 },
    { title: '事件类型', dataIndex: 'eventType', width: 110 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '关联订单', dataIndex: 'orderNo', width: 180 },
    { title: '事件时间', dataIndex: 'eventTime', width: 180, render: (_, record) => formatDateTime(record.eventTime) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const retailOrderColumns = useMemo<ProColumns<RetailOrderRecord>[]>(() => [
    { title: '零售订单', dataIndex: 'orderNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '商品', dataIndex: 'productName', width: 160 },
    { title: '履约方式', dataIndex: 'deliveryType', width: 130, render: (_, record) => renderStatusTag(record.deliveryType, deliveryTypeMap) },
    { title: '金额', dataIndex: 'orderAmount', width: 110, render: (_, record) => formatAmount(record.orderAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, retailStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const stockFlowColumns = useMemo<ProColumns<RetailStockFlowRecord>[]>(() => [
    { title: '库存流水', dataIndex: 'flowNo', width: 180 },
    { title: 'SKU', dataIndex: 'skuName', width: 160 },
    { title: '库存范围', dataIndex: 'scopeName', width: 180 },
    { title: '流水类型', dataIndex: 'flowType', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 90 },
    { title: '变动前', dataIndex: 'beforeQty', width: 90 },
    { title: '变动后', dataIndex: 'afterQty', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const conversionColumns = useMemo<ProColumns<AdConversionRecord>[]>(() => [
    { title: '广告活动', dataIndex: 'campaignCode', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '来源事件', dataIndex: 'sourceEvent', width: 180 },
    { title: '转化订单', dataIndex: 'orderNo', width: 180 },
    { title: '转化金额', dataIndex: 'conversionAmount', width: 120, render: (_, record) => formatAmount(record.conversionAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, adDeliveryStatusMap) },
    { title: '转化时间', dataIndex: 'convertedAt', width: 180, render: (_, record) => formatDateTime(record.convertedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const shipColumns = useMemo<ProColumns<RetailShipmentRecord>[]>(() => [
    { title: '出货流水', dataIndex: 'shipNo', width: 180 },
    { title: '设备编号', dataIndex: 'deviceCode', width: 150 },
    { title: 'SKU', dataIndex: 'skuName', width: 160 },
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '出货结果', dataIndex: 'shipResult', width: 120, render: (_, record) => renderStatusTag(record.shipResult, writeOffStatusMap) },
    { title: '库存流水', dataIndex: 'stockFlowNo', width: 180 },
    { title: '出货时间', dataIndex: 'shippedAt', width: 180, render: (_, record) => formatDateTime(record.shippedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="增值流水中心" subtitle="维护广告事件、广告转化、零售订单、库存流水和设备出货记录。" icon={<LineChartOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="广告事件" value={adEvents.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="零售订单" value={retailOrders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="库存流水" value={stockFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="转化金额" value={formatAmount(conversions.reduce((sum, item) => sum + Number(item.conversionAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待出货" value={deviceShips.filter((item) => item.shipResult === 'PENDING').length} suffix="单" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入广告、订单、SKU、设备、库存流水关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'adEvent', label: '广告事件', children: <ProTable<AdEventRecord> cardBordered rowKey="id" columns={adEventColumns} dataSource={filter(adEvents) as AdEventRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} /> },
          { key: 'conversion', label: '广告转化', children: <ProTable<AdConversionRecord> cardBordered rowKey="id" columns={conversionColumns} dataSource={filter(conversions) as AdConversionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'retailOrder', label: '零售订单', children: <ProTable<RetailOrderRecord> cardBordered rowKey="id" columns={retailOrderColumns} dataSource={filter(retailOrders) as RetailOrderRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="sync" type="primary" onClick={() => openModal('同步零售订单')}>同步订单</Button>]} /> },
          { key: 'stockFlow', label: '库存流水', children: <ProTable<RetailStockFlowRecord> cardBordered rowKey="id" columns={stockFlowColumns} dataSource={filter(stockFlows) as RetailStockFlowRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'ship', label: '设备出货', children: <ProTable<RetailShipmentRecord> cardBordered rowKey="id" columns={shipColumns} dataSource={filter(deviceShips) as RetailShipmentRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="retry" type="primary" disabled={!deviceShips.some((item) => item.shipResult === 'PENDING')} onClick={() => openModal('重试设备出货')}>重试出货</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title={detail && 'eventNo' in detail ? '广告事件详情' : detail && 'sourceEvent' in detail ? '广告转化详情' : detail && 'flowNo' in detail ? '库存流水详情' : detail && 'shipNo' in detail ? '设备出货详情' : '零售订单详情'} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('eventNo' in detail ? valueFlowDetailFields.adEvent : 'sourceEvent' in detail ? valueFlowDetailFields.conversion : 'flowNo' in detail ? valueFlowDetailFields.stockFlow : 'shipNo' in detail ? valueFlowDetailFields.ship : valueFlowDetailFields.order) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={modalTitle === '同步零售订单' ? '订单同步' : '出货处理'}
        title={modalTitle}
        subtitle="把处理动作拆成场景、动作、通知和补充说明，运营不需要维护大段处理文本。"
        meta={[modalTitle || '增值流水', '处理']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const processRemark = compactJoin([
            values.processScene ? `处理场景：${optionLabel(flowSceneOptions, values.processScene)}` : undefined,
            values.processAction ? `处理动作：${optionLabel(flowActionOptions, values.processAction)}` : undefined,
            values.notifyOwner ? `通知负责人：${optionLabel(yesNoOptions, values.notifyOwner)}` : undefined,
            values.owner ? `负责人：${values.owner}` : undefined,
            values.supplement ? `补充说明：${values.supplement}` : undefined,
          ]);
          if (modalTitle === '同步零售订单') {
            await api.valuePlanning.retailOrders.add({ orderNo: values.bizNo, status: values.status || 'PENDING', productName: processRemark });
            queryClient.invalidateQueries({ queryKey: ['valueRetailOrders'] });
          } else {
            const first = deviceShips.find((item) => item.shipResult === 'PENDING');
            if (!first) {
              setModalVisible(false);
              return;
            }
            await api.valuePlanning.retailShipments.edit({ ...first, shipResult: values.status || 'SUCCESS', status: values.status || 'SUCCESS' });
            queryClient.invalidateQueries({ queryKey: ['valueRetailShipments'] });
          }
          setModalVisible(false);
          message.success('增值流水已更新');
        }}
        width={980}
        okText="提交处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SyncOutlined />} title="处理对象" desc="录入订单号、设备号或流水号，并选择处理后的业务状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="bizNo" label="订单 / 设备 / 流水号" rules={[{ required: true, message: '请输入订单、设备或流水号' }]}><Input placeholder="例如：RO-20260510-001" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={writeOffStatusOptions} placeholder="请选择处理后状态" /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input placeholder="例如：增值运营-王敏" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理动作" desc="用结构化选项描述处理场景和动作，提交时合并为后端说明字段。">
              <div className="merchant-editor-fields">
                <Form.Item name="processScene" label="处理场景"><Select options={flowSceneOptions} placeholder="请选择处理场景" /></Form.Item>
                <Form.Item name="processAction" label="处理动作"><Select options={flowActionOptions} placeholder="请选择处理动作" /></Form.Item>
                <Form.Item name="notifyOwner" label="通知负责人"><Select options={yesNoOptions} placeholder="请选择是否通知" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：订单已在支付侧确认，重新同步零售单" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ValueFlowManagement;
