import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, DeploymentUnitOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, message } from 'antd';
import {
  deviceStatusOptions,
  deviceTypeOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { DeviceFullProfileRecord, DeviceRecord, SelectOptionRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import { DateField, fromDatePickerValue, toDatePickerValue } from '@/utils/formControls';
import DeviceFullProfileDrawer from './DeviceFullProfileDrawer';

const normalizeDeviceValues = (values: Record<string, any>) => ({ ...values, installTime: fromDatePickerValue(values.installTime) || values.installTime });
const normalizeDeviceInitialValues = (record: DeviceRecord) => ({ ...record, installTime: toDatePickerValue(record.installTime) || record.installTime }) as Record<string, unknown>;

const DeviceManagement: React.FC = () => {
  const [form] = Form.useForm();
  const selectedStoreId = Form.useWatch('storeId', form);
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fullProfile, setFullProfile] = useState<DeviceFullProfileRecord | undefined>();
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

  const pointOptionsQuery = useQuery({
    queryKey: ['devicePointOptions', selectedStoreId],
    queryFn: async () => (await api.servicePoint.options(selectedStoreId)).data,
    enabled: selectedStoreId !== undefined && selectedStoreId !== null,
  });

  const storeOptions = storeOptionsData || [];
  const pointOptions = pointOptionsQuery.data || [];
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item])), [storeOptions]);
  const pointOptionMap = useMemo(() => new Map(pointOptions.map((item) => [item.value, item])), [pointOptions]);

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

  const openCreateDrawer = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      deviceType: 'CAR_WASH_HIGH_PRESSURE',
    });
    setModalVisible(true);
  };

  const openFullProfile = React.useCallback(async (record: DeviceRecord) => {
    setProfileVisible(true);
    setProfileLoading(true);
    try {
      const res = await api.device.fullProfile(record.id);
      setFullProfile(res.data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

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
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>{record.vendorName || '未配置厂商'}</div>
          </div>
        ),
      },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '设备名称 / 平台编号 / 第三方编号 / 厂商' } },
      {
        title: '所属门店',
        dataIndex: 'storeId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(storeOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.storeName || '-',
      },
      { title: '点位编号', dataIndex: 'pointCode', width: 120, search: false, render: (_, record) => record.pointCode || '-' },
      { title: '平台设备编号', dataIndex: 'deviceCode', width: 150, search: false },
      { title: '第三方设备编号', dataIndex: 'gatewayDeviceCode', width: 170, search: false },
      {
        title: '设备类型',
        dataIndex: 'deviceType',
        width: 160,
        valueType: 'select',
        valueEnum: buildValueEnum(deviceTypeOptions),
        render: (_, record) => renderStatusTag(record.deviceType, buildValueEnum(deviceTypeOptions) as any),
      },
      { title: '最近心跳', dataIndex: 'lastHeartbeatAt', width: 180, search: false, render: (_, record) => formatDateTime(record.lastHeartbeatAt) },
      {
        title: '运行状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: buildValueEnum(deviceStatusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(deviceStatusOptions) as any),
      },
      {
        title: '操作',
        width: 210,
        search: false,
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openFullProfile(record)}>
              详情
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                form.setFieldsValue(normalizeDeviceInitialValues(record));
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
                showBusinessConfirm({
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
    [deleteMutation, form, openFullProfile, storeOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="设备管理" subtitle="维护设备台账和门店点位绑定；运行状态由设备心跳、回调和订单自动判断。" icon={<DeploymentUnitOutlined />} />
      <ProTable<DeviceRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1500 }}
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
            onClick={openCreateDrawer}
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

      <DeviceFullProfileDrawer
        open={profileVisible}
        loading={profileLoading}
        profile={fullProfile}
        onClose={() => {
          setProfileVisible(false);
          setFullProfile(undefined);
        }}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '设备台账维护' : '设备台账建档'}
        title={editingRecord ? `编辑设备 · ${editingRecord.deviceName}` : '新建设备'}
        subtitle="主表单只维护设备资产和绑定关系；运行状态由设备侧心跳、回调和订单履约自动体现。"
        meta={['设备台账', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        width={1180}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingRecord ? '保存变更' : '创建设备'}
        forceRender
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            const payload = normalizeDeviceValues(values);
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...payload });
              return;
            }
            createMutation.mutate(payload);
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<LinkOutlined />}
              title="绑定关系"
              desc="先把设备绑定到门店和点位，确保设备状态、履约启动和售后排查都能回到具体现场。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions as SelectOptionRecord[]}
                    placeholder="请选择门店"
                    onChange={(value) => {
                      const store = storeOptionMap.get(value);
                      form.setFieldsValue({ storeName: store?.label, servicePointId: undefined, pointCode: undefined });
                    }}
                  />
                </Form.Item>
                <Form.Item name="servicePointId" label="所属点位" rules={[{ required: true, message: '请选择点位' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    disabled={!selectedStoreId}
                    loading={pointOptionsQuery.isLoading}
                    options={pointOptions as SelectOptionRecord[]}
                    placeholder={selectedStoreId ? '请选择点位' : '请先选择门店'}
                    onChange={(value) => {
                      const point = pointOptionMap.get(value);
                      form.setFieldValue('pointCode', point?.label);
                    }}
                  />
                </Form.Item>
                <Form.Item name="storeName" hidden><Input /></Form.Item>
                <Form.Item name="pointCode" hidden><Input /></Form.Item>
                <Form.Item name="deviceType" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
                  <Select options={deviceTypeOptions} placeholder="请选择设备类型" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<DeploymentUnitOutlined />}
              title="设备基础"
              desc="平台设备编号由系统生成；第三方设备编号填写设备厂商或网关提供的唯一编号。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
                  <Input placeholder="例如：A 区 1 号高压水枪" />
                </Form.Item>
                {editingRecord ? (
                  <Form.Item name="deviceCode" label="平台设备编号">
                    <Input readOnly placeholder="平台自动生成，不可编辑" />
                  </Form.Item>
                ) : null}
                <Form.Item
                  name="gatewayDeviceCode"
                  label="第三方设备编号"
                  rules={[
                    { required: true, message: '请输入第三方设备编号' },
                    { whitespace: true, message: '请输入第三方设备编号' },
                  ]}
                >
                  <Input placeholder="请输入设备铭牌、厂商平台或网关中的设备编号" />
                </Form.Item>
                <Form.Item name="vendorName" label="厂商名称">
                  <Input placeholder="设备供应商或集成商名称" />
                </Form.Item>
                <Form.Item name="installTime" label="安装时间">
                  <DateField />
                </Form.Item>
              </div>
            </BusinessEditorSection>

          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default DeviceManagement;
