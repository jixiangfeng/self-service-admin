import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, QrcodeOutlined, SwapOutlined, ToolOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  maintainStatusOptions,
  pointStatusOptions,
  pointTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import api from '@/services/backendService';
import type {
  PointDeviceBindLogRecord,
  ServicePointMaintainRecord,
  ServicePointQrRecord,
  ServicePointStatusLogRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import { DateTimeField, fromDatePickerValue, fromDateTimePickerValue, fromTimePickerValue, toDatePickerValue, toDateTimePickerValue, toTimePickerValue } from '@/utils/formControls';

type PointProfileTab = 'qr' | 'maintain' | 'bind' | 'status';
type EditableRecord = ServicePointQrRecord | ServicePointMaintainRecord | PointDeviceBindLogRecord | ServicePointStatusLogRecord;


const normalizePickerValues = (values: Record<string, any>) => {
  const next = { ...values };
  Object.entries(next).forEach(([key, value]) => {
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = fromTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = fromDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = fromDateTimePickerValue(value) || value;
    }
  });
  return next;
};

const normalizePickerInitialValues = (record: Record<string, any>) => {
  const next = { ...record };
  Object.entries(next).forEach(([key, value]) => {
    if (!value) return;
    if (['timeStart', 'timeEnd', 'openTime', 'closeTime'].includes(key)) {
      next[key] = toTimePickerValue(value) || value;
    } else if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('datetime')) {
      next[key] = toDatePickerValue(value) || value;
    } else if (key.endsWith('At') || key.endsWith('Time') || key === 'deadline' || key === 'effectiveStart' || key === 'effectiveEnd') {
      next[key] = toDateTimePickerValue(value) || value;
    }
  });
  return next;
};
const auditStatusMap = buildValueEnum(auditStatusOptions);
const maintainStatusMap = buildValueEnum(maintainStatusOptions);
const pointStatusMap = buildValueEnum(pointStatusOptions);
const pointTypeMap = buildValueEnum(pointTypeOptions);

const pointProfileModalTitleMap: Record<PointProfileTab, string> = {
  qr: '点位二维码',
  maintain: '维护记录',
  bind: '设备绑定',
  status: '状态流转',
};

const pointProfileModalDescMap: Record<PointProfileTab, string> = {
  qr: '生成或维护点位二维码，保证扫码入口和点位一一对应。',
  maintain: '记录点位维护计划、负责人和状态，支撑现场保养闭环。',
  bind: '记录点位设备绑定前后变化，保证履约设备可追溯。',
  status: '记录点位状态从空闲、占用、维护到关闭的流转原因。',
};

const pointProfileDetailFields: Record<PointProfileTab, DetailField<any>[]> = {
  qr: [
    { name: 'pointCode', label: '点位编号' },
    { name: 'qrCode', label: '二维码' },
    { name: 'qrVersion', label: '版本' },
    { name: 'status', label: '状态' },
    { name: 'createdAt', label: '创建时间' },
    { name: 'updatedAt', label: '更新时间' },
  ],
  maintain: [
    { name: 'maintainNo', label: '维护单号' },
    { name: 'pointCode', label: '点位编号' },
    { name: 'maintainType', label: '维护类型' },
    { name: 'owner', label: '负责人' },
    { name: 'status', label: '状态' },
    { name: 'plannedAt', label: '计划时间' },
  ],
  bind: [
    { name: 'bindNo', label: '绑定单号' },
    { name: 'pointCode', label: '点位编号' },
    { name: 'pointType', label: '点位类型' },
    { name: 'beforeDevice', label: '原设备' },
    { name: 'afterDevice', label: '新设备' },
    { name: 'operator', label: '操作人' },
    { name: 'boundAt', label: '绑定时间' },
  ],
  status: [
    { name: 'logNo', label: '日志编号' },
    { name: 'pointCode', label: '点位编号' },
    { name: 'beforeStatus', label: '原状态' },
    { name: 'afterStatus', label: '新状态' },
    { name: 'reason', label: '原因' },
    { name: 'changedAt', label: '变更时间' },
  ],
};

const ServicePointProfileManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<PointProfileTab>('qr');
  const [detail, setDetail] = useState<EditableRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [searchForm] = Form.useForm<{ keyword?: string }>();

  const { data: pointOptions } = useQuery({ queryKey: ['pointOptionsForProfiles'], queryFn: async () => (await api.servicePoint.options()).data });

  const qrQuery = useQuery({ queryKey: ['servicePointQrRecords'], queryFn: async () => (await api.servicePointQrRecord.page({ pageNum: 1, pageSize: 200 })).data });
  const maintainQuery = useQuery({ queryKey: ['servicePointMaintainRecords'], queryFn: async () => (await api.servicePointMaintainRecord.page({ pageNum: 1, pageSize: 200 })).data });
  const bindQuery = useQuery({ queryKey: ['pointDeviceBindLogs'], queryFn: async () => (await api.pointDeviceBindLog.page({ pageNum: 1, pageSize: 200 })).data });
  const statusQuery = useQuery({ queryKey: ['servicePointStatusLogs'], queryFn: async () => (await api.servicePointStatusLog.page({ pageNum: 1, pageSize: 200 })).data });

  const qrRecords = qrQuery.data?.records || [];
  const maintainRecords = maintainQuery.data?.records || [];
  const bindLogs = bindQuery.data?.records || [];
  const statusLogs = statusQuery.data?.records || [];

  const invalidateTab = (tab: PointProfileTab) => {
    if (tab === 'qr') queryClient.invalidateQueries({ queryKey: ['servicePointQrRecords'] });
    if (tab === 'maintain') queryClient.invalidateQueries({ queryKey: ['servicePointMaintainRecords'] });
    if (tab === 'bind') queryClient.invalidateQueries({ queryKey: ['pointDeviceBindLogs'] });
    if (tab === 'status') queryClient.invalidateQueries({ queryKey: ['servicePointStatusLogs'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (activeTab === 'qr') return payload.id ? api.servicePointQrRecord.edit(payload) : api.servicePointQrRecord.add(payload);
      if (activeTab === 'maintain') return payload.id ? api.servicePointMaintainRecord.edit(payload) : api.servicePointMaintainRecord.add(payload);
      if (activeTab === 'bind') return payload.id ? api.pointDeviceBindLog.edit(payload) : api.pointDeviceBindLog.add(payload);
      return payload.id ? api.servicePointStatusLog.edit(payload) : api.servicePointStatusLog.add(payload);
    },
    onSuccess: () => {
      message.success('点位档案已保存');
      invalidateTab(activeTab);
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tab, id }: { tab: PointProfileTab; id: number }) => {
      if (tab === 'qr') return api.servicePointQrRecord.remove(id);
      if (tab === 'maintain') return api.servicePointMaintainRecord.remove(id);
      if (tab === 'bind') return api.pointDeviceBindLog.remove(id);
      return api.servicePointStatusLog.remove(id);
    },
    onSuccess: (_, variables) => {
      message.success('点位档案已删除');
      invalidateTab(variables.tab);
    },
  });

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const confirmRemove = (tab: PointProfileTab, id: number) => {
    showBusinessConfirm({
      title: '确认删除该点位档案',
      content: `删除后将移除「${pointProfileModalTitleMap[tab]}」记录，并影响点位运营追溯，请确认后继续。`,
      onOk: () => removeMutation.mutate({ tab, id }),
    });
  };

  const openModal = (tab: PointProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(normalizePickerInitialValues(record as unknown as Record<string, any>));
    } else if (tab === 'qr') {
      form.setFieldsValue({ status: 'APPROVED' });
    } else if (tab === 'maintain') {
      form.setFieldsValue({ status: 'PENDING' });
    } else if (tab === 'bind') {
      form.setFieldsValue({ pointType: 'CAR_WASH_BAY' });
    } else {
      form.setFieldsValue({ afterStatus: 'IDLE' });
    }
    setModalVisible(true);
  };

  const actionColumn = (tab: PointProfileTab): ProColumns<EditableRecord> => ({
    title: '操作',
    width: 170,
    fixed: 'right',
    render: (_, record) => (
      <>
        <Button size="small" type="link" onClick={() => setDetail(record)}>详情</Button>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(tab, record)}>编辑</Button>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => confirmRemove(tab, record.id)}>删除</Button>
      </>
    ),
  });

  const qrColumns = useMemo<ProColumns<ServicePointQrRecord>[]>(() => [
    { title: '点位编号', dataIndex: 'pointCode', width: 140 },
    { title: '二维码', dataIndex: 'qrCode', width: 280 },
    { title: '版本', dataIndex: 'qrVersion', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    actionColumn('qr') as ProColumns<ServicePointQrRecord>,
  ], []);

  const maintainColumns = useMemo<ProColumns<ServicePointMaintainRecord>[]>(() => [
    { title: '维护单号', dataIndex: 'maintainNo', width: 180 },
    { title: '点位编号', dataIndex: 'pointCode', width: 140 },
    { title: '维护类型', dataIndex: 'maintainType', width: 130 },
    { title: '负责人', dataIndex: 'owner', width: 130 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, maintainStatusMap) },
    { title: '计划时间', dataIndex: 'plannedAt', width: 180, render: (_, record) => formatDateTime(record.plannedAt) },
    actionColumn('maintain') as ProColumns<ServicePointMaintainRecord>,
  ], []);

  const bindColumns = useMemo<ProColumns<PointDeviceBindLogRecord>[]>(() => [
    { title: '绑定单号', dataIndex: 'bindNo', width: 180 },
    { title: '点位编号', dataIndex: 'pointCode', width: 140 },
    { title: '点位类型', dataIndex: 'pointType', width: 140, render: (_, record) => renderStatusTag(record.pointType, pointTypeMap) },
    { title: '原设备', dataIndex: 'beforeDevice', width: 140 },
    { title: '新设备', dataIndex: 'afterDevice', width: 140 },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '绑定时间', dataIndex: 'boundAt', width: 180, render: (_, record) => formatDateTime(record.boundAt) },
    actionColumn('bind') as ProColumns<PointDeviceBindLogRecord>,
  ], []);

  const statusColumns = useMemo<ProColumns<ServicePointStatusLogRecord>[]>(() => [
    { title: '日志编号', dataIndex: 'logNo', width: 180 },
    { title: '点位编号', dataIndex: 'pointCode', width: 140 },
    { title: '原状态', dataIndex: 'beforeStatus', width: 120, render: (_, record) => renderStatusTag(record.beforeStatus, pointStatusMap) },
    { title: '新状态', dataIndex: 'afterStatus', width: 120, render: (_, record) => renderStatusTag(record.afterStatus, pointStatusMap) },
    { title: '原因', dataIndex: 'reason', width: 180 },
    { title: '变更时间', dataIndex: 'changedAt', width: 180, render: (_, record) => formatDateTime(record.changedAt) },
    actionColumn('status') as ProColumns<ServicePointStatusLogRecord>,
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="点位档案中心" subtitle="维护点位二维码、维护记录、设备绑定日志和状态流转。" icon={<QrcodeOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="二维码" value={qrRecords.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待维护" value={maintainRecords.filter((item) => item.status === 'PENDING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="绑定日志" value={bindLogs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="状态流转" value={statusLogs.length} suffix="条" /></Card></Col>
      </Row>

      <Form
        form={searchForm}
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={(values) => setKeyword(String(values.keyword || ''))}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="输入点位、二维码、维护单、设备关键词" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { searchForm.resetFields(); setKeyword(''); }}>重置</Button>
        </Form.Item>
      </Form>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as PointProfileTab)}
        items={[
          { key: 'qr', label: '二维码', children: <ProTable<ServicePointQrRecord> cardBordered rowKey="id" columns={qrColumns} dataSource={filter(qrRecords)} loading={qrQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1260 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('qr')}>生成二维码</Button>]} /> },
          { key: 'maintain', label: '维护记录', children: <ProTable<ServicePointMaintainRecord> cardBordered rowKey="id" columns={maintainColumns} dataSource={filter(maintainRecords)} loading={maintainQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('maintain')}>新增维护</Button>]} /> },
          { key: 'bind', label: '绑定日志', children: <ProTable<PointDeviceBindLogRecord> cardBordered rowKey="id" columns={bindColumns} dataSource={filter(bindLogs)} loading={bindQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1320 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('bind')}>新增绑定</Button>]} /> },
          { key: 'status', label: '状态流转', children: <ProTable<ServicePointStatusLogRecord> cardBordered rowKey="id" columns={statusColumns} dataSource={filter(statusLogs)} loading={statusQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1180 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('status')}>新增状态</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title={`${pointProfileModalTitleMap[activeTab]}详情`} open={!!detail} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={pointProfileDetailFields[activeTab]} /> : null}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow={editingRecord ? '点位档案维护' : '点位档案新增'}
        title={`${editingRecord ? '编辑' : '新增'}${pointProfileModalTitleMap[activeTab]}`}
        subtitle={pointProfileModalDescMap[activeTab]}
        meta={[pointProfileModalTitleMap[activeTab], editingRecord ? '编辑模式' : '新建模式']}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(normalizePickerValues(await form.validateFields()))}
        confirmLoading={saveMutation.isPending}
        width={980}
        okText={editingRecord ? '保存变更' : '保存档案'}
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="merchant-editor-shell">
            <BusinessEditorSection
              icon={<QrcodeOutlined />}
              title="归属点位"
              desc="所有二维码、维护、绑定和状态记录都需要落到具体点位，便于现场追踪和扫码履约。"
            >
              <div className="merchant-editor-fields merchant-editor-fields--two">
                <Form.Item name="servicePointId" label="所属点位" rules={[{ required: true, message: '请选择点位' }]}>
                  <Select showSearch optionFilterProp="label" options={pointOptions || []} placeholder="请选择点位" />
                </Form.Item>
                <Form.Item name="pointCode" label="点位编号"><Input placeholder="选择点位后可回填或手动记录" /></Form.Item>
              </div>
            </BusinessEditorSection>

            {activeTab === 'qr' ? (
              <BusinessEditorSection icon={<QrcodeOutlined />} title="二维码信息" desc="维护二维码内容、版本和审核状态，保证扫码入口有效。">
                <div className="merchant-editor-fields">
                  <Form.Item className="merchant-editor-field-span-all" name="qrCode" label="二维码" rules={[{ required: true, message: '请输入二维码' }]}><Input placeholder="二维码内容或资源地址" /></Form.Item>
                  <Form.Item name="qrVersion" label="版本"><Input placeholder="例如：v1.0" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={auditStatusOptions} placeholder="请选择状态" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {activeTab === 'maintain' ? (
              <BusinessEditorSection icon={<ToolOutlined />} title="维护计划" desc="记录维护单号、类型、负责人、计划时间和状态，形成现场保养闭环。">
                <div className="merchant-editor-fields">
                  <Form.Item name="maintainNo" label="维护单号" rules={[{ required: true, message: '请输入维护单号' }]}><Input placeholder="例如：MT-BAY-20260510-001" /></Form.Item>
                  <Form.Item name="maintainType" label="维护类型"><Input placeholder="例如：日常巡检 / 故障检修" /></Form.Item>
                  <Form.Item name="owner" label="负责人"><Input placeholder="现场处理人" /></Form.Item>
                  <Form.Item name="status" label="状态"><Select options={maintainStatusOptions} placeholder="请选择状态" /></Form.Item>
                  <Form.Item name="plannedAt" label="计划时间"><DateTimeField /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {activeTab === 'bind' ? (
              <BusinessEditorSection icon={<LinkOutlined />} title="绑定变更" desc="记录设备绑定前后关系、操作人和绑定时间，保证点位设备切换可追溯。">
                <div className="merchant-editor-fields">
                  <Form.Item name="bindNo" label="绑定单号" rules={[{ required: true, message: '请输入绑定单号' }]}><Input placeholder="例如：BIND-BAY-20260510-001" /></Form.Item>
                  <Form.Item name="pointType" label="点位类型"><Select options={pointTypeOptions} placeholder="请选择点位类型" /></Form.Item>
                  <Form.Item name="operator" label="操作人"><Input placeholder="记录绑定操作人" /></Form.Item>
                  <Form.Item name="beforeDevice" label="原设备"><Input placeholder="原设备编号或名称" /></Form.Item>
                  <Form.Item name="afterDevice" label="新设备"><Input placeholder="新设备编号或名称" /></Form.Item>
                  <Form.Item name="boundAt" label="绑定时间"><DateTimeField /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}

            {activeTab === 'status' ? (
              <BusinessEditorSection icon={<SwapOutlined />} title="状态变更" desc="记录点位状态变化、变更时间和原因，支撑异常复盘和用户端展示一致。">
                <div className="merchant-editor-fields">
                  <Form.Item name="logNo" label="日志编号" rules={[{ required: true, message: '请输入日志编号' }]}><Input placeholder="例如：LOG-BAY-20260510-001" /></Form.Item>
                  <Form.Item name="beforeStatus" label="原状态"><Select options={pointStatusOptions} placeholder="请选择原状态" /></Form.Item>
                  <Form.Item name="afterStatus" label="新状态"><Select options={pointStatusOptions} placeholder="请选择新状态" /></Form.Item>
                  <Form.Item name="changedAt" label="变更时间"><DateTimeField /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="reason" label="原因"><Input.TextArea rows={3} placeholder="记录状态变更原因、异常说明或人工处理备注" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default ServicePointProfileManagement;
