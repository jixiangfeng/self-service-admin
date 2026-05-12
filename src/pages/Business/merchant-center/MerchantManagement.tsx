import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  PlusOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Select, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  merchantContractStatusOptions,
  merchantTypeOptions,
  settlementCycleOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { MerchantRecord } from '@/services/backendService';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import BusinessEditorModal from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

const merchantStatusMap = {
  1: { color: 'success', text: '启用' },
  0: { color: 'default', text: '停用' },
};

const merchantContractStatusMap = {
  ACTIVE: { color: 'success', text: '履约中' },
  PENDING: { color: 'gold', text: '待生效' },
  EXPIRED: { color: 'default', text: '已到期' },
};

const merchantFormDefaults = {
  status: 1,
  merchantType: 'DIRECT',
  contractStatus: 'ACTIVE',
  settlementCycle: 'WEEK',
};

const MerchantManagement: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MerchantRecord | null>(null);
  const [queryParams, setQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    merchantType: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['merchants', queryParams],
    queryFn: async () => (await api.merchant.page(queryParams)).data,
  });

  const closeDrawer = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.merchant.add(payload),
    onSuccess: () => {
      message.success('商户创建成功');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.merchant.edit(payload),
    onSuccess: () => {
      message.success('商户更新成功');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.merchant.remove(id),
    onSuccess: () => {
      message.success('商户删除成功');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => api.merchant.changeStatus(id, status),
    onSuccess: () => {
      message.success('商户状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });

  const confirmMerchantStatus = (record: MerchantRecord) => {
    const nextStatus = record.status === 1 ? 0 : 1;
    showBusinessConfirm({
      title: `确认${nextStatus === 1 ? '启用' : '停用'}商户`,
      content: `确定${nextStatus === 1 ? '启用' : '停用'}商户「${record.merchantName}」吗？该操作会影响商户及相关门店的业务状态。`,
      okText: nextStatus === 1 ? '确认启用' : '确认停用',
      danger: nextStatus !== 1,
      onOk: () => statusMutation.mutate({ id: record.id, status: nextStatus }),
    });
  };

  const openCreateDrawer = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue(merchantFormDefaults);
    setModalVisible(true);
  };
  const modalTitle = editingRecord ? `编辑商户 · ${editingRecord.merchantName}` : '新建商户';

  const columns = useMemo<ProColumns<MerchantRecord>[]>(
    () => [
      {
        title: '商户名称',
        dataIndex: 'merchantName',
        width: 220,
        hideInSearch: true,
        render: (_, record) => (
          <div>
            <div>{record.merchantName}</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>{record.shortName || '未配置简称'}</div>
          </div>
        ),
      },
      {
        title: '关键词',
        dataIndex: 'keyword',
        hideInTable: true,
        fieldProps: { placeholder: '商户名称 / 编号 / 联系人 / 联系电话' },
      },
      { title: '商户编号', dataIndex: 'merchantCode', width: 140, search: false },
      {
        title: '主体类型',
        dataIndex: 'merchantType',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(merchantTypeOptions),
        render: (_, record) => renderStatusTag(record.merchantType, buildValueEnum(merchantTypeOptions) as any),
      },
      {
        title: '合同状态',
        dataIndex: 'contractStatus',
        width: 120,
        search: false,
        render: (_, record) => renderStatusTag(record.contractStatus, merchantContractStatusMap),
      },
      { title: '联系人', dataIndex: 'contactName', width: 120, search: false, render: (_, record) => record.contactName || '-' },
      { title: '联系电话', dataIndex: 'contactPhone', width: 140, search: false, render: (_, record) => record.contactPhone || '-' },
      { title: '覆盖城市', dataIndex: 'cityCoverage', width: 160, search: false, render: (_, record) => record.cityCoverage || '-' },
      { title: '门店数', dataIndex: 'storeCount', width: 100, search: false, render: (_, record) => record.storeCount ?? 0 },
      { title: '结算周期', dataIndex: 'settlementCycle', width: 120, search: false, render: (_, record) => record.settlementCycle || '-' },
      { title: '结算账户', dataIndex: 'settlementAccountName', width: 180, search: false, render: (_, record) => record.settlementAccountName || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: buildValueEnum(statusOptions),
        render: (_, record) => renderStatusTag(record.status, merchantStatusMap),
      },
      { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt || record.createTime) },
      { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt || record.updateTime) },
      {
        title: '操作',
        width: 200,
        search: false,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                form.setFieldsValue(record);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              onClick={() => confirmMerchantStatus(record)}
              loading={statusMutation.isPending}
            >
              {record.status === 1 ? '停用' : '启用'}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                showBusinessConfirm({
                  title: '确认删除商户',
                  content: `确定删除商户「${record.merchantName}」吗？`,
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
    [deleteMutation, form, statusMutation]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商户管理" subtitle="维护商户主体、联系人、结算账户和启停状态。" icon={<ApartmentOutlined />} />
      <WorkflowGuide
        title="商户开店闭环"
        summary="商户建档只是第一步。录完主体后，应继续开门店、分配门店组、配置商品活动，最终再进入商户后台看经营情况。"
        steps={[
          { title: '主体建档', description: '录入主体、联系人和结算账户', status: 'finish', tag: '当前页' },
          { title: '门店开设', description: '为商户创建门店并配置营业策略', status: 'process', tag: '下一步：门店管理' },
          { title: '门店组范围', description: '分配活动、核销、统计门店组', status: 'wait', tag: '门店组管理' },
          { title: '经营后台', description: '切换到商户视角跟进待办和经营数据', status: 'wait', tag: '商户后台' },
        ]}
        actions={[
          { key: 'create', label: '新建商户', type: 'primary', onClick: openCreateDrawer },
          { key: 'store', label: '去门店管理', onClick: () => navigate('/store') },
        ]}
      />

      <ProTable<MerchantRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={data?.records || []}
        loading={isLoading}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1920 }}
        pagination={{
          current: data?.current || queryParams.pageNum,
          pageSize: data?.size || queryParams.pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
        }}
        toolBarRender={() => [
          <Button key="group" onClick={() => navigate('/merchant/groups')}>
            去门店组管理
          </Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新建商户
          </Button>,
        ]}
        onSubmit={(values) => {
          setQueryParams({
            pageNum: 1,
            pageSize: queryParams.pageSize,
            keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
            merchantType: typeof values.merchantType === 'string' ? values.merchantType : undefined,
            status: typeof values.status === 'number' ? values.status : undefined,
          });
        }}
        onReset={() => {
          setQueryParams({ pageNum: 1, pageSize: 10, keyword: undefined, merchantType: undefined, status: undefined });
        }}
      />

      <BusinessEditorModal
        eyebrow={editingRecord ? '商户档案维护' : '商户入驻建档'}
        title={modalTitle}
        subtitle="先建主体，再继续配置门店、门店组、商品活动和商户后台视角。"
        meta={['主体建档', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        width={1220}
        onCancel={closeDrawer}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingRecord ? '保存变更' : '创建商户'}
        forceRender
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="merchant-editor-form"
          preserve={false}
          onFinish={(values) => {
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...values });
              return;
            }
            createMutation.mutate(values);
          }}
        >
          <div className="merchant-editor-shell">
            <div className="merchant-editor-main">
              <section className="merchant-editor-section">
                <div className="merchant-editor-section__head">
                  <div className="merchant-editor-section__icon">
                    <ApartmentOutlined />
                  </div>
                  <div>
                    <div className="merchant-editor-section__title">主体基础信息</div>
                    <div className="merchant-editor-section__desc">明确经营主体、合同状态和资质归档方式，保证商户建档可追溯。</div>
                  </div>
                </div>
                <div className="merchant-editor-fields">
                  <Form.Item name="merchantName" label="商户名称" rules={[{ required: true, message: '请输入商户名称' }]}>
                    <Input placeholder="例如：鲸洗直营运营中心" />
                  </Form.Item>
                  <Form.Item name="shortName" label="商户简称" rules={[{ required: true, message: '请输入商户简称' }]}>
                    <Input placeholder="用于列表摘要和经营看板展示" />
                  </Form.Item>
                  <Form.Item name="merchantCode" label="商户编号" rules={[{ required: true, message: '请输入商户编号' }]}>
                    <Input placeholder="例如：MER-DIRECT-001" />
                  </Form.Item>
                  <Form.Item name="merchantType" label="主体类型" rules={[{ required: true, message: '请选择主体类型' }]}>
                    <Select options={merchantTypeOptions} placeholder="请选择主体类型" />
                  </Form.Item>
                  <Form.Item name="contractStatus" label="合同状态" rules={[{ required: true, message: '请选择合同状态' }]}>
                    <Select options={merchantContractStatusOptions} placeholder="请选择合同状态" />
                  </Form.Item>
                  <Form.Item name="creditCode" label="统一信用代码">
                    <Input placeholder="用于对接资质、发票与风控核验" />
                  </Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="licenseUrl" label="营业资质图片">
                    <OssImageUpload prefix="merchant/licenses" placeholder="上传营业资质" />
                  </Form.Item>
                </div>
              </section>

              <section className="merchant-editor-section">
                <div className="merchant-editor-section__head">
                  <div className="merchant-editor-section__icon">
                    <PhoneOutlined />
                  </div>
                  <div>
                    <div className="merchant-editor-section__title">联系人与响应信息</div>
                    <div className="merchant-editor-section__desc">沉淀运营联系人，方便处理活动配置、异常售后和日常经营通知。</div>
                  </div>
                </div>
                <div className="merchant-editor-fields">
                  <Form.Item name="contactName" label="联系人">
                    <Input placeholder="例如：王敏" />
                  </Form.Item>
                  <Form.Item name="contactPhone" label="联系电话">
                    <Input placeholder="用于运营通知和售后联系" />
                  </Form.Item>
                </div>
              </section>

              <section className="merchant-editor-section">
                <div className="merchant-editor-section__head">
                  <div className="merchant-editor-section__icon">
                    <WalletOutlined />
                  </div>
                  <div>
                    <div className="merchant-editor-section__title">结算与档案备注</div>
                    <div className="merchant-editor-section__desc">配置结算方式和账户信息，补充内部协作备注，支撑财务对账。</div>
                  </div>
                </div>
                <div className="merchant-editor-fields">
                  <Form.Item name="settlementAccountName" label="结算账户名称">
                    <Input placeholder="例如：上海鲸洗汽车服务有限公司" />
                  </Form.Item>
                  <Form.Item name="settlementAccountNo" label="结算账号">
                    <Input placeholder="用于账单结算与打款" />
                  </Form.Item>
                  <Form.Item name="settlementCycle" label="结算周期" rules={[{ required: true, message: '请选择结算周期' }]}>
                    <Select placeholder="请选择结算周期" options={settlementCycleOptions} />
                  </Form.Item>
                  <Form.Item name="status" label="状态" initialValue={merchantFormDefaults.status}>
                    <Select options={statusOptions} placeholder="请选择状态" />
                  </Form.Item>
                  <Form.Item className="merchant-editor-field-span-2" name="remark" label="备注">
                    <Input.TextArea rows={4} placeholder="记录合作背景、结算注意事项或内部交接说明" />
                  </Form.Item>
                </div>
              </section>
            </div>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MerchantManagement;
