import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ForkOutlined, NodeIndexOutlined } from '@ant-design/icons';
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
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { ApprovalProcessRecord, ApprovalRecord, ApprovalSlaRecord, ApprovalTaskRecord } from '@/services/backendService';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue } from '@/utils/formControls';


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};


const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);
const approvalNodeOptions = [
  { value: 'STORE_MANAGER', label: '门店负责人' },
  { value: 'MERCHANT_ADMIN', label: '商户管理员' },
  { value: 'FINANCE', label: '财务审核' },
  { value: 'PLATFORM_OPS', label: '平台运营' },
];
const approvalActionOptions = [
  { value: 'APPROVED', label: '通过' },
  { value: 'REJECTED', label: '驳回' },
  { value: 'TRANSFER', label: '转交' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

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
    form.setFieldsValue({
      nodeOne: 'STORE_MANAGER',
      nodeTwo: 'PLATFORM_OPS',
      action: 'APPROVED',
      priority: 'MEDIUM',
      status: title.includes('流程') ? 'PUBLISHED' : 'PENDING',
    });
    if (title === '处理审批任务') {
      const target = tasks.find((item) => item.status === 'PENDING') || tasks[0];
      if (target) {
        form.setFieldsValue({ taskId: target.id, id: target.id, taskNo: target.taskNo, status: 'APPROVED', action: 'APPROVED' });
      }
    }
    setModalVisible(true);
  };

  const processColumns = useMemo<ProColumns<ApprovalProcessRecord>[]>(() => [
    { title: '流程编号', dataIndex: 'processNo', width: 180 },
    { title: '流程名称', dataIndex: 'processName', width: 200 },
    { title: '业务类型', dataIndex: 'bizType', width: 150 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
    { title: '节点配置', dataIndex: 'nodeConfig', width: 260 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const taskColumns = useMemo<ProColumns<ApprovalTaskRecord>[]>(() => [
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '流程编号', dataIndex: 'processNo', width: 180 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入流程、任务、业务单号、审批人关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'process', label: '流程定义', children: <ProTable<ApprovalProcessRecord> cardBordered rowKey="id" columns={processColumns} dataSource={processes} loading={processQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建审批流程')}>新建流程</Button>]} /> },
          { key: 'task', label: '审批任务', children: <ProTable<ApprovalTaskRecord> cardBordered rowKey="id" columns={taskColumns} dataSource={tasks} loading={taskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="audit" type="primary" disabled={!tasks.length} onClick={() => openModal('处理审批任务')}>处理任务</Button>]} /> },
          { key: 'record', label: '审批记录', children: <ProTable<ApprovalRecord> cardBordered rowKey="id" columns={recordColumns} dataSource={records} loading={recordQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} /> },
          { key: 'sla', label: '超时待办', children: <ProTable<ApprovalSlaRecord> cardBordered rowKey="id" columns={slaColumns} dataSource={slas} loading={slaQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="urge" type="primary" onClick={() => openModal('催办审批任务')}>催办</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="审批流详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('processName' in detail ? approvalDetailFields.process : 'recordNo' in detail ? approvalDetailFields.record : 'deadline' in detail ? approvalDetailFields.sla : approvalDetailFields.task) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="审批流配置"
        title={modalTitle}
        subtitle="把审批节点、处理动作、负责人和时限拆成可维护字段，提交时生成节点配置和审批意见。"
        meta={[modalTitle || '审批流', '平台运营']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          const nodeConfig = compactJoin([
            values.nodeOne ? `一级节点：${optionLabel(approvalNodeOptions, String(values.nodeOne))}` : undefined,
            values.nodeTwo ? `二级节点：${optionLabel(approvalNodeOptions, String(values.nodeTwo))}` : undefined,
            values.owner ? `负责人：${values.owner}` : undefined,
          ]);
          const comment = compactJoin([
            values.action ? `处理动作：${optionLabel(approvalActionOptions, String(values.action))}` : undefined,
            values.currentNode ? `当前节点：${values.currentNode}` : undefined,
            values.supplement ? `补充说明：${values.supplement}` : undefined,
          ]);
          if (modalTitle.includes('流程')) {
            await api.approval.processes.add({ ...values, nodeConfig, remark: comment });
            queryClient.invalidateQueries({ queryKey: ['approvalProcesses'] });
            message.success('审批流程已保存');
          } else if (modalTitle.includes('处理')) {
            const id = Number(values.id || values.taskId);
            if (!id) {
              setModalVisible(false);
              return;
            }
            await api.approval.tasks.handle(id, { ...values, comment, status: values.action || values.status });
            queryClient.invalidateQueries({ queryKey: ['approvalTasks'] });
            queryClient.invalidateQueries({ queryKey: ['approvalRecords'] });
            message.success('审批任务已处理');
          } else {
            await api.approval.slas.add({ ...values, currentNode: values.currentNode || optionLabel(approvalNodeOptions, String(values.nodeOne)), remark: comment });
            queryClient.invalidateQueries({ queryKey: ['approvalSlas'] });
            message.success('审批SLA已保存');
          }
          setModalVisible(false);
        }}
        width={1080}
        okText="保存审批配置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ForkOutlined />} title="流程对象" desc="维护流程、任务和业务单号。">
              <div className="merchant-editor-fields">
                <Form.Item name="id" label="任务ID"><Input placeholder="处理审批任务时自动带入" /></Form.Item>
                <Form.Item name="processNo" label="流程编号"><Input placeholder="例如：AP-SETTLE" /></Form.Item>
                <Form.Item name="processName" label="流程名称"><Input placeholder="例如：结算单审批" /></Form.Item>
                <Form.Item name="taskNo" label="任务编号"><Input placeholder="例如：TASK-20260510-001" /></Form.Item>
                <Form.Item name="bizType" label="业务类型"><Input placeholder="例如：SETTLEMENT" /></Form.Item>
                <Form.Item name="bizNo" label="业务单号"><Input placeholder="请输入业务单号" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<NodeIndexOutlined />} title="审批节点" desc="选择一级、二级审批节点和当前节点。">
              <div className="merchant-editor-fields">
                <Form.Item name="nodeOne" label="一级节点"><Select options={approvalNodeOptions} placeholder="请选择一级节点" /></Form.Item>
                <Form.Item name="nodeTwo" label="二级节点"><Select options={approvalNodeOptions} placeholder="请选择二级节点" /></Form.Item>
                <Form.Item name="currentNode" label="当前节点"><Input placeholder="例如：财务审核" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ClockCircleOutlined />} title="优先级与时限" desc="配置优先级、负责人、截止时间和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="priority" label="优先级"><Select options={ticketPriorityOptions} placeholder="请选择优先级" /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input placeholder="例如：财务-王敏" /></Form.Item>
                <Form.Item name="deadline" label="截止时间"><DateTimeField /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理动作" desc="选择审批动作并补充简要说明，系统合并为审批意见。">
              <div className="merchant-editor-fields">
                <Form.Item name="action" label="处理动作"><Select options={approvalActionOptions} placeholder="请选择处理动作" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：资料齐全，同意进入下一步" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ApprovalFlowManagement;
