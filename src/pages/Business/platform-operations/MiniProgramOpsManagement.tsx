import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type AgreementContentRecord,
  type BannerConfigRecord,
  type MiniProgramPageConfigRecord,
} from '@/services/backendService';

type DetailRecord = MiniProgramPageConfigRecord | BannerConfigRecord | AgreementContentRecord;

const pageCodeOptions = [
  { value: 'HOME', label: '首页' },
  { value: 'STORE', label: '门店页' },
  { value: 'ACTIVITY', label: '活动页' },
  { value: 'MINE', label: '我的页' },
];

const moduleCodeOptions = [
  { value: 'BANNER', label: 'Banner' },
  { value: 'QUICK_ENTRY', label: '金刚区' },
  { value: 'SERVICE', label: '服务模块' },
  { value: 'NOTICE', label: '公告模块' },
  { value: 'SHARE', label: '分享配置' },
  { value: 'CUSTOMER_SERVICE', label: '客服入口' },
];

const jumpTypeOptions = [
  { value: 'PAGE', label: '小程序页面' },
  { value: 'H5', label: 'H5 链接' },
  { value: 'ACTIVITY', label: '活动' },
  { value: 'STORE', label: '门店' },
];

const agreementTypeOptions = [
  { value: 'USER_PRIVACY', label: '用户隐私协议' },
  { value: 'SERVICE', label: '服务协议' },
  { value: 'RECHARGE', label: '充值协议' },
  { value: 'REFUND', label: '退款规则' },
];

const statusMap = buildValueEnum(statusOptions);
const pageMap = buildValueEnum(pageCodeOptions);
const moduleMap = buildValueEnum(moduleCodeOptions);
const jumpTypeMap = buildValueEnum(jumpTypeOptions);
const agreementTypeMap = buildValueEnum(agreementTypeOptions);

