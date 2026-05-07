import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { ContactsOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  riskStatusOptions,
  serviceCardStatusOptions,
  userLevelOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface UserProfileRecord {
  id: string;
  userName: string;
  mobile: string;
  memberLevel: string;
  realNameStatus: string;
  riskStatus: string;
  registeredAt: string;
}

interface UserVehicleRecord {
  id: string;
  userName: string;
  plateNo: string;
  vehicleType: string;
  brand: string;
  color: string;
  defaultFlag: string;
  updatedAt: string;
}

interface FavoriteStoreRecord {
  id: string;
  userName: string;
  storeName: string;
  city: string;
  lastOrderNo: string;
  orderCount: number;
  lastVisitAt: string;
}

interface ServiceCardUsageRecord {
  id: string;
  usageNo: string;
  cardName: string;
  userName: string;
  serviceOrderNo: string;
  storeName: string;
  deductCount: number;
  status: string;
  usedAt: string;
}

interface UserRiskRecord {
  id: string;
  userName: string;
  riskScene: string;
  riskReason: string;
  relatedNo: string;
  riskStatus: string;
  owner: string;
  updatedAt: string;
}

const userLevelMap = buildValueEnum(userLevelOptions);
const riskStatusMap = buildValueEnum(riskStatusOptions);
const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);

const profiles: UserProfileRecord[] = [
  { id: 'u1', userName: '张晨', mobile: '13800001111', memberLevel: 'MEMBER', realNameStatus: '已实名', riskStatus: 'NORMAL', registeredAt: '2026-03-01 10:00:00' },
  { id: 'u2', userName: '陈越', mobile: '13800002222', memberLevel: 'NORMAL', realNameStatus: '未实名', riskStatus: 'WATCH', registeredAt: '2026-04-10 21:30:00' },
];

const vehicles: UserVehicleRecord[] = [
  { id: 'v1', userName: '张晨', plateNo: '沪A8K219', vehicleType: '轿车', brand: '特斯拉', color: '白色', defaultFlag: '默认', updatedAt: '2026-04-18 09:10:00' },
  { id: 'v2', userName: '陈越', plateNo: '沪B6M120', vehicleType: 'SUV', brand: '比亚迪', color: '黑色', defaultFlag: '非默认', updatedAt: '2026-04-17 20:15:00' },
];

const favoriteStores: FavoriteStoreRecord[] = [
  { id: 'fs1', userName: '张晨', storeName: '虹桥旗舰洗车站', city: '上海', lastOrderNo: 'SO202604180019', orderCount: 12, lastVisitAt: '2026-04-18 09:30:00' },
  { id: 'fs2', userName: '陈越', storeName: '徐汇夜洗门店', city: '上海', lastOrderNo: 'SO202604170113', orderCount: 4, lastVisitAt: '2026-04-17 22:15:00' },
];

const cardUsages: ServiceCardUsageRecord[] = [
  { id: 'cu1', usageNo: 'SCU202604180001', cardName: '精洗 10 次卡', userName: '张晨', serviceOrderNo: 'SO202604180019', storeName: '虹桥旗舰洗车站', deductCount: 1, status: 'SUCCESS', usedAt: '2026-04-18 09:30:00' },
  { id: 'cu2', usageNo: 'SCU202604170006', cardName: '夜洗月卡', userName: '李波', serviceOrderNo: 'SO202604170101', storeName: '嘉定联营门店', deductCount: 1, status: 'SUCCESS', usedAt: '2026-04-17 19:58:00' },
];

const userRisks: UserRiskRecord[] = [
  { id: 'ur1', userName: '陈越', riskScene: '退款频次异常', riskReason: '24 小时内多次退款', relatedNo: 'RF202604180006', riskStatus: 'WATCH', owner: '风控-沈一', updatedAt: '2026-04-18 10:20:00' },
  { id: 'ur2', userName: '李波', riskScene: '邀请防刷', riskReason: '同设备注册', relatedNo: 'INV-001', riskStatus: 'NORMAL', owner: '运营-何铭', updatedAt: '2026-04-17 18:30:00' },
];

const UserProfileManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<UserProfileRecord | UserVehicleRecord | FavoriteStoreRecord | ServiceCardUsageRecord | UserRiskRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ user: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const profileColumns = useMemo<ProColumns<UserProfileRecord>[]>(() => [
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

  const storeColumns = useMemo<ProColumns<FavoriteStoreRecord>[]>(() => [
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
  ], []);

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
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="核销次数" value={cardUsages.reduce((sum, item) => sum + item.deductCount, 0)} suffix="次" /></Card></Col>
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
          { key: 'profile', label: '用户档案', children: <ProTable<UserProfileRecord> cardBordered rowKey="id" columns={profileColumns} dataSource={filter(profiles) as UserProfileRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="tag" type="primary" onClick={() => openModal('维护用户档案')}>维护档案</Button>]} /> },
          { key: 'vehicle', label: '用户车辆', children: <ProTable<UserVehicleRecord> cardBordered rowKey="id" columns={vehicleColumns} dataSource={filter(vehicles) as UserVehicleRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增用户车辆')}>新增车辆</Button>]} /> },
          { key: 'store', label: '常用门店', children: <ProTable<FavoriteStoreRecord> cardBordered rowKey="id" columns={storeColumns} dataSource={filter(favoriteStores) as FavoriteStoreRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1080 }} /> },
          { key: 'cardUsage', label: '服务卡使用', children: <ProTable<ServiceCardUsageRecord> cardBordered rowKey="id" columns={cardUsageColumns} dataSource={filter(cardUsages) as ServiceCardUsageRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} toolBarRender={() => [<Button key="rollback" type="primary" onClick={() => openModal('回滚服务卡使用')}>回滚使用</Button>]} /> },
          { key: 'risk', label: '用户风控', children: <ProTable<UserRiskRecord> cardBordered rowKey="id" columns={riskColumns} dataSource={filter(userRisks) as UserRiskRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="handle" type="primary" onClick={() => openModal('处理用户风控')}>处理风控</Button>]} /> },
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
          message.success('用户档案操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="user" label="用户 / 手机号 / 车牌" rules={[{ required: true, message: '请输入用户、手机号或车牌' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={serviceCardStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserProfileManagement;
