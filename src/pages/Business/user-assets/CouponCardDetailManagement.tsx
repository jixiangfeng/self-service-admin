import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { GiftOutlined, IdcardOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  couponTypeOptions,
  rewardTypeOptions,
  scopeTypeOptions,
  serviceCardStatusOptions,
  serviceCardTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type DetailRecord = UserCouponRecord | CouponIssueRecord | CouponUsageRecord | UserServiceCardRecord | ServiceCardUsageRecord;

interface UserCouponRecord {
  id: string;
  couponNo: string;
  userName: string;
  mobile: string;
  templateName: string;
  couponType: string;
  sourceType: string;
  sourceBizNo: string;
  status: string;
  receivedAt: string;
  usedAt?: string;
  validStart: string;
  validEnd: string;
  serviceOrderNo?: string;
  lockOrderNo?: string;
  discountAmount: number;
}

interface CouponIssueRecord {
  id: string;
  issueNo: string;
  templateName: string;
  userName: string;
  activityName?: string;
  issueType: string;
  issueStatus: string;
  issuedAt: string;
  failReason?: string;
  operator: string;
}

interface CouponUsageRecord {
  id: string;
  usageNo: string;
  couponNo: string;
  userName: string;
  serviceOrderNo: string;
  writeOffRecordNo: string;
  discountAmount: number;
  usageStatus: string;
  usedAt?: string;
  rollbackAt?: string;
}

interface UserServiceCardRecord {
  id: string;
  cardNo: string;
  userName: string;
  mobile: string;
  cardName: string;
  cardType: string;
  totalTimes: number;
  remainTimes: number;
  validStart: string;
  validEnd: string;
  sourceType: string;
  sourceBizNo: string;
  status: string;
  createdAt: string;
}

interface ServiceCardUsageRecord {
  id: string;
  usageNo: string;
  cardNo: string;
  cardName: string;
  userName: string;
  serviceOrderNo: string;
  writeOffRecordNo: string;
  usedTimes: number;
  remainTimesBefore: number;
  remainTimesAfter: number;
  usedAt: string;
  usageStatus: string;
}

const sourceTypeOptions = [
  { value: 'RECEIVE', label: '主动领取' },
  { value: 'INVITE', label: '邀请奖励' },
  { value: 'RECHARGE', label: '充值赠送' },
  { value: 'BUY', label: '购买' },
  { value: 'ACTIVITY', label: '活动发放' },
  { value: 'BACKEND', label: '后台发放' },
  { value: 'COMPENSATION', label: '售后补偿' },
];

const couponStatusOptions = [
  { value: 'UNUSED', label: '未使用' },
  { value: 'LOCKED', label: '已锁定' },
  { value: 'USED', label: '已使用' },
  { value: 'EXPIRED', label: '已过期' },
  { value: 'RECYCLED', label: '已回收' },
];

const issueStatusOptions = [
  { value: 'SUCCESS', label: '发放成功' },
  { value: 'PENDING', label: '待发放' },
  { value: 'FAILED', label: '发放失败' },
  { value: 'RECYCLED', label: '已回收' },
];

const couponUsageStatusOptions = [
  { value: 'LOCKED', label: '已锁券' },
  { value: 'USED', label: '已核销' },
  { value: 'RELEASED', label: '已释放' },
  { value: 'ROLLBACK', label: '已回滚' },
];

const userCoupons: UserCouponRecord[] = [
  { id: 'uc1', couponNo: 'CP202604180001', userName: '李波', mobile: '138****2451', templateName: '夜洗 5 元券', couponType: 'DIRECT', sourceType: 'RECHARGE', sourceBizNo: 'RCG202604170006', status: 'UNUSED', receivedAt: '2026-04-17 22:12:00', validStart: '2026-04-17 22:12:00', validEnd: '2026-04-24 23:59:59', discountAmount: 5 },
  { id: 'uc2', couponNo: 'CP202604180002', userName: '陈越', mobile: '136****3029', templateName: '首单满减券', couponType: 'FULL_REDUCTION', sourceType: 'INVITE', sourceBizNo: 'INV202604160009', status: 'LOCKED', receivedAt: '2026-04-18 08:10:00', validStart: '2026-04-18 08:10:00', validEnd: '2026-04-25 23:59:59', serviceOrderNo: 'SO202604180020', lockOrderNo: 'SO202604180020', discountAmount: 8 },
  { id: 'uc3', couponNo: 'CP202604150018', userName: '周琪', mobile: '139****8801', templateName: '泡沫精洗体验券', couponType: 'FREE_SERVICE', sourceType: 'COMPENSATION', sourceBizNo: 'CS202604150003', status: 'USED', receivedAt: '2026-04-15 15:42:00', usedAt: '2026-04-16 09:33:00', validStart: '2026-04-15 15:42:00', validEnd: '2026-04-22 23:59:59', serviceOrderNo: 'SO202604160031', discountAmount: 29.9 },
];

const couponIssues: CouponIssueRecord[] = [
  { id: 'ci1', issueNo: 'CPI202604180001', templateName: '夜洗 5 元券', userName: '李波', activityName: '首充礼包', issueType: 'AUTO', issueStatus: 'SUCCESS', issuedAt: '2026-04-17 22:12:00', operator: '系统' },
  { id: 'ci2', issueNo: 'CPI202604180002', templateName: '首单满减券', userName: '陈越', activityName: '邀请好友首单礼', issueType: 'AUTO', issueStatus: 'PENDING', issuedAt: '', operator: '系统' },
  { id: 'ci3', issueNo: 'CPI202604150018', templateName: '泡沫精洗体验券', userName: '周琪', issueType: 'COMPENSATION', issueStatus: 'SUCCESS', issuedAt: '2026-04-15 15:42:00', operator: '客服-刘莎' },
];

const couponUsages: CouponUsageRecord[] = [
  { id: 'cu1', usageNo: 'CPU202604160001', couponNo: 'CP202604150018', userName: '周琪', serviceOrderNo: 'SO202604160031', writeOffRecordNo: 'WO202604160031', discountAmount: 29.9, usageStatus: 'USED', usedAt: '2026-04-16 09:33:00' },
  { id: 'cu2', usageNo: 'CPU202604180002', couponNo: 'CP202604180002', userName: '陈越', serviceOrderNo: 'SO202604180020', writeOffRecordNo: 'WO202604180020', discountAmount: 8, usageStatus: 'LOCKED' },
  { id: 'cu3', usageNo: 'CPU202604170009', couponNo: 'CP202604170006', userName: '赵远', serviceOrderNo: 'SO202604170082', writeOffRecordNo: 'WO202604170082', discountAmount: 5, usageStatus: 'ROLLBACK', usedAt: '2026-04-17 20:10:00', rollbackAt: '2026-04-17 20:18:00' },
];

const userCards: UserServiceCardRecord[] = [
  { id: 'usc1', cardNo: 'SC202604180001', userName: '李波', mobile: '138****2451', cardName: '精洗 10 次卡', cardType: 'COUNT_CARD', totalTimes: 10, remainTimes: 8, validStart: '2026-04-18 00:00:00', validEnd: '2026-07-18 23:59:59', sourceType: 'BUY', sourceBizNo: 'SO202604180011', status: 'USING', createdAt: '2026-04-18 09:10:00' },
  { id: 'usc2', cardNo: 'SC202604170006', userName: '陈越', mobile: '136****3029', cardName: '月卡畅洗包', cardType: 'MONTH_CARD', totalTimes: 30, remainTimes: 30, validStart: '2026-04-17 00:00:00', validEnd: '2026-05-17 23:59:59', sourceType: 'ACTIVITY', sourceBizNo: 'MKT202604170003', status: 'UNUSED', createdAt: '2026-04-17 12:18:00' },
  { id: 'usc3', cardNo: 'SC202603010088', userName: '周琪', mobile: '139****8801', cardName: '基础洗车 5 次卡', cardType: 'COUNT_CARD', totalTimes: 5, remainTimes: 0, validStart: '2026-03-01 00:00:00', validEnd: '2026-05-31 23:59:59', sourceType: 'COMPENSATION', sourceBizNo: 'CS202603010019', status: 'USED_UP', createdAt: '2026-03-01 10:20:00' },
];

const cardUsages: ServiceCardUsageRecord[] = [
  { id: 'scu1', usageNo: 'SCU202604180001', cardNo: 'SC202604180001', cardName: '精洗 10 次卡', userName: '李波', serviceOrderNo: 'SO202604180018', writeOffRecordNo: 'WO202604180018', usedTimes: 1, remainTimesBefore: 10, remainTimesAfter: 9, usedAt: '2026-04-18 09:24:00', usageStatus: 'SUCCESS' },
  { id: 'scu2', usageNo: 'SCU202604180002', cardNo: 'SC202604180001', cardName: '精洗 10 次卡', userName: '李波', serviceOrderNo: 'SO202604180021', writeOffRecordNo: 'WO202604180021', usedTimes: 1, remainTimesBefore: 9, remainTimesAfter: 8, usedAt: '2026-04-18 12:31:00', usageStatus: 'SUCCESS' },
  { id: 'scu3', usageNo: 'SCU202604160008', cardNo: 'SC202603010088', cardName: '基础洗车 5 次卡', userName: '周琪', serviceOrderNo: 'SO202604160044', writeOffRecordNo: 'WO202604160044', usedTimes: 1, remainTimesBefore: 1, remainTimesAfter: 0, usedAt: '2026-04-16 18:03:00', usageStatus: 'SUCCESS' },
];

const couponTypeMap = buildValueEnum(couponTypeOptions);
const sourceTypeMap = buildValueEnum(sourceTypeOptions);
const couponStatusMap = buildValueEnum(couponStatusOptions);
const issueStatusMap = buildValueEnum(issueStatusOptions);
const usageStatusMap = buildValueEnum(couponUsageStatusOptions);
const cardTypeMap = buildValueEnum(serviceCardTypeOptions);
const cardStatusMap = buildValueEnum(serviceCardStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const rewardTypeMap = buildValueEnum(rewardTypeOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const CouponCardDetailManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const filter = <T extends object>(records: T[], fields: Array<keyof T>) =>
    records.filter((record) => containsKeyword(keyword, fields.map((field) => String(record[field] ?? ''))));

  const openGrantModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleGrant = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('补发申请已生成，后续接入后台发放接口');
  };

  const couponColumns = useMemo<ProColumns<UserCouponRecord>[]>(() => [
    { title: '券码', dataIndex: 'couponNo', width: 160, fixed: 'left' },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '手机号', dataIndex: 'mobile', width: 130, search: false },
    { title: '券模板', dataIndex: 'templateName', width: 170 },
    { title: '券类型', dataIndex: 'couponType', width: 130, render: (_, record) => renderStatusTag(record.couponType, couponTypeMap) },
    { title: '来源', dataIndex: 'sourceType', width: 120, render: (_, record) => renderStatusTag(record.sourceType, sourceTypeMap) },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 170 },
    { title: '抵扣金额', dataIndex: 'discountAmount', width: 110, search: false, render: (_, record) => formatAmount(record.discountAmount) },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, couponStatusMap) },
    { title: '领取时间', dataIndex: 'receivedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.receivedAt) },
    { title: '有效期', dataIndex: 'validStart', width: 260, search: false, render: (_, record) => `${formatDateTime(record.validStart)} - ${formatDateTime(record.validEnd)}` },
    { title: '使用订单', dataIndex: 'serviceOrderNo', width: 160, search: false, renderText: (value) => value || '-' },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const issueColumns = useMemo<ProColumns<CouponIssueRecord>[]>(() => [
    { title: '发放单号', dataIndex: 'issueNo', width: 170, fixed: 'left' },
    { title: '券模板', dataIndex: 'templateName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '活动', dataIndex: 'activityName', width: 170, renderText: (value) => value || '-' },
    { title: '发放方式', dataIndex: 'issueType', width: 120, render: (_, record) => renderStatusTag(record.issueType, sourceTypeMap) },
    { title: '状态', dataIndex: 'issueStatus', width: 120, render: (_, record) => renderStatusTag(record.issueStatus, issueStatusMap) },
    { title: '发放时间', dataIndex: 'issuedAt', width: 180, render: (_, record) => formatDateTime(record.issuedAt) },
    { title: '失败原因', dataIndex: 'failReason', width: 180, renderText: (value) => value || '-' },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const usageColumns = useMemo<ProColumns<CouponUsageRecord>[]>(() => [
    { title: '使用流水号', dataIndex: 'usageNo', width: 170, fixed: 'left' },
    { title: '券码', dataIndex: 'couponNo', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '核销流水', dataIndex: 'writeOffRecordNo', width: 170 },
    { title: '抵扣金额', dataIndex: 'discountAmount', width: 110, render: (_, record) => formatAmount(record.discountAmount) },
    { title: '状态', dataIndex: 'usageStatus', width: 120, render: (_, record) => renderStatusTag(record.usageStatus, usageStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '回滚时间', dataIndex: 'rollbackAt', width: 180, render: (_, record) => formatDateTime(record.rollbackAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const cardColumns = useMemo<ProColumns<UserServiceCardRecord>[]>(() => [
    { title: '用户卡号', dataIndex: 'cardNo', width: 170, fixed: 'left' },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '手机号', dataIndex: 'mobile', width: 130 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '卡类型', dataIndex: 'cardType', width: 120, render: (_, record) => renderStatusTag(record.cardType, cardTypeMap) },
    { title: '次数', dataIndex: 'remainTimes', width: 120, renderText: (_, record) => `${record.remainTimes}/${record.totalTimes}` },
    { title: '来源', dataIndex: 'sourceType', width: 120, render: (_, record) => renderStatusTag(record.sourceType, sourceTypeMap) },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 170 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, cardStatusMap) },
    { title: '有效期', dataIndex: 'validStart', width: 260, render: (_, record) => `${formatDateTime(record.validStart)} - ${formatDateTime(record.validEnd)}` },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const cardUsageColumns = useMemo<ProColumns<ServiceCardUsageRecord>[]>(() => [
    { title: '使用流水号', dataIndex: 'usageNo', width: 170, fixed: 'left' },
    { title: '用户卡号', dataIndex: 'cardNo', width: 170 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '核销流水', dataIndex: 'writeOffRecordNo', width: 170 },
    { title: '本次扣次', dataIndex: 'usedTimes', width: 100 },
    { title: '使用前/后', dataIndex: 'remainTimesBefore', width: 120, renderText: (_, record) => `${record.remainTimesBefore} -> ${record.remainTimesAfter}` },
    { title: '状态', dataIndex: 'usageStatus', width: 120, render: (_, record) => renderStatusTag(record.usageStatus, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space>
              <GiftOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div>
                <h2 style={{ margin: 0 }}>用户券卡明细中心</h2>
                <div style={{ color: '#667085' }}>维护用户券库存、发放流水、使用流水、用户服务卡和服务卡扣次记录。</div>
              </div>
            </Space>
          </Col>
          <Col><Button type="primary" icon={<GiftOutlined />} onClick={openGrantModal}>后台补发券卡</Button></Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户券库存" value={userCoupons.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="发券流水" value={couponIssues.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用券流水" value={couponUsages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户服务卡" value={userCards.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="扣次流水" value={cardUsages.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        rowKey="keyword"
        search={false}
        pagination={false}
        options={false}
        dataSource={[]}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入用户、手机号、券码、卡号、订单、活动关键词' } }]}
        toolBarRender={() => [
          <Input.Search
            key="keyword"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => setKeyword(value)}
            placeholder="用户 / 手机号 / 券码 / 卡号 / 订单"
            style={{ width: 320 }}
          />,
        ]}
      />

      <Tabs
        items={[
          { key: 'coupons', label: '用户券库存', children: <ProTable<UserCouponRecord> cardBordered rowKey="id" search={false} columns={couponColumns} dataSource={filter(userCoupons, ['couponNo', 'userName', 'mobile', 'templateName', 'sourceBizNo', 'serviceOrderNo']) as UserCouponRecord[]} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
          { key: 'issues', label: '发券流水', children: <ProTable<CouponIssueRecord> cardBordered rowKey="id" search={false} columns={issueColumns} dataSource={filter(couponIssues, ['issueNo', 'templateName', 'userName', 'activityName', 'operator']) as CouponIssueRecord[]} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'usage', label: '用券流水', children: <ProTable<CouponUsageRecord> cardBordered rowKey="id" search={false} columns={usageColumns} dataSource={filter(couponUsages, ['usageNo', 'couponNo', 'userName', 'serviceOrderNo', 'writeOffRecordNo']) as CouponUsageRecord[]} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'cards', label: '用户服务卡', children: <ProTable<UserServiceCardRecord> cardBordered rowKey="id" search={false} columns={cardColumns} dataSource={filter(userCards, ['cardNo', 'userName', 'mobile', 'cardName', 'sourceBizNo']) as UserServiceCardRecord[]} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
          { key: 'cardUsage', label: '服务卡使用流水', children: <ProTable<ServiceCardUsageRecord> cardBordered rowKey="id" search={false} columns={cardUsageColumns} dataSource={filter(cardUsages, ['usageNo', 'cardNo', 'cardName', 'userName', 'serviceOrderNo', 'writeOffRecordNo']) as ServiceCardUsageRecord[]} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
        ]}
      />

      <Modal title="明细详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>

      <Modal title="后台补发券卡" open={modalVisible} onOk={handleGrant} onCancel={() => setModalVisible(false)} width={760}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="assetType" label="资产类型" rules={[{ required: true, message: '请选择资产类型' }]}><Select options={rewardTypeOptions.filter((item) => ['COUPON', 'CARD'].includes(String(item.value)))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="scopeType" label="发放范围" rules={[{ required: true, message: '请选择发放范围' }]}><Select options={scopeTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="targetUser" label="目标用户" rules={[{ required: true, message: '请输入用户ID或手机号' }]}><Input placeholder="用户ID / 手机号 / 用户标签" /></Form.Item></Col>
            <Col span={12}><Form.Item name="assetCode" label="券模板/卡产品" rules={[{ required: true, message: '请输入券模板或卡产品' }]}><Input placeholder="券模板编码 / 卡产品编码" /></Form.Item></Col>
            <Col span={12}><Form.Item name="sourceType" label="发放来源" rules={[{ required: true, message: '请选择发放来源' }]}><Select options={sourceTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="sourceBizNo" label="来源单号"><Input placeholder="客服工单 / 活动 / 订单号" /></Form.Item></Col>
            <Col span={24}><Form.Item name="remark" label="发放说明" rules={[{ required: true, message: '请输入发放说明' }]}><Input.TextArea rows={3} placeholder="记录补发原因、审批依据和成本承担方" /></Form.Item></Col>
          </Row>
        </Form>
        <div style={{ display: 'none' }}>{renderStatusTag('COUPON', rewardTypeMap)}{renderStatusTag('PLATFORM', scopeMap)}<IdcardOutlined /></div>
      </Modal>
    </Space>
  );
};

export default CouponCardDetailManagement;
