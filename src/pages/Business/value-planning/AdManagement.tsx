import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Table, Tag, message } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';

interface SlotRecord {
  id: string;
  slotName: string;
  placement: string;
  scope: string;
  contentType: string;
  status: string;
}

interface DeliveryRecord {
  id: string;
  campaign: string;
  target: string;
  timing: string;
  metric: string;
  owner: string;
  status: string;
}

const initialSlots: SlotRecord[] = [
  { id: 'slot-1', slotName: '首页 Banner 位', placement: '首页顶部', scope: '平台 / 商户 / 门店', contentType: '图片 / 视频', status: '规划中' },
  { id: 'slot-2', slotName: '支付完成页广告位', placement: '支付成功页', scope: '门店', contentType: '图文', status: '规划中' },
  { id: 'slot-3', slotName: '门店详情页广告位', placement: '门店详情', scope: '门店 / 城市', contentType: '图文 / 弹窗', status: '规划中' },
];

const initialDeliveries: DeliveryRecord[] = [
  { id: 'delivery-1', campaign: '夏季联名投放', target: '上海直营门店', timing: '12:00 - 20:00', metric: '曝光 / 点击 / 转化', owner: '平台运营', status: '待发布' },
  { id: 'delivery-2', campaign: '夜洗合作品牌', target: '夜洗门店组', timing: '20:00 - 02:00', metric: '曝光 / 点击', owner: '区域运营', status: '运行中' },
];

const AdManagement: React.FC = () => {
  const [slotForm] = Form.useForm<SlotRecord>();
  const [deliveryForm] = Form.useForm<DeliveryRecord>();
  const [slots, setSlots] = useState(initialSlots);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [slotVisible, setSlotVisible] = useState(false);
  const [deliveryVisible, setDeliveryVisible] = useState(false);
  const [detail, setDetail] = useState<SlotRecord | DeliveryRecord | null>(null);

  const summary = useMemo(
    () => ({
      slotCount: slots.length,
      deliveryCount: deliveries.length,
      metricCount: 4,
      stage: '第四期增值业务',
    }),
    [deliveries.length, slots.length]
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
        <Col xs={24} sm={12} xl={6}><Card title="统计口径">曝光 / 点击 / 转化 / 收入</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="版本阶段">{summary.stage}</Card></Col>
      </Row>

      <Card title="广告位管理" extra={<Button type="primary" onClick={() => setSlotVisible(true)}>新建广告位</Button>} style={{ marginBottom: 16 }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={slots}
          columns={[
            { title: '广告位', dataIndex: 'slotName' },
            { title: '页面位置', dataIndex: 'placement', width: 180 },
            { title: '投放范围', dataIndex: 'scope', width: 180 },
            { title: '内容类型', dataIndex: 'contentType', width: 180 },
            { title: '阶段', dataIndex: 'status', width: 120, render: (value: string) => <Tag color="gold">{value}</Tag> },
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
            { title: '计划名称', dataIndex: 'campaign' },
            { title: '投放对象', dataIndex: 'target', width: 180 },
            { title: '时段', dataIndex: 'timing', width: 160 },
            { title: '指标', dataIndex: 'metric', width: 180 },
            { title: '负责人', dataIndex: 'owner', width: 140 },
            { title: '状态', dataIndex: 'status', width: 120, render: (value: string) => <Tag color={value === '运行中' ? 'success' : 'gold'}>{value}</Tag> },
          ]}
        />
      </Card>

      <Modal title="新建广告位" open={slotVisible} onOk={handleSlotSubmit} onCancel={() => { setSlotVisible(false); slotForm.resetFields(); }} width={860}>
        <Form form={slotForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="slotName" label="广告位名称" rules={[{ required: true, message: '请输入广告位名称' }]}><Input /></Form.Item>
            <Form.Item name="placement" label="页面位置" rules={[{ required: true, message: '请输入页面位置' }]}><Input /></Form.Item>
            <Form.Item name="scope" label="投放范围"><Input /></Form.Item>
            <Form.Item name="contentType" label="内容类型"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="status" label="阶段">
              <Select options={[{ value: '规划中', label: '规划中' }, { value: '设计中', label: '设计中' }, { value: '已上线', label: '已上线' }]} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="新建投放计划" open={deliveryVisible} onOk={handleDeliverySubmit} onCancel={() => { setDeliveryVisible(false); deliveryForm.resetFields(); }} width={860}>
        <Form form={deliveryForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="campaign" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}><Input /></Form.Item>
            <Form.Item name="target" label="投放对象" rules={[{ required: true, message: '请输入投放对象' }]}><Input /></Form.Item>
            <Form.Item name="timing" label="投放时段"><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="metric" label="指标"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="status" label="状态"><Select options={[{ value: '待发布', label: '待发布' }, { value: '运行中', label: '运行中' }, { value: '已结束', label: '已结束' }]} /></Form.Item>
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
