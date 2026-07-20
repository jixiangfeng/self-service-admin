import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Tabs } from 'antd';
import { EyeOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { partnerRoleOptions, profitRelationStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import {
  buildValueEnum,
  formatAmount,
  formatDateTime,
  renderStatusTag,
} from '@/pages/Business/shared';
import api, {
  type ProfitPartnerRelationRecord,
  type ProfitShareDetailRecord,
} from '@/services/backendService';

type ProfitTabKey = 'relations' | 'details';

interface PageQuery {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

const partnerSubjectTypeOptions = [
  { value: 'MERCHANT', label: '商户主体' },
  { value: 'STORE', label: '门店主体' },
  { value: 'PLATFORM', label: '平台主体' },
  { value: 'EXTERNAL', label: '外部合伙人' },
];

const profitDetailStatusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'APPROVED', label: '已核定' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'PAID', label: '已结清' },
  { value: 'REJECTED', label: '已作废' },
  { value: 'CHARGEDBACK', label: '已回冲' },
];

const roleMap = buildValueEnum(partnerRoleOptions);
const relationStatusMap = buildValueEnum(profitRelationStatusOptions.map((option) => (
  option.value === 'PENDING' ? { ...option, label: '待生效' } : option
)));
const subjectTypeMap = buildValueEnum(partnerSubjectTypeOptions);
const profitDetailStatusMap = buildValueEnum(profitDetailStatusOptions);

const formatPercent = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === '') return '-';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}%` : String(value);
};

const formatEffectivePeriod = (record: ProfitPartnerRelationRecord) => (
  `${record.effectiveStart || '立即'} 至 ${record.effectiveEnd || '长期'}`
);

const formatSettlementAccount = (record: ProfitPartnerRelationRecord) => {
  const account = [record.settleAccountName, record.settleAccountReference].filter(Boolean).join(' / ');
  return account || (record.settleAccountId ? `账户 #${record.settleAccountId}` : '-');
};

