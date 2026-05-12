import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Radio, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined, CheckCircleOutlined, FieldTimeOutlined, PartitionOutlined, ToolOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  performSceneOptions,
  performStatusOptions,
  writeOffMethodOptions,
  writeOffObjectTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { SelectOptionRecord, ServiceOrderRecord } from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

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

interface PerformRecord {
  id: string;
  relationNo: string;
  scene: string;
  storeName: string;
  pointCode: string;
  deviceCode: string;
  commandNo: string;
  commandStatus: string;
  startAt: string;
  finishAt: string;
  status: string;
  remark: string;
}

const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const writeOffObjectTypeMap = buildValueEnum(writeOffObjectTypeOptions);
const writeOffMethodMap = buildValueEnum(writeOffMethodOptions);
const performStatusMap = buildValueEnum(performStatusOptions);
const performSceneMap = buildValueEnum(performSceneOptions);

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

const performIssueOptions = [
  { value: 'DEVICE_TIMEOUT', label: '设备超时' },
  { value: 'POINT_OCCUPIED', label: '点位占用' },
  { value: 'NETWORK_ERROR', label: '网络异常' },
  { value: 'MANUAL_SERVICE', label: '人工服务完成' },
];

const correctionActionOptions = [
  { value: 'RETRY_COMMAND', label: '重新下发指令' },
  { value: 'MANUAL_OPEN', label: '人工开启服务' },
  { value: 'MARK_FINISHED', label: '标记已完成' },
  { value: 'ROLLBACK_RIGHTS', label: '回退用户权益' },
];

const followUpOptions = [
  { value: 'NONE', label: '无需跟进' },
  { value: 'CALL_USER', label: '回访用户' },
  { value: 'CHECK_DEVICE', label: '检查设备' },
  { value: 'FINANCE_REVIEW', label: '财务复核' },
];

const formatPickerValue = (value: any) => value?.format?.('YYYY-MM-DD HH:mm:ss') || value;
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || '未选择';
const optionLabels = (options: { value: string; label: string }[], values?: string[]) => (values || []).map((value) => optionLabel(options, value)).join('、') || '未选择';

const buildWriteOffResult = (values: Record<string, any>) => [
  `核销原因：${optionLabel(writeOffReasonOptions, values.writeOffReason)}`,
  `核验依据：${optionLabels(evidenceOptions, values.evidences)}`,
  `是否通知用户：${values.notifyUser ? '已通知' : '未通知'}`,
  values.resultNote ? `补充说明：${values.resultNote}` : '',
].filter(Boolean).join('；');

const buildPerformRemark = (values: Record<string, any>) => [
  `异常类型：${optionLabel(performIssueOptions, values.issueType)}`,
  `处理动作：${optionLabel(correctionActionOptions, values.correctionAction)}`,
  `后续跟进：${optionLabel(followUpOptions, values.followUp)}`,
  values.operatorNote ? `补充说明：${values.operatorNote}` : '',
].filter(Boolean).join('；');

const omitOperationOnlyFields = (values: Record<string, any>) => {
  const {
    writeOffReason,
    evidences,
    notifyUser,
    resultNote,
    issueType,
    correctionAction,
    followUp,
    operatorNote,
    ...payload
  } = values;
  return payload;
};

const fulfillmentDetailFields: Record<'writeoff' | 'perform', DetailField<any>[]> = {
  writeoff: [
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
  ],
  perform: [
    { name: 'relationNo', label: '关联单号' },
    { name: 'scene', label: '履约场景' },
    { name: 'storeName', label: '门店' },
    { name: 'pointCode', label: '点位' },
    { name: 'deviceCode', label: '设备编号' },
    { name: 'commandNo', label: '指令号' },
    { name: 'commandStatus', label: '指令状态' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'finishAt', label: '结束时间', render: (value) => formatDateTime(value) },
    { name: 'status', label: '状态' },
    { name: 'remark', label: '备注' },
  ],
};

const FulfillmentManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [writeOffKeyword, setWriteOffKeyword] = useState('');
  const [performKeyword, setPerformKeyword] = useState('');
  const [detail, setDetail] = useState<WriteOffRecord | PerformRecord | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'writeoff' | 'perform'>('writeoff');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<Record<string, any>>();
  const [createType, setCreateType] = useState<'writeoff' | 'perform' | null>(null);
  const [createForm] = Form.useForm();
  const writeOffQuery = useQuery({
    queryKey: ['writeOffRecords', writeOffKeyword],
    queryFn: async () => (await api.writeOffRecord.page({ pageNum: 1, pageSize: 200, keyword: writeOffKeyword || undefined })).data,
  });
  const performQuery = useQuery({
    queryKey: ['performRecords', performKeyword],
    queryFn: async () => (await api.performRecord.page({ pageNum: 1, pageSize: 200, keyword: performKeyword || undefined })).data,
  });
  const writeoffs = ((writeOffQuery.data as any)?.records || []) as WriteOffRecord[];
  const performs = ((performQuery.data as any)?.records || []) as PerformRecord[];
  const storeOptionsQuery = useQuery({ queryKey: ['storeOptionsForFulfillment'], queryFn: async () => (await api.store.options()).data });
  const servicePointOptionsQuery = useQuery({ queryKey: ['servicePointOptionsForFulfillment'], queryFn: async () => (await api.servicePoint.options()).data });
  const deviceOptionsQuery = useQuery({ queryKey: ['deviceOptionsForFulfillment'], queryFn: async () => (await api.device.options()).data });
  const serviceOrderQuery = useQuery({ queryKey: ['serviceOrderOptionsForFulfillment'], queryFn: async () => (await api.serviceOrder.page({ pageNum: 1, pageSize: 500 })).data });
  const storeOptions = (storeOptionsQuery.data || []) as SelectOptionRecord[];
  const servicePointOptions = (servicePointOptionsQuery.data || []) as SelectOptionRecord[];
  const deviceOptions = (deviceOptionsQuery.data || []) as SelectOptionRecord[];
  const serviceOrders = (serviceOrderQuery.data?.records || []) as ServiceOrderRecord[];
  const serviceOrderOptions = serviceOrders.map((item) => ({ value: item.id, label: `${item.orderNo} / ${item.storeName || '-'} / ${item.serviceName || '-'}` }));
  const serviceOrderMap = useMemo(() => new Map(serviceOrders.map((item) => [item.id, item])), [serviceOrders]);
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item.label])), [storeOptions]);
  const servicePointOptionMap = useMemo(() => new Map(servicePointOptions.map((item) => [item.value, item.label])), [servicePointOptions]);
  const deviceOptionMap = useMemo(() => new Map(deviceOptions.map((item) => [item.value, item.label])), [deviceOptions]);
  const updateWriteOffMutation = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status: string; remark?: string }) => api.writeOffRecord.updateStatus(Number(id), { status, result: remark }),
    onSuccess: () => {
      message.success('核销记录已更新');
      queryClient.invalidateQueries({ queryKey: ['writeOffRecords'] });
    },
  });
  const updatePerformMutation = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status: string; remark?: string }) => api.performRecord.updateStatus(Number(id), { status, remark }),
    onSuccess: () => {
      message.success('履约记录已更新');
      queryClient.invalidateQueries({ queryKey: ['performRecords'] });
    },
  });
  const createWriteOffMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => api.writeOffRecord.add(data),
    onSuccess: () => {
      message.success('后台补核销已创建');
      queryClient.invalidateQueries({ queryKey: ['writeOffRecords'] });
    },
  });
  const createPerformMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => api.performRecord.add(data),
    onSuccess: () => {
      message.success('人工履约纠偏已创建');
      queryClient.invalidateQueries({ queryKey: ['performRecords'] });
    },
  });

  const confirmRollbackWriteOff = (record?: WriteOffRecord) => {
    if (!record) return;
    showBusinessConfirm({
      title: '确认异常回滚',
      content: `确定回滚核销记录「${record.writeoffNo || record.serviceOrderNo || record.id}」吗？回滚后会影响订单核销结果。`,
      okText: '确认回滚',
      onOk: () => updateWriteOffMutation.mutate({ id: record.id, status: 'ROLLED_BACK', remark: '批量异常回滚' }),
    });
  };

  const filteredWriteOffs = useMemo(() => writeoffs.filter((item) => containsKeyword(writeOffKeyword, [item.writeoffNo, item.objectType, item.objectName, item.serviceOrderNo, item.userName, item.storeName, item.result])), [writeOffKeyword, writeoffs]);
  const filteredPerforms = useMemo(() => performs.filter((item) => containsKeyword(performKeyword, [item.relationNo, item.scene, item.storeName, item.pointCode, item.deviceCode, item.commandNo, item.remark])), [performKeyword, performs]);

  const writeOffColumns: ProColumns<WriteOffRecord>[] = [
    { title: '核销单号', dataIndex: 'writeoffNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '核销单号 / 对象 / 订单 / 用户 / 门店 / 结果' } },
    { title: '核销对象', dataIndex: 'objectType', width: 120, valueType: 'select', valueEnum: writeOffObjectTypeMap, render: (_, record) => renderStatusTag(record.objectType, writeOffObjectTypeMap) },
    { title: '对象名称', dataIndex: 'objectName', width: 200, search: false },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170, search: false },
    { title: '用户', dataIndex: 'userName', width: 100, search: false },
    { title: '核销方式', dataIndex: 'method', width: 140, valueType: 'select', valueEnum: writeOffMethodMap, render: (_, record) => renderStatusTag(record.method, writeOffMethodMap) },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '操作人', dataIndex: 'operator', width: 120, search: false },
    { title: '核销金额', dataIndex: 'amount', width: 100, search: false },
    { title: '结果摘要', dataIndex: 'result', width: 180, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: writeOffStatusMap, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
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
              setActionType('writeoff');
              setCurrentId(record.id);
              actionForm.setFieldsValue({ status: record.status, writeOffReason: 'ORDER_REPAIR', evidences: ['ORDER'], notifyUser: false, resultNote: record.result });
              setActionModalVisible(true);
            }}
          >
            补核销
          </Button>
          <Button
            size="small"
            onClick={() => {
              updateWriteOffMutation.mutate({ id: record.id, status: 'ROLLED_BACK', remark: '已执行人工回滚' });
            }}
          >
            回滚
          </Button>
        </Space>
      ),
    },
  ];

  const performColumns: ProColumns<PerformRecord>[] = [
    { title: '关联单号', dataIndex: 'relationNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 场景 / 门店 / 点位 / 设备 / 指令 / 说明' } },
    { title: '履约场景', dataIndex: 'scene', width: 140, valueType: 'select', valueEnum: performSceneMap, render: (_, record) => renderStatusTag(record.scene, performSceneMap) },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '设备编号', dataIndex: 'deviceCode', width: 140, search: false },
    { title: '指令号', dataIndex: 'commandNo', width: 170, search: false },
    { title: '指令状态', dataIndex: 'commandStatus', width: 120, search: false },
    { title: '开始时间', dataIndex: 'startAt', width: 180, search: false, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'finishAt', width: 180, search: false, render: (_, record) => formatDateTime(record.finishAt) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: performStatusMap, render: (_, record) => renderStatusTag(record.status, performStatusMap) },
    { title: '备注', dataIndex: 'remark', width: 200, search: false },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>日志</Button>
          <Button
            size="small"
            onClick={() => {
              setActionType('perform');
              setCurrentId(record.id);
              actionForm.setFieldsValue({ status: record.status, issueType: 'DEVICE_TIMEOUT', correctionAction: 'RETRY_COMMAND', followUp: 'CHECK_DEVICE', operatorNote: record.remark });
              setActionModalVisible(true);
            }}
          >
            异常处理
          </Button>
          <Button
            size="small"
            onClick={() => {
              updatePerformMutation.mutate({ id: record.id, status: 'FINISHED', remark: '已人工纠偏完成履约' });
            }}
          >
            纠偏完成
          </Button>
        </Space>
      ),
    },
  ];

  const handleActionSubmit = async () => {
    const values = await actionForm.validateFields();
    if (!currentId) {
      return;
    }

    if (actionType === 'writeoff') {
      await updateWriteOffMutation.mutateAsync({ id: currentId, status: values.status, remark: buildWriteOffResult(values) });
    } else {
      await updatePerformMutation.mutateAsync({ id: currentId, status: values.status, remark: buildPerformRemark(values) });
    }

    setActionModalVisible(false);
    setCurrentId(null);
    actionForm.resetFields();
  };

  const openCreateModal = (type: 'writeoff' | 'perform') => {
    setCreateType(type);
    createForm.resetFields();
    createForm.setFieldsValue(type === 'writeoff'
      ? { objectType: 'SERVICE_RIGHT', method: 'MANUAL', status: 'SUCCESS', writeOffReason: 'ORDER_REPAIR', evidences: ['ORDER'], notifyUser: false }
      : { scene: 'SCAN_CAR_WASH', commandStatus: 'MANUAL', status: 'FINISHED', issueType: 'MANUAL_SERVICE', correctionAction: 'MARK_FINISHED', followUp: 'NONE' });
  };

  const handleOrderSelect = (value?: number) => {
    const order = value ? serviceOrderMap.get(value) : undefined;
    createForm.setFieldsValue({
      serviceOrderNo: order?.orderNo,
      relationNo: order?.orderNo,
      userName: order?.userName === '-' ? undefined : order?.userName,
      storeId: order?.storeId,
      storeName: order?.storeName,
      objectId: order?.serviceProductId,
      objectName: order?.serviceName,
      amount: order?.payAmount ?? order?.amount,
    });
  };

  const handleCreateSubmit = async () => {
    const values = await createForm.validateFields();
    if (createType === 'writeoff') {
      await createWriteOffMutation.mutateAsync({
        ...omitOperationOnlyFields(values),
        result: buildWriteOffResult(values),
        storeName: values.storeName || storeOptionMap.get(values.storeId),
        operatorName: values.operatorName || '后台操作',
      });
    }
    if (createType === 'perform') {
      await createPerformMutation.mutateAsync({
        ...omitOperationOnlyFields(values),
        startAt: formatPickerValue(values.startAt),
        finishAt: formatPickerValue(values.finishAt),
        remark: buildPerformRemark(values),
        storeName: values.storeName || storeOptionMap.get(values.storeId),
        pointCode: values.pointCode || servicePointOptionMap.get(values.servicePointId),
        deviceCode: values.deviceCode || deviceOptionMap.get(values.deviceId),
      });
    }
    setCreateType(null);
    createForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="核销履约" subtitle="管理权益核销记录、履约日志、异常处理和后台补核销动作。" icon={<AuditOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待核销" value={writeoffs.filter((item) => item.status === 'PENDING').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="履约中" value={performs.filter((item) => item.status === 'STARTED').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="异常回滚" value={writeoffs.filter((item) => item.status === 'ROLLED_BACK').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="异常履约" value={performs.filter((item) => item.status === 'ABNORMAL').length} suffix="单" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'writeoff',
            label: '核销记录',
            children: (
              <ProTable<WriteOffRecord>
                cardBordered
                rowKey="id"
                columns={writeOffColumns}
                dataSource={filteredWriteOffs}
                loading={writeOffQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 2160 }}
                toolBarRender={() => [<Button key="rollback" onClick={() => confirmRollbackWriteOff(filteredWriteOffs[0])} disabled={!filteredWriteOffs.length}>异常回滚</Button>, <Button key="supplement" type="primary" onClick={() => openCreateModal('writeoff')}>后台补核销</Button>]}
                onSubmit={(values) => setWriteOffKeyword(String(values.keyword || ''))}
                onReset={() => setWriteOffKeyword('')}
              />
            ),
          },
          {
            key: 'perform',
            label: '履约日志',
            children: (
              <ProTable<PerformRecord>
                cardBordered
                rowKey="id"
                columns={performColumns}
                dataSource={filteredPerforms}
                loading={performQuery.isLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 2080 }}
                toolBarRender={() => [<Button key="refresh" onClick={() => performQuery.refetch()}>刷新状态</Button>, <Button key="manual" type="primary" onClick={() => openCreateModal('perform')}>人工履约纠偏</Button>]}
                onSubmit={(values) => setPerformKeyword(String(values.keyword || ''))}
                onReset={() => setPerformKeyword('')}
              />
            ),
          },
        ]}
      />

      <BusinessDetailModal title="记录详情" open={!!detail} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('writeoffNo' in detail ? fulfillmentDetailFields.writeoff : fulfillmentDetailFields.perform) as DetailField<Record<string, any>>[]}
            column={1}
            labelWidth={120}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="履约补录"
        title={createType === 'writeoff' ? '后台补核销' : '人工履约纠偏'}
        subtitle={createType === 'writeoff' ? '补齐核销对象、订单、用户、门店和结果摘要，形成权益消耗闭环。' : '补齐履约场景、门店点位、设备指令和纠偏结果，形成设备履约闭环。'}
        meta={[createType === 'writeoff' ? '核销记录' : '履约日志', '人工写入']}
        open={!!createType}
        onOk={handleCreateSubmit}
        confirmLoading={createWriteOffMutation.isPending || createPerformMutation.isPending}
        onCancel={() => {
          setCreateType(null);
          createForm.resetFields();
        }}
        width={920}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" className="merchant-editor-form">
          {createType === 'writeoff' ? (
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<PartitionOutlined />} title="核销对象" desc="明确核销单、订单和权益对象，保证用户权益消耗可以追溯到业务来源。">
                <div className="merchant-editor-fields">
                  <Form.Item name="writeoffNo" label="核销单号" rules={[{ required: true, message: '请输入核销单号' }]}><Input placeholder="例如：WO202605100001" /></Form.Item>
                  <Form.Item name="serviceOrderId" label="服务订单"><Select showSearch optionFilterProp="label" options={serviceOrderOptions} placeholder="请选择服务订单" onChange={handleOrderSelect} /></Form.Item>
                  <Form.Item name="serviceOrderNo" label="订单号" rules={[{ required: true, message: '请选择服务订单或输入订单号' }]}><Input placeholder="选择订单后自动回填" /></Form.Item>
                  <Form.Item name="objectType" label="核销对象" rules={[{ required: true, message: '请选择核销对象' }]}><Select options={writeOffObjectTypeOptions} placeholder="选择权益或服务对象" /></Form.Item>
                  <Form.Item name="objectId" label="对象ID"><InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="对象主键，可选" /></Form.Item>
                  <Form.Item name="objectName" label="对象名称" rules={[{ required: true, message: '请输入对象名称' }]}><Input placeholder="例如：单次洗车券 / 会员套餐" /></Form.Item>
                </div>
              </BusinessEditorSection>

              <BusinessEditorSection icon={<AuditOutlined />} title="用户与现场" desc="补齐用户、门店、核销方式和操作人，方便客服、门店和财务对齐。">
                <div className="merchant-editor-fields">
                  <Form.Item name="userId" label="用户ID"><InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="用户主键，可选" /></Form.Item>
                  <Form.Item name="userName" label="用户名称"><Input placeholder="用户昵称、手机号或会员标识" /></Form.Item>
                  <Form.Item name="method" label="核销方式" rules={[{ required: true, message: '请选择核销方式' }]}><Select options={writeOffMethodOptions} placeholder="选择核销方式" /></Form.Item>
                  <Form.Item name="storeId" label="门店"><Select options={storeOptions} allowClear placeholder="选择核销发生门店" onChange={(value) => createForm.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
                  <Form.Item name="operatorName" label="操作人"><Input placeholder="默认后台操作" /></Form.Item>
                  <Form.Item name="amount" label="核销金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="￥" placeholder="本次核销金额" /></Form.Item>
                </div>
              </BusinessEditorSection>

              <BusinessEditorSection icon={<CheckCircleOutlined />} title="核销结果" desc="写入最终状态和结果摘要，作为回滚、结算和售后判断依据。">
                <div className="merchant-editor-fields merchant-editor-fields--two">
                  <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={writeOffStatusOptions} placeholder="选择核销状态" /></Form.Item>
                  <Form.Item name="writeOffReason" label="核销原因" rules={[{ required: true, message: '请选择核销原因' }]}><Select options={writeOffReasonOptions} placeholder="选择核销原因" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="evidences" label="核验依据" rules={[{ required: true, message: '请选择核验依据' }]}><Checkbox.Group options={evidenceOptions} /></Form.Item>
                  <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="resultNote" label="补充说明"><Input placeholder="例如：门店确认用户已完成服务，补齐漏核销记录" /></Form.Item>
                </div>
              </BusinessEditorSection>
            </div>
          ) : (
            <div className="merchant-editor-shell">
              <BusinessEditorSection icon={<PartitionOutlined />} title="履约关系" desc="确认关联订单、履约场景和现场门店点位，保证纠偏记录能回到原始业务。">
                <div className="merchant-editor-fields">
                  <Form.Item name="serviceOrderId" label="服务订单"><Select showSearch optionFilterProp="label" options={serviceOrderOptions} placeholder="请选择服务订单" onChange={handleOrderSelect} /></Form.Item>
                  <Form.Item name="relationNo" label="关联单号" rules={[{ required: true, message: '请输入关联单号' }]}><Input placeholder="选择订单后自动回填，也可输入核销单号或售后单号" /></Form.Item>
                  <Form.Item name="scene" label="履约场景" rules={[{ required: true, message: '请选择履约场景' }]}><Select options={performSceneOptions} placeholder="选择履约场景" /></Form.Item>
                  <Form.Item name="storeId" label="门店"><Select options={storeOptions} allowClear placeholder="选择履约门店" onChange={(value) => createForm.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
                  <Form.Item name="servicePointId" label="服务点位"><Select options={servicePointOptions} allowClear placeholder="选择点位" onChange={(value) => createForm.setFieldValue('pointCode', servicePointOptionMap.get(value))} /></Form.Item>
                </div>
              </BusinessEditorSection>

              <BusinessEditorSection icon={<ToolOutlined />} title="设备指令" desc="补齐设备、指令号和指令状态，用于排查设备控制链路。">
                <div className="merchant-editor-fields">
                  <Form.Item name="deviceId" label="设备"><Select options={deviceOptions} allowClear placeholder="选择执行设备" onChange={(value) => createForm.setFieldValue('deviceCode', deviceOptionMap.get(value))} /></Form.Item>
                  <Form.Item name="commandNo" label="指令号"><Input placeholder="设备控制或回调指令号" /></Form.Item>
                  <Form.Item name="commandStatus" label="指令状态"><Radio.Group options={[{ value: 'MANUAL', label: '人工处理' }, { value: 'SUCCESS', label: '执行成功' }, { value: 'TIMEOUT', label: '执行超时' }, { value: 'FAILED', label: '执行失败' }]} optionType="button" /></Form.Item>
                  <Form.Item name="status" label="履约状态" rules={[{ required: true, message: '请选择履约状态' }]}><Select options={performStatusOptions} placeholder="选择纠偏后的履约状态" /></Form.Item>
                </div>
              </BusinessEditorSection>

              <BusinessEditorSection icon={<FieldTimeOutlined />} title="时间与结论" desc="记录服务起止时间和纠偏说明，作为客服回访和异常复盘依据。">
                <div className="merchant-editor-fields merchant-editor-fields--two">
                  <Form.Item name="startAt" label="开始时间"><DatePicker showTime style={{ width: '100%' }} placeholder="选择开始时间" /></Form.Item>
                  <Form.Item name="finishAt" label="结束时间"><DatePicker showTime style={{ width: '100%' }} placeholder="选择结束时间" /></Form.Item>
                  <Form.Item name="issueType" label="异常类型" rules={[{ required: true, message: '请选择异常类型' }]}><Select options={performIssueOptions} placeholder="选择异常类型" /></Form.Item>
                  <Form.Item name="correctionAction" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}><Select options={correctionActionOptions} placeholder="选择处理动作" /></Form.Item>
                  <Form.Item name="followUp" label="后续跟进"><Select options={followUpOptions} placeholder="选择后续跟进" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="operatorNote" label="补充说明"><Input placeholder="例如：门店确认已人工开机，用户服务已完成" /></Form.Item>
                </div>
              </BusinessEditorSection>
            </div>
          )}
        </Form>
      </BusinessEditorModal>

      <BusinessEditorModal
        eyebrow="履约处理"
        title={actionType === 'writeoff' ? '补核销处理' : '履约异常处理'}
        subtitle="更新核销或履约状态，并将本次处理说明同步写入结果字段。"
        meta={[actionType === 'writeoff' ? '核销状态' : '履约状态', currentId ? `ID ${currentId}` : '待选择']}
        open={actionModalVisible}
        onOk={handleActionSubmit}
        onCancel={() => {
          setActionModalVisible(false);
          setCurrentId(null);
          actionForm.resetFields();
        }}
        width={760}
      >
        <Form form={actionForm} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理结果" desc="选择当前记录的新状态，并写明人工判断和后续动作。">
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <Select options={actionType === 'writeoff' ? writeOffStatusOptions : performStatusOptions} placeholder="选择处理后的状态" />
                </Form.Item>
                {actionType === 'writeoff' ? (
                  <>
                    <Form.Item name="writeOffReason" label="处理原因" rules={[{ required: true, message: '请选择处理原因' }]}><Select options={writeOffReasonOptions} placeholder="选择处理原因" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-2" name="evidences" label="核验依据" rules={[{ required: true, message: '请选择核验依据' }]}><Checkbox.Group options={evidenceOptions} /></Form.Item>
                    <Form.Item name="notifyUser" label="用户通知" valuePropName="checked"><Checkbox>已同步通知用户或客服</Checkbox></Form.Item>
                    <Form.Item className="merchant-editor-field-span-2" name="resultNote" label="补充说明"><Input placeholder="例如：补核销后已同步售后单" /></Form.Item>
                  </>
                ) : (
                  <>
                    <Form.Item name="issueType" label="异常类型" rules={[{ required: true, message: '请选择异常类型' }]}><Select options={performIssueOptions} placeholder="选择异常类型" /></Form.Item>
                    <Form.Item name="correctionAction" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}><Select options={correctionActionOptions} placeholder="选择处理动作" /></Form.Item>
                    <Form.Item name="followUp" label="后续跟进"><Select options={followUpOptions} placeholder="选择后续跟进" /></Form.Item>
                    <Form.Item className="merchant-editor-field-span-2" name="operatorNote" label="补充说明"><Input placeholder="例如：设备重试成功，用户已继续使用" /></Form.Item>
                  </>
                )}
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default FulfillmentManagement;
