import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Table, message } from 'antd';
import { CheckCircleOutlined, FieldTimeOutlined, NotificationOutlined, ShopOutlined, ToolOutlined } from '@ant-design/icons';
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
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
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
  const selectedTaskStoreId = Form.useWatch('storeId', taskForm);
  const [tasks, setTasks] = useState<StoreOperationTaskRecord[]>([]);
  const [notices, setNotices] = useState<StoreNoticeRecord[]>([]);
  const [taskVisible, setTaskVisible] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<StoreOperationTaskRecord | null>(null);
  const [editingNotice, setEditingNotice] = useState<StoreNoticeRecord | null>(null);
  const [detail, setDetail] = useState<StoreOperationTaskRecord | StoreNoticeRecord | null>(null);
  const [taskSummary, setTaskSummary] = useState<StoreOperationTaskSummaryRecord>({ inspectCount: 0, pendingException: 0, overdueCount: 0, doneCount: 0 });
  const [storeId, setStoreId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForStoreOps'], queryFn: async () => (await api.store.options()).data });
  const deviceQueryStoreId = selectedTaskStoreId || storeId;
  const { data: deviceOptions } = useQuery({
    queryKey: ['deviceOptionsForStoreOps', deviceQueryStoreId],
    queryFn: async () => (await api.device.options(deviceQueryStoreId ? { storeId: deviceQueryStoreId } : undefined)).data,
  });
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);
  const deviceOptionMap = useMemo(() => new Map((deviceOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [deviceOptions]);

  const summary = useMemo(() => ({ ...taskSummary, dutyCount: notices.filter((item) => item.noticeType === 'SHIFT').length, noticeCount: notices.length }), [notices, taskSummary]);

  const fetchTasks = async (targetStoreId = storeId) => {
    const [result, summaryResult] = await Promise.all([
      api.storeOperationTask.page({ current: 1, size: 100, storeId: targetStoreId }),
      api.storeOperationTask.summary(targetStoreId ? { storeId: targetStoreId } : undefined),
    ]);
    setTasks(pageData<StoreOperationTaskRecord>(result).records || []);
    setTaskSummary('data' in summaryResult ? summaryResult.data : summaryResult);
  };

  const fetchNotices = async (targetStoreId = storeId) => {
    const result = await api.storeNotice.page({ current: 1, size: 100, storeId: targetStoreId });
    setNotices(pageData<StoreNoticeRecord>(result).records || []);
  };

  const reload = async (targetStoreId = storeId) => {
    setLoading(true);
    try {
      await Promise.all([fetchTasks(targetStoreId), fetchNotices(targetStoreId)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const openTask = (record?: StoreOperationTaskRecord) => {
    setEditingTask(record || null);
    taskForm.resetFields();
    taskForm.setFieldsValue(record || { storeId, store: storeId ? storeOptionMap.get(storeId) : undefined, status: 'PENDING', priority: 'MEDIUM' });
    setTaskVisible(true);
  };

  const openNotice = (record?: StoreNoticeRecord) => {
    setEditingNotice(record || null);
    noticeForm.resetFields();
    noticeForm.setFieldsValue(record || { storeId, store: storeId ? storeOptionMap.get(storeId) : undefined, status: 'PENDING' });
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
    await reload();
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
    await reload();
  };

  const confirmTaskStatus = (record: StoreOperationTaskRecord) => {
    showBusinessConfirm({
      eyebrow: '任务状态确认',
      title: `确认${record.status === 'DONE' ? '恢复' : '完成'}该运营任务`,
      content: `任务「${record.task}」状态更新后，将影响门店运营任务统计和异常处理闭环。`,
      okText: '确认更新',
      danger: false,
      onOk: async () => {
        await api.storeOperationTask.updateStatus(record.id, {
          status: record.status === 'DONE' ? 'PROCESSING' : 'DONE',
          result: record.result,
        });
        message.success('任务状态已更新');
        await reload();
      },
    });
  };

  const confirmNoticePublish = (record: StoreNoticeRecord) => {
    showBusinessConfirm({
      eyebrow: '发布确认',
      title: '确认发布该公告',
      content: `公告「${record.title}」发布后，将面向配置范围内的门店运营人员展示。`,
      okText: '确认发布',
      danger: false,
      onOk: async () => {
        await api.storeNotice.updateStatus(record.id, 'PUBLISHED');
        message.success('公告已发布');
        await reload();
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店运营台" subtitle="从店长和区域运营视角查看排班、公告、巡检和异常处理，并支持直接维护运营任务。" icon={<ShopOutlined />} />

      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="门店视角">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={storeOptions as SelectOptionRecord[]}
            placeholder="全部门店"
            style={{ width: 280 }}
            value={storeId}
            onChange={(value) => {
              setStoreId(value);
              void reload(value);
            }}
          />
        </Form.Item>
        <Form.Item>
          <Button onClick={() => reload()}>刷新</Button>
        </Form.Item>
      </Form>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card title="今日待巡检">{summary.inspectCount} 项</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="待处理异常">{summary.pendingException} 单</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="超时任务">{summary.overdueCount} 单</Card></Col>
        <Col xs={24} sm={12} xl={6}><Card title="门店公告">{summary.noticeCount} 条</Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="门店运营任务" extra={<Button type="primary" onClick={() => openTask()}>新建任务</Button>}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={tasks}
              loading={loading}
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
                      <Button size="small" onClick={() => confirmTaskStatus(record)}>{record.status === 'DONE' ? '恢复' : '完成'}</Button>
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
              loading={loading}
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
                      <Button size="small" onClick={() => confirmNoticePublish(record)}>发布</Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <BusinessEditorModal
        eyebrow={editingTask ? '运营任务维护' : '运营任务创建'}
        title={editingTask ? `编辑运营任务 · ${editingTask.task}` : '新建运营任务'}
        subtitle="任务需要明确门店、负责人、关联设备、截止时间和处理结果，才能支撑巡检、异常和设备维护闭环。"
        meta={['任务闭环', editingTask ? '编辑模式' : '新建模式']}
        open={taskVisible}
        onOk={handleTaskSubmit}
        onCancel={() => { setTaskVisible(false); taskForm.resetFields(); }}
        width={1080}
        okText={editingTask ? '保存变更' : '创建任务'}
      >
        <Form form={taskForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<ToolOutlined />}
              title="任务定义"
              desc="定义任务类型、名称和优先级，明确这是一条巡检、维护、公告更新还是异常处理任务。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="taskType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}><Select options={storeOperationTaskTypeOptions} placeholder="请选择任务类型" /></Form.Item>
                <Form.Item name="priority" label="优先级"><Select options={ticketPriorityOptions} placeholder="请选择优先级" /></Form.Item>
                <Form.Item name="status" label="任务状态"><Select options={storeOperationTaskStatusOptions} placeholder="请选择任务状态" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="task" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}><Input placeholder="例如：A 区高压水枪异常巡检" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="门店与设备"
              desc="把任务落到具体门店和设备，保证运营人员可以按现场对象处理并回填结果。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}><Select showSearch optionFilterProp="label" options={storeOptions as SelectOptionRecord[]} placeholder="请选择门店" onChange={(value) => taskForm.setFieldsValue({ store: storeOptionMap.get(value), deviceId: undefined, relatedDevice: undefined })} /></Form.Item>
                <Form.Item name="store" label="门店名称"><Input disabled placeholder="选择门店后自动带出" /></Form.Item>
                <Form.Item name="deviceId" label="关联设备"><Select showSearch optionFilterProp="label" options={deviceOptions as SelectOptionRecord[]} allowClear placeholder="可选，绑定设备任务时选择" onChange={(value) => taskForm.setFieldValue('relatedDevice', deviceOptionMap.get(value))} /></Form.Item>
                <Form.Item name="relatedDevice" label="设备名称"><Input disabled placeholder="选择设备后自动带出" /></Form.Item>
                <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}><Input placeholder="现场负责人或区域运营" /></Form.Item>
                <Form.Item name="deadline" label="截止时间"><Input placeholder="例如：2026-05-10 18:00:00" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<CheckCircleOutlined />}
              title="处理结果"
              desc="记录排查结论、处理动作、遗留风险或下一步跟进，便于运营复盘。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="result" label="处理结果"><Input.TextArea rows={4} placeholder="填写处理动作、照片链接、设备恢复情况或下一步计划" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow={editingNotice ? '公告排班维护' : '公告排班创建'}
        title={editingNotice ? `编辑公告 · ${editingNotice.title}` : '新建公告 / 排班'}
        subtitle="公告和排班要绑定门店、发布人、发布时间和内容，用于同步现场运营、价格调整和维护安排。"
        meta={['公告闭环', editingNotice ? '编辑模式' : '新建模式']}
        open={noticeVisible}
        onOk={handleNoticeSubmit}
        onCancel={() => { setNoticeVisible(false); noticeForm.resetFields(); }}
        width={980}
        okText={editingNotice ? '保存变更' : '创建公告'}
      >
        <Form form={noticeForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<NotificationOutlined />}
              title="公告基础"
              desc="定义公告类型、标题和发布状态，支持门店公告、排班、价格调整和维护通知。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="noticeType" label="公告类型" rules={[{ required: true, message: '请选择公告类型' }]}><Select options={storeNoticeTypeOptions} placeholder="请选择公告类型" /></Form.Item>
                <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input placeholder="例如：夜间维护暂停 A 区洗车位" /></Form.Item>
                <Form.Item name="status" label="发布状态"><Select options={publishStatusOptions} placeholder="请选择发布状态" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="发布范围"
              desc="选择公告作用门店并记录发布人、发布时间，确保门店运营和前端展示口径一致。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}><Select showSearch optionFilterProp="label" options={storeOptions as SelectOptionRecord[]} placeholder="请选择门店" onChange={(value) => noticeForm.setFieldValue('store', storeOptionMap.get(value))} /></Form.Item>
                <Form.Item name="store" label="门店名称"><Input disabled placeholder="选择门店后自动带出" /></Form.Item>
                <Form.Item name="publisher" label="发布人"><Input placeholder="例如：区域运营-王敏" /></Form.Item>
                <Form.Item name="publishAt" label="发布时间"><Input placeholder="例如：2026-05-10 09:00:00" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<FieldTimeOutlined />}
              title="内容说明"
              desc="写清执行时间、影响范围、用户提示和现场注意事项，方便门店和客服同步。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--single">
                <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}><Input.TextArea rows={4} placeholder="填写公告正文、排班安排或维护说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title={detail && 'taskNo' in detail ? '运营任务详情' : '门店公告详情'} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('task' in detail ? taskDetailFields : noticeDetailFields) as DetailField<Record<string, any>>[]} labelWidth={100} /> : null}
      </BusinessDetailModal>
    </div>
  );
};

export default StoreOperationsManagement;
