import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Statistic, Tabs, message } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  publishStatusOptions,
  riskStatusOptions,
  ticketPriorityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface FileAssetRecord {
  id: string;
  fileName: string;
  bizType: string;
  bizNo: string;
  fileType: string;
  uploader: string;
  status: string;
  uploadedAt: string;
}

interface ApprovalRecord {
  id: string;
  processNo: string;
  bizType: string;
  bizNo: string;
  applicant: string;
  currentNode: string;
  approver: string;
  status: string;
  updatedAt: string;
}

interface TaskRecord {
  id: string;
  taskNo: string;
  taskType: string;
  bizType: string;
  fileName: string;
  operator: string;
  status: string;
  updatedAt: string;
}

interface RiskRecord {
  id: string;
  ruleName: string;
  hitObject: string;
  hitType: string;
  level: string;
  status: string;
  owner: string;
  hitAt: string;
}

interface JobRecord {
  id: string;
  jobCode: string;
  jobName: string;
  cron: string;
  lastResult: string;
  nextRunAt: string;
  status: string;
}

interface AlarmRecord {
  id: string;
  alarmNo: string;
  alarmType: string;
  source: string;
  level: string;
  status: string;
  owner: string;
  triggeredAt: string;
}

const auditStatusMap = buildValueEnum(auditStatusOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);

const fileAssets: FileAssetRecord[] = [
  { id: 'f1', fileName: '营业执照-鲸洗直营.pdf', bizType: '商户资质', bizNo: 'MCH-DIRECT-001', fileType: 'PDF', uploader: '平台招商', status: 'APPROVED', uploadedAt: '2026-04-18 09:20:00' },
  { id: 'f2', fileName: '门店封面-虹桥.jpg', bizType: '门店图片', bizNo: 'STORE-HQ-001', fileType: 'IMAGE', uploader: '店长-李思远', status: 'PENDING', uploadedAt: '2026-04-18 10:02:00' },
];

const approvals: ApprovalRecord[] = [
  { id: 'a1', processNo: 'AP202604180001', bizType: '结算账户变更', bizNo: 'MCH-DIRECT-001', applicant: '财务-林悦', currentNode: '财务复核', approver: '财务主管-许鸣', status: 'PENDING', updatedAt: '2026-04-18 10:12:00' },
  { id: 'a2', processNo: 'AP202604180002', bizType: '活动上线', bizNo: 'RCG-006', applicant: '运营-何铭', currentNode: '预算审批', approver: '财务-林悦', status: 'APPROVED', updatedAt: '2026-04-18 09:40:00' },
];

const tasks: TaskRecord[] = [
  { id: 't1', taskNo: 'IMP202604180001', taskType: '导入', bizType: '批量发券', fileName: 'coupon_user_list.xlsx', operator: '运营-陶然', status: 'PROCESSING', updatedAt: '2026-04-18 10:18:00' },
  { id: 't2', taskNo: 'EXP202604180008', taskType: '导出', bizType: '结算明细', fileName: 'settlement_detail.csv', operator: '财务-许鸣', status: 'DONE', updatedAt: '2026-04-18 10:05:00' },
];

const risks: RiskRecord[] = [
  { id: 'r1', ruleName: '邀请同设备限制', hitObject: '用户 13800002222', hitType: '邀请防刷', level: 'HIGH', status: 'WATCH', owner: '风控-沈一', hitAt: '2026-04-18 09:42:00' },
  { id: 'r2', ruleName: '退款频次异常', hitObject: 'SO202604170113', hitType: '退款风控', level: 'MEDIUM', status: 'NORMAL', owner: '客服-刘莎', hitAt: '2026-04-17 22:12:00' },
];

const jobs: JobRecord[] = [
  { id: 'j1', jobCode: 'JOB_SETTLEMENT_WEEKLY', jobName: '周结算单生成', cron: '0 0 2 ? * MON', lastResult: '成功生成 12 张结算单', nextRunAt: '2026-05-11 02:00:00', status: 'PUBLISHED' },
  { id: 'j2', jobCode: 'JOB_COUPON_EXPIRE', jobName: '优惠券过期处理', cron: '0 10 0 * * ?', lastResult: '处理 326 张券', nextRunAt: '2026-05-08 00:10:00', status: 'PUBLISHED' },
];

const alarms: AlarmRecord[] = [
  { id: 'al1', alarmNo: 'AL202604180001', alarmType: '设备离线', source: 'DEV-HQ-003', level: 'HIGH', status: 'PENDING', owner: '运维-李维', triggeredAt: '2026-04-18 08:57:00' },
  { id: 'al2', alarmNo: 'AL202604180006', alarmType: '支付回调失败', source: 'PAY202604180019', level: 'MEDIUM', status: 'PROCESSING', owner: '技术值班', triggeredAt: '2026-04-18 09:31:00' },
];

const OperationsSupportManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<FileAssetRecord | ApprovalRecord | TaskRecord | RiskRecord | JobRecord | AlarmRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [form] = Form.useForm<{ name: string; owner: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const fileColumns = useMemo<ProColumns<FileAssetRecord>[]>(() => [
    { title: '文件名', dataIndex: 'fileName', width: 220 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '业务单号', dataIndex: 'bizNo', width: 160 },
    { title: '文件类型', dataIndex: 'fileType', width: 100 },
    { title: '上传人', dataIndex: 'uploader', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '上传时间', dataIndex: 'uploadedAt', width: 180, render: (_, record) => formatDateTime(record.uploadedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const approvalColumns = useMemo<ProColumns<ApprovalRecord>[]>(() => [
    { title: '审批单号', dataIndex: 'processNo', width: 180 },
    { title: '业务类型', dataIndex: 'bizType', width: 150 },
    { title: '业务单号', dataIndex: 'bizNo', width: 160 },
    { title: '申请人', dataIndex: 'applicant', width: 120 },
    { title: '当前节点', dataIndex: 'currentNode', width: 120 },
    { title: '审批人', dataIndex: 'approver', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 120, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>审批流</Button> },
  ], []);

  const taskColumns = useMemo<ProColumns<TaskRecord>[]>(() => [
    { title: '任务号', dataIndex: 'taskNo', width: 180 },
    { title: '任务类型', dataIndex: 'taskType', width: 100 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '文件名', dataIndex: 'fileName', width: 180 },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const riskColumns = useMemo<ProColumns<RiskRecord>[]>(() => [
    { title: '规则', dataIndex: 'ruleName', width: 180 },
    { title: '命中对象', dataIndex: 'hitObject', width: 180 },
    { title: '命中类型', dataIndex: 'hitType', width: 140 },
    { title: '等级', dataIndex: 'level', width: 100, render: (_, record) => renderStatusTag(record.level, priorityMap) },
    { title: '风控状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, riskStatusMap) },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    { title: '命中时间', dataIndex: 'hitAt', width: 180, render: (_, record) => formatDateTime(record.hitAt) },
  ], []);

  const jobColumns = useMemo<ProColumns<JobRecord>[]>(() => [
    { title: '任务编码', dataIndex: 'jobCode', width: 200 },
    { title: '任务名称', dataIndex: 'jobName', width: 180 },
    { title: 'Cron', dataIndex: 'cron', width: 160 },
    { title: '最近结果', dataIndex: 'lastResult', width: 220 },
    { title: '下次执行', dataIndex: 'nextRunAt', width: 180, render: (_, record) => formatDateTime(record.nextRunAt) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
  ], []);

  const alarmColumns = useMemo<ProColumns<AlarmRecord>[]>(() => [
    { title: '告警号', dataIndex: 'alarmNo', width: 180 },
    { title: '告警类型', dataIndex: 'alarmType', width: 140 },
    { title: '来源', dataIndex: 'source', width: 160 },
    { title: '等级', dataIndex: 'level', width: 100, render: (_, record) => renderStatusTag(record.level, priorityMap) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    { title: '触发时间', dataIndex: 'triggeredAt', width: 180, render: (_, record) => formatDateTime(record.triggeredAt) },
  ], []);

  const openHelper = (title: string) => {
    setHelperTitle(title);
    form.resetFields();
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
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="未处理告警" value={alarms.filter((item) => item.status !== 'DONE').length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入任意单号、名称、负责人过滤当前 Tab' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'file', label: '文件资产', children: <ProTable<FileAssetRecord> cardBordered rowKey="id" columns={fileColumns} dataSource={filter(fileAssets) as FileAssetRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="upload" type="primary" onClick={() => openHelper('上传文件')}>上传文件</Button>]} /> },
          { key: 'approval', label: '审批中心', children: <ProTable<ApprovalRecord> cardBordered rowKey="id" columns={approvalColumns} dataSource={filter(approvals) as ApprovalRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="process" type="primary" onClick={() => openHelper('新建审批流')}>新建审批流</Button>]} /> },
          { key: 'task', label: '导入导出', children: <ProTable<TaskRecord> cardBordered rowKey="id" columns={taskColumns} dataSource={filter(tasks) as TaskRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="import" onClick={() => openHelper('新建导入任务')}>新建导入</Button>, <Button key="export" type="primary" onClick={() => openHelper('新建导出任务')}>新建导出</Button>]} /> },
          { key: 'risk', label: '风控中心', children: <ProTable<RiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={filter(risks) as RiskRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => openHelper('维护风控规则')}>维护规则</Button>]} /> },
          { key: 'job', label: '定时任务', children: <ProTable<JobRecord> cardBordered rowKey="id" columns={jobColumns} dataSource={filter(jobs) as JobRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="run" onClick={() => openHelper('手动执行任务')}>手动执行</Button>, <Button key="new" type="primary" onClick={() => openHelper('新建定时任务')}>新建任务</Button>]} /> },
          { key: 'alarm', label: '告警监控', children: <ProTable<AlarmRecord> cardBordered rowKey="id" columns={alarmColumns} dataSource={filter(alarms) as AlarmRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => openHelper('维护告警规则')}>维护规则</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={helperTitle}
        open={helperVisible}
        onCancel={() => setHelperVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setHelperVisible(false);
          message.success('操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="name" label="名称 / 单号" rules={[{ required: true, message: '请输入名称或单号' }]}><Input /></Form.Item>
            <Form.Item name="owner" label="负责人"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OperationsSupportManagement;
