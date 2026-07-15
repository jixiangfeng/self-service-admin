import React, { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { ContactsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  riskStatusOptions,
  userLevelOptions,
  yesNoTextOptions,
} from '@/constants/businessCatalog';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, formatEnumText } from '@/pages/Business/shared';
import UserAssetFullProfileDrawer from './UserAssetFullProfileDrawer';
import api from '@/services/backendService';
import type {
  AppUserFullProfileRecord,
  AppUserProfileRecord,
  UserRiskRecord,
  UserVehicleRecord,
} from '@/services/backendService';

const userLevelMap = buildValueEnum(userLevelOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const defaultFlagFormOptions = yesNoTextOptions.filter((item) => ['YES', 'NO'].includes(String(item.value)));
const defaultFlagMap = buildValueEnum(defaultFlagFormOptions);

const profileSceneOptions = [
  { value: '资料补全', label: '资料补全' },
  { value: '客服修正', label: '客服修正' },
  { value: '会员升级', label: '会员升级' },
  { value: '风控处置', label: '风控处置' },
];
const profileHandleOptions = [
  { value: '新增档案', label: '新增档案' },
  { value: '更新标签', label: '更新标签' },
  { value: '加入观察', label: '加入观察' },
  { value: '解除限制', label: '解除限制' },
  { value: '补充车辆', label: '补充车辆' },
];
const vehicleTypeOptions = [
  { value: '轿车', label: '轿车' },
  { value: 'SUV', label: 'SUV' },
  { value: 'MPV', label: 'MPV' },
  { value: '新能源', label: '新能源' },
  { value: '商用车', label: '商用车' },
];
const colorOptions = ['黑色', '白色', '银色', '灰色', '红色', '蓝色', '其他'].map((value) => ({ value, label: value }));
const riskSceneOptions = [
  { value: '异常下单', label: '异常下单' },
  { value: '频繁退款', label: '频繁退款' },
  { value: '疑似套券', label: '疑似套券' },
  { value: '高频改价', label: '高频改价' },
  { value: '客服投诉', label: '客服投诉' },
];
const riskReasonOptions = [
  { value: '短时间多次异常交易', label: '短时间多次异常交易' },
  { value: '退款比例超过运营阈值', label: '退款比例超过运营阈值' },
  { value: '优惠券使用行为异常', label: '优惠券使用行为异常' },
  { value: '客服确认需要观察', label: '客服确认需要观察' },
];
const approvalOptions = [
  { value: '无需审批', label: '无需审批' },
  { value: '客服主管已确认', label: '客服主管已确认' },
  { value: '风控负责人已确认', label: '风控负责人已确认' },
];
const notifyOptions = [
  { value: '不通知', label: '不通知' },
  { value: '短信通知', label: '短信通知' },
  { value: '客服跟进', label: '客服跟进' },
];

const buildProfileSummary = (values: Record<string, unknown>) => [
  values.businessScene ? `业务场景：${values.businessScene}` : '',
  values.handleMethod ? `处理方式：${values.handleMethod}` : '',
  Array.isArray(values.profileTags) && values.profileTags.length ? `用户标签：${values.profileTags.join('、')}` : '',
  values.notifyUser ? `通知用户：${values.notifyUser}` : '',
  values.approvalRequired ? `审批要求：${values.approvalRequired}` : '',
  values.ticketNo ? `关联工单：${values.ticketNo}` : '',
  values.operatorNote ? `补充说明：${values.operatorNote}` : '',
].filter(Boolean).join('；');

const profileDetailFields: Record<'profile' | 'vehicle' | 'risk', DetailField<any>[]> = {
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
  const [detail, setDetail] = useState<AppUserProfileRecord | UserVehicleRecord | UserRiskRecord | null>(null);
  const [fullProfileVisible, setFullProfileVisible] = useState(false);
  const [fullProfileLoading, setFullProfileLoading] = useState(false);
  const [fullProfile, setFullProfile] = useState<AppUserFullProfileRecord | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<Record<string, unknown>>();
  const profileQuery = useQuery({ queryKey: ['appUserProfiles', keyword], queryFn: async () => (await api.asset.profiles.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const vehicleQuery = useQuery({ queryKey: ['userVehicles', keyword], queryFn: async () => (await api.asset.vehicles.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const riskQuery = useQuery({ queryKey: ['userRiskRecords', keyword], queryFn: async () => (await api.asset.riskRecords.page({ pageNum: 1, pageSize: 200, keyword })).data });
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const summary = buildProfileSummary(values);
      const payload = { ...values, remark: summary || values.remark };
      if (modalTitle.includes('车辆')) return api.asset.vehicles.add(payload);
      if (modalTitle.includes('风控')) {
        return api.asset.riskRecords.add({
          ...payload,
          riskReason: [values.riskReasonTemplate, values.riskAction, summary].filter(Boolean).join('；'),
        });
      }
      return api.asset.profiles.add(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['userRiskRecords'] });
      message.success('保存成功');
    },
  });
  const profiles = profileQuery.data?.records || [];
  const vehicles = vehicleQuery.data?.records || [];
  const userRisks = riskQuery.data?.records || [];
  const userOptions = profiles.map((item) => ({ value: item.userId ?? item.id, label: `${item.userName}${item.mobile ? `（${item.mobile}）` : ''}` }));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const openFullProfile = async (record: AppUserProfileRecord) => {
    setFullProfileVisible(true);
    setFullProfileLoading(true);
    try {
      const response = await api.asset.profiles.fullProfile(record.id);
      setFullProfile(response.data);
    } finally {
      setFullProfileLoading(false);
    }
  };

  const closeFullProfile = () => {
    setFullProfileVisible(false);
    setFullProfile(undefined);
  };

  const profileColumns = useMemo<ProColumns<AppUserProfileRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '手机号', dataIndex: 'mobile', width: 150 },
    { title: '会员等级', dataIndex: 'memberLevel', width: 120, render: (_, record) => renderStatusTag(record.memberLevel, userLevelMap) },
    { title: '实名状态', dataIndex: 'realNameStatus', width: 120 , render: (value) => formatEnumText(value, 'realNameStatus', '实名状态') },
    { title: '风控状态', dataIndex: 'riskStatus', width: 120, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    { title: '注册时间', dataIndex: 'registeredAt', width: 180, render: (_, record) => formatDateTime(record.registeredAt) },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => openFullProfile(record)}>完整档案</Button>
          <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        </>
      ),
    },
  ], []);

  const vehicleColumns = useMemo<ProColumns<UserVehicleRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '车牌号', dataIndex: 'plateNo', width: 130 },
    { title: '车辆类型', dataIndex: 'vehicleType', width: 120 , render: (value) => formatEnumText(value, 'vehicleType', '车辆类型') },
    { title: '品牌', dataIndex: 'brand', width: 120 },
    { title: '颜色', dataIndex: 'color', width: 100 },
    { title: '默认车辆', dataIndex: 'defaultFlag', width: 110 , render: (_, record) => renderStatusTag(record.defaultFlag, defaultFlagMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  const riskColumns = useMemo<ProColumns<UserRiskRecord>[]>(() => [
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '风控场景', dataIndex: 'riskScene', width: 150 , render: (value) => formatEnumText(value, 'riskScene', '风控场景') },
    { title: '原因', dataIndex: 'riskReason', width: 220 },
    { title: '关联单号', dataIndex: 'relatedNo', width: 160 },
    { title: '状态', dataIndex: 'riskStatus', width: 120, render: (_, record) => renderStatusTag(record.riskStatus, riskStatusMap) },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="用户档案中心" subtitle="维护用户基础档案、车辆和风控记录；服务卡信息仅在用户完整档案中作为关联资产查看。" icon={<ContactsOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="用户档案" value={profiles.length} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="车辆" value={vehicles.length} suffix="辆" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="观察名单" value={userRisks.filter((item) => item.riskStatus === 'WATCH').length} suffix="人" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="输入用户、手机号、车牌、门店或风控关键词"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'profile', label: '用户档案', children: <ProTable<AppUserProfileRecord> cardBordered rowKey="id" columns={profileColumns} dataSource={profiles} loading={profileQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="tag" type="primary" onClick={() => openModal('维护用户档案')}>维护档案</Button>]} /> },
          { key: 'vehicle', label: '用户车辆', children: <ProTable<UserVehicleRecord> cardBordered rowKey="id" columns={vehicleColumns} dataSource={vehicles} loading={vehicleQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增用户车辆')}>新增车辆</Button>]} /> },
          { key: 'risk', label: '用户风控', children: <ProTable<UserRiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={userRisks} loading={riskQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理用户风控')}>处理风控</Button>]} /> },
        ]}
      />

      <UserAssetFullProfileDrawer
        open={fullProfileVisible}
        loading={fullProfileLoading}
        profile={fullProfile}
        onClose={closeFullProfile}
      />

      <BusinessDetailModal title="用户档案详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('plateNo' in detail ? profileDetailFields.vehicle : 'riskScene' in detail ? profileDetailFields.risk : profileDetailFields.profile) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={modalTitle.includes('车辆') ? '用户车辆维护' : modalTitle.includes('风控') ? '用户风控处理' : '用户档案维护'}
        title={modalTitle}
        subtitle="补齐用户档案、车辆和风控处理字段，保证处理结果可追踪、可回写。"
        meta={[modalTitle]}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await saveMutation.mutateAsync(values);
          setModalVisible(false);
        }}
        width={760}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<ContactsOutlined />} title="用户基础" desc="用户档案、车辆和风控记录共用的识别字段，先把主体确认清楚。">
              <div className="merchant-editor-fields">
                {modalTitle.includes('档案') ? (
                  <>
                    <Form.Item name="userName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input placeholder="用户姓名" /></Form.Item>
                    <Form.Item name="mobile" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}><Input placeholder="手机号" /></Form.Item>
                  </>
                ) : (
                  <>
                    <Form.Item name="userId" label="用户" rules={[{ required: true, message: '请选择用户' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={userOptions}
                        placeholder="请选择用户"
                        onChange={(value) => {
                          const user = profiles.find((item) => (item.userId ?? item.id) === value);
                          form.setFieldsValue({ userName: user?.userName, mobile: user?.mobile, memberLevel: user?.memberLevel, riskStatus: user?.riskStatus });
                        }}
                      />
                    </Form.Item>
                    <Form.Item name="userName" hidden><Input /></Form.Item>
                    <Form.Item name="mobile" label="手机号"><Input disabled placeholder="选择用户后自动带出" /></Form.Item>
                  </>
                )}
                <Form.Item name="memberLevel" label="会员等级"><Select options={userLevelOptions} placeholder="请选择会员等级" /></Form.Item>
                <Form.Item name="riskStatus" label="风控状态"><Select options={riskStatusOptions} placeholder="请选择风控状态" /></Form.Item>
              </div>
            </BusinessEditorSection>

            {modalTitle.includes('车辆') ? (
              <BusinessEditorSection icon={<ContactsOutlined />} title="车辆信息" desc="补齐车牌和车辆描述，形成用户车辆档案闭环。">
                <div className="merchant-editor-fields">
                  <Form.Item name="plateNo" label="车牌号"><Input placeholder="例如：沪A12345" /></Form.Item>
                  <Form.Item name="vehicleType" label="车辆类型"><Select options={vehicleTypeOptions} placeholder="请选择车辆类型" /></Form.Item>
                  <Form.Item name="brand" label="品牌"><Input placeholder="填写品牌名称" /></Form.Item>
                  <Form.Item name="color" label="颜色"><Select options={colorOptions} placeholder="请选择车身颜色" /></Form.Item>
                  <Form.Item name="defaultFlag" label="默认车辆" initialValue="NO"><Select options={defaultFlagFormOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {modalTitle.includes('风控') ? (
              <BusinessEditorSection icon={<ContactsOutlined />} title="风控处理" desc="记录风控场景、原因、关联单号和责任人，便于后续追踪。">
                <div className="merchant-editor-fields">
                  <Form.Item name="riskScene" label="风控场景" rules={[{ required: true, message: '请选择风控场景' }]}><Select options={riskSceneOptions} placeholder="请选择风控场景" /></Form.Item>
                  <Form.Item name="relatedNo" label="关联单号"><Input placeholder="订单号 / 工单号" /></Form.Item>
                  <Form.Item name="owner" label="负责人"><Input placeholder="处理人或责任人" /></Form.Item>
                  <Form.Item name="riskReasonTemplate" label="触发原因"><Select options={riskReasonOptions} placeholder="请选择触发原因" /></Form.Item>
                  <Form.Item name="riskAction" label="处理动作"><Select options={[{ value: '加入观察名单', label: '加入观察名单' }, { value: '限制资产操作', label: '限制资产操作' }, { value: '解除观察', label: '解除观察' }, { value: '转客服跟进', label: '转客服跟进' }]} /></Form.Item>
                  <Form.Item name="notifyUser" label="通知用户" initialValue="不通知"><Select options={notifyOptions} /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            <BusinessEditorSection icon={<ContactsOutlined />} title="处理说明" desc="所有新增和处理动作都保留备注，方便审计和客服回溯。">
              <div className="merchant-editor-fields">
                <Form.Item name="businessScene" label="业务场景" initialValue={modalTitle.includes('风控') ? '风控处置' : modalTitle.includes('车辆') ? '资料补全' : '客服修正'}><Select options={profileSceneOptions} /></Form.Item>
                <Form.Item name="handleMethod" label="处理方式" initialValue={modalTitle.includes('车辆') ? '补充车辆' : '更新标签'}><Select options={profileHandleOptions} /></Form.Item>
                <Form.Item name="profileTags" label="用户标签"><Checkbox.Group options={['高价值用户', '待观察', '售后处理中', '活跃用户', '沉默用户']} /></Form.Item>
                <Form.Item name="approvalRequired" label="审批要求" initialValue="客服主管已确认"><Select options={approvalOptions} /></Form.Item>
                <Form.Item name="ticketNo" label="关联单号"><Input placeholder="订单号 / 审批单，可选" /></Form.Item>
                <Form.Item name="operatorNote" label="补充说明"><Input placeholder="填写必要的补充说明" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default UserProfileManagement;
