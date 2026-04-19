import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, DeploymentUnitOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Modal, Select, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  deviceControlModeOptions,
  deviceFaultLevelOptions,
  deviceStatusOptions,
  deviceTypeOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { DeviceRecord, SelectOptionRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';

const DeviceManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const selectedStoreId = Form.useWatch('storeId', form);
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DeviceRecord | null>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    storeId: undefined as number | undefined,
    deviceType: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['devices', queryParams],
    queryFn: async () => (await api.device.page(queryParams)).data,
  });

  const { data: storeOptionsData } = useQuery({
    queryKey: ['deviceStoreOptions'],
    queryFn: async () => (await api.store.options()).data,
  });

  const { data: pointOptionsData } = useQuery({
    queryKey: ['devicePointOptions', selectedStoreId],
    queryFn: async () => (await api.servicePoint.options(selectedStoreId)).data,
    enabled: !!selectedStoreId,
  });

  const storeOptions = storeOptionsData || [];
  const pointOptions = pointOptionsData || [];

  const closeDrawer = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.device.add(payload),
    onSuccess: () => {
      message.success('设备创建成功');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.device.edit(payload),
    onSuccess: () => {
      message.success('设备更新成功');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.device.remove(id),
    onSuccess: () => {
      message.success('设备删除成功');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const columns = useMemo<ProColumns<DeviceRecord>[]>(
    () => [
      {
        title: '设备名称',
        dataIndex: 'deviceName',
        width: 220,
        hideInSearch: true,
        render: (_, record) => (
          <div>
            <div>{record.deviceName}</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>{record.protocolType || '未配置协议'} / {record.protocolVersion || 'v1.0'}</div>
          </div>
        ),
      },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '设备名称 / 编号 / 厂商' } },
      {
        title: '所属门店',
        dataIndex: 'storeId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(storeOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.storeName || '-',
      },
      { title: '点位编号', dataIndex: 'pointCode', width: 120, search: false, render: (_, record) => record.pointCode || '-' },
      { title: '设备编号', dataIndex: 'deviceCode', width: 140, search: false },
      {
        title: '设备类型',
        dataIndex: 'deviceType',
        width: 160,
        valueType: 'select',
        valueEnum: buildValueEnum(deviceTypeOptions),
        render: (_, record) => renderStatusTag(record.deviceType, buildValueEnum(deviceTypeOptions) as any),
      },
      { title: '厂商', dataIndex: 'vendorName', width: 120, search: false, render: (_, record) => record.vendorName || '-' },
      { title: '协议', dataIndex: 'protocolType', width: 120, search: false, render: (_, record) => record.protocolType || '-' },
      { title: '控制方式', dataIndex: 'controlMode', width: 120, search: false, render: (_, record) => renderStatusTag(record.controlMode, buildValueEnum(deviceControlModeOptions) as any) },
      { title: '能力标签', dataIndex: 'abilityTags', width: 220, search: false, render: (_, record) => renderOptionTags(record.abilityTags) },
      { title: '故障级别', dataIndex: 'faultLevel', width: 120, search: false, render: (_, record) => renderStatusTag(record.faultLevel, buildValueEnum(deviceFaultLevelOptions) as any) },
      { title: '信号强度', dataIndex: 'signalStrength', width: 100, search: false, render: (_, record) => (record.signalStrength != null ? `${record.signalStrength}%` : '-') },
      { title: '最近心跳', dataIndex: 'lastHeartbeatAt', width: 180, search: false, render: (_, record) => formatDateTime(record.lastHeartbeatAt) },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: buildValueEnum(deviceStatusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(deviceStatusOptions) as any),
      },
      {
        title: '操作',
        width: 160,
        search: false,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                form.setFieldsValue({
                  ...record,
                  abilityTags: splitCommaValues(record.abilityTags),
                });
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除设备',
                  content: `确定删除设备「${record.deviceName}」吗？`,
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deleteMutation, form, storeOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="设备管理" subtitle="管理设备台账、接入参数、门店点位绑定和运行状态。" icon={<DeploymentUnitOutlined />} />
      <WorkflowGuide
        title="设备接入闭环"
        summary="设备页要承接设备台账、点位绑定、协议参数和运行状态，最终回到交易与履约验证设备是否真正可用。"
        steps={[
          { title: '设备建档', description: '录设备名称、编号、类型和厂商协议', status: 'finish', tag: '当前页' },
          { title: '绑定门店点位', description: '决定设备服务于哪个门店和点位', status: 'process', tag: '门店 / 点位' },
          { title: '能力投放', description: '配置能力标签、在线状态和维护策略', status: 'process', tag: '运行状态' },
          { title: '履约验证', description: '去交易和履约页看设备启动、回执和异常表现', status: 'wait', tag: '交易 / 核销履约' },
        ]}
        actions={[
          {
            key: 'create',
            label: '新建设备',
            type: 'primary',
            onClick: () => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({
                status: 'OFFLINE',
                deviceType: 'CAR_WASH_HIGH_PRESSURE',
                controlMode: 'REMOTE',
                faultLevel: 'LOW',
                signalStrength: 80,
                abilityTags: ['START_STOP', 'HEARTBEAT'],
              });
              setModalVisible(true);
            },
          },
          { key: 'trade', label: '去交易中心', onClick: () => navigate('/trade') },
        ]}
      />
      <ProTable<DeviceRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 2100 }}
        pagination={{
          current: data?.current || queryParams.pageNum,
          pageSize: data?.size || queryParams.pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({
                status: 'OFFLINE',
                deviceType: 'CAR_WASH_HIGH_PRESSURE',
                controlMode: 'REMOTE',
                faultLevel: 'LOW',
                signalStrength: 80,
                abilityTags: ['START_STOP', 'HEARTBEAT'],
              });
              setModalVisible(true);
            }}
          >
            新建设备
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams({
            pageNum: 1,
            pageSize: queryParams.pageSize,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            storeId: typeof values.storeId === 'number' ? values.storeId : undefined,
            deviceType: typeof values.deviceType === 'string' ? values.deviceType : undefined,
            status: typeof values.status === 'string' ? values.status : undefined,
          });
        }}
        onReset={() => {
          setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, storeId: undefined, deviceType: undefined, status: undefined });
        }}
      />

      <Modal
        title={editingRecord ? `编辑设备 · ${editingRecord.deviceName}` : '新建设备'}
        open={modalVisible}
        width={980}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="保存设备"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={(values) => {
            const payload = {
              ...values,
              abilityTags: joinCommaValues(values.abilityTags),
            };
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...payload });
              return;
            }
            createMutation.mutate(payload);
          }}
        >
          <div className="modal-grid">
            <Divider className="modal-span-2" orientation="left">设备基础信息</Divider>
            <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}>
              <Select options={storeOptions as SelectOptionRecord[]} />
            </Form.Item>
            <Form.Item name="servicePointId" label="所属点位">
              <Select options={pointOptions as SelectOptionRecord[]} allowClear />
            </Form.Item>
            <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="deviceCode" label="设备编号" rules={[{ required: true, message: '请输入设备编号' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="deviceType" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
              <Select options={deviceTypeOptions} />
            </Form.Item>
            <Divider className="modal-span-2" orientation="left">厂商与接入协议</Divider>
            <Form.Item name="vendorName" label="厂商名称">
              <Input />
            </Form.Item>
            <Form.Item name="protocolType" label="协议类型">
              <Input />
            </Form.Item>
            <Form.Item name="protocolVersion" label="协议版本">
              <Input />
            </Form.Item>
            <Form.Item name="controlMode" label="控制方式">
              <Select options={deviceControlModeOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="abilityTags" label="能力标签">
              <Select mode="tags" placeholder="输入 START_STOP / HEARTBEAT 等能力标签" />
            </Form.Item>
            <Divider className="modal-span-2" orientation="left">运行状态</Divider>
            <Form.Item name="faultLevel" label="故障级别">
              <Select options={deviceFaultLevelOptions} />
            </Form.Item>
            <Form.Item name="signalStrength" label="信号强度（%）">
              <Input type="number" />
            </Form.Item>
            <Form.Item name="installTime" label="安装时间">
              <Input placeholder="例如 2026-02-12" />
            </Form.Item>
            <Form.Item name="status" label="设备状态">
              <Select options={deviceStatusOptions} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagement;
