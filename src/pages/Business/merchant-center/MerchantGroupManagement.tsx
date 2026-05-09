import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, message } from 'antd';
import { ApartmentOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { merchantGroupTypeOptions, scopeLevelOptions, templateStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import api from '@/services/backendService';
import type { MerchantGroupRecord, MerchantGroupStoreRecord, SelectOptionRecord } from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

const groupTypeMap = buildValueEnum(merchantGroupTypeOptions);
const statusMap = buildValueEnum(templateStatusOptions);
const scopeLevelMap = buildValueEnum(scopeLevelOptions);

const MerchantGroupManagement: React.FC = () => {
  const [form] = Form.useForm<MerchantGroupRecord>();
  const [records, setRecords] = useState<MerchantGroupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detail, setDetail] = useState<MerchantGroupRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MerchantGroupRecord | null>(null);
  const [memberForm] = Form.useForm<MerchantGroupStoreRecord>();
  const [memberVisible, setMemberVisible] = useState(false);
  const [memberGroup, setMemberGroup] = useState<MerchantGroupRecord | null>(null);
  const [members, setMembers] = useState<MerchantGroupStoreRecord[]>([]);
  const [editingMember, setEditingMember] = useState<MerchantGroupStoreRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const { data: storeOptions } = useQuery({ queryKey: ['storeOptionsForMerchantGroups'], queryFn: async () => (await api.store.options()).data });
  const storeOptionMap = useMemo(() => new Map((storeOptions as SelectOptionRecord[] | undefined || []).map((item) => [item.value, item.label])), [storeOptions]);
  const fetchRecords = async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const result = await api.merchantGroup.page({
        current: 1,
        size: 100,
        keyword,
        groupType: typeFilter,
        status: statusFilter,
        ...params,
      });
      const page = 'data' in result ? result.data : result;
      setRecords(page.records || []);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const fetchMembers = async (group: MerchantGroupRecord) => {
    setMemberLoading(true);
    try {
      const result = await api.merchantGroupStore.page({ current: 1, size: 100, groupId: group.id });
      const page = 'data' in result ? result.data : result;
      setMembers(page.records || []);
    } finally {
      setMemberLoading(false);
    }
  };

  const openMemberModal = async (record: MerchantGroupRecord) => {
    setMemberGroup(record);
    setEditingMember(null);
    memberForm.resetFields();
    setMemberVisible(true);
    await fetchMembers(record);
  };

  const handleMemberSubmit = async () => {
    if (!memberGroup) return;
    const values = await memberForm.validateFields();
    if (editingMember) {
      await api.merchantGroupStore.edit({ ...editingMember, ...values });
      message.success('门店成员已更新');
    } else {
      await api.merchantGroupStore.add({
        ...values,
        groupId: memberGroup.id,
        merchantId: memberGroup.merchantId,
        status: values.status || 'ENABLED',
      });
      message.success('门店成员已添加');
    }
    setEditingMember(null);
    memberForm.resetFields();
    await fetchMembers(memberGroup);
      await api.merchantGroup.edit({ ...memberGroup, storeCount: members.length + (editingMember ? 0 : 1) } as Record<string, unknown>);
    fetchRecords();
  };

  const summary = useMemo(
    () => ({
      total: records.length,
      activity: records.filter((item) => item.groupType === 'ACTIVITY').length,
      writeoff: records.filter((item) => item.groupType === 'WRITEOFF').length,
      stores: records.reduce((sum, item) => sum + Number(item.storeCount || 0), 0),
    }),
    [records]
  );

  const columns: ProColumns<MerchantGroupRecord>[] = [
    {
      title: '门店组',
      dataIndex: 'groupName',
      width: 240,
      hideInSearch: true,
      render: (_, record) => (
        <div>
          <div>{record.groupName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>{record.groupCode}</div>
        </div>
      ),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店组 / 商户 / 城市 / 负责人' } },
    { title: '所属商户', dataIndex: 'merchantName', width: 180, search: false },
    {
      title: '分组类型',
      dataIndex: 'groupType',
      width: 140,
      valueType: 'select',
      valueEnum: groupTypeMap,
      render: (_, record) => renderStatusTag(record.groupType, groupTypeMap),
    },
    {
      title: '作用层级',
      dataIndex: 'scopeLevel',
      width: 120,
      search: false,
      render: (_, record) => renderStatusTag(record.scopeLevel, scopeLevelMap),
    },
    { title: '城市', dataIndex: 'city', width: 120, search: false },
    { title: '门店数', dataIndex: 'storeCount', width: 100, search: false },
    { title: '用途范围', dataIndex: 'scope', width: 240, search: false },
    { title: '核销规则', dataIndex: 'writeoffRule', width: 220, search: false },
    { title: '负责人', dataIndex: 'owner', width: 140, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: statusMap,
      render: (_, record) => renderStatusTag(record.status, statusMap),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, search: false, render: (_, record) => formatDateTime(record.updatedAt) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button size="small" onClick={() => openMemberModal(record)}>成员</Button>
          <Popconfirm
            title={`确认${record.status === 'ENABLED' ? '停用' : '启用'}该门店组？`}
            onConfirm={async () => {
              await api.merchantGroup.changeStatus(record.id, record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED');
              message.success('门店组状态已更新');
              fetchRecords();
            }}
          >
            <Button size="small">{record.status === 'ENABLED' ? '停用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRecord) {
      await api.merchantGroup.edit({ ...editingRecord, ...values } as Record<string, unknown>);
      message.success('门店组已更新');
    } else {
      await api.merchantGroup.add(values as unknown as Record<string, unknown>);
      message.success('门店组已创建');
    }
    closeModal();
    fetchRecords();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店组管理" subtitle="按文档补齐区域、活动、核销、统计门店组的配置与查看能力。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店组总量" value={summary.total} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动门店组" value={summary.activity} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="跨店核销组" value={summary.writeoff} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="覆盖门店" value={summary.stores} suffix="家" /></Card></Col>
      </Row>

      <ProTable<MerchantGroupRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        request={async (params) => {
          const result = await api.merchantGroup.page({
            current: params.current,
            size: params.pageSize,
            keyword: params.keyword,
            groupType: params.groupType,
            status: params.status,
          });
          const page = 'data' in result ? result.data : result;
          setRecords(page.records || []);
          setKeyword(String(params.keyword || ''));
          setTypeFilter(params.groupType as string | undefined);
          setStatusFilter(params.status as string | undefined);
          return { data: page.records || [], total: page.total, success: true };
        }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1880 }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              form.setFieldsValue({ groupType: 'ACTIVITY', scopeLevel: 'STORE_GROUP', status: 'DRAFT', storeCount: 0 });
              setModalVisible(true);
            }}
          >
            新建门店组
          </Button>,
        ]}
      />

      <Modal
        title={editingRecord ? `编辑门店组 · ${editingRecord.groupName}` : '新建门店组'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        width={860}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="groupCode" label="门店组编码" rules={[{ required: true, message: '请输入门店组编码' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="groupName" label="门店组名称" rules={[{ required: true, message: '请输入门店组名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="merchantName" label="所属商户" rules={[{ required: true, message: '请输入所属商户' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="groupType" label="分组类型" rules={[{ required: true, message: '请选择分组类型' }]}>
              <Select options={merchantGroupTypeOptions} />
            </Form.Item>
            <Form.Item name="scopeLevel" label="作用层级" rules={[{ required: true, message: '请选择作用层级' }]}>
              <Select options={scopeLevelOptions} />
            </Form.Item>
            <Form.Item name="city" label="城市">
              <Input />
            </Form.Item>
            <Form.Item name="storeCount" label="门店数">
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="负责人">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={templateStatusOptions} />
            </Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="scope" label="用途范围">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="writeoffRule" label="核销规则">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="门店组详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={820}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店组编码">{detail.groupCode}</Descriptions.Item>
            <Descriptions.Item label="门店组名称">{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label="所属商户">{detail.merchantName}</Descriptions.Item>
            <Descriptions.Item label="分组类型">{groupTypeMap[detail.groupType as keyof typeof groupTypeMap]?.text || detail.groupType}</Descriptions.Item>
            <Descriptions.Item label="作用层级">{scopeLevelMap[detail.scopeLevel as keyof typeof scopeLevelMap]?.text || detail.scopeLevel}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="门店数">{detail.storeCount}</Descriptions.Item>
            <Descriptions.Item label="用途范围">{detail.scope}</Descriptions.Item>
            <Descriptions.Item label="核销规则">{detail.writeoffRule}</Descriptions.Item>
            <Descriptions.Item label="负责人">{detail.owner}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={memberGroup ? `门店组成员 · ${memberGroup.groupName}` : '门店组成员'}
        open={memberVisible}
        onCancel={() => {
          setMemberVisible(false);
          setMemberGroup(null);
          setEditingMember(null);
          memberForm.resetFields();
        }}
        footer={null}
        width={920}
      >
        <Form form={memberForm} layout="vertical" style={{ marginBottom: 16 }}>
          <div className="modal-grid">
            <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
              <Select options={storeOptions as SelectOptionRecord[]} onChange={(value) => memberForm.setFieldValue('storeName', storeOptionMap.get(value))} />
            </Form.Item>
            <Form.Item name="storeCode" label="门店编码">
              <Input />
            </Form.Item>
            <Form.Item name="storeName" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue="ENABLED">
              <Select options={templateStatusOptions} />
            </Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="备注">
              <Input />
            </Form.Item>
          </div>
          <Space>
            <Button type="primary" onClick={handleMemberSubmit}>{editingMember ? '更新成员' : '添加成员'}</Button>
            <Button onClick={() => { setEditingMember(null); memberForm.resetFields(); }}>清空</Button>
          </Space>
        </Form>
        <ProTable<MerchantGroupStoreRecord>
          rowKey="id"
          search={false}
          options={false}
          loading={memberLoading}
          dataSource={members}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '门店ID', dataIndex: 'storeId', width: 100 },
            { title: '门店编码', dataIndex: 'storeCode', width: 140 },
            { title: '门店名称', dataIndex: 'storeName', width: 180 },
            { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, statusMap) },
            { title: '备注', dataIndex: 'remark', width: 180 },
            {
              title: '操作',
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingMember(record);
                      memberForm.setFieldsValue(record);
                    }}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认移除该门店成员？"
                    onConfirm={async () => {
                      await api.merchantGroupStore.remove(record.id);
                      message.success('门店成员已移除');
                      if (memberGroup) {
                        await fetchMembers(memberGroup);
                        await api.merchantGroup.edit({ ...memberGroup, storeCount: Math.max(0, members.length - 1) } as Record<string, unknown>);
                        fetchRecords();
                      }
                    }}
                  >
                    <Button size="small" danger>移除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default MerchantGroupManagement;
