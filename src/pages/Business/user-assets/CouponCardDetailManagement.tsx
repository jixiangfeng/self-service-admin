import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
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
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { CouponIssueRecord, CouponUsageRecord, ServiceCardUsageRecord, UserCouponRecord, UserServiceCardRecord } from '@/services/backendService';

type DetailRecord = UserCouponRecord | CouponIssueRecord | CouponUsageRecord | UserCardViewRecord | CardUsageViewRecord;

type UserCardViewRecord = UserServiceCardRecord & {
  mobile?: string;
  cardType?: string;
  validStart?: string;
  validEnd?: string;
  sourceType?: string;
};

type CardUsageViewRecord = ServiceCardUsageRecord & {
  writeOffRecordNo?: string;
  usedTimes?: number;
  remainTimesBefore?: number;
  remainTimesAfter?: number;
  usageStatus?: string;
};

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

const couponCardDetailFields: Record<'coupon' | 'issue' | 'usage' | 'card' | 'cardUsage', DetailField<any>[]> = {
  coupon: [
    { name: 'couponNo', label: '券码' },
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'templateName', label: '券模板' },
    { name: 'couponType', label: '券类型' },
    { name: 'sourceType', label: '来源' },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'discountAmount', label: '抵扣金额', render: (value) => formatAmount(value) },
    { name: 'status', label: '状态' },
    { name: 'receivedAt', label: '领取时间', render: (value) => formatDateTime(value) },
    { name: 'validStart', label: '有效期开始', render: (value) => formatDateTime(value) },
    { name: 'validEnd', label: '有效期结束', render: (value) => formatDateTime(value) },
    { name: 'serviceOrderNo', label: '使用订单' },
  ],
  issue: [
    { name: 'issueNo', label: '发放单号' },
    { name: 'templateName', label: '券模板' },
    { name: 'userName', label: '用户' },
    { name: 'activityName', label: '活动' },
    { name: 'issueType', label: '发放方式' },
    { name: 'issueStatus', label: '状态' },
    { name: 'issuedAt', label: '发放时间', render: (value) => formatDateTime(value) },
    { name: 'failReason', label: '失败原因' },
    { name: 'operator', label: '操作人' },
  ],
  usage: [
    { name: 'usageNo', label: '使用流水号' },
    { name: 'couponNo', label: '券码' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'writeOffRecordNo', label: '核销流水' },
    { name: 'discountAmount', label: '抵扣金额', render: (value) => formatAmount(value) },
    { name: 'usageStatus', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
    { name: 'rollbackAt', label: '回滚时间', render: (value) => formatDateTime(value) },
  ],
  card: [
    { name: 'cardNo', label: '用户卡号' },
    { name: 'userName', label: '用户' },
    { name: 'phone', label: '手机号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'cardType', label: '卡类型' },
    { name: 'remainTimes', label: '剩余次数' },
    { name: 'totalTimes', label: '总次数' },
    { name: 'sourceBizNo', label: '来源单号' },
    { name: 'status', label: '状态' },
    { name: 'validFrom', label: '有效期开始', render: (value) => formatDateTime(value) },
    { name: 'validTo', label: '有效期结束', render: (value) => formatDateTime(value) },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
  ],
  cardUsage: [
    { name: 'usageNo', label: '使用流水号' },
    { name: 'cardNo', label: '用户卡号' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'useTimes', label: '本次扣次' },
    { name: 'deductCount', label: '扣减次数' },
    { name: 'status', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
  ],
};

const CouponCardDetailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const couponQuery = useQuery({
    queryKey: ['userCoupons', keyword],
    queryFn: async () => (await api.asset.userCoupons.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const issueQuery = useQuery({
    queryKey: ['couponIssues', keyword],
    queryFn: async () => (await api.asset.couponIssues.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const usageQuery = useQuery({
    queryKey: ['couponUsages', keyword],
    queryFn: async () => (await api.asset.couponUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const cardQuery = useQuery({
    queryKey: ['couponCardDetailUserServiceCards', keyword],
    queryFn: async () => (await api.asset.userServiceCards.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const cardUsageQuery = useQuery({
    queryKey: ['couponCardDetailServiceCardUsages', keyword],
    queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const userCards = cardQuery.data?.records ?? [];
  const cardUsages = cardUsageQuery.data?.records ?? [];
  const userCoupons = couponQuery.data?.records ?? [];
  const couponIssues = issueQuery.data?.records ?? [];
  const couponUsages = usageQuery.data?.records ?? [];

  const grantMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (values.assetType === 'CARD') {
        return api.asset.serviceCards.issue(Number(values.assetId), values);
      }
      return api.asset.userCoupons.add({
        templateId: values.assetId,
        templateName: values.assetCode,
        couponType: values.couponType || 'DIRECT',
        userName: values.targetUser,
        mobile: values.mobile || values.targetUser,
        sourceType: values.sourceType,
        sourceBizNo: values.sourceBizNo,
        discountAmount: values.discountAmount || 0,
        remark: values.remark,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCoupons'] });
      queryClient.invalidateQueries({ queryKey: ['couponIssues'] });
      queryClient.invalidateQueries({ queryKey: ['couponCardDetailUserServiceCards'] });
      message.success('券卡已补发');
    },
  });

  const filter = <T extends object>(records: T[], fields: Array<keyof T>) =>
    records.filter((record) => containsKeyword(keyword, fields.map((field) => String(record[field] ?? ''))));

  const openGrantModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleGrant = async () => {
    const values = await form.validateFields();
    await grantMutation.mutateAsync(values);
    setModalVisible(false);
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
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>, <a key="recycle" onClick={async () => { await api.asset.userCoupons.recycle(Number(record.id), { remark: '后台回收' }); queryClient.invalidateQueries({ queryKey: ['userCoupons'] }); queryClient.invalidateQueries({ queryKey: ['couponIssues'] }); message.success('已回收'); }}>回收</a>] },
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
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>, <a key="rollback" onClick={async () => { if (record.userCouponId) await api.asset.userCoupons.rollback(Number(record.userCouponId), { remark: '后台用券回滚' }); queryClient.invalidateQueries({ queryKey: ['userCoupons'] }); queryClient.invalidateQueries({ queryKey: ['couponUsages'] }); message.success('已回滚'); }}>回滚</a>] },
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

  const cardColumns = useMemo<ProColumns<UserCardViewRecord>[]>(() => [
    { title: '用户卡号', dataIndex: 'cardNo', width: 170, fixed: 'left' },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '卡类型', dataIndex: 'cardType', width: 120, render: (_, record) => renderStatusTag(record.cardType, cardTypeMap) },
    { title: '次数', dataIndex: 'remainTimes', width: 120, renderText: (_, record) => `${record.remainTimes}/${record.totalTimes}` },
    { title: '来源单号', dataIndex: 'sourceBizNo', width: 170 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, cardStatusMap) },
    { title: '有效期', dataIndex: 'validFrom', width: 260, render: (_, record) => `${formatDateTime(record.validFrom)} - ${formatDateTime(record.validTo)}` },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 90, fixed: 'right', render: (_, record) => [<a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const cardUsageColumns = useMemo<ProColumns<CardUsageViewRecord>[]>(() => [
    { title: '使用流水号', dataIndex: 'usageNo', width: 170, fixed: 'left' },
    { title: '用户卡号', dataIndex: 'cardNo', width: 170 },
    { title: '卡名称', dataIndex: 'cardName', width: 170 },
    { title: '用户', dataIndex: 'userName', width: 110 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170 },
    { title: '门店', dataIndex: 'storeName', width: 170 },
    { title: '本次扣次', dataIndex: 'useTimes', width: 100 },
    { title: '扣减次数', dataIndex: 'deductCount', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
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
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户券库存" value={couponQuery.data?.total ?? userCoupons.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="发券流水" value={issueQuery.data?.total ?? couponIssues.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用券流水" value={usageQuery.data?.total ?? couponUsages.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户服务卡" value={cardQuery.data?.total ?? userCards.length} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="扣次流水" value={cardUsageQuery.data?.total ?? cardUsages.length} suffix="条" /></Card></Col>
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
          { key: 'coupons', label: '用户券库存', children: <ProTable<UserCouponRecord> cardBordered rowKey="id" search={false} columns={couponColumns} dataSource={filter(userCoupons, ['couponNo', 'userName', 'mobile', 'templateName', 'sourceBizNo', 'serviceOrderNo']) as UserCouponRecord[]} loading={couponQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1760 }} /> },
          { key: 'issues', label: '发券流水', children: <ProTable<CouponIssueRecord> cardBordered rowKey="id" search={false} columns={issueColumns} dataSource={filter(couponIssues, ['issueNo', 'templateName', 'userName', 'activityName', 'operator']) as CouponIssueRecord[]} loading={issueQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} /> },
          { key: 'usage', label: '用券流水', children: <ProTable<CouponUsageRecord> cardBordered rowKey="id" search={false} columns={usageColumns} dataSource={filter(couponUsages, ['usageNo', 'couponNo', 'userName', 'serviceOrderNo', 'writeOffRecordNo']) as CouponUsageRecord[]} loading={usageQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1460 }} /> },
          { key: 'cards', label: '用户服务卡', children: <ProTable<UserCardViewRecord> cardBordered rowKey="id" search={false} columns={cardColumns} dataSource={userCards as UserCardViewRecord[]} loading={cardQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
          { key: 'cardUsage', label: '服务卡使用流水', children: <ProTable<CardUsageViewRecord> cardBordered rowKey="id" search={false} columns={cardUsageColumns} dataSource={cardUsages as CardUsageViewRecord[]} loading={cardUsageQuery.isLoading} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} /> },
        ]}
      />

      <Modal title="明细详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('couponNo' in detail && 'receivedAt' in detail ? couponCardDetailFields.coupon : 'issueNo' in detail ? couponCardDetailFields.issue : 'couponNo' in detail ? couponCardDetailFields.usage : 'usageNo' in detail ? couponCardDetailFields.cardUsage : couponCardDetailFields.card) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </Modal>

      <Modal title="后台补发券卡" open={modalVisible} onOk={handleGrant} onCancel={() => setModalVisible(false)} width={760}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="assetType" label="资产类型" rules={[{ required: true, message: '请选择资产类型' }]}><Select options={rewardTypeOptions.filter((item) => ['COUPON', 'CARD'].includes(String(item.value)))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="scopeType" label="发放范围" rules={[{ required: true, message: '请选择发放范围' }]}><Select options={scopeTypeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="targetUser" label="目标用户" rules={[{ required: true, message: '请输入用户或手机号' }]}><Input placeholder="用户姓名 / 手机号" /></Form.Item></Col>
            <Col span={12}><Form.Item name="mobile" label="手机号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="assetId" label="券模板/卡产品ID" rules={[{ required: true, message: '请输入券模板或卡产品ID' }]}><Input placeholder="券模板ID / 卡产品ID" /></Form.Item></Col>
            <Col span={12}><Form.Item name="assetCode" label="券模板/卡产品名称" rules={[{ required: true, message: '请输入券模板或卡产品名称' }]}><Input placeholder="券模板名称 / 卡产品名称" /></Form.Item></Col>
            <Col span={12}><Form.Item name="discountAmount" label="抵扣金额"><Input /></Form.Item></Col>
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
