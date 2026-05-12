import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { AlertOutlined, ClockCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageChannelOptions, statusOptions, ticketPriorityOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api, {
  type AlarmRecord,
  type AlarmRuleRecord,
  type BlacklistRecord,
  type RiskHitRecord,
  type RiskRuleRecord,
  type ScheduledJobLogRecord,
  type ScheduledJobRecord,
} from '@/services/backendService';

type DetailRecord = RiskRuleRecord | RiskHitRecord | BlacklistRecord | ScheduledJobRecord | ScheduledJobLogRecord | AlarmRuleRecord | AlarmRecord;

const riskSceneOptions = [
  { value: 'INVITE', label: '邀请防刷' },
  { value: 'REFUND', label: '退款异常' },
  { value: 'PAYMENT', label: '支付账户' },
  { value: 'COUPON', label: '领券用券' },
  { value: 'LOGIN', label: '登录安全' },
];

const actionTypeOptions = [
  { value: 'WARN', label: '预警' },
  { value: 'BLOCK', label: '拦截' },
  { value: 'AUDIT', label: '转人工审核' },
  { value: 'BLACKLIST', label: '加入黑名单' },
];

const handleStatusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'HANDLED', label: '已处理' },
  { value: 'IGNORED', label: '已忽略' },
];

const targetTypeOptions = [
  { value: 'USER', label: '用户' },
  { value: 'PHONE', label: '手机号' },
  { value: 'DEVICE', label: '设备指纹' },
  { value: 'PAY_ACCOUNT', label: '支付账户' },
  { value: 'IP', label: 'IP 地址' },
];

const sourceTypeOptions = [
  { value: 'MANUAL', label: '人工维护' },
  { value: 'RISK_RULE', label: '风控规则' },
];

const executeStatusOptions = [
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' },
  { value: 'RUNNING', label: '执行中' },
];

const alarmSceneOptions = [
  { value: 'DEVICE', label: '设备' },
  { value: 'PAYMENT', label: '支付' },
  { value: 'API', label: '接口' },
  { value: 'JOB', label: '任务' },
  { value: 'STOCK', label: '库存' },
];

const alarmLevelOptions = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'CRITICAL', label: '严重' },
];

