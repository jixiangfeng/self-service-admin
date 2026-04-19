import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, InputNumber, Modal, Select, Space, Tabs, message } from 'antd';
import {
  billingModeOptions,
  categoryOptions,
  scopeTypeOptions,
  serviceSellingPointOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import api from '@/services/backendService';
import type { PricingRuleRecord, SelectOptionRecord, ServiceProductRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, formatDateTime, renderOptionTags, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';
import { joinCommaValues, splitCommaValues } from '@/utils/csv';

const ServiceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [productForm] = Form.useForm();
  const [pricingForm] = Form.useForm();
  const productScopeType = Form.useWatch('scopeType', productForm);

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ServiceProductRecord | null>(null);
  const [editingPricing, setEditingPricing] = useState<PricingRuleRecord | null>(null);

  const [productQueryParams, setProductQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    categoryCode: undefined as string | undefined,
    billingMode: undefined as string | undefined,
    scopeType: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const [pricingQueryParams, setPricingQueryParams] = useState({
    pageNum: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    storeId: undefined as number | undefined,
    serviceProductId: undefined as number | undefined,
    status: undefined as number | undefined,
  });

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['serviceProducts', productQueryParams],
    queryFn: async () => (await api.serviceProduct.page(productQueryParams)).data,
  });

  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['pricingRules', pricingQueryParams],
    queryFn: async () => (await api.pricingRule.page(pricingQueryParams)).data,
  });

  const { data: merchantOptionsData } = useQuery({
    queryKey: ['merchantOptionsForService'],
    queryFn: async () => (await api.merchant.options()).data,
  });

  const { data: storeOptionsData } = useQuery({
    queryKey: ['storeOptionsForService'],
    queryFn: async () => (await api.store.options()).data,
  });

  const { data: serviceProductOptionsData } = useQuery({
    queryKey: ['serviceProductOptions'],
    queryFn: async () => (await api.serviceProduct.options()).data,
  });

  const merchantOptions = merchantOptionsData || [];
  const storeOptions = storeOptionsData || [];
  const serviceProductOptions = serviceProductOptionsData || [];

  const closeProductModal = () => {
    setProductModalVisible(false);
    setEditingProduct(null);
    productForm.resetFields();
  };

  const closePricingModal = () => {
    setPricingModalVisible(false);
    setEditingPricing(null);
    pricingForm.resetFields();
  };

  const scopeOptions = useMemo<SelectOptionRecord[]>(() => {
    if (productScopeType === 'MERCHANT') {
      return merchantOptions as SelectOptionRecord[];
    }
    if (productScopeType === 'STORE') {
      return storeOptions as SelectOptionRecord[];
    }
    return [];
  }, [merchantOptions, productScopeType, storeOptions]);

  const createProductMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.serviceProduct.add(payload),
    onSuccess: () => {
      message.success('服务商品创建成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
      closeProductModal();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.serviceProduct.edit(payload),
    onSuccess: () => {
      message.success('服务商品更新成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
      closeProductModal();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => api.serviceProduct.remove(id),
    onSuccess: () => {
      message.success('服务商品删除成功');
      queryClient.invalidateQueries({ queryKey: ['serviceProducts'] });
      queryClient.invalidateQueries({ queryKey: ['serviceProductOptions'] });
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.pricingRule.add(payload),
    onSuccess: () => {
      message.success('计费规则创建成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      closePricingModal();
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.pricingRule.edit(payload),
    onSuccess: () => {
      message.success('计费规则更新成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      closePricingModal();
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: number) => api.pricingRule.remove(id),
    onSuccess: () => {
      message.success('计费规则删除成功');
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
    },
  });

  const productColumns = useMemo<ProColumns<ServiceProductRecord>[]>(
    () => [
      { title: '商品名称', dataIndex: 'productName', width: 180, hideInSearch: true },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '商品名称 / 编号 / 价格描述' } },
      { title: '商品编码', dataIndex: 'productCode', width: 140, search: false },
      {
        title: '分类',
        dataIndex: 'categoryCode',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(categoryOptions),
        render: (_, record) => renderStatusTag(record.categoryCode, buildValueEnum(categoryOptions) as any),
      },
      {
        title: '计费模式',
        dataIndex: 'billingMode',
        width: 140,
        valueType: 'select',
        valueEnum: buildValueEnum(billingModeOptions),
        render: (_, record) => renderStatusTag(record.billingMode, buildValueEnum(billingModeOptions) as any),
      },
      {
        title: '作用范围',
        dataIndex: 'scopeType',
        width: 160,
        valueType: 'select',
        valueEnum: buildValueEnum(scopeTypeOptions),
        render: (_, record) => `${scopeTypeOptions.find((item) => item.value === record.scopeType)?.label || record.scopeType}${record.scopeName ? ` / ${record.scopeName}` : ''}`,
      },
      { title: '价格描述', dataIndex: 'priceDesc', width: 200, search: false, render: (_, record) => record.priceDesc || '-' },
      { title: '服务周期', dataIndex: 'serviceDuration', width: 120, search: false, render: (_, record) => record.serviceDuration || '-' },
      { title: '卖点标签', dataIndex: 'sellingPoints', width: 240, search: false, render: (_, record) => renderOptionTags(record.sellingPoints, serviceSellingPointOptions) },
      { title: '优惠叠加', dataIndex: 'discountRule', width: 180, search: false, render: (_, record) => record.discountRule || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: buildValueEnum(statusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(statusOptions) as any),
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
                setEditingProduct(record);
                productForm.setFieldsValue({
                  ...record,
                  sellingPoints: splitCommaValues(record.sellingPoints),
                });
                setProductModalVisible(true);
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
                  title: '确认删除服务商品',
                  content: `确定删除商品「${record.productName}」吗？`,
                  onOk: () => deleteProductMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deleteProductMutation, productForm]
  );

  const pricingColumns = useMemo<ProColumns<PricingRuleRecord>[]>(
    () => [
      { title: '规则名称', dataIndex: 'ruleName', width: 180, hideInSearch: true },
      { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '规则名称 / 编号 / 夜间价格描述' } },
      { title: '规则编码', dataIndex: 'ruleCode', width: 140, search: false },
      {
        title: '门店',
        dataIndex: 'storeId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(storeOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.storeName || '全局规则',
      },
      {
        title: '服务商品',
        dataIndex: 'serviceProductId',
        width: 180,
        valueType: 'select',
        valueEnum: buildValueEnum(serviceProductOptions.map((item) => ({ value: item.value, label: item.label }))),
        render: (_, record) => record.productName || '-',
      },
      { title: '起步价', dataIndex: 'startPrice', width: 100, search: false, render: (_, record) => record.startPrice ?? '-' },
      { title: '分钟单价', dataIndex: 'minutePrice', width: 100, search: false, render: (_, record) => record.minutePrice ?? '-' },
      { title: '封顶金额', dataIndex: 'capAmount', width: 100, search: false, render: (_, record) => record.capAmount ?? '-' },
      { title: '免费分钟', dataIndex: 'freeMinutes', width: 100, search: false, render: (_, record) => record.freeMinutes ?? '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: buildValueEnum(statusOptions),
        render: (_, record) => renderStatusTag(record.status, buildValueEnum(statusOptions) as any),
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
                setEditingPricing(record);
                pricingForm.setFieldsValue(record);
                setPricingModalVisible(true);
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
                  title: '确认删除计费规则',
                  content: `确定删除规则「${record.ruleName}」吗？`,
                  onOk: () => deletePricingMutation.mutate(record.id),
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [deletePricingMutation, pricingForm, serviceProductOptions, storeOptions]
  );

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="商品与服务" subtitle="管理服务商品、计费规则和作用范围。" icon={<AppstoreOutlined />} />
      <WorkflowGuide
        title="商品上架闭环"
        summary="商品页不该只剩两个表格。完整闭环至少要把商品建档、计费规则、作用范围和交易表现串起来。"
        steps={[
          { title: '商品建档', description: '定义商品分类、计费模式和价格表达', status: 'finish', tag: '服务商品' },
          { title: '配置计费', description: '补起步价、分钟单价、封顶和免费分钟', status: 'process', tag: '计费规则' },
          { title: '作用范围', description: '确认平台 / 商户 / 门店的适用边界', status: 'process', tag: '范围配置' },
          { title: '交易验证', description: '到订单中心核对真实下单与支付表现', status: 'wait', tag: '下一步：交易中心' },
        ]}
        actions={[
          {
            key: 'product',
            label: '新建服务商品',
            type: 'primary',
            onClick: () => {
              setEditingProduct(null);
              productForm.resetFields();
              productForm.setFieldsValue({
                billingMode: 'PACKAGE',
                scopeType: 'PLATFORM',
                status: 1,
                sellingPoints: ['FAST_ENTRY', 'COUPON_STACK'],
              });
              setProductModalVisible(true);
            },
          },
          {
            key: 'pricing',
            label: '新建计费规则',
            onClick: () => {
              setEditingPricing(null);
              pricingForm.resetFields();
              pricingForm.setFieldsValue({ status: 1, freeMinutes: 0 });
              setPricingModalVisible(true);
            },
          },
        ]}
      />
      <Tabs
        items={[
          {
            key: 'products',
            label: '服务商品',
            children: (
              <ProTable<ServiceProductRecord>
                cardBordered
                rowKey="id"
                columns={productColumns}
                dataSource={productData?.records || []}
                loading={productLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 1980 }}
                pagination={{
                  current: productData?.current || productQueryParams.pageNum,
                  pageSize: productData?.size || productQueryParams.pageSize,
                  total: productData?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (page, pageSize) => setProductQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
                }}
                toolBarRender={() => [
                  <Button
                    key="create-product"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingProduct(null);
                      productForm.resetFields();
                      productForm.setFieldsValue({
                        billingMode: 'PACKAGE',
                        scopeType: 'PLATFORM',
                        status: 1,
                        sellingPoints: ['FAST_ENTRY', 'COUPON_STACK'],
                      });
                      setProductModalVisible(true);
                    }}
                  >
                    新建服务商品
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setProductQueryParams({
                    pageNum: 1,
                    pageSize: productQueryParams.pageSize,
                    keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                    categoryCode: typeof values.categoryCode === 'string' ? values.categoryCode : undefined,
                    billingMode: typeof values.billingMode === 'string' ? values.billingMode : undefined,
                    scopeType: typeof values.scopeType === 'string' ? values.scopeType : undefined,
                    status: typeof values.status === 'number' ? values.status : undefined,
                  });
                }}
                onReset={() => {
                  setProductQueryParams({
                    pageNum: 1,
                    pageSize: 10,
                    keyword: undefined,
                    categoryCode: undefined,
                    billingMode: undefined,
                    scopeType: undefined,
                    status: undefined,
                  });
                }}
              />
            ),
          },
          {
            key: 'pricing',
            label: '计费规则',
            children: (
              <ProTable<PricingRuleRecord>
                cardBordered
                rowKey="id"
                columns={pricingColumns}
                dataSource={pricingData?.records || []}
                loading={pricingLoading}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                scroll={{ x: 1680 }}
                pagination={{
                  current: pricingData?.current || pricingQueryParams.pageNum,
                  pageSize: pricingData?.size || pricingQueryParams.pageSize,
                  total: pricingData?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (page, pageSize) => setPricingQueryParams((prev) => ({ ...prev, pageNum: page, pageSize: pageSize || prev.pageSize })),
                }}
                toolBarRender={() => [
                  <Button
                    key="create-pricing"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingPricing(null);
                      pricingForm.resetFields();
                      pricingForm.setFieldsValue({ status: 1, freeMinutes: 0 });
                      setPricingModalVisible(true);
                    }}
                  >
                    新建计费规则
                  </Button>,
                ]}
                onSubmit={(values) => {
                  setPricingQueryParams({
                    pageNum: 1,
                    pageSize: pricingQueryParams.pageSize,
                    keyword: typeof values.keyword === 'string' ? values.keyword.trim() || undefined : undefined,
                    storeId: typeof values.storeId === 'number' ? values.storeId : undefined,
                    serviceProductId: typeof values.serviceProductId === 'number' ? values.serviceProductId : undefined,
                    status: typeof values.status === 'number' ? values.status : undefined,
                  });
                }}
                onReset={() => {
                  setPricingQueryParams({
                    pageNum: 1,
                    pageSize: 10,
                    keyword: undefined,
                    storeId: undefined,
                    serviceProductId: undefined,
                    status: undefined,
                  });
                }}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingProduct ? `编辑服务商品 · ${editingProduct.productName}` : '新建服务商品'}
        open={productModalVisible}
        width={980}
        onCancel={closeProductModal}
        onOk={() => productForm.submit()}
        confirmLoading={createProductMutation.isPending || updateProductMutation.isPending}
        okText="保存商品"
        destroyOnClose
      >
        <Form
          form={productForm}
          layout="vertical"
          preserve={false}
          onFinish={(values) => {
            const sellingPoints = joinCommaValues(values.sellingPoints);
            const payload = values.scopeType === 'PLATFORM'
              ? { ...values, scopeId: undefined, sellingPoints }
              : { ...values, sellingPoints };
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, ...payload });
              return;
            }
            createProductMutation.mutate(payload);
          }}
        >
          <div className="modal-grid">
            <Divider className="modal-span-2" orientation="left">商品基础信息</Divider>
            <Form.Item name="productName" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productCode" label="商品编码" rules={[{ required: true, message: '请输入商品编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="categoryCode" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}>
              <Select options={categoryOptions} />
            </Form.Item>
            <Form.Item name="billingMode" label="计费模式" rules={[{ required: true, message: '请选择计费模式' }]}>
              <Select options={billingModeOptions} />
            </Form.Item>
            <Form.Item name="scopeType" label="作用范围" rules={[{ required: true, message: '请选择作用范围' }]}>
              <Select options={scopeTypeOptions} />
            </Form.Item>
            {productScopeType && productScopeType !== 'PLATFORM' ? (
              <Form.Item name="scopeId" label="作用对象" rules={[{ required: true, message: '请选择作用对象' }]}>
                <Select options={scopeOptions} />
              </Form.Item>
            ) : null}
            <Divider className="modal-span-2" orientation="left">价格与叠加规则</Divider>
            <Form.Item name="priceDesc" label="价格描述">
              <Input placeholder="例如 29 元 / 15 分钟" />
            </Form.Item>
            <Form.Item name="serviceDuration" label="服务周期 / 履约时长">
              <Input placeholder="例如 15 分钟 / 10 次 / 30 天" />
            </Form.Item>
            <Form.Item className="modal-span-2" name="sellingPoints" label="卖点标签">
              <Select mode="multiple" options={serviceSellingPointOptions} placeholder="选择商品卖点" />
            </Form.Item>
            <Form.Item className="modal-span-2" name="discountRule" label="优惠叠加规则">
              <Input placeholder="例如 支持券 + 余额" />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="usageNotice" label="使用须知">
              <Input.TextArea rows={4} placeholder="填写启动时效、退款规则、核销边界等说明" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={editingPricing ? `编辑计费规则 · ${editingPricing.ruleName}` : '新建计费规则'}
        open={pricingModalVisible}
        width={980}
        onCancel={closePricingModal}
        onOk={() => pricingForm.submit()}
        confirmLoading={createPricingMutation.isPending || updatePricingMutation.isPending}
        okText="保存规则"
        destroyOnClose
      >
        <Form
          form={pricingForm}
          layout="vertical"
          preserve={false}
          onFinish={(values) => {
            if (editingPricing) {
              updatePricingMutation.mutate({ id: editingPricing.id, ...values });
              return;
            }
            createPricingMutation.mutate(values);
          }}
        >
          <div className="modal-grid">
            <Divider className="modal-span-2" orientation="left">规则基础信息</Divider>
            <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true, message: '请输入规则编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="storeId" label="适用门店">
              <Select options={storeOptions as SelectOptionRecord[]} allowClear placeholder="为空则表示全局规则" />
            </Form.Item>
            <Form.Item name="serviceProductId" label="关联服务商品">
              <Select options={serviceProductOptions as SelectOptionRecord[]} allowClear />
            </Form.Item>
            <Divider className="modal-span-2" orientation="left">计费细项</Divider>
            <Form.Item name="startPrice" label="起步价">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
            <Form.Item name="minutePrice" label="按分钟单价">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
            <Form.Item name="countPrice" label="按次单价">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
            <Form.Item name="capAmount" label="封顶金额">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
            <Form.Item name="freeMinutes" label="免费分钟">
              <InputNumber style={{ width: '100%' }} min={0} precision={0} />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue={1}>
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="nightPriceDesc" label="夜间价格描述">
              <Input />
            </Form.Item>
            <Form.Item className="modal-span-2" name="holidayPriceDesc" label="节假日价格描述">
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiceManagement;
