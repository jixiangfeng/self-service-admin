import React, { useMemo, useState } from 'react';
import { Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { ticketStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface EvaluationRecord {
  id: string;
  serviceOrderNo: string;
  appUserName: string;
  storeName: string;
  deviceCode: string;
  score: number;
  content: string;
  imageUrls: string;
  replyContent?: string;
  replyUserName?: string;
  status: string;
  createdAt: string;
  repliedAt?: string;
}

interface FeedbackRecord {
  id: string;
  appUserName: string;
  feedbackType: string;
  content: string;
  contactPhone: string;
  imageUrls: string;
  handleStatus: string;
  ownerUserName: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}

type DetailRecord = EvaluationRecord | FeedbackRecord;

const evaluationStatusOptions = [
  { value: 'NORMAL', label: '正常展示' },
  { value: 'HIDDEN', label: '已隐藏' },
  { value: 'REPORTED', label: '已举报' },
];

const feedbackTypeOptions = [
  { value: 'BUG', label: '故障反馈' },
  { value: 'SUGGESTION', label: '建议' },
  { value: 'COMPLAINT', label: '投诉' },
  { value: 'OTHER', label: '其他' },
];

const evaluations: EvaluationRecord[] = [
  { id: 'ev1', serviceOrderNo: 'SO202605070018', appUserName: '李波', storeName: '虹桥旗舰洗车站', deviceCode: 'DEV-HQ-003', score: 5, content: '洗车速度快，泡沫很足。', imageUrls: 'FA202605070030', replyContent: '感谢支持，欢迎下次再来。', replyUserName: '店长-李思远', status: 'NORMAL', createdAt: '2026-05-07 09:32:00', repliedAt: '2026-05-07 10:02:00' },
  { id: 'ev2', serviceOrderNo: 'SO202605060091', appUserName: '陈越', storeName: '徐汇夜洗门店', deviceCode: 'DEV-XH-007', score: 2, content: '风干效果不好，设备中途停了。', imageUrls: 'FA202605060022,FA202605060023', status: 'REPORTED', createdAt: '2026-05-06 21:18:00' },
  { id: 'ev3', serviceOrderNo: 'SO202605050042', appUserName: '周琪', storeName: '嘉定联营门店', deviceCode: 'DEV-JD-002', score: 4, content: '门店位置好找，排队提示可以更明显。', imageUrls: '-', status: 'NORMAL', createdAt: '2026-05-05 18:03:00' },
];

const feedbacks: FeedbackRecord[] = [
  { id: 'fb1', appUserName: '李波', feedbackType: 'BUG', content: '优惠券选择页偶发加载慢。', contactPhone: '138****2451', imageUrls: 'FA202605070040', handleStatus: 'PROCESSING', ownerUserName: '产品-韩梅', createdAt: '2026-05-07 10:20:00', updatedAt: '2026-05-07 11:02:00' },
  { id: 'fb2', appUserName: '陈越', feedbackType: 'SUGGESTION', content: '希望增加常用门店收藏。', contactPhone: '136****3029', imageUrls: '-', handleStatus: 'PENDING', ownerUserName: '运营-何铭', createdAt: '2026-05-06 19:40:00', updatedAt: '2026-05-06 19:40:00' },
  { id: 'fb3', appUserName: '周琪', feedbackType: 'COMPLAINT', content: '退款到账时间说明不清晰。', contactPhone: '139****8801', imageUrls: '-', handleStatus: 'DONE', ownerUserName: '客服-刘莎', result: '已电话解释退款流程，并同步更新帮助说明。', createdAt: '2026-05-05 13:10:00', updatedAt: '2026-05-05 15:35:00' },
];

const evaluationStatusMap = buildValueEnum(evaluationStatusOptions);
const feedbackTypeMap = buildValueEnum(feedbackTypeOptions);
const handleStatusMap = buildValueEnum(ticketStatusOptions);

const EvaluationFeedbackManagement: React.FC = () => {
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
    message.success('处理结果已保存');
  };

  const evaluationColumns = useMemo<ProColumns<EvaluationRecord>[]>(() => [
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170, fixed: 'left' },
    { title: '用户', dataIndex: 'appUserName', width: 110 },
    { title: '门店', dataIndex: 'storeName', width: 170 },
    { title: '设备', dataIndex: 'deviceCode', width: 130 },
    { title: '评分', dataIndex: 'score', width: 90 },
    { title: '评价内容', dataIndex: 'content', width: 280, ellipsis: true },
    { title: '图片', dataIndex: 'imageUrls', width: 160 },
    { title: '回复内容', dataIndex: 'replyContent', width: 240, ellipsis: true, renderText: (value) => value || '-' },
    { title: '回复人', dataIndex: 'replyUserName', width: 120, renderText: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, evaluationStatusMap) },
    { title: '评价时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '回复时间', dataIndex: 'repliedAt', width: 180, render: (_, record) => formatDateTime(record.repliedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="reply" onClick={() => openModal(`回复评价 · ${record.serviceOrderNo}`)}>回复</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const feedbackColumns = useMemo<ProColumns<FeedbackRecord>[]>(() => [
    { title: '用户', dataIndex: 'appUserName', width: 110, fixed: 'left' },
    { title: '反馈类型', dataIndex: 'feedbackType', width: 130, render: (_, record) => renderStatusTag(record.feedbackType, feedbackTypeMap) },
    { title: '反馈内容', dataIndex: 'content', width: 320, ellipsis: true },
    { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
    { title: '图片', dataIndex: 'imageUrls', width: 160 },
    { title: '处理状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, handleStatusMap) },
    { title: '处理人', dataIndex: 'ownerUserName', width: 120 },
    { title: '处理结果', dataIndex: 'result', width: 260, ellipsis: true, renderText: (value) => value || '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="handle" onClick={() => openModal(`处理反馈 · ${record.appUserName}`)}>处理</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="评价反馈中心" subtitle="维护订单评价、用户反馈、商家回复、隐藏举报和处理结果。" icon={<CommentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="评价总数" value={evaluations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="低分/举报" value={evaluations.filter((item) => item.score <= 2 || item.status === 'REPORTED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="用户反馈" value={feedbacks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待处理反馈" value={feedbacks.filter((item) => item.handleStatus !== 'DONE').length} suffix="条" /></Card></Col>
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
            placeholder="用户 / 订单 / 门店 / 反馈内容"
            style={{ width: 320 }}
          />,
        ]}
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          { key: 'evaluation', label: '订单评价', children: <ProTable<EvaluationRecord> cardBordered rowKey="id" columns={evaluationColumns} dataSource={filter(evaluations) as EvaluationRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} /> },
          { key: 'feedback', label: '用户反馈', children: <ProTable<FeedbackRecord> cardBordered rowKey="id" columns={feedbackColumns} dataSource={filter(feedbacks) as FeedbackRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />

      <Modal title="详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <Descriptions bordered size="small" column={2}>
            {Object.entries(detail).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value || '-')}</Descriptions.Item>)}
          </Descriptions>
        )}
      </Modal>

      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={760}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={[...ticketStatusOptions, ...evaluationStatusOptions]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="owner" label="处理人"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="result" label="回复/处理结果" rules={[{ required: true, message: '请输入处理结果' }]}><Input.TextArea rows={4} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default EvaluationFeedbackManagement;
