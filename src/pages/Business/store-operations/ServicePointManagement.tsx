import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { CarOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Select, Space, Tabs, message } from 'antd';
import {
  pointAbilityOptions,
  pointStatusOptions,
  pointTypeOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, ServicePointRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';
import ServicePointProfileManagement from './ServicePointProfileManagement';

const defaultPointInitialValues = {
  pointType: 'CAR_WASH_BAY',
  status: 'ENABLED',
  sortNo: 0,
  capacity: 1,
  abilityTags: ['SCAN', 'POINT_SELECT'],
};

const normalizePointInitialValues = (record: ServicePointRecord) =>
  ({
    storeId: record.storeId,
    storeName: record.storeName,
    pointCode: record.pointCode,
    pointName: record.pointName,
    pointType: record.pointType,
    locationDesc: record.locationDesc,
    capacity: record.capacity,
    abilityTags: splitCommaValues(record.abilityTags),
    sortNo: record.sortNo,
    status: record.status,
  }) as Record<string, unknown>;

const ServicePointManagement: React.FC = () => {
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

  const storeOptions = useMemo(() => storeOptionsData || [], [storeOptionsData]);
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item])), [storeOptions]);
  const pointTypeValueEnum = useMemo(() => buildValueEnum(pointTypeOptions), []);
  const pointStatusValueEnum = useMemo(() => buildValueEnum(pointStatusOptions), []);

  useEffect(() => {
    if (!modalVisible || !editingRecord || !storeOptions.length) {
      return;
    }
    const currentStoreId = form.getFieldValue('storeId');
    if (currentStoreId === undefined || currentStoreId === null) {
      form.setFieldValue('storeId', editingRecord.storeId);
    }
  }, [editingRecord, form, modalVisible, storeOptions]);

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
        valueEnum: pointTypeValueEnum,
        render: (_, record) => renderStatusTag(record.pointType, pointTypeValueEnum),
      },
      { title: '能力标签', dataIndex: 'abilityTags', width: 240, search: false, render: (_, record) => renderOptionTags(record.abilityTags, pointAbilityOptions) },
      { title: '排序', dataIndex: 'sortNo', width: 100, search: false, render: (_, record) => record.sortNo ?? 0 },
      {
        title: '工位状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: pointStatusValueEnum,
        render: (_, record) => renderStatusTag(record.status, pointStatusValueEnum),
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
                form.setFieldsValue(normalizePointInitialValues(record));
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
    [deleteMutation, form, pointStatusValueEnum, pointTypeValueEnum, storeOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="点位管理" subtitle="维护点位基础档案。二维码在档案维护中处理，运行状态统一在设备管理中维护。" icon={<CarOutlined />} />
      <WorkflowGuide
        title="点位建档闭环"
        summary="主表单只创建点位基础资料；二维码进入档案维护，设备运行状态在设备管理中统一处理。"
        steps={[
          { title: '定义点位', description: '给门店创建点位编号、名称和类型', status: 'finish', tag: '当前页' },
          { title: '配置能力', description: '标记点位支持扫码、选位或夜间价格等能力', status: 'process', tag: '基础能力' },
          { title: '维护档案', description: '二维码在档案维护里生成和预览', status: 'wait', tag: '档案维护' },
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
              form.setFieldsValue(defaultPointInitialValues);
              setModalVisible(true);
            },
          },
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
        scroll={{ x: 1180 }}
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
              form.setFieldsValue(defaultPointInitialValues);
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
        subtitle="主表单只维护点位基础档案；运行状态统一在设备管理中处理。"
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
            const rawPayload = {
              ...values,
              abilityTags: joinCommaValues(values.abilityTags),
            };
            const payload = editingRecord ? rawPayload : Object.fromEntries(Object.entries(rawPayload).filter(([key]) => key !== 'pointCode'));
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
              desc="把点位绑定到具体门店，并明确工位名称、类型和现场位置；点位编号由后台自动生成。二维码在档案维护中补齐。"
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
                      form.setFieldValue('storeName', store?.label);
                    }}
                  />
                </Form.Item>
                <Form.Item name="storeName" hidden><Input /></Form.Item>
                {editingRecord ? (
                  <Form.Item name="pointCode" label="点位编号">
                    <Input disabled placeholder="点位编号不可编辑" />
                  </Form.Item>
                ) : null}
                <Form.Item name="pointName" label="点位名称" rules={[{ required: true, message: '请输入点位名称' }]}>
                  <Input placeholder="例如：A 区 1 号洗车位" />
                </Form.Item>
                <Form.Item name="pointType" label="点位类型" rules={[{ required: true, message: '请选择点位类型' }]}>
                  <Select options={pointTypeOptions} placeholder="请选择点位类型" />
                </Form.Item>
                <Form.Item name="locationDesc" label="点位位置描述">
                  <Input placeholder="例如：B 区 03 号工位，靠近出口" />
                </Form.Item>
                <Form.Item name="capacity" label="可同时服务车辆数">
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如：1" />
                </Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="abilityTags" label="能力标签">
                  <Select mode="multiple" options={pointAbilityOptions} placeholder="选择点位能力" />
                </Form.Item>
                <Form.Item name="sortNo" label="排序">
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
                </Form.Item>
                <Form.Item name="status" label="工位状态">
                  <Select options={pointStatusOptions} placeholder="请选择工位状态" />
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
