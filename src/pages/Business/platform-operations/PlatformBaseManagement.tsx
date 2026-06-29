import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { ControlOutlined, FileTextOutlined, NodeIndexOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditStatusOptions,
  publishStatusOptions,
  scopeTypeOptions,
  ticketStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
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
const orgTypeOptions = [
  { value: 'PLATFORM', label: '平台组织' },
  { value: 'MERCHANT', label: '商户组织' },
  { value: 'STORE', label: '门店组织' },
  { value: 'DEPARTMENT', label: '职能部门' },
];
const configTypeOptions = [
  { value: 'SWITCH', label: '开关配置' },
  { value: 'NUMBER', label: '数字配置' },
  { value: 'TEXT', label: '文本配置' },
  { value: 'URL', label: '链接配置' },
];
const configSwitchOptions = [
  { value: '开启', label: '开启' },
  { value: '关闭', label: '关闭' },
];
const contentCategoryOptions = [
  { value: 'HELP', label: '帮助说明' },
  { value: 'NOTICE', label: '运营公告' },
  { value: 'AGREEMENT', label: '协议内容' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');

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
  const [form] = Form.useForm<{
    name: string;
    code: string;
    scopeType?: string;
    status?: string;
    orgType?: string;
    parentName?: string;
    merchantName?: string;
    storeName?: string;
    configType?: string;
    configValue?: string;
    configSwitch?: string;
    configNumber?: number;
    configText?: string;
    configUrl?: string;
    bizType?: string;
    prefix?: string;
    datePattern?: string;
    sequenceLength?: number;
    currentValue?: number;
    category?: string;
    contentSummary?: string;
  }>();

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
    form.setFieldsValue({
      scopeType: 'PLATFORM',
      status: 'PUBLISHED',
      orgType: 'PLATFORM',
      configType: 'SWITCH',
      category: 'HELP',
      datePattern: 'yyyyMMdd',
      sequenceLength: 6,
      currentValue: 0,
    } as any);
    setModalVisible(true);
  };

  const configType = Form.useWatch('configType', form);
  const retryEventMutation = useMutation({
    mutationFn: (id: number) => api.platformBase.events.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biz-events'] });
      message.success('业务事件已发起重试');
    },
  });

  const confirmRetryEvent = (record: BizEventRecord) => {
    showBusinessConfirm({
      title: '确认重试业务事件',
      content: `确定重试事件「${record.eventNo || record.bizNo || record.id}」吗？系统会重新触发该事件处理。`,
      okText: '确认重试',
      onOk: () => retryEventMutation.mutate(record.id),
    });
  };

  const buildConfigValue = (values: {
    configType?: string;
    configValue?: string;
    configSwitch?: string;
    configNumber?: number;
    configText?: string;
    configUrl?: string;
  }) => {
    if (values.configType === 'SWITCH') return values.configSwitch || values.configValue || '开启';
    if (values.configType === 'NUMBER') return values.configNumber ?? values.configValue;
    if (values.configType === 'URL') return values.configUrl || values.configValue;
    return values.configText || values.configValue;
  };

  const organizationColumns = useMemo<ProColumns<PlatformOrganizationRecord>[]>(() => [
    { title: '组织编码', dataIndex: 'orgCode', width: 150 },
    { title: '组织名称', dataIndex: 'orgName', width: 180 },
    { title: '组织类型', dataIndex: 'orgType', width: 130 , render: (value) => formatEnumText(value, 'orgType', '组织类型') },
    { title: '上级组织', dataIndex: 'parentName', width: 160 },
    { title: '关联商户', dataIndex: 'merchantName', width: 160 },
    { title: '关联门店', dataIndex: 'storeName', width: 180 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const configColumns = useMemo<ProColumns<SystemConfigRecord>[]>(() => [
    { title: '配置键', dataIndex: 'configKey', width: 180 },
    { title: '配置名称', dataIndex: 'configName', width: 180 },
    { title: '配置类型', dataIndex: 'configType', width: 130 , render: (value) => formatEnumText(value, 'configType', '配置类型') },
    { title: '范围', dataIndex: 'scopeType', width: 110, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '配置值', dataIndex: 'configValue', width: 180 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const sequenceColumns = useMemo<ProColumns<SequenceRuleRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '业务类型', dataIndex: 'bizType', width: 140 , render: (value) => formatEnumText(value, 'bizType', '业务类型') },
    { title: '前缀', dataIndex: 'prefix', width: 90 },
    { title: '日期格式', dataIndex: 'datePattern', width: 130 },
    { title: '流水长度', dataIndex: 'sequenceLength', width: 100 },
    { title: '当前值', dataIndex: 'currentValue', width: 100 },
    { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const eventColumns = useMemo<ProColumns<BizEventRecord>[]>(() => [
    { title: '事件编号', dataIndex: 'eventNo', width: 180 },
    { title: '事件类型', dataIndex: 'eventType', width: 130 , render: (value) => formatEnumText(value, 'eventType', '事件类型') },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '幂等键', dataIndex: 'idempotentKey', width: 260 },
    { title: '处理状态', dataIndex: 'processStatus', width: 120, render: (_, record) => renderStatusTag(record.processStatus, ticketStatusMap) },
    { title: '重试次数', dataIndex: 'retryCount', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            type="link"
            loading={retryEventMutation.isPending}
            disabled={record.processStatus === 'CLOSED'}
            title={record.processStatus === 'CLOSED' ? '已关闭事件不可重试' : undefined}
            onClick={() => confirmRetryEvent(record)}
          >
            重试
          </Button>
        </>
      ),
    },
  ], [retryEventMutation]);

  const contentColumns = useMemo<ProColumns<ContentArticleRecord>[]>(() => [
    { title: '内容编码', dataIndex: 'articleCode', width: 160 },
    { title: '标题', dataIndex: 'title', width: 220 },
    { title: '分类', dataIndex: 'category', width: 130 , render: (value) => formatEnumText(value, 'category', '分类') },
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

      <KeywordSearchBar
        value={keyword}
        placeholder="输入组织、配置、编号、事件、内容关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'org', label: '组织租户', children: <ProTable<PlatformOrganizationRecord> cardBordered rowKey="id" columns={organizationColumns} dataSource={organizations} loading={orgQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建组织')}>新建组织</Button>]} /> },
          { key: 'config', label: '配置中心', children: <ProTable<SystemConfigRecord> cardBordered rowKey="id" columns={configColumns} dataSource={configs} loading={configQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建配置项')}>新建配置</Button>]} /> },
          { key: 'sequence', label: '编号规则', children: <ProTable<SequenceRuleRecord> cardBordered rowKey="id" columns={sequenceColumns} dataSource={sequenceRules} loading={sequenceQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建编号规则')}>新建规则</Button>]} /> },
          { key: 'event', label: '幂等事件', children: <ProTable<BizEventRecord> cardBordered rowKey="id" columns={eventColumns} dataSource={events} loading={eventQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1420 }} toolBarRender={() => []} /> },
          { key: 'content', label: '内容帮助', children: <ProTable<ContentArticleRecord> cardBordered rowKey="id" columns={contentColumns} dataSource={contents} loading={contentQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建内容')}>新建内容</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="平台基础配置详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('orgCode' in detail ? platformBaseDetailFields.org : 'configKey' in detail ? platformBaseDetailFields.config : 'ruleCode' in detail ? platformBaseDetailFields.sequence : 'eventNo' in detail ? platformBaseDetailFields.event : platformBaseDetailFields.content) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="平台基础配置"
        title={modalTitle}
        subtitle="把组织、配置、编号、事件和内容维护拆成结构化字段，提交时兼容后端需要的配置值。"
        meta={[modalTitle || '平台基础', '运营配置']}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle === '新建组织') {
            await api.platformBase.organizations.add({ orgCode: values.code, orgName: values.name, orgType: values.orgType, parentName: values.parentName, merchantName: values.merchantName, storeName: values.storeName, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
          } else if (modalTitle === '新建配置项') {
            await api.platformBase.configs.add({ configKey: values.code, configName: values.name, configType: values.configType, scopeType: values.scopeType, configValue: buildConfigValue(values), status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['system-configs'] });
          } else if (modalTitle === '新建编号规则') {
            await api.platformBase.sequenceRules.add({ ruleCode: values.code, bizType: values.bizType || values.name, prefix: values.prefix || values.code, datePattern: values.datePattern, sequenceLength: values.sequenceLength || 6, currentValue: values.currentValue || 0, status: values.status || 'PUBLISHED' });
            await queryClient.invalidateQueries({ queryKey: ['sequence-rules'] });
          } else if (modalTitle === '新建内容') {
            await api.platformBase.contents.add({
              articleCode: values.code,
              title: values.name,
              category: values.category,
              scopeType: values.scopeType,
              content: compactJoin([
                values.contentSummary ? `内容摘要：${values.contentSummary}` : undefined,
                values.configValue ? `正文要点：${values.configValue}` : undefined,
              ]),
              status: values.status || 'PUBLISHED',
            });
            await queryClient.invalidateQueries({ queryKey: ['content-articles'] });
          }
          setModalVisible(false);
          message.success('已保存到后端');
        }}
        width={1080}
        okText="保存配置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ControlOutlined />} title="基础信息" desc="维护编码、名称、范围和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="code" label="编码 / Key" rules={[{ required: true, message: '请输入编码或 Key' }]}><Input placeholder="例如：ORG-001 / CONFIG-WASH" /></Form.Item>
                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：平台运营部" /></Form.Item>
                <Form.Item name="scopeType" label="范围"><Select options={scopeTypeOptions} placeholder="请选择范围" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            {modalTitle === '新建组织' ? (
              <BusinessEditorSection icon={<TeamOutlined />} title="组织关系" desc="配置组织类型、上级组织及关联商户门店。">
                <div className="merchant-editor-fields">
                  <Form.Item name="orgType" label="组织类型"><Select options={orgTypeOptions} placeholder="请选择组织类型" /></Form.Item>
                  <Form.Item name="parentName" label="上级组织"><Input placeholder="例如：平台总部" /></Form.Item>
                  <Form.Item name="merchantName" label="关联商户"><Input placeholder="例如：自助洗车直营网点" /></Form.Item>
                  <Form.Item name="storeName" label="关联门店"><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle === '新建配置项' ? (
              <BusinessEditorSection icon={<SettingOutlined />} title="配置内容" desc="按配置类型展示对应输入控件，避免运营直接写技术配置串。">
                <div className="merchant-editor-fields">
                  <Form.Item name="configType" label="配置类型"><Select options={configTypeOptions} placeholder="请选择配置类型" /></Form.Item>
                  {configType === 'SWITCH' ? <Form.Item name="configSwitch" label="开关状态"><Select options={configSwitchOptions} placeholder="请选择开关状态" /></Form.Item> : null}
                  {configType === 'NUMBER' ? <Form.Item name="configNumber" label="数字值"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="例如：30" /></Form.Item> : null}
                  {configType === 'TEXT' ? <Form.Item className="merchant-editor-field-span-all" name="configText" label="文本内容"><Input placeholder="例如：门店暂停营业提示语" /></Form.Item> : null}
                  {configType === 'URL' ? <Form.Item className="merchant-editor-field-span-all" name="configUrl" label="链接地址"><Input placeholder="https://example.com" /></Form.Item> : null}
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle === '新建编号规则' ? (
              <BusinessEditorSection icon={<NodeIndexOutlined />} title="编号规则" desc="配置业务类型、前缀、日期格式、流水长度和当前值。">
                <div className="merchant-editor-fields">
                  <Form.Item name="bizType" label="业务类型"><Input placeholder="例如：ORDER / PAY / SETTLE" /></Form.Item>
                  <Form.Item name="prefix" label="编号前缀"><Input placeholder="例如：ORD" /></Form.Item>
                  <Form.Item name="datePattern" label="日期格式"><Input placeholder="yyyyMMdd" /></Form.Item>
                  <Form.Item name="sequenceLength" label="流水长度"><InputNumber min={1} max={12} precision={0} style={{ width: '100%' }} /></Form.Item>
                  <Form.Item name="currentValue" label="当前值"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle === '新建内容' ? (
              <BusinessEditorSection icon={<FileTextOutlined />} title="内容信息" desc="用分类、摘要和正文要点维护内容帮助。">
                <div className="merchant-editor-fields">
                  <Form.Item name="category" label="内容分类"><Select options={contentCategoryOptions} placeholder="请选择内容分类" /></Form.Item>
                  <Form.Item name="contentSummary" label="内容摘要"><Input placeholder="例如：用户洗车流程说明" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="configValue" label="正文要点"><Input placeholder="例如：扫码进入、选择门店、支付后启动设备" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default PlatformBaseManagement;