const relationDetailFields: DetailField<ProfitPartnerRelationRecord>[] = [
  { name: 'relationNo', label: '关系编号' },
  { name: 'storeName', label: '门店' },
  { name: 'partnerSubjectName', label: '合伙主体' },
  {
    name: 'partnerSubjectType',
    label: '主体类型',
    render: (value) => subjectTypeMap[value as keyof typeof subjectTypeMap]?.text || value || '-',
  },
  {
    name: 'partnerRole',
    label: '角色',
    render: (value) => roleMap[value as keyof typeof roleMap]?.text || value || '-',
  },
  { name: 'shareRatio', label: '当前比例', render: (value) => formatPercent(value) },
  { name: 'settleAccountId', label: '结算账户', render: (_, record) => formatSettlementAccount(record) },
  { name: 'settleBankName', label: '开户机构' },
  { name: 'effectiveStart', label: '生效周期', render: (_, record) => formatEffectivePeriod(record) },
  {
    name: 'status',
    label: '状态',
    render: (value) => relationStatusMap[value as keyof typeof relationStatusMap]?.text || value || '-',
  },
  { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const profitDetailFields: DetailField<ProfitShareDetailRecord>[] = [
  { name: 'detailNo', label: '明细编号' },
  { name: 'serviceOrderNo', label: '订单号', render: (_, record) => record.serviceOrderNo || record.orderNo || '-' },
  { name: 'settlementBillNo', label: '结算单号' },
  { name: 'storeName', label: '门店' },
  { name: 'relationNo', label: '关系编号' },
  { name: 'partnerSubjectName', label: '合伙主体', render: (_, record) => record.partnerSubjectName || record.partnerName || '-' },
  { name: 'baseAmount', label: '分润基数', render: (value) => formatAmount(value) },
  { name: 'shareRatio', label: '分润比例', render: (value) => formatPercent(value) },
  { name: 'shareAmount', label: '分润金额', render: (value) => formatAmount(value) },
  { name: 'refundAmount', label: '退款冲减', render: (value) => formatAmount(value) },
  { name: 'confirmedAmount', label: '确认金额', render: (value) => formatAmount(value) },
  {
    name: 'status',
    label: '状态',
    render: (value) => profitDetailStatusMap[value as keyof typeof profitDetailStatusMap]?.text || value || '-',
  },
  { name: 'createdAt', label: '生成时间', render: (value) => formatDateTime(value) },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const ProfitSharingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfitTabKey>('relations');
  const [relationQueryParams, setRelationQueryParams] = useState<PageQuery>({ pageNum: 1, pageSize: 10 });
  const [detailQueryParams, setDetailQueryParams] = useState<PageQuery>({ pageNum: 1, pageSize: 10 });
  const [selectedRelation, setSelectedRelation] = useState<ProfitPartnerRelationRecord | null>(null);
  const [selectedProfitDetail, setSelectedProfitDetail] = useState<ProfitShareDetailRecord | null>(null);

  const relationQuery = useQuery({
    queryKey: ['profitPartnerRelations', relationQueryParams],
    queryFn: async () => (await api.profitPartnerRelation.page({
      pageNum: relationQueryParams.pageNum,
      pageSize: relationQueryParams.pageSize,
      keyword: relationQueryParams.keyword,
      status: relationQueryParams.status,
    })).data,
    enabled: activeTab === 'relations',
  });

  const profitDetailQuery = useQuery({
    queryKey: ['profitShareDetails', detailQueryParams],
    queryFn: async () => (await api.profitShareDetail.page({
      pageNum: detailQueryParams.pageNum,
      pageSize: detailQueryParams.pageSize,
      keyword: detailQueryParams.keyword,
      status: detailQueryParams.status,
    })).data,
    enabled: activeTab === 'details',
  });

  const selectedProfitDetailQuery = useQuery({
    queryKey: ['profitShareDetail', selectedProfitDetail?.id],
    queryFn: async () => (await api.profitShareDetail.detail(selectedProfitDetail!.id)).data,
    enabled: !!selectedProfitDetail,
  });

  const relations = (relationQuery.data?.records || []) as ProfitPartnerRelationRecord[];
  const profitDetails = (profitDetailQuery.data?.records || []) as ProfitShareDetailRecord[];
  const profitDetailRecord = selectedProfitDetailQuery.data || selectedProfitDetail;

  const relationColumns: ProColumns<ProfitPartnerRelationRecord>[] = [
    { title: '关系编号', dataIndex: 'relationNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '关系编号 / 门店 / 合伙主体' } },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false, render: (_, record) => record.partnerSubjectName || record.partnerName || '-' },
    { title: '主体类型', dataIndex: 'partnerSubjectType', width: 120, search: false, render: (_, record) => renderStatusTag(record.partnerSubjectType, subjectTypeMap) },
    { title: '角色', dataIndex: 'partnerRole', width: 120, search: false, render: (_, record) => renderStatusTag(record.partnerRole, roleMap) },
    { title: '当前比例', dataIndex: 'shareRatio', width: 110, search: false, render: (_, record) => formatPercent(record.shareRatio) },
    { title: '结算账户', dataIndex: 'settleAccountName', width: 240, search: false, render: (_, record) => formatSettlementAccount(record) },
    { title: '生效周期', dataIndex: 'effectiveStart', width: 220, search: false, render: (_, record) => formatEffectivePeriod(record) },
    { title: '状态', dataIndex: 'status', width: 110, valueType: 'select', valueEnum: relationStatusMap, render: (_, record) => renderStatusTag(record.status, relationStatusMap) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedRelation(record)}>详情</Button> },
  ];

  const profitDetailColumns: ProColumns<ProfitShareDetailRecord>[] = [
    { title: '明细编号', dataIndex: 'detailNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '明细 / 订单 / 结算单 / 门店 / 合伙主体' } },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180, search: false, render: (_, record) => record.serviceOrderNo || record.orderNo || '-' },
    { title: '结算单号', dataIndex: 'settlementBillNo', width: 180, search: false },
    { title: '门店', dataIndex: 'storeName', width: 170, search: false },
    { title: '合伙主体', dataIndex: 'partnerSubjectName', width: 180, search: false, render: (_, record) => record.partnerSubjectName || record.partnerName || '-' },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, search: false, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '分润比例', dataIndex: 'shareRatio', width: 110, search: false, render: (_, record) => formatPercent(record.shareRatio) },
    { title: '分润金额', dataIndex: 'shareAmount', width: 120, search: false, render: (_, record) => formatAmount(record.shareAmount) },
    { title: '退款冲减', dataIndex: 'refundAmount', width: 120, search: false, render: (_, record) => formatAmount(record.refundAmount) },
    { title: '确认金额', dataIndex: 'confirmedAmount', width: 120, search: false, render: (_, record) => formatAmount(record.confirmedAmount) },
    { title: '状态', dataIndex: 'status', width: 110, valueType: 'select', valueEnum: profitDetailStatusMap, render: (_, record) => renderStatusTag(record.status, profitDetailStatusMap) },
    { title: '生成时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, search: false, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedProfitDetail(record)}>详情</Button> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="合伙人分润"
        subtitle="查看合伙关系和实际分润结果。"
        icon={<TeamOutlined />}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ProfitTabKey)}
        items={[
          {
            key: 'relations',
            label: '合伙关系',
            children: (
              <ProTable<ProfitPartnerRelationRecord>
                cardBordered
                rowKey="id"
                columns={relationColumns}
                dataSource={relations}
                loading={relationQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                options={false}
                scroll={{ x: 1530 }}
                pagination={{
                  current: relationQuery.data?.current || relationQueryParams.pageNum,
                  pageSize: relationQuery.data?.size || relationQueryParams.pageSize,
                  total: relationQuery.data?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (pageNum, pageSize) => setRelationQueryParams((prev) => ({ ...prev, pageNum, pageSize })),
                }}
                toolBarRender={false}
                onSubmit={(values) => setRelationQueryParams((prev) => ({
                  ...prev,
                  pageNum: 1,
                  keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                  status: values.status ? String(values.status) : undefined,
                }))}
                onReset={() => setRelationQueryParams((prev) => ({ pageNum: 1, pageSize: prev.pageSize }))}
              />
            ),
          },
          {
            key: 'details',
            label: '分润明细',
            children: (
              <ProTable<ProfitShareDetailRecord>
                cardBordered
                rowKey="id"
                columns={profitDetailColumns}
                dataSource={profitDetails}
                loading={profitDetailQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                options={false}
                scroll={{ x: 1900 }}
                pagination={{
                  current: profitDetailQuery.data?.current || detailQueryParams.pageNum,
                  pageSize: profitDetailQuery.data?.size || detailQueryParams.pageSize,
                  total: profitDetailQuery.data?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (pageNum, pageSize) => setDetailQueryParams((prev) => ({ ...prev, pageNum, pageSize })),
                }}
                toolBarRender={false}
                onSubmit={(values) => setDetailQueryParams((prev) => ({
                  ...prev,
                  pageNum: 1,
                  keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                  status: values.status ? String(values.status) : undefined,
                }))}
                onReset={() => setDetailQueryParams((prev) => ({ pageNum: 1, pageSize: prev.pageSize }))}
              />
            ),
          },
        ]}
      />

      <BusinessDetailModal
        title="合伙关系详情"
        eyebrow="合伙关系"
        subtitle={selectedRelation?.relationNo || ''}
        sectionTitle="关系信息"
        sectionDesc=""
        open={!!selectedRelation}
        onCancel={() => setSelectedRelation(null)}
        width={860}
      >
        {selectedRelation ? (
          <SchemaDetail record={selectedRelation} fields={relationDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>

      <BusinessDetailModal
        title="分润明细详情"
        eyebrow="分润明细"
        subtitle={profitDetailRecord?.detailNo || ''}
        sectionTitle="计算结果"
        sectionDesc=""
        open={!!selectedProfitDetail}
        onCancel={() => setSelectedProfitDetail(null)}
        confirmLoading={selectedProfitDetailQuery.isFetching}
        width={860}
      >
        {profitDetailRecord ? (
          <SchemaDetail record={profitDetailRecord} fields={profitDetailFields} column={2} labelWidth={110} />
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default ProfitSharingManagement;
