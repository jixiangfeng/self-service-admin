import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  messageChannelOptions,
  publishStatusOptions,
  scopeTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface MiniConfigRecord {
  id: string;
  moduleCode: string;
  moduleName: string;
  pagePath: string;
  scopeType: string;
  status: string;
  updatedAt: string;
}

interface BannerRecord {
  id: string;
  title: string;
  position: string;
  imageUrl: string;
  jumpUrl: string;
  sortNo: number;
  status: string;
}

interface EvaluationRecord {
  id: string;
  orderNo: string;
  storeName: string;
  userName: string;
  score: number;
  tags: string;
  content: string;
  status: string;
  createdAt: string;
}

interface InvoiceRecord {
  id: string;
  applyNo: string;
  titleName: string;
  taxNo: string;
  amount: number;
  applyUser: string;
  status: string;
  createdAt: string;
}

interface OpenApiRecord {
  id: string;
  clientName: string;
  clientKey: string;
  vendorName: string;
  callbackUrl: string;
  channel: string;
  status: string;
  updatedAt: string;
}

const scopeMap = buildValueEnum(scopeTypeOptions);
const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const channelMap = buildValueEnum(messageChannelOptions);

const miniConfigs: MiniConfigRecord[] = [
  { id: 'mp1', moduleCode: 'HOME_QUICK_ENTRY', moduleName: '首页金刚区', pagePath: '/pages/index/index', scopeType: 'PLATFORM', status: 'PUBLISHED', updatedAt: '2026-04-18 09:20:00' },
  { id: 'mp2', moduleCode: 'SERVICE_AGREEMENT', moduleName: '服务协议', pagePath: '/pages/agreement/service', scopeType: 'PLATFORM', status: 'PUBLISHED', updatedAt: '2026-04-17 18:00:00' },
];

const banners: BannerRecord[] = [
  { id: 'bn1', title: '夜洗券包', position: '首页 Banner', imageUrl: 'https://assets.example.com/banner-night.png', jumpUrl: '/pages/activity/night', sortNo: 100, status: 'PUBLISHED' },
  { id: 'bn2', title: '首充礼包', position: '充值页 Banner', imageUrl: 'https://assets.example.com/banner-recharge.png', jumpUrl: '/pages/recharge/index', sortNo: 90, status: 'PENDING' },
];

const evaluations: EvaluationRecord[] = [
  { id: 'ev1', orderNo: 'SO202604180019', storeName: '徐汇夜洗门店', userName: '张晨', score: 5, tags: '速度快,价格清晰', content: '夜洗体验不错', status: 'DONE', createdAt: '2026-04-18 09:40:00' },
  { id: 'ev2', orderNo: 'SO202604170113', storeName: '虹桥旗舰洗车站', userName: '陈越', score: 2, tags: '设备异常', content: '风干设备启动失败', status: 'PENDING', createdAt: '2026-04-17 22:20:00' },
];

const invoices: InvoiceRecord[] = [
  { id: 'iv1', applyNo: 'INV202604180001', titleName: '上海鲸洗科技有限公司', taxNo: '91310000MA000001', amount: 560, applyUser: '张晨', status: 'PENDING', createdAt: '2026-04-18 10:10:00' },
  { id: 'iv2', applyNo: 'INV202604170006', titleName: '嘉定联营服务商', taxNo: '91310000MA000018', amount: 920, applyUser: '财务-许鸣', status: 'APPROVED', createdAt: '2026-04-17 18:42:00' },
];

const openApis: OpenApiRecord[] = [
  { id: 'api1', clientName: '泡沫设备厂商', clientKey: 'foam_vendor', vendorName: '洁净设备', callbackUrl: 'https://vendor.example.com/callback', channel: 'IN_APP', status: 'PUBLISHED', updatedAt: '2026-04-18 09:00:00' },
  { id: 'api2', clientName: '短信通道', clientKey: 'sms_provider', vendorName: '短信服务商', callbackUrl: 'https://sms.example.com/report', channel: 'SMS', status: 'PENDING', updatedAt: '2026-04-17 20:00:00' },
];

const OperationsConfigManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<MiniConfigRecord | BannerRecord | EvaluationRecord | InvoiceRecord | OpenApiRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ name: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const miniColumns = useMemo<ProColumns<MiniConfigRecord>[]>(() => [
    { title: '模块编码', dataIndex: 'moduleCode', width: 180 },
    { title: '模块名称', dataIndex: 'moduleName', width: 160 },
    { title: '页面路径', dataIndex: 'pagePath', width: 220 },
    { title: '范围', dataIndex: 'scopeType', width: 120, render: (_, record) => renderStatusTag(record.scopeType, scopeMap) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const bannerColumns = useMemo<ProColumns<BannerRecord>[]>(() => [
    { title: '标题', dataIndex: 'title', width: 160 },
    { title: '位置', dataIndex: 'position', width: 160 },
    { title: '图片', dataIndex: 'imageUrl', width: 260 },
    { title: '跳转', dataIndex: 'jumpUrl', width: 220 },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
  ], []);

  const evaluationColumns = useMemo<ProColumns<EvaluationRecord>[]>(() => [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '评分', dataIndex: 'score', width: 90 },
    { title: '标签', dataIndex: 'tags', width: 180 },
    { title: '内容', dataIndex: 'content', width: 220 },
    { title: '处理状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '评价时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const invoiceColumns = useMemo<ProColumns<InvoiceRecord>[]>(() => [
    { title: '申请单号', dataIndex: 'applyNo', width: 180 },
    { title: '抬头名称', dataIndex: 'titleName', width: 220 },
    { title: '税号', dataIndex: 'taxNo', width: 190 },
    { title: '开票金额', dataIndex: 'amount', width: 120, render: (_, record) => formatAmount(record.amount) },
    { title: '申请人', dataIndex: 'applyUser', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '申请时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
  ], []);

  const apiColumns = useMemo<ProColumns<OpenApiRecord>[]>(() => [
    { title: '客户端', dataIndex: 'clientName', width: 160 },
    { title: 'Key', dataIndex: 'clientKey', width: 160 },
    { title: '厂商', dataIndex: 'vendorName', width: 160 },
    { title: '回调地址', dataIndex: 'callbackUrl', width: 260 },
    { title: '渠道', dataIndex: 'channel', width: 130, render: (_, record) => renderStatusTag(record.channel, channelMap) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="运营配置中心" subtitle="维护小程序配置、Banner、评价反馈、发票和开放接口。" icon={<SettingOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="小程序模块" value={miniConfigs.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="Banner" value={banners.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待处理评价" value={evaluations.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="待审核发票" value={invoices.filter((item) => item.status === 'PENDING').length} suffix="张" /></Card></Col>
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
          { key: 'mini', label: '小程序配置', children: <ProTable<MiniConfigRecord> cardBordered rowKey="id" columns={miniColumns} dataSource={filter(miniConfigs) as MiniConfigRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建小程序配置')}>新建配置</Button>]} /> },
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={filter(banners) as BannerRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'evaluation', label: '评价反馈', children: <ProTable<EvaluationRecord> cardBordered rowKey="id" columns={evaluationColumns} dataSource={filter(evaluations) as EvaluationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理评价反馈')}>处理反馈</Button>]} /> },
          { key: 'invoice', label: '发票管理', children: <ProTable<InvoiceRecord> cardBordered rowKey="id" columns={invoiceColumns} dataSource={filter(invoices) as InvoiceRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核开票申请')}>审核开票</Button>]} /> },
          { key: 'openapi', label: '开放接口', children: <ProTable<OpenApiRecord> cardBordered rowKey="id" columns={apiColumns} dataSource={filter(openApis) as OpenApiRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1360 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新建开放接口')}>新建接口</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('配置已记录');
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
