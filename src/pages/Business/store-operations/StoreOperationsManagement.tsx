import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, message } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  publishStatusOptions,
  storeNoticeTypeOptions,
  storeOperationTaskStatusOptions,
  storeOperationTaskTypeOptions,
  ticketPriorityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { SelectOptionRecord, StoreNoticeRecord, StoreOperationTaskRecord, StoreOperationTaskSummaryRecord } from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const taskTypeMap = buildValueEnum(storeOperationTaskTypeOptions);
const taskStatusMap = buildValueEnum(storeOperationTaskStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);
const noticeTypeMap = buildValueEnum(storeNoticeTypeOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const pageData = <T,>(result: any) => ('data' in result ? result.data : result) as { records: T[]; total: number };

const taskDetailFields: DetailField<StoreOperationTaskRecord>[] = [
  { name: 'taskNo', label: '任务编号' },
  { name: 'taskType', label: '任务类型' },
  { name: 'task', label: '任务名称' },
  { name: 'store', label: '门店' },
  { name: 'relatedDevice', label: '关联设备' },
  { name: 'owner', label: '负责人' },
  { name: 'priority', label: '优先级' },
  { name: 'deadline', label: '截止时间' },
  { name: 'status', label: '状态' },
  { name: 'result', label: '处理结果' },
];

const noticeDetailFields: DetailField<StoreNoticeRecord>[] = [
  { name: 'noticeNo', label: '公告编号' },
  { name: 'noticeType', label: '公告类型' },
  { name: 'title', label: '标题' },
  { name: 'store', label: '门店' },
  { name: 'publisher', label: '发布人' },
  { name: 'publishAt', label: '发布时间' },
  { name: 'status', label: '状态' },
  { name: 'content', label: '内容' },
];

const StoreOperationsManagement: React.FC = () => {
  const [taskForm] = Form.useForm<StoreOperationTaskRecord>();
  const [noticeForm] = Form.useForm<StoreNoticeRecord>();
  const [tasks, setTasks] = useState<StoreOperationTaskRecord[]>([]);
  const [notices, setNotices] = useState<StoreNoticeRecord[]>([]);
  const [taskVisible, setTaskVisible] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<StoreOperationTaskRecord | null>(null);
  const [editingNotice, setEditingNotice] = useState<StoreNoticeRecord | null>(null);
  const [detail, setDetail] = useState<StoreOperationTaskRecord | StoreNoticeRecord | null>(null);
  const [taskSummary, setTaskSummary] = useState<StoreOperationTaskSummaryRecord>({ inspectCount: 0, pendingException: 0, overdueCount: 0, doneCount: 0 });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForStoreOps'], queryFn: async () => (await api.store.options()).data });
  const { data: deviceOptions } = useQuery({ queryKey: ['deviceOptionsForStoreOps'], queryFn: async () => (await api.device.options()).data });
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);
  const deviceOptionMap = useMemo(() => new Map((deviceOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [deviceOptions]);

  const summary = useMemo(() => ({ ...taskSummary, dutyCount: notices.filter((item) => item.noticeType === 'SHIFT').length, noticeCount: notices.length }), [notices, taskSummary]);

  const fetchTasks = async () => {
    const [result, summaryResult] = await Promise.all([
      api.storeOperationTask.page({ current: 1, size: 100 }),
      api.storeOperationTask.summary(),
    ]);
    setTasks(pageData<StoreOperationTaskRecord>(result).records || []);
    setTaskSummary('data' in summaryResult ? summaryResult.data : summaryResult);
  };

  const fetchNotices = async () => {
    const result = await api.storeNotice.page({ current: 1, size: 100 });
    setNotices(pageData<StoreNoticeRecord>(result).records || []);
  };

  const openTask = (record?: StoreOperationTaskRecord) => {
    setEditingTask(record || null);
    taskForm.resetFields();
    taskForm.setFieldsValue(record || { status: 'PENDING', priority: 'MEDIUM' });
    setTaskVisible(true);
  };

  const openNotice = (record?: StoreNoticeRecord) => {
    setEditingNotice(record || null);
    noticeForm.resetFields();
    noticeForm.setFieldsValue(record || { status: 'PENDING' });
    setNoticeVisible(true);
  };

  const handleTaskSubmit = async () => {
    const values = await taskForm.validateFields();
    if (editingTask) {
      await api.storeOperationTask.edit({ ...editingTask, ...values } as unknown as Record<string, unknown>);
      message.success('门店运营任务已更新');
    } else {
      await api.storeOperationTask.add(values as unknown as Record<string, unknown>);
      message.success('门店运营任务已创建');
    }
    setTaskVisible(false);
    setEditingTask(null);
    taskForm.resetFields();
    fetchTasks();
  };

  const handleNoticeSubmit = async () => {
    const values = await noticeForm.validateFields();
    if (editingNotice) {
      await api.storeNotice.edit({ ...editingNotice, ...values } as unknown as Record<string, unknown>);
      message.success('门店公告已更新');
    } else {
      await api.storeNotice.add(values as unknown as Record<string, unknown>);
      message.success('门店公告已创建');
    }
    setNoticeVisible(false);
    setEditingNotice(null);
    noticeForm.resetFields();
    fetchNotices();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店运营台" subtitle="从店长和区域运营视角查看排班、公告、巡检和异常处理，并支持直接维护运营任务。" icon={<ShopOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="今日待巡检">{summary.inspectCount} 项</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="待处理异常">{summary.pendingException} 单</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="超时任务">{summary.overdueCount} 单</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="门店公告">{summary.noticeCount} 条</Card></Col>
      </Row>

      <ProTable
        style={{ display: 'none' }}
        columns={[]}
        request={async () => {
          await Promise.all([fetchTasks(), fetchNotices()]);
          return { data: [], success: true };
        }}
        search={false}
        options={false}
        pagination={false}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="门店运营任务" extra={<Button type="primary" onClick={() => openTask()}>新建任务</Button>}>
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
                  width: 210,
                  render: (_, record: StoreOperationTaskRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button size="small" onClick={() => openTask(record)}>编辑</Button>
                      <Popconfirm title="确认推进该任务？" onConfirm={async () => { await api.storeOperationTask.updateStatus(record.id, { status: record.status === 'DONE' ? 'PROCESSING' : 'DONE', result: record.result }); message.success('任务状态已更新'); fetchTasks(); }}>
                        <Button size="small">{record.status === 'DONE' ? '恢复' : '完成'}</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="班次与公告" extra={<Button onClick={() => openNotice()}>新建公告 / 排班</Button>}>
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
                  width: 180,
                  render: (_, record: StoreNoticeRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button size="small" onClick={() => openNotice(record)}>编辑</Button>
                      <Popconfirm title="确认发布该公告？" onConfirm={async () => { await api.storeNotice.updateStatus(record.id, 'PUBLISHED'); message.success('公告已发布'); fetchNotices(); }}>
                        <Button size="small">发布</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal title={editingTask ? `编辑运营任务 · ${editingTask.task}` : '新建运营任务'} open={taskVisible} onOk={handleTaskSubmit} onCancel={() => { setTaskVisible(false); taskForm.resetFields(); }} width={820}>
        <Form form={taskForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="taskType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}><Select options={storeOperationTaskTypeOptions} /></Form.Item>
            <Form.Item name="priority" label="优先级"><Select options={ticketPriorityOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="task" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}><Input /></Form.Item>
            <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}><Select options={storeOptions as SelectOptionRecord[]} onChange={(value) => taskForm.setFieldValue('store', storeOptionMap.get(value))} /></Form.Item>
            <Form.Item name="store" label="门店名称"><Input disabled /></Form.Item>
            <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}><Input /></Form.Item>
            <Form.Item name="deviceId" label="关联设备"><Select options={deviceOptions as SelectOptionRecord[]} allowClear onChange={(value) => taskForm.setFieldValue('relatedDevice', deviceOptionMap.get(value))} /></Form.Item>
            <Form.Item name="relatedDevice" label="设备名称"><Input disabled /></Form.Item>
            <Form.Item name="deadline" label="截止时间"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={storeOperationTaskStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="result" label="处理结果"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={editingNotice ? `编辑公告 · ${editingNotice.title}` : '新建公告 / 排班'} open={noticeVisible} onOk={handleNoticeSubmit} onCancel={() => { setNoticeVisible(false); noticeForm.resetFields(); }} width={820}>
        <Form form={noticeForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="noticeType" label="公告类型" rules={[{ required: true, message: '请选择公告类型' }]}><Select options={storeNoticeTypeOptions} /></Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
            <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}><Select options={storeOptions as SelectOptionRecord[]} onChange={(value) => noticeForm.setFieldValue('store', storeOptionMap.get(value))} /></Form.Item>
            <Form.Item name="store" label="门店名称"><Input disabled /></Form.Item>
            <Form.Item name="publisher" label="发布人"><Input /></Form.Item>
            <Form.Item name="publishAt" label="发布时间"><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('task' in detail ? taskDetailFields : noticeDetailFields) as DetailField<Record<string, any>>[]} labelWidth={100} /> : null}
      </Modal>
    </div>
  );
};

export default StoreOperationsManagement;
