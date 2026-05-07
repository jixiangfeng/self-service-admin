import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Table, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import {
  merchantTodoCategoryOptions,
  settlementStatusOptions,
  storeStatusOptions,
  ticketPriorityOptions,
  todoStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';

interface TodoRecord {
  id: string;
  title: string;
  owner: string;
  deadline: string;
  priority: string;
  status: string;
  category: string;
  relatedStore: string;
  relatedNo: string;
}

interface StoreOverviewRecord {
  id: string;
  store: string;
  manager: string;
  orders: number;
  revenue: number;
  activeCampaigns: number;
  settlementStatus: string;
  faultCount: number;
  afterSaleCount: number;
  status: string;
}

const priorityMap = buildValueEnum(ticketPriorityOptions);
const todoStatusMap = buildValueEnum(todoStatusOptions);
const todoCategoryMap = buildValueEnum(merchantTodoCategoryOptions);
const settlementStatusMap = buildValueEnum(settlementStatusOptions);
const storeStatusMap = buildValueEnum(storeStatusOptions);

const initialTodos: TodoRecord[] = [
  { id: 'todo-1', title: '确认上海直营夜洗门店组的跨店活动范围', owner: '平台运营-何铭', deadline: '2026-04-18 17:30:00', priority: 'HIGH', status: 'PENDING', category: 'ACTIVITY_CONFIG', relatedStore: '上海直营夜洗门店组', relatedNo: 'CSA-001' },
  { id: 'todo-2', title: '审核夜洗充值返利活动的赠送预算', owner: '财务-林悦', deadline: '2026-04-18 18:00:00', priority: 'HIGH', status: 'PROCESSING', category: 'BUDGET_APPROVAL', relatedStore: '徐汇夜洗门店', relatedNo: 'RCG-006' },
  { id: 'todo-3', title: '处理两笔门店设备异常引起的售后补偿', owner: '客服-刘莎', deadline: '2026-04-18 20:00:00', priority: 'MEDIUM', status: 'PENDING', category: 'AFTER_SALE', relatedStore: '徐汇夜洗门店', relatedNo: 'CS20260418001' },
  { id: 'todo-4', title: '确认本周商户结算单与退款冲减明细', owner: '财务-许鸣', deadline: '2026-04-19 10:00:00', priority: 'MEDIUM', status: 'PENDING', category: 'SETTLEMENT_CONFIRM', relatedStore: '虹桥旗舰洗车站', relatedNo: 'SB202604W001' },
];

const initialStores: StoreOverviewRecord[] = [
  { id: 'store-1', store: '虹桥旗舰洗车站', manager: '李思远', orders: 86, revenue: 2050, activeCampaigns: 3, settlementStatus: 'WAIT_CONFIRM', faultCount: 1, afterSaleCount: 1, status: 'OPEN' },
  { id: 'store-2', store: '徐汇夜洗门店', manager: '黄允', orders: 61, revenue: 1530, activeCampaigns: 2, settlementStatus: 'PENDING', faultCount: 1, afterSaleCount: 2, status: 'OPEN' },
  { id: 'store-3', store: '嘉定联营门店', manager: '陈禾', orders: 37, revenue: 960, activeCampaigns: 1, settlementStatus: 'WAIT_CONFIRM', faultCount: 1, afterSaleCount: 0, status: 'PAUSED' },
];

const MerchantWorkbench: React.FC = () => {
  const [taskForm] = Form.useForm<TodoRecord>();
  const [todos, setTodos] = useState(initialTodos);
  const [stores] = useState(initialStores);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoRecord | null>(null);
  const [detail, setDetail] = useState<TodoRecord | StoreOverviewRecord | null>(null);

  const summary = useMemo(
    () => ({
      storeCount: stores.length,
      revenue: stores.reduce((sum, item) => sum + item.revenue, 0),
      runningCampaigns: stores.reduce((sum, item) => sum + item.activeCampaigns, 0),
      pendingSettlement: stores.filter((item) => item.settlementStatus !== 'SETTLED').length,
    }),
    [stores]
  );

  const closeTaskModal = () => {
    setTaskModalVisible(false);
    setEditingTask(null);
    taskForm.resetFields();
  };

  const handleTaskSubmit = async () => {
    const values = await taskForm.validateFields();

    if (editingTask) {
      setTodos((prev) => prev.map((item) => (item.id === editingTask.id ? { ...item, ...values } : item)));
      message.success('待办事项已更新');
    } else {
      setTodos((prev) => [{ ...values, id: `todo-${Date.now()}` }, ...prev]);
      message.success('待办事项已创建');
    }

    closeTaskModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户后台" subtitle="从商户视角查看门店经营、活动、结算和待办事项，并支持直接维护日常经营任务。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="商户门店数" value={summary.storeCount} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="本周营收" value={formatAmount(summary.revenue)} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="运行中活动" value={summary.runningCampaigns} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认结算单" value={summary.pendingSettlement} suffix="张" /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} xl={11}>
          <Card title="商户待办" extra={<Button type="primary" onClick={() => { taskForm.resetFields(); taskForm.setFieldsValue({ priority: 'MEDIUM', status: 'PENDING' }); setTaskModalVisible(true); }}>新建待办</Button>}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={todos}
              columns={[
                { title: '待办', dataIndex: 'title' },
                { title: '分类', dataIndex: 'category', width: 120, render: (value: string) => renderStatusTag(value, todoCategoryMap) },
                { title: '负责人', dataIndex: 'owner', width: 140 },
                { title: '关联门店', dataIndex: 'relatedStore', width: 150 },
                { title: '关联单号', dataIndex: 'relatedNo', width: 150 },
                { title: '截止时间', dataIndex: 'deadline', width: 160 },
                { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => renderStatusTag(value, priorityMap) },
                { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => renderStatusTag(value, todoStatusMap) },
                {
                  title: '操作',
                  width: 220,
                  render: (_, record: TodoRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingTask(record);
                          taskForm.setFieldsValue(record);
                          setTaskModalVisible(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setTodos((prev) =>
                            prev.map((item) =>
                              item.id === record.id
                                ? { ...item, status: item.status === 'DONE' ? 'PENDING' : 'DONE' }
                                : item
                            )
                          );
                          message.success('待办状态已更新');
                        }}
                      >
                        {record.status === 'DONE' ? '恢复' : '完成'}
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={13}>
          <Card title="门店经营概览">
            <Table
              pagination={false}
              rowKey="id"
              dataSource={stores}
              columns={[
                { title: '门店', dataIndex: 'store' },
                { title: '负责人', dataIndex: 'manager', width: 120 },
                { title: '订单数', dataIndex: 'orders', width: 90 },
                { title: '营收', dataIndex: 'revenue', width: 120, render: (value: number) => formatAmount(value) },
                { title: '活动数', dataIndex: 'activeCampaigns', width: 90 },
                { title: '故障数', dataIndex: 'faultCount', width: 90 },
                { title: '售后数', dataIndex: 'afterSaleCount', width: 90 },
                { title: '结算状态', dataIndex: 'settlementStatus', width: 110, render: (value: string) => renderStatusTag(value, settlementStatusMap) },
                { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, storeStatusMap) },
                {
                  title: '操作',
                  width: 120,
                  render: (_, record: StoreOverviewRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal title={editingTask ? `编辑待办 · ${editingTask.title}` : '新建待办'} open={taskModalVisible} onOk={handleTaskSubmit} onCancel={closeTaskModal} width={820}>
        <Form form={taskForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item className="modal-span-2" name="title" label="待办标题" rules={[{ required: true, message: '请输入待办标题' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请输入截止时间' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
              <Select options={ticketPriorityOptions} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={todoStatusOptions} />
            </Form.Item>
            <Form.Item name="category" label="所属分类" rules={[{ required: true, message: '请选择所属分类' }]}>
              <Select options={merchantTodoCategoryOptions} />
            </Form.Item>
            <Form.Item name="relatedStore" label="关联门店">
              <Input />
            </Form.Item>
            <Form.Item className="modal-span-2" name="relatedNo" label="关联单号">
              <Input />
            </Form.Item>
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

export default MerchantWorkbench;
