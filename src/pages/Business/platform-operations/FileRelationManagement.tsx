import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditStatusOptions,
  publishStatusOptions,
  scopeTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { BizFileRefRecord, FileAuditRecord, FileRetentionRecord, FileUsageRecord } from '@/services/backendService';

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const fileRelationDetailFields: Record<'ref' | 'usage' | 'audit' | 'retention', DetailField<any>[]> = {
  ref: [
    { name: 'bizType', label: '业务类型' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'bizName', label: '业务名称' },
    { name: 'fileName', label: '文件名' },
    { name: 'fileAssetId', label: '文件ID' },
    { name: 'refType', label: '关联类型' },
    { name: 'status', label: '状态' },
    { name: 'linkedAt', label: '关联时间', render: (value) => formatDateTime(value) },
  ],
  usage: [
    { name: 'fileAssetId', label: '文件ID' },
    { name: 'fileName', label: '文件名' },
    { name: 'usageModule', label: '使用模块' },
    { name: 'usageCount', label: '引用次数' },
    { name: 'lastBizNo', label: '最近业务单号' },
    { name: 'lastUsedAt', label: '最近使用时间', render: (value) => formatDateTime(value) },
  ],
  audit: [
    { name: 'auditNo', label: '审核单号' },
    { name: 'fileName', label: '文件名' },
    { name: 'bizNo', label: '业务单号' },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'auditUser', label: '审核人' },
    { name: 'auditedAt', label: '审核时间', render: (value) => formatDateTime(value) },
  ],
  retention: [
    { name: 'fileName', label: '文件名' },
    { name: 'bizType', label: '业务类型' },
    { name: 'retentionRule', label: '留存规则' },
    { name: 'expireAt', label: '到期时间' },
    { name: 'status', label: '范围' },
  ],
};

const FileRelationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BizFileRefRecord | FileUsageRecord | FileAuditRecord | FileRetentionRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const refQuery = useQuery({ queryKey: ['bizFileRefs', keyword], queryFn: async () => (await api.file.refs.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const usageQuery = useQuery({ queryKey: ['fileUsageStats', keyword], queryFn: async () => (await api.file.usages.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const auditQuery = useQuery({ queryKey: ['fileAuditRecords', keyword], queryFn: async () => (await api.file.audits.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const retentionQuery = useQuery({ queryKey: ['fileRetentionRules', keyword], queryFn: async () => (await api.file.retentions.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const refs = refQuery.data?.records || [];
  const usages = usageQuery.data?.records || [];
  const audits = auditQuery.data?.records || [];
  const retentions = retentionQuery.data?.records || [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const refColumns = useMemo<ProColumns<BizFileRefRecord>[]>(() => [
    { title: '业务类型', dataIndex: 'bizType', width: 120 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '业务名称', dataIndex: 'bizName', width: 180 },
    { title: '文件名', dataIndex: 'fileName', width: 220 },
    { title: '文件ID', dataIndex: 'fileAssetId', width: 160 },
    { title: '关联类型', dataIndex: 'refType', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '关联时间', dataIndex: 'linkedAt', width: 180, render: (_, record) => formatDateTime(record.linkedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const usageColumns = useMemo<ProColumns<FileUsageRecord>[]>(() => [
    { title: '文件ID', dataIndex: 'fileAssetId', width: 160 },
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '使用模块', dataIndex: 'usageModule', width: 140 },
    { title: '引用次数', dataIndex: 'usageCount', width: 100 },
    { title: '最近业务单号', dataIndex: 'lastBizNo', width: 180 },
    { title: '最近使用时间', dataIndex: 'lastUsedAt', width: 180, render: (_, record) => formatDateTime(record.lastUsedAt) },
  ], []);

  const auditColumns = useMemo<ProColumns<FileAuditRecord>[]>(() => [
    { title: '审核单号', dataIndex: 'auditNo', width: 180 },
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '审核人', dataIndex: 'auditUser', width: 130 },
    { title: '审核时间', dataIndex: 'auditedAt', width: 180, render: (_, record) => formatDateTime(record.auditedAt) },
  ], []);

  const retentionColumns = useMemo<ProColumns<FileRetentionRecord>[]>(() => [
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '业务类型', dataIndex: 'bizType', width: 120 },
    { title: '留存规则', dataIndex: 'retentionRule', width: 220 },
    { title: '到期时间', dataIndex: 'expireAt', width: 130 },
    { title: '范围', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, scopeMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="文件关联中心" subtitle="维护文件资产与商户、门店、合同、发票、导入导出等业务对象的关联关系。" icon={<LinkOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="文件关联" value={refs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审文件" value={audits.filter((item) => item.auditStatus === 'PENDING').length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="复用文件" value={usages.filter((item) => Number(item.usageCount || 0) > 1).length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="留存规则" value={retentions.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入文件名、文件ID、业务单号、关联类型' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'ref', label: '业务关联', children: <ProTable<BizFileRefRecord> cardBordered rowKey="id" columns={refColumns} dataSource={refs} loading={refQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增文件关联')}>新增关联</Button>]} /> },
          { key: 'usage', label: '引用统计', children: <ProTable<FileUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={usages} loading={usageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'audit', label: '文件审核', children: <ProTable<FileAuditRecord> cardBordered rowKey="id" columns={auditColumns} dataSource={audits} loading={auditQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核文件')}>审核文件</Button>]} /> },
          { key: 'retention', label: '留存规则', children: <ProTable<FileRetentionRecord> cardBordered rowKey="id" columns={retentionColumns} dataSource={retentions} loading={retentionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 920 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => openModal('配置留存规则')}>配置规则</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('fileAssetId' in detail && 'usageCount' in detail ? fileRelationDetailFields.usage : 'auditNo' in detail ? fileRelationDetailFields.audit : 'retentionRule' in detail ? fileRelationDetailFields.retention : fileRelationDetailFields.ref) as DetailField<Record<string, any>>[]}
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
          if (modalTitle.includes('关联')) {
            await api.file.refs.add(values);
            queryClient.invalidateQueries({ queryKey: ['bizFileRefs'] });
            message.success('文件关联已保存');
          } else if (modalTitle.includes('审核')) {
            await api.file.audits.add(values);
            queryClient.invalidateQueries({ queryKey: ['fileAuditRecords'] });
            message.success('文件审核记录已保存');
          } else {
            await api.file.retentions.add(values);
            queryClient.invalidateQueries({ queryKey: ['fileRetentionRules'] });
            message.success('留存规则已保存');
          }
          setModalVisible(false);
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizType" label="业务类型"><Input /></Form.Item>
            <Form.Item name="bizNo" label="业务单号"><Input /></Form.Item>
            <Form.Item name="bizName" label="业务名称"><Input /></Form.Item>
            <Form.Item name="fileAssetId" label="文件ID"><Input /></Form.Item>
            <Form.Item name="fileName" label="文件名" rules={[{ required: true, message: '请输入文件名' }]}><Input /></Form.Item>
            <Form.Item name="refType" label="关联类型"><Input /></Form.Item>
            <Form.Item name="auditNo" label="审核单号"><Input /></Form.Item>
            <Form.Item name="auditUser" label="审核人"><Input /></Form.Item>
            <Form.Item name="retentionRule" label="留存规则"><Input /></Form.Item>
            <Form.Item name="expireAt" label="到期日期"><Input placeholder="YYYY-MM-DD" /></Form.Item>
            <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FileRelationManagement;
