import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Tag, message } from 'antd';
import { ClockCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, PoweroffOutlined, ReloadOutlined, SearchOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { statusOptions } from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { PricingRuleRecord, SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import {
  DateTimeField,
  fromDateTimePickerValue,
  toDateTimePickerValue,
} from '@/utils/formControls';

const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  ['effectiveAt', 'expireAt'].forEach((key) => {
    if (next[key]) next[key] = fromDateTimePickerValue(next[key]) || next[key];
  });
  return next;
};

const normalizePickerInitialValues = (record: Record<string, any>) => {
  const next = { ...record };
  ['effectiveAt', 'expireAt'].forEach((key) => {
    if (next[key]) next[key] = toDateTimePickerValue(next[key]) || next[key];
  });
  return next;
};

const statusMap = buildValueEnum(statusOptions);

const detailFields: DetailField<PricingRuleRecord>[] = [
  { name: 'ruleCode', label: '规则编码' },
  { name: 'ruleName', label: '规则名称' },
  { name: 'storeName', label: '适用门店' },
  { name: 'startPrice', label: '起步价', render: (value) => formatAmount(value as string | number) },
  { name: 'freeMinutes', label: '包含分钟' },
  { name: 'minutePrice', label: '超出分钟单价', render: (value) => formatAmount(value as string | number) },
  { name: 'effectiveAt', label: '生效时间' },
  { name: 'expireAt', label: '失效时间' },
  { name: 'versionNo', label: '版本号' },
  { name: 'status', label: '状态' },
];

const priceText = (value?: string | number) => formatAmount(value);

const StorePricingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [storeFilter, setStoreFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PricingRuleRecord | null>(null);
  const [detail, setDetail] = useState<PricingRuleRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const pricingQuery = useQuery({ queryKey: ['storePricingRules', storeFilter, statusFilter], queryFn: async () => (await api.pricingRule.page({ pageNum: 1, pageSize: 500, storeId: storeFilter, status: statusFilter })).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForStorePricing'], queryFn: async () => (await api.store.options()).data });

  const rules = pricingQuery.data?.records || [];
  const storeOptionList = storeOptions || [];
  const storeOptionMap = useMemo(() => new Map(storeOptionList.map((item) => [item.value, item.label])), [storeOptionList]);

  const configuredStores = new Set(rules.map((item) => item.storeId).filter(Boolean)).size;
  const missingIncludedMinutesRules = rules.filter((item) => Number(item.freeMinutes || 0) <= 0);
  const activeRules = rules.filter((item) => Number(item.status) === 1);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['storePricingRules'] });
    queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
    queryClient.invalidateQueries({ queryKey: ['pricingRulesForPricingCenter'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => payload.id ? api.pricingRule.edit(payload) : api.pricingRule.add(payload),
    onSuccess: () => {
      message.success('门店计费规则已保存');
      invalidate();
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => api.pricingRule.changeStatus(id, status),
    onSuccess: () => {
      message.success('计费规则状态已更新');
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => api.pricingRule.remove(id),
    onSuccess: () => {
      message.success('计费规则已删除');
      invalidate();
    },
  });

  const openModal = (record?: PricingRuleRecord) => {
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(normalizePickerInitialValues(record as unknown as Record<string, any>));
    } else {
      form.setFieldsValue({
        status: 1,
      });
    }
    setModalVisible(true);
  };

  const handleStoreChange = (value?: number) => {
    form.setFieldValue('storeName', value ? storeOptionMap.get(value) : undefined);
  };

  const filteredRules = rules.filter((item) => containsKeyword(keyword, [
    item.ruleCode,
    item.ruleName,
    item.storeName,
    item.startPrice,
    item.freeMinutes,
    item.minutePrice,
  ]));

  const columns: ProColumns<PricingRuleRecord>[] = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 150 },
    { title: '规则名称', dataIndex: 'ruleName', width: 190 },
    { title: '适用门店', dataIndex: 'storeName', width: 180, render: (_, record) => record.storeName || (record.storeId ? `门店#${record.storeId}` : <Tag>全局</Tag>) },
    { title: '起步价', dataIndex: 'startPrice', width: 110, render: (_, record) => priceText(record.startPrice) },
    { title: '包含分钟', dataIndex: 'freeMinutes', width: 110, render: (_, record) => record.freeMinutes ?? '-' },
    { title: '超出分钟价', dataIndex: 'minutePrice', width: 120, render: (_, record) => priceText(record.minutePrice) },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 170, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            type="link"
            icon={<PoweroffOutlined />}
            loading={statusMutation.isPending}
            onClick={() => {
              const nextStatus = Number(record.status) === 1 ? 0 : 1;
              showBusinessConfirm({
                title: `确认${nextStatus === 1 ? '启用' : '停用'}计费规则`,
                content: `确定${nextStatus === 1 ? '启用' : '停用'}「${record.ruleName}」吗？用户端价格和订单计价会读取启用规则。`,
                onOk: () => statusMutation.mutate({ id: record.id, status: nextStatus }),
              });
            }}
          >
            {Number(record.status) === 1 ? '停用' : '启用'}
          </Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
          <Button
            size="small"
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => showBusinessConfirm({
              title: '确认删除计费规则',
              content: `确定删除「${record.ruleName}」吗？历史订单可能仍保留价格快照。`,
              onOk: () => removeMutation.mutate(record.id),
            })}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店计费规则" subtitle="维护门店实际扣费规则。当前规则为起步价包含固定分钟数，超出后按分钟单价计费。" icon={<ShopOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="计费规则" value={rules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用规则" value={activeRules.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="已配置门店" value={configuredStores} suffix="家" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="缺少包含分钟" value={missingIncludedMinutesRules.length} suffix="条" /></Card></Col>
      </Row>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 220px 180px auto', gap: 12, marginBottom: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="输入规则、门店或价格关键词"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
          onPressEnter={() => setKeyword(draftKeyword.trim())}
        />
        <Select allowClear showSearch optionFilterProp="label" options={storeOptionList} placeholder="按门店筛选" value={storeFilter} onChange={setStoreFilter} />
        <Select allowClear options={statusOptions} placeholder="按状态筛选" value={statusFilter} onChange={setStatusFilter} />
        <Space>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setKeyword(draftKeyword.trim())}>查询</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setDraftKeyword('');
              setKeyword('');
              setStoreFilter(undefined);
              setStatusFilter(undefined);
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      <ProTable<PricingRuleRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={filteredRules}
        loading={pricingQuery.isLoading}
        search={false}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1540 }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建计费规则</Button>,
        ]}
      />

      <BusinessDetailModal title="门店计费规则详情" open={!!detail} onCancel={() => setDetail(null)} width={800}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={detailFields as DetailField<Record<string, any>>[]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '计费规则维护' : '计费规则新增'}
        title={editingRecord ? '编辑门店计费规则' : '新建门店计费规则'}
        subtitle="门店计费规则只描述门店设备怎么扣费，当前模型固定为起步价包含分钟数，超出后按分钟计费。"
        meta={['门店计费', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => {
          const values = normalizePickerValues(await form.validateFields());
          saveMutation.mutate({
            ...values,
            countPrice: undefined,
            capAmount: undefined,
            timeStart: undefined,
            timeEnd: undefined,
            nightPriceMode: undefined,
            nightPriceValue: undefined,
            nightPriceDesc: undefined,
            holidayPriceMode: undefined,
            holidayDates: undefined,
            holidayPriceValue: undefined,
            holidayStackPolicy: undefined,
            holidayPriceDesc: undefined,
          });
        }}
        confirmLoading={saveMutation.isPending}
        width={1080}
        okText={editingRecord ? '保存变更' : '保存规则'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TagsOutlined />} title="规则归属" desc="选择适用门店。门店计费规则只绑定门店，用于用户端列表起步价和扫码洗车扣费。">
              <div className="merchant-editor-fields">
                {editingRecord ? <Form.Item name="ruleCode" label="规则编码"><Input readOnly placeholder="规则编码不可编辑" /></Form.Item> : null}
                <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}><Input placeholder="例如：吉祥门店001按分钟计费" /></Form.Item>
                <Form.Item name="storeId" label="适用门店" rules={[{ required: true, message: '请选择适用门店' }]}><Select showSearch optionFilterProp="label" options={storeOptionList as SelectOptionRecord[]} placeholder="请选择门店" onChange={handleStoreChange} /></Form.Item>
                <Form.Item name="storeName" label="门店名称"><Input disabled placeholder="选择门店后自动回填" /></Form.Item>
                <Form.Item name="versionNo" label="版本号"><Input placeholder="例如：PR-V202606" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<ClockCircleOutlined />} title="分钟计费" desc="订单结算金额 = 起步价 + max(0, 实际使用分钟数 - 起步价包含分钟数) x 超出分钟单价。">
              <div className="merchant-editor-fields">
                <Form.Item name="startPrice" label="起步价" rules={[{ required: true, message: '请输入起步价' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元" placeholder="0.00" /></Form.Item>
                <Form.Item name="freeMinutes" label="包含分钟" rules={[{ required: true, message: '请输入起步价包含分钟数' }]}><InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter="分钟" placeholder="例如：10" /></Form.Item>
                <Form.Item name="minutePrice" label="超出分钟单价" rules={[{ required: true, message: '请输入超出分钟单价' }]}><InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="元/分钟" placeholder="0.00" /></Form.Item>
                <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                <Form.Item name="expireAt" label="失效时间"><DateTimeField /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default StorePricingManagement;
