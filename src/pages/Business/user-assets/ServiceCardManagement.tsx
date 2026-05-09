import React, { useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { WalletOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceCardStatusOptions, serviceCardTypeOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { ServiceCardRecord, ServiceCardUsageRecord, UserServiceCardRecord } from '@/services/backendService';

const cardTypeMap = buildValueEnum(serviceCardTypeOptions);
const statusMap = buildValueEnum(templateStatusOptions);
const userCardStatusMap = buildValueEnum(serviceCardStatusOptions);

const serviceCardDetailFields: DetailField<ServiceCardRecord>[] = [
  { name: 'cardCode', label: '编码' },
  { name: 'cardName', label: '名称' },
  { name: 'cardType', label: '类型', render: (value) => cardTypeMap[value as keyof typeof cardTypeMap]?.text || value },
  { name: 'scope', label: '作用范围' },
  { name: 'rights', label: '权益内容' },
  { name: 'salePrice', label: '售价', render: (value) => formatAmount(value) },
  { name: 'validity', label: '有效期' },
  { name: 'stock', label: '库存' },
  { name: 'issueRule', label: '发放规则' },
  { name: 'status', label: '状态', render: (value) => statusMap[value as keyof typeof statusMap]?.text || value },
];

const userServiceCardDetailFields: DetailField<UserServiceCardRecord>[] = [
  { name: 'cardNo', label: '用户卡号' },
  { name: 'cardName', label: '卡名称' },
  { name: 'userName', label: '用户' },
  { name: 'phone', label: '手机号' },
  { name: 'totalTimes', label: '总次数' },
  { name: 'remainTimes', label: '剩余次数' },
  { name: 'validFrom', label: '有效期开始' },
  { name: 'validTo', label: '有效期结束' },
  { name: 'status', label: '状态', render: (value) => userCardStatusMap[value as keyof typeof userCardStatusMap]?.text || value },
];

const serviceCardUsageDetailFields: DetailField<ServiceCardUsageRecord>[] = [
  { name: 'cardNo', label: '用户卡号' },
  { name: 'serviceOrderNo', label: '服务订单' },
  { name: 'storeName', label: '门店' },
  { name: 'useTimes', label: '使用次数' },
  { name: 'usedAt', label: '使用时间' },
  { name: 'remark', label: '备注' },
];

const ServiceCardManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ServiceCardRecord>();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceCardRecord | null>(null);
  const [detail, setDetail] = useState<ServiceCardRecord | UserServiceCardRecord | ServiceCardUsageRecord | null>(null);
  const [issueVisible, setIssueVisible] = useState(false);
  const [deductVisible, setDeductVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState<ServiceCardRecord | null>(null);
  const [currentUserCard, setCurrentUserCard] = useState<UserServiceCardRecord | null>(null);
  const [issueForm] = Form.useForm();
  const [deductForm] = Form.useForm();
  const cardQuery = useQuery({
    queryKey: ['serviceCards', keyword, typeFilter, statusFilter],
    queryFn: async () => (await api.asset.serviceCards.page({ pageNum: 1, pageSize: 200, keyword, cardType: typeFilter, status: statusFilter })).data,
  });
  const userCardQuery = useQuery({
    queryKey: ['userServiceCards', keyword],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const usageQuery = useQuery({
    queryKey: ['serviceCardUsages', keyword],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword })).data,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => editingRecord?.id ? api.asset.serviceCards.edit({ ...values, id: editingRecord.id }) : api.asset.serviceCards.add(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      message.success(editingRecord ? '卡产品已更新' : '卡产品已创建');
    },
  });
  const statusMutation = useMutation({
    mutationFn: async (record: ServiceCardRecord) => api.asset.serviceCards.changeStatus(record.id, record.status === 'ENABLED' ? 'PAUSED' : 'ENABLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      message.success('卡产品状态已更新');
    },
  });
  const issueMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.asset.serviceCards.issue(Number(currentCard?.id), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceCards'] });
      message.success('服务卡已发放');
    },
  });
  const deductMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => api.asset.userServiceCards.deduct(Number(currentUserCard?.id), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userServiceCards'] });
      queryClient.invalidateQueries({ queryKey: ['serviceCardUsages'] });
      message.success('扣次已完成');
    },
  });

  const cards = cardQuery.data?.records || [];
  const userCards = userCardQuery.data?.records || [];
  const usageRecords = usageQuery.data?.records || [];

  const openIssue = (record: ServiceCardRecord) => {
    setCurrentCard(record);
    issueForm.resetFields();
    issueForm.setFieldsValue({ totalTimes: 1, remainTimes: 1, validDays: 365, sourceBizNo: 'BACKEND' });
    setIssueVisible(true);
  };

  const openDeduct = (record: UserServiceCardRecord) => {
    setCurrentUserCard(record);
    deductForm.resetFields();
    deductForm.setFieldsValue({ cardNo: record.cardNo, userName: record.userName, deductCount: 1 });
    setDeductVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const columns: ProColumns<ServiceCardRecord>[] = [
    {
      title: '卡产品',
      dataIndex: 'cardName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.cardName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.cardCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡名称 / 编码 / 范围 / 权益' } },
    {
      title: '卡类型',
      dataIndex: 'cardType',
      width: 120,
      valueType: 'select',
      valueEnum: cardTypeMap,
      render: (_, record) => renderStatusTag(record.cardType, cardTypeMap),
    },
    { title: '作用范围', dataIndex: 'scope', width: 160, search: false },
    { title: '权益内容', dataIndex: 'rights', width: 220, search: false },
    { title: '售价', dataIndex: 'salePrice', width: 120, search: false, render: (_, record) => formatAmount(record.salePrice) },
    { title: '有效期', dataIndex: 'validity', width: 120, search: false },
    { title: '发放规则', dataIndex: 'issueRule', width: 180, search: false },
    { title: '库存', dataIndex: 'stock', width: 100, search: false },
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
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate(record)}
          >
            {record.status === 'ENABLED' ? '暂停' : '启用'}
          </Button>
          <Button size="small" onClick={() => openIssue(record)}>发卡</Button>
        </Space>
      ),
    },
  ];

  const userCardColumns: ProColumns<UserServiceCardRecord>[] = [
    { title: '用户卡号', dataIndex: 'cardNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡号 / 卡名称 / 用户 / 手机号' } },
    { title: '卡名称', dataIndex: 'cardName', width: 160, search: false },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '总次数', dataIndex: 'totalTimes', width: 100, search: false },
    { title: '剩余次数', dataIndex: 'remainTimes', width: 100, search: false },
    { title: '有效期开始', dataIndex: 'validFrom', width: 120, search: false },
    { title: '有效期结束', dataIndex: 'validTo', width: 120, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: userCardStatusMap, render: (_, record) => renderStatusTag(record.status, userCardStatusMap) },
    { title: '操作', width: 150, search: false, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" onClick={() => openDeduct(record)}>扣次</Button>
      </Space>
    ) },
  ];

  const usageColumns: ProColumns<ServiceCardUsageRecord>[] = [
    { title: '用户卡号', dataIndex: 'cardNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '卡号 / 订单 / 门店 / 备注' } },
    { title: '服务订单', dataIndex: 'serviceOrderNo', width: 180, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '使用次数', dataIndex: 'useTimes', width: 100, search: false },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, search: false },
    { title: '备注', dataIndex: 'remark', width: 220, search: false },
    { title: '操作', width: 150, search: false, render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" onClick={async () => { await api.asset.serviceCardUsages.rollback(record.id, { remark: '后台回滚扣次' }); queryClient.invalidateQueries({ queryKey: ['serviceCardUsages'] }); queryClient.invalidateQueries({ queryKey: ['userServiceCards'] }); message.success('扣次已回滚'); }}>回滚</Button>
      </Space>
    ) },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await saveMutation.mutateAsync(values as unknown as Record<string, unknown>);
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="服务卡与次卡" subtitle="补齐服务卡、次卡、月卡的产品配置、售价、发放规则和上下架状态。" icon={<WalletOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="卡产品" value={cards.length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="服务卡" value={cards.filter((item) => item.cardType === 'SERVICE_CARD').length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="次卡 / 月卡" value={cards.filter((item) => item.cardType !== 'SERVICE_CARD').length} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="可售库存" value={cards.reduce((sum, item) => sum + Number(item.stock || 0), 0)} suffix="份" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'product',
            label: '卡产品',
            children: (
              <ProTable<ServiceCardRecord>
                cardBordered
                rowKey="id"
                columns={columns}
                dataSource={cards}
                loading={cardQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1780 }}
                toolBarRender={() => [
                  <Button key="issue" onClick={() => {
                    if (cards[0]) openIssue(cards[0]);
                  }}>批量发卡</Button>,
                  <Button
                    key="new"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingRecord(null);
                      form.resetFields();
                      form.setFieldsValue({ cardType: 'SERVICE_CARD', status: 'ENABLED', stock: 0, salePrice: 0 });
                      setModalVisible(true);
                    }}
                  >
                    新建卡产品
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setKeyword(String(values.keyword || ''));
                  setTypeFilter(values.cardType as string | undefined);
                  setStatusFilter(values.status as string | undefined);
                }}
                onReset={() => {
                  setKeyword('');
                  setTypeFilter(undefined);
                  setStatusFilter(undefined);
                }}
              />
            ),
          },
          {
            key: 'userCard',
            label: '用户服务卡',
            children: (
              <ProTable<UserServiceCardRecord>
                cardBordered
                rowKey="id"
                columns={userCardColumns}
                dataSource={userCards}
                loading={userCardQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1480 }}
              />
            ),
          },
          {
            key: 'usage',
            label: '使用记录',
            children: (
              <ProTable<ServiceCardUsageRecord>
                cardBordered
                rowKey="id"
                columns={usageColumns}
                dataSource={usageRecords}
                loading={usageQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1320 }}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingRecord ? `编辑卡产品 · ${editingRecord.cardName}` : '新建卡产品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        width={860}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="cardCode" label="卡产品编码" rules={[{ required: true, message: '请输入卡产品编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cardName" label="卡名称" rules={[{ required: true, message: '请输入卡名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cardType" label="卡类型" rules={[{ required: true, message: '请选择卡类型' }]}>
              <Select options={serviceCardTypeOptions} />
            </Form.Item>
            <Form.Item name="scope" label="作用范围">
              <Input />
            </Form.Item>
            <Form.Item name="salePrice" label="售价">
              <Input />
            </Form.Item>
            <Form.Item name="validity" label="有效期">
              <Input />
            </Form.Item>
            <Form.Item name="stock" label="库存">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={templateStatusOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="rights" label="权益内容">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="issueRule" label="发放规则">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={detail && 'serviceOrderNo' in detail ? '使用记录详情' : detail && 'cardNo' in detail ? '用户服务卡详情' : '卡产品详情'} open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('serviceOrderNo' in detail ? serviceCardUsageDetailFields : 'cardNo' in detail ? userServiceCardDetailFields : serviceCardDetailFields) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={100}
          />
        ) : null}
      </Modal>

      <Modal
        title={`发放服务卡 · ${currentCard?.cardName || ''}`}
        open={issueVisible}
        onCancel={() => setIssueVisible(false)}
        onOk={async () => {
          const values = await issueForm.validateFields();
          await issueMutation.mutateAsync(values);
          setIssueVisible(false);
        }}
        width={760}
      >
        <Form form={issueForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input /></Form.Item>
            <Form.Item name="phone" label="手机号"><Input /></Form.Item>
            <Form.Item name="totalTimes" label="总次数" rules={[{ required: true, message: '请输入总次数' }]}><Input /></Form.Item>
            <Form.Item name="remainTimes" label="剩余次数"><Input /></Form.Item>
            <Form.Item name="validDays" label="有效天数"><Input /></Form.Item>
            <Form.Item name="sourceBizNo" label="来源单号"><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`服务卡扣次 · ${currentUserCard?.cardNo || ''}`}
        open={deductVisible}
        onCancel={() => setDeductVisible(false)}
        onOk={async () => {
          const values = await deductForm.validateFields();
          await deductMutation.mutateAsync(values);
          setDeductVisible(false);
        }}
        width={760}
      >
        <Form form={deductForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="cardNo" label="用户卡号"><Input disabled /></Form.Item>
            <Form.Item name="userName" label="用户"><Input disabled /></Form.Item>
            <Form.Item name="deductCount" label="扣减次数" rules={[{ required: true, message: '请输入扣减次数' }]}><Input /></Form.Item>
            <Form.Item name="serviceOrderNo" label="服务订单号"><Input /></Form.Item>
            <Form.Item name="storeName" label="门店"><Input /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiceCardManagement;
