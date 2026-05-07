import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  publishStatusOptions,
  scopeTypeOptions,
  ticketStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface OrganizationRecord {
  id: string;
  orgCode: string;
  orgName: string;
  orgType: string;
  parentName: string;
  merchantName: string;
  storeName: string;
  status: string;
}

interface SystemConfigRecord {
  id: string;
  configKey: string;
  configName: string;
  configType: string;
  scopeType: string;
  configValue: string;
  status: string;
  updatedAt: string;
}

interface SequenceRuleRecord {
  id: string;
  ruleCode: string;
  bizType: string;
  prefix: string;
  datePattern: string;
  sequenceLength: number;
  currentValue: number;
  status: string;
}

interface BizEventRecord {
  id: string;
  eventNo: string;
  eventType: string;
  bizNo: string;
  idempotentKey: string;
  processStatus: string;
  retryCount: number;
  createdAt: string;
}

interface ContentRecord {
  id: string;
  articleCode: string;
  title: string;
  category: string;
  scopeType: string;
  status: string;
  updatedAt: string;
}

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);
const ticketStatusMap = buildValueEnum(ticketStatusOptions);

const organizations: OrganizationRecord[] = [
  { id: 'org1', orgCode: 'ORG-EAST', orgName: '华东运营中心', orgType: '平台区域', parentName: '平台总部', merchantName: '-', storeName: '-', status: 'PUBLISHED' },
  { id: 'org2', orgCode: 'ORG-HQ-STORE', orgName: '虹桥门店团队', orgType: '门店团队', parentName: '华东运营中心', merchantName: '鲸洗直营', storeName: '虹桥旗舰洗车站', status: 'PUBLISHED' },
];

const configs: SystemConfigRecord[] = [
  { id: 'cfg1', configKey: 'pay.wx.mch_id', configName: '微信支付商户号', configType: '支付参数', scopeType: 'PLATFORM', configValue: '1900000109', status: 'PUBLISHED', updatedAt: '2026-04-18 09:12:00' },
  { id: 'cfg2', configKey: 'store.nearby.radius', configName: '附近门店半径', configType: '业务开关', scopeType: 'STORE', configValue: '5000', status: 'PUBLISHED', updatedAt: '2026-04-17 18:22:00' },
];

const sequenceRules: SequenceRuleRecord[] = [
  { id: 'seq1', ruleCode: 'ORDER_NO', bizType: '服务订单', prefix: 'SO', datePattern: 'yyyyMMdd', sequenceLength: 6, currentValue: 118, status: 'PUBLISHED' },
  { id: 'seq2', ruleCode: 'REFUND_NO', bizType: '退款单', prefix: 'RF', datePattern: 'yyyyMMdd', sequenceLength: 5, currentValue: 26, status: 'PUBLISHED' },
];

const events: BizEventRecord[] = [
  { id: 'evt1', eventNo: 'EV202604180001', eventType: '支付回调', bizNo: 'PAY202604180019', idempotentKey: 'wxpay:4200002188', processStatus: 'CLOSED', retryCount: 0, createdAt: '2026-04-18 09:40:00' },
  { id: 'evt2', eventNo: 'EV202604180002', eventType: '设备回执', bizNo: 'CMD202604180008', idempotentKey: 'device:DEV-HQ-003:CMD202604180008', processStatus: 'PROCESSING', retryCount: 2, createdAt: '2026-04-18 09:43:00' },
];

const contents: ContentRecord[] = [
  { id: 'ct1', articleCode: 'HELP_REFUND', title: '退款规则说明', category: '帮助中心', scopeType: 'PLATFORM', status: 'PUBLISHED', updatedAt: '2026-04-18 10:02:00' },
  { id: 'ct2', articleCode: 'STORE_GUIDE', title: '门店使用指引', category: '小程序内容', scopeType: 'STORE', status: 'PENDING', updatedAt: '2026-04-17 16:48:00' },
];

const PlatformBaseManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<OrganizationRecord | SystemConfigRecord | SequenceRuleRecord | BizEventRecord | ContentRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ name: string; code: string; scopeType: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const organizationColumns = useMemo<ProColumns<OrganizationRecord>[]>(() => [
    { title: '组织编码', dataIndex: 'orgCode', width: 150 },
    { title: '组织名称', dataIndex: 'orgName', width: 180 },
    { title: '组织类型', dataIndex: 'orgType', width: 130 },
    { title: '上级组织', dataIndex: 'parentName', width: 160 },
    { title: '关联商户', dataIndex: 'merchantName', width: 160 },
    { title: '关联门店', dataIndex: 'storeName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const configColumns = useMemo<ProColumns<SystemConfigRecord>[]>(() => [
    { title: '配置键', dataIndex: 'configKey', width: 180 },
    { title: '配置名称', dataIndex: 'configName', width: 180 },
    { title: '配置类型', dataIndex: 'configType', width: 130 },
    { title: '范围', dataIndex: 'scopeType', width: 110, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '配置值', dataIndex: 'configValue', width: 180 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const sequenceColumns = useMemo<ProColumns<SequenceRuleRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '前缀', dataIndex: 'prefix', width: 90 },
    { title: '日期格式', dataIndex: 'datePattern', width: 130 },
    { title: '流水长度', dataIndex: 'sequenceLength', width: 100 },
    { title: '当前值', dataIndex: 'currentValue', width: 100 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
  ], []);

  const eventColumns = useMemo<ProColumns<BizEventRecord>[]>(() => [
    { title: '事件编号', dataIndex: 'eventNo', width: 180 },
    { title: '事件类型', dataIndex: 'eventType', width: 130 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '幂等键', dataIndex: 'idempotentKey', width: 260 },
    { title: '处理状态', dataIndex: 'processStatus', width: 120, render: (_, record) => renderStatusTag(record.processStatus, ticketStatusMap) },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const contentColumns = useMemo<ProColumns<ContentRecord>[]>(() => [
    { title: '内容编码', dataIndex: 'articleCode', width: 160 },
    { title: '标题', dataIndex: 'title', width: 220 },
    { title: '分类', dataIndex: 'category', width: 130 },
    { title: '范围', dataIndex: 'scopeType', width: 110, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="平台基础配置" subtitle="维护组织租户、系统参数、编号规则、幂等事件和内容帮助。" icon={<ControlOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="组织" value={organizations.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="配置项" value={configs.length} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="编号规则" value={sequenceRules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待处理事件" value={events.filter((item) => item.processStatus !== 'CLOSED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="内容帮助" value={contents.length} suffix="篇" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入组织、配置、编号、事件、内容关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'org', label: '组织租户', children: <ProTable<OrganizationRecord> cardBordered rowKey="id" columns={organizationColumns} dataSource={filter(organizations) as OrganizationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建组织')}>新建组织</Button>]} /> },
          { key: 'config', label: '配置中心', children: <ProTable<SystemConfigRecord> cardBordered rowKey="id" columns={configColumns} dataSource={filter(configs) as SystemConfigRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建配置项')}>新建配置</Button>]} /> },
          { key: 'sequence', label: '编号规则', children: <ProTable<SequenceRuleRecord> cardBordered rowKey="id" columns={sequenceColumns} dataSource={filter(sequenceRules) as SequenceRuleRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建编号规则')}>新建规则</Button>]} /> },
          { key: 'event', label: '幂等事件', children: <ProTable<BizEventRecord> cardBordered rowKey="id" columns={eventColumns} dataSource={filter(events) as BizEventRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="retry" type="primary" onClick={() => openModal('重试业务事件')}>事件重试</Button>]} /> },
          { key: 'content', label: '内容帮助', children: <ProTable<ContentRecord> cardBordered rowKey="id" columns={contentColumns} dataSource={filter(contents) as ContentRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建内容')}>新建内容</Button>]} /> },
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
          message.success('维护信息已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="code" label="编码 / Key" rules={[{ required: true, message: '请输入编码或 Key' }]}><Input /></Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
            <Form.Item name="scopeType" label="范围"><Select options={scopeTypeOptions} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="配置内容 / 说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformBaseManagement;
