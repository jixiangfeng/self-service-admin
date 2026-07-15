import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Space, Tag } from 'antd';
import { CalculatorOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import api from '@/services/backendService';
import type { SettlementRuleRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { formatDateTime } from '@/pages/Business/shared';

const ruleTypeLabels: Record<string, string> = {
  STORE_GROUP_CLEARING: '跨店结算方案', RECHARGE_BALANCE: '充值余额模板',
  BALANCE_CONSUME: '余额消费模板', PLATFORM_CLEARING: '平台通用模板',
};
const fields: DetailField<SettlementRuleRecord>[] = [
  { name: 'ruleCode', label: '规则编码' }, { name: 'ruleName', label: '规则名称' },
  { name: 'ruleType', label: '规则类型', render: (value) => ruleTypeLabels[String(value)] || value },
  { name: 'versionNo', label: '版本' }, { name: 'status', label: '状态' },
  { name: 'settlementMode', label: '处理方式' }, { name: 'balanceScopeType', label: '适用范围' },
  { name: 'sourceShareRate', label: '充值方比例' }, { name: 'serviceShareRate', label: '服务方比例' },
  { name: 'platformFeeRate', label: '平台比例' }, { name: 'giftCostBearerType', label: '赠送成本承担' },
  { name: 'settlementCycle', label: '结算周期' }, { name: 'publishedBy', label: '发布人' },
  { name: 'publishedAt', label: '发布时间', render: (value) => formatDateTime(String(value || '')) },
];

export default function SettlementRuleManagement() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [detail, setDetail] = useState<SettlementRuleRecord>();
  const query = useQuery({
    queryKey: ['settlementRules', keyword, status],
    queryFn: async () => (await api.settlementRule.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, status })).data,
  });
  const records = (query.data?.records || []) as SettlementRuleRecord[];
  const columns: ProColumns<SettlementRuleRecord>[] = [
    { title: '规则版本', dataIndex: 'ruleName', width: 280, render: (_, record) => <Space direction="vertical" size={0}><strong>{record.ruleName}</strong><span>{record.ruleCode} · {record.versionNo || '-'}</span></Space> },
    { title: '来源', dataIndex: 'ruleType', width: 160, render: (_, record) => <Tag color={record.ruleType === 'STORE_GROUP_CLEARING' ? 'blue' : 'default'}>{ruleTypeLabels[record.ruleType] || record.ruleType}</Tag> },
    { title: '比例', width: 220, render: (_, record) => `${record.sourceShareRate || 0}% / ${record.serviceShareRate || 0}% / ${record.platformFeeRate || 0}%` },
    { title: '结算周期', dataIndex: 'settlementCycle', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => <Tag color={record.status === 'ENABLED' ? 'green' : 'default'}>{record.status === 'ENABLED' ? '当前生效' : '历史版本'}</Tag> },
    { title: '发布时间', dataIndex: 'publishedAt', width: 180, render: (_, record) => formatDateTime(record.publishedAt || record.createdAt) },
    { title: '操作', valueType: 'option', width: 100, render: (_, record) => <Button type="link" icon={<EyeOutlined />} onClick={() => setDetail(record)}>查看</Button> },
  ];
  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="规则版本审计" subtitle="规则由跨店结算方案发布生成，此处只用于查看历史版本和交易追溯。" icon={<CalculatorOutlined />} />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input allowClear prefix={<SearchOutlined />} placeholder="规则编码或名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="状态" value={status} onChange={setStatus} options={[{ value: 'ENABLED', label: '当前生效' }, { value: 'DISABLED', label: '历史版本' }]} style={{ width: 150 }} />
      </Space>
      <ProTable<SettlementRuleRecord> cardBordered rowKey="id" search={false} dataSource={records} loading={query.isLoading} columns={columns} pagination={{ pageSize: 10 }} />
      <BusinessDetailModal open={Boolean(detail)} title={detail?.ruleName || '规则版本'} width={900} onCancel={() => setDetail(undefined)}>
        {detail ? <><SchemaDetail record={detail} fields={fields} column={2} labelWidth={130} />{detail.ruleSnapshot ? <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{detail.ruleSnapshot}</pre> : null}</> : null}
      </BusinessDetailModal>
    </div>
  );
}