const miniOpsDetailFields: Record<'page' | 'banner' | 'agreement', DetailField<any>[]> = {
  page: [
    { name: 'pageCode', label: '页面' },
    { name: 'moduleCode', label: '模块' },
    { name: 'moduleName', label: '模块名称' },
    { name: 'configJson', label: '配置 JSON' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  banner: [
    { name: 'bannerName', label: 'Banner 名称' },
    { name: 'pageCode', label: '页面' },
    { name: 'imageFileAssetId', label: '图片文件ID' },
    { name: 'jumpType', label: '跳转类型' },
    { name: 'jumpValue', label: '跳转值' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'endAt', label: '结束时间', render: (value) => formatDateTime(value) },
  ],
  agreement: [
    { name: 'agreementType', label: '协议类型' },
    { name: 'title', label: '标题' },
    { name: 'versionNo', label: '版本号' },
    { name: 'content', label: '内容摘要' },
    { name: 'effectiveAt', label: '生效时间', render: (value) => formatDateTime(value) },
    { name: 'status', label: '状态' },
  ],
};

const MiniProgramOpsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const pageConfigsQuery = useQuery({ queryKey: ['mini-program-page-configs', queryParams], queryFn: () => api.miniProgramOps.pageConfigs.page(queryParams) });
  const bannersQuery = useQuery({ queryKey: ['banner-configs', queryParams], queryFn: () => api.miniProgramOps.banners.page(queryParams) });
  const agreementsQuery = useQuery({ queryKey: ['agreement-contents', queryParams], queryFn: () => api.miniProgramOps.agreements.page(queryParams) });

  const pageConfigs = pageConfigsQuery.data?.data.records ?? [];
  const banners = bannersQuery.data?.data.records ?? [];
  const agreements = agreementsQuery.data?.data.records ?? [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalTitle === '新建页面模块') {
      await api.miniProgramOps.pageConfigs.add({
        pageCode: values.pageCode || 'HOME',
        moduleCode: 'CUSTOM',
        moduleName: values.name,
        configJson: values.configJson,
        sortNo: Number(values.sortNo ?? 0),
        status: values.status,
      });
      await queryClient.invalidateQueries({ queryKey: ['mini-program-page-configs'] });
    } else if (modalTitle === '新建 Banner') {
      await api.miniProgramOps.banners.add({
        bannerName: values.name,
        pageCode: values.pageCode || 'HOME',
        imageFileAssetId: values.configJson,
        jumpType: 'PAGE',
        jumpValue: values.configJson,
        sortNo: Number(values.sortNo ?? 0),
        status: values.status,
      });
      await queryClient.invalidateQueries({ queryKey: ['banner-configs'] });
    } else if (modalTitle === '新建协议版本') {
      await api.miniProgramOps.agreements.add({
        agreementType: values.agreementType || 'SERVICE',
        title: values.name,
        content: values.configJson,
        versionNo: `V${Date.now()}`,
        status: values.status,
      });
      await queryClient.invalidateQueries({ queryKey: ['agreement-contents'] });
    }
    setModalVisible(false);
    message.success('已保存到后端');
  };

  const pageColumns = useMemo<ProColumns<MiniProgramPageConfigRecord>[]>(() => [
    { title: '页面', dataIndex: 'pageCode', width: 120, render: (_, record) => renderStatusTag(record.pageCode, pageMap) },
    { title: '模块', dataIndex: 'moduleCode', width: 140, render: (_, record) => renderStatusTag(record.moduleCode, moduleMap) },
    { title: '模块名称', dataIndex: 'moduleName', width: 180 },
    { title: '配置 JSON', dataIndex: 'configJson', width: 340, ellipsis: true },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const bannerColumns = useMemo<ProColumns<BannerConfigRecord>[]>(() => [
    { title: 'Banner 名称', dataIndex: 'bannerName', width: 180, fixed: 'left' },
    { title: '页面', dataIndex: 'pageCode', width: 120, render: (_, record) => renderStatusTag(record.pageCode, pageMap) },
    { title: '图片文件ID', dataIndex: 'imageFileAssetId', width: 160 },
    { title: '跳转类型', dataIndex: 'jumpType', width: 120, render: (_, record) => renderStatusTag(record.jumpType, jumpTypeMap) },
    { title: '跳转值', dataIndex: 'jumpValue', width: 220 },
    { title: '开始时间', dataIndex: 'startAt', width: 180, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'endAt', width: 180, render: (_, record) => formatDateTime(record.endAt) },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const agreementColumns = useMemo<ProColumns<AgreementContentRecord>[]>(() => [
    { title: '协议类型', dataIndex: 'agreementType', width: 160, render: (_, record) => renderStatusTag(record.agreementType, agreementTypeMap) },
    { title: '标题', dataIndex: 'title', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '内容摘要', dataIndex: 'content', width: 340, ellipsis: true },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="小程序运营配置" subtitle="维护首页模块、Banner 投放、协议版本、分享配置和客服入口。" icon={<MobileOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="页面模块" value={pageConfigs.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="上线 Banner" value={banners.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="协议版本" value={agreements.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用配置" value={pageConfigs.filter((item) => item.status === 1).length + banners.filter((item) => item.status === 1).length} suffix="项" /></Card></Col>
      </Row>

      <ProTable
        rowKey="keyword"
        search={false}
        pagination={false}
        options={false}
        dataSource={[]}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true }]}
        toolBarRender={() => [
          <Input.Search
            key="keyword"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => setKeyword(value)}
            placeholder="页面 / 模块 / Banner / 协议"
            style={{ width: 320 }}
          />,
        ]}
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          { key: 'page', label: '页面模块', children: <ProTable<MiniProgramPageConfigRecord> cardBordered rowKey="id" columns={pageColumns} dataSource={pageConfigs} loading={pageConfigsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建页面模块')}>新建模块</Button>]} /> },
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerConfigRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={banners} loading={bannersQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'agreement', label: '协议内容', children: <ProTable<AgreementContentRecord> cardBordered rowKey="id" columns={agreementColumns} dataSource={agreements} loading={agreementsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建协议版本')}>新建协议</Button>]} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('moduleCode' in detail ? miniOpsDetailFields.page : 'bannerName' in detail ? miniOpsDetailFields.banner : miniOpsDetailFields.agreement) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={780}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="pageCode" label="页面"><Select options={pageCodeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="agreementType" label="协议类型"><Select options={agreementTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="sortNo" label="排序"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="configJson" label="配置 JSON / 内容" rules={[{ required: true, message: '请输入配置内容' }]}><Input.TextArea rows={4} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MiniProgramOpsManagement;
