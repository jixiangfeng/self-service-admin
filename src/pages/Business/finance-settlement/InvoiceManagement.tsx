import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface InvoiceTitleRecord {
  id: string;
  appUserName?: string;
  merchantName?: string;
  titleType: string;
  titleName: string;
  taxNo?: string;
  bankName?: string;
  bankAccount?: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

interface InvoiceApplyRecord {
  id: string;
  applyNo: string;
  titleName: string;
  appUserName: string;
  sourceBizType: string;
  sourceBizNo: string;
  orderNos: string;
  settlementBillNo?: string;
  amount: number;
  invoiceType: string;
  applyStatus: string;
  fileAssetId?: string;
  rejectReason?: string;
  applyRemark?: string;
  createdAt: string;
  issuedAt?: string;
}

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

const titles: InvoiceTitleRecord[] = [
  { id: 'it1', appUserName: '李波', titleType: 'PERSONAL', titleName: '李波', phone: '138****2451', createdAt: '2026-05-01 10:12:00' },
  { id: 'it2', merchantName: '鲸洗直营', titleType: 'COMPANY', titleName: '上海鲸洗智能服务有限公司', taxNo: '91310000MA1K202605', bankName: '招商银行上海分行', bankAccount: '6214 **** 2091', address: '上海市长宁区虹桥路 100 号', phone: '021-88886666', createdAt: '2026-05-02 14:20:00' },
  { id: 'it3', appUserName: '陈越', titleType: 'COMPANY', titleName: '上海越行科技有限公司', taxNo: '91310000MA1K202606', bankName: '工商银行徐汇支行', bankAccount: '6222 **** 7788', address: '上海市徐汇区漕溪北路 88 号', phone: '021-66668888', createdAt: '2026-05-06 09:10:00' },
];

const applies: InvoiceApplyRecord[] = [
  { id: 'ia1', applyNo: 'INV202605070001', titleName: '上海越行科技有限公司', appUserName: '陈越', sourceBizType: 'SERVICE_ORDER', sourceBizNo: 'SO-GROUP-20260507-001', orderNos: 'SO202605070018,SO202605070031', amount: 299.9, invoiceType: 'NORMAL', applyStatus: 'PENDING', applyRemark: '用户合并两笔洗车订单开票', createdAt: '2026-05-07 09:30:00' },
  { id: 'ia2', applyNo: 'INV202605060008', titleName: '上海鲸洗智能服务有限公司', appUserName: '企业管理员-许鸣', sourceBizType: 'SETTLEMENT_BILL', sourceBizNo: 'SET202605060001', orderNos: 'SO202605010001-SO202605060120', settlementBillNo: 'SET202605060001', amount: 1280, invoiceType: 'SPECIAL', applyStatus: 'ISSUED', fileAssetId: 'FA202605060081', applyRemark: '企业月结开票', createdAt: '2026-05-06 10:00:00', issuedAt: '2026-05-06 16:20:00' },
  { id: 'ia3', applyNo: 'INV202605050011', titleName: '李波', appUserName: '李波', sourceBizType: 'RECHARGE_ORDER', sourceBizNo: 'RCG202605050011', orderNos: '-', amount: 39.9, invoiceType: 'NORMAL', applyStatus: 'REJECTED', rejectReason: '个人抬头信息不完整，请补充手机号。', applyRemark: '充值订单开票', createdAt: '2026-05-05 13:20:00' },
];

const titleTypeMap = buildValueEnum(titleTypeOptions);
const invoiceTypeMap = buildValueEnum(invoiceTypeOptions);
const applyStatusMap = buildValueEnum(applyStatusOptions);
const sourceTypeMap = buildValueEnum(invoiceSourceTypeOptions);

const InvoiceManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const filter = <T extends Record<string, any>>(records: T[]) => records.filter((record) => containsKeyword(keyword, Object.values(record)));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('发票信息已保存');
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
    { title: '申请用户', dataIndex: 'appUserName', width: 140 },
    { title: '来源类型', dataIndex: 'sourceBizType', width: 130, render: (_, record) => renderStatusTag(record.sourceBizType, sourceTypeMap) },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 190 },
    { title: '关联订单', dataIndex: 'orderNos', width: 220, ellipsis: true },
    { title: '结算单号', dataIndex: 'settlementBillNo', width: 170, renderText: (value) => value || '-' },
    { title: '开票金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '发票类型', dataIndex: 'invoiceType', width: 130, render: (_, record) => renderStatusTag(record.invoiceType, invoiceTypeMap) },
    { title: '申请状态', dataIndex: 'applyStatus', width: 120, render: (_, record) => renderStatusTag(record.applyStatus, applyStatusMap) },
    { title: '发票文件', dataIndex: 'fileAssetId', width: 150, renderText: (value) => value || '-' },
    { title: '驳回原因', dataIndex: 'rejectReason', width: 260, ellipsis: true, renderText: (value) => value || '-' },
    { title: '申请备注', dataIndex: 'applyRemark', width: 220, ellipsis: true, renderText: (value) => value || '-' },
    { title: '申请时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '开票时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="issue" onClick={() => openModal(`处理开票 · ${record.applyNo}`)}>处理</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="发票中心" subtitle="维护发票抬头、开票申请、发票文件、驳回原因和开票状态。" icon={<FileDoneOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="发票抬头" value={titles.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="开票申请" value={applies.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待开票" value={applies.filter((item) => item.applyStatus === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="已开票金额" value={applies.filter((item) => item.applyStatus === 'ISSUED').reduce((sum, item) => sum + item.amount, 0)} precision={2} prefix="￥" /></Card></Col>
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
          { key: 'title', label: '发票抬头', children: <ProTable<InvoiceTitleRecord> cardBordered rowKey="id" columns={titleColumns} dataSource={filter(titles)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建发票抬头')}>新建抬头</Button>]} /> },
          { key: 'apply', label: '开票申请', children: <ProTable<InvoiceApplyRecord> cardBordered rowKey="id" columns={applyColumns} dataSource={filter(applies)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 2400 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建开票申请')}>新建申请</Button>]} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>)}
          </Descriptions>
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={780}>
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
    </div>
  );
};

export default InvoiceManagement;
