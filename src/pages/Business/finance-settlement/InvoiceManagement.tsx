import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type InvoiceApplyRecord, type InvoiceTitleRecord } from '@/services/backendService';

type DetailRecord = InvoiceTitleRecord | InvoiceApplyRecord;

const titleTypeOptions = [
  { value: 'PERSONAL', label: '个人' },
  { value: 'COMPANY', label: '企业' },
];

const invoiceTypeOptions = [
  { value: 'NORMAL', label: '普通发票' },
  { value: 'SPECIAL', label: '专用发票' },
];

const applyStatusOptions = [
  { value: 'PENDING', label: '待开票' },
  { value: 'ISSUED', label: '已开票' },
  { value: 'REJECTED', label: '已驳回' },
];

const invoiceSourceTypeOptions = [
  { value: 'SERVICE_ORDER', label: '服务订单' },
  { value: 'RECHARGE_ORDER', label: '充值订单' },
  { value: 'SETTLEMENT_BILL', label: '结算单' },
  { value: 'RETAIL_ORDER', label: '零售订单' },
];

const titleTypeMap = buildValueEnum(titleTypeOptions);
const invoiceTypeMap = buildValueEnum(invoiceTypeOptions);
const applyStatusMap = buildValueEnum(applyStatusOptions);
const sourceTypeMap = buildValueEnum(invoiceSourceTypeOptions);

