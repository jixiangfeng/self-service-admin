import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
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
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import api from '@/services/backendService';
import type { SelectOptionRecord } from '@/services/backendService';
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
  const [actionForm] = Form.useForm<{ status: string; remark: string }>();
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
  const storeOptions = (storeOptionsQuery.data || []) as SelectOptionRecord[];
  const servicePointOptions = (servicePointOptionsQuery.data || []) as SelectOptionRecord[];
  const deviceOptions = (deviceOptionsQuery.data || []) as SelectOptionRecord[];
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
              actionForm.setFieldsValue({ status: record.status, remark: record.result });
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
              actionForm.setFieldsValue({ status: record.status, remark: record.remark });
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
      await updateWriteOffMutation.mutateAsync({ id: currentId, status: values.status, remark: values.remark });
    } else {
      await updatePerformMutation.mutateAsync({ id: currentId, status: values.status, remark: values.remark });
    }

    setActionModalVisible(false);
    setCurrentId(null);
    actionForm.resetFields();
  };

  const openCreateModal = (type: 'writeoff' | 'perform') => {
    setCreateType(type);
    createForm.resetFields();
    createForm.setFieldsValue(type === 'writeoff'
      ? { objectType: 'SERVICE', method: 'BACKEND', result: '后台补核销', status: 'SUCCESS' }
      : { scene: 'ORDER', commandStatus: 'MANUAL', status: 'FINISHED', remark: '人工履约纠偏' });
  };

  const handleCreateSubmit = async () => {
    const values = await createForm.validateFields();
    if (createType === 'writeoff') {
      await createWriteOffMutation.mutateAsync({
        ...values,
        storeName: values.storeName || storeOptionMap.get(values.storeId),
        operatorName: values.operatorName || '后台操作',
      });
    }
    if (createType === 'perform') {
      await createPerformMutation.mutateAsync({
        ...values,
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
                toolBarRender={() => [<Button key="rollback" onClick={() => updateWriteOffMutation.mutate({ id: filteredWriteOffs[0]?.id, status: 'ROLLED_BACK', remark: '批量异常回滚' })} disabled={!filteredWriteOffs.length}>异常回滚</Button>, <Button key="supplement" type="primary" onClick={() => openCreateModal('writeoff')}>后台补核销</Button>]}
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

      <Modal title="记录详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('writeoffNo' in detail ? fulfillmentDetailFields.writeoff : fulfillmentDetailFields.perform) as DetailField<Record<string, any>>[]}
            column={1}
            labelWidth={120}
          />
        ) : null}
      </Modal>

      <Modal
        title={createType === 'writeoff' ? '后台补核销' : '人工履约纠偏'}
        open={!!createType}
        onOk={handleCreateSubmit}
        confirmLoading={createWriteOffMutation.isPending || createPerformMutation.isPending}
        onCancel={() => {
          setCreateType(null);
          createForm.resetFields();
        }}
        width={860}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          {createType === 'writeoff' ? (
            <div className="modal-grid">
              <Form.Item name="writeoffNo" label="核销单号" rules={[{ required: true, message: '请输入核销单号' }]}><Input /></Form.Item>
              <Form.Item name="serviceOrderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input /></Form.Item>
              <Form.Item name="serviceOrderId" label="订单ID"><Input type="number" /></Form.Item>
              <Form.Item name="objectType" label="核销对象" rules={[{ required: true, message: '请选择核销对象' }]}><Select options={writeOffObjectTypeOptions} /></Form.Item>
              <Form.Item name="objectId" label="对象ID"><Input type="number" /></Form.Item>
              <Form.Item name="objectName" label="对象名称" rules={[{ required: true, message: '请输入对象名称' }]}><Input /></Form.Item>
              <Form.Item name="userId" label="用户ID"><Input type="number" /></Form.Item>
              <Form.Item name="userName" label="用户名称"><Input /></Form.Item>
              <Form.Item name="method" label="核销方式" rules={[{ required: true, message: '请选择核销方式' }]}><Select options={writeOffMethodOptions} /></Form.Item>
              <Form.Item name="storeId" label="门店"><Select options={storeOptions} allowClear onChange={(value) => createForm.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
              <Form.Item name="operatorName" label="操作人"><Input /></Form.Item>
              <Form.Item name="amount" label="核销金额"><Input type="number" /></Form.Item>
              <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={writeOffStatusOptions} /></Form.Item>
              <Form.Item className="modal-span-2" name="result" label="结果摘要" rules={[{ required: true, message: '请输入结果摘要' }]}><Input.TextArea rows={3} /></Form.Item>
            </div>
          ) : (
            <div className="modal-grid">
              <Form.Item name="relationNo" label="关联单号" rules={[{ required: true, message: '请输入关联单号' }]}><Input /></Form.Item>
              <Form.Item name="scene" label="履约场景" rules={[{ required: true, message: '请选择履约场景' }]}><Select options={performSceneOptions} /></Form.Item>
              <Form.Item name="storeId" label="门店"><Select options={storeOptions} allowClear onChange={(value) => createForm.setFieldValue('storeName', storeOptionMap.get(value))} /></Form.Item>
              <Form.Item name="servicePointId" label="服务点位"><Select options={servicePointOptions} allowClear onChange={(value) => createForm.setFieldValue('pointCode', servicePointOptionMap.get(value))} /></Form.Item>
              <Form.Item name="deviceId" label="设备"><Select options={deviceOptions} allowClear onChange={(value) => createForm.setFieldValue('deviceCode', deviceOptionMap.get(value))} /></Form.Item>
              <Form.Item name="commandNo" label="指令号"><Input /></Form.Item>
              <Form.Item name="commandStatus" label="指令状态"><Input /></Form.Item>
              <Form.Item name="status" label="履约状态" rules={[{ required: true, message: '请选择履约状态' }]}><Select options={performStatusOptions} /></Form.Item>
              <Form.Item name="startAt" label="开始时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
              <Form.Item name="finishAt" label="结束时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
              <Form.Item className="modal-span-2" name="remark" label="纠偏说明" rules={[{ required: true, message: '请输入纠偏说明' }]}><Input.TextArea rows={3} /></Form.Item>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title={actionType === 'writeoff' ? '补核销处理' : '履约异常处理'}
        open={actionModalVisible}
        onOk={handleActionSubmit}
        onCancel={() => {
          setActionModalVisible(false);
          setCurrentId(null);
          actionForm.resetFields();
        }}
        width={760}
      >
        <Form form={actionForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={actionType === 'writeoff' ? writeOffStatusOptions : performStatusOptions} />
            </Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="remark" label="处理说明" rules={[{ required: true, message: '请输入处理说明' }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FulfillmentManagement;
