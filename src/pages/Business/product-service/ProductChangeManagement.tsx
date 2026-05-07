import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  billingModeOptions,
  publishStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface ProductStatusLogRecord {
  id: string;
  productCode: string;
  productName: string;
  beforeStatus: string;
  afterStatus: string;
  operator: string;
  changedAt: string;
}

interface ProductChangeLogRecord {
  id: string;
  changeNo: string;
  productCode: string;
  changeField: string;
  beforeValue: string;
  afterValue: string;
  auditStatus: string;
  changedAt: string;
}

interface PricingRuleVersionRecord {
  id: string;
  ruleCode: string;
  versionNo: string;
  billingMode: string;
  basePrice: number;
  effectiveAt: string;
  status: string;
}

interface PricingChangeLogRecord {
  id: string;
  changeNo: string;
  ruleCode: string;
  versionNo: string;
  changeField: string;
  beforeValue: string;
  afterValue: string;
  changedAt: string;
}

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const billingModeMap = buildValueEnum(billingModeOptions);

const statusLogs: ProductStatusLogRecord[] = [
  { id: 'ps1', productCode: 'SP-FOAM-001', productName: '泡沫精洗套餐', beforeStatus: 'DRAFT', afterStatus: 'PUBLISHED', operator: '商品运营-陶然', changedAt: '2026-04-18 09:00:00' },
  { id: 'ps2', productCode: 'SP-NIGHT-001', productName: '夜洗时长包', beforeStatus: 'PUBLISHED', afterStatus: 'OFFLINE', operator: '区域运营-何铭', changedAt: '2026-04-17 23:00:00' },
];

const productChanges: ProductChangeLogRecord[] = [
  { id: 'pc1', changeNo: 'PCHG202604180001', productCode: 'SP-FOAM-001', changeField: '权益内容', beforeValue: '泡沫 3 分钟', afterValue: '泡沫 5 分钟', auditStatus: 'APPROVED', changedAt: '2026-04-18 09:10:00' },
  { id: 'pc2', changeNo: 'PCHG202604170006', productCode: 'SP-NIGHT-001', changeField: '适用门店组', beforeValue: '全平台', afterValue: '夜洗门店组', auditStatus: 'PENDING', changedAt: '2026-04-17 18:00:00' },
];

const pricingVersions: PricingRuleVersionRecord[] = [
  { id: 'pv1', ruleCode: 'PRICE-HQ-DAY', versionNo: 'V20260418', billingMode: 'TIME', basePrice: 1.5, effectiveAt: '2026-04-18 08:00:00', status: 'PUBLISHED' },
  { id: 'pv2', ruleCode: 'PRICE-XH-NIGHT', versionNo: 'V20260417', billingMode: 'TIME', basePrice: 0.9, effectiveAt: '2026-04-17 20:00:00', status: 'PUBLISHED' },
];

const pricingChanges: PricingChangeLogRecord[] = [
  { id: 'prc1', changeNo: 'PRC202604180001', ruleCode: 'PRICE-HQ-DAY', versionNo: 'V20260418', changeField: '基础单价', beforeValue: '1.8', afterValue: '1.5', changedAt: '2026-04-18 08:30:00' },
  { id: 'prc2', changeNo: 'PRC202604170006', ruleCode: 'PRICE-XH-NIGHT', versionNo: 'V20260417', changeField: '生效时段', beforeValue: '21:00-02:00', afterValue: '20:00-02:00', changedAt: '2026-04-17 18:30:00' },
];

const ProductChangeManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ProductStatusLogRecord | ProductChangeLogRecord | PricingRuleVersionRecord | PricingChangeLogRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ code: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
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
    { title: '字段', dataIndex: 'changeField', width: 130 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
  ], []);

  const pricingVersionColumns = useMemo<ProColumns<PricingRuleVersionRecord>[]>(() => [
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '计费模式', dataIndex: 'billingMode', width: 120, render: (_, record) => renderStatusTag(record.billingMode, billingModeMap) },
    { title: '基础价格', dataIndex: 'basePrice', width: 120, render: (_, record) => formatAmount(record.basePrice) },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
  ], []);

  const pricingChangeColumns = useMemo<ProColumns<PricingChangeLogRecord>[]>(() => [
    { title: '变更单号', dataIndex: 'changeNo', width: 180 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '字段', dataIndex: 'changeField', width: 130 },
    { title: '变更前', dataIndex: 'beforeValue', width: 180 },
    { title: '变更后', dataIndex: 'afterValue', width: 180 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
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
          { key: 'status', label: '商品状态日志', children: <ProTable<ProductStatusLogRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={filter(statusLogs) as ProductStatusLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'productChange', label: '商品变更日志', children: <ProTable<ProductChangeLogRecord> cardBordered rowKey="id" columns={productChangeColumns} dataSource={filter(productChanges) as ProductChangeLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核商品变更')}>审核变更</Button>]} /> },
          { key: 'pricingVersion', label: '计费规则版本', children: <ProTable<PricingRuleVersionRecord> cardBordered rowKey="id" columns={pricingVersionColumns} dataSource={filter(pricingVersions) as PricingRuleVersionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建计费规则版本')}>新建版本</Button>]} /> },
          { key: 'pricingChange', label: '规则变更日志', children: <ProTable<PricingChangeLogRecord> cardBordered rowKey="id" columns={pricingChangeColumns} dataSource={filter(pricingChanges) as PricingChangeLogRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} /> },
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
          message.success('商品变更操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="code" label="商品 / 规则 / 变更单号" rules={[{ required: true, message: '请输入编码或变更单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductChangeManagement;