const invoiceDetailFields: Record<'title' | 'apply', DetailField<any>[]> = {
  title: [
    { name: 'titleName', label: '抬头名称' },
    { name: 'titleType', label: '抬头类型' },
    { name: 'appUserName', label: '用户' },
    { name: 'merchantName', label: '商户' },
    { name: 'taxNo', label: '税号' },
    { name: 'bankName', label: '开户行' },
    { name: 'bankAccount', label: '银行账号' },
    { name: 'address', label: '地址' },
    { name: 'phone', label: '电话' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  apply: [
    { name: 'applyNo', label: '申请单号' },
    { name: 'titleName', label: '发票抬头' },
    { name: 'appUserName', label: '申请用户' },
    { name: 'sourceBizType', label: '来源类型' },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'orderNos', label: '关联订单' },
    { name: 'settlementBillNo', label: '结算单号' },
    { name: 'amount', label: '开票金额', render: (value) => formatAmount(value) },
    { name: 'invoiceType', label: '发票类型' },
    { name: 'applyStatus', label: '申请状态' },
    { name: 'fileAssetId', label: '发票文件' },
    { name: 'rejectReason', label: '驳回原因' },
    { name: 'applyRemark', label: '申请备注' },
    { name: 'createdAt', label: '申请时间', render: (value) => formatDateTime(value) },
    { name: 'issuedAt', label: '开票时间', render: (value) => formatDateTime(value) },
  ],
};

const InvoiceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [processingApply, setProcessingApply] = useState<InvoiceApplyRecord | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();
  const [titleForm] = Form.useForm();
  const [processForm] = Form.useForm();

  const titleQuery = useQuery({
    queryKey: ['invoiceTitles', keyword],
    queryFn: async () => (await api.invoiceTitle.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const applyQuery = useQuery({
    queryKey: ['invoiceApplies', keyword],
    queryFn: async () => (await api.invoiceApply.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const createApplyMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.invoiceApply.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceApplies'] });
      message.success('开票申请已保存');
    },
  });
  const createTitleMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.invoiceTitle.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceTitles'] });
      message.success('发票抬头已保存');
    },
  });
  const processApplyMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.invoiceApply.updateStatus(Number(processingApply?.id), { ...processingApply, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceApplies'] });
      message.success('开票状态已更新');
    },
  });

  const titles = titleQuery.data?.records || [];
  const applies = applyQuery.data?.records || [];

  const filter = <T extends Record<string, any>>(records: T[]) => records.filter((record) => containsKeyword(keyword, Object.values(record)));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await createApplyMutation.mutateAsync({ ...values, amount: Number(values.amount || 0) });
    setModalVisible(false);
    form.resetFields();
  };

  const titleColumns = useMemo<ProColumns<InvoiceTitleRecord>[]>(() => [
    { title: '抬头名称', dataIndex: 'titleName', width: 240, fixed: 'left' },
    { title: '抬头类型', dataIndex: 'titleType', width: 120, render: (_, record) => renderStatusTag(record.titleType, titleTypeMap) },
    { title: '用户', dataIndex: 'appUserName', width: 140, renderText: (value) => value || '-' },
    { title: '商户', dataIndex: 'merchantName', width: 160, renderText: (value) => value || '-' },
    { title: '税号', dataIndex: 'taxNo', width: 180, renderText: (value) => value || '-' },
    { title: '开户行', dataIndex: 'bankName', width: 180, renderText: (value) => value || '-' },
    { title: '银行账号', dataIndex: 'bankAccount', width: 180, renderText: (value) => value || '-' },
    { title: '地址', dataIndex: 'address', width: 220, ellipsis: true, renderText: (value) => value || '-' },
    { title: '电话', dataIndex: 'phone', width: 140, renderText: (value) => value || '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const applyColumns = useMemo<ProColumns<InvoiceApplyRecord>[]>(() => [
    { title: '申请单号', dataIndex: 'applyNo', width: 180, fixed: 'left' },
    { title: '发票抬头', dataIndex: 'titleName', width: 240 },
    { title: '申请用户', dataIndex: 'appUserName', width: 140, renderText: (value) => value || '-' },
    { title: '来源类型', dataIndex: 'sourceBizType', width: 130, render: (_, record) => renderStatusTag(record.sourceBizType, sourceTypeMap) },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 190 },
    { title: '关联订单', dataIndex: 'orderNos', width: 220, ellipsis: true, renderText: (value) => value || '-' },
    { title: '结算单号', dataIndex: 'settlementBillNo', width: 170, renderText: (value) => value || '-' },
    { title: '开票金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '发票类型', dataIndex: 'invoiceType', width: 130, render: (_, record) => renderStatusTag(record.invoiceType, invoiceTypeMap) },
    { title: '申请状态', dataIndex: 'applyStatus', width: 120, render: (_, record) => renderStatusTag(record.applyStatus, applyStatusMap) },
    { title: '发票文件', dataIndex: 'fileAssetId', width: 150, renderText: (value) => value || '-' },
    { title: '驳回原因', dataIndex: 'rejectReason', width: 260, ellipsis: true, renderText: (value) => value || '-' },
    { title: '申请备注', dataIndex: 'applyRemark', width: 220, ellipsis: true, renderText: (value) => value || '-' },
    { title: '申请时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '开票时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="issue" onClick={() => { setProcessingApply(record); processForm.setFieldsValue(record); }}>处理</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="发票中心" subtitle="维护发票抬头、开票申请、发票文件、驳回原因和开票状态。" icon={<FileDoneOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="发票抬头" value={titles.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="开票申请" value={applies.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待开票" value={applies.filter((item) => item.applyStatus === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="已开票金额" value={applies.filter((item) => item.applyStatus === 'ISSUED').reduce((sum, item) => sum + Number(item.amount || 0), 0)} precision={2} prefix="￥" /></Card></Col>
      </Row>

      <ProTable
        rowKey="keyword"
        search={false}
        pagination={false}
        options={false}
        dataSource={[]}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true }]}
        toolbar={{ search: { value: keyword, onSearch: (value) => setKeyword(value), placeholder: '申请单 / 抬头 / 用户 / 税号' } }}
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          { key: 'title', label: '发票抬头', children: <ProTable<InvoiceTitleRecord> cardBordered rowKey="id" columns={titleColumns} dataSource={filter(titles)} loading={titleQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => { titleForm.resetFields(); setTitleModalVisible(true); }}>新建抬头</Button>]} /> },
          { key: 'apply', label: '开票申请', children: <ProTable<InvoiceApplyRecord> cardBordered rowKey="id" columns={applyColumns} dataSource={filter(applies)} loading={applyQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 2400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建开票申请')}>新建申请</Button>]} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('applyNo' in detail ? invoiceDetailFields.apply : invoiceDetailFields.title) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} confirmLoading={createApplyMutation.isPending} onCancel={() => setModalVisible(false)} width={780}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="titleName" label="发票抬头" rules={[{ required: true, message: '请输入发票抬头' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="invoiceType" label="发票类型" rules={[{ required: true, message: '请选择发票类型' }]}><Select options={invoiceTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="sourceBizType" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}><Select options={invoiceSourceTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="sourceBizNo" label="来源单号" rules={[{ required: true, message: '请输入来源单号' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="orderNos" label="关联订单"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="settlementBillNo" label="结算单号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="amount" label="开票金额" rules={[{ required: true, message: '请输入开票金额' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="applyStatus" label="开票状态" rules={[{ required: true, message: '请选择开票状态' }]}><Select options={applyStatusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="fileAssetId" label="发票文件ID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="taxNo" label="税号"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="applyRemark" label="申请备注"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={24}><Form.Item name="rejectReason" label="驳回原因 / 处理说明"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="新建发票抬头" open={titleModalVisible} onCancel={() => setTitleModalVisible(false)} onOk={async () => {
        const values = await titleForm.validateFields();
        await createTitleMutation.mutateAsync(values);
        setTitleModalVisible(false);
      }} confirmLoading={createTitleMutation.isPending} width={760}>
        <Form form={titleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="titleName" label="抬头名称" rules={[{ required: true, message: '请输入抬头名称' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="titleType" label="抬头类型" rules={[{ required: true, message: '请选择抬头类型' }]}><Select options={titleTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="appUserName" label="用户"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="merchantName" label="商户"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="taxNo" label="税号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="bankName" label="开户行"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="bankAccount" label="银行账号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="电话"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="address" label="地址"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="开票处理" open={!!processingApply} onCancel={() => setProcessingApply(null)} onOk={async () => {
        const values = await processForm.validateFields();
        await processApplyMutation.mutateAsync(values);
        setProcessingApply(null);
      }} confirmLoading={processApplyMutation.isPending} width={720}>
        <Form form={processForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="applyStatus" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={applyStatusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="fileAssetId" label="发票文件ID"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="rejectReason" label="驳回原因 / 处理说明"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
