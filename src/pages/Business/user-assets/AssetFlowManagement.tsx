import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Select, Space, Statistic } from 'antd';
import { ReloadOutlined, SearchOutlined, TransactionOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { balanceFlowTypeOptions } from '@/constants/businessCatalog';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import {
  buildValueEnum,
  formatAmount,
  formatDateTime,
  formatEnumText,
  formatOperatorText,
  renderStatusTag,
} from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { BalanceFlowRecord } from '@/services/backendService';

const balanceFlowTypeMap = buildValueEnum(balanceFlowTypeOptions);

const balanceFlowDetailFields: DetailField<BalanceFlowRecord>[] = [
  { name: 'flowNo', label: '流水号' },
  { name: 'userName', label: '用户' },
  { name: 'flowType', label: '流水类型', render: (value) => formatEnumText(value, 'flowType', '流水类型') },
  { name: 'changeAmount', label: '变动金额', render: (value) => formatAmount(value) },
  { name: 'balanceAfter', label: '变动后余额', render: (value) => formatAmount(value) },
  { name: 'principalAmount', label: '本金变动', render: (value) => formatAmount(value || 0) },
  { name: 'giftAmount', label: '赠送变动', render: (value) => formatAmount(value || 0) },
  { name: 'scopeName', label: '适用范围' },
  { name: 'relatedNo', label: '关联单号' },
  { name: 'operator', label: '操作人', render: (value) => formatOperatorText(value) },
  { name: 'remark', label: '备注' },
  { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
];

const AssetFlowManagement: React.FC = () => {
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [flowType, setFlowType] = useState<string>();
  const [detail, setDetail] = useState<BalanceFlowRecord | null>(null);

  const balanceFlowQuery = useQuery({
    queryKey: ['assetBalanceFlows', keyword, flowType],
    queryFn: async () => (await api.asset.balanceFlows.page({
      pageNum: 1,
      pageSize: 200,
      keyword: keyword || undefined,
      flowType,
    })).data,
  });

  const balanceFlows = balanceFlowQuery.data?.records || [];
  const flowSummary = useMemo(() => balanceFlows.reduce((summary, item) => {
    const amount = Number(item.changeAmount || 0);
    if (amount > 0) summary.income += amount;
    if (amount < 0) summary.expense += Math.abs(amount);
    summary.net += amount;
    return summary;
  }, { income: 0, expense: 0, net: 0 }), [balanceFlows]);

  const columns = useMemo<ProColumns<BalanceFlowRecord>[]>(() => [
    { title: '流水号', dataIndex: 'flowNo', width: 190 },
    { title: '用户', dataIndex: 'userName', width: 130 },
    { title: '流水类型', dataIndex: 'flowType', width: 150, render: (_, record) => renderStatusTag(record.flowType, balanceFlowTypeMap) },
    { title: '变动金额', dataIndex: 'changeAmount', width: 120, render: (_, record) => formatAmount(record.changeAmount) },
    { title: '本金/赠送', dataIndex: 'principalAmount', width: 170, renderText: (_, record) => `${formatAmount(record.principalAmount || 0)} / ${formatAmount(record.giftAmount || 0)}` },
    { title: '变动后余额', dataIndex: 'balanceAfter', width: 130, render: (_, record) => formatAmount(record.balanceAfter) },
    { title: '关联单号', dataIndex: 'relatedNo', width: 190 },
    { title: '操作人', dataIndex: 'operator', width: 130, renderText: (value) => formatOperatorText(value) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 90, fixed: 'right', render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const handleSearch = () => setKeyword(keywordInput.trim());
  const handleReset = () => {
    setKeywordInput('');
    setKeyword('');
    setFlowType(undefined);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="资产流水"
        subtitle="仅展示用户余额的充值、赠送、消费、退款和调账记录；服务卡与用户档案请在各自模块维护。"
        icon={<TransactionOutlined />}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="余额流水" value={balanceFlowQuery.data?.total ?? balanceFlows.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="当前列表入账" value={flowSummary.income} precision={2} prefix="¥" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="当前列表支出" value={flowSummary.expense} precision={2} prefix="¥" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="当前列表净变动" value={flowSummary.net} precision={2} prefix="¥" /></Card></Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space size={12} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="输入用户、流水号或关联单号"
            style={{ width: 280 }}
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            allowClear
            placeholder="流水类型"
            style={{ width: 180 }}
            options={balanceFlowTypeOptions}
            value={flowType}
            onChange={setFlowType}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <ProTable<BalanceFlowRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={balanceFlows}
        loading={balanceFlowQuery.isLoading}
        search={false}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1480 }}
        headerTitle="余额变动记录"
      />

      <BusinessDetailModal
        title="余额流水详情"
        eyebrow="用户资产"
        subtitle="查看本次余额变动的金额构成、业务来源和操作信息。"
        open={!!detail}
        onCancel={() => setDetail(null)}
        width={760}
      >
        {detail ? <SchemaDetail record={detail} fields={balanceFlowDetailFields} column={2} labelWidth={110} /> : null}
      </BusinessDetailModal>
    </div>
  );
};

export default AssetFlowManagement;
