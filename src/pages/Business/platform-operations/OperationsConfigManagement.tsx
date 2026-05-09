import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  auditStatusOptions,
  publishStatusOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type BannerConfigRecord,
  type InvoiceApplyRecord,
  type MiniProgramPageConfigRecord,
  type OpenApiClientRecord,
  type ServiceEvaluationRecord,
} from '@/services/backendService';

const publishStatusMap = buildValueEnum(publishStatusOptions);
const statusMap = buildValueEnum(statusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);

const opsConfigDetailFields: Record<'mini' | 'banner' | 'evaluation' | 'invoice' | 'openapi', DetailField<any>[]> = {
  mini: [
    { name: 'moduleCode', label: '模块编码' },
    { name: 'moduleName', label: '模块名称' },
    { name: 'pageCode', label: '页面编码' },
    { name: 'configJson', label: '配置' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  banner: [
    { name: 'bannerName', label: '标题' },
    { name: 'pageCode', label: '页面' },
    { name: 'imageFileAssetId', label: '图片文件ID' },
    { name: 'jumpValue', label: '跳转' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'endAt', label: '结束时间', render: (value) => formatDateTime(value) },
  ],
  evaluation: [
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'appUserName', label: '用户' },
    { name: 'score', label: '评分' },
    { name: 'deviceCode', label: '设备' },
    { name: 'content', label: '内容' },
    { name: 'status', label: '处理状态' },
    { name: 'createdAt', label: '评价时间', render: (value) => formatDateTime(value) },
  ],
  invoice: [
    { name: 'applyNo', label: '申请单号' },
    { name: 'titleName', label: '抬头名称' },
    { name: 'amount', label: '开票金额', render: (value) => formatAmount(value) },
    { name: 'appUserName', label: '申请人' },
    { name: 'applyStatus', label: '状态' },
    { name: 'createdAt', label: '申请时间', render: (value) => formatDateTime(value) },
  ],
  openapi: [
    { name: 'clientName', label: '客户端' },
    { name: 'clientCode', label: '编码' },
    { name: 'appKey', label: 'AppKey' },
    { name: 'callbackUrl', label: '回调地址' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const OperationsConfigManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<MiniProgramPageConfigRecord | BannerConfigRecord | ServiceEvaluationRecord | InvoiceApplyRecord | OpenApiClientRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ name: string; status: string; remark: string }>();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const miniQuery = useQuery({ queryKey: ['ops-config-mini', queryParams], queryFn: () => api.miniProgramOps.pageConfigs.page(queryParams) });
  const bannerQuery = useQuery({ queryKey: ['ops-config-banner', queryParams], queryFn: () => api.miniProgramOps.banners.page(queryParams) });
  const evaluationQuery = useQuery({ queryKey: ['ops-config-evaluation', queryParams], queryFn: () => api.message.serviceEvaluations.page(queryParams) });
  const invoiceQuery = useQuery({ queryKey: ['ops-config-invoice', queryParams], queryFn: () => api.invoiceApply.page(queryParams) });
  const openApiQuery = useQuery({ queryKey: ['ops-config-open-api', queryParams], queryFn: () => api.openApi.clients.page(queryParams) });

  const miniConfigs = miniQuery.data?.data.records ?? [];
  const banners = bannerQuery.data?.data.records ?? [];
  const evaluations = evaluationQuery.data?.data.records ?? [];
  const invoices = invoiceQuery.data?.data.records ?? [];
  const openApis = openApiQuery.data?.data.records ?? [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const miniColumns = useMemo<ProColumns<MiniProgramPageConfigRecord>[]>(() => [
    { title: '模块编码', dataIndex: 'moduleCode', width: 180 },
    { title: '模块名称', dataIndex: 'moduleName', width: 160 },
    { title: '页面编码', dataIndex: 'pageCode', width: 140 },
    { title: '配置', dataIndex: 'configJson', width: 260, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const bannerColumns = useMemo<ProColumns<BannerConfigRecord>[]>(() => [
    { title: '标题', dataIndex: 'bannerName', width: 160 },
    { title: '页面', dataIndex: 'pageCode', width: 120 },
    { title: '图片文件ID', dataIndex: 'imageFileAssetId', width: 180 },
    { title: '跳转', dataIndex: 'jumpValue', width: 220 },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const evaluationColumns = useMemo<ProColumns<ServiceEvaluationRecord>[]>(() => [
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '用户', dataIndex: 'appUserName', width: 120 },
    { title: '评分', dataIndex: 'score', width: 90 },
    { title: '设备', dataIndex: 'deviceCode', width: 150 },
    { title: '内容', dataIndex: 'content', width: 220 },
    { title: '处理状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '评价时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const invoiceColumns = useMemo<ProColumns<InvoiceApplyRecord>[]>(() => [
    { title: '申请单号', dataIndex: 'applyNo', width: 180 },
    { title: '抬头名称', dataIndex: 'titleName', width: 220 },
    { title: '开票金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '申请人', dataIndex: 'appUserName', width: 120 },
    { title: '状态', dataIndex: 'applyStatus', width: 120, render: (_, record) => renderStatusTag(record.applyStatus, auditStatusMap) },
    { title: '申请时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const apiColumns = useMemo<ProColumns<OpenApiClientRecord>[]>(() => [
    { title: '客户端', dataIndex: 'clientName', width: 160 },
    { title: 'Key', dataIndex: 'appKey', width: 160 },
    { title: '编码', dataIndex: 'clientCode', width: 160 },
    { title: '回调地址', dataIndex: 'callbackUrl', width: 260 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="运营配置中心" subtitle="维护小程序配置、Banner、评价反馈、发票和开放接口。" icon={<SettingOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="小程序模块" value={miniConfigs.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="Banner" value={banners.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待处理评价" value={evaluations.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审核发票" value={invoices.filter((item) => item.applyStatus === 'PENDING').length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="开放接口" value={openApis.length} suffix="个" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入模块、订单、发票、接口等关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'mini', label: '小程序配置', children: <ProTable<MiniProgramPageConfigRecord> cardBordered rowKey="id" columns={miniColumns} dataSource={miniConfigs} loading={miniQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建小程序配置')}>新建配置</Button>]} /> },
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerConfigRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={banners} loading={bannerQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'evaluation', label: '评价反馈', children: <ProTable<ServiceEvaluationRecord> cardBordered rowKey="id" columns={evaluationColumns} dataSource={evaluations} loading={evaluationQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1480 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => navigate('/service-desk/evaluations')}>处理反馈</Button>]} /> },
          { key: 'invoice', label: '发票管理', children: <ProTable<InvoiceApplyRecord> cardBordered rowKey="id" columns={invoiceColumns} dataSource={invoices} loading={invoiceQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => navigate('/settlement/invoices')}>审核开票</Button>]} /> },
          { key: 'openapi', label: '开放接口', children: <ProTable<OpenApiClientRecord> cardBordered rowKey="id" columns={apiColumns} dataSource={openApis} loading={openApiQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建开放接口')}>新建接口</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('moduleCode' in detail ? opsConfigDetailFields.mini : 'bannerName' in detail ? opsConfigDetailFields.banner : 'serviceOrderNo' in detail ? opsConfigDetailFields.evaluation : 'applyNo' in detail ? opsConfigDetailFields.invoice : opsConfigDetailFields.openapi) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          if (modalTitle === '新建小程序配置') {
            await api.miniProgramOps.pageConfigs.add({ moduleName: values.name, moduleCode: values.name, pageCode: 'HOME', configJson: values.remark, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-config-mini'] });
          } else if (modalTitle === '新建 Banner') {
            await api.miniProgramOps.banners.add({ bannerName: values.name, pageCode: 'HOME', jumpValue: values.remark, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-config-banner'] });
          } else if (modalTitle === '新建开放接口') {
            await api.openApi.clients.add({ clientName: values.name, clientCode: values.name, appKey: values.name, callbackUrl: values.remark, status: 1 });
            await queryClient.invalidateQueries({ queryKey: ['ops-config-open-api'] });
          }
          setModalVisible(false);
          message.success('已保存到后端');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="name" label="名称 / 单号" rules={[{ required: true, message: '请输入名称或单号' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={publishStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OperationsConfigManagement;
