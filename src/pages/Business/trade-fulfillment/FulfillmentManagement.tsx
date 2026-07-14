import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuditOutlined, CheckCircleOutlined, PartitionOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  writeOffMethodOptions,
  writeOffObjectTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { SelectOptionRecord, ServiceOrderRecord } from '@/services/backendService';

interface WriteOffRecord {
  id: string;
  writeoffNo: string;
  objectType: string;
  objectName: string;
  serviceOrderNo: string;
  userName: string;
  method: string;
  storeName: string;
  operator: string;
  amount: number;
  result: string;
  status: string;
  createdAt: string;
}

const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const writeOffObjectTypeMap = buildValueEnum(writeOffObjectTypeOptions);
const writeOffMethodMap = buildValueEnum(writeOffMethodOptions);

const writeOffReasonOptions = [
  { value: 'CUSTOMER_PRESENT', label: '用户到店核验' },
  { value: 'ORDER_REPAIR', label: '订单漏核销补录' },
  { value: 'AFTER_SALE', label: '售后补偿核销' },
  { value: 'FINANCE_RECONCILE', label: '财务对账补齐' },
];

const evidenceOptions = [
  { value: 'ORDER', label: '订单记录' },
  { value: 'PAYMENT', label: '支付凭证' },
  { value: 'STORE_CONFIRM', label: '门店确认' },
  { value: 'CUSTOMER_CONFIRM', label: '用户确认' },
];

const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || '未选择';
const optionLabels = (options: { value: string; label: string }[], values?: string[]) => (values || []).map((value) => optionLabel(options, value)).join('、') || '未选择';

const buildWriteOffResult = (values: Record<string, any>) => [
  `核销原因：${optionLabel(writeOffReasonOptions, values.writeOffReason)}`,
  `核验依据：${optionLabels(evidenceOptions, values.evidences)}`,
  `是否通知用户：${values.notifyUser ? '已通知' : '未通知'}`,
  values.resultNote ? `补充说明：${values.resultNote}` : '',
].filter(Boolean).join('；');

const omitOperationOnlyFields = (values: Record<string, any>) => {
  const { writeOffReason, evidences, notifyUser, resultNote, ...payload } = values;
  return payload;
};

