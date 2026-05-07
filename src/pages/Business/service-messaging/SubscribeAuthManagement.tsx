import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { messageChannelOptions, subscribeStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';

interface SubscribeRecord {
  id: string;
  appUserName: string;
  mobile: string;
  templateCode: string;
  templateName: string;
  channel: string;
  subscribeStatus: string;
  subscribedAt: string;
  expiredAt: string;
}

const subscribes: SubscribeRecord[] = [
  { id: 'sub1', appUserName: '李波', mobile: '138****2451', templateCode: 'MSG-PAY-SUCC', templateName: '支付成功通知', channel: 'WECHAT', subscribeStatus: 'SUBSCRIBED', subscribedAt: '2026-05-07 09:10:00', expiredAt: '2026-06-07 09:10:00' },
  { id: 'sub2', appUserName: '陈越', mobile: '136****3029', templateCode: 'MSG-INVITE', templateName: '邀请奖励到账', channel: 'WECHAT', subscribeStatus: 'EXPIRED', subscribedAt: '2026-04-07 09:10:00', expiredAt: '2026-05-07 09:10:00' },
  { id: 'sub3', appUserName: '周琪', mobile: '139****8801', templateCode: 'MSG-REFUND', templateName: '退款进度通知', channel: 'SMS', subscribeStatus: 'SUBSCRIBED', subscribedAt: '2026-05-06 18:20:00', expiredAt: '2026-08-06 18:20:00' },
];

const channelMap = buildValueEnum(messageChannelOptions);
const subscribeStatusMap = buildValueEnum(subscribeStatusOptions);

const SubscribeAuthManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<SubscribeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const dataSource = useMemo(
    () => subscribes.filter((item) => containsKeyword(keyword, [item.appUserName, item.mobile, item.templateCode, item.templateName, item.channel, item.subscribeStatus])),
    [keyword]
  );

  const handleSubmit = async () => {
    await form.validateFields();
    setModalVisible(false);
    message.success('订阅授权维护已记录');
  };

  const columns: ProColumns<SubscribeRecord>[] = [
    { title: '用户', dataIndex: 'appUserName', width: 120, fixed: 'left' },
    { title: '手机号', dataIndex: 'mobile', width: 140 },
    { title: '模板编码', dataIndex: 'templateCode', width: 170 },
    { title: '模板名称', dataIndex: 'templateName', width: 180 },
    { title: '渠道', dataIndex: 'channel', width: 120, render: (_, record) => renderStatusTag(record.channel, channelMap) },
    { title: '订阅状态', dataIndex: 'subscribeStatus', width: 130, render: (_, record) => renderStatusTag(record.subscribeStatus, subscribeStatusMap) },
    { title: '订阅时间', dataIndex: 'subscribedAt', width: 180, render: (_, record) => formatDateTime(record.subscribedAt) },
    { title: '过期时间', dataIndex: 'expiredAt', width: 180, render: (_, record) => formatDateTime(record.expiredAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="edit" onClick={() => { form.setFieldsValue(record); setModalVisible(true); }}>维护</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="订阅授权中心" subtitle="维护用户消息模板授权、渠道订阅状态和授权过期时间。" icon={<BellOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="订阅记录" value={subscribes.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="有效授权" value={subscribes.filter((item) => item.subscribeStatus === 'SUBSCRIBED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="过期授权" value={subscribes.filter((item) => item.subscribeStatus === 'EXPIRED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="拒绝/取消" value={subscribes.filter((item) => ['REJECTED', 'CANCELLED'].includes(item.subscribeStatus)).length} suffix="条" /></Card></Col>
      </Row>

      <ProTable<SubscribeRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        search={false}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1300 }}
        toolbar={{ search: { value: keyword, onSearch: (value) => setKeyword(value), placeholder: '用户 / 手机号 / 模板 / 状态' } }}
        toolBarRender={() => [<Button key="new" type="primary" onClick={() => { form.resetFields(); setModalVisible(true); }}>新增授权记录</Button>]}
        request={async (params) => {
          const res = await api.message.subscribes.page(params);
          return { data: res.data.records as any, success: true, total: res.data.total };
        }}
      />

      <Modal title="订阅授权详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>)}
          </Descriptions>
        )}
      </Modal>

      <Modal title="维护订阅授权" open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={760}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="appUserName" label="用户" rules={[{ required: true, message: '请输入用户' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="templateCode" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="channel" label="渠道" rules={[{ required: true, message: '请选择渠道' }]}><Select options={messageChannelOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="subscribeStatus" label="订阅状态" rules={[{ required: true, message: '请选择订阅状态' }]}><Select options={subscribeStatusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="subscribedAt" label="订阅时间"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="expiredAt" label="过期时间"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SubscribeAuthManagement;
