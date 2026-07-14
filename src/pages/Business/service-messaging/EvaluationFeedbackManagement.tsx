import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircleOutlined, CommentOutlined } from '@ant-design/icons';
import { Card, Col, Form, Input, Row, Select, Statistic, message } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import api from '@/services/backendService';
import type { UserFeedbackRecord } from '@/services/backendService';

const feedbackTypeOptions = [
  { value: 'BUG', label: '故障反馈' },
  { value: 'SUGGESTION', label: '产品建议' },
  { value: 'SERVICE', label: '服务反馈' },
  { value: 'OTHER', label: '其他' },
];
const handleStatusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'DONE', label: '已完成' },
];
const actionOptions = [
  { value: 'CONTACT_USER', label: '联系用户' },
  { value: 'FIX_ISSUE', label: '修复问题' },
  { value: 'OPTIMIZE_PRODUCT', label: '纳入优化' },
  { value: 'CLOSE', label: '直接关闭' },
];
const feedbackTypeMap = buildValueEnum(feedbackTypeOptions);
const handleStatusMap = buildValueEnum(handleStatusOptions);
const actionLabel = (value?: string) => actionOptions.find((item) => item.value === value)?.label || '未选择';

const detailFields: DetailField<any>[] = [
  { name: 'appUserName', label: '用户' },
  { name: 'feedbackType', label: '反馈类型' },
  { name: 'content', label: '反馈内容' },
  { name: 'contactPhone', label: '联系方式' },
  { name: 'imageUrls', label: '图片' },
  { name: 'handleStatus', label: '处理状态' },
  { name: 'ownerUserName', label: '处理人' },
  { name: 'result', label: '处理结果' },
  { name: 'createdAt', label: '反馈时间', render: (value) => formatDateTime(value) },
  { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
];

const EvaluationFeedbackManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<UserFeedbackRecord | null>(null);
  const [editing, setEditing] = useState<UserFeedbackRecord | null>(null);
  const [form] = Form.useForm();
  const query = useQuery({
    queryKey: ['userFeedbacks', keyword],
    queryFn: async () => (await api.message.userFeedbacks.page({ pageNum: 1, pageSize: 200, keyword: keyword || undefined })).data,
  });
  const records = query.data?.records || [];
  const filteredRecords = useMemo(() => records.filter((item) => containsKeyword(keyword, [item.appUserName, item.feedbackType, item.content, item.contactPhone, item.ownerUserName, item.result])), [keyword, records]);
  const mutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!editing) return;
      return api.message.userFeedbacks.update(editing.id, {
        handleStatus: values.handleStatus,
        ownerUserName: values.ownerUserName,
        imageUrls: values.imageUrls,
        result: [`处理动作：${actionLabel(values.action)}`, values.supplement ? `补充说明：${values.supplement}` : ''].filter(Boolean).join('；'),
      });
    },
    onSuccess: () => {
      message.success('用户反馈已更新');
      queryClient.invalidateQueries({ queryKey: ['userFeedbacks'] });
      setEditing(null);
      form.resetFields();
    },
  });
  const columns: ProColumns<UserFeedbackRecord>[] = [
    { title: '用户', dataIndex: 'appUserName', width: 140 },
    { title: '反馈类型', dataIndex: 'feedbackType', width: 130, render: (_, record) => renderStatusTag(record.feedbackType, feedbackTypeMap) },
    { title: '反馈内容', dataIndex: 'content', width: 340, ellipsis: true },
    { title: '联系方式', dataIndex: 'contactPhone', width: 150 },
    { title: '处理状态', dataIndex: 'handleStatus', width: 120, render: (_, record) => renderStatusTag(record.handleStatus, handleStatusMap) },
    { title: '处理人', dataIndex: 'ownerUserName', width: 140 },
    { title: '处理结果', dataIndex: 'result', width: 260, ellipsis: true },
    { title: '反馈时间', dataIndex: 'createdAt', width: 180, render: (_, record) => formatDateTime(record.createdAt) },
    { title: '操作', valueType: 'option', width: 150, fixed: 'right', render: (_, record) => [
      <a key="handle" onClick={() => { setEditing(record); form.setFieldsValue({ handleStatus: record.handleStatus, ownerUserName: record.ownerUserName, imageUrls: record.imageUrls, action: 'CONTACT_USER', supplement: record.result }); }}>处理</a>,
      <a key="detail" onClick={() => setDetail(record)}>详情</a>,
    ] },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="用户反馈" subtitle="查看用户提交的问题和建议，记录处理状态、负责人和处理结果。" icon={<CommentOutlined />} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}><Card><Statistic title="反馈总数" value={records.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="待处理" value={records.filter((item) => item.handleStatus === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="处理中" value={records.filter((item) => item.handleStatus === 'PROCESSING').length} suffix="条" /></Card></Col>
      </Row>
      <Input.Search allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={setKeyword} placeholder="用户 / 反馈内容 / 联系方式 / 处理结果" style={{ width: 360, marginBottom: 16 }} />
      <ProTable<UserFeedbackRecord> cardBordered rowKey="id" columns={columns} loading={query.isLoading} dataSource={filteredRecords} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1600 }} />

      <BusinessEditorModal
        eyebrow="反馈处理"
        title={editing ? `处理反馈 · ${editing.appUserName}` : '处理反馈'}
        subtitle="记录处理状态、负责人和最终处理结果。"
        meta={['用户反馈', editing ? `ID ${editing.id}` : '待选择']}
        open={!!editing}
        confirmLoading={mutation.isPending}
        onOk={() => form.submit()}
        onCancel={() => { setEditing(null); form.resetFields(); }}
        width={860}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form" onFinish={(values) => mutation.mutate(values)}>
          <BusinessEditorSection icon={<CheckCircleOutlined />} title="处理信息" desc="选择处理状态、处理动作和负责人。">
            <div className="merchant-editor-fields">
              <Form.Item name="handleStatus" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}><Select options={handleStatusOptions} /></Form.Item>
              <Form.Item name="action" label="处理动作" rules={[{ required: true, message: '请选择处理动作' }]}><Select options={actionOptions} /></Form.Item>
              <Form.Item name="ownerUserName" label="处理人"><Input placeholder="例如：运营-王敏" /></Form.Item>
              <Form.Item className="merchant-editor-field-span-all" name="imageUrls" label="补充图片"><OssImageUpload multiple prefix="user-feedback/images" /></Form.Item>
              <Form.Item className="merchant-editor-field-span-all" name="supplement" label="补充说明"><Input placeholder="例如：已联系用户并完成问题处理" /></Form.Item>
            </div>
          </BusinessEditorSection>
        </Form>
      </BusinessEditorModal>

      <BusinessDetailModal title="用户反馈详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={detailFields} column={2} labelWidth={110} /> : null}
      </BusinessDetailModal>
    </div>
  );
};

export default EvaluationFeedbackManagement;