const detailFields: DetailField<any>[] = [
  { name: 'writeoffNo', label: '核销单号' },
  { name: 'objectType', label: '核销对象' },
  { name: 'objectName', label: '对象名称' },
  { name: 'serviceOrderNo', label: '订单号' },
  { name: 'userName', label: '用户' },
  { name: 'method', label: '核销方式' },
  { name: 'storeName', label: '门店' },
  { name: 'operator', label: '操作人' },
  { name: 'amount', label: '核销金额' },
  { name: 'result', label: '结果摘要' },
  { name: 'status', label: '状态' },
  { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
];

const FulfillmentManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [detail, setDetail] = useState<WriteOffRecord | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [actionForm] = Form.useForm<Record<string, any>>();

  const writeOffQuery = useQuery({
    queryKey: ['writeOffRecords', keyword, filters.status, filters.objectType],
    queryFn: async () => (await api.writeOffRecord.page({
      pageNum: 1,
      pageSize: 200,
      keyword: keyword || undefined,
      status: filters.status,
      objectType: filters.objectType,
    })).data,
  });
  const storeOptionsQuery = useQuery({ queryKey: ['storeOptionsForWriteOff'], queryFn: async () => (await api.store.options()).data });
  const serviceOrderQuery = useQuery({ queryKey: ['serviceOrderOptionsForWriteOff'], queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 500 })).data });
  const records = ((writeOffQuery.data as any)?.records || []) as WriteOffRecord[];
  const storeOptions = (storeOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceOrders = (serviceOrderQuery.data?.records || []) as ServiceOrderRecord[];
  const serviceOrderOptions = serviceOrders.map((item) => ({ value: item.id, label: `${item.orderNo} / ${item.storeName || '-'} / ${item.serviceName || '-'}` }));
  const serviceOrderMap = useMemo(() => new Map(serviceOrders.map((item) => [item.id, item])), [serviceOrders]);
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item.label])), [storeOptions]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, result }: { id: string; status: string; result?: string }) => api.writeOffRecord.updateStatus(Number(id), { status, result }),
    onSuccess: () => {
      message.success('核销记录已更新');
      queryClient.invalidateQueries({ queryKey: ['writeOffRecords'] });
    },
  });
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => api.writeOffRecord.add(data),
    onSuccess: () => {
      message.success('后台补核销已创建');
      queryClient.invalidateQueries({ queryKey: ['writeOffRecords'] });
    },
  });

  const filteredRecords = useMemo(() => records.filter((item) => (
    containsKeyword(keyword, [item.writeoffNo, item.objectType, item.objectName, item.serviceOrderNo, item.userName, item.storeName, item.result])
    && (!filters.method || item.method === filters.method)
  )), [filters.method, keyword, records]);

  const columns: ProColumns<WriteOffRecord>[] = [
    { title: '核销单号', dataIndex: 'writeoffNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '核销单号 / 对象 / 订单 / 用户 / 门店 / 结果' } },
    { title: '核销对象', dataIndex: 'objectType', width: 120, valueType: 'select', valueEnum: writeOffObjectTypeMap, render: (_, record) => renderStatusTag(record.objectType, writeOffObjectTypeMap) },
    { title: '对象名称', dataIndex: 'objectName', width: 200, search: false },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170, search: false },
    { title: '用户', dataIndex: 'userName', width: 120, search: false },
    { title: '核销方式', dataIndex: 'method', width: 140, valueType: 'select', valueEnum: writeOffMethodMap, render: (_, record) => renderStatusTag(record.method, writeOffMethodMap) },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '操作人', dataIndex: 'operator', width: 120, search: false },
    { title: '核销金额', dataIndex: 'amount', width: 100, search: false },
    { title: '结果摘要', dataIndex: 'result', width: 220, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: writeOffStatusMap, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作', width: 220, search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" onClick={() => {
            setCurrentId(record.id);
            actionForm.setFieldsValue({ status: record.status, writeOffReason: 'ORDER_REPAIR', evidences: ['ORDER'], notifyUser: false, resultNote: record.result });
            setActionVisible(true);
          }}>处理</Button>
          <Button
            size="small"
            disabled={record.status === 'ROLLED_BACK'}
            loading={updateMutation.isPending}
            onClick={() => showBusinessConfirm({
              title: '确认异常回滚',
              content: `确定回滚核销记录「${record.writeoffNo || record.serviceOrderNo || record.id}」吗？`,
              okText: '确认回滚',
              onOk: () => updateMutation.mutate({ id: record.id, status: 'ROLLED_BACK', result: '已执行人工回滚' }),
            })}
          >回滚</Button>
        </Space>
      ),
    },
  ];

  const handleOrderSelect = (value?: number) => {
    const order = value ? serviceOrderMap.get(value) : undefined;
    createForm.setFieldsValue({
      serviceOrderNo: order?.orderNo,
      userName: order?.userName === '-' ? undefined : order?.userName,
      storeId: order?.storeId,
      storeName: order?.storeName,
      objectId: order?.id,
      objectName: order?.serviceName,
      amount: order?.payAmount ?? order?.amount,
    });
  };

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ objectType: 'SERVICE_RIGHT', method: 'MANUAL', status: 'SUCCESS', writeOffReason: 'ORDER_REPAIR', evidences: ['ORDER'], notifyUser: false });
    setCreateVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="核销记录" subtitle="管理权益核销、异常回滚和后台补核销。设备运行过程请在订单和设备详情中查看。" icon={<AuditOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}><Card><Statistic title="待核销" value={records.filter((item) => item.status === 'PENDING').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="核销成功" value={records.filter((item) => item.status === 'SUCCESS').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="已回滚" value={records.filter((item) => item.status === 'ROLLED_BACK').length} suffix="笔" /></Card></Col>
      </Row>
      <ProTable<WriteOffRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={filteredRecords}
        loading={writeOffQuery.isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 2160 }}
        toolBarRender={() => [<Button key="supplement" type="primary" onClick={openCreate}>后台补核销</Button>]}
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setFilters({
            status: values.status ? String(values.status) : undefined,
            objectType: values.objectType ? String(values.objectType) : undefined,
            method: values.method ? String(values.method) : undefined,
          });
        }}
        onReset={() => { setKeyword(''); setFilters({}); }}
      />

      <BusinessDetailModal title="核销详情" open={!!detail} onCancel={() => setDetail(null)} width={720}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={detailFields} column={1} labelWidth={110} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="核销补录"
        title="后台补核销"
        subtitle="补齐核销对象、订单、用户、门店和结果摘要，形成权益消耗闭环。"
        meta={['核销记录', '人工写入']}
        open={createVisible}
        confirmLoading={createMutation.isPending}
        onCancel={() => { setCreateVisible(false); createForm.resetFields(); }}
        onOk={async () => {
          const values = await createForm.validateFields();
          await createMutation.mutateAsync({
            ...omitOperationOnlyFields(values),
            result: buildWriteOffResult(values),
            storeName: values.storeName || storeOptionMap.get(values.storeId),
            operatorName: values.operatorName || '后台操作',
          });
          setCreateVisible(false);
          createForm.resetFields();
        }}
        width={920}
        forceRender
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<PartitionOutlined />} title="核销对象" desc="明确核销单、订单和权益对象，保证用户权益消耗可追溯。">
              <div className="merchant-editor-fields">
                <Form.Item name="writeoffNo" label="核销单号" rules={[{ required: true, message: '请输入核销单号' }]}><Input placeholder="例如：WO202605100001" /></Form.Item>
                <Form.Item name="serviceOrderId" label="服务订单"><Select showSearch optionFilterProp="label" options={serviceOrderOptions} placeholder="请选择服务订单" onChange={handleOrderSelect} /></Form.Item>
                <Form.Item name="serviceOrderNo" label="订单号" rules={[{ required: true, message: '请选择服务订单或输入订单号' }]}><Input placeholder="选择订单后自动回填" /></Form.Item>
                <Form.Item name="objectType" label="核销对象" rules={[{ required: true, message: '请选择核销对象' }]}><Select options={writeOffObjectTypeOptions} /></Form.Item>
                <Form.Item name="objectId" label="对象ID"><InputNumber style={{ width: '100%' }} min={1} precision={0} /></Form.Item>
                <Form.Item name="objectName" label="对象名称" rules={[{ required: true, message: '请输入对象名称' }]}><Input /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<AuditOutlined />} title="用户与现场" desc="补齐用户、门店、核销方式和操作人。">
              <div className="merchant-editor-fields">
                <Form.Item name="userId" label="用户ID"><InputNumber style={{ width: '100%' }} min={1} precision={0} /></Form.Item>
                <Form.Item name="userName" label="用户名称"><Input /></Form.Item>
                <Form.Item name="method" label="核销方式" rules={[{ required: true, message: '请选择核销方式' }]}><Select options={writeOffMethodOptions} /></Form.Item>
                <Form.Item name="storeId" label="门店"><Select options={storeOptions} allowClear onChange={(value) => createForm.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
                <Form.Item name="operatorName" label="操作人"><Input placeholder="默认后台操作" /></Form.Item>
                <Form.Item name="amount" label="核销金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" /></Form.Item>
              </div>
            </BusinessEditorSection>
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="核销结果" desc="写入最终状态和核验摘要。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={writeOffStatusOptions} /></Form.Item>
                <Form.Item name="writeOffReason" label="核销原因" rules={[{ required: true, message: '请选择核销原因' }]}><Select options={writeOffReasonOptions} /></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="evidences" label="核验依据" rules={[{ required: true, message: '请选择核验依据' }]}><Checkbox.Group options={evidenceOptions} /></Form.Item>
                <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
                <Form.Item className="merchant-editor-field-span-2" name="resultNote" label="补充说明"><Input /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="核销处理"
        title="核销状态处理"
        subtitle="更新核销状态，并记录人工判断依据。"
        meta={['核销状态', currentId ? `ID ${currentId}` : '待选择']}
        open={actionVisible}
        confirmLoading={updateMutation.isPending}
        onCancel={() => { setActionVisible(false); setCurrentId(null); actionForm.resetFields(); }}
        onOk={async () => {
          const values = await actionForm.validateFields();
          if (!currentId) return;
          await updateMutation.mutateAsync({ id: currentId, status: values.status, result: buildWriteOffResult(values) });
          setActionVisible(false);
          setCurrentId(null);
          actionForm.resetFields();
        }}
        width={760}
      >
        <Form form={actionForm} layout="vertical" className="merchant-editor-form">
          <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理结果" desc="选择新状态，并写明核验依据和补充说明。">
            <div className="merchant-editor-fields merchant-editor-fields--two">
              <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={writeOffStatusOptions} /></Form.Item>
              <Form.Item name="writeOffReason" label="处理原因" rules={[{ required: true, message: '请选择处理原因' }]}><Select options={writeOffReasonOptions} /></Form.Item>
              <Form.Item className="merchant-editor-field-span-2" name="evidences" label="核验依据" rules={[{ required: true, message: '请选择核验依据' }]}><Checkbox.Group options={evidenceOptions} /></Form.Item>
              <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
              <Form.Item className="merchant-editor-field-span-2" name="resultNote" label="补充说明"><Input /></Form.Item>
            </div>
          </BusinessEditorSection>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default FulfillmentManagement;
