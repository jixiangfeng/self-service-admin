import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Table, message } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import {
  adContentTypeOptions,
  adDeliveryStatusOptions,
  adSlotPlacementOptions,
  adStatusOptions,
  scopeTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import api, { type AdCampaignRecord, type AdEventRecord, type AdSlotRecord } from '@/services/backendService';

const placementMap = buildValueEnum(adSlotPlacementOptions);
const contentTypeMap = buildValueEnum(adContentTypeOptions);
const adStatusMap = buildValueEnum(adStatusOptions);
const deliveryStatusMap = buildValueEnum(adDeliveryStatusOptions);
const scopeTypeMap = buildValueEnum(scopeTypeOptions);

const adDetailFields: Record<'slot' | 'campaign' | 'event', DetailField<any>[]> = {
  slot: [
    { name: 'slotCode', label: '广告位编码' },
    { name: 'slotName', label: '广告位' },
    { name: 'placement', label: '页面位置' },
    { name: 'scope', label: '投放范围' },
    { name: 'contentType', label: '内容类型' },
    { name: 'sizeSpec', label: '尺寸' },
    { name: 'sortWeight', label: '排序权重' },
    { name: 'status', label: '状态' },
  ],
  campaign: [
    { name: 'campaignCode', label: '计划编码' },
    { name: 'campaign', label: '计划名称' },
    { name: 'slotName', label: '广告位' },
    { name: 'target', label: '投放对象' },
    { name: 'timing', label: '时段' },
    { name: 'budget', label: '预算', render: (value) => formatAmount(value) },
    { name: 'exposure', label: '曝光' },
    { name: 'click', label: '点击' },
    { name: 'conversion', label: '转化' },
    { name: 'owner', label: '负责人' },
    { name: 'status', label: '状态' },
  ],
  event: [
    { name: 'eventNo', label: '事件编号' },
    { name: 'campaignCode', label: '计划编码' },
    { name: 'campaign', label: '计划名称' },
    { name: 'slotName', label: '广告位' },
    { name: 'eventType', label: '事件类型' },
    { name: 'userName', label: '用户' },
    { name: 'storeName', label: '门店' },
    { name: 'orderNo', label: '转化订单' },
    { name: 'eventTime', label: '事件时间' },
    { name: 'occurredAt', label: '发生时间' },
  ],
};

const AdManagement: React.FC = () => {
  const [slotForm] = Form.useForm<AdSlotRecord>();
  const [deliveryForm] = Form.useForm<AdCampaignRecord>();
  const queryClient = useQueryClient();
  const slotQuery = useQuery({ queryKey: ['adSlots'], queryFn: async () => (await api.valuePlanning.adSlots.page({ pageNum: 1, pageSize: 200 })).data });
  const deliveryQuery = useQuery({ queryKey: ['adCampaigns'], queryFn: async () => (await api.valuePlanning.adCampaigns.page({ pageNum: 1, pageSize: 200 })).data });
  const eventQuery = useQuery({ queryKey: ['adEvents'], queryFn: async () => (await api.valuePlanning.adEvents.page({ pageNum: 1, pageSize: 200 })).data });
  const slots = slotQuery.data?.records || [];
  const deliveries = deliveryQuery.data?.records || [];
  const events = eventQuery.data?.records || [];
  const [slotVisible, setSlotVisible] = useState(false);
  const [deliveryVisible, setDeliveryVisible] = useState(false);
  const [detail, setDetail] = useState<AdSlotRecord | AdCampaignRecord | AdEventRecord | null>(null);
  const [editingSlot, setEditingSlot] = useState<AdSlotRecord | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<AdCampaignRecord | null>(null);

  const summary = useMemo(
    () => ({
      slotCount: slots.length,
      deliveryCount: deliveries.length,
      exposureCount: deliveries.reduce((sum, item) => sum + Number(item.exposure || 0), 0),
      conversionCount: deliveries.reduce((sum, item) => sum + Number(item.conversion || 0), 0),
    }),
    [deliveries, slots.length]
  );

  const saveSlotMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingSlot ? api.valuePlanning.adSlots.edit({ ...values, id: editingSlot.id }) : api.valuePlanning.adSlots.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adSlots'] });
      message.success(editingSlot ? '广告位已更新' : '广告位已创建');
    },
  });
  const handleSlotSubmit = async () => {
    const values = await slotForm.validateFields();
    await saveSlotMutation.mutateAsync(values as unknown as Record<string, unknown>);
    setSlotVisible(false);
    setEditingSlot(null);
    slotForm.resetFields();
  };

  const saveDeliveryMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => editingDelivery ? api.valuePlanning.adCampaigns.edit({ ...values, id: editingDelivery.id }) : api.valuePlanning.adCampaigns.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adCampaigns'] });
      message.success(editingDelivery ? '投放计划已更新' : '投放计划已创建');
    },
  });
  const handleDeliverySubmit = async () => {
    const values = await deliveryForm.validateFields();
    await saveDeliveryMutation.mutateAsync(values as unknown as Record<string, unknown>);
    setDeliveryVisible(false);
    setEditingDelivery(null);
    deliveryForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="广告中心" subtitle="管理广告位、投放计划、负责人和状态，不再只是预留页。" icon={<NotificationOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="广告位类型">{summary.slotCount} 类</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="投放计划">{summary.deliveryCount} 个</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="曝光总量">{summary.exposureCount} 次</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="转化订单">{summary.conversionCount} 单</Card></Col>
      </Row>

      <Card title="广告位管理" extra={<Button type="primary" onClick={() => { setEditingSlot(null); slotForm.resetFields(); setSlotVisible(true); }}>新建广告位</Button>} style={{ marginBottom: 16 }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={slots}
          columns={[
            { title: '广告位编码', dataIndex: 'slotCode', width: 170 },
            { title: '广告位', dataIndex: 'slotName' },
            { title: '页面位置', dataIndex: 'placement', width: 150, render: (value: string) => renderStatusTag(value, placementMap) },
            { title: '投放范围', dataIndex: 'scope', width: 120, render: (value: string) => renderStatusTag(value, scopeTypeMap) },
            { title: '内容类型', dataIndex: 'contentType', width: 120, render: (value: string) => renderStatusTag(value, contentTypeMap) },
            { title: '尺寸', dataIndex: 'sizeSpec', width: 110 },
            { title: '排序权重', dataIndex: 'sortWeight', width: 100 },
            { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, adStatusMap) },
            { title: '操作', width: 150, render: (_, record: AdSlotRecord) => (
              <>
                <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                <Button size="small" type="link" onClick={() => { setEditingSlot(record); slotForm.setFieldsValue(record); setSlotVisible(true); }}>编辑</Button>
              </>
            ) },
          ]}
        />
      </Card>

      <Card title="投放计划" extra={<Button onClick={() => { setEditingDelivery(null); deliveryForm.resetFields(); setDeliveryVisible(true); }}>新建投放</Button>}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={deliveries}
          columns={[
            { title: '计划编码', dataIndex: 'campaignCode', width: 160 },
            { title: '计划名称', dataIndex: 'campaign' },
            { title: '广告位', dataIndex: 'slotName', width: 160 },
            { title: '投放对象', dataIndex: 'target', width: 180 },
            { title: '时段', dataIndex: 'timing', width: 160 },
            { title: '预算', dataIndex: 'budget', width: 110, render: (value: number) => formatAmount(value) },
            { title: '曝光', dataIndex: 'exposure', width: 90 },
            { title: '点击', dataIndex: 'click', width: 90 },
            { title: '转化', dataIndex: 'conversion', width: 90 },
            { title: '负责人', dataIndex: 'owner', width: 140 },
            { title: '状态', dataIndex: 'status', width: 120, render: (value: string) => renderStatusTag(value, deliveryStatusMap) },
            { title: '操作', width: 150, render: (_, record: AdCampaignRecord) => (
              <>
                <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                <Button size="small" type="link" onClick={() => { setEditingDelivery(record); deliveryForm.setFieldsValue(record); setDeliveryVisible(true); }}>编辑</Button>
              </>
            ) },
          ]}
        />
      </Card>

      <Card title="广告事件记录" style={{ marginTop: 16 }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={events}
          columns={[
            { title: '计划', dataIndex: 'campaign' },
            { title: '事件', dataIndex: 'eventType', width: 120 },
            { title: '用户', dataIndex: 'userName', width: 120 },
            { title: '门店', dataIndex: 'storeName', width: 180 },
            { title: '转化订单', dataIndex: 'orderNo', width: 170 },
            { title: '发生时间', dataIndex: 'occurredAt', width: 180 },
            { title: '操作', width: 100, render: (_, record: AdEventRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
          ]}
        />
      </Card>

      <Modal title={editingSlot ? `编辑广告位 · ${editingSlot.slotName || editingSlot.slotCode}` : '新建广告位'} open={slotVisible} onOk={handleSlotSubmit} onCancel={() => { setSlotVisible(false); setEditingSlot(null); slotForm.resetFields(); }} width={860} confirmLoading={saveSlotMutation.isPending}>
        <Form form={slotForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="slotCode" label="广告位编码" rules={[{ required: true, message: '请输入广告位编码' }]}><Input /></Form.Item>
            <Form.Item name="slotName" label="广告位名称" rules={[{ required: true, message: '请输入广告位名称' }]}><Input /></Form.Item>
            <Form.Item name="placement" label="页面位置" rules={[{ required: true, message: '请选择页面位置' }]}><Select options={adSlotPlacementOptions} /></Form.Item>
            <Form.Item name="scope" label="投放范围"><Select options={scopeTypeOptions} /></Form.Item>
            <Form.Item name="contentType" label="内容类型"><Select options={adContentTypeOptions} /></Form.Item>
            <Form.Item name="sizeSpec" label="尺寸规格"><Input /></Form.Item>
            <Form.Item name="sortWeight" label="排序权重"><Input /></Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={adStatusOptions} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={editingDelivery ? `编辑投放计划 · ${editingDelivery.campaign || editingDelivery.campaignCode}` : '新建投放计划'} open={deliveryVisible} onOk={handleDeliverySubmit} onCancel={() => { setDeliveryVisible(false); setEditingDelivery(null); deliveryForm.resetFields(); }} width={860} confirmLoading={saveDeliveryMutation.isPending}>
        <Form form={deliveryForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="campaignCode" label="计划编码" rules={[{ required: true, message: '请输入计划编码' }]}><Input /></Form.Item>
            <Form.Item name="campaign" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}><Input /></Form.Item>
            <Form.Item name="slotName" label="广告位"><Input /></Form.Item>
            <Form.Item name="target" label="投放对象" rules={[{ required: true, message: '请输入投放对象' }]}><Input /></Form.Item>
            <Form.Item name="timing" label="投放时段"><Input /></Form.Item>
            <Form.Item name="budget" label="预算"><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={adDeliveryStatusOptions} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('eventNo' in detail ? adDetailFields.event : 'campaignCode' in detail ? adDetailFields.campaign : adDetailFields.slot) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={100}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default AdManagement;
