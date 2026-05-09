import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Statistic, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
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
import api from '@/services/backendService';
import type {
  PointDeviceBindLogRecord,
  ServicePointMaintainRecord,
  ServicePointQrRecord,
  ServicePointStatusLogRecord,
} from '@/services/backendService';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

type PointProfileTab = 'qr' | 'maintain' | 'bind' | 'status';
type EditableRecord = ServicePointQrRecord | ServicePointMaintainRecord | PointDeviceBindLogRecord | ServicePointStatusLogRecord;

const auditStatusMap = buildValueEnum(auditStatusOptions);
const maintainStatusMap = buildValueEnum(maintainStatusOptions);
const pointStatusMap = buildValueEnum(pointStatusOptions);
const pointTypeMap = buildValueEnum(pointTypeOptions);

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

  const openModal = (tab: PointProfileTab, record?: EditableRecord) => {
    setActiveTab(tab);
    setEditingRecord(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...(record as unknown as Record<string, string | number | undefined>) });
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
        <Popconfirm title="确认删除该记录？" onConfirm={() => removeMutation.mutate({ tab, id: record.id })}>
          <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
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

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入点位、二维码、维护单、设备关键词' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

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

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? <SchemaDetail record={detail as Record<string, any>} fields={pointProfileDetailFields[activeTab]} /> : null}
      </Modal>

      <Modal
        title={editingRecord ? '编辑点位档案' : '新增点位档案'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={async () => saveMutation.mutate(await form.validateFields())}
        confirmLoading={saveMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <div className="modal-grid">
            <Form.Item name="servicePointId" label="所属点位" rules={[{ required: true, message: '请选择点位' }]}>
              <Select showSearch optionFilterProp="label" options={pointOptions || []} />
            </Form.Item>
            <Form.Item name="pointCode" label="点位编号"><Input /></Form.Item>
            {activeTab === 'qr' ? (
              <>
                <Form.Item className="modal-span-2" name="qrCode" label="二维码" rules={[{ required: true, message: '请输入二维码' }]}><Input /></Form.Item>
                <Form.Item name="qrVersion" label="版本"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
              </>
            ) : null}
            {activeTab === 'maintain' ? (
              <>
                <Form.Item name="maintainNo" label="维护单号" rules={[{ required: true, message: '请输入维护单号' }]}><Input /></Form.Item>
                <Form.Item name="maintainType" label="维护类型"><Input /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input /></Form.Item>
                <Form.Item name="status" label="状态"><Select options={maintainStatusOptions} /></Form.Item>
                <Form.Item name="plannedAt" label="计划时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'bind' ? (
              <>
                <Form.Item name="bindNo" label="绑定单号" rules={[{ required: true, message: '请输入绑定单号' }]}><Input /></Form.Item>
                <Form.Item name="pointType" label="点位类型"><Select options={pointTypeOptions} /></Form.Item>
                <Form.Item name="beforeDevice" label="原设备"><Input /></Form.Item>
                <Form.Item name="afterDevice" label="新设备"><Input /></Form.Item>
                <Form.Item name="operator" label="操作人"><Input /></Form.Item>
                <Form.Item name="boundAt" label="绑定时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
              </>
            ) : null}
            {activeTab === 'status' ? (
              <>
                <Form.Item name="logNo" label="日志编号" rules={[{ required: true, message: '请输入日志编号' }]}><Input /></Form.Item>
                <Form.Item name="beforeStatus" label="原状态"><Select options={pointStatusOptions} /></Form.Item>
                <Form.Item name="afterStatus" label="新状态"><Select options={pointStatusOptions} /></Form.Item>
                <Form.Item name="changedAt" label="变更时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" /></Form.Item>
                <Form.Item className="modal-span-2" name="reason" label="原因"><Input.TextArea rows={3} /></Form.Item>
              </>
            ) : null}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServicePointProfileManagement;
