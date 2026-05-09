import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { PlusOutlined, ShopOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Modal, Select, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  marketingOptions,
  statusOptions,
  storeServiceCapabilityOptions,
  storeStatusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { SelectOptionRecord, StoreRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderBooleanTag, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';

const StoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StoreRecord | null>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    merchantId: undefined as number | undefined,
    city: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stores', queryParams],
    queryFn: async () => (await api.store.page(queryParams)).data,
  });

  const { data: merchantOptionsData } = useQuery({
    queryKey: ['merchantOptions'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const merchantOptions = merchantOptionsData || [];

  const closeDrawer = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.store.add(payload),
    onSuccess: () => {
      message.success('门店创建成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.store.edit(payload),
    onSuccess: () => {
      message.success('门店更新成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.store.remove(id),
    onSuccess: () => {
      message.success('门店删除成功');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  const openCreateDrawer = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      marketingEnabled: 1,
      status: 'OPEN',
      tempClosed: 0,
      serviceFlags: ['SCAN', 'POINT_SELECT', 'BALANCE', 'COUPON'],
    });
    setModalVisible(true);
  };

  const columns = useMemo<ProColumns<StoreRecord>[]>(
    () => [
      {
        title: '门店名称',
        dataIndex: 'storeName',
        width: 220,
        hideInSearch: true,
        render: (_, record) => (
          <div>
            <div>{record.storeName}</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>{record.storePhone || '未配置门店电话'}</div>
          </div>
        ),
      },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店名称 / 编号 / 地址' } },
      {
        title: '所属商户',
        dataIndex: 'merchantId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(merchantOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.merchantName || '-',
      },
      { title: '门店编号', dataIndex: 'storeCode', width: 140, search: false },
      { title: '城市', dataIndex: 'city', width: 140, render: (_, record) => record.city || '-', hideInSearch: true },
      { title: '城市筛选', dataIndex: 'cityKeyword', hideInTable: true, fieldProps: { placeholder: '输入城市，例如上海' } },
      { title: '营业时间', dataIndex: 'businessHours', width: 160, search: false, render: (_, record) => record.businessHours || '-' },
      { title: '营业时段', dataIndex: 'openTime', width: 150, search: false, render: (_, record) => record.openTime && record.closeTime ? `${record.openTime}-${record.closeTime}` : '-' },
      { title: '店长', dataIndex: 'managerName', width: 140, search: false, render: (_, record) => record.managerName || '-' },
      { title: '服务半径', dataIndex: 'serviceRadius', width: 110, search: false, render: (_, record) => record.serviceRadius ? `${record.serviceRadius}km` : '-' },
      { title: '服务能力', dataIndex: 'serviceFlags', width: 280, search: false, render: (_, record) => renderOptionTags(record.serviceFlags, storeServiceCapabilityOptions) },
      { title: '营销开关', dataIndex: 'marketingEnabled', width: 120, search: false, render: (_, record) => renderBooleanTag(record.marketingEnabled) },
      { title: '临停状态', dataIndex: 'tempClosed', width: 120, search: false, render: (_, record) => renderBooleanTag(record.tempClosed, '临停中', '正常') },
      {
        title: '门店状态',
        dataIndex: 'status',
        width: 120,
        valueType: 'select',
        valueEnum: buildValueEnum(storeStatusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(storeStatusOptions) as any),
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
                  ...record,
                  serviceFlags: splitCommaValues(record.serviceFlags),
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
                  title: '确认删除门店',
                  content: `确定删除门店「${record.storeName}」吗？`,
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
    [deleteMutation, form, merchantOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店管理" subtitle="维护门店档案、营业配置、营销开关和服务能力。" icon={<ShopOutlined />} />
      <WorkflowGuide
        title="门店经营闭环"
        summary="门店不是地址条目，而是点位、设备、商品、活动和门店运营的统一承载主体。"
        steps={[
          { title: '门店建档', description: '补齐地址、营业时间、公告和联系方式', status: 'finish', tag: '当前页' },
          { title: '点位设备', description: '配置点位、二维码和设备绑定', status: 'process', tag: '下一步：点位 / 设备' },
          { title: '商品活动', description: '决定商品适用范围和营销开关', status: 'wait', tag: '商品与服务 / 活动营销' },
          { title: '门店运营', description: '切到运营台跟进班次、巡检和异常', status: 'wait', tag: '门店运营台' },
        ]}
        actions={[
          { key: 'create', label: '新建门店', type: 'primary', onClick: openCreateDrawer },
          { key: 'ops', label: '去门店运营台', onClick: () => navigate('/store-operations') },
        ]}
      />

      <ProTable<StoreRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1860 }}
        pagination={{
          current: data?.current || queryParams.pageNum,
          pageSize: data?.size || queryParams.pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
        }}
        toolBarRender={() => [
          <Button key="ops" onClick={() => navigate('/store-operations')}>
            去门店运营台
          </Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新建门店
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams({
            pageNum: 1,
            pageSize: queryParams.pageSize,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            merchantId: typeof values.merchantId === 'number' ? values.merchantId : undefined,
            city: typeof values.cityKeyword === 'string' ? values.cityKeyword.trim() || undefined : undefined,
            status: typeof values.status === 'string' ? values.status : undefined,
          });
        }}
        onReset={() => {
          setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, merchantId: undefined, city: undefined, status: undefined });
        }}
      />

      <Modal
        title={editingRecord ? `编辑门店 · ${editingRecord.storeName}` : '新建门店'}
        open={modalVisible}
        width={980}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="保存门店"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={(values) => {
            const payload = {
              ...values,
              serviceFlags: joinCommaValues(values.serviceFlags),
            };
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...payload });
              return;
            }
            createMutation.mutate(payload);
          }}
        >
          <div className="modal-grid">
            <Divider className="modal-span-2" orientation="left">门店基础档案</Divider>
            <Form.Item name="merchantId" label="所属商户" rules={[{ required: true, message: '请选择所属商户' }]}>
              <Select options={merchantOptions as SelectOptionRecord[]} />
            </Form.Item>
            <Form.Item name="storeName" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="storeCode" label="门店编号" rules={[{ required: true, message: '请输入门店编号' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="storePhone" label="门店电话">
              <Input />
            </Form.Item>
            <Form.Item name="managerName" label="店长 / 负责人">
              <Input />
            </Form.Item>
            <Form.Item name="managerPhone" label="负责人电话">
              <Input />
            </Form.Item>
            <Form.Item name="coverUrl" label="门店封面">
              <Input placeholder="封面图片 URL" />
            </Form.Item>
            <Form.Item name="serviceRadius" label="服务半径 km">
              <Input />
            </Form.Item>
            <Form.Item name="province" label="省份">
              <Input />
            </Form.Item>
            <Form.Item name="city" label="城市">
              <Input />
            </Form.Item>
            <Form.Item name="district" label="区县">
              <Input />
            </Form.Item>
            <Form.Item className="modal-span-2" name="address" label="详细地址">
              <Input />
            </Form.Item>

            <Divider className="modal-span-2" orientation="left">营业与能力配置</Divider>
            <Form.Item name="businessHours" label="营业时间">
              <Input placeholder="例如 08:00-22:00" />
            </Form.Item>
            <Form.Item name="openTime" label="开门时间">
              <Input placeholder="例如 08:00" />
            </Form.Item>
            <Form.Item name="closeTime" label="关门时间">
              <Input placeholder="例如 22:00" />
            </Form.Item>
            <Form.Item name="holidayHours" label="节假日营业时间">
              <Input placeholder="例如 节假日 09:00-21:00" />
            </Form.Item>
            <Form.Item className="modal-span-2" name="serviceFlags" label="服务能力">
              <Select mode="multiple" options={storeServiceCapabilityOptions} placeholder="选择门店支持的能力" />
            </Form.Item>
            <Form.Item name="marketingEnabled" label="营销开关">
              <Select options={marketingOptions} />
            </Form.Item>
            <Form.Item name="status" label="门店状态">
              <Select options={storeStatusOptions} />
            </Form.Item>
            <Form.Item name="tempClosed" label="是否临时停业">
              <Select options={statusOptions.map((item) => ({ value: item.value, label: item.value === 1 ? '是' : '否' }))} />
            </Form.Item>
            <Form.Item name="tempClosedReason" label="临停原因">
              <Input />
            </Form.Item>
            <Form.Item name="tempClosedUntil" label="临停截止时间">
              <Input placeholder="例如 2026-04-18 20:00:00" />
            </Form.Item>

            <Divider className="modal-span-2" orientation="left">公告与说明</Divider>
            <Form.Item className="modal-span-2" name="imageUrls" label="门店图片">
              <Input.TextArea rows={2} placeholder="多张图片 URL 可用逗号分隔" />
            </Form.Item>
            <Form.Item className="modal-span-2" name="notice" label="门店公告">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="intro" label="门店介绍">
              <Input.TextArea rows={4} placeholder="描述门店定位、设备组合和经营重点" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreManagement;
