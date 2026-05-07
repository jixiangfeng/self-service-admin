import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Table, message } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import {
  adContentTypeOptions,
  adDeliveryStatusOptions,
  adSlotPlacementOptions,
  adStatusOptions,
  scopeTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';

interface SlotRecord {
  id: string;
  slotCode: string;
  slotName: string;
  placement: string;
  scope: string;
  contentType: string;
  sizeSpec: string;
  sortWeight: number;
  status: string;
}

interface DeliveryRecord {
  id: string;
  campaignCode: string;
  campaign: string;
  slotName: string;
  target: string;
  timing: string;
  budget: number;
  exposure: number;
  click: number;
  conversion: number;
  owner: string;
  status: string;
}

interface AdEventRecord {
  id: string;
  campaign: string;
  eventType: string;
  userName: string;
  storeName: string;
  orderNo: string;
  occurredAt: string;
}

const placementMap = buildValueEnum(adSlotPlacementOptions);
const contentTypeMap = buildValueEnum(adContentTypeOptions);
const adStatusMap = buildValueEnum(adStatusOptions);
const deliveryStatusMap = buildValueEnum(adDeliveryStatusOptions);
const scopeTypeMap = buildValueEnum(scopeTypeOptions);

const initialSlots: SlotRecord[] = [
  { id: 'slot-1', slotCode: 'ADS-HOME-BANNER', slotName: '首页 Banner 位', placement: 'HOME_BANNER', scope: 'PLATFORM', contentType: 'IMAGE', sizeSpec: '750x320', sortWeight: 100, status: 'DRAFT' },
  { id: 'slot-2', slotCode: 'ADS-PAY-SUCC', slotName: '支付完成页广告位', placement: 'PAY_SUCCESS', scope: 'STORE', contentType: 'TEXT_IMAGE', sizeSpec: '690x240', sortWeight: 80, status: 'DRAFT' },
  { id: 'slot-3', slotCode: 'ADS-STORE-DETAIL', slotName: '门店详情页广告位', placement: 'STORE_DETAIL', scope: 'STORE', contentType: 'POPUP', sizeSpec: '690x360', sortWeight: 60, status: 'DESIGNING' },
];

const initialDeliveries: DeliveryRecord[] = [
  { id: 'delivery-1', campaignCode: 'ADC-202604-001', campaign: '夏季联名投放', slotName: '首页 Banner 位', target: '上海直营门店', timing: '12:00 - 20:00', budget: 5000, exposure: 12600, click: 860, conversion: 72, owner: '平台运营', status: 'PENDING' },
  { id: 'delivery-2', campaignCode: 'ADC-202604-002', campaign: '夜洗合作品牌', slotName: '支付完成页广告位', target: '夜洗门店组', timing: '20:00 - 02:00', budget: 3200, exposure: 8600, click: 520, conversion: 48, owner: '区域运营', status: 'RUNNING' },
];

const initialEvents: AdEventRecord[] = [
  { id: 'event-1', campaign: '夜洗合作品牌', eventType: 'CLICK', userName: '张晨', storeName: '徐汇夜洗门店', orderNo: '-', occurredAt: '2026-04-18 09:12:00' },
  { id: 'event-2', campaign: '夜洗合作品牌', eventType: 'CONVERSION', userName: '陈越', storeName: '徐汇夜洗门店', orderNo: 'SO202604180019', occurredAt: '2026-04-18 09:20:00' },
];

const AdManagement: React.FC = () => {
  const [slotForm] = Form.useForm<SlotRecord>();
  const [deliveryForm] = Form.useForm<DeliveryRecord>();
  const [slots, setSlots] = useState(initialSlots);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [events] = useState(initialEvents);
  const [slotVisible, setSlotVisible] = useState(false);
  const [deliveryVisible, setDeliveryVisible] = useState(false);
  const [detail, setDetail] = useState<SlotRecord | DeliveryRecord | AdEventRecord | null>(null);

  const summary = useMemo(
    () => ({
      slotCount: slots.length,
      deliveryCount: deliveries.length,
      exposureCount: deliveries.reduce((sum, item) => sum + item.exposure, 0),
      conversionCount: deliveries.reduce((sum, item) => sum + item.conversion, 0),
    }),
    [deliveries, slots.length]
  );

  const handleSlotSubmit = async () => {
    const values = await slotForm.validateFields();
    setSlots((prev) => [{ ...values, id: `slot-${Date.now()}` }, ...prev]);
    setSlotVisible(false);
    slotForm.resetFields();
    message.success('广告位已创建');
  };

  const handleDeliverySubmit = async () => {
    const values = await deliveryForm.validateFields();
    setDeliveries((prev) => [{ ...values, id: `delivery-${Date.now()}` }, ...prev]);
    setDeliveryVisible(false);
    deliveryForm.resetFields();
    message.success('投放计划已创建');
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

      <Card title="广告位管理" extra={<Button type="primary" onClick={() => setSlotVisible(true)}>新建广告位</Button>} style={{ marginBottom: 16 }}>
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
            { title: '操作', width: 100, render: (_, record: SlotRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
          ]}
        />
      </Card>

      <Card title="投放计划" extra={<Button onClick={() => setDeliveryVisible(true)}>新建投放</Button>}>
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

      <Modal title="新建广告位" open={slotVisible} onOk={handleSlotSubmit} onCancel={() => { setSlotVisible(false); slotForm.resetFields(); }} width={860}>
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

      <Modal title="新建投放计划" open={deliveryVisible} onOk={handleDeliverySubmit} onCancel={() => { setDeliveryVisible(false); deliveryForm.resetFields(); }} width={860}>
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
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdManagement;
