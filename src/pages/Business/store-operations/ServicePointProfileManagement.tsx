import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, QRCode, Row, Select, Space, Statistic, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { auditStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  SelectOptionRecord,
  ServicePointQrRecord,
  ServicePointRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type PointProfileSearchValues = { keyword?: string; servicePointId?: number };

const QR_LINK_BASE = `${window.location.origin}/h5/`;
const buildPointQrLink = (pointCode: string) => `${QR_LINK_BASE}?qrCode=${encodeURIComponent(pointCode)}`;
const auditStatusMap = buildValueEnum(auditStatusOptions);

const detailFields: DetailField<any>[] = [
  { name: 'pointCode', label: '点位编号' },
  { name: 'qrCode', label: '二维码' },
  { name: 'qrVersion', label: '版本' },
  { name: 'status', label: '状态' },
  { name: 'createdAt', label: '创建时间' },
  { name: 'updatedAt', label: '更新时间' },
];

const normalizePayload = (values: Record<string, unknown>) => {
  const next = { ...values };
  delete next.storeId;
  delete next.storeName;
  return next;
};

const ServicePointProfileManagement: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [servicePointId, setServicePointId] = useState<number | undefined>();
  const [detail, setDetail] = useState<ServicePointQrRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ServicePointQrRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServicePointQrRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [searchForm] = Form.useForm<PointProfileSearchValues>();
  const selectedStoreId = Form.useWatch('storeId', form) as number | undefined;
  const watchedQrCode = Form.useWatch('qrCode', form) as string | undefined;

  const { data: storeOptionsData } = useQuery({
    queryKey: ['pointProfileStoreOptions'],
    queryFn: async () => (await api.store.options()).data,
  });
  const { data: allPointOptionsData } = useQuery({
    queryKey: ['pointOptionsForProfiles'],
    queryFn: async () => (await api.servicePoint.options()).data,
  });
  const { data: allPointPageData } = useQuery({
    queryKey: ['pointRecordsForProfiles'],
    queryFn: async () => (await api.servicePoint.page({ current: 1, size: 1000 })).data,
  });
  const pointOptionsQuery = useQuery({
    queryKey: ['pointProfilePointOptions', selectedStoreId],
    queryFn: async () => (await api.servicePoint.options(selectedStoreId)).data,
    enabled: selectedStoreId !== undefined && selectedStoreId !== null,
  });

  const storeOptions = storeOptionsData || [];
  const pointOptions = allPointOptionsData || [];
  const modalPointOptions = pointOptionsQuery.data || [];
  const pointRecords = allPointPageData?.records || [];
  const storeOptionMap = useMemo(() => new Map(storeOptions.map((item) => [item.value, item])), [storeOptions]);
  const pointRecordMap = useMemo(() => new Map(pointRecords.map((item: ServicePointRecord) => [item.id, item])), [pointRecords]);

  const qrQuery = useQuery({
    queryKey: ['servicePointQrRecords', servicePointId],
    queryFn: async () => (await api.servicePointQrRecord.page({ current: 1, size: 200, servicePointId })).data,
  });
  const qrRecords = qrQuery.data?.records || [];

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      payload.id ? api.servicePointQrRecord.edit(payload) : api.servicePointQrRecord.add(payload),
    onSuccess: () => {
      message.success('点位二维码已保存');
      queryClient.invalidateQueries({ queryKey: ['servicePointQrRecords'] });
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => api.servicePointQrRecord.remove(id),
    onSuccess: () => {
      message.success('点位二维码已删除');
      queryClient.invalidateQueries({ queryKey: ['servicePointQrRecords'] });
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const selectedPoint = (id?: number) =>
    modalPointOptions.find((item) => item.value === id) || pointOptions.find((item) => item.value === id);

  const fillPointFields = (id?: number) => {
    const point = selectedPoint(id);
    if (!point) return;
    form.setFieldsValue({ pointCode: point.code || point.label });
  };

  const generateQrContent = () => {
    const pointId = form.getFieldValue('servicePointId') as number | undefined;
    const pointCode = String(form.getFieldValue('pointCode') || selectedPoint(pointId)?.code || '').trim();
    if (!pointCode) {
      message.warning('请先选择所属点位');
      return;
    }
    form.setFieldsValue({ pointCode, qrCode: buildPointQrLink(pointCode) });
  };

  const copyQrContent = async () => {
    const qrCode = String(form.getFieldValue('qrCode') || '').trim();
    if (!qrCode) {
      message.warning('请先生成二维码内容');
      return;
    }
    await navigator.clipboard.writeText(qrCode);
    message.success('二维码链接已复制');
  };

  const confirmRemove = (id: number) => {
    showBusinessConfirm({
      title: '确认删除该点位二维码',
      content: '删除后将移除该点位扫码入口记录，请确认后继续。',
      onOk: () => removeMutation.mutate(id),
    });
  };

  const openModal = (record?: ServicePointQrRecord) => {
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      const point = pointRecordMap.get(record.servicePointId || 0);
      form.setFieldsValue({ ...record, storeId: point?.storeId });
    } else {
      const point = pointRecordMap.get(servicePointId || 0);
      form.setFieldsValue({ servicePointId, storeId: point?.storeId, status: 'APPROVED' });
    }
    setModalVisible(true);
  };

  const actionColumn: ProColumns<ServicePointQrRecord> = {
    title: '操作',
    width: 230,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setPreviewRecord(record)}>预览</Button>
        <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove(record.id)}>删除</Button>
      </>
    ),
  };

  const qrColumns = useMemo<ProColumns<ServicePointQrRecord>[]>(() => [
    { title: '点位编号', dataIndex: 'pointCode', width: 140 },
    {
      title: '二维码链接',
      dataIndex: 'qrCode',
      width: 360,
      ellipsis: true,
      render: (_, record) => record.qrCode ? <Typography.Text copyable={{ text: record.qrCode }} ellipsis>{record.qrCode}</Typography.Text> : '-',
    },
    { title: '版本', dataIndex: 'qrVersion', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn,
  ], [actionColumn]);

  return (
    <div style={{ padding: embedded ? 0 : 24 }}>
      {!embedded ? <PageBanner title="点位档案中心" subtitle="维护点位二维码，保证扫码入口和点位一一对应。" icon={<QrcodeOutlined />} /> : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={8}><Card><Statistic title="二维码" value={qrRecords.length} suffix="个" /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => {
          setKeyword(String(values.keyword || ''));
          setServicePointId(values.servicePointId);
        }}
      >
        <Form.Item name="servicePointId" label="所属点位">
          <Select allowClear showSearch optionFilterProp="label" options={pointOptions || []} placeholder="全部点位" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="输入点位或二维码关键词" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { searchForm.resetFields(); setKeyword(''); setServicePointId(undefined); }}>重置</Button>
        </Form.Item>
      </Form>

      <ProTable<ServicePointQrRecord>
        cardBordered
        rowKey="id"
        columns={qrColumns}
        dataSource={filter(qrRecords)}
        loading={qrQuery.isLoading}
        search={false}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1260 }}
        toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>生成二维码</Button>]}
      />

      <BusinessDetailModal title="点位二维码详情" open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail} fields={detailFields} /> : null}
      </BusinessDetailModal>

      <Modal
        title={`二维码预览${previewRecord?.pointCode ? ` · ${previewRecord.pointCode}` : ''}`}
        open={!!previewRecord}
        onCancel={() => setPreviewRecord(null)}
        footer={null}
        width={420}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%', alignItems: 'center' }}>
          <QRCode value={previewRecord?.qrCode || '-'} status={previewRecord?.qrCode ? 'active' : 'loading'} size={240} />
          <Typography.Text copyable={previewRecord?.qrCode ? { text: previewRecord.qrCode } : false} style={{ maxWidth: '100%' }} ellipsis>
            {previewRecord?.qrCode || '-'}
          </Typography.Text>
          <Button disabled={!previewRecord?.qrCode} href={previewRecord?.qrCode} target="_blank">打开链接</Button>
        </Space>
      </Modal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '点位二维码维护' : '点位二维码新增'}
        title={`${editingRecord ? '编辑' : '新增'}点位二维码`}
        subtitle="生成或维护点位二维码，保证扫码入口和点位一一对应。"
        meta={['点位二维码', editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(normalizePayload(await form.validateFields()))}
        confirmLoading={saveMutation.isPending}
        width={980}
        okText={editingRecord ? '保存变更' : '保存二维码'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<QrcodeOutlined />}
              title="归属点位"
              desc="二维码需要落到具体点位，便于现场扫码履约。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={storeOptions as SelectOptionRecord[]}
                    placeholder="请选择门店"
                    onChange={(value) => {
                      const store = storeOptionMap.get(value);
                      form.setFieldsValue({ storeName: store?.label, servicePointId: undefined, pointCode: undefined });
                    }}
                  />
                </Form.Item>
                <Form.Item name="servicePointId" label="所属点位" rules={[{ required: true, message: '请选择点位' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    disabled={!selectedStoreId}
                    loading={pointOptionsQuery.isLoading}
                    options={modalPointOptions as SelectOptionRecord[]}
                    placeholder={selectedStoreId ? '请选择点位' : '请先选择门店'}
                    onChange={(value) => fillPointFields(value)}
                  />
                </Form.Item>
                <Form.Item name="storeName" hidden><Input /></Form.Item>
                <Form.Item name="pointCode" label="点位编号"><Input placeholder="选择点位后可回填或手动记录" /></Form.Item>
              </div>
            </BusinessEditorSection>

            <BusinessEditorSection icon={<QrcodeOutlined />} title="二维码信息" desc="维护二维码内容、版本和审核状态，保证扫码入口有效。">
              <div className="merchant-editor-fields">
                <Form.Item className="merchant-editor-field-span-all" name="qrCode" label="二维码" rules={[{ required: true, message: '请输入二维码' }]}>
                  <Input.Search enterButton="生成二维码内容" onSearch={generateQrContent} placeholder="二维码内容或资源地址" />
                </Form.Item>
                <div className="merchant-editor-field-span-all" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <QRCode value={watchedQrCode || '-'} status={watchedQrCode ? 'active' : 'loading'} size={160} />
                  <Space direction="vertical" size={8} style={{ minWidth: 260, flex: 1 }}>
                    <Typography.Text type="secondary">扫码内容</Typography.Text>
                    <Typography.Text copyable={watchedQrCode ? { text: watchedQrCode } : false} ellipsis>{watchedQrCode || '选择门店和点位后生成二维码链接'}</Typography.Text>
                    <Space wrap>
                      <Button onClick={generateQrContent}>生成链接</Button>
                      <Button onClick={copyQrContent}>复制链接</Button>
                      <Button disabled={!watchedQrCode} href={watchedQrCode} target="_blank">打开链接</Button>
                    </Space>
                  </Space>
                </div>
                <Form.Item name="qrVersion" label="版本"><Input placeholder="例如：v1.0" /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
              </div>
            </BusinessEditorSection>
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ServicePointProfileManagement;
