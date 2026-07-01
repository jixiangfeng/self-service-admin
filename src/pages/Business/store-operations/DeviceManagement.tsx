import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, DeploymentUnitOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  deviceStatusOptions,
  deviceTypeOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { DeviceFullProfileRecord, DeviceRecord, SelectOptionRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, CoreFlowPanel, formatDateTime, OperatorTips, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { DateField, fromDatePickerValue, toDatePickerValue } from '@/utils/formControls';
import DeviceFullProfileDrawer from './DeviceFullProfileDrawer';

const normalizeDeviceValues = (values: Record<string, any>) => ({ ...values, installTime: fromDatePickerValue(values.installTime) || values.installTime });
const normalizeDeviceInitialValues = (record: DeviceRecord) => ({ ...record, installTime: toDatePickerValue(record.installTime) || record.installTime }) as Record<string, unknown>;

const DeviceManagement: React.FC = () => {
  const navigate = useNavigate();
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
      status: 'OFFLINE',
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
      <PageBanner title="设备管理" subtitle="维护设备台账、门店点位绑定和运行状态。" icon={<DeploymentUnitOutlined />} />
      <WorkflowGuide
        title="设备管理流程"
        summary="主设备页只处理设备资产、门店点位绑定和运行状态；厂商、型号和协议放在接入档案中维护。"
        steps={[
          { title: '设备建档', description: '录设备名称、编号、类型和厂商', status: 'finish', tag: '当前页' },
          { title: '绑定门店点位', description: '决定设备服务于哪个门店和点位', status: 'process', tag: '门店 / 点位' },
          { title: '接入档案', description: '由实施人员维护厂商、型号和协议', status: 'wait', tag: '接入档案' },
          { title: '履约验证', description: '去交易和履约页看设备启动、回执和异常表现', status: 'wait', tag: '交易 / 核销履约' },
        ]}
        actions={[
          {
            key: 'create',
            label: '新建设备',
            type: 'primary',
            onClick: openCreateDrawer,
          },
          { key: 'trade', label: '去交易中心', onClick: () => navigate('/trade') },
        ]}
      />
      <CoreFlowPanel
        title="设备履约闭环"
        subtitle="设备要从资产建档、门店点位绑定、协议接入、状态监控一路串到订单履约，运营才能快速判断故障影响范围。"
        config={[
          { label: '设备主档', desc: '设备编号、类型、厂商和状态用于识别资产与售后责任。', tag: '资产' },
          { label: '门店点位', desc: '绑定门店和点位后，订单才知道从哪个设备执行服务。', tag: '绑定' },
          { label: '接入资料', desc: '型号、协议、指令模板和回调配置放在设备接入管理维护。', tag: '技术' },
        ]}
        landing={[
          { label: '服务订单', desc: '订单记录设备编号、点位和启动结果，异常可反查设备状态。' },
          { label: '故障运维', desc: '故障级别、信号强度和最近心跳用于判断是否现场处理。' },
          { label: '结算影响', desc: '设备不可用会影响门店履约、退款原因和结算复盘。' },
        ]}
        verify={[
          { label: '新建后', desc: '确认设备已绑定门店点位，状态不是停用或离线。' },
          { label: '异常时', desc: '先看最近心跳、故障级别和交易中心的失败订单。' },
          { label: '更换点位', desc: '换绑前确认旧点位没有进行中订单，并保留换绑记录。' },
        ]}
        actions={[
          { key: 'access', label: '设备接入管理', onClick: () => navigate('/device-access') },
          { key: 'trade', label: '去交易中心', type: 'primary', onClick: () => navigate('/trade') },
        ]}
      />
      <OperatorTips
        items={[
          { label: '新建设备', desc: '先选门店，再选点位；选择点位后会自动带出点位编号，减少手工录错。', tag: '建档' },
          { label: '看异常设备', desc: '优先看状态、故障级别、信号强度和最近心跳，判断是否需要现场处理。', tag: '巡检' },
          { label: '维护接入资料', desc: '厂商、型号、协议和鉴权资料在“接入档案”，由实施或技术人员维护。', tag: '接入' },
        ]}
      />
      <Tabs
        items={[
          {
            key: 'device-list',
            label: '设备列表',
            children: (
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
            ),
          },
        ]}
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
        subtitle="主表单只维护设备资产、绑定关系和当前运行状态；厂商型号和协议在设备接入中维护，故障和信号由运行记录自动体现。"
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
                <Form.Item name="status" label="设备状态">
                  <Select options={deviceStatusOptions} placeholder="请选择设备状态" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<DeploymentUnitOutlined />}
              title="设备基础"
              desc="维护设备名称、编号、厂商和安装时间，形成设备资产台账和后续维护追踪依据。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
                  <Input placeholder="例如：A 区 1 号高压水枪" />
                </Form.Item>
                <Form.Item name="deviceCode" label="设备编号" rules={[{ required: true, message: '请输入设备编号' }]}>
                  <Input placeholder="例如：DEV-HP-A01" />
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