const statusMap = buildValueEnum(statusOptions);
const riskSceneMap = buildValueEnum(riskSceneOptions);
const actionMap = buildValueEnum(actionTypeOptions);
const handleStatusMap = buildValueEnum(handleStatusOptions);
const targetTypeMap = buildValueEnum(targetTypeOptions);
const sourceTypeMap = buildValueEnum(sourceTypeOptions);
const executeStatusMap = buildValueEnum(executeStatusOptions);
const alarmSceneMap = buildValueEnum(alarmSceneOptions);
const alarmLevelMap = buildValueEnum(alarmLevelOptions);
const channelMap = buildValueEnum(messageChannelOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);
const compareOperatorOptions = [
  { value: 'GTE', label: '大于等于' },
  { value: 'GT', label: '大于' },
  { value: 'EQ', label: '等于' },
];
const jobCycleOptions = [
  { value: 'DAILY', label: '每天执行' },
  { value: 'HOURLY', label: '每小时执行' },
  { value: 'MANUAL', label: '手动执行' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string | number) => options.find((item) => item.value === value)?.label || value;

const detailFields: Record<string, DetailField<Record<string, any>>[]> = {
  riskRule: [
    { name: 'ruleCode', label: '规则编码' },
    { name: 'ruleName', label: '规则名称' },
    { name: 'riskScene', label: '场景', render: (value) => renderStatusTag(value, riskSceneMap) },
    { name: 'actionType', label: '处置动作', render: (value) => renderStatusTag(value, actionMap) },
    { name: 'ruleConfig', label: '触发策略' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  riskHit: [
    { name: 'ruleName', label: '命中规则' },
    { name: 'appUserName', label: '用户' },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizId', label: '业务ID' },
    { name: 'riskScene', label: '场景', render: (value) => renderStatusTag(value, riskSceneMap) },
    { name: 'hitDetail', label: '命中详情' },
    { name: 'actionType', label: '动作', render: (value) => renderStatusTag(value, actionMap) },
    { name: 'handleStatus', label: '处理状态', render: (value) => renderStatusTag(value, handleStatusMap) },
    { name: 'createdAt', label: '命中时间', render: (value) => formatDateTime(value) },
  ],
  blacklist: [
    { name: 'targetType', label: '对象类型', render: (value) => renderStatusTag(value, targetTypeMap) },
    { name: 'targetValue', label: '对象值' },
    { name: 'reason', label: '原因' },
    { name: 'sourceType', label: '来源', render: (value) => renderStatusTag(value, sourceTypeMap) },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'effectiveStart', label: '生效开始', render: (value) => formatDateTime(value) },
    { name: 'effectiveEnd', label: '生效结束', render: (value) => formatDateTime(value) },
    { name: 'operator', label: '操作人' },
  ],
  job: [
    { name: 'jobCode', label: '任务编码' },
    { name: 'jobName', label: '任务名称' },
    { name: 'cronExpression', label: '执行计划' },
    { name: 'jobHandler', label: '处理场景' },
    { name: 'jobParam', label: '执行策略' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  jobLog: [
    { name: 'jobCode', label: '任务编码' },
    { name: 'triggerTime', label: '触发时间', render: (value) => formatDateTime(value) },
    { name: 'startTime', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'finishTime', label: '完成时间', render: (value) => formatDateTime(value) },
    { name: 'executeStatus', label: '状态', render: (value) => renderStatusTag(value, executeStatusMap) },
    { name: 'resultMessage', label: '执行结果' },
    { name: 'retryCount', label: '重试次数' },
  ],
  alarmRule: [
    { name: 'ruleName', label: '规则名称' },
    { name: 'alarmScene', label: '告警场景', render: (value) => renderStatusTag(value, alarmSceneMap) },
    { name: 'ruleConfig', label: '触发策略' },
    { name: 'notifyChannel', label: '通知渠道' },
    { name: 'receiverConfig', label: '接收人' },
    { name: 'status', label: '状态', render: (value) => renderStatusTag(value, statusMap) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  alarm: [
    { name: 'ruleName', label: '规则' },
    { name: 'alarmScene', label: '场景', render: (value) => renderStatusTag(value, alarmSceneMap) },
    { name: 'alarmLevel', label: '等级', render: (value) => renderStatusTag(value, alarmLevelMap) || renderStatusTag(value, priorityMap) },
    { name: 'bizType', label: '业务类型' },
    { name: 'bizId', label: '业务ID' },
    { name: 'alarmContent', label: '告警内容' },
    { name: 'handleStatus', label: '处理状态', render: (value) => renderStatusTag(value, handleStatusMap) },
    { name: 'handledBy', label: '处理人' },
    { name: 'handledAt', label: '处理时间', render: (value) => formatDateTime(value) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
};

const getDetailFields = (record: DetailRecord): DetailField<Record<string, any>>[] => {
  if ('riskScene' in record && 'ruleConfig' in record && 'ruleCode' in record) return detailFields.riskRule;
  if ('hitDetail' in record) return detailFields.riskHit;
  if ('targetType' in record) return detailFields.blacklist;
  if ('cronExpression' in record) return detailFields.job;
  if ('executeStatus' in record) return detailFields.jobLog;
  if ('alarmScene' in record && 'ruleConfig' in record) return detailFields.alarmRule;
  return detailFields.alarm;
};

const RiskScheduleAlarmManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const riskRulesQuery = useQuery({ queryKey: ['risk-rules', queryParams], queryFn: () => api.riskScheduleAlarm.riskRules.page(queryParams) });
  const riskHitsQuery = useQuery({ queryKey: ['risk-hits', queryParams], queryFn: () => api.riskScheduleAlarm.riskHits.page(queryParams) });
  const blacklistsQuery = useQuery({ queryKey: ['risk-blacklists', queryParams], queryFn: () => api.riskScheduleAlarm.blacklists.page(queryParams) });
  const jobsQuery = useQuery({ queryKey: ['scheduled-jobs', queryParams], queryFn: () => api.riskScheduleAlarm.jobs.page(queryParams) });
  const jobLogsQuery = useQuery({ queryKey: ['scheduled-job-logs', queryParams], queryFn: () => api.riskScheduleAlarm.jobLogs.page(queryParams) });
  const alarmRulesQuery = useQuery({ queryKey: ['alarm-rules', queryParams], queryFn: () => api.riskScheduleAlarm.alarmRules.page(queryParams) });
  const alarmsQuery = useQuery({ queryKey: ['alarm-records', queryParams], queryFn: () => api.riskScheduleAlarm.alarms.page(queryParams) });

  const riskRules = riskRulesQuery.data?.data.records ?? [];
  const riskHits = riskHitsQuery.data?.data.records ?? [];
  const blacklists = blacklistsQuery.data?.data.records ?? [];
  const jobs = jobsQuery.data?.data.records ?? [];
  const jobLogs = jobLogsQuery.data?.data.records ?? [];
  const alarmRules = alarmRulesQuery.data?.data.records ?? [];
  const alarms = alarmsQuery.data?.data.records ?? [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    form.setFieldsValue({
      scene: title.includes('告警') ? 'DEVICE' : 'INVITE',
      actionType: 'WARN',
      operator: 'GTE',
      threshold: 1,
      windowMinutes: 10,
      status: 1,
      jobCycle: 'DAILY',
      notifyChannel: 'IN_APP',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const config = compactJoin([
      values.operator ? `条件：${optionLabel(compareOperatorOptions, values.operator)} ${values.threshold ?? 1}` : undefined,
      values.windowMinutes ? `统计窗口：${values.windowMinutes}分钟` : undefined,
      values.actionType ? `处置动作：${optionLabel(actionTypeOptions, values.actionType)}` : undefined,
      values.jobCycle ? `执行周期：${optionLabel(jobCycleOptions, values.jobCycle)}` : undefined,
      values.receiver ? `接收人：${values.receiver}` : undefined,
      values.supplement ? `补充说明：${values.supplement}` : undefined,
    ]);
    if (modalTitle === '新建风控规则') {
      await api.riskScheduleAlarm.riskRules.add({ ruleName: values.name, ruleCode: values.code, riskScene: values.scene, ruleConfig: config, actionType: values.actionType, status: values.status });
      await queryClient.invalidateQueries({ queryKey: ['risk-rules'] });
    } else if (modalTitle === '新增黑名单') {
      await api.riskScheduleAlarm.blacklists.add({ targetType: values.targetType || values.scene, targetValue: values.code, reason: config, sourceType: 'MANUAL', status: values.status, operator: values.name });
      await queryClient.invalidateQueries({ queryKey: ['risk-blacklists'] });
    } else if (modalTitle === '新建定时任务') {
      await api.riskScheduleAlarm.jobs.add({ jobName: values.name, jobCode: values.code, cronExpression: values.jobCycle === 'HOURLY' ? '0 0 * * * ?' : values.jobCycle === 'MANUAL' ? 'MANUAL' : '0 0 2 * * ?', jobHandler: values.scene, jobParam: config, status: values.status });
      await queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
    } else if (modalTitle === '新建告警规则') {
      await api.riskScheduleAlarm.alarmRules.add({ ruleName: values.name, alarmScene: values.scene, ruleConfig: config, notifyChannel: values.notifyChannel, receiverConfig: values.receiver || values.name, status: values.status });
      await queryClient.invalidateQueries({ queryKey: ['alarm-rules'] });
    }
    setModalVisible(false);
    message.success('已保存到后端');
  };

  const confirmRunJob = (record: ScheduledJobRecord) => {
    showBusinessConfirm({
      title: '确认执行定时任务',
      content: `确定手动执行任务「${record.jobName || record.jobCode}」吗？执行后会写入任务日志并触发对应处理逻辑。`,
      okText: '确认执行',
      onOk: async () => {
        await api.riskScheduleAlarm.jobs.run(record.id);
        await queryClient.invalidateQueries({ queryKey: ['scheduled-job-logs'] });
        message.success('已记录手动执行日志');
      },
    });
  };

  const riskRuleColumns = useMemo<ProColumns<RiskRuleRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 180, fixed: 'left' },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '场景', dataIndex: 'riskScene', width: 120, render: (_, record) => renderStatusTag(record.riskScene, riskSceneMap) },
    { title: '处置动作', dataIndex: 'actionType', width: 130, render: (_, record) => renderStatusTag(record.actionType, actionMap) },
    { title: '触发策略', dataIndex: 'ruleConfig', width: 260, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const riskHitColumns = useMemo<ProColumns<RiskHitRecord>[]>(() => [
    { title: '规则', dataIndex: 'ruleName', width: 180, fixed: 'left' },
    { title: '用户', dataIndex: 'appUserName', width: 110 },
    { title: '业务类型', dataIndex: 'bizType', width: 150 },
    { title: '业务ID', dataIndex: 'bizId', width: 160 },
    { title: '场景', dataIndex: 'riskScene', width: 120, render: (_, record) => renderStatusTag(record.riskScene, riskSceneMap) },
    { title: '命中详情', dataIndex: 'hitDetail', width: 260, ellipsis: true },
    { title: '动作', dataIndex: 'actionType', width: 130, render: (_, record) => renderStatusTag(record.actionType, actionMap) },
    { title: '处理状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, handleStatusMap) },
    { title: '命中时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const blacklistColumns = useMemo<ProColumns<BlacklistRecord>[]>(() => [
    { title: '对象类型', dataIndex: 'targetType', width: 120, render: (_, record) => renderStatusTag(record.targetType, targetTypeMap) },
    { title: '对象值', dataIndex: 'targetValue', width: 180 },
    { title: '原因', dataIndex: 'reason', width: 260, ellipsis: true },
    { title: '来源', dataIndex: 'sourceType', width: 120, render: (_, record) => renderStatusTag(record.sourceType, sourceTypeMap) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '生效开始', dataIndex: 'effectiveStart', width: 180, render: (_, record) => formatDateTime(record.effectiveStart) },
    { title: '生效结束', dataIndex: 'effectiveEnd', width: 180, render: (_, record) => formatDateTime(record.effectiveEnd) },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const jobColumns = useMemo<ProColumns<ScheduledJobRecord>[]>(() => [
    { title: '任务编码', dataIndex: 'jobCode', width: 200, fixed: 'left' },
    { title: '任务名称', dataIndex: 'jobName', width: 180 },
    { title: '执行计划', dataIndex: 'cronExpression', width: 170, renderText: (value) => value === 'MANUAL' ? '手动执行' : value === '0 0 * * * ?' ? '每小时执行' : value === '0 0 2 * * ?' ? '每天 02:00 执行' : value },
    { title: '处理场景', dataIndex: 'jobHandler', width: 220 },
    { title: '执行策略', dataIndex: 'jobParam', width: 240, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => [
        <a key="run" onClick={() => confirmRunJob(record)}>执行</a>,
        <a key="detail" onClick={() => setDetail(record)}>详情</a>,
      ],
    },
  ], [queryClient]);

  const jobLogColumns = useMemo<ProColumns<ScheduledJobLogRecord>[]>(() => [
    { title: '任务编码', dataIndex: 'jobCode', width: 200, fixed: 'left' },
    { title: '触发时间', dataIndex: 'triggerTime', width: 180, render: (_, record) => formatDateTime(record.triggerTime) },
    { title: '开始时间', dataIndex: 'startTime', width: 180, render: (_, record) => formatDateTime(record.startTime) },
    { title: '完成时间', dataIndex: 'finishTime', width: 180, render: (_, record) => formatDateTime(record.finishTime) },
    { title: '状态', dataIndex: 'executeStatus', width: 120, render: (_, record) => renderStatusTag(record.executeStatus, executeStatusMap) },
    { title: '执行结果', dataIndex: 'resultMessage', width: 260, ellipsis: true },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const alarmRuleColumns = useMemo<ProColumns<AlarmRuleRecord>[]>(() => [
    { title: '规则名称', dataIndex: 'ruleName', width: 180, fixed: 'left' },
    { title: '告警场景', dataIndex: 'alarmScene', width: 120, render: (_, record) => renderStatusTag(record.alarmScene, alarmSceneMap) },
    { title: '触发策略', dataIndex: 'ruleConfig', width: 240, ellipsis: true },
    { title: '通知渠道', dataIndex: 'notifyChannel', width: 160, render: (_, record) => (record.notifyChannel ?? '').split(',').filter(Boolean).map((item) => renderStatusTag(item, channelMap)) },
    { title: '接收人', dataIndex: 'receiverConfig', width: 160 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const alarmColumns = useMemo<ProColumns<AlarmRecord>[]>(() => [
    { title: '规则', dataIndex: 'ruleName', width: 180, fixed: 'left' },
    { title: '场景', dataIndex: 'alarmScene', width: 120, render: (_, record) => renderStatusTag(record.alarmScene, alarmSceneMap) },
    { title: '等级', dataIndex: 'alarmLevel', width: 110, render: (_, record) => renderStatusTag(record.alarmLevel, alarmLevelMap) || renderStatusTag(record.alarmLevel, priorityMap) },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '业务ID', dataIndex: 'bizId', width: 160 },
    { title: '告警内容', dataIndex: 'alarmContent', width: 300, ellipsis: true },
    { title: '处理状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, handleStatusMap) },
    { title: '处理人', dataIndex: 'handledBy', width: 120, renderText: (value) => value || '-' },
    { title: '处理时间', dataIndex: 'handledAt', width: 180, render: (_, record) => formatDateTime(record.handledAt) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="风控调度告警中心" subtitle="补齐风控规则、命中处置、黑名单、定时任务、执行日志、告警规则和告警记录。" icon={<AlertOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="风控规则" value={riskRules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待处理命中" value={riskHits.filter((item) => item.handleStatus === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="黑名单" value={blacklists.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="启用任务" value={jobs.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="失败日志" value={jobLogs.filter((item) => item.executeStatus === 'FAILED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待处理告警" value={alarms.filter((item) => item.handleStatus !== 'HANDLED').length} suffix="条" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="规则 / 用户 / 业务ID / 任务 / 告警"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'riskRule', label: '风控规则', children: <ProTable<RiskRuleRecord> cardBordered rowKey="id" columns={riskRuleColumns} dataSource={riskRules} loading={riskRulesQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建风控规则')}>新建规则</Button>]} /> },
          { key: 'riskHit', label: '命中记录', children: <ProTable<RiskHitRecord> cardBordered rowKey="id" columns={riskHitColumns} dataSource={riskHits} loading={riskHitsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'blacklist', label: '黑名单', children: <ProTable<BlacklistRecord> cardBordered rowKey="id" columns={blacklistColumns} dataSource={blacklists} loading={blacklistsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增黑名单')}>新增黑名单</Button>]} /> },
          { key: 'job', label: '定时任务', children: <ProTable<ScheduledJobRecord> cardBordered rowKey="id" columns={jobColumns} dataSource={jobs} loading={jobsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建定时任务')}>新建任务</Button>]} /> },
          { key: 'jobLog', label: '任务日志', children: <ProTable<ScheduledJobLogRecord> cardBordered rowKey="id" columns={jobLogColumns} dataSource={jobLogs} loading={jobLogsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'alarmRule', label: '告警规则', children: <ProTable<AlarmRuleRecord> cardBordered rowKey="id" columns={alarmRuleColumns} dataSource={alarmRules} loading={alarmRulesQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建告警规则')}>新建规则</Button>]} /> },
          { key: 'alarm', label: '告警记录', children: <ProTable<AlarmRecord> cardBordered rowKey="id" columns={alarmColumns} dataSource={alarms} loading={alarmsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <BusinessDetailModal title="明细详情" open={!!detail} onCancel={() => setDetail(null)} width={860}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={getDetailFields(detail)}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="风控告警配置"
        title={modalTitle}
        subtitle="把规则条件、阈值、统计窗口、处置动作和通知人拆成运营可维护字段，提交时合并为规则配置。"
        meta={[modalTitle || '风控告警', '平台运营']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1080}
        okText="保存规则"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<SafetyOutlined />} title="规则基础" desc="配置名称、编码、场景和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：邀请异常频次规则" /></Form.Item>
                <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}><Input placeholder="例如：RISK-INVITE-FREQ" /></Form.Item>
                <Form.Item name="scene" label="场景" rules={[{ required: true, message: '请选择场景' }]}><Select options={[...riskSceneOptions, ...alarmSceneOptions]} placeholder="请选择场景" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<ClockCircleOutlined />} title="触发条件" desc="配置比较方式、阈值、统计窗口和任务周期。">
              <div className="merchant-editor-fields">
                <Form.Item name="operator" label="比较方式"><Select options={compareOperatorOptions} placeholder="请选择比较方式" /></Form.Item>
                <Form.Item name="threshold" label="触发阈值"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="1" /></Form.Item>
                <Form.Item name="windowMinutes" label="统计窗口"><InputNumber min={1} precision={0} addonAfter="分钟" style={{ width: '100%' }} placeholder="10" /></Form.Item>
                <Form.Item name="jobCycle" label="执行周期"><Select options={jobCycleOptions} placeholder="请选择执行周期" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AlertOutlined />} title="处置通知" desc="配置处置动作、通知渠道、接收人和补充说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="actionType" label="处置动作"><Select options={actionTypeOptions} placeholder="请选择处置动作" /></Form.Item>
                <Form.Item name="notifyChannel" label="通知渠道"><Select options={messageChannelOptions} placeholder="请选择通知渠道" /></Form.Item>
                <Form.Item name="receiver" label="接收人"><Input placeholder="例如：risk-ops" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：同设备 10 分钟内邀请超过 3 次触发预警" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default RiskScheduleAlarmManagement;
