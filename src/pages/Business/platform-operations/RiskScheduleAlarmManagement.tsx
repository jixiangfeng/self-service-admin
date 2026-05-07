import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { messageChannelOptions, statusOptions, ticketPriorityOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface RiskRuleRecord {
  id: string;
  ruleName: string;
  ruleCode: string;
  riskScene: string;
  ruleConfig: string;
  actionType: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface RiskHitRecord {
  id: string;
  ruleName: string;
  appUserName: string;
  bizType: string;
  bizId: string;
  riskScene: string;
  hitDetail: string;
  actionType: string;
  handleStatus: string;
  createdAt: string;
}

interface BlacklistRecord {
  id: string;
  targetType: string;
  targetValue: string;
  reason: string;
  sourceType: string;
  status: number;
  effectiveStart: string;
  effectiveEnd?: string;
  operator: string;
  createdAt: string;
}

interface ScheduledJobRecord {
  id: string;
  jobName: string;
  jobCode: string;
  cronExpression: string;
  jobHandler: string;
  jobParam: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface ScheduledJobLogRecord {
  id: string;
  jobCode: string;
  triggerTime: string;
  startTime: string;
  finishTime?: string;
  executeStatus: string;
  resultMessage: string;
  retryCount: number;
}

interface AlarmRuleRecord {
  id: string;
  ruleName: string;
  alarmScene: string;
  ruleConfig: string;
  notifyChannel: string;
  receiverConfig: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface AlarmRecord {
  id: string;
  ruleName: string;
  alarmScene: string;
  alarmLevel: string;
  bizType: string;
  bizId: string;
  alarmContent: string;
  handleStatus: string;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
}

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

const riskRules: RiskRuleRecord[] = [
  { id: 'rr1', ruleName: '邀请同设备限制', ruleCode: 'RISK_INVITE_DEVICE', riskScene: 'INVITE', ruleConfig: '{"sameDeviceLimit":1,"periodHours":24}', actionType: 'AUDIT', status: 1, createdAt: '2026-04-10 10:00:00', updatedAt: '2026-04-18 09:12:00' },
  { id: 'rr2', ruleName: '退款频次异常', ruleCode: 'RISK_REFUND_FREQ', riskScene: 'REFUND', ruleConfig: '{"refundCount":3,"periodDays":7}', actionType: 'WARN', status: 1, createdAt: '2026-04-11 11:20:00', updatedAt: '2026-04-17 18:30:00' },
  { id: 'rr3', ruleName: '异常领券限制', ruleCode: 'RISK_COUPON_BURST', riskScene: 'COUPON', ruleConfig: '{"couponCount":5,"periodMinutes":10}', actionType: 'BLOCK', status: 1, createdAt: '2026-04-12 15:10:00', updatedAt: '2026-04-18 08:55:00' },
];

const riskHits: RiskHitRecord[] = [
  { id: 'rh1', ruleName: '邀请同设备限制', appUserName: '陈越', bizType: 'INVITE_RECORD', bizId: 'INV202604180009', riskScene: 'INVITE', hitDetail: '同设备 24 小时内绑定 3 个手机号', actionType: 'AUDIT', handleStatus: 'PENDING', createdAt: '2026-04-18 09:42:00' },
  { id: 'rh2', ruleName: '退款频次异常', appUserName: '周琪', bizType: 'REFUND_ORDER', bizId: 'RF202604170006', riskScene: 'REFUND', hitDetail: '7 天内申请退款 4 次', actionType: 'WARN', handleStatus: 'HANDLED', createdAt: '2026-04-17 22:12:00' },
  { id: 'rh3', ruleName: '异常领券限制', appUserName: '李波', bizType: 'COUPON_RECEIVE', bizId: 'CPR202604180021', riskScene: 'COUPON', hitDetail: '10 分钟内重复领取 6 张券', actionType: 'BLOCK', handleStatus: 'IGNORED', createdAt: '2026-04-18 10:01:00' },
];

const blacklists: BlacklistRecord[] = [
  { id: 'bl1', targetType: 'PHONE', targetValue: '138****2451', reason: '异常领券后人工确认', sourceType: 'RISK_RULE', status: 1, effectiveStart: '2026-04-18 10:20:00', effectiveEnd: '2026-05-18 23:59:59', operator: '风控-沈一', createdAt: '2026-04-18 10:20:00' },
  { id: 'bl2', targetType: 'DEVICE', targetValue: 'DFP-a8b3-92f1', reason: '多账号邀请套利', sourceType: 'MANUAL', status: 1, effectiveStart: '2026-04-17 18:00:00', operator: '运营-何铭', createdAt: '2026-04-17 18:00:00' },
];

const jobs: ScheduledJobRecord[] = [
  { id: 'job1', jobName: '周结算单生成', jobCode: 'JOB_SETTLEMENT_WEEKLY', cronExpression: '0 0 2 ? * MON', jobHandler: 'settlementGenerateHandler', jobParam: '{"cycle":"WEEK"}', status: 1, createdAt: '2026-04-01 10:00:00', updatedAt: '2026-04-18 08:00:00' },
  { id: 'job2', jobName: '优惠券过期处理', jobCode: 'JOB_COUPON_EXPIRE', cronExpression: '0 10 0 * * ?', jobHandler: 'couponExpireHandler', jobParam: '{"batchSize":500}', status: 1, createdAt: '2026-04-01 10:20:00', updatedAt: '2026-04-18 08:00:00' },
  { id: 'job3', jobName: '设备离线判断', jobCode: 'JOB_DEVICE_OFFLINE', cronExpression: '0 */5 * * * ?', jobHandler: 'deviceOfflineHandler', jobParam: '{"offlineMinutes":10}', status: 1, createdAt: '2026-04-02 09:30:00', updatedAt: '2026-04-18 08:00:00' },
];

const jobLogs: ScheduledJobLogRecord[] = [
  { id: 'jl1', jobCode: 'JOB_SETTLEMENT_WEEKLY', triggerTime: '2026-05-04 02:00:00', startTime: '2026-05-04 02:00:01', finishTime: '2026-05-04 02:01:35', executeStatus: 'SUCCESS', resultMessage: '生成 12 张结算单', retryCount: 0 },
  { id: 'jl2', jobCode: 'JOB_COUPON_EXPIRE', triggerTime: '2026-05-07 00:10:00', startTime: '2026-05-07 00:10:01', finishTime: '2026-05-07 00:10:18', executeStatus: 'SUCCESS', resultMessage: '处理 326 张券', retryCount: 0 },
  { id: 'jl3', jobCode: 'JOB_DEVICE_OFFLINE', triggerTime: '2026-05-07 10:05:00', startTime: '2026-05-07 10:05:01', finishTime: '2026-05-07 10:05:07', executeStatus: 'FAILED', resultMessage: '设备网关超时', retryCount: 1 },
];

const alarmRules: AlarmRuleRecord[] = [
  { id: 'ar1', ruleName: '设备离线告警', alarmScene: 'DEVICE', ruleConfig: '{"offlineMinutes":10}', notifyChannel: 'WECHAT,SMS', receiverConfig: '运维值班组', status: 1, createdAt: '2026-04-01 09:00:00', updatedAt: '2026-04-18 09:00:00' },
  { id: 'ar2', ruleName: '支付回调失败告警', alarmScene: 'PAYMENT', ruleConfig: '{"failedCount":3,"periodMinutes":5}', notifyChannel: 'WECHAT', receiverConfig: '技术值班组', status: 1, createdAt: '2026-04-02 11:00:00', updatedAt: '2026-04-18 09:00:00' },
  { id: 'ar3', ruleName: '券库存预警', alarmScene: 'STOCK', ruleConfig: '{"remainThreshold":100}', notifyChannel: 'IN_APP', receiverConfig: '营销运营组', status: 1, createdAt: '2026-04-03 13:00:00', updatedAt: '2026-04-18 09:00:00' },
];

const alarms: AlarmRecord[] = [
  { id: 'al1', ruleName: '设备离线告警', alarmScene: 'DEVICE', alarmLevel: 'HIGH', bizType: 'DEVICE', bizId: 'DEV-HQ-003', alarmContent: '虹桥旗舰洗车站 DEV-HQ-003 连续 12 分钟无心跳', handleStatus: 'PENDING', createdAt: '2026-05-07 10:06:00' },
  { id: 'al2', ruleName: '支付回调失败告警', alarmScene: 'PAYMENT', alarmLevel: 'MEDIUM', bizType: 'PAY_ORDER', bizId: 'PAY202605070019', alarmContent: '微信支付回调连续失败 3 次', handleStatus: 'PROCESSING', handledBy: '技术值班', createdAt: '2026-05-07 09:31:00' },
  { id: 'al3', ruleName: '券库存预警', alarmScene: 'STOCK', alarmLevel: 'LOW', bizType: 'COUPON_TEMPLATE', bizId: 'CPN-NIGHT-008', alarmContent: '夜洗 8 元券剩余库存低于 100', handleStatus: 'HANDLED', handledBy: '运营-何铭', handledAt: '2026-05-07 08:55:00', createdAt: '2026-05-07 08:42:00' },
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

const RiskScheduleAlarmManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const filter = <T extends object>(records: T[]) =>
    records.filter((record) => containsKeyword(keyword, Object.values(record).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('配置已保存，后续接入后台接口');
  };

  const riskRuleColumns = useMemo<ProColumns<RiskRuleRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 180, fixed: 'left' },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '场景', dataIndex: 'riskScene', width: 120, render: (_, record) => renderStatusTag(record.riskScene, riskSceneMap) },
    { title: '处置动作', dataIndex: 'actionType', width: 130, render: (_, record) => renderStatusTag(record.actionType, actionMap) },
    { title: '规则配置', dataIndex: 'ruleConfig', width: 260, ellipsis: true },
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
    { title: 'Cron', dataIndex: 'cronExpression', width: 170 },
    { title: '执行器', dataIndex: 'jobHandler', width: 220 },
    { title: '参数', dataIndex: 'jobParam', width: 240, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 140, fixed: 'right', render: (_, record) => [<a key="run" onClick={() => openModal(`手动执行 · ${record.jobName}`)}>执行</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

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
    { title: '规则配置', dataIndex: 'ruleConfig', width: 240, ellipsis: true },
    { title: '通知渠道', dataIndex: 'notifyChannel', width: 160, render: (_, record) => record.notifyChannel.split(',').map((item) => renderStatusTag(item, channelMap)) },
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

      <ProTable
        rowKey="keyword"
        search={false}
        pagination={false}
        options={false}
        dataSource={[]}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true }]}
        toolBarRender={() => [
          <Input.Search
            key="keyword"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => setKeyword(value)}
            placeholder="规则 / 用户 / 业务ID / 任务 / 告警"
            style={{ width: 320 }}
          />,
        ]}
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          { key: 'riskRule', label: '风控规则', children: <ProTable<RiskRuleRecord> cardBordered rowKey="id" columns={riskRuleColumns} dataSource={filter(riskRules) as RiskRuleRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建风控规则')}>新建规则</Button>]} /> },
          { key: 'riskHit', label: '命中记录', children: <ProTable<RiskHitRecord> cardBordered rowKey="id" columns={riskHitColumns} dataSource={filter(riskHits) as RiskHitRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
          { key: 'blacklist', label: '黑名单', children: <ProTable<BlacklistRecord> cardBordered rowKey="id" columns={blacklistColumns} dataSource={filter(blacklists) as BlacklistRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增黑名单')}>新增黑名单</Button>]} /> },
          { key: 'job', label: '定时任务', children: <ProTable<ScheduledJobRecord> cardBordered rowKey="id" columns={jobColumns} dataSource={filter(jobs) as ScheduledJobRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建定时任务')}>新建任务</Button>]} /> },
          { key: 'jobLog', label: '任务日志', children: <ProTable<ScheduledJobLogRecord> cardBordered rowKey="id" columns={jobLogColumns} dataSource={filter(jobLogs) as ScheduledJobLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'alarmRule', label: '告警规则', children: <ProTable<AlarmRuleRecord> cardBordered rowKey="id" columns={alarmRuleColumns} dataSource={filter(alarmRules) as AlarmRuleRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建告警规则')}>新建规则</Button>]} /> },
          { key: 'alarm', label: '告警记录', children: <ProTable<AlarmRecord> cardBordered rowKey="id" columns={alarmColumns} dataSource={filter(alarms) as AlarmRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <Modal title="明细详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={860}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={780}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="scene" label="场景" rules={[{ required: true, message: '请选择场景' }]}><Select options={[...riskSceneOptions, ...alarmSceneOptions]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} /></Form.Item></Col>
            <Col span={24}><Form.Item name="config" label="配置 JSON" rules={[{ required: true, message: '请输入配置' }]}><Input.TextArea rows={4} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default RiskScheduleAlarmManagement;
