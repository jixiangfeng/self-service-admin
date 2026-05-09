import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ForkOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditStatusOptions,
  publishStatusOptions,
  ticketPriorityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { ApprovalProcessRecord, ApprovalRecord, ApprovalSlaRecord, ApprovalTaskRecord } from '@/services/backendService';

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);

const approvalDetailFields: Record<'process' | 'task' | 'record' | 'sla', DetailField<any>[]> = {
  process: [
    { name: 'processNo', label: '流程编号' },
    { name: 'processName', label: '流程名称' },
    { name: 'bizType', label: '业务类型' },
    { name: 'nodeConfig', label: '节点配置' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  task: [
    { name: 'taskNo', label: '任务编号' },
    { name: 'processNo', label: '流程编号' },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'currentNode', label: '当前节点' },
    { name: 'priority', label: '优先级' },
    { name: 'status', label: '状态' },
  ],
  record: [
    { name: 'recordNo', label: '记录编号' },
    { name: 'taskNo', label: '任务编号' },
    { name: 'nodeName', label: '节点' },
    { name: 'approver', label: '审批人' },
    { name: 'action', label: '动作' },
    { name: 'comment', label: '意见' },
    { name: 'approvedAt', label: '审批时间', render: (value) => formatDateTime(value) },
  ],
  sla: [
    { name: 'taskNo', label: '任务编号' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'currentNode', label: '当前节点' },
    { name: 'deadline', label: '截止时间', render: (value) => formatDateTime(value) },
    { name: 'owner', label: '负责人' },
    { name: 'status', label: '状态' },
  ],
};

const ApprovalFlowManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ApprovalProcessRecord | ApprovalTaskRecord | ApprovalRecord | ApprovalSlaRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const processQuery = useQuery({ queryKey: ['approvalProcesses', keyword], queryFn: async () => (await api.approval.processes.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const taskQuery = useQuery({ queryKey: ['approvalTasks', keyword], queryFn: async () => (await api.approval.tasks.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const recordQuery = useQuery({ queryKey: ['approvalRecords', keyword], queryFn: async () => (await api.approval.records.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const slaQuery = useQuery({ queryKey: ['approvalSlas', keyword], queryFn: async () => (await api.approval.slas.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const processes = processQuery.data?.records || [];
  const tasks = taskQuery.data?.records || [];
  const records = recordQuery.data?.records || [];
  const slas = slaQuery.data?.records || [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    if (title === '处理审批任务') {
      const target = tasks.find((item) => item.status === 'PENDING') || tasks[0];
      if (target) {
        form.setFieldsValue({ taskId: target.id, id: target.id, taskNo: target.taskNo, status: 'APPROVED' });
      }
    }
    setModalVisible(true);
  };

  const processColumns = useMemo<ProColumns<ApprovalProcessRecord>[]>(() => [
    { title: '流程编号', dataIndex: 'processNo', width: 180 },
    { title: '流程名称', dataIndex: 'processName', width: 200 },
    { title: '业务类型', dataIndex: 'bizType', width: 150 },
    { title: '节点配置', dataIndex: 'nodeConfig', width: 260 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const taskColumns = useMemo<ProColumns<ApprovalTaskRecord>[]>(() => [
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '流程编号', dataIndex: 'processNo', width: 180 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '当前节点', dataIndex: 'currentNode', width: 130 },
    { title: '优先级', dataIndex: 'priority', width: 120, render: (_, record) => renderStatusTag(record.priority, priorityMap) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => { form.resetFields(); form.setFieldsValue({ taskId: record.id, id: record.id, taskNo: record.taskNo, status: 'APPROVED' }); setModalTitle('处理审批任务'); setModalVisible(true); }}>处理</Button>
      </>
    ) },
  ], [form]);

  const recordColumns = useMemo<ProColumns<ApprovalRecord>[]>(() => [
    { title: '记录编号', dataIndex: 'recordNo', width: 180 },
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '节点', dataIndex: 'nodeName', width: 130 },
    { title: '审批人', dataIndex: 'approver', width: 130 },
    { title: '动作', dataIndex: 'action', width: 100 },
    { title: '意见', dataIndex: 'comment', width: 240 },
    { title: '审批时间', dataIndex: 'approvedAt', width: 180, render: (_, record) => formatDateTime(record.approvedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const slaColumns = useMemo<ProColumns<ApprovalSlaRecord>[]>(() => [
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '当前节点', dataIndex: 'currentNode', width: 130 },
    { title: '截止时间', dataIndex: 'deadline', width: 180, render: (_, record) => formatDateTime(record.deadline) },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="审批流中心" subtitle="维护审批流程定义、审批任务、审批记录和超时待办。" icon={<ForkOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="流程定义" value={processes.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审任务" value={tasks.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="审批记录" value={records.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="超时关注" value={slas.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入流程、任务、业务单号、审批人关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'process', label: '流程定义', children: <ProTable<ApprovalProcessRecord> cardBordered rowKey="id" columns={processColumns} dataSource={processes} loading={processQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建审批流程')}>新建流程</Button>]} /> },
          { key: 'task', label: '审批任务', children: <ProTable<ApprovalTaskRecord> cardBordered rowKey="id" columns={taskColumns} dataSource={tasks} loading={taskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="audit" type="primary" disabled={!tasks.length} onClick={() => openModal('处理审批任务')}>处理任务</Button>]} /> },
          { key: 'record', label: '审批记录', children: <ProTable<ApprovalRecord> cardBordered rowKey="id" columns={recordColumns} dataSource={records} loading={recordQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} /> },
          { key: 'sla', label: '超时待办', children: <ProTable<ApprovalSlaRecord> cardBordered rowKey="id" columns={slaColumns} dataSource={slas} loading={slaQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="urge" type="primary" onClick={() => openModal('催办审批任务')}>催办</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('processName' in detail ? approvalDetailFields.process : 'recordNo' in detail ? approvalDetailFields.record : 'deadline' in detail ? approvalDetailFields.sla : approvalDetailFields.task) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle.includes('流程')) {
            await api.approval.processes.add(values);
            queryClient.invalidateQueries({ queryKey: ['approvalProcesses'] });
            message.success('审批流程已保存');
          } else if (modalTitle.includes('处理')) {
            const id = Number(values.id || values.taskId);
            if (!id) {
              setModalVisible(false);
              return;
            }
            await api.approval.tasks.handle(id, values);
            queryClient.invalidateQueries({ queryKey: ['approvalTasks'] });
            queryClient.invalidateQueries({ queryKey: ['approvalRecords'] });
            message.success('审批任务已处理');
          } else {
            await api.approval.slas.add(values);
            queryClient.invalidateQueries({ queryKey: ['approvalSlas'] });
            message.success('审批SLA已保存');
          }
          setModalVisible(false);
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="id" label="任务ID"><Input /></Form.Item>
            <Form.Item name="processNo" label="流程编号"><Input /></Form.Item>
            <Form.Item name="processName" label="流程名称"><Input /></Form.Item>
            <Form.Item name="taskNo" label="任务编号"><Input /></Form.Item>
            <Form.Item name="bizType" label="业务类型"><Input /></Form.Item>
            <Form.Item name="bizNo" label="业务单号"><Input /></Form.Item>
            <Form.Item name="currentNode" label="当前节点"><Input /></Form.Item>
            <Form.Item name="priority" label="优先级"><Select options={ticketPriorityOptions} /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item name="deadline" label="截止时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="nodeConfig" label="节点配置"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item className="modal-span-2" name="comment" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalFlowManagement;
