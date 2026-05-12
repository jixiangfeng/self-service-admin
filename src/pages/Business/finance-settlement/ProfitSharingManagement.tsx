import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, List, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined, CalendarOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { partnerRoleOptions, profitRelationStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, containsKeyword, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import api, { type ProfitPartnerRelationRecord, type ProfitRatioVersionRecord, type ProfitShareDetailRecord } from '@/services/backendService';

const roleMap = buildValueEnum(partnerRoleOptions);
const statusMap = buildValueEnum(profitRelationStatusOptions);

const profitRelationDetailFields: DetailField<ProfitPartnerRelationRecord>[] = [
  { name: 'storeName', label: '门店' },
  { name: 'partnerName', label: '合伙人' },
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
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProfitPartnerRelationRecord | null>(null);
  const [detail, setDetail] = useState<ProfitPartnerRelationRecord | null>(null);
  const [versionVisible, setVersionVisible] = useState(false);
  const [profitDetail, setProfitDetail] = useState<ProfitShareDetailRecord | null>(null);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const relationQuery = useQuery({
    queryKey: ['profitPartnerRelations', keyword],
    queryFn: async () => (await api.profitPartnerRelation.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const detailQuery = useQuery({
    queryKey: ['profitShareDetails', keyword],
    queryFn: async () => (await api.profitShareDetail.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
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
        shareRatio: Number(String(values.shareRatio ?? values.ratio ?? '0').replace('%', '')),
        relationNo: values.relationNo || `REL${Date.now()}`,
      };
      return editingRecord ? api.profitPartnerRelation.edit({ ...payload, id: editingRecord.id }) : api.profitPartnerRelation.add(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] });
      message.success('合伙关系已保存');
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
    mutationFn: (record: ProfitShareDetailRecord) => api.profitChargeback.add({
      chargebackNo: `CB-${Date.now()}`,
      orderNo: record.orderNo || record.serviceOrderNo,
      serviceOrderNo: record.serviceOrderNo || record.orderNo,
      storeName: record.storeName,
      partnerName: record.partnerName,
      chargebackAmount: record.actualAmount ?? record.shareAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profitChargebacks'] });
      message.success('回冲记录已创建');
      navigate('/settlement/profit-details');
    },
  });
  const exportTaskMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.file.importExportTasks.add(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operationImportExportTasks'] });
      message.success('分润明细导出任务已创建');
      navigate('/operations-support');
    },
  });

  const confirmChargeback = (record: ProfitShareDetailRecord) => {
    showBusinessConfirm({
      title: '确认创建回冲记录',
      content: `确定对「${record.partnerName || record.storeName || record.orderNo}」创建分润回冲记录吗？`,
      okText: '确认回冲',
      onOk: () => chargebackMutation.mutate(record),
    });
  };

  const confirmExportProfitDetails = () => {
    showBusinessConfirm({
      title: '确认导出分润明细',
      content: `确定创建${keyword ? `关键词「${keyword}」` : '全部'}分润明细导出任务吗？`,
      okText: '确认导出',
      danger: false,
      onOk: () => exportTaskMutation.mutate({
        taskNo: `EXP-${Date.now()}`,
        taskType: 'EXPORT',
        bizType: 'PROFIT_SHARE_DETAIL',
        bizNo: keyword || 'ALL',
        fileName: `分润明细导出-${Date.now()}.xlsx`,
        operator: '系统管理员',
        status: 'PENDING',
        remark: '分润明细导出',
      }),
    });
  };

  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const details = (detailQuery.data?.records || []) as ProfitShareDetailRecord[];
  const versions = (versionQuery.data?.records || []) as ProfitRatioVersionRecord[];
  const filteredRelations = useMemo(() => relations.filter((item) => containsKeyword(keyword, [item.storeName, item.partnerName, item.ratio, item.settleAccount])), [keyword, relations]);
  const filteredDetails = useMemo(() => details.filter((item) => containsKeyword(keyword, [item.orderNo, item.serviceOrderNo, item.storeName, item.partnerName])), [keyword, details]);

  const relationColumns: ProColumns<ProfitPartnerRelationRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例 / 收款账户' } },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
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
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
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
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              api.profitPartnerRelation.edit({ ...(record as unknown as Record<string, unknown>), status: record.status === 'EFFECTIVE' ? 'ENDED' : 'EFFECTIVE' }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['profitPartnerRelations'] });
                message.success('合伙关系状态已更新');
              });
            }}
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
            });
          }}>调整</Button>
          <Button size="small" loading={chargebackMutation.isPending} onClick={() => confirmChargeback(record)}>回冲</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveRelationMutation.mutateAsync(values as unknown as Record<string, unknown>);
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
                onSubmit={(values) => setKeyword(String(values.keyword || ''))}
                onReset={() => setKeyword('')}
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
                  <Button
                    key="export"
                    type="primary"
                    loading={exportTaskMutation.isPending}
                    onClick={confirmExportProfitDetails}
                  >
                    导出分润明细
                  </Button>,
                ]}
                onSubmit={(values) => setKeyword(String(values.keyword || ''))}
                onReset={() => setKeyword('')}
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
                <Form.Item name="storeName" label="门店" rules={[{ required: true, message: '请输入门店' }]}><Input placeholder="例如：浦东旗舰店" /></Form.Item>
                <Form.Item name="partnerName" label="合伙人" rules={[{ required: true, message: '请输入合伙人' }]}><Input placeholder="例如：张三" /></Form.Item>
                <Form.Item name="partnerRole" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={partnerRoleOptions} placeholder="请选择角色" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={profitRelationStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AccountBookOutlined />} title="分润与账户" desc="配置分润比例和收款账户。">
              <div className="merchant-editor-fields">
                <Form.Item name="shareRatio" label="分润比例" rules={[{ required: true, message: '请输入分润比例' }]}><InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="30" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="settleAccount" label="收款账户" rules={[{ required: true, message: '请输入收款账户' }]}><Input placeholder="例如：招商银行 6222 **** 8888 / 张三" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="生效周期" desc="配置关系生效开始和结束时间。">
              <div className="merchant-editor-fields">
                <Form.Item name="effectiveStart" label="生效开始"><Input placeholder="2026-04-01" /></Form.Item>
                <Form.Item name="effectiveEnd" label="生效结束"><Input placeholder="2026-12-31" /></Form.Item>
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
                <Form.Item name="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={profitRelationStatusOptions} placeholder="请选择状态" /></Form.Item>
                <Form.Item name="confirmer" label="确认人"><Input placeholder="例如：财务专员" /></Form.Item>
                <Form.Item name="confirmNo" label="确认单号"><Input placeholder="例如：CONF-20260510-001" /></Form.Item>
                <Form.Item name="confirmedAt" label="确认时间"><Input placeholder="2026-05-10 10:00:00" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="confirmRemark" label="确认说明"><Input.TextArea rows={3} placeholder="填写比例调整、异常回冲或结算备注" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ProfitSharingManagement;
