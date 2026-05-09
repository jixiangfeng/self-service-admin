import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { SplitCellsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  partnerRoleOptions,
  profitRelationStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type ProfitChargebackRecord,
  type ProfitConfirmRecord,
  type ProfitPartnerRelationRecord,
  type ProfitRatioVersionRecord,
  type ProfitShareDetailRecord,
} from '@/services/backendService';

const partnerRoleMap = buildValueEnum(partnerRoleOptions);
const relationStatusMap = buildValueEnum(profitRelationStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);

const profitShareCenterDetailFields: Record<'relation' | 'version' | 'detail' | 'chargeback' | 'confirm', DetailField<any>[]> = {
  relation: [
    { name: 'relationNo', label: '关系编号' },
    { name: 'storeName', label: '门店' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'partnerRole', label: '角色' },
    { name: 'shareRatio', label: '比例' },
    { name: 'primarySettlement', label: '主结算人' },
    { name: 'status', label: '状态' },
  ],
  version: [
    { name: 'versionNo', label: '版本号' },
    { name: 'relationNo', label: '关系编号' },
    { name: 'beforeRatio', label: '原比例' },
    { name: 'afterRatio', label: '新比例' },
    { name: 'effectiveAt', label: '生效时间', render: (value) => formatDateTime(value) },
    { name: 'auditStatus', label: '审核状态' },
    { name: 'remark', label: '备注' },
  ],
  detail: [
    { name: 'detailNo', label: '分润明细' },
    { name: 'settlementBillNo', label: '结算单' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'baseAmount', label: '分润基数', render: (value) => formatAmount(value) },
    { name: 'shareAmount', label: '分润金额', render: (value) => formatAmount(value) },
    { name: 'refundAmount', label: '退款回冲', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
  ],
  chargeback: [
    { name: 'chargebackNo', label: '回冲单号' },
    { name: 'detailNo', label: '分润明细' },
    { name: 'refundNo', label: '退款单号' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'chargebackAmount', label: '回冲金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  confirm: [
    { name: 'confirmNo', label: '确认单号' },
    { name: 'settlementBillNo', label: '结算单' },
    { name: 'partnerName', label: '合伙人' },
    { name: 'confirmAmount', label: '确认金额', render: (value) => formatAmount(value) },
    { name: 'confirmer', label: '确认人' },
    { name: 'confirmStatus', label: '确认状态' },
    { name: 'confirmedAt', label: '确认时间', render: (value) => formatDateTime(value) },
  ],
};

const ProfitShareDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ProfitPartnerRelationRecord | ProfitRatioVersionRecord | ProfitShareDetailRecord | ProfitChargebackRecord | ProfitConfirmRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const openAction = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const relationQuery = useQuery({ queryKey: ['profitDetailRelations', keyword], queryFn: async () => (await api.profitPartnerRelation.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const versionQuery = useQuery({ queryKey: ['profitDetailVersions', keyword], queryFn: async () => (await api.profitRatioVersion.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const detailQuery = useQuery({ queryKey: ['profitDetailDetails', keyword], queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const chargebackQuery = useQuery({ queryKey: ['profitDetailChargebacks', keyword], queryFn: async () => (await api.profitChargeback.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const confirmQuery = useQuery({ queryKey: ['profitDetailConfirms', keyword], queryFn: async () => (await api.profitConfirm.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data });
  const actionMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => {
      if (modalTitle === '新增合伙关系') {
        return api.profitPartnerRelation.add({ relationNo: values.bizNo || `REL${Date.now()}`, storeName: values.remark || '-', partnerName: values.remark || '-', partnerRole: 'PARTNER', shareRatio: 0, status: values.status || 'PENDING' });
      }
      if (modalTitle === '审核比例版本') {
        return api.profitRatioVersion.add({ versionNo: values.bizNo || `PSV${Date.now()}`, relationNo: values.bizNo, afterRatio: 0, auditStatus: values.status || 'APPROVED', remark: values.remark });
      }
      return api.profitConfirm.add({ confirmNo: values.bizNo || `PSC${Date.now()}`, settlementBillNo: values.bizNo, partnerName: values.remark || '-', confirmAmount: 0, confirmer: '财务管理员', confirmStatus: values.status || 'APPROVED', confirmRemark: values.remark });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitDetailRelations'] });
      queryClient.invalidateQueries({ queryKey: ['profitDetailVersions'] });
      queryClient.invalidateQueries({ queryKey: ['profitDetailConfirms'] });
      message.success('分润操作已保存');
    },
  });

  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const versions = (versionQuery.data?.records || []) as ProfitRatioVersionRecord[];
  const details = (detailQuery.data?.records || []) as ProfitShareDetailRecord[];
  const chargebacks = (chargebackQuery.data?.records || []) as ProfitChargebackRecord[];
  const confirms = (confirmQuery.data?.records || []) as ProfitConfirmRecord[];

  const relationColumns = useMemo<ProColumns<ProfitPartnerRelationRecord>[]>(() => [
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '角色', dataIndex: 'partnerRole', width: 120, render: (_, record) => renderStatusTag(record.partnerRole, partnerRoleMap) },
    { title: '比例', dataIndex: 'shareRatio', width: 100 },
    { title: '主结算人', dataIndex: 'primarySettlement', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, relationStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const versionColumns = useMemo<ProColumns<ProfitRatioVersionRecord>[]>(() => [
    { title: '版本号', dataIndex: 'versionNo', width: 160 },
    { title: '关系编号', dataIndex: 'relationNo', width: 180 },
    { title: '原比例', dataIndex: 'beforeRatio', width: 100 },
    { title: '新比例', dataIndex: 'afterRatio', width: 100 },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const detailColumns = useMemo<ProColumns<ProfitShareDetailRecord>[]>(() => [
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '分润金额', dataIndex: 'shareAmount', width: 120, render: (_, record) => formatAmount(record.shareAmount) },
    { title: '退款回冲', dataIndex: 'refundAmount', width: 120, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const chargebackColumns = useMemo<ProColumns<ProfitChargebackRecord>[]>(() => [
    { title: '回冲单号', dataIndex: 'chargebackNo', width: 180 },
    { title: '分润明细', dataIndex: 'detailNo', width: 180 },
    { title: '退款单号', dataIndex: 'refundNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '回冲金额', dataIndex: 'chargebackAmount', width: 120, render: (_, record) => formatAmount(record.chargebackAmount) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const confirmColumns = useMemo<ProColumns<ProfitConfirmRecord>[]>(() => [
    { title: '确认单号', dataIndex: 'confirmNo', width: 180 },
    { title: '结算单', dataIndex: 'settlementBillNo', width: 180 },
    { title: '合伙人', dataIndex: 'partnerName', width: 180 },
    { title: '确认金额', dataIndex: 'confirmAmount', width: 120, render: (_, record) => formatAmount(record.confirmAmount) },
    { title: '确认人', dataIndex: 'confirmer', width: 130 },
    { title: '确认时间', dataIndex: 'confirmedAt', width: 180, render: (_, record) => formatDateTime(record.confirmedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="分润明细中心" subtitle="维护合伙关系、比例版本、分润明细、退款回冲和分润确认记录。" icon={<SplitCellsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="合伙关系" value={relations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审版本" value={versions.filter((item) => item.auditStatus === 'PENDING').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="分润金额" value={formatAmount(details.reduce((sum, item) => sum + Number(item.shareAmount || 0), 0))} /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="回冲金额" value={formatAmount(chargebacks.reduce((sum, item) => sum + Number(item.chargebackAmount || 0), 0))} /></Card></Col>
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
          { key: 'relation', label: '合伙关系', children: <ProTable<ProfitPartnerRelationRecord> cardBordered rowKey="id" columns={relationColumns} dataSource={filter(relations) as ProfitPartnerRelationRecord[]} loading={relationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openAction('新增合伙关系')}>新增关系</Button>]} /> },
          { key: 'version', label: '比例版本', children: <ProTable<ProfitRatioVersionRecord> cardBordered rowKey="id" columns={versionColumns} dataSource={filter(versions) as ProfitRatioVersionRecord[]} loading={versionQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openAction('审核比例版本')}>审核版本</Button>]} /> },
          { key: 'detail', label: '分润明细', children: <ProTable<ProfitShareDetailRecord> cardBordered rowKey="id" columns={detailColumns} dataSource={filter(details) as ProfitShareDetailRecord[]} loading={detailQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} /> },
          { key: 'chargeback', label: '退款回冲', children: <ProTable<ProfitChargebackRecord> cardBordered rowKey="id" columns={chargebackColumns} dataSource={filter(chargebacks) as ProfitChargebackRecord[]} loading={chargebackQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1220 }} /> },
          { key: 'confirm', label: '分润确认', children: <ProTable<ProfitConfirmRecord> cardBordered rowKey="id" columns={confirmColumns} dataSource={filter(confirms) as ProfitConfirmRecord[]} loading={confirmQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="confirm" type="primary" onClick={() => openAction('确认分润')}>确认分润</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('versionNo' in detail ? profitShareCenterDetailFields.version : 'detailNo' in detail && 'chargebackAmount' in detail ? profitShareCenterDetailFields.chargeback : 'detailNo' in detail ? profitShareCenterDetailFields.detail : 'confirmNo' in detail ? profitShareCenterDetailFields.confirm : profitShareCenterDetailFields.relation) as DetailField<Record<string, any>>[]}
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
          await form.validateFields();
          await actionMutation.mutateAsync(form.getFieldsValue());
          setModalVisible(false);
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
