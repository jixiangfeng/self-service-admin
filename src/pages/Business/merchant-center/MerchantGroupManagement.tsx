import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Collapse, Descriptions, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { ApartmentOutlined, AuditOutlined, DeploymentUnitOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { useBusinessEnumOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type { MerchantGroupRecord, MerchantGroupStoreRecord, SelectOptionRecord, StoreRecord } from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const clearingModeOptions = [
  { value: 'NONE', label: '不启用跨商户清分' },
  { value: 'AUTO_LEDGER', label: '自动清分并自动结算' },
  { value: 'AUTO_PAYOUT', label: '自动清分、结算并发起打款' },
];
const clearingScopeOptions = [
  { value: 'Y', label: '仅跨商户消费参与清分' },
  { value: 'N', label: '所有跨店消费均参与清分' },
];
const clearingCycleOptions = [
  { value: 'REALTIME', label: '实时结算' },
  { value: 'DAY', label: '日结' },
  { value: 'WEEK', label: '周结' },
  { value: 'MONTH', label: '月结' },
];
const cashHolderOptions = [
  { value: 'RECHARGE_MERCHANT', label: '充值收款商户' },
  { value: 'PLATFORM_PREPAID', label: '平台预收账户' },
];
const revenueOwnerOptions = [
  { value: 'CONSUME_STORE', label: '消费履约门店' },
  { value: 'RECHARGE_STORE', label: '充值来源门店' },
  { value: 'RATIO_SPLIT', label: '按协议比例分摊' },
];
const clearingBaseOptions = [
    { value: 'PRINCIPAL_ONLY', label: '仅本金消耗' },
    { value: 'PRINCIPAL_PLUS_GIFT', label: '本金 + 赠送余额' },
];
const giftCostBearerOptions = [
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'RECHARGE_MERCHANT', label: '充值商户承担' },
  { value: 'CONSUME_STORE', label: '履约门店承担' },
  { value: 'RATIO_SPLIT', label: '按清分比例共同承担' },
];
const cardRevenueRecognitionOptions = [
  { value: 'PURCHASE', label: '购卡成功时确认' },
  { value: 'WRITE_OFF', label: '按核销门店确认' },
  { value: 'WRITE_OFF_SPLIT', label: '核销时按协议比例清分' },
];

type MerchantGroupFormValues = Partial<MerchantGroupRecord> & {
  settlementMode?: string;
  crossMerchantFlag?: string;
  settlementCycle?: string;
  settlementCutoffTime?: string;
  settlementDelayDays?: number;
  minSettlementAmount?: number | string;
  cashHolder?: string;
  revenueOwner?: string;
  clearingBase?: string;
  rechargeMerchantRate?: number | string;
  consumeMerchantRate?: number | string;
  platformRate?: number | string;
  giftCostBearer?: string;
  cardRevenueRecognition?: string;
  clearingRemark?: string;
};
const optionLabel = (options: Array<{ value: string; label: string }>, value?: string) =>
  options.find((item) => item.value === value)?.label || value || '-';
const formatPercent = (value?: number | string) => (value === undefined || value === null || value === '' ? '-' : `${value}%`);
const buildRatioText = (record: MerchantGroupRecord) => {
  if (!record.rechargeMerchantRate && !record.consumeMerchantRate && !record.platformRate) {
    return '-';
  }

  return [
    `充值商户留存 ${formatPercent(record.rechargeMerchantRate)}`,
    `履约商户分得 ${formatPercent(record.consumeMerchantRate)}`,
    `平台服务费 ${formatPercent(record.platformRate)}`,
  ].join(' / ');
};

const MerchantGroupManagement: React.FC = () => {
  const [form] = Form.useForm<MerchantGroupRecord>();
  const [records, setRecords] = useState<MerchantGroupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detail, setDetail] = useState<MerchantGroupRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MerchantGroupRecord | null>(null);
  const [memberForm] = Form.useForm<MerchantGroupStoreRecord>();
  const [memberVisible, setMemberVisible] = useState(false);
  const [memberGroup, setMemberGroup] = useState<MerchantGroupRecord | null>(null);
  const [members, setMembers] = useState<MerchantGroupStoreRecord[]>([]);
  const [editingMember, setEditingMember] = useState<MerchantGroupStoreRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const selectedGroupType = Form.useWatch('groupType', form);
  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForMerchantGroups'], queryFn: async () => (await api.merchant.options()).data });
  const { data: storeOptions } = useQuery({
    queryKey: ['storeOptionsForMerchantGroups', memberGroup?.id, memberGroup?.groupType, memberGroup?.merchantId],
    queryFn: async () => {
      const merchantId = memberGroup?.groupType === 'STORED_VALUE' ? undefined : memberGroup?.merchantId;
      const page = (await api.store.page({ current: 1, size: 500, merchantId })).data;
      return page.records.map((store: StoreRecord) => ({
        value: store.id,
        code: store.storeCode,
        label: `${store.storeName} (${store.storeCode}) · ${store.merchantName || `商户#${store.merchantId}`}`,
      }));
    },
    enabled: Boolean(memberGroup),
  });
  const merchantGroupTypeOptions = useBusinessEnumOptions('merchantGroupTypeOptions');
  const templateStatusOptions = useBusinessEnumOptions('templateStatusOptions');
  const groupTypeMap = useMemo(() => buildValueEnum(merchantGroupTypeOptions), [merchantGroupTypeOptions]);
  const statusMap = useMemo(() => buildValueEnum(templateStatusOptions), [templateStatusOptions]);
  const merchantOptionMap = useMemo(() => new Map((merchantOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [merchantOptions]);

  const fetchRecords = async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const result = await api.merchantGroup.page({
        current: 1,
        size: 100,
        keyword,
        groupType: typeFilter,
        status: statusFilter,
        ...params,
      });
      const page = 'data' in result ? result.data : result;
      setRecords(page.records || []);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const fetchMembers = async (group: MerchantGroupRecord) => {
    setMemberLoading(true);
    try {
      const result = await api.merchantGroupStore.page({ current: 1, size: 100, groupId: group.id });
      const page = 'data' in result ? result.data : result;
      setMembers(page.records || []);
    } finally {
      setMemberLoading(false);
    }
  };

  const openMemberModal = async (record: MerchantGroupRecord) => {
    setMemberGroup(record);
    setEditingMember(null);
    memberForm.resetFields();
    setMemberVisible(true);
    await fetchMembers(record);
  };

  const handleMemberSubmit = async () => {
    if (!memberGroup) return;
    const values = await memberForm.validateFields();
    if (editingMember) {
      await api.merchantGroupStore.edit({ ...editingMember, ...values });
      message.success('门店成员已更新');
    } else {
      await api.merchantGroupStore.add({
        ...values,
        groupId: memberGroup.id,
        status: values.status || 'ENABLED',
      });
      message.success('门店成员已添加');
    }
    setEditingMember(null);
    memberForm.resetFields();
    await fetchMembers(memberGroup);
    await fetchRecords();
  };

  const confirmGroupStatus = (record: MerchantGroupRecord) => {
    const nextStatus = record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    showBusinessConfirm({
      eyebrow: '状态确认',
      title: `确认${record.status === 'ENABLED' ? '停用' : '启用'}该门店组`,
      content: `门店组「${record.groupName}」状态更新后，将影响活动投放、跨店核销和统计口径。`,
      okText: '确认更新',
      danger: false,
      onOk: async () => {
        await api.merchantGroup.changeStatus(record.id, nextStatus);
        message.success('门店组状态已更新');
        fetchRecords();
      },
    });
  };

  const confirmRemoveMember = (record: MerchantGroupStoreRecord) => {
    showBusinessConfirm({
      title: '确认移除该门店成员',
      content: `移除「${record.storeName || record.storeCode || record.storeId}」后，该门店将不再参与当前门店组的活动、核销和统计范围。`,
      okText: '确认移除',
      onOk: async () => {
        await api.merchantGroupStore.remove(record.id);
        message.success('门店成员已移除');
        if (memberGroup) {
          await fetchMembers(memberGroup);
          await fetchRecords();
        }
      },
    });
  };

  const summary = useMemo(
    () => ({
      total: records.length,
      operating: records.filter((item) => item.groupType === 'OPERATING').length,
      storedValue: records.filter((item) => item.groupType === 'STORED_VALUE').length,
      stores: records.reduce((sum, item) => sum + Number(item.storeCount || 0), 0),
    }),
    [records]
  );

  const columns: ProColumns<MerchantGroupRecord>[] = [
    {
      title: '门店组',
      dataIndex: 'groupName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.groupName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>{record.groupCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店组 / 商户 / 负责人' } },
    {
      title: '归属范围',
      dataIndex: 'merchantName',
      width: 180,
      search: false,
      render: (_, record) => record.groupType === 'STORED_VALUE' ? '跨商户' : record.merchantName || '-',
    },
    {
      title: '分组类型',
      dataIndex: 'groupType',
      width: 140,
      valueType: 'select',
      valueEnum: groupTypeMap,
      render: (_, record) => renderStatusTag(record.groupType, groupTypeMap),
    },
    { title: '门店数', dataIndex: 'storeCount', width: 100, search: false },
    {
      title: '清分规则',
      dataIndex: 'linkedSettlementRuleCode',
      width: 150,
      search: false,
      render: (_, record) => (record.groupType === 'STORED_VALUE' ? record.linkedSettlementRuleCode || '未启用自动清分' : '-'),
    },
    { title: '负责人', dataIndex: 'owner', width: 140, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: statusMap,
      render: (_, record) => renderStatusTag(record.status, statusMap),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
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
          <Button size="small" onClick={() => openMemberModal(record)}>成员</Button>
          <Button size="small" onClick={() => confirmGroupStatus(record)}>{record.status === 'ENABLED' ? '停用' : '启用'}</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (values.settlementMode === 'AUTO_PAYOUT' && values.cashHolder !== 'PLATFORM_PREPAID') {
      message.error('自动打款要求资金由平台预收账户持有');
      return;
    }
    const { merchantName, ...baseValues } = values as MerchantGroupFormValues;
    const isStoredValueGroup = values.groupType === 'STORED_VALUE';
    const merchantId = typeof values.merchantId === 'number' ? values.merchantId : undefined;
    const selectedMerchantName = merchantId !== undefined ? merchantOptionMap.get(merchantId) : undefined;
    const payload = {
      ...baseValues,
      merchantId: isStoredValueGroup ? null : merchantId,
      merchantName: isStoredValueGroup ? null : selectedMerchantName || merchantName,
    };
    if (editingRecord) {
      await api.merchantGroup.edit({ ...editingRecord, ...payload } as Record<string, unknown>);
      message.success('门店组已更新');
    } else {
      await api.merchantGroup.add(payload as unknown as Record<string, unknown>);
      message.success('门店组已创建');
    }
    closeModal();
    fetchRecords();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店组管理" subtitle="维护门店组基础信息和成员门店，实际作用范围以成员列表为准。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店组总量" value={summary.total} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="经营门店组" value={summary.operating} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="储值通用组" value={summary.storedValue} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="覆盖门店" value={summary.stores} suffix="家" /></Card></Col>
      </Row>

      <ProTable<MerchantGroupRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        request={async (params) => {
          const result = await api.merchantGroup.page({
            current: params.current,
            size: params.pageSize,
            keyword: params.keyword,
            groupType: params.groupType,
            status: params.status,
          });
          const page = 'data' in result ? result.data : result;
          const pageRecords = page.records || [];
          setRecords(pageRecords);
          setKeyword(String(params.keyword || ''));
          setTypeFilter(params.groupType as string | undefined);
          setStatusFilter(params.status as string | undefined);
          return { data: pageRecords, total: page.total, success: true };
        }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1320 }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({
                groupType: 'STORED_VALUE',
                status: 'DRAFT',
                storeCount: 0,
                settlementMode: 'NONE',
                crossMerchantFlag: 'Y',
                settlementCycle: 'WEEK',
                settlementCutoffTime: '00:00',
                settlementDelayDays: 0,
                minSettlementAmount: 0,
                cashHolder: 'RECHARGE_MERCHANT',
                revenueOwner: 'CONSUME_STORE',
                clearingBase: 'PRINCIPAL_PLUS_GIFT',
                rechargeMerchantRate: 0,
                consumeMerchantRate: 100,
                platformRate: 0,
                giftCostBearer: 'RECHARGE_MERCHANT',
                cardRevenueRecognition: 'WRITE_OFF_SPLIT',
              });
              setModalVisible(true);
            }}
          >
            新建门店组
          </Button>,
        ]}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '门店组配置维护' : '门店组建档'}
        title={editingRecord ? `编辑门店组 · ${editingRecord.groupName}` : '新建门店组'}
        subtitle="用于经营管理或储值通用范围配置；只有储值通用组需要维护高级清分协议。"
        meta={['门店组', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingRecord ? '保存变更' : '创建门店组'}
        width={1120}
        forceRender
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<DeploymentUnitOutlined />}
              title="分组基础信息"
              desc="经营门店组归属单一商户；储值通用组按成员门店确定跨商户范围，不设置所属商户。"
            >
              <div className="merchant-editor-fields">
                {editingRecord ? (
                  <Form.Item name="groupCode" label="门店组编码">
                    <Input readOnly placeholder="门店组编码不可编辑" />
                  </Form.Item>
                ) : null}
                <Form.Item name="groupName" label="门店组名称" rules={[{ required: true, message: '请输入门店组名称' }]}>
                  <Input placeholder="例如：西安直营储值通用组" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select options={templateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item name="groupType" label="分组类型" rules={[{ required: true, message: '请选择分组类型' }]}>
                  <Select
                    disabled={Boolean(editingRecord)}
                    options={merchantGroupTypeOptions}
                    placeholder="请选择分组类型"
                    onChange={(value) => {
                      if (value === 'STORED_VALUE') {
                        form.setFieldsValue({ merchantId: undefined, merchantName: undefined });
                      }
                    }}
                  />
                </Form.Item>
                {selectedGroupType === 'STORED_VALUE' ? (
                  <Form.Item label="归属范围">
                    <Input disabled value="跨商户，以成员门店为准" />
                  </Form.Item>
                ) : (
                  <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={merchantOptions as SelectOptionRecord[]}
                      placeholder="请选择经营组所属商户"
                    />
                  </Form.Item>
                )}
                <Form.Item name="owner" label="负责人">
                  <Input placeholder="例如：区域运营负责人" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="记录维护原因或审批说明" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            {selectedGroupType === 'STORED_VALUE' ? (
              <BusinessEditorSection
                icon={<AuditOutlined />}
                title="高级清分配置"
                desc="仅储值通用组使用：默认同商户不清分、跨商户才清分；如需内部核算可改为所有跨店消费均参与。保存后由系统自动生成规则版本。"
              >
                <Collapse
                  ghost
                  items={[
                    {
                      key: 'settlement',
                      label: '展开维护清分协议',
                      children: (
                        <div className="merchant-editor-fields">
                        <Form.Item name="settlementMode" label="清分方式">
                          <Select
                            options={clearingModeOptions}
                            placeholder="请选择清分方式"
                            onChange={(value) => {
                              if (value === 'AUTO_PAYOUT') form.setFieldValue('cashHolder', 'PLATFORM_PREPAID');
                            }}
                          />
                        </Form.Item>
                        <Form.Item name="crossMerchantFlag" label="清分范围">
                          <Select options={clearingScopeOptions} placeholder="请选择清分范围" />
                        </Form.Item>
                        <Form.Item name="settlementCycle" label="清分周期">
                          <Select options={clearingCycleOptions} placeholder="请选择清分周期" />
                        </Form.Item>
                        <Form.Item name="settlementCutoffTime" label="账期截止时间">
                          <Input placeholder="00:00" />
                        </Form.Item>
                        <Form.Item name="settlementDelayDays" label="延迟结算天数">
                          <InputNumber min={0} precision={0} addonAfter="天" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="minSettlementAmount" label="最低结算金额">
                          <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="cashHolder" label="资金持有方">
                          <Select options={cashHolderOptions} placeholder="请选择资金持有方" />
                        </Form.Item>
                        <Form.Item name="revenueOwner" label="收入归属">
                          <Select options={revenueOwnerOptions} placeholder="请选择收入归属" />
                        </Form.Item>
                        <Form.Item name="clearingBase" label="清分基数">
                          <Select options={clearingBaseOptions} placeholder="请选择清分基数" />
                        </Form.Item>
                        <Form.Item name="rechargeMerchantRate" label="充值商户留存比例">
                          <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：5" />
                        </Form.Item>
                        <Form.Item name="consumeMerchantRate" label="履约商户分得比例">
                          <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：92" />
                        </Form.Item>
                        <Form.Item name="platformRate" label="平台服务费比例">
                          <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="例如：3" />
                        </Form.Item>
                        <Form.Item name="giftCostBearer" label="赠送余额成本承担">
                          <Select options={giftCostBearerOptions} placeholder="请选择承担方" />
                        </Form.Item>
                        <Form.Item name="cardRevenueRecognition" label="次卡收入确认">
                          <Select options={cardRevenueRecognitionOptions} placeholder="请选择确认方式" />
                        </Form.Item>
                        <Form.Item className="merchant-editor-field-span-2" name="clearingRemark" label="清分补充">
                          <Input.TextArea rows={3} placeholder="记录门店组清分口径和特殊约定" />
                        </Form.Item>
                        </div>
                      ),
                    },
                  ]}
                />
              </BusinessEditorSection>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="门店组详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店组编码">{detail.groupCode}</Descriptions.Item>
            <Descriptions.Item label="门店组名称">{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label="归属范围">{detail.groupType === 'STORED_VALUE' ? '跨商户，以成员门店为准' : detail.merchantName || '-'}</Descriptions.Item>
            <Descriptions.Item label="分组类型">{groupTypeMap[detail.groupType as keyof typeof groupTypeMap]?.text || detail.groupType}</Descriptions.Item>
            <Descriptions.Item label="门店数">{detail.storeCount}</Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="清分方式">{optionLabel(clearingModeOptions, detail.settlementMode)}</Descriptions.Item>
            <Descriptions.Item label="清分范围">{optionLabel(clearingScopeOptions, detail.crossMerchantFlag)}</Descriptions.Item>
            <Descriptions.Item label="清分周期">{optionLabel(clearingCycleOptions, detail.settlementCycle)}</Descriptions.Item>
            <Descriptions.Item label="账期截止">{detail.settlementCutoffTime || '00:00'}</Descriptions.Item>
            <Descriptions.Item label="结算延迟">{detail.settlementDelayDays || 0} 天</Descriptions.Item>
            <Descriptions.Item label="最低结算">{detail.minSettlementAmount || 0} 元</Descriptions.Item>
            <Descriptions.Item label="资金持有方">{optionLabel(cashHolderOptions, detail.cashHolder)}</Descriptions.Item>
            <Descriptions.Item label="收入归属">{optionLabel(revenueOwnerOptions, detail.revenueOwner)}</Descriptions.Item>
            <Descriptions.Item label="清分基数">{optionLabel(clearingBaseOptions, detail.clearingBase)}</Descriptions.Item>
            <Descriptions.Item label="赠送成本承担">{optionLabel(giftCostBearerOptions, detail.giftCostBearer)}</Descriptions.Item>
            <Descriptions.Item label="次卡收入确认">{optionLabel(cardRevenueRecognitionOptions, detail.cardRevenueRecognition)}</Descriptions.Item>
            <Descriptions.Item label="协议比例">{buildRatioText(detail)}</Descriptions.Item>
            <Descriptions.Item label="生效规则版本">{detail.linkedSettlementRuleCode || '未启用自动清分'}</Descriptions.Item>
            <Descriptions.Item label="充值商户留存">{formatPercent(detail.rechargeMerchantRate)}</Descriptions.Item>
            <Descriptions.Item label="履约商户分得">{formatPercent(detail.consumeMerchantRate)}</Descriptions.Item>
            <Descriptions.Item label="平台服务费">{formatPercent(detail.platformRate)}</Descriptions.Item>
            <Descriptions.Item label="清分补充" span={2}>{detail.clearingRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="负责人">{detail.owner}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="门店组成员维护"
        title={memberGroup ? `门店组成员 · ${memberGroup.groupName}` : '门店组成员'}
        subtitle={memberGroup?.groupType === 'STORED_VALUE'
          ? '储值通用组可以绑定不同商户的门店，成员变更会同步影响余额使用和跨商户清分范围。'
          : '经营门店组只能绑定所属商户的门店，成员变更会同步影响门店组覆盖数量。'}
        meta={['成员维护', editingMember ? '编辑成员' : '添加成员']}
        open={memberVisible}
        onCancel={() => {
          setMemberVisible(false);
          setMemberGroup(null);
          setEditingMember(null);
          memberForm.resetFields();
        }}
        footer={null}
        width={1080}
      >
        <Form form={memberForm} layout="vertical" className="merchant-editor-form" style={{ marginBottom: 16 }}>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<ShopOutlined />}
              title="门店成员信息"
              desc={memberGroup?.groupType === 'STORED_VALUE'
                ? '可选择当前数据权限内不同商户的门店，门店所属商户由后端按门店档案自动带出。'
                : '选择所属商户的门店，门店编码和名称由后端按门店档案自动带出。'}
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions as SelectOptionRecord[]}
                    placeholder="请选择门店"
                  />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue="ENABLED">
                  <Select options={templateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input placeholder="记录加入门店组的原因或使用限制" />
                </Form.Item>
              </div>
              <div className="merchant-editor-actions">
                <Button onClick={() => { setEditingMember(null); memberForm.resetFields(); }}>清空</Button>
                <Button type="primary" onClick={handleMemberSubmit}>{editingMember ? '更新成员' : '添加成员'}</Button>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
        <ProTable<MerchantGroupStoreRecord>
          rowKey="id"
          search={false}
          options={false}
          loading={memberLoading}
          dataSource={members}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '门店ID', dataIndex: 'storeId', width: 100 },
            { title: '所属商户', dataIndex: 'merchantId', width: 160, render: (_, record) => merchantOptionMap.get(record.merchantId || 0) || `商户#${record.merchantId || '-'}` },
            { title: '门店编码', dataIndex: 'storeCode', width: 140 },
            { title: '门店名称', dataIndex: 'storeName', width: 180 },
            { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
            { title: '备注', dataIndex: 'remark', width: 180 },
            {
              title: '操作',
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingMember(record);
                      memberForm.setFieldsValue(record);
                    }}
                  >
                    编辑
                  </Button>
                  <Button size="small" danger onClick={() => confirmRemoveMember(record)}>移除</Button>
                </Space>
              ),
            },
          ]}
        />
      </BusinessEditorModal>
    </div>
  );
};

export default MerchantGroupManagement;
