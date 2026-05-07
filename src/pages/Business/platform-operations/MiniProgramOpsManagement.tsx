import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface PageConfigRecord {
  id: string;
  pageCode: string;
  moduleCode: string;
  moduleName: string;
  configJson: string;
  sortNo: number;
  status: number;
  updatedAt: string;
}

interface BannerRecord {
  id: string;
  bannerName: string;
  pageCode: string;
  imageFileAssetId: string;
  jumpType: string;
  jumpValue: string;
  startAt: string;
  endAt: string;
  sortNo: number;
  status: number;
}

interface AgreementRecord {
  id: string;
  agreementType: string;
  title: string;
  content: string;
  versionNo: string;
  effectiveAt: string;
  status: number;
}

type DetailRecord = PageConfigRecord | BannerRecord | AgreementRecord;

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

const pageConfigs: PageConfigRecord[] = [
  { id: 'pc1', pageCode: 'HOME', moduleCode: 'BANNER', moduleName: '首页主 Banner', configJson: '{"autoplay":true,"height":160}', sortNo: 10, status: 1, updatedAt: '2026-05-07 09:20:00' },
  { id: 'pc2', pageCode: 'HOME', moduleCode: 'QUICK_ENTRY', moduleName: '首页金刚区', configJson: '{"columns":4,"items":["扫码洗车","充值","领券","附近门店"]}', sortNo: 20, status: 1, updatedAt: '2026-05-07 09:30:00' },
  { id: 'pc3', pageCode: 'MINE', moduleCode: 'CUSTOMER_SERVICE', moduleName: '我的页客服入口', configJson: '{"phone":"400-800-1024","workTime":"09:00-22:00"}', sortNo: 30, status: 1, updatedAt: '2026-05-06 18:12:00' },
];

const banners: BannerRecord[] = [
  { id: 'bn1', bannerName: '夜洗优惠 Banner', pageCode: 'HOME', imageFileAssetId: 'FA202605070001', jumpType: 'ACTIVITY', jumpValue: 'MKT-NIGHT-202605', startAt: '2026-05-01 00:00:00', endAt: '2026-05-31 23:59:59', sortNo: 10, status: 1 },
  { id: 'bn2', bannerName: '充值礼包 Banner', pageCode: 'ACTIVITY', imageFileAssetId: 'FA202605060018', jumpType: 'PAGE', jumpValue: '/pages/recharge/index', startAt: '2026-05-01 00:00:00', endAt: '2026-06-01 00:00:00', sortNo: 20, status: 1 },
];

const agreements: AgreementRecord[] = [
  { id: 'ag1', agreementType: 'USER_PRIVACY', title: '用户隐私协议', content: '说明用户信息收集、使用、保存和删除规则。', versionNo: 'V20260501', effectiveAt: '2026-05-01 00:00:00', status: 1 },
  { id: 'ag2', agreementType: 'RECHARGE', title: '充值协议', content: '说明充值余额、赠送权益、退款边界和有效期。', versionNo: 'V20260420', effectiveAt: '2026-04-20 00:00:00', status: 1 },
  { id: 'ag3', agreementType: 'REFUND', title: '退款规则', content: '说明服务订单、服务卡、优惠券抵扣的退款规则。', versionNo: 'V20260418', effectiveAt: '2026-04-18 00:00:00', status: 1 },
];

const statusMap = buildValueEnum(statusOptions);
const pageMap = buildValueEnum(pageCodeOptions);
const moduleMap = buildValueEnum(moduleCodeOptions);
const jumpTypeMap = buildValueEnum(jumpTypeOptions);
const agreementTypeMap = buildValueEnum(agreementTypeOptions);

const MiniProgramOpsManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const filter = <T extends object>(records: T[]) => records.filter((record) => containsKeyword(keyword, Object.values(record).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('小程序运营配置已保存');
  };

  const pageColumns = useMemo<ProColumns<PageConfigRecord>[]>(() => [
    { title: '页面', dataIndex: 'pageCode', width: 120, render: (_, record) => renderStatusTag(record.pageCode, pageMap) },
    { title: '模块', dataIndex: 'moduleCode', width: 140, render: (_, record) => renderStatusTag(record.moduleCode, moduleMap) },
    { title: '模块名称', dataIndex: 'moduleName', width: 180 },
    { title: '配置 JSON', dataIndex: 'configJson', width: 340, ellipsis: true },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const bannerColumns = useMemo<ProColumns<BannerRecord>[]>(() => [
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

  const agreementColumns = useMemo<ProColumns<AgreementRecord>[]>(() => [
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
          { key: 'page', label: '页面模块', children: <ProTable<PageConfigRecord> cardBordered rowKey="id" columns={pageColumns} dataSource={filter(pageConfigs) as PageConfigRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建页面模块')}>新建模块</Button>]} /> },
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={filter(banners) as BannerRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'agreement', label: '协议内容', children: <ProTable<AgreementRecord> cardBordered rowKey="id" columns={agreementColumns} dataSource={filter(agreements) as AgreementRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建协议版本')}>新建协议</Button>]} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>)}
          </Descriptions>
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={780}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="pageCode" label="页面" rules={[{ required: true, message: '请选择页面' }]}><Select options={pageCodeOptions} /></Form.Item></Col>
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
