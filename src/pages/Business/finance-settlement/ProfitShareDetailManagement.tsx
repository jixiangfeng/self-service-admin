import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { SplitCellsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  partnerRoleOptions,
  profitRelationStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface PartnerRelationRecord {
  id: string;
  relationNo: string;
  storeName: string;
  partnerName: string;
  partnerRole: string;
  shareRatio: string;
  primarySettlement: string;
  status: string;
}

interface RatioVersionRecord {
  id: string;
  versionNo: string;
  relationNo: string;
  beforeRatio: string;
  afterRatio: string;
  effectiveAt: string;
  auditStatus: string;
}

interface ProfitDetailRecord {
  id: string;
  detailNo: string;
  settlementBillNo: string;
  serviceOrderNo: string;
  partnerName: string;
  shareAmount: number;
  refundAmount: number;
  status: string;
}

interface ChargebackRecord {
  id: string;
  chargebackNo: string;
  detailNo: string;
  refundNo: string;
  partnerName: string;
  chargebackAmount: number;
  createdAt: string;
}

interface ConfirmRecord {
  id: string;
  confirmNo: string;
  settlementBillNo: string;
  partnerName: string;
  confirmAmount: number;
  confirmer: string;
  confirmedAt: string;
}

const partnerRoleMap = buildValueEnum(partnerRoleOptions);
const relationStatusMap = buildValueEnum(profitRelationStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);

const relations: PartnerRelationRecord[] = [
  { id: 'pr1', relationNo: 'REL202604180001', storeName: '虹桥旗舰洗车站', partnerName: '平台方', partnerRole: 'PLATFORM', shareRatio: '30%', primarySettlement: '否', status: 'EFFECTIVE' },
  { id: 'pr2', relationNo: 'REL202604180002', storeName: '虹桥旗舰洗车站', partnerName: '门店合伙人-李总', partnerRole: 'PARTNER', shareRatio: '70%', primarySettlement: '是', status: 'EFFECTIVE' },
];

const versions: RatioVersionRecord[] = [
  { id: 'rv1', versionNo: 'PSV20260418', relationNo: 'REL202604180002', beforeRatio: '65%', afterRatio: '70%', effectiveAt: '2026-04-18 00:00:00', auditStatus: 'APPROVED' },
  { id: 'rv2', versionNo: 'PSV20260501', relationNo: 'REL202604180001', beforeRatio: '30%', afterRatio: '28%', effectiveAt: '2026-05-01 00:00:00', auditStatus: 'PENDING' },
];

const details: ProfitDetailRecord[] = [
  { id: 'pd1', detailNo: 'PSD202604180001', settlementBillNo: 'SET202604180001', serviceOrderNo: 'SO202604180019', partnerName: '门店合伙人-李总', shareAmount: 24.43, refundAmount: 0, status: 'APPROVED' },
  { id: 'pd2', detailNo: 'PSD202604180002', settlementBillNo: 'SET202604180001', serviceOrderNo: 'SO202604170113', partnerName: '平台方', shareAmount: 9.2, refundAmount: 3, status: 'PENDING' },
];

const chargebacks: ChargebackRecord[] = [
  { id: 'cb1', chargebackNo: 'PCB202604180001', detailNo: 'PSD202604180002', refundNo: 'RF202604180006', partnerName: '平台方', chargebackAmount: 3, createdAt: '2026-04-18 10:10:00' },
  { id: 'cb2', chargebackNo: 'PCB202604180002', detailNo: 'PSD202604180003', refundNo: 'RF202604180007', partnerName: '门店合伙人-李总', chargebackAmount: 7, createdAt: '2026-04-18 10:18:00' },
];

const confirms: ConfirmRecord[] = [
  { id: 'cf1', confirmNo: 'PSC202604180001', settlementBillNo: 'SET202604180001', partnerName: '门店合伙人-李总', confirmAmount: 1860.5, confirmer: '财务-许鸣', confirmedAt: '2026-04-18 11:00:00' },
  { id: 'cf2', confirmNo: 'PSC202604180002', settlementBillNo: 'SET202604180001', partnerName: '平台方', confirmAmount: 820.2, confirmer: '财务-许鸣', confirmedAt: '2026-04-18 11:10:00' },
];

const ProfitShareDetailManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<PartnerRelationRecord | RatioVersionRecord | ProfitDetailRecord | ChargebackRecord | ConfirmRecord | null>(null);
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

  const relationColumns = useMemo<ProColumns<PartnerRelationRecord>[]>(() => [
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '角色', dataIndex: 'partnerRole', width: 120, render: (_, record) => renderStatusTag(record.partnerRole, partnerRoleMap) },
    { title: '比例', dataIndex: 'shareRatio', width: 100 },
    { title: '主结算人', dataIndex: 'primarySettlement', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, relationStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const versionColumns = useMemo<ProColumns<RatioVersionRecord>[]>(() => [
    { title: '版本号', dataIndex: 'versionNo', width: 160 },
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '原比例', dataIndex: 'beforeRatio', width: 100 },
    { title: '新比例', dataIndex: 'afterRatio', width: 100 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
  ], []);

  const detailColumns = useMemo<ProColumns<ProfitDetailRecord>[]>(() => [
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '分润金额', dataIndex: 'shareAmount', width: 120, render: (_, record) => formatAmount(record.shareAmount) },
    { title: '退款回冲', dataIndex: 'refundAmount', width: 120, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
  ], []);

  const chargebackColumns = useMemo<ProColumns<ChargebackRecord>[]>(() => [
    { title: '回冲单号', dataIndex: 'chargebackNo', width: 180 },
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '退款单号', dataIndex: 'refundNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '回冲金额', dataIndex: 'chargebackAmount', width: 120, render: (_, record) => formatAmount(record.chargebackAmount) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const confirmColumns = useMemo<ProColumns<ConfirmRecord>[]>(() => [
    { title: '确认单号', dataIndex: 'confirmNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '确认金额', dataIndex: 'confirmAmount', width: 120, render: (_, record) => formatAmount(record.confirmAmount) },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="分润明细中心" subtitle="维护合伙关系、比例版本、分润明细、退款回冲和分润确认记录。" icon={<SplitCellsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="合伙关系" value={relations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审版本" value={versions.filter((item) => item.auditStatus === 'PENDING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="分润金额" value={formatAmount(details.reduce((sum, item) => sum + item.shareAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="回冲金额" value={formatAmount(chargebacks.reduce((sum, item) => sum + item.chargebackAmount, 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="确认记录" value={confirms.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入门店、合伙人、订单、结算单、版本、回冲单' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'relation', label: '合伙关系', children: <ProTable<PartnerRelationRecord> cardBordered rowKey="id" columns={relationColumns} dataSource={filter(relations) as PartnerRelationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增合伙关系')}>新增关系</Button>]} /> },
          { key: 'version', label: '比例版本', children: <ProTable<RatioVersionRecord> cardBordered rowKey="id" columns={versionColumns} dataSource={filter(versions) as RatioVersionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核比例版本')}>审核版本</Button>]} /> },
          { key: 'detail', label: '分润明细', children: <ProTable<ProfitDetailRecord> cardBordered rowKey="id" columns={detailColumns} dataSource={filter(details) as ProfitDetailRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} /> },
          { key: 'chargeback', label: '退款回冲', children: <ProTable<ChargebackRecord> cardBordered rowKey="id" columns={chargebackColumns} dataSource={filter(chargebacks) as ChargebackRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'confirm', label: '分润确认', children: <ProTable<ConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as ConfirmRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openModal('确认分润')}>确认分润</Button>]} /> },
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
          message.success('分润明细操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="关系 / 订单 / 结算单号" rules={[{ required: true, message: '请输入业务单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfitShareDetailManagement;
