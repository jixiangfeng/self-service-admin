import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ForkOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  publishStatusOptions,
  ticketPriorityOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface ApprovalProcessRecord {
  id: string;
  processNo: string;
  processName: string;
  bizType: string;
  nodeConfig: string;
  status: string;
  updatedAt: string;
}

interface ApprovalTaskRecord {
  id: string;
  taskNo: string;
  processNo: string;
  bizType: string;
  bizNo: string;
  currentNode: string;
  priority: string;
  status: string;
}

interface ApprovalRecord {
  id: string;
  recordNo: string;
  taskNo: string;
  nodeName: string;
  approver: string;
  action: string;
  comment: string;
  approvedAt: string;
}

interface ApprovalSlaRecord {
  id: string;
  taskNo: string;
  bizNo: string;
  currentNode: string;
  deadline: string;
  owner: string;
  status: string;
}

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const priorityMap = buildValueEnum(ticketPriorityOptions);

const processes: ApprovalProcessRecord[] = [
  { id: 'p1', processNo: 'AP-PAY-ACCOUNT', processName: '结算账户变更审批', bizType: '商户结算账户', nodeConfig: '提交-财务复核-负责人审批', status: 'PUBLISHED', updatedAt: '2026-04-18 09:00:00' },
  { id: 'p2', processNo: 'AP-ACTIVITY', processName: '活动上线审批', bizType: '营销活动', nodeConfig: '提交-预算审批-运营确认', status: 'PUBLISHED', updatedAt: '2026-04-17 18:00:00' },
];

const tasks: ApprovalTaskRecord[] = [
  { id: 't1', taskNo: 'APT202604180001', processNo: 'AP-PAY-ACCOUNT', bizType: '结算账户变更', bizNo: 'MCH-DIRECT-001', currentNode: '财务复核', priority: 'HIGH', status: 'PENDING' },
  { id: 't2', taskNo: 'APT202604180002', processNo: 'AP-ACTIVITY', bizType: '活动上线', bizNo: 'RCG-006', currentNode: '预算审批', priority: 'MEDIUM', status: 'APPROVED' },
];

const records: ApprovalRecord[] = [
  { id: 'r1', recordNo: 'APR202604180001', taskNo: 'APT202604180001', nodeName: '提交', approver: '财务-林悦', action: '提交', comment: '申请结算账户变更', approvedAt: '2026-04-18 09:10:00' },
  { id: 'r2', recordNo: 'APR202604180002', taskNo: 'APT202604180002', nodeName: '预算审批', approver: '财务-许鸣', action: '通过', comment: '预算充足', approvedAt: '2026-04-18 09:40:00' },
];

const slas: ApprovalSlaRecord[] = [
  { id: 's1', taskNo: 'APT202604180001', bizNo: 'MCH-DIRECT-001', currentNode: '财务复核', deadline: '2026-04-18 18:00:00', owner: '财务-林悦', status: 'PENDING' },
  { id: 's2', taskNo: 'APT202604180002', bizNo: 'RCG-006', currentNode: '运营确认', deadline: '2026-04-18 20:00:00', owner: '运营-何铭', status: 'APPROVED' },
];

const ApprovalFlowManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ApprovalProcessRecord | ApprovalTaskRecord | ApprovalRecord | ApprovalSlaRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
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
  ], []);

  const recordColumns = useMemo<ProColumns<ApprovalRecord>[]>(() => [
    { title: '记录编号', dataIndex: 'recordNo', width: 180 },
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '节点', dataIndex: 'nodeName', width: 130 },
    { title: '审批人', dataIndex: 'approver', width: 130 },
    { title: '动作', dataIndex: 'action', width: 100 },
    { title: '意见', dataIndex: 'comment', width: 240 },
    { title: '审批时间', dataIndex: 'approvedAt', width: 180, render: (_, record) => formatDateTime(record.approvedAt) },
  ], []);

  const slaColumns = useMemo<ProColumns<ApprovalSlaRecord>[]>(() => [
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '当前节点', dataIndex: 'currentNode', width: 130 },
    { title: '截止时间', dataIndex: 'deadline', width: 180, render: (_, record) => formatDateTime(record.deadline) },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
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
          { key: 'process', label: '流程定义', children: <ProTable<ApprovalProcessRecord> cardBordered rowKey="id" columns={processColumns} dataSource={filter(processes) as ApprovalProcessRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建审批流程')}>新建流程</Button>]} /> },
          { key: 'task', label: '审批任务', children: <ProTable<ApprovalTaskRecord> cardBordered rowKey="id" columns={taskColumns} dataSource={filter(tasks) as ApprovalTaskRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('处理审批任务')}>处理任务</Button>]} /> },
          { key: 'record', label: '审批记录', children: <ProTable<ApprovalRecord> cardBordered rowKey="id" columns={recordColumns} dataSource={filter(records) as ApprovalRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'sla', label: '超时待办', children: <ProTable<ApprovalSlaRecord> cardBordered rowKey="id" columns={slaColumns} dataSource={filter(slas) as ApprovalSlaRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="urge" type="primary" onClick={() => openModal('催办审批任务')}>催办</Button>]} /> },
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
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('审批流操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="流程 / 任务 / 业务单号" rules={[{ required: true, message: '请输入流程、任务或业务单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalFlowManagement;
