import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, BankOutlined, FileDoneOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
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

      <KeywordSearchBar
        value={keyword}
        placeholder="申请单 / 抬头 / 用户 / 税号"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'title', label: '发票抬头', children: <ProTable<InvoiceTitleRecord> cardBordered rowKey="id" columns={titleColumns} dataSource={filter(titles)} loading={titleQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => { titleForm.resetFields(); setTitleModalVisible(true); }}>新建抬头</Button>]} /> },
          { key: 'apply', label: '开票申请', children: <ProTable<InvoiceApplyRecord> cardBordered rowKey="id" columns={applyColumns} dataSource={filter(applies)} loading={applyQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 2400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建开票申请')}>新建申请</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="发票详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('applyNo' in detail ? invoiceDetailFields.apply : invoiceDetailFields.title) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="开票申请"
        title={modalTitle || '新建开票申请'}
        subtitle="把发票抬头、来源业务、金额、文件和处理说明补齐，方便财务开票回溯。"
        meta={['财务结算', '开票申请']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={createApplyMutation.isPending}
        onCancel={() => setModalVisible(false)}
        width={1040}
        okText="保存申请"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<FileTextOutlined />} title="发票信息" desc="确认抬头、税号和发票类型。">
              <div className="merchant-editor-fields">
                <Form.Item name="titleName" label="发票抬头" rules={[{ required: true, message: '请输入发票抬头' }]}><Input placeholder="例如：上海鲸洗科技有限公司" /></Form.Item>
                <Form.Item name="invoiceType" label="发票类型" rules={[{ required: true, message: '请选择发票类型' }]}><Select options={invoiceTypeOptions} placeholder="请选择发票类型" /></Form.Item>
                <Form.Item name="taxNo" label="税号"><Input placeholder="纳税人识别号" /></Form.Item>
                <Form.Item name="amount" label="开票金额" rules={[{ required: true, message: '请输入开票金额' }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AuditOutlined />} title="来源业务" desc="记录来源单据和关联订单，保证开票申请能回到交易或结算来源。">
              <div className="merchant-editor-fields">
                <Form.Item name="sourceBizType" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}><Select options={invoiceSourceTypeOptions} placeholder="请选择来源类型" /></Form.Item>
                <Form.Item name="sourceBizNo" label="来源单号" rules={[{ required: true, message: '请输入来源单号' }]}><Input placeholder="订单号 / 结算单号" /></Form.Item>
                <Form.Item name="orderNos" label="关联订单"><Input placeholder="多个订单用逗号分隔" /></Form.Item>
                <Form.Item name="settlementBillNo" label="结算单号"><Input placeholder="例如：SETTLE-202605-001" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<FileDoneOutlined />} title="处理闭环" desc="维护开票状态、文件和处理说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="applyStatus" label="开票状态" rules={[{ required: true, message: '请选择开票状态' }]}><Select options={applyStatusOptions} placeholder="请选择开票状态" /></Form.Item>
                <Form.Item name="fileAssetId" label="发票文件"><OssImageUpload fileKind="file" returnField="assetId" prefix="invoice/files" placeholder="上传发票文件" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="applyRemark" label="申请备注"><Input placeholder="填写申请说明、客户要求或发票抬头特殊要求" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="rejectReason" label="驳回原因 / 处理说明"><Input.TextArea rows={3} placeholder="驳回时填写原因，已开票时填写处理说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="发票抬头"
        title="新建发票抬头"
        subtitle="补齐抬头主体、税务信息、开户信息和联系地址，减少后续开票反复沟通。"
        meta={['财务结算', '抬头档案']}
        open={titleModalVisible}
        onCancel={() => setTitleModalVisible(false)}
        onOk={async () => {
          const values = await titleForm.validateFields();
          await createTitleMutation.mutateAsync(values);
          setTitleModalVisible(false);
          titleForm.resetFields();
        }}
        confirmLoading={createTitleMutation.isPending}
        width={1040}
        okText="保存抬头"
      >
        <Form form={titleForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<UserOutlined />} title="主体归属" desc="明确抬头归属用户或商户。">
              <div className="merchant-editor-fields">
                <Form.Item name="titleName" label="抬头名称" rules={[{ required: true, message: '请输入抬头名称' }]}><Input placeholder="个人姓名或公司名称" /></Form.Item>
                <Form.Item name="titleType" label="抬头类型" rules={[{ required: true, message: '请选择抬头类型' }]}><Select options={titleTypeOptions} placeholder="请选择抬头类型" /></Form.Item>
                <Form.Item name="appUserName" label="用户"><Input placeholder="个人抬头对应用户" /></Form.Item>
                <Form.Item name="merchantName" label="商户"><Input placeholder="企业抬头对应商户" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<BankOutlined />} title="税务与账户" desc="企业抬头需要维护税号和开户信息。">
              <div className="merchant-editor-fields">
                <Form.Item name="taxNo" label="税号"><Input placeholder="统一社会信用代码 / 纳税人识别号" /></Form.Item>
                <Form.Item name="bankName" label="开户行"><Input placeholder="例如：中国工商银行上海分行" /></Form.Item>
                <Form.Item name="bankAccount" label="银行账号"><Input placeholder="企业银行账号" /></Form.Item>
                <Form.Item name="phone" label="电话"><Input placeholder="发票联系电话" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="address" label="地址"><Input placeholder="注册地址或发票联系地址" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="开票处理"
        title={processingApply ? `处理开票申请 · ${processingApply.applyNo}` : '开票处理'}
        subtitle="更新处理状态、发票文件和驳回说明，形成财务处理闭环。"
        meta={[processingApply?.titleName || '发票申请', processingApply?.applyStatus || '待处理']}
        open={!!processingApply}
        onCancel={() => setProcessingApply(null)}
        onOk={async () => {
          const values = await processForm.validateFields();
          await processApplyMutation.mutateAsync(values);
          setProcessingApply(null);
        }}
        confirmLoading={processApplyMutation.isPending}
        width={860}
        okText="保存处理结果"
      >
        <Form form={processForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<AuditOutlined />} title="处理结果" desc="已开票时补发票文件，驳回时补原因。">
              <div className="merchant-editor-fields">
                <Form.Item name="applyStatus" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={applyStatusOptions} placeholder="请选择处理状态" /></Form.Item>
                <Form.Item name="fileAssetId" label="发票文件"><OssImageUpload fileKind="file" returnField="assetId" prefix="invoice/files" placeholder="上传发票文件" /></Form.Item>
                <Form.Item name="issuedAt" label="开票时间"><Input placeholder="2026-05-10 10:00:00" /></Form.Item>
                <Form.Item name="operator" label="处理人"><Input placeholder="例如：财务专员" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="rejectReason" label="驳回原因 / 处理说明"><Input.TextArea rows={3} placeholder="驳回原因、文件说明或重新提交要求" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default InvoiceManagement;
