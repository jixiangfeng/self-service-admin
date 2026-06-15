import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { ClockCircleOutlined, FileOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auditStatusOptions, publishStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, {
  type AlarmRecord,
  type ApprovalTaskRecord,
  type FileAssetRecord,
  type ImportExportTaskRecord,
  type RiskHitRecord,
  type ScheduledJobRecord,
} from '@/services/backendService';

const auditStatusMap = buildValueEnum(auditStatusOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const taskTypeOptions = [
  { value: 'IMPORT', label: '导入' },
  { value: 'EXPORT', label: '导出' },
];
const fileTypeOptions = [
  { value: 'OPS', label: '运营文件' },
  { value: 'SETTLEMENT', label: '结算文件' },
  { value: 'MERCHANT', label: '商户文件' },
];
const jobCycleOptions = [
  { value: 'DAILY', label: '每天执行' },
  { value: 'WEEKLY', label: '每周执行' },
  { value: 'MANUAL', label: '手动执行' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const supportDetailFields: Record<'file' | 'approval' | 'task' | 'risk' | 'job' | 'alarm', DetailField<any>[]> = {
  file: [
    { name: 'fileName', label: '文件名' },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'fileType', label: '文件类型' },
    { name: 'uploader', label: '上传人' },
    { name: 'status', label: '状态' },
    { name: 'uploadedAt', label: '上传时间', render: (value) => formatDateTime(value) },
  ],
  approval: [
    { name: 'processNo', label: '审批单号' },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'applicant', label: '申请人' },
    { name: 'currentNode', label: '当前节点' },
    { name: 'approver', label: '审批人' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  task: [
    { name: 'taskNo', label: '任务号' },
    { name: 'taskType', label: '任务类型' },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'fileName', label: '文件名' },
    { name: 'operator', label: '操作人' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  risk: [
    { name: 'ruleName', label: '规则' },
    { name: 'bizId', label: '命中对象' },
    { name: 'riskScene', label: '命中类型' },
    { name: 'actionType', label: '处置动作' },
    { name: 'handleStatus', label: '状态' },
    { name: 'appUserName', label: '用户' },
    { name: 'createdAt', label: '命中时间', render: (value) => formatDateTime(value) },
  ],
  job: [
    { name: 'jobCode', label: '任务编码' },
    { name: 'jobName', label: '任务名称' },
    { name: 'cronExpression', label: '执行计划' },
    { name: 'jobHandler', label: '处理场景' },
    { name: 'jobParam', label: '执行策略' },
    { name: 'status', label: '状态' },
  ],
  alarm: [
    { name: 'ruleName', label: '规则' },
    { name: 'alarmScene', label: '告警类型' },
    { name: 'bizId', label: '来源' },
    { name: 'alarmLevel', label: '等级' },
    { name: 'handleStatus', label: '状态' },
    { name: 'handledBy', label: '负责人' },
    { name: 'createdAt', label: '触发时间', render: (value) => formatDateTime(value) },
  ],
};
const OperationsSupportManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<FileAssetRecord | ApprovalTaskRecord | ImportExportTaskRecord | RiskHitRecord | ScheduledJobRecord | AlarmRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [form] = Form.useForm<{ name: string; owner: string; fileType?: string; taskType?: string; bizType?: string; bizNo?: string; jobCycle?: string; handler?: string; status?: string; supplement?: string }>();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const fileQuery = useQuery({ queryKey: ['ops-support-files', queryParams], queryFn: () => api.file.assets.page(queryParams) });
  const approvalQuery = useQuery({ queryKey: ['ops-support-approvals', queryParams], queryFn: () => api.approval.tasks.page(queryParams) });
  const taskQuery = useQuery({ queryKey: ['ops-support-import-export-tasks', queryParams], queryFn: () => api.file.importExportTasks.page(queryParams) });
  const riskQuery = useQuery({ queryKey: ['ops-support-risks', queryParams], queryFn: () => api.riskScheduleAlarm.riskHits.page(queryParams) });
  const jobQuery = useQuery({ queryKey: ['ops-support-jobs', queryParams], queryFn: () => api.riskScheduleAlarm.jobs.page(queryParams) });
  const alarmQuery = useQuery({ queryKey: ['ops-support-alarms', queryParams], queryFn: () => api.riskScheduleAlarm.alarms.page(queryParams) });

  const fileAssets = fileQuery.data?.data.records ?? [];
  const approvals = approvalQuery.data?.data.records ?? [];
  const tasks = taskQuery.data?.data.records ?? [];
  const risks = riskQuery.data?.data.records ?? [];
  const jobs = jobQuery.data?.data.records ?? [];
  const alarms = alarmQuery.data?.data.records ?? [];

  const fileColumns = useMemo<ProColumns<FileAssetRecord>[]>(() => [
    { title: '文件名', dataIndex: 'fileName', width: 220 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
    { title: '业务单号', dataIndex: 'bizNo', width: 160 },
    { title: '文件类型', dataIndex: 'fileType', width: 100 , render: (value) => formatEnumText(value, 'fileType', '文件类型') },
    { title: '上传人', dataIndex: 'uploader', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '上传时间', dataIndex: 'uploadedAt', width: 180, render: (_, record) => formatDateTime(record.uploadedAt || record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const approvalColumns = useMemo<ProColumns<ApprovalTaskRecord>[]>(() => [
    { title: '审批单号', dataIndex: 'processNo', width: 180 },
    { title: '业务类型', dataIndex: 'bizType', width: 150 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
    { title: '业务单号', dataIndex: 'bizNo', width: 160 },
    { title: '申请人', dataIndex: 'applicant', width: 120 },
    { title: '当前节点', dataIndex: 'currentNode', width: 120 },
    { title: '审批人', dataIndex: 'approver', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 120, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>审批流</Button> },
  ], []);

  const taskColumns = useMemo<ProColumns<ImportExportTaskRecord>[]>(() => [
    { title: '任务号', dataIndex: 'taskNo', width: 180 },
    { title: '任务类型', dataIndex: 'taskType', width: 100 , render: (value) => formatEnumText(value, 'taskType', '任务类型') },
    { title: '业务类型', dataIndex: 'bizType', width: 140 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
    { title: '文件名', dataIndex: 'fileName', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" onClick={async () => {
            await api.file.importExportTasks.run(record.id);
            await queryClient.invalidateQueries({ queryKey: ['ops-support-import-export-tasks'] });
            message.success('任务状态已更新');
          }}>执行</Button>
        </>
      ),
    },
  ], [queryClient]);

  const riskColumns = useMemo<ProColumns<RiskHitRecord>[]>(() => [
    { title: '规则', dataIndex: 'ruleName', width: 180 },
    { title: '命中对象', dataIndex: 'bizId', width: 180 },
    { title: '命中类型', dataIndex: 'riskScene', width: 140 , render: (value) => formatEnumText(value, 'riskScene', '命中类型') },
    { title: '处置动作', dataIndex: 'actionType', width: 120 , render: (value) => formatEnumText(value, 'actionType', '处置动作') },
    { title: '状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, publishStatusMap) },
    { title: '用户', dataIndex: 'appUserName', width: 120 },
    { title: '命中时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const jobColumns = useMemo<ProColumns<ScheduledJobRecord>[]>(() => [
    { title: '任务编码', dataIndex: 'jobCode', width: 200 },
    { title: '任务名称', dataIndex: 'jobName', width: 180 },
    { title: '执行计划', dataIndex: 'cronExpression', width: 160, renderText: (value) => value === 'MANUAL' ? '手动执行' : value === '0 0 2 ? * MON' ? '每周一 02:00 执行' : value === '0 0 2 * * ?' ? '每天 02:00 执行' : value },
    { title: '处理场景', dataIndex: 'jobHandler', width: 220 },
    { title: '执行策略', dataIndex: 'jobParam', width: 180 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" onClick={async () => {
            await api.riskScheduleAlarm.jobs.run(record.id);
            await queryClient.invalidateQueries({ queryKey: ['ops-support-jobs'] });
            message.success('执行日志已记录');
          }}>执行</Button>
        </Space>
      ),
    },
  ], [queryClient]);

  const alarmColumns = useMemo<ProColumns<AlarmRecord>[]>(() => [
    { title: '规则', dataIndex: 'ruleName', width: 180 },
    { title: '告警类型', dataIndex: 'alarmScene', width: 140 , render: (value) => formatEnumText(value, 'alarmScene', '告警类型') },
    { title: '来源', dataIndex: 'bizId', width: 160 },
    { title: '等级', dataIndex: 'alarmLevel', width: 100, render: (_, record) => renderStatusTag(record.alarmLevel, publishStatusMap) },
    { title: '状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, publishStatusMap) },
    { title: '负责人', dataIndex: 'handledBy', width: 120 },
    { title: '触发时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 90, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const openHelper = (title: string) => {
    setHelperTitle(title);
    form.resetFields();
    form.setFieldsValue({
      fileType: 'OPS',
      taskType: title === '新建导出任务' ? 'EXPORT' : 'IMPORT',
      jobCycle: 'DAILY',
      status: 'PENDING',
    });
    setHelperVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="运营支撑中心" subtitle="统一维护文件、审批、导入导出、风控、定时任务和告警监控。" icon={<SafetyOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="文件资产" value={fileAssets.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="审批中" value={approvals.filter((item) => item.status === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="任务队列" value={tasks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="风控命中" value={risks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="定时任务" value={jobs.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="未处理告警" value={alarms.filter((item) => item.handleStatus !== 'HANDLED').length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入任意单号、名称、负责人过滤当前 Tab"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'file', label: '文件资产', children: <ProTable<FileAssetRecord> cardBordered rowKey="id" columns={fileColumns} dataSource={fileAssets} loading={fileQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="upload" type="primary" onClick={() => openHelper('上传文件')}>上传文件</Button>]} /> },
          { key: 'approval', label: '审批中心', children: <ProTable<ApprovalTaskRecord> cardBordered rowKey="id" columns={approvalColumns} dataSource={approvals} loading={approvalQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="process" type="primary" onClick={() => openHelper('新建审批流')}>新建审批流</Button>]} /> },
          { key: 'task', label: '导入导出', children: <ProTable<ImportExportTaskRecord> cardBordered rowKey="id" columns={taskColumns} dataSource={tasks} loading={taskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="import" onClick={() => openHelper('新建导入任务')}>新建导入</Button>, <Button key="export" type="primary" onClick={() => openHelper('新建导出任务')}>新建导出</Button>]} /> },
          { key: 'risk', label: '风控中心', children: <ProTable<RiskHitRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={risks} loading={riskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => navigate('/risk-schedule-alarms')}>维护规则</Button>]} /> },
          { key: 'job', label: '定时任务', children: <ProTable<ScheduledJobRecord> cardBordered rowKey="id" columns={jobColumns} dataSource={jobs} loading={jobQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openHelper('新建定时任务')}>新建任务</Button>]} /> },
          { key: 'alarm', label: '告警监控', children: <ProTable<AlarmRecord> cardBordered rowKey="id" columns={alarmColumns} dataSource={alarms} loading={alarmQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => navigate('/risk-schedule-alarms')}>维护规则</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="运营支撑详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('fileName' in detail ? supportDetailFields.file : 'processNo' in detail ? supportDetailFields.approval : 'taskNo' in detail ? supportDetailFields.task : 'ruleName' in detail && 'alarmScene' in detail ? supportDetailFields.alarm : 'jobCode' in detail ? supportDetailFields.job : supportDetailFields.risk) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="运营支撑处理"
        title={helperTitle}
        subtitle="把文件、审批、导入导出和定时任务拆成结构化字段，避免直接填写说明文本。"
        meta={[helperTitle || '运营支撑', '平台运营']}
        open={helperVisible}
        onCancel={() => setHelperVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const remark = compactJoin([
            values.fileType ? `文件类型：${optionLabel(fileTypeOptions, values.fileType)}` : undefined,
            values.taskType ? `任务类型：${optionLabel(taskTypeOptions, values.taskType)}` : undefined,
            values.jobCycle ? `执行周期：${optionLabel(jobCycleOptions, values.jobCycle)}` : undefined,
            values.supplement ? `补充说明：${values.supplement}` : undefined,
          ]);
          if (helperTitle === '新建审批流') {
            await api.approval.tasks.add({ taskNo: values.name, processNo: values.name, bizType: values.bizType || values.name, bizNo: values.bizNo || values.name, applicant: values.owner, status: values.status || 'PENDING', currentNode: '人工创建', approver: values.owner, remark });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-approvals'] });
          } else if (helperTitle === '新建导入任务' || helperTitle === '新建导出任务') {
            await api.file.importExportTasks.add({ taskType: values.taskType || (helperTitle === '新建导出任务' ? 'EXPORT' : 'IMPORT'), bizType: values.bizType || values.name, bizNo: values.bizNo || values.name, fileName: `${values.name}.xlsx`, operator: values.owner, status: values.status || 'PENDING', remark });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-import-export-tasks'] });
          } else if (helperTitle === '维护风控规则') {
            await api.riskScheduleAlarm.riskRules.add({ ruleName: values.name, ruleCode: values.name, riskScene: 'MANUAL', actionType: 'WARN', ruleConfig: remark, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-risks'] });
          } else if (helperTitle === '新建定时任务') {
            await api.riskScheduleAlarm.jobs.add({ jobName: values.name, jobCode: values.name, cronExpression: values.jobCycle === 'WEEKLY' ? '0 0 2 ? * MON' : values.jobCycle === 'MANUAL' ? 'MANUAL' : '0 0 2 * * ?', jobHandler: values.handler || values.owner || '人工处理', jobParam: remark, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-jobs'] });
          } else if (helperTitle === '维护告警规则') {
            await api.riskScheduleAlarm.alarmRules.add({ ruleName: values.name, alarmScene: 'MANUAL', ruleConfig: remark, receiverConfig: values.owner, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-alarms'] });
          } else if (helperTitle === '上传文件') {
            await api.file.assets.add({ fileAssetId: `FILE-${Date.now()}`, fileName: values.name, fileType: values.fileType || 'OPS', storageProvider: values.owner || 'LOCAL', status: values.status || 'PENDING' });
            await queryClient.invalidateQueries({ queryKey: ['ops-support-files'] });
          }
          setHelperVisible(false);
          message.success('已保存到后端');
        }}
        width={980}
        okText="保存处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<FileOutlined />} title="处理对象" desc="录入名称、业务类型、业务单号和负责人。">
              <div className="merchant-editor-fields">
                <Form.Item name="name" label="名称 / 单号" rules={[{ required: true, message: '请输入名称或单号' }]}><Input placeholder="例如：结算明细导出" /></Form.Item>
                <Form.Item name="bizType" label="业务类型"><Input placeholder="例如：SETTLEMENT" /></Form.Item>
                <Form.Item name="bizNo" label="业务单号"><Input placeholder="例如：SETTLE-20260510-001" /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input placeholder="例如：运营-王敏" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<TeamOutlined />} title="任务配置" desc="按不同处理场景选择文件类型、任务类型和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="fileType" label="文件类型"><Select options={fileTypeOptions} placeholder="请选择文件类型" /></Form.Item>
                <Form.Item name="taskType" label="任务类型"><Select options={taskTypeOptions} placeholder="请选择任务类型" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ClockCircleOutlined />} title="执行策略" desc="配置定时任务周期、处理场景和补充说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="jobCycle" label="执行周期"><Select options={jobCycleOptions} placeholder="请选择执行周期" /></Form.Item>
                <Form.Item name="handler" label="处理场景"><Input placeholder="例如：结算明细导出" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：仅导出本月已确认结算单" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default OperationsSupportManagement;
