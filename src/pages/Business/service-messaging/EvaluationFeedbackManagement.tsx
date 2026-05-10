import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { CheckCircleOutlined, CommentOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { ticketStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api, { type ServiceEvaluationRecord, type UserFeedbackRecord } from '@/services/backendService';

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

const evaluationStatusMap = buildValueEnum(evaluationStatusOptions);
const feedbackTypeMap = buildValueEnum(feedbackTypeOptions);
const handleStatusMap = buildValueEnum(ticketStatusOptions);
const feedbackActionOptions = [
  { value: 'REPLY_PUBLIC', label: '公开回复' },
  { value: 'CALL_BACK', label: '电话回访' },
  { value: 'CREATE_TICKET', label: '转客服工单' },
  { value: 'HIDE_CONTENT', label: '隐藏内容' },
];
const compactJoin = (items: Array<string | undefined | false>) => items.filter(Boolean).join('；');
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;

const evaluationFeedbackDetailFields: Record<'evaluation' | 'feedback', DetailField<any>[]> = {
  evaluation: [
    { name: 'serviceOrderNo', label: '订单号' },
    { name: 'appUserName', label: '用户' },
    { name: 'storeName', label: '门店' },
    { name: 'deviceCode', label: '设备' },
    { name: 'score', label: '评分' },
    { name: 'content', label: '评价内容' },
    { name: 'imageUrls', label: '图片' },
    { name: 'replyContent', label: '回复内容' },
    { name: 'replyUserName', label: '回复人' },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '评价时间', render: (value) => formatDateTime(value) },
    { name: 'repliedAt', label: '回复时间', render: (value) => formatDateTime(value) },
  ],
  feedback: [
    { name: 'appUserName', label: '用户' },
    { name: 'feedbackType', label: '反馈类型' },
    { name: 'content', label: '反馈内容' },
    { name: 'contactPhone', label: '联系电话' },
    { name: 'imageUrls', label: '图片' },
    { name: 'handleStatus', label: '处理状态' },
    { name: 'ownerUserName', label: '处理人' },
    { name: 'result', label: '处理结果' },
    { name: 'createdAt', label: '创建时间', render: (value) => formatDateTime(value) },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
};

const EvaluationFeedbackManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ServiceEvaluationRecord | UserFeedbackRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [activeType, setActiveType] = useState<'evaluation' | 'feedback'>('evaluation');
  const [form] = Form.useForm();

  const evaluationQuery = useQuery({
    queryKey: ['serviceEvaluations', keyword],
    queryFn: async () => (await api.message.serviceEvaluations.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const feedbackQuery = useQuery({
    queryKey: ['userFeedbacks', keyword],
    queryFn: async () => (await api.message.userFeedbacks.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });

  const evaluations = evaluationQuery.data?.records || [];
  const feedbacks = feedbackQuery.data?.records || [];

  const filter = <T extends object>(records: T[]) => records.filter((record) => containsKeyword(keyword, Object.values(record).map((value) => String(value ?? ''))));

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const result = compactJoin([
      values.action ? `处理动作：${optionLabel(feedbackActionOptions, values.action)}` : undefined,
      values.ownerUserName ? `处理人：${values.ownerUserName}` : undefined,
      values.supplement ? `补充说明：${values.supplement}` : undefined,
    ]);
    if (activeType === 'evaluation') {
      if (!detail || !('serviceOrderNo' in detail)) {
        setModalVisible(false);
        return;
      }
      await api.message.serviceEvaluations.update(detail.id, {
        ...detail,
        ...values,
        status: values.status,
        replyContent: result,
        replyUserName: values.ownerUserName,
      });
      message.success('评价已更新');
    } else {
      if (!detail || !('feedbackType' in detail)) {
        setModalVisible(false);
        return;
      }
      await api.message.userFeedbacks.update(detail.id, {
        ...detail,
        ...values,
        handleStatus: values.handleStatus,
        ownerUserName: values.ownerUserName,
        result,
      });
      message.success('反馈已更新');
    }
    setModalVisible(false);
    setDetail(null);
    form.resetFields();
  };

  const evaluationColumns = useMemo<ProColumns<ServiceEvaluationRecord>[]>(() => [
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170, fixed: 'left' },
    { title: '用户', dataIndex: 'appUserName', width: 110 },
    { title: '门店', dataIndex: 'storeName', width: 170 },
    { title: '设备', dataIndex: 'deviceCode', width: 130 },
    { title: '评分', dataIndex: 'score', width: 90 },
    { title: '评价内容', dataIndex: 'content', width: 280, ellipsis: true },
    { title: '图片', dataIndex: 'imageUrls', width: 160, renderText: (value) => value || '-' },
    { title: '回复内容', dataIndex: 'replyContent', width: 240, ellipsis: true, renderText: (value) => value || '-' },
    { title: '回复人', dataIndex: 'replyUserName', width: 120, renderText: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, evaluationStatusMap) },
    { title: '评价时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '回复时间', dataIndex: 'repliedAt', width: 180, render: (_, record) => formatDateTime(record.repliedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="reply" onClick={() => { setDetail(record); setActiveType('evaluation'); setModalTitle(`回复评价 · ${record.serviceOrderNo}`); form.resetFields(); setModalVisible(true); }}>回复</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  const feedbackColumns = useMemo<ProColumns<UserFeedbackRecord>[]>(() => [
    { title: '用户', dataIndex: 'appUserName', width: 110, fixed: 'left' },
    { title: '反馈类型', dataIndex: 'feedbackType', width: 130, render: (_, record) => renderStatusTag(record.feedbackType, feedbackTypeMap) },
    { title: '反馈内容', dataIndex: 'content', width: 320, ellipsis: true },
    { title: '联系电话', dataIndex: 'contactPhone', width: 140, renderText: (value) => value || '-' },
    { title: '图片', dataIndex: 'imageUrls', width: 160, renderText: (value) => value || '-' },
    { title: '处理状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, handleStatusMap) },
    { title: '处理人', dataIndex: 'ownerUserName', width: 120, renderText: (value) => value || '-' },
    { title: '处理结果', dataIndex: 'result', width: 260, ellipsis: true, renderText: (value) => value || '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [<a key="handle" onClick={() => { setDetail(record); setActiveType('feedback'); setModalTitle(`处理反馈 · ${record.appUserName}`); form.resetFields(); setModalVisible(true); }}>处理</a>, <a key="detail" onClick={() => setDetail(record)}>详情</a>] },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="评价反馈中心" subtitle="维护订单评价、用户反馈、商家回复、隐藏举报和处理结果。" icon={<CommentOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="评价总数" value={evaluations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="低分/举报" value={evaluations.filter((item: ServiceEvaluationRecord) => item.score <= 2 || item.status === 'REPORTED').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="用户反馈" value={feedbacks.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待处理反馈" value={feedbacks.filter((item: UserFeedbackRecord) => item.handleStatus !== 'DONE').length} suffix="条" /></Card></Col>
      </Row>
      <Input.Search
        allowClear
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onSearch={(value) => setKeyword(value)}
        placeholder="用户 / 订单 / 门店 / 反馈内容"
        style={{ width: 320, marginBottom: 16 }}
      />
      <Tabs
        items={[
          { key: 'evaluation', label: '订单评价', children: <ProTable<ServiceEvaluationRecord> cardBordered rowKey="id" columns={evaluationColumns} loading={evaluationQuery.isLoading} dataSource={filter(evaluations)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} /> },
          { key: 'feedback', label: '用户反馈', children: <ProTable<UserFeedbackRecord> cardBordered rowKey="id" columns={feedbackColumns} loading={feedbackQuery.isLoading} dataSource={filter(feedbacks)} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1700 }} /> },
        ]}
      />
      <BusinessEditorModal
        eyebrow={activeType === 'evaluation' ? '评价回复' : '反馈处理'}
        title={modalTitle}
        subtitle="把回复/处理内容拆成状态、动作、处理人和补充说明，提交时生成处理结果。"
        meta={[activeType === 'evaluation' ? '订单评价' : '用户反馈', '服务消息']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={900}
        okText="提交处理"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理信息" desc="选择处理状态、处理动作和处理人。">
              <div className="merchant-editor-fields">
                {activeType === 'evaluation' ? (
                  <Form.Item name="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={evaluationStatusOptions} placeholder="请选择处理状态" /></Form.Item>
                ) : (
                  <Form.Item name="handleStatus" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={ticketStatusOptions} placeholder="请选择处理状态" /></Form.Item>
                )}
                <Form.Item name="action" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}><Select options={feedbackActionOptions} placeholder="请选择处理动作" /></Form.Item>
                <Form.Item name="ownerUserName" label="处理人"><Input placeholder="例如：客服-王敏" /></Form.Item>
                <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：已联系用户并补发优惠券" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
      <BusinessDetailModal title="评价反馈详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <SchemaDetail
            record={detail as Record<string, any>}
            fields={('serviceOrderNo' in detail ? evaluationFeedbackDetailFields.evaluation : evaluationFeedbackDetailFields.feedback) as DetailField<Record<string, any>>[]}
            column={2}
            labelWidth={110}
          />
        ) : null}
      </BusinessDetailModal>
    </div>
  );
};

export default EvaluationFeedbackManagement;
