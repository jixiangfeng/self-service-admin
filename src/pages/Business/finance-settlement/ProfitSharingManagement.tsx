import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, List, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined, CalendarOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { auditStatusOptions, partnerRoleOptions, profitRelationStatusOptions } from '@/constants/businessCatalog';

const partnerSubjectTypeOptions = [
  { value: 'MERCHANT', label: '商户主体' },
  { value: 'STORE', label: '门店主体' },
  { value: 'PLATFORM', label: '平台主体' },
  { value: 'EXTERNAL', label: '外部合伙人' },
];

const distributionModeOptions = [
  { value: 'REVENUE_RATIO', label: '收入比例' },
  { value: 'GROSS_PROFIT_RATIO', label: '毛利比例' },
  { value: 'NET_PROFIT_RATIO', label: '净利比例' },
  { value: 'FIXED_PLUS_RATIO', label: '固定+比例' },
];
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatAmount, OperatorTips, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type ProfitPartnerRelationRecord, type ProfitRatioVersionRecord, type ProfitShareDetailRecord } from '@/services/backendService';
import { DateField, DateTimeField, fromDatePickerValue, fromDateTimePickerValue, toDatePickerValue, toDateTimePickerValue } from '@/utils/formControls';

const roleMap = buildValueEnum(partnerRoleOptions);
const statusMap = buildValueEnum(profitRelationStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const partnerSubjectTypeMap = buildValueEnum(partnerSubjectTypeOptions);
const distributionModeMap = buildValueEnum(distributionModeOptions);

const profitRelationDetailFields: DetailField<ProfitPartnerRelationRecord>[] = [
  { name: 'storeId', label: '门店ID' },
  { name: 'storeName', label: '门店' },
  { name: 'partnerName', label: '合伙人' },
  { name: 'partnerSubjectType', label: '主体类型', render: (value) => partnerSubjectTypeMap[value as keyof typeof partnerSubjectTypeMap]?.text || value },
  { name: 'partnerSubjectId', label: '主体ID' },
  { name: 'partnerSubjectName', label: '主体名称' },
  { name: 'distributionMode', label: '分配模式', render: (value) => distributionModeMap[value as keyof typeof distributionModeMap]?.text || value },
  { name: 'partnerRole', label: '角色', render: (value) => roleMap[value as keyof typeof roleMap]?.text || value },
  { name: 'shareRatio', label: '分润比例' },
  { name: 'settleAccount', label: '收款账户' },
  { name: 'period', label: '生效周期' },
  { name: 'effectiveStart', label: '生效开始' },
  { name: 'effectiveEnd', label: '生效结束' },
  { name: 'status', label: '状态', render: (value) => statusMap[value as keyof typeof statusMap]?.text || value },
];

const ProfitSharingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<ProfitPartnerRelationRecord>();
  const [profitAdjustForm] = Form.useForm<Record<string, unknown>>();
  const [chargebackForm] = Form.useForm<Record<string, unknown>>();
  const [keyword, setKeyword] = useState('');
  const [relationStatusFilter, setRelationStatusFilter] = useState<string>();
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProfitPartnerRelationRecord | null>(null);
  const [detail, setDetail] = useState<ProfitPartnerRelationRecord | null>(null);
  const [versionVisible, setVersionVisible] = useState(false);
  const [profitDetail, setProfitDetail] = useState<ProfitShareDetailRecord | null>(null);
  const [chargebackTarget, setChargebackTarget] = useState<ProfitShareDetailRecord | null>(null);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const relationQuery = useQuery({
    queryKey: ['profitPartnerRelations', keyword, relationStatusFilter],
    queryFn: async () => (await api.profitPartnerRelation.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: relationStatusFilter })).data,
  });
  const detailQuery = useQuery({
    queryKey: ['profitShareDetails', keyword, detailStatusFilter],
    queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status: detailStatusFilter })).data,
  });
  const versionQuery = useQuery({
    queryKey: ['profitRatioVersions', keyword],
    queryFn: async () => (await api.profitRatioVersion.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const saveRelationMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        partnerRole: values.partnerRole || values.role,
        partnerSubjectType: values.partnerSubjectType || 'EXTERNAL',
        partnerSubjectName: values.partnerSubjectName || values.partnerName,
        partnerName: values.partnerSubjectName || values.partnerName,
        distributionMode: values.distributionMode || 'REVENUE_RATIO',
        shareRatio: Number(String(values.shareRatio ?? values.ratio ?? '0').replace('%', '')),
        relationNo: values.relationNo,
      };
      return editingRecord ? api.profitPartnerRelation.edit({ ...payload, id: editingRecord.id }) : api.profitPartnerRelation.add(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] });
      message.success('合伙关系已保存');
    },
  });
  const relationStatusMutation = useMutation({
    mutationFn: (record: ProfitPartnerRelationRecord) => api.profitPartnerRelation.edit({
      ...(record as unknown as Record<string, unknown>),
      status: record.status === 'EFFECTIVE' ? 'CLOSED' : 'EFFECTIVE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] });
      message.success('合伙关系状态已更新');
    },
  });
  const saveDetailMutation = useMutation({
    mutationFn: (record: ProfitShareDetailRecord) => api.profitShareDetail.edit({ ...record, status: 'APPROVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitShareDetails'] });
      message.success('分润调整已确认');
    },
  });
  const chargebackMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.profitChargeback.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profitChargebacks'] });
      message.success('回冲记录已创建');
      navigate('/settlement/profit-details');
    },
  });
  const confirmChargeback = (record: ProfitShareDetailRecord) => {
    setChargebackTarget(record);
    chargebackForm.setFieldsValue({
      detailNo: record.detailNo,
      partnerName: record.partnerName,
      chargebackAmount: record.actualAmount ?? record.shareAmount,
      status: 'PENDING',
    });
  };
  const confirmRelationStatus = (record: ProfitPartnerRelationRecord) => {
    const nextStatus = record.status === 'EFFECTIVE' ? 'CLOSED' : 'EFFECTIVE';
    const actionName = nextStatus === 'EFFECTIVE' ? '生效' : '结束';
    showBusinessConfirm({
      title: `确认${actionName}合伙关系`,
      content: `确定${actionName}「${record.storeName || record.relationNo} / ${record.partnerName}」的合伙关系吗？该操作会影响后续分润结算口径。`,
      okText: `确认${actionName}`,
      danger: nextStatus !== 'EFFECTIVE',
      onOk: () => relationStatusMutation.mutate(record),
    });
  };

  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const details = (detailQuery.data?.records || []) as ProfitShareDetailRecord[];
  const versions = (versionQuery.data?.records || []) as ProfitRatioVersionRecord[];
  const filteredRelations = useMemo(() => relations.filter((item) => containsKeyword(keyword, [item.storeName, item.partnerName, item.partnerSubjectName, item.ratio, item.settleAccount])), [keyword, relations]);
  const filteredDetails = useMemo(() => details.filter((item) => containsKeyword(keyword, [item.orderNo, item.serviceOrderNo, item.storeName, item.partnerName])), [keyword, details]);

  const relationColumns: ProColumns<ProfitPartnerRelationRecord>[] = [
    { title: '门店ID', dataIndex: 'storeId', width: 100, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例 / 收款账户' } },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false },
    { title: '主体类型', dataIndex: 'partnerSubjectType', width: 130, valueType: 'select', valueEnum: partnerSubjectTypeMap, render: (_, record) => renderStatusTag(record.partnerSubjectType, partnerSubjectTypeMap) },
    { title: '分配模式', dataIndex: 'distributionMode', width: 130, valueType: 'select', valueEnum: distributionModeMap, render: (_, record) => renderStatusTag(record.distributionMode, distributionModeMap) },
    {
      title: '角色',
      dataIndex: 'partnerRole',
      width: 120,
      valueType: 'select',
      valueEnum: roleMap,
      render: (_, record) => renderStatusTag(record.partnerRole, roleMap),
    },
    { title: '比例', dataIndex: 'ratio', width: 100, search: false },
    { title: '结算账户', dataIndex: 'settleAccount', width: 180, search: false },
    { title: '生效周期', dataIndex: 'period', width: 220, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: auditStatusMap, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({
                ...record,
                effectiveStart: toDatePickerValue(record.effectiveStart) || record.effectiveStart,
                effectiveEnd: toDatePickerValue(record.effectiveEnd) || record.effectiveEnd,
              } as any);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            loading={relationStatusMutation.isPending}
            onClick={() => confirmRelationStatus(record)}
          >
            {record.status === 'EFFECTIVE' ? '结束' : '生效'}
          </Button>
        </Space>
      ),
    },
  ];

  const detailColumns: ProColumns<ProfitShareDetailRecord>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 门店 / 合伙人' } },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, search: false, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '实际分润', dataIndex: 'actualAmount', width: 120, search: false, render: (_, record) => formatAmount(record.actualAmount ?? record.shareAmount) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => {
            setProfitDetail(record);
            profitAdjustForm.setFieldsValue({
              ...record,
              actualAmount: record.actualAmount ?? record.shareAmount,
              shareRatio: record.shareRatio ?? record.ratio,
              confirmedAt: toDateTimePickerValue((record as any).confirmedAt) || (record as any).confirmedAt,
            });
          }}>调整</Button>
          <Button size="small" loading={chargebackMutation.isPending} onClick={() => confirmChargeback(record)}>回冲</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveRelationMutation.mutateAsync({
      ...values,
      effectiveStart: fromDatePickerValue(values.effectiveStart as any) || values.effectiveStart,
      effectiveEnd: fromDatePickerValue(values.effectiveEnd as any) || values.effectiveEnd,
    } as unknown as Record<string, unknown>);
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="多合伙人分润" subtitle="补齐合伙关系、收款账户、周期版本和状态维护能力。" icon={<AccountBookOutlined />} />
      <WorkflowGuide
        title="分润确认闭环"
        summary="分润页要先配关系，再看版本，再核明细，最后才能进入结算单确认。"
        steps={[
          { title: '合伙关系', description: '定义门店、合伙人角色和分润比例', status: 'finish', tag: '关系配置' },
          { title: '生效版本', description: '按时间版本确定当前生效周期', status: 'process', tag: '版本管理' },
          { title: '单笔分润', description: '核对订单级分润基数和实际分润金额', status: 'process', tag: '分润明细' },
          { title: '结算确认', description: '回到结算总览生成最终结算单', status: 'wait', tag: '结算总览' },
        ]}
      />
      <OperatorTips
        items={[
          { label: '维护关系', desc: '合伙关系要先确定门店、角色、比例和生效周期，后续分润都按版本计算。', tag: '关系' },
          { label: '审核版本', desc: '比例调整不要直接覆盖历史，新增版本并审核，保证历史结算可追溯。', tag: '版本' },
          { label: '核对明细', desc: '按订单核对分润基数和实际金额，异常再做调整或退款回冲。', tag: '明细' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="合伙关系" value={relations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认分润" value={details.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店合伙人" value={new Set(relations.map((item) => item.storeName)).size} suffix="家门店" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="当前版本" value={versions.length} suffix="版" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'relation',
            label: '合伙关系',
            children: (
              <ProTable<ProfitPartnerRelationRecord>
                cardBordered
                rowKey="id"
                columns={relationColumns}
                dataSource={filteredRelations}
                loading={relationQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1700 }}
                toolBarRender={() => [
                  <Button key="version" onClick={() => setVersionVisible(true)}>版本管理</Button>,
                  <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); setModalVisible(true); }}>
                    新建合伙关系
                  </Button>,
                ]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setRelationStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setKeyword(''); setRelationStatusFilter(undefined); }}
              />
            ),
          },
          {
            key: 'detail',
            label: '分润明细',
            children: (
              <ProTable<ProfitShareDetailRecord>
                cardBordered
                rowKey="id"
                columns={detailColumns}
                dataSource={filteredDetails}
                loading={detailQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1380 }}
                toolBarRender={() => [
                  <Button key="settle" onClick={() => navigate('/settlement')}>生成结算单</Button>,
                ]}
                onSubmit={(values) => { setKeyword(String(values.keyword || '')); setDetailStatusFilter(values.status ? String(values.status) : undefined); }}
                onReset={() => { setKeyword(''); setDetailStatusFilter(undefined); }}
              />
            ),
          },
        ]}
      />

      <BusinessEditorModal
        eyebrow="合伙关系配置"
        title={editingRecord ? `编辑合伙关系 · ${editingRecord.partnerName}` : '新建合伙关系'}
        subtitle="配置门店、合伙人、角色、分润比例、收款账户和生效周期，形成分润结算基础。"
        meta={[editingRecord ? '编辑' : '新增', '多合伙人分润']}
        open={modalVisible}
        width={1080}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText="保存合伙关系"
        confirmLoading={saveRelationMutation.isPending}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TeamOutlined />} title="关系基础" desc="定义门店、合伙人和合伙人角色。">
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="门店ID" rules={[{ required: true, message: '请输入门店ID' }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如：100" /></Form.Item>
                <Form.Item name="storeName" label="门店" rules={[{ required: true, message: '请输入门店' }]}><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                <Form.Item name="relationNo" label="关系编号" rules={[{ required: true, message: '请输入关系编号' }]}><Input placeholder="例如：REL-20260628-001" /></Form.Item>
                <Form.Item name="partnerSubjectType" label="主体类型" rules={[{ required: true, message: '请选择主体类型' }]} initialValue="EXTERNAL"><Select options={partnerSubjectTypeOptions} placeholder="请选择主体类型" /></Form.Item>
                <Form.Item name="partnerSubjectId" label="主体ID"><InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="商户/门店主体ID" /></Form.Item>
                <Form.Item name="partnerSubjectName" label="合伙主体名称" rules={[{ required: true, message: '请输入合伙主体名称' }]}><Input placeholder="例如：张三 / XX商户" /></Form.Item>
                <Form.Item name="partnerRole" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={partnerRoleOptions} placeholder="请选择角色" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={profitRelationStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AccountBookOutlined />} title="分润与账户" desc="配置分润比例和收款账户。">
              <div className="merchant-editor-fields">
                <Form.Item name="shareRatio" label="分润比例" rules={[{ required: true, message: '请输入分润比例' }]}><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="30" /></Form.Item>
                <Form.Item name="distributionMode" label="分配模式" rules={[{ required: true, message: '请选择分配模式' }]} initialValue="REVENUE_RATIO"><Select options={distributionModeOptions} placeholder="请选择分配模式" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="settleAccount" label="收款账户" rules={[{ required: true, message: '请输入收款账户' }]}><Input placeholder="例如：招商银行 6222 **** 8888 / 张三" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="生效周期" desc="配置关系生效开始和结束时间。">
              <div className="merchant-editor-fields">
                <Form.Item name="effectiveStart" label="生效开始"><DateField /></Form.Item>
                <Form.Item name="effectiveEnd" label="生效结束"><DateField /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="合伙关系详情" open={!!detail} onCancel={() => setDetail(null)} width={780}>
        {detail ? (
          <SchemaDetail record={detail} fields={profitRelationDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

      <BusinessDetailModal title="版本管理" open={versionVisible} onCancel={() => setVersionVisible(false)} width={720}>
        <List
          dataSource={versions}
          renderItem={(item: ProfitRatioVersionRecord) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ fontWeight: 600 }}>{item.versionNo} / {item.relationNo}</div>
                <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)' }}>{`${item.beforeRatio}% -> ${item.afterRatio}% · ${item.auditStatus}`}</div>
              </div>
            </List.Item>
          )}
        />
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="分润明细调整"
        title={profitDetail ? `分润调整 · ${profitDetail.orderNo || profitDetail.serviceOrderNo || profitDetail.detailNo}` : '分润调整'}
        subtitle="核对订单、门店、合伙人、分润基数和实分金额，确认后进入结算或回冲。"
        meta={[profitDetail?.partnerName || '合伙人', profitDetail?.status || '待确认']}
        open={!!profitDetail}
        onCancel={() => {
          setProfitDetail(null);
          profitAdjustForm.resetFields();
        }}
        onOk={async () => {
          if (!profitDetail) return;
          const values = await profitAdjustForm.validateFields();
          saveDetailMutation.mutate({
            ...profitDetail,
            ...values,
            actualAmount: Number(values.actualAmount ?? profitDetail.actualAmount ?? profitDetail.shareAmount),
            confirmedAt: fromDateTimePickerValue(values.confirmedAt as any) || values.confirmedAt,
            status: String(values.status || 'APPROVED'),
          } as ProfitShareDetailRecord);
          setProfitDetail(null);
          profitAdjustForm.resetFields();
        }}
        confirmLoading={saveDetailMutation.isPending}
        width={980}
        okText="确认调整"
      >
        <Form form={profitAdjustForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<AccountBookOutlined />} title="订单与合伙人" desc="确认分润归属对象，避免错调门店或合伙人。">
              <div className="merchant-editor-fields">
                <Form.Item name="orderNo" label="订单号"><Input disabled placeholder="订单号" /></Form.Item>
                <Form.Item name="storeName" label="门店"><Input disabled placeholder="门店" /></Form.Item>
                <Form.Item name="partnerName" label="合伙人"><Input disabled placeholder="合伙人" /></Form.Item>
                <Form.Item name="settlementBillNo" label="结算单号"><Input placeholder="关联结算单号" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<TeamOutlined />} title="金额调整" desc="录入分润基数、比例、实分金额和回冲金额。">
              <div className="merchant-editor-fields">
                <Form.Item name="baseAmount" label="分润基数"><InputNumber min={0} precision={2} style={{ width: '100%' }} disabled /></Form.Item>
                <Form.Item name="shareRatio" label="分润比例"><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="actualAmount" label="实分金额" rules={[{ required: true, message: '请输入实分金额' }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="refundAmount" label="回冲金额"><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="无回冲可不填" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="处理闭环" desc="记录确认状态、确认人和调整说明。">
              <div className="merchant-editor-fields">
                <Form.Item name="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
                <Form.Item name="confirmer" label="确认人"><Input placeholder="例如：财务专员" /></Form.Item>
                <Form.Item name="confirmNo" label="确认单号"><Input placeholder="例如：CONF-20260510-001" /></Form.Item>
                <Form.Item name="confirmedAt" label="确认时间"><DateTimeField /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="confirmRemark" label="确认说明"><Input.TextArea rows={3} placeholder="填写比例调整、异常回冲或结算备注" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="分润回冲"
        title={chargebackTarget ? `创建回冲 · ${chargebackTarget.partnerName || chargebackTarget.storeName || chargebackTarget.detailNo}` : '创建回冲'}
        subtitle="录入回冲单号、退款单号和回冲金额，后台不再自动生成业务编号。"
        meta={[chargebackTarget?.detailNo || '分润明细', chargebackTarget?.partnerName || '合伙人']}
        open={!!chargebackTarget}
        onCancel={() => {
          setChargebackTarget(null);
          chargebackForm.resetFields();
        }}
        onOk={async () => {
          if (!chargebackTarget) return;
          const values = await chargebackForm.validateFields();
          await chargebackMutation.mutateAsync({
            ...values,
            detailNo: values.detailNo || chargebackTarget.detailNo,
            partnerName: values.partnerName || chargebackTarget.partnerName,
            chargebackAmount: Number(values.chargebackAmount || 0),
            status: values.status || 'PENDING',
          });
          setChargebackTarget(null);
          chargebackForm.resetFields();
        }}
        confirmLoading={chargebackMutation.isPending}
        width={860}
        okText="创建回冲"
      >
        <Form form={chargebackForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<AccountBookOutlined />} title="回冲信息" desc="回冲单号由业务显式录入，避免系统自动生成。">
              <div className="merchant-editor-fields">
                <Form.Item name="chargebackNo" label="回冲单号" rules={[{ required: true, message: '请输入回冲单号' }]}><Input placeholder="例如：PCB-20260628-001" /></Form.Item>
                <Form.Item name="detailNo" label="分润明细"><Input disabled placeholder="分润明细号" /></Form.Item>
                <Form.Item name="refundNo" label="退款单号"><Input placeholder="关联退款单号" /></Form.Item>
                <Form.Item name="partnerName" label="合伙人"><Input disabled placeholder="合伙人" /></Form.Item>
                <Form.Item name="chargebackAmount" label="回冲金额" rules={[{ required: true, message: '请输入回冲金额' }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="status" label="回冲状态" rules={[{ required: true, message: '请选择回冲状态' }]}><Select options={auditStatusOptions} /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ProfitSharingManagement;

