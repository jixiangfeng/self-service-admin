import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { CarOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Modal, Select, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  pointAbilityOptions,
  pointStatusOptions,
  pointTypeOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, ServicePointRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderBooleanTag, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';

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
      { title: '设备数', dataIndex: 'deviceCount', width: 90, search: false, render: (_, record) => record.deviceCount ?? 0 },
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
      { title: '更新时间', dataIndex: 'updateTime', width: 180, search: false, render: (_, record) => formatDateTime(record.updateTime) },
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

      <Modal
        title={editingRecord ? `编辑点位 · ${editingRecord.pointCode}` : '新建点位'}
        open={modalVisible}
        width={900}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="保存点位"
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
            <Divider className="modal-span-2" orientation="left">点位基础信息</Divider>
            <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择所属门店' }]}>
              <Select options={storeOptions as SelectOptionRecord[]} />
            </Form.Item>
            <Form.Item name="pointCode" label="点位编号" rules={[{ required: true, message: '请输入点位编号' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="pointName" label="点位名称">
              <Input />
            </Form.Item>
            <Form.Item name="pointType" label="点位类型" rules={[{ required: true, message: '请选择点位类型' }]}>
              <Select options={pointTypeOptions} />
            </Form.Item>
            <Divider className="modal-span-2" orientation="left">能力与投放</Divider>
            <Form.Item className="modal-span-2" name="abilityTags" label="能力标签">
              <Select mode="multiple" options={pointAbilityOptions} placeholder="选择点位能力" />
            </Form.Item>
            <Form.Item name="qrCode" label="二维码标识">
              <Input />
            </Form.Item>
            <Form.Item name="capacity" label="可同时服务车辆数">
              <Input type="number" />
            </Form.Item>
            <Form.Item name="queueEnabled" label="是否开启排队提示">
              <Select options={statusOptions.map((item) => ({ value: item.value, label: item.value === 1 ? '开启' : '关闭' }))} />
            </Form.Item>
            <Form.Item name="temporaryClosedUntil" label="临时关闭截止时间">
              <Input placeholder="例如 2026-04-18 20:00" />
            </Form.Item>
            <Form.Item name="sortNo" label="排序">
              <Input type="number" />
            </Form.Item>
            <Form.Item name="status" label="点位状态">
              <Select options={pointStatusOptions} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServicePointManagement;
