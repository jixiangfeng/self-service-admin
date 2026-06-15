import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { CarOutlined, DeleteOutlined, EditOutlined, PlusOutlined, QrcodeOutlined, ToolOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  pointAbilityOptions,
  pointStatusOptions,
  pointTypeOptions,
  maintainStatusOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, ServicePointRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderBooleanTag, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';
import { DateTimeField, fromDateTimePickerValue, toDateTimePickerValue } from '@/utils/formControls';
import ServicePointProfileManagement from './ServicePointProfileManagement';

const qrStatusOptions = [
  { value: 'NORMAL', label: '正常' },
  { value: 'DISABLED', label: '停用' },
  { value: 'EXPIRED', label: '已过期' },
];
const qrStatusMap = buildValueEnum(qrStatusOptions);

const normalizePointValues = (values: Record<string, any>) => ({
  ...values,
  lastMaintainAt: fromDateTimePickerValue(values.lastMaintainAt) || values.lastMaintainAt,
  temporaryClosedUntil: fromDateTimePickerValue(values.temporaryClosedUntil) || values.temporaryClosedUntil,
});
const normalizePointInitialValues = (record: ServicePointRecord) => ({
  ...record,
  lastMaintainAt: toDateTimePickerValue(record.lastMaintainAt) || record.lastMaintainAt,
  temporaryClosedUntil: toDateTimePickerValue(record.temporaryClosedUntil) || record.temporaryClosedUntil,
}) as Record<string, unknown>;

const ServicePointManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServicePointRecord | null>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    storeId: undefined as number | undefined,
    pointType: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['servicePoints', queryParams],
    queryFn: async () => (await api.servicePoint.page(queryParams)).data,
  });

  const { data: storeOptionsData } = useQuery({
    queryKey: ['storeOptions'],
    queryFn: async () => (await api.store.options()).data,
  });

  const storeOptions = storeOptionsData || [];

  const closeDrawer = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.servicePoint.add(payload),
    onSuccess: () => {
      message.success('点位创建成功');
      queryClient.invalidateQueries({ queryKey: ['servicePoints'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.servicePoint.edit(payload),
    onSuccess: () => {
      message.success('点位更新成功');
      queryClient.invalidateQueries({ queryKey: ['servicePoints'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.servicePoint.remove(id),
    onSuccess: () => {
      message.success('点位删除成功');
      queryClient.invalidateQueries({ queryKey: ['servicePoints'] });
    },
  });

  const columns = useMemo<ProColumns<ServicePointRecord>[]>(
    () => [
      { title: '点位编号', dataIndex: 'pointCode', width: 140, hideInSearch: true },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '点位编号 / 名称 / 能力标签' } },
      {
        title: '所属门店',
        dataIndex: 'storeId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(storeOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.storeName || '-',
      },
      { title: '点位名称', dataIndex: 'pointName', width: 160, search: false, render: (_, record) => record.pointName || '-' },
      {
        title: '点位类型',
        dataIndex: 'pointType',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(pointTypeOptions),
        render: (_, record) => renderStatusTag(record.pointType, buildValueEnum(pointTypeOptions) as any),
      },
      { title: '能力标签', dataIndex: 'abilityTags', width: 240, search: false, render: (_, record) => renderOptionTags(record.abilityTags, pointAbilityOptions) },
      { title: '二维码', dataIndex: 'qrCode', width: 160, search: false, render: (_, record) => record.qrCode || '-' },
      { title: '二维码状态', dataIndex: 'qrStatus', width: 120, search: false, render: (_, record) => renderStatusTag(record.qrStatus, qrStatusMap) },
      { title: '设备数', dataIndex: 'deviceCount', width: 90, search: false, render: (_, record) => record.deviceCount ?? 0 },
      { title: '绑定设备', dataIndex: 'bindDeviceCodes', width: 180, search: false, render: (_, record) => record.bindDeviceCodes || '-' },
      { title: '维护状态', dataIndex: 'maintainStatus', width: 120, search: false, render: (_, record) => renderStatusTag(record.maintainStatus, buildValueEnum(maintainStatusOptions) as any) },
      { title: '排队提示', dataIndex: 'queueEnabled', width: 100, search: false, render: (_, record) => renderBooleanTag(record.queueEnabled, '开启', '关闭') },
      { title: '排序', dataIndex: 'sortNo', width: 100, search: false, render: (_, record) => record.sortNo ?? 0 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: buildValueEnum(pointStatusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(pointStatusOptions) as any),
      },
      { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt || record.updateTime) },
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
                  ...normalizePointInitialValues(record),
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
                showBusinessConfirm({
                  title: '确认删除点位',
                  content: `确定删除点位「${record.pointCode}」吗？`,
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
      <PageBanner title="点位管理" subtitle="管理点位档案、二维码、能力标签和运行状态。" icon={<CarOutlined />} />
      <WorkflowGuide
        title="点位投放闭环"
        summary="点位页需要承接门店、二维码、能力标签和设备绑定，最终让扫码下单和选点位下单形成闭环。"
        steps={[
          { title: '定义点位', description: '给门店创建点位编号、名称和类型', status: 'finish', tag: '当前页' },
          { title: '生成二维码', description: '把扫码入口和点位一一绑定', status: 'process', tag: '二维码标识' },
          { title: '绑定设备', description: '确定点位承载哪些设备能力', status: 'process', tag: '下一步：设备管理' },
          { title: '进入交易', description: '到交易中心验证扫码 / 选点位下单体验', status: 'wait', tag: '交易中心' },
        ]}
        actions={[
          {
            key: 'create',
            label: '新建点位',
            type: 'primary',
            onClick: () => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({
                pointType: 'CAR_WASH_BAY',
                status: 'IDLE',
                sortNo: 0,
                capacity: 1,
                queueEnabled: 1,
                abilityTags: ['SCAN', 'POINT_SELECT'],
              });
              setModalVisible(true);
            },
          },
          { key: 'device', label: '去设备管理', onClick: () => navigate('/device') },
        ]}
      />
      <Tabs
        items={[
          {
            key: 'point-list',
            label: '点位列表',
            children: (
              <ProTable<ServicePointRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1760 }}
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
                pointType: 'CAR_WASH_BAY',
                status: 'IDLE',
                sortNo: 0,
                capacity: 1,
                queueEnabled: 1,
                abilityTags: ['SCAN', 'POINT_SELECT'],
              });
              setModalVisible(true);
            }}
          >
            新建点位
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams({
            pageNum: 1,
            pageSize: queryParams.pageSize,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            storeId: typeof values.storeId === 'number' ? values.storeId : undefined,
            pointType: typeof values.pointType === 'string' ? values.pointType : undefined,
            status: typeof values.status === 'string' ? values.status : undefined,
          });
        }}
        onReset={() => {
          setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, storeId: undefined, pointType: undefined, status: undefined });
        }}
      />
            ),
          },
          { key: 'point-profile', label: '档案维护', children: <ServicePointProfileManagement embedded /> },
        ]}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '点位档案维护' : '点位投放配置'}
        title={editingRecord ? `编辑点位 · ${editingRecord.pointCode}` : '新建点位'}
        subtitle="点位承接扫码入口、设备绑定、排队提示和维护状态，配置完整后才能支撑用户选点位下单。"
        meta={['点位闭环', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        width={1120}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingRecord ? '保存变更' : '创建点位'}
        forceRender
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            const payload = {
              ...normalizePointValues(values),
              abilityTags: joinCommaValues(values.abilityTags),
            };
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...payload });
              return;
            }
            createMutation.mutate(payload);
          }}
        >
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<CarOutlined />}
              title="点位基础"
              desc="把点位绑定到具体门店，并明确工位编码、名称、类型和现场位置，方便扫码、导航和设备绑定。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}>
                  <Select showSearch optionFilterProp="label" options={storeOptions as SelectOptionRecord[]} placeholder="请选择门店" />
                </Form.Item>
                <Form.Item name="pointCode" label="点位编号" rules={[{ required: true, message: '请输入点位编号' }]}>
                  <Input placeholder="例如：BAY-A-01" />
                </Form.Item>
                <Form.Item name="pointName" label="点位名称">
                  <Input placeholder="例如：A 区 1 号洗车位" />
                </Form.Item>
                <Form.Item name="pointType" label="点位类型" rules={[{ required: true, message: '请选择点位类型' }]}>
                  <Select options={pointTypeOptions} placeholder="请选择点位类型" />
                </Form.Item>
                <Form.Item name="locationDesc" label="点位位置描述">
                  <Input placeholder="例如：B 区 03 号工位，靠近出口" />
                </Form.Item>
                <Form.Item name="capacity" label="可同时服务车辆数">
                  <Input type="number" placeholder="例如：1" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<QrcodeOutlined />}
              title="扫码与投放"
              desc="配置二维码标识、二维码状态、能力标签和排序，决定小程序扫码或选点位时是否可见可用。"
            >
              <div className="merchant-editor-fields">
                <Form.Item name="qrCode" label="二维码标识">
                  <Input placeholder="例如：QR-BAY-A-01" />
                </Form.Item>
                <Form.Item name="qrStatus" label="二维码状态">
                  <Select options={qrStatusOptions} placeholder="请选择二维码状态" />
                </Form.Item>
                <Form.Item name="sortNo" label="排序">
                  <Input type="number" placeholder="数字越小越靠前" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="abilityTags" label="能力标签">
                  <Select mode="multiple" options={pointAbilityOptions} placeholder="选择点位能力" />
                </Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection
              icon={<ToolOutlined />}
              title="设备与运营状态"
              desc="维护绑定设备、排队策略、维护状态和临时关闭信息，形成点位从投放到运维的完整闭环。"
            >
              <div className="merchant-editor-fields">
                <Form.Item className="merchant-editor-field-span-all" name="bindDeviceCodes" label="绑定设备编号">
                  <Input placeholder="多个设备编号可用逗号分隔，例如 DEV-HP-001, DEV-FOAM-002" />
                </Form.Item>
                <Form.Item name="maintainStatus" label="维护状态">
                  <Select options={maintainStatusOptions} placeholder="请选择维护状态" />
                </Form.Item>
                <Form.Item name="lastMaintainAt" label="最近维护时间">
                  <DateTimeField />
                </Form.Item>
                <Form.Item name="status" label="点位状态">
                  <Select options={pointStatusOptions} placeholder="请选择点位状态" />
                </Form.Item>
                <Form.Item name="queueEnabled" label="是否开启排队提示">
                  <Select options={statusOptions.map((item) => ({ value: item.value, label: item.value === 1 ? '开启' : '关闭' }))} placeholder="请选择排队提示状态" />
                </Form.Item>
                <Form.Item name="queueRule" label="排队规则">
                  <Input placeholder="例如：最多排队 3 人，超时 10 分钟释放" />
                </Form.Item>
                <Form.Item name="temporaryClosedUntil" label="临时关闭截止时间">
                  <DateTimeField />
                </Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ServicePointManagement;
