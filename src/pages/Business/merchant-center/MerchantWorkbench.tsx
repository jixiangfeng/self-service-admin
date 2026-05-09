import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  merchantTodoCategoryOptions,
  settlementStatusOptions,
  storeStatusOptions,
  ticketPriorityOptions,
  todoStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { MerchantTodoRecord, MerchantWorkbenchStoreOverviewRecord, SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';

const priorityMap = buildValueEnum(ticketPriorityOptions);
const todoStatusMap = buildValueEnum(todoStatusOptions);
const todoCategoryMap = buildValueEnum(merchantTodoCategoryOptions);
const settlementStatusMap = buildValueEnum(settlementStatusOptions);
const storeStatusMap = buildValueEnum(storeStatusOptions);
const pageData = <T,>(result: any) => ('data' in result ? result.data : result) as { records: T[]; total: number };

const todoDetailFields: DetailField<MerchantTodoRecord>[] = [
  { name: 'title', label: '待办标题' },
  { name: 'merchantName', label: '商户' },
  { name: 'relatedStore', label: '关联门店' },
  { name: 'category', label: '分类' },
  { name: 'owner', label: '负责人' },
  { name: 'priority', label: '优先级' },
  { name: 'status', label: '状态' },
  { name: 'relatedNo', label: '关联单号' },
  { name: 'deadline', label: '截止时间' },
  { name: 'remark', label: '备注' },
];

const storeOverviewDetailFields: DetailField<MerchantWorkbenchStoreOverviewRecord>[] = [
  { name: 'store', label: '门店' },
  { name: 'manager', label: '负责人' },
  { name: 'orders', label: '订单数' },
  { name: 'revenue', label: '营收', render: (value) => formatAmount(value) },
  { name: 'activeCampaigns', label: '活动数' },
  { name: 'afterSaleCount', label: '售后数' },
  { name: 'settlementStatus', label: '结算状态' },
  { name: 'status', label: '门店状态' },
];

const MerchantWorkbench: React.FC = () => {
  const [taskForm] = Form.useForm<MerchantTodoRecord>();
  const [todos, setTodos] = useState<MerchantTodoRecord[]>([]);
  const [stores, setStores] = useState<MerchantWorkbenchStoreOverviewRecord[]>([]);
  const [overview, setOverview] = useState({ storeCount: 0, revenue: 0, runningCampaigns: 0, pendingSettlement: 0 });
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<MerchantTodoRecord | null>(null);
  const [detail, setDetail] = useState<MerchantTodoRecord | MerchantWorkbenchStoreOverviewRecord | null>(null);

  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForWorkbench'], queryFn: async () => (await api.merchant.options()).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForWorkbench'], queryFn: async () => (await api.store.options()).data });
  const merchantOptionMap = useMemo(() => new Map((merchantOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);

  const fetchTodos = async () => {
    const result = await api.merchantTodo.page({ current: 1, size: 100 });
    setTodos(pageData<MerchantTodoRecord>(result).records || []);
  };

  const fetchOverview = async () => {
    const result = await api.merchantWorkbench.overview();
    const data = 'data' in result ? result.data : result;
    setStores(data.stores || []);
    setOverview({
      storeCount: data.storeCount || 0,
      revenue: Number(data.revenue || 0),
      runningCampaigns: data.runningCampaigns || 0,
      pendingSettlement: data.pendingSettlement || 0,
    });
  };

  const closeTaskModal = () => {
    setTaskModalVisible(false);
    setEditingTask(null);
    taskForm.resetFields();
  };

  const handleTaskSubmit = async () => {
    const values = await taskForm.validateFields();
    if (editingTask) {
      await api.merchantTodo.edit({ ...editingTask, ...values } as unknown as Record<string, unknown>);
      message.success('待办事项已更新');
    } else {
      await api.merchantTodo.add(values as unknown as Record<string, unknown>);
      message.success('待办事项已创建');
    }
    closeTaskModal();
    fetchTodos();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户后台" subtitle="从商户视角查看门店经营、活动、结算和待办事项，并支持直接维护日常经营任务。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="商户门店数" value={overview.storeCount} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="本周营收" value={formatAmount(overview.revenue)} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="运行中活动" value={overview.runningCampaigns} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认结算单" value={overview.pendingSettlement} suffix="张" /></Card></Col>
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
                { title: '负责人', dataIndex: 'owner', width: 120 },
                { title: '关联门店', dataIndex: 'relatedStore', width: 140 },
                { title: '关联单号', dataIndex: 'relatedNo', width: 140 },
                { title: '截止时间', dataIndex: 'deadline', width: 160 },
                { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => renderStatusTag(value, priorityMap) },
                { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => renderStatusTag(value, todoStatusMap) },
                {
                  title: '操作',
                  width: 220,
                  render: (_, record: MerchantTodoRecord) => (
                    <Space size="small">
                      <Button size="small" onClick={() => setDetail(record)}>详情</Button>
                      <Button size="small" onClick={() => { setEditingTask(record); taskForm.setFieldsValue(record); setTaskModalVisible(true); }}>编辑</Button>
                      <Popconfirm title="确认更新待办状态？" onConfirm={async () => { await api.merchantTodo.changeStatus(record.id, record.status === 'DONE' ? 'PENDING' : 'DONE'); message.success('待办状态已更新'); fetchTodos(); }}>
                        <Button size="small">{record.status === 'DONE' ? '恢复' : '完成'}</Button>
                      </Popconfirm>
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
                { title: '负责人', dataIndex: 'manager', width: 110 },
                { title: '订单数', dataIndex: 'orders', width: 80 },
                { title: '营收', dataIndex: 'revenue', width: 110, render: (value: number) => formatAmount(value) },
                { title: '活动数', dataIndex: 'activeCampaigns', width: 80 },
                { title: '售后数', dataIndex: 'afterSaleCount', width: 80 },
                { title: '结算状态', dataIndex: 'settlementStatus', width: 110, render: (value: string) => renderStatusTag(value, settlementStatusMap) },
                { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => renderStatusTag(value, storeStatusMap) },
                { title: '操作', width: 100, render: (_, record: MerchantWorkbenchStoreOverviewRecord) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <ProTable
        style={{ display: 'none' }}
        columns={[]}
        request={async () => {
          await Promise.all([fetchTodos(), fetchOverview()]);
          return { data: [], success: true };
        }}
        search={false}
        options={false}
        pagination={false}
      />

      <Modal title={editingTask ? `编辑待办 · ${editingTask.title}` : '新建待办'} open={taskModalVisible} onOk={handleTaskSubmit} onCancel={closeTaskModal} width={820}>
        <Form form={taskForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item className="modal-span-2" name="title" label="待办标题" rules={[{ required: true, message: '请输入待办标题' }]}><Input /></Form.Item>
            <Form.Item name="merchantId" label="商户"><Select options={merchantOptions as SelectOptionRecord[]} allowClear onChange={(value) => taskForm.setFieldValue('merchantName', merchantOptionMap.get(value))} /></Form.Item>
            <Form.Item name="merchantName" label="商户名称"><Input disabled /></Form.Item>
            <Form.Item name="storeId" label="门店"><Select options={storeOptions as SelectOptionRecord[]} allowClear onChange={(value) => taskForm.setFieldsValue({ relatedStore: storeOptionMap.get(value) })} /></Form.Item>
            <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}><Input /></Form.Item>
            <Form.Item name="deadline" label="截止时间"><Input /></Form.Item>
            <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}><Select options={ticketPriorityOptions} /></Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={todoStatusOptions} /></Form.Item>
            <Form.Item name="category" label="所属分类"><Select options={merchantTodoCategoryOptions} /></Form.Item>
            <Form.Item name="relatedStore" label="关联门店"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="relatedNo" label="关联单号"><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={780}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('title' in detail ? todoDetailFields : storeOverviewDetailFields) as DetailField<Record<string, any>>[]} labelWidth={100} /> : null}
      </Modal>
    </div>
  );
};

export default MerchantWorkbench;
