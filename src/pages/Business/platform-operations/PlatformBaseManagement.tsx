import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditStatusOptions,
  publishStatusOptions,
  scopeTypeOptions,
  ticketStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type BizEventRecord,
  type ContentArticleRecord,
  type PlatformOrganizationRecord,
  type SequenceRuleRecord,
  type SystemConfigRecord,
} from '@/services/backendService';

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);
const ticketStatusMap = buildValueEnum(ticketStatusOptions);

const platformBaseDetailFields: Record<'org' | 'config' | 'sequence' | 'event' | 'content', DetailField<any>[]> = {
  org: [
    { name: 'orgCode', label: '组织编码' },
    { name: 'orgName', label: '组织名称' },
    { name: 'orgType', label: '组织类型' },
    { name: 'parentName', label: '上级组织' },
    { name: 'merchantName', label: '关联商户' },
    { name: 'storeName', label: '关联门店' },
    { name: 'status', label: '状态' },
  ],
  config: [
    { name: 'configKey', label: '配置键' },
    { name: 'configName', label: '配置名称' },
    { name: 'configType', label: '配置类型' },
    { name: 'scopeType', label: '范围' },
    { name: 'configValue', label: '配置值' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  sequence: [
    { name: 'ruleCode', label: '规则编码' },
    { name: 'bizType', label: '业务类型' },
    { name: 'prefix', label: '前缀' },
    { name: 'datePattern', label: '日期格式' },
    { name: 'sequenceLength', label: '流水长度' },
    { name: 'currentValue', label: '当前值' },
    { name: 'status', label: '状态' },
  ],
  event: [
    { name: 'eventNo', label: '事件编号' },
    { name: 'eventType', label: '事件类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'idempotentKey', label: '幂等键' },
    { name: 'processStatus', label: '处理状态' },
    { name: 'retryCount', label: '重试次数' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  content: [
    { name: 'articleCode', label: '内容编码' },
    { name: 'title', label: '标题' },
    { name: 'category', label: '分类' },
    { name: 'scopeType', label: '范围' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const PlatformBaseManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<PlatformOrganizationRecord | SystemConfigRecord | SequenceRuleRecord | BizEventRecord | ContentArticleRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ name: string; code: string; scopeType: string; status: string; remark: string }>();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const orgQuery = useQuery({ queryKey: ['platform-organizations', queryParams], queryFn: () => api.platformBase.organizations.page(queryParams) });
  const configQuery = useQuery({ queryKey: ['system-configs', queryParams], queryFn: () => api.platformBase.configs.page(queryParams) });
  const sequenceQuery = useQuery({ queryKey: ['sequence-rules', queryParams], queryFn: () => api.platformBase.sequenceRules.page(queryParams) });
  const eventQuery = useQuery({ queryKey: ['biz-events', queryParams], queryFn: () => api.platformBase.events.page(queryParams) });
  const contentQuery = useQuery({ queryKey: ['content-articles', queryParams], queryFn: () => api.platformBase.contents.page(queryParams) });

  const organizations = orgQuery.data?.data.records ?? [];
  const configs = configQuery.data?.data.records ?? [];
  const sequenceRules = sequenceQuery.data?.data.records ?? [];
  const events = eventQuery.data?.data.records ?? [];
  const contents = contentQuery.data?.data.records ?? [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const organizationColumns = useMemo<ProColumns<PlatformOrganizationRecord>[]>(() => [
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
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const sequenceColumns = useMemo<ProColumns<SequenceRuleRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 },
    { title: '前缀', dataIndex: 'prefix', width: 90 },
    { title: '日期格式', dataIndex: 'datePattern', width: 130 },
    { title: '流水长度', dataIndex: 'sequenceLength', width: 100 },
    { title: '当前值', dataIndex: 'currentValue', width: 100 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const eventColumns = useMemo<ProColumns<BizEventRecord>[]>(() => [
    { title: '事件编号', dataIndex: 'eventNo', width: 180 },
    { title: '事件类型', dataIndex: 'eventType', width: 130 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '幂等键', dataIndex: 'idempotentKey', width: 260 },
    { title: '处理状态', dataIndex: 'processStatus', width: 120, render: (_, record) => renderStatusTag(record.processStatus, ticketStatusMap) },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const contentColumns = useMemo<ProColumns<ContentArticleRecord>[]>(() => [
    { title: '内容编码', dataIndex: 'articleCode', width: 160 },
    { title: '标题', dataIndex: 'title', width: 220 },
    { title: '分类', dataIndex: 'category', width: 130 },
    { title: '范围', dataIndex: 'scopeType', width: 110, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
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
          { key: 'org', label: '组织租户', children: <ProTable<PlatformOrganizationRecord> cardBordered rowKey="id" columns={organizationColumns} dataSource={organizations} loading={orgQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建组织')}>新建组织</Button>]} /> },
          { key: 'config', label: '配置中心', children: <ProTable<SystemConfigRecord> cardBordered rowKey="id" columns={configColumns} dataSource={configs} loading={configQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建配置项')}>新建配置</Button>]} /> },
          { key: 'sequence', label: '编号规则', children: <ProTable<SequenceRuleRecord> cardBordered rowKey="id" columns={sequenceColumns} dataSource={sequenceRules} loading={sequenceQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建编号规则')}>新建规则</Button>]} /> },
          { key: 'event', label: '幂等事件', children: <ProTable<BizEventRecord> cardBordered rowKey="id" columns={eventColumns} dataSource={events} loading={eventQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="retry" type="primary" disabled={!events.length} onClick={() => openModal('重试业务事件')}>事件重试</Button>]} /> },
          { key: 'content', label: '内容帮助', children: <ProTable<ContentArticleRecord> cardBordered rowKey="id" columns={contentColumns} dataSource={contents} loading={contentQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建内容')}>新建内容</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('orgCode' in detail ? platformBaseDetailFields.org : 'configKey' in detail ? platformBaseDetailFields.config : 'ruleCode' in detail ? platformBaseDetailFields.sequence : 'eventNo' in detail ? platformBaseDetailFields.event : platformBaseDetailFields.content) as DetailField<Record<string, any>>[]}
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
          if (modalTitle === '新建组织') {
            await api.platformBase.organizations.add({ orgCode: values.code, orgName: values.name, orgType: values.remark, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
          } else if (modalTitle === '新建配置项') {
            await api.platformBase.configs.add({ configKey: values.code, configName: values.name, configType: values.remark, scopeType: values.scopeType, configValue: values.remark, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['system-configs'] });
          } else if (modalTitle === '新建编号规则') {
            await api.platformBase.sequenceRules.add({ ruleCode: values.code, bizType: values.name, prefix: values.code, datePattern: 'yyyyMMdd', sequenceLength: 6, currentValue: 0, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['sequence-rules'] });
          } else if (modalTitle === '重试业务事件') {
            const firstEvent = events.find((item) => item.processStatus !== 'CLOSED') || events[0];
            if (!firstEvent) {
              return;
            }
            await api.platformBase.events.retry(firstEvent.id);
            await queryClient.invalidateQueries({ queryKey: ['biz-events'] });
          } else if (modalTitle === '新建内容') {
            await api.platformBase.contents.add({ articleCode: values.code, title: values.name, category: values.remark, scopeType: values.scopeType, content: values.remark, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['content-articles'] });
          }
          setModalVisible(false);
          message.success('已保存到后端');
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
