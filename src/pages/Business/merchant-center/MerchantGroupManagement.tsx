import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Row, Select, Space, Statistic, message } from 'antd';
import { ApartmentOutlined, DeploymentUnitOutlined, PlusOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { merchantGroupTypeOptions, scopeLevelOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type { MerchantGroupRecord, MerchantGroupStoreRecord, SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderStatusTag, safeJsonParse } from '@/pages/Business/shared';

const groupTypeMap = buildValueEnum(merchantGroupTypeOptions);
const statusMap = buildValueEnum(templateStatusOptions);
const scopeLevelMap = buildValueEnum(scopeLevelOptions);
const groupUsageOptions = [
  { value: '活动投放', label: '活动投放' },
  { value: '跨店核销', label: '跨店核销' },
  { value: '区域统计', label: '区域统计' },
  { value: '运维巡检', label: '运维巡检' },
];
const writeoffScopeOptions = [
  { value: '同门店组通用', label: '同门店组通用' },
  { value: '同商户门店组通用', label: '同商户门店组通用' },
  { value: '仅原购买门店可用', label: '仅原购买门店可用' },
];
const writeoffLimitOptions = [
  { value: '不支持跨商户核销', label: '不支持跨商户核销' },
  { value: '支持跨商户核销', label: '支持跨商户核销' },
];
const parseGroupRules = (record: MerchantGroupRecord) => ({
  ...parseScopeConfig(record.scope, record),
  ...parseWriteoffConfig(record.writeoffRule, record),
});
const parseScopeConfig = (scope?: string, record?: MerchantGroupRecord) => ({
  scopeUsages: record?.scopeUsages || safeJsonParse<{ scopeUsages?: string[] }>(scope, {}).scopeUsages || [],
  scopeRemark: record?.scopeRemark || safeJsonParse<{ scopeRemark?: string }>(scope, {}).scopeRemark,
});
const parseWriteoffConfig = (writeoffRule?: string, record?: MerchantGroupRecord) => ({
  writeoffScope: record?.writeoffScope || safeJsonParse<{ writeoffScope?: string }>(writeoffRule, {}).writeoffScope,
  writeoffLimit: record?.writeoffLimit || safeJsonParse<{ writeoffLimit?: string }>(writeoffRule, {}).writeoffLimit,
  writeoffRemark: record?.writeoffRemark || safeJsonParse<{ writeoffRemark?: string }>(writeoffRule, {}).writeoffRemark,
});
const buildGroupScope = (values: Record<string, any>) =>
  JSON.stringify({
    scopeUsages: Array.isArray(values.scopeUsages) ? values.scopeUsages : [],
    scopeRemark: values.scopeRemark || '',
  });
const buildWriteoffRule = (values: Record<string, any>) =>
  JSON.stringify({
    writeoffScope: values.writeoffScope || '',
    writeoffLimit: values.writeoffLimit || '',
    writeoffRemark: values.writeoffRemark || '',
  });

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
  const { data: merchantOptions } = useQuery({ queryKey: ['merchantOptionsForMerchantGroups'], queryFn: async () => (await api.merchant.options()).data });
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForMerchantGroups'], queryFn: async () => (await api.store.options()).data });
  const merchantOptionMap = useMemo(() => new Map((merchantOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [merchantOptions]);
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);
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
      setRecords((page.records || []).map((record) => ({ ...record, ...parseGroupRules(record) })));
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
        merchantId: memberGroup.merchantId,
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
      activity: records.filter((item) => item.groupType === 'ACTIVITY').length,
      writeoff: records.filter((item) => item.groupType === 'WRITEOFF').length,
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
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店组 / 商户 / 城市 / 负责人' } },
    { title: '所属商户', dataIndex: 'merchantName', width: 180, search: false },
    {
      title: '分组类型',
      dataIndex: 'groupType',
      width: 140,
      valueType: 'select',
      valueEnum: groupTypeMap,
      render: (_, record) => renderStatusTag(record.groupType, groupTypeMap),
    },
    {
      title: '作用层级',
      dataIndex: 'scopeLevel',
      width: 120,
      search: false,
      render: (_, record) => renderStatusTag(record.scopeLevel, scopeLevelMap),
    },
    { title: '城市', dataIndex: 'city', width: 120, search: false },
    { title: '门店数', dataIndex: 'storeCount', width: 100, search: false },
    { title: '用途范围', dataIndex: 'scopeUsages', width: 240, search: false, render: (_, record) => (record.scopeUsages && record.scopeUsages.length ? record.scopeUsages.join('、') : record.scope || '-') },
    { title: '核销规则', dataIndex: 'writeoffRule', width: 220, search: false, render: (_, record) => [record.writeoffScope, record.writeoffLimit].filter(Boolean).join('、') || record.writeoffRule || '-' },
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
              form.setFieldsValue({ ...record, ...parseGroupRules(record) } as any);
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
    const { scopeUsages, scopeRemark, writeoffScope, writeoffLimit, writeoffRemark, ...baseValues } = values as Record<string, any>;
    const payload = {
      ...baseValues,
      scope: buildGroupScope({ scopeUsages, scopeRemark }),
      writeoffRule: buildWriteoffRule({ writeoffScope, writeoffLimit, writeoffRemark }),
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
      <PageBanner title="门店组管理" subtitle="按文档补齐区域、活动、核销、统计门店组的配置与查看能力。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店组总量" value={summary.total} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动门店组" value={summary.activity} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="跨店核销组" value={summary.writeoff} suffix="组" /></Card></Col>
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
          const parsedRecords = (page.records || []).map((record) => ({ ...record, ...parseGroupRules(record) }));
          setRecords(parsedRecords);
          setKeyword(String(params.keyword || ''));
          setTypeFilter(params.groupType as string | undefined);
          setStatusFilter(params.status as string | undefined);
          return { data: parsedRecords, total: page.total, success: true };
        }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1880 }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({ groupType: 'ACTIVITY', scopeLevel: 'STORE_GROUP', status: 'DRAFT', storeCount: 0 });
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
        subtitle="用于活动投放、跨店核销、区域运营和统计分析，需同时绑定商户主体和作用范围。"
        meta={['门店组', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingRecord ? '保存变更' : '创建门店组'}
        width={1120}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<DeploymentUnitOutlined />}
              title="分组基础信息"
              desc="定义门店组编码、名称、归属商户和当前状态，支撑后续成员维护和业务引用。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="groupCode" label="门店组编码" rules={[{ required: true, message: '请输入门店组编码' }]}>
                  <Input placeholder="例如：GRP-ACT-001" />
                </Form.Item>
                <Form.Item name="groupName" label="门店组名称" rules={[{ required: true, message: '请输入门店组名称' }]}>
                  <Input placeholder="例如：五一活动核心门店组" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select options={templateStatusOptions} placeholder="请选择状态" />
                </Form.Item>
                <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择商户' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={merchantOptions as SelectOptionRecord[]}
                    placeholder="请选择商户"
                    onChange={(value) => form.setFieldValue('merchantName', merchantOptionMap.get(value))}
                  />
                </Form.Item>
                <Form.Item name="merchantName" label="商户名称" rules={[{ required: true, message: '请选择商户' }]}>
                  <Input disabled placeholder="选择商户后自动带出" />
                </Form.Item>
                <Form.Item name="owner" label="负责人">
                  <Input placeholder="例如：区域运营负责人" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<TagsOutlined />}
              title="作用范围与规则"
              desc="明确门店组使用场景、城市范围和核销规则，避免活动、券和结算口径混用。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="groupType" label="分组类型" rules={[{ required: true, message: '请选择分组类型' }]}>
                  <Select options={merchantGroupTypeOptions} placeholder="请选择分组类型" />
                </Form.Item>
                <Form.Item name="scopeLevel" label="作用层级" rules={[{ required: true, message: '请选择作用层级' }]}>
                  <Select options={scopeLevelOptions} placeholder="请选择作用层级" />
                </Form.Item>
                <Form.Item name="city" label="城市">
                  <Input placeholder="例如：上海 / 苏州" />
                </Form.Item>
                <Form.Item name="storeCount" label="门店数">
                  <Input disabled placeholder="由成员维护自动统计" />
                </Form.Item>
                <Form.Item name="scopeUsages" label="用途范围">
                  <Select mode="multiple" options={groupUsageOptions} placeholder="请选择用途范围" />
                </Form.Item>
                <Form.Item name="scopeRemark" label="用途补充">
                  <Input placeholder="例如：五一活动核心门店" />
                </Form.Item>
                <Form.Item name="writeoffScope" label="核销范围">
                  <Select options={writeoffScopeOptions} placeholder="请选择核销范围" />
                </Form.Item>
                <Form.Item name="writeoffLimit" label="跨商户限制">
                  <Select options={writeoffLimitOptions} placeholder="请选择限制方式" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="writeoffRemark" label="核销补充">
                  <Input placeholder="例如：活动券仅支持有效期内核销" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                  <Input.TextArea rows={3} placeholder="记录维护原因、使用边界或审批说明" />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="门店组详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店组编码">{detail.groupCode}</Descriptions.Item>
            <Descriptions.Item label="门店组名称">{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label="所属商户">{detail.merchantName}</Descriptions.Item>
            <Descriptions.Item label="分组类型">{groupTypeMap[detail.groupType as keyof typeof groupTypeMap]?.text || detail.groupType}</Descriptions.Item>
            <Descriptions.Item label="作用层级">{scopeLevelMap[detail.scopeLevel as keyof typeof scopeLevelMap]?.text || detail.scopeLevel}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="门店数">{detail.storeCount}</Descriptions.Item>
            <Descriptions.Item label="用途范围">{(detail.scopeUsages || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="用途补充">{detail.scopeRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销范围">{detail.writeoffScope || '-'}</Descriptions.Item>
            <Descriptions.Item label="跨商户限制">{detail.writeoffLimit || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销补充">{detail.writeoffRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="负责人">{detail.owner}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="门店组成员维护"
        title={memberGroup ? `门店组成员 · ${memberGroup.groupName}` : '门店组成员'}
        subtitle="将门店加入当前门店组，成员变更会同步影响门店组覆盖数量。"
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
              desc="选择门店后自动带出门店名称，可补充编码和成员维护说明。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions as SelectOptionRecord[]}
                    placeholder="请选择门店"
                    onChange={(value) => memberForm.setFieldValue('storeName', storeOptionMap.get(value))}
                  />
                </Form.Item>
                <Form.Item name="storeCode" label="门店编码">
                  <Input placeholder="例如：STR-HQ-001" />
                </Form.Item>
                <Form.Item name="storeName" label="门店名称" rules={[{ required: true, message: '请选择门店' }]}>
                  <Input disabled placeholder="选择门店后自动带出" />
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
