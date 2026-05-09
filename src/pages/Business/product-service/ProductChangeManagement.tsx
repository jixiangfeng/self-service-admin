import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { auditStatusOptions, billingModeOptions, publishStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { PricingChangeLogRecord, PricingRuleVersionRecord, ProductChangeLogRecord, ProductStatusLogRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const billingModeMap = buildValueEnum(billingModeOptions);

const changeDetailFields: Record<'status' | 'productChange' | 'pricingVersion' | 'pricingChange', DetailField<any>[]> = {
  status: [
    { name: 'productCode', label: '商品编码' },
    { name: 'productName', label: '商品名称' },
    { name: 'beforeStatus', label: '原状态' },
    { name: 'afterStatus', label: '新状态' },
    { name: 'operator', label: '操作人' },
    { name: 'changedAt', label: '变更时间' },
  ],
  productChange: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'productCode', label: '商品编码' },
    { name: 'productName', label: '商品名称' },
    { name: 'changeField', label: '字段' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'changedAt', label: '变更时间' },
  ],
  pricingVersion: [
    { name: 'ruleCode', label: '规则编码' },
    { name: 'versionNo', label: '版本号' },
    { name: 'billingMode', label: '计费模式' },
    { name: 'basePrice', label: '基础价格' },
    { name: 'effectiveAt', label: '生效时间' },
    { name: 'status', label: '状态' },
  ],
  pricingChange: [
    { name: 'changeNo', label: '变更单号' },
    { name: 'ruleCode', label: '规则编码' },
    { name: 'versionNo', label: '版本号' },
    { name: 'changeField', label: '字段' },
    { name: 'beforeValue', label: '变更前' },
    { name: 'afterValue', label: '变更后' },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'changedAt', label: '变更时间' },
  ],
};

const ProductChangeManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ProductStatusLogRecord | ProductChangeLogRecord | PricingRuleVersionRecord | PricingChangeLogRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState<ProductChangeLogRecord | PricingRuleVersionRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const statusQuery = useQuery({ queryKey: ['productStatusLogs'], queryFn: async () => (await api.productStatusLog.page({ current: 1, size: 500 })).data });
  const productChangeQuery = useQuery({ queryKey: ['productChangeLogs'], queryFn: async () => (await api.productChangeLog.page({ current: 1, size: 500 })).data });
  const pricingVersionQuery = useQuery({ queryKey: ['pricingRuleVersions'], queryFn: async () => (await api.pricingRuleVersion.page({ current: 1, size: 500 })).data });
  const pricingChangeQuery = useQuery({ queryKey: ['pricingChangeLogs'], queryFn: async () => (await api.pricingChangeLog.page({ current: 1, size: 500 })).data });

  const statusLogs = statusQuery.data?.records || [];
  const productChanges = productChangeQuery.data?.records || [];
  const pricingVersions = pricingVersionQuery.data?.records || [];
  const pricingChanges = pricingChangeQuery.data?.records || [];

  const saveProductChangeMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => editingRecord && 'productCode' in editingRecord
      ? api.productChangeLog.edit({ ...payload, id: editingRecord.id, auditStatus: payload.auditStatus || 'APPROVED', changedAt: payload.changedAt || new Date().toISOString() })
      : api.productChangeLog.add({ ...payload, auditStatus: payload.auditStatus || 'APPROVED', changedAt: payload.changedAt || new Date().toISOString() }),
    onSuccess: () => {
      message.success(editingRecord ? '商品变更已更新' : '商品变更已写入');
      queryClient.invalidateQueries({ queryKey: ['productChangeLogs'] });
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const savePricingVersionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => editingRecord && 'ruleCode' in editingRecord
      ? api.pricingRuleVersion.edit({ ...payload, id: editingRecord.id })
      : api.pricingRuleVersion.add(payload),
    onSuccess: () => {
      message.success(editingRecord ? '计费规则版本已更新' : '计费规则版本已写入');
      queryClient.invalidateQueries({ queryKey: ['pricingRuleVersions'] });
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string, record?: ProductChangeLogRecord | PricingRuleVersionRecord) => {
    setModalTitle(title);
    form.resetFields();
    setEditingRecord(record || null);
    if (record) {
      form.setFieldsValue(record as unknown as Record<string, string | number | undefined>);
    } else if (title.includes('版本')) {
      form.setFieldsValue({ status: 'PUBLISHED' });
    } else {
      form.setFieldsValue({ auditStatus: 'APPROVED' });
    }
    setModalVisible(true);
  };

  const statusColumns = useMemo<ProColumns<ProductStatusLogRecord>[]>(() => [
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '原状态', dataIndex: 'beforeStatus', width: 120, render: (_, record) => renderStatusTag(record.beforeStatus, publishStatusMap) },
    { title: '新状态', dataIndex: 'afterStatus', width: 120, render: (_, record) => renderStatusTag(record.afterStatus, publishStatusMap) },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const productChangeColumns = useMemo<ProColumns<ProductChangeLogRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '商品编码', dataIndex: 'productCode', width: 150 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '字段', dataIndex: 'changeField', width: 130 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openModal('编辑商品变更', record)}>编辑</Button>
      </>
    ) },
  ], []);

  const pricingVersionColumns = useMemo<ProColumns<PricingRuleVersionRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '计费模式', dataIndex: 'billingMode', width: 120, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '基础价格', dataIndex: 'basePrice', width: 120, render: (_, record) => formatAmount(record.basePrice || 0) },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '操作', width: 150, render: (_, record) => (
      <>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => openModal('编辑计费规则版本', record)}>编辑</Button>
      </>
    ) },
  ], []);

  const pricingChangeColumns = useMemo<ProColumns<PricingChangeLogRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '字段', dataIndex: 'changeField', width: 130 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus || 'APPROVED', auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商品变更中心" subtitle="维护商品状态日志、商品变更日志、计费规则版本和规则变更日志。" icon={<HistoryOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="状态日志" value={statusLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审商品变更" value={productChanges.filter((item) => item.auditStatus === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="计费版本" value={pricingVersions.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="规则变更" value={pricingChanges.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入商品、规则、版本、变更单关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'status', label: '商品状态日志', children: <ProTable<ProductStatusLogRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={filter(statusLogs) as ProductStatusLogRecord[]} loading={statusQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'productChange', label: '商品变更日志', children: <ProTable<ProductChangeLogRecord> cardBordered rowKey="id" columns={productChangeColumns} dataSource={filter(productChanges) as ProductChangeLogRecord[]} loading={productChangeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="add" type="primary" onClick={() => openModal('新增商品变更')}>新增变更</Button>]} /> },
          { key: 'pricingVersion', label: '计费规则版本', children: <ProTable<PricingRuleVersionRecord> cardBordered rowKey="id" columns={pricingVersionColumns} dataSource={filter(pricingVersions) as PricingRuleVersionRecord[]} loading={pricingVersionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建计费规则版本')}>新建版本</Button>]} /> },
          { key: 'pricingChange', label: '规则变更日志', children: <ProTable<PricingChangeLogRecord> cardBordered rowKey="id" columns={pricingChangeColumns} dataSource={filter(pricingChanges) as PricingChangeLogRecord[]} loading={pricingChangeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={('beforeStatus' in detail ? changeDetailFields.status : 'changeNo' in detail ? ('productCode' in detail ? changeDetailFields.productChange : changeDetailFields.pricingChange) : changeDetailFields.pricingVersion) as DetailField<Record<string, any>>[]} /> : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle.includes('版本')) {
            savePricingVersionMutation.mutate(values);
          } else {
            saveProductChangeMutation.mutate(values);
          }
        }}
        width={760}
        confirmLoading={saveProductChangeMutation.isPending || savePricingVersionMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            {modalTitle.includes('版本') ? (
              <>
                <Form.Item name="pricingRuleId" label="计费规则ID"><Input /></Form.Item>
                <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true, message: '请输入规则编码' }]}><Input /></Form.Item>
                <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}><Input /></Form.Item>
                <Form.Item name="billingMode" label="计费模式"><Select options={billingModeOptions} /></Form.Item>
                <Form.Item name="basePrice" label="基础价格"><Input /></Form.Item>
                <Form.Item name="effectiveAt" label="生效时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="productId" label="商品ID"><Input /></Form.Item>
                <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}><Input /></Form.Item>
                <Form.Item name="productName" label="商品名称"><Input /></Form.Item>
                <Form.Item name="changeField" label="变更字段" rules={[{ required: true, message: '请输入变更字段' }]}><Input /></Form.Item>
                <Form.Item name="auditStatus" label="审核状态"><Select options={auditStatusOptions} /></Form.Item>
                <Form.Item className="modal-span-2" name="beforeValue" label="变更前"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="afterValue" label="变更后"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={3} /></Form.Item>
              </>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductChangeManagement;
