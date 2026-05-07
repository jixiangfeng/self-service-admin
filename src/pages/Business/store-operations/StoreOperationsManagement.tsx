import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, message } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import {
  publishStatusOptions,
  storeNoticeTypeOptions,
  storeOperationTaskStatusOptions,
  storeOperationTaskTypeOptions,
  ticketPriorityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface TaskRecord {
  id: string;
  taskType: string;
  task: string;
  owner: string;
  deadline: string;
  priority: string;
  status: string;
  store: string;
  relatedDevice: string;
  result?: string;
}

interface NoticeRecord {
  id: string;
  noticeType: string;
  title: string;
  content: string;
  status: string;
  store: string;
  publisher: string;
  publishAt: string;
}

const taskTypeMap = buildValueEnum(storeOperationTaskTypeOptions);
const taskStatusMap = buildValueEnum(storeOperationTaskStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);
const noticeTypeMap = buildValueEnum(storeNoticeTypeOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);

const initialTasks: TaskRecord[] = [
  { id: 'task-1', taskType: 'INSPECTION', task: '夜洗门店巡检', owner: '店长-周可', deadline: '2026-04-18 18:00:00', priority: 'MEDIUM', status: 'PROCESSING', store: '徐汇夜洗门店', relatedDevice: '-', result: '已完成洗车区巡检，待上传照片' },
  { id: 'task-2', taskType: 'DEVICE_MAINTAIN', task: '泡沫设备保养', owner: '运维-李维', deadline: '2026-04-18 20:00:00', priority: 'HIGH', status: 'PENDING', store: '虹桥旗舰洗车站', relatedDevice: 'DEV-HQ-002' },
  { id: 'task-3', taskType: 'NOTICE_UPDATE', task: '公告更新：五一价格调整', owner: '运营-何铭', deadline: '2026-04-19 10:00:00', priority: 'LOW', status: 'CONFIRMING', store: '嘉定联营门店', relatedDevice: '-' },
];

const initialNotices: NoticeRecord[] = [
  { id: 'notice-1', noticeType: 'SHIFT', title: '早班排班', content: '店长 1 人，店员 2 人', status: 'PUBLISHED', store: '虹桥旗舰洗车站', publisher: '店长-李思远', publishAt: '2026-04-18 08:00:00' },
  { id: 'notice-2', noticeType: 'SHIFT', title: '晚班排班', content: '店长 1 人，店员 1 人，运维 1 人待定', status: 'CONFIRMING', store: '徐汇夜洗门店', publisher: '区域运营-何铭', publishAt: '2026-04-18 18:00:00' },
  { id: 'notice-3', noticeType: 'PRICE_NOTICE', title: '五一价格调整', content: '五一期间夜间价格规则调整说明', status: 'PENDING', store: '嘉定联营门店', publisher: '运营-何铭', publishAt: '2026-04-30 12:00:00' },
];

const StoreOperationsManagement: React.FC = () => {
  const [taskForm] = Form.useForm<TaskRecord>();
  const [noticeForm] = Form.useForm<NoticeRecord>();
  const [tasks, setTasks] = useState(initialTasks);
  const [notices, setNotices] = useState(initialNotices);
  const [taskVisible, setTaskVisible] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [detail, setDetail] = useState<TaskRecord | NoticeRecord | null>(null);

  const summary = useMemo(
    () => ({
      inspectCount: tasks.length,
      pendingException: tasks.filter((item) => item.status !== 'DONE').length,
      dutyCount: notices.length + 1,
      noticeCount: notices.length,
    }),
    [notices, tasks]
  );

  const handleTaskSubmit = async () => {
    const values = await taskForm.validateFields();
    setTasks((prev) => [{ ...values, id: `task-${Date.now()}` }, ...prev]);
    setTaskVisible(false);
    taskForm.resetFields();
    message.success('运营任务已创建');
  };

  const handleNoticeSubmit = async () => {
    const values = await noticeForm.validateFields();
    setNotices((prev) => [{ ...values, id: `notice-${Date.now()}` }, ...prev]);
    setNoticeVisible(false);
    noticeForm.resetFields();
    message.success('公告 / 排班已创建');
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店运营台" subtitle="从店长和区域运营视角查看排班、公告、巡检和异常处理，并支持直接维护运营任务。" icon={<ShopOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="今日待巡检">{summary.inspectCount} 项</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="待处理异常">{summary.pendingException} 单</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="值班店员">{summary.dutyCount} 人</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="门店公告">{summary.noticeCount} 条</Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="门店运营任务" extra={<Button type="primary" onClick={() => { taskForm.resetFields(); taskForm.setFieldsValue({ status: 'PENDING' }); setTaskVisible(true); }}>新建任务</Button>}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={tasks}
              columns={[
                { title: '类型', dataIndex: 'taskType', width: 120, render: (value: string) => renderStatusTag(value, taskTypeMap) },
                { title: '任务', dataIndex: 'task' },
                { title: '门店', dataIndex: 'store', width: 140 },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '优先级', dataIndex: 'priority', width: 110, render: (value: string) => renderStatusTag(value, priorityMap) },
                { title: '关联设备', dataIndex: 'relatedDevice', width: 120 },
                { title: '截止时间', dataIndex: 'deadline', width: 170, render: (value: string) => formatDateTime(value) },
                { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, taskStatusMap) },
                {
                  title: '操作',
                  width: 180,
                  render: (_, record: TaskRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setTasks((prev) =>
                            prev.map((item) =>
                              item.id === record.id
                                ? { ...item, status: item.status === 'PROCESSING' ? 'CONFIRMING' : item.status === 'CONFIRMING' ? 'DONE' : 'PROCESSING' }
                                : item
                            )
                          );
                          message.success('任务状态已更新');
                        }}
                      >
                        推进
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="班次与公告" extra={<Button onClick={() => { noticeForm.resetFields(); noticeForm.setFieldsValue({ status: 'PENDING' }); setNoticeVisible(true); }}>新建公告 / 排班</Button>}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={notices}
              columns={[
                { title: '类型', dataIndex: 'noticeType', width: 120, render: (value: string) => renderStatusTag(value, noticeTypeMap) },
                { title: '标题', dataIndex: 'title', width: 140 },
                { title: '门店', dataIndex: 'store', width: 130 },
                { title: '内容', dataIndex: 'content' },
                { title: '发布人', dataIndex: 'publisher', width: 120 },
                { title: '发布时间', dataIndex: 'publishAt', width: 170, render: (value: string) => formatDateTime(value) },
                { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, publishStatusMap) },
                {
                  title: '操作',
                  width: 120,
                  render: (_, record: NoticeRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setNotices((prev) =>
                            prev.map((item) =>
                              item.id === record.id
                                ? { ...item, status: item.status === 'PUBLISHED' ? 'PENDING' : 'PUBLISHED' }
                                : item
                            )
                          );
                          message.success('公告状态已更新');
                        }}
                      >
                        发布
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal title="新建运营任务" open={taskVisible} onOk={handleTaskSubmit} onCancel={() => { setTaskVisible(false); taskForm.resetFields(); }} width={820}>
        <Form form={taskForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="taskType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}><Select options={storeOperationTaskTypeOptions} /></Form.Item>
            <Form.Item name="priority" label="优先级"><Select options={ticketPriorityOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="task" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}><Input /></Form.Item>
            <Form.Item name="store" label="所属门店" rules={[{ required: true, message: '请输入所属门店' }]}><Input /></Form.Item>
            <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}><Input /></Form.Item>
            <Form.Item name="relatedDevice" label="关联设备"><Input /></Form.Item>
            <Form.Item name="deadline" label="截止时间"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={storeOperationTaskStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="result" label="处理结果"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="新建公告 / 排班" open={noticeVisible} onOk={handleNoticeSubmit} onCancel={() => { setNoticeVisible(false); noticeForm.resetFields(); }} width={820}>
        <Form form={noticeForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="noticeType" label="公告类型" rules={[{ required: true, message: '请选择公告类型' }]}><Select options={storeNoticeTypeOptions} /></Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
            <Form.Item name="store" label="门店" rules={[{ required: true, message: '请输入门店' }]}><Input /></Form.Item>
            <Form.Item name="publisher" label="发布人"><Input /></Form.Item>
            <Form.Item name="publishAt" label="发布时间"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}><Input.TextArea rows={4} /></Form.Item>
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

export default StoreOperationsManagement;
