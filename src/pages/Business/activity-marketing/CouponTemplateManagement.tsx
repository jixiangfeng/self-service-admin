import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { CalendarOutlined, GiftOutlined, PlusOutlined, SafetyOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { couponTypeOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import OssImageUpload from '@/components/OssImageUpload';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import api, { type CouponTemplateRecord } from '@/services/backendService';

const typeMap = buildValueEnum(couponTypeOptions);
const couponTemplateStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' },
];
const statusMap = buildValueEnum(couponTemplateStatusOptions);
const scopeOptions = [
  { label: '全部门店', value: '全部门店' },
  { label: '指定门店组', value: '指定门店组' },
  { label: '指定商品/服务', value: '指定商品/服务' },
  { label: '新客专享', value: '新客专享' },
  { label: '会员专享', value: '会员专享' },
];
const thresholdOptions = [
  { label: '无门槛', value: 'NONE' },
  { label: '满额可用', value: 'AMOUNT' },
];
const validityOptions = [
  { label: '领券后固定天数', value: 'DAYS' },
  { label: '长期有效', value: 'LONG_TERM' },
];
const issueChannelOptions = [
  { label: '活动自动发放', value: 'ACTIVITY' },
  { label: '运营手动发放', value: 'MANUAL' },
  { label: '邀请达标发放', value: 'INVITE' },
  { label: '注册送券', value: 'REGISTER' },
  { label: '客服补偿', value: 'CUSTOMER_SERVICE' },
  { label: '用户主动领取', value: 'USER_CLAIM' },
];
const issueAudienceOptions = [
  { label: '全部用户', value: '全部用户' },
  { label: '新注册用户', value: '新注册用户' },
  { label: '沉睡用户', value: '沉睡用户' },
  { label: '指定会员等级', value: '指定会员等级' },
];
const stackLimitOptions = [
  { label: '不可与同类型券叠加', value: '同类券不可叠加' },
  { label: '不可与平台促销同享', value: '不可与平台促销同享' },
  { label: '可与余额混用', value: '余额可与单张券混用' },
];

const splitMultiValue = (value?: string) => String(value || '').split(/[;；,，]/).map((item) => item.trim()).filter(Boolean);
const joinMultiValue = (value: unknown) => Array.isArray(value) ? value.join('；') : String(value || '');
const optionLabel = (options: { label: string; value: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const optionLabels = (options: { label: string; value: string }[], value?: string) =>
  splitMultiValue(value).map((item) => optionLabel(options, item)).join('、') || '-';
const thresholdText = (record: CouponTemplateRecord) => record.thresholdType === 'NONE'
  ? '无门槛'
  : record.thresholdAmount ? `满 ${record.thresholdAmount} 元可用` : optionLabel(thresholdOptions, record.thresholdType);
const validityText = (record: CouponTemplateRecord) => record.validityType === 'LONG_TERM'
  ? '长期有效'
  : record.validityDays ? `领券后 ${record.validityDays} 天内有效` : optionLabel(validityOptions, record.validityType);

const buildCouponPayload = (values: Record<string, any>) => ({ ...values, stackLimits: joinMultiValue(values.stackLimits) });

const couponTemplateDetailFields: DetailField<CouponTemplateRecord>[] = [
  { name: 'templateCode', label: '编码' },
  { name: 'templateName', label: '名称' },
  { name: 'couponType', label: '券类型', render: (value) => typeMap[value as keyof typeof typeMap]?.text || value },
  { name: 'scope', label: '作用范围' },
  { name: 'thresholdType', label: '门槛类型' },
  { name: 'thresholdAmount', label: '满额门槛' },
  { name: 'validityType', label: '有效期类型' },
  { name: 'validityDays', label: '有效天数' },
  { name: 'issueChannel', label: '发放方式' },
  { name: 'issueAudience', label: '领取人群' },
  { name: 'perUserLimit', label: '每人限领' },
  { name: 'totalBudget', label: '预算上限' },
  { name: 'stackLimits', label: '叠加限制' },
  { name: 'bannerImageUrl', label: '活动条Banner' },
  { name: 'stock', label: '库存' },
  { name: 'status', label: '状态', render: (value) => statusMap[value as keyof typeof statusMap]?.text || value },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const CouponTemplateManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CouponTemplateRecord>();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CouponTemplateRecord | null>(null);
  const [detail, setDetail] = useState<CouponTemplateRecord | null>(null);

  const templateQuery = useQuery({
    queryKey: ['couponTemplates', keyword, typeFilter, statusFilter],
    queryFn: async () => (await api.marketing.couponTemplates.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined, couponType: typeFilter, status: statusFilter })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.id) {
        await api.marketing.couponTemplates.edit(values);
      } else {
        await api.marketing.couponTemplates.add(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponTemplates'] });
      message.success(editingRecord ? '券模板已更新' : '券模板已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: (record: CouponTemplateRecord) => api.marketing.couponTemplates.edit({ ...record, status: record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponTemplates'] });
      message.success('券模板状态已更新');
    },
  });

  const records = templateQuery.data?.records || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.templateCode, item.templateName, item.scope, item.issueChannel, item.issueAudience, item.stackLimits]) &&
          (!typeFilter || item.couponType === typeFilter) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter, typeFilter]
  );

  const columns: ProColumns<CouponTemplateRecord>[] = [
    {
      title: '券模板',
      dataIndex: 'templateName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.templateName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.templateCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '模板 / 编码 / 范围 / 发放规则' } },
    {
      title: '券类型',
      dataIndex: 'couponType',
      width: 140,
      valueType: 'select',
      valueEnum: typeMap,
      render: (_, record) => renderStatusTag(record.couponType, typeMap),
    },
    { title: '适用范围', dataIndex: 'scope', width: 160, search: false , render: (value) => formatEnumText(value, 'scope', '适用范围') },
    { title: '使用门槛', dataIndex: 'thresholdType', width: 160, search: false, render: (_, record) => thresholdText(record) || '-' },
    { title: '有效期', dataIndex: 'validityType', width: 160, search: false, render: (_, record) => validityText(record) || '-' },
    { title: '发放方式', dataIndex: 'issueChannel', width: 180, search: false, render: (_, record) => optionLabels(issueChannelOptions, record.issueChannel) },
    { title: '领取人群', dataIndex: 'issueAudience', width: 160, search: false , render: (value) => formatEnumText(value, 'issueAudience', '领取人群') },
    { title: '叠加限制', dataIndex: 'stackLimits', width: 220, search: false },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
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
              form.setFieldsValue({ ...record, stackLimits: splitMultiValue(record.stackLimits) } as any);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              statusMutation.mutate(record);
            }}
          >
            {record.status === 'ENABLED' ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = buildCouponPayload(values as Record<string, any>);
    if (editingRecord) {
      await saveMutation.mutateAsync({ ...payload, id: editingRecord.id } as Record<string, unknown>);
    } else {
      await saveMutation.mutateAsync(payload as Record<string, unknown>);
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="券模板管理" subtitle="补齐券模板的编码、作用范围、门槛、发放规则、叠加规则和状态控制。" icon={<GiftOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="券模板数" value={records.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用模板" value={records.filter((item) => item.status === 'ENABLED').length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="作用范围" value={new Set(records.map((item) => item.scope).filter(Boolean)).size} suffix="层" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="库存总量" value={records.reduce((sum, item) => sum + Number(item.stock || 0), 0)} suffix="张" /></Card></Col>
      </Row>

      <ProTable<CouponTemplateRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={templateQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1960 }}
        toolBarRender={() => [
          <Button key="rules" onClick={() => {
            setEditingRecord(null);
            form.resetFields();
            form.setFieldsValue({ couponType: 'FULL_REDUCTION', status: 'ENABLED', stock: 0, scope: '全部门店', thresholdType: 'AMOUNT', validityType: 'DAYS', issueChannel: 'USER_CLAIM', issueAudience: '全部用户', stackLimits: ['同类券不可叠加', '余额可与单张券混用'] } as any);
            setModalVisible(true);
          }}>叠加规则</Button>,
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({ couponType: 'FULL_REDUCTION', status: 'ENABLED', stock: 0, scope: '全部门店', thresholdType: 'AMOUNT', validityType: 'DAYS', issueChannel: 'USER_CLAIM', issueAudience: '全部用户' } as any);
              setModalVisible(true);
            }}
          >
            新建券模板
          </Button>,
        ]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setTypeFilter(values.couponType as string | undefined);
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setTypeFilter(undefined);
          setStatusFilter(undefined);
        }}
      />

      <BusinessEditorModal
        eyebrow="券模板配置"
        title={editingRecord ? `编辑券模板 · ${editingRecord.templateName}` : '新建券模板'}
        subtitle="把券模板的范围、门槛、有效期、发放和叠加规则拆成可配置字段，运营不需要维护大段规则文本。"
        meta={[editingRecord ? '编辑' : '新增', '营销活动']}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={saveMutation.isPending}
        onCancel={closeModal}
        width={1080}
        okText="保存券模板"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<TagsOutlined />} title="模板基础" desc="定义券模板编码、名称、类型和当前状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="templateCode" label="券模板编码" rules={[{ required: true, message: '请输入券模板编码' }]}>
                  <Input placeholder="例如：CP-WASH-202605" />
                </Form.Item>
                <Form.Item name="templateName" label="券模板名称" rules={[{ required: true, message: '请输入券模板名称' }]}>
                  <Input placeholder="例如：新客首洗满减券" />
                </Form.Item>
                <Form.Item name="couponType" label="券类型" rules={[{ required: true, message: '请选择券类型' }]}>
                  <Select options={couponTypeOptions} placeholder="请选择券类型" />
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select options={couponTemplateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="bannerImageUrl" label="活动条Banner图片">
                  <OssImageUpload prefix="activity/banners" placeholder="上传活动条Banner" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CalendarOutlined />} title="适用与有效期" desc="配置适用范围、使用门槛、库存和有效期。">
              <div className="merchant-editor-fields">
                <Form.Item name="scope" label="作用范围">
                  <Select options={scopeOptions} placeholder="请选择作用范围" />
                </Form.Item>
                <Form.Item name="thresholdType" label="使用门槛">
                  <Select options={thresholdOptions} placeholder="请选择门槛类型" />
                </Form.Item>
                <Form.Item name="thresholdAmount" label="满额门槛">
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="validityType" label="有效期类型">
                  <Select options={validityOptions} placeholder="请选择有效期类型" />
                </Form.Item>
                <Form.Item name="validityDays" label="有效天数">
                  <InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} placeholder="7" />
                </Form.Item>
                <Form.Item name="stock" label="库存">
                  <InputNumber min={0} precision={0} addonAfter="张" style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<SafetyOutlined />} title="发放与叠加" desc="配置发放渠道、领取人群、领取上限、预算和叠加限制。">
              <div className="merchant-editor-fields">
                <Form.Item name="issueChannel" label="发放方式">
                  <Select options={issueChannelOptions} placeholder="请选择发放方式" />
                </Form.Item>
                <Form.Item name="issueAudience" label="领取人群">
                  <Select options={issueAudienceOptions} placeholder="请选择领取人群" />
                </Form.Item>
                <Form.Item name="perUserLimit" label="每人限领">
                  <InputNumber min={1} precision={0} addonAfter="张" style={{ width: '100%' }} placeholder="1" />
                </Form.Item>
                <Form.Item name="totalBudget" label="预算上限">
                  <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="0.00" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="stackLimits" label="叠加限制">
                  <Checkbox.Group options={stackLimitOptions} />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="券模板详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail record={detail} fields={couponTemplateDetailFields} column={2} labelWidth={100} />
        ) : null}
      </BusinessDetailModal>

    </div>
  );
};

export default CouponTemplateManagement;
