import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ContactsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  riskStatusOptions,
  userLevelOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type {
  AppUserProfileRecord,
  ServiceCardUsageRecord,
  UserFavoriteStoreRecord,
  UserRiskRecord,
  UserVehicleRecord,
} from '@/services/backendService';

const userLevelMap = buildValueEnum(userLevelOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);

const profileDetailFields: Record<'profile' | 'vehicle' | 'store' | 'usage' | 'risk', DetailField<any>[]> = {
  profile: [
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'memberLevel', label: '会员等级' },
    { name: 'realNameStatus', label: '实名状态' },
    { name: 'riskStatus', label: '风控状态' },
    { name: 'registeredAt', label: '注册时间', render: (value) => formatDateTime(value) },
    { name: 'remark', label: '备注' },
  ],
  vehicle: [
    { name: 'userName', label: '用户' },
    { name: 'plateNo', label: '车牌号' },
    { name: 'vehicleType', label: '车辆类型' },
    { name: 'brand', label: '品牌' },
    { name: 'color', label: '颜色' },
    { name: 'defaultFlag', label: '默认车辆' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  store: [
    { name: 'userName', label: '用户' },
    { name: 'storeName', label: '常用门店' },
    { name: 'city', label: '城市' },
    { name: 'lastOrderNo', label: '最近订单' },
    { name: 'orderCount', label: '订单数' },
    { name: 'lastVisitAt', label: '最近到店', render: (value) => formatDateTime(value) },
  ],
  usage: [
    { name: 'usageNo', label: '使用流水' },
    { name: 'cardName', label: '卡名称' },
    { name: 'userName', label: '用户' },
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'storeName', label: '门店' },
    { name: 'deductCount', label: '扣减次数' },
    { name: 'status', label: '状态' },
    { name: 'usedAt', label: '使用时间', render: (value) => formatDateTime(value) },
  ],
  risk: [
    { name: 'userName', label: '用户' },
    { name: 'mobile', label: '手机号' },
    { name: 'riskScene', label: '风控场景' },
    { name: 'riskReason', label: '原因' },
    { name: 'relatedNo', label: '关联单号' },
    { name: 'riskStatus', label: '状态' },
    { name: 'owner', label: '负责人' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const UserProfileManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<AppUserProfileRecord | UserVehicleRecord | UserFavoriteStoreRecord | ServiceCardUsageRecord | UserRiskRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const profileQuery = useQuery({ queryKey: ['appUserProfiles', keyword], queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const vehicleQuery = useQuery({ queryKey: ['userVehicles', keyword], queryFn: async () => (await api.asset.vehicles.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const storeQuery = useQuery({ queryKey: ['userFavoriteStores', keyword], queryFn: async () => (await api.asset.favoriteStores.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const cardUsageQuery = useQuery({ queryKey: ['profileServiceCardUsages', keyword], queryFn: async () => (await api.asset.serviceCardUsages.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const riskQuery = useQuery({ queryKey: ['userRiskRecords', keyword], queryFn: async () => (await api.asset.riskRecords.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (modalTitle.includes('车辆')) return api.asset.vehicles.add(values);
      if (modalTitle.includes('风控')) return api.asset.riskRecords.add(values);
      return api.asset.profiles.add(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['userRiskRecords'] });
      message.success('保存成功');
    },
  });
  const rollbackUsageMutation = useMutation({
    mutationFn: async (id: number) => api.asset.serviceCardUsages.rollback(id, { remark: '用户档案中心人工回滚' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileServiceCardUsages'] });
      message.success('服务卡使用已回滚');
    },
  });

  const profiles = profileQuery.data?.records || [];
  const vehicles = vehicleQuery.data?.records || [];
  const favoriteStores = storeQuery.data?.records || [];
  const cardUsages = cardUsageQuery.data?.records || [];
  const userRisks = riskQuery.data?.records || [];

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const profileColumns = useMemo<ProColumns<AppUserProfileRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 150 },
    { title: '会员等级', dataIndex: 'memberLevel', width: 120, render: (_, record) => renderStatusTag(record.memberLevel, userLevelMap) },
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120 },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, render: (_, record) => formatDateTime(record.registeredAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const vehicleColumns = useMemo<ProColumns<UserVehicleRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '车牌号', dataIndex: 'plateNo', width: 130 },
    { title: '车辆类型', dataIndex: 'vehicleType', width: 120 },
    { title: '品牌', dataIndex: 'brand', width: 120 },
    { title: '颜色', dataIndex: 'color', width: 100 },
    { title: '默认车辆', dataIndex: 'defaultFlag', width: 110 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const storeColumns = useMemo<ProColumns<UserFavoriteStoreRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '常用门店', dataIndex: 'storeName', width: 180 },
    { title: '城市', dataIndex: 'city', width: 100 },
    { title: '最近订单', dataIndex: 'lastOrderNo', width: 180 },
    { title: '订单数', dataIndex: 'orderCount', width: 100 },
    { title: '最近到店', dataIndex: 'lastVisitAt', width: 180, render: (_, record) => formatDateTime(record.lastVisitAt) },
  ], []);

  const cardUsageColumns = useMemo<ProColumns<ServiceCardUsageRecord>[]>(() => [
    { title: '使用流水', dataIndex: 'usageNo', width: 180 },
    { title: '卡名称', dataIndex: 'cardName', width: 160 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 180 },
    { title: '门店', dataIndex: 'storeName', width: 180 },
    { title: '扣减次数', dataIndex: 'deductCount', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '使用时间', dataIndex: 'usedAt', width: 180, render: (_, record) => formatDateTime(record.usedAt) },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button size="small" type="link" loading={rollbackUsageMutation.isPending} onClick={() => rollbackUsageMutation.mutate(record.id)}>回滚</Button>
        </>
      ),
    },
  ], [rollbackUsageMutation]);

  const riskColumns = useMemo<ProColumns<UserRiskRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '风控场景', dataIndex: 'riskScene', width: 150 },
    { title: '原因', dataIndex: 'riskReason', width: 220 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 160 },
    { title: '状态', dataIndex: 'riskStatus', width: 120, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="用户档案中心" subtitle="维护用户档案、车辆、常用门店、服务卡使用流水和用户风控记录。" icon={<ContactsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="用户档案" value={profiles.length} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="车辆" value={vehicles.length} suffix="辆" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="服务卡使用" value={cardUsages.length} suffix="次" /></Card></Col>
        <Col xs={24} sm={12} xl={5}><Card><Statistic title="观察名单" value={userRisks.filter((item) => item.riskStatus === 'WATCH').length} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="核销次数" value={cardUsages.reduce((sum, item) => sum + Number(item.deductCount || 0), 0)} suffix="次" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入用户、手机号、车牌、门店、卡流水、风控关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'profile', label: '用户档案', children: <ProTable<AppUserProfileRecord> cardBordered rowKey="id" columns={profileColumns} dataSource={profiles} loading={profileQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="tag" type="primary" onClick={() => openModal('维护用户档案')}>维护档案</Button>]} /> },
          { key: 'vehicle', label: '用户车辆', children: <ProTable<UserVehicleRecord> cardBordered rowKey="id" columns={vehicleColumns} dataSource={vehicles} loading={vehicleQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增用户车辆')}>新增车辆</Button>]} /> },
          { key: 'store', label: '常用门店', children: <ProTable<UserFavoriteStoreRecord> cardBordered rowKey="id" columns={storeColumns} dataSource={favoriteStores} loading={storeQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'cardUsage', label: '服务卡使用', children: <ProTable<ServiceCardUsageRecord> cardBordered rowKey="id" columns={cardUsageColumns} dataSource={cardUsages} loading={cardUsageQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1460 }} toolBarRender={() => [<Button key="rollback" type="primary" disabled={!cardUsages.length} onClick={() => rollbackUsageMutation.mutate(cardUsages[0].id)}>回滚使用</Button>]} /> },
          { key: 'risk', label: '用户风控', children: <ProTable<UserRiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={userRisks} loading={riskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理用户风控')}>处理风控</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('plateNo' in detail ? profileDetailFields.vehicle : 'storeName' in detail && 'lastOrderNo' in detail ? profileDetailFields.store : 'usageNo' in detail ? profileDetailFields.usage : 'riskScene' in detail ? profileDetailFields.risk : profileDetailFields.profile) as DetailField<Record<string, any>>[]}
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
          await saveMutation.mutateAsync(values);
          setModalVisible(false);
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="userName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input /></Form.Item>
            <Form.Item name="mobile" label="手机号"><Input /></Form.Item>
            <Form.Item name="plateNo" label="车牌号"><Input /></Form.Item>
            <Form.Item name="riskScene" label="风控场景"><Input /></Form.Item>
            <Form.Item name="riskStatus" label="风控状态"><Select options={riskStatusOptions} /></Form.Item>
            <Form.Item name="memberLevel" label="会员等级"><Select options={userLevelOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserProfileManagement;
