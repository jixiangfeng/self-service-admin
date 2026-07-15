import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Statistic } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { SelectOptionRecord, ThirdPartyVerificationRecord } from '@/services/backendService';

const platformOptions = [
  { value: 'MEITUAN', label: '美团', status: 'Warning' },
  { value: 'DOUYIN', label: '抖音', status: 'Processing' },
];
const verificationStatusOptions = [
  { value: 'SUCCESS', label: '核销成功', status: 'Success' },
  { value: 'FAILED', label: '核销失败', status: 'Error' },
  { value: 'REVERSED', label: '已撤销', status: 'Default' },
];
const platformMap = buildValueEnum(platformOptions);
const statusMap = buildValueEnum(verificationStatusOptions);

const detailFields: DetailField<ThirdPartyVerificationRecord>[] = [
  { name: 'verificationNo', label: '核销请求号' },
  { name: 'platform', label: '平台', render: (value) => platformOptions.find((item) => item.value === value)?.label || String(value || '-') },
  { name: 'platformTradeNo', label: '平台流水号' },
  { name: 'voucherCode', label: '券码' },
  { name: 'voucherName', label: '券/服务名称' },
  { name: 'serviceOrderNo', label: '本地服务订单' },
  { name: 'storeName', label: '核销门店' },
  { name: 'userName', label: '用户' },
  { name: 'amount', label: '核销金额', render: (value) => formatAmount(value) },
  { name: 'status', label: '核销状态', render: (value) => verificationStatusOptions.find((item) => item.value === value)?.label || String(value || '-') },
  { name: 'resultMessage', label: '平台返回结果' },
  { name: 'verifiedAt', label: '核销时间', render: (value) => formatDateTime(value) },
  { name: 'createdAt', label: '入账时间', render: (value) => formatDateTime(value) },
];

const FulfillmentManagement: React.FC = () => {
  const [filters, setFilters] = useState<Record<string, string | number | undefined>>({});
  const [detail, setDetail] = useState<ThirdPartyVerificationRecord | null>(null);
  const verificationQuery = useQuery({
    queryKey: ['thirdPartyVerifications', filters],
    queryFn: async () => (await api.thirdPartyVerification.page({ pageNum: 1, pageSize: 500, ...filters })).data,
  });
  const storeOptionsQuery = useQuery({
    queryKey: ['storeOptionsForThirdPartyVerification'],
    queryFn: async () => (await api.store.options()).data,
  });
  const records = verificationQuery.data?.records || [];
  const storeOptions = (storeOptionsQuery.data || []) as SelectOptionRecord[];

  const columns: ProColumns<ThirdPartyVerificationRecord>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '请求号 / 平台流水 / 券码 / 订单 / 门店' } },
    { title: '核销请求号', dataIndex: 'verificationNo', width: 190, hideInSearch: true },
    { title: '平台', dataIndex: 'platform', width: 100, valueType: 'select', valueEnum: platformMap, render: (_, record) => renderStatusTag(record.platform, platformMap) },
    { title: '平台流水号', dataIndex: 'platformTradeNo', width: 180, hideInSearch: true, render: (value) => value || '-' },
    { title: '券码', dataIndex: 'voucherCode', width: 180, hideInSearch: true },
    { title: '券/服务名称', dataIndex: 'voucherName', width: 160, hideInSearch: true, render: (value) => value || '-' },
    { title: '本地服务订单', dataIndex: 'serviceOrderNo', width: 180, hideInSearch: true, render: (value) => value || '-' },
    { title: '核销门店', dataIndex: 'storeId', width: 160, valueType: 'select', fieldProps: { options: storeOptions, showSearch: true, optionFilterProp: 'label', allowClear: true }, render: (_, record) => record.storeName || '-' },
    { title: '用户', dataIndex: 'userName', width: 120, hideInSearch: true, render: (value) => value || '-' },
    { title: '核销金额', dataIndex: 'amount', width: 110, hideInSearch: true, render: (value) => formatAmount(value) },
    { title: '状态', dataIndex: 'status', width: 110, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '平台结果', dataIndex: 'resultMessage', width: 220, hideInSearch: true, ellipsis: true, render: (value) => value || '-' },
    { title: '核销时间', dataIndex: 'verifiedAt', width: 180, hideInSearch: true, render: (value) => formatDateTime(value) },
    { title: '操作', width: 90, hideInSearch: true, fixed: 'right', render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="第三方核销记录" subtitle="查询美团、抖音团购券的真实核销结果；本页只展示平台回传数据，不提供人工补录或改状态。" icon={<AuditOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="核销记录" value={verificationQuery.data?.total || 0} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="核销成功" value={records.filter((item) => item.status === 'SUCCESS').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="美团" value={records.filter((item) => item.platform === 'MEITUAN').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="抖音" value={records.filter((item) => item.platform === 'DOUYIN').length} suffix="笔" /></Card></Col>
      </Row>
      <ProTable<ThirdPartyVerificationRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={verificationQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 2050 }}
        onSubmit={(values) => setFilters({
          keyword: values.keyword ? String(values.keyword).trim() : undefined,
          platform: values.platform ? String(values.platform) : undefined,
          status: values.status ? String(values.status) : undefined,
          storeId: values.storeId ? Number(values.storeId) : undefined,
        })}
        onReset={() => setFilters({})}
      />

      <BusinessDetailModal title="第三方核销详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail} fields={detailFields} column={1} labelWidth={120} /> : null}
      </BusinessDetailModal>
    </div>
  );
};

export default FulfillmentManagement;
