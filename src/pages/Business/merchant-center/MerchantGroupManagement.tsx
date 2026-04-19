import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, message } from 'antd';
import { ApartmentOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface MerchantGroupRecord {
  id: string;
  groupCode: string;
  groupName: string;
  merchantName: string;
  groupType: string;
  city: string;
  storeCount: number;
  scopeLevel: string;
  scope: string;
  writeoffRule: string;
  owner: string;
  status: string;
  updatedAt: string;
}

const groupTypeMap = {
  REGION: { color: 'blue', text: '区域分组' },
  ACTIVITY: { color: 'purple', text: '活动门店组' },
  WRITEOFF: { color: 'cyan', text: '核销门店组' },
  REPORT: { color: 'gold', text: '统计门店组' },
};

const statusMap = {
  ENABLED: { color: 'success', text: '启用' },
  DRAFT: { color: 'gold', text: '草稿' },
  DISABLED: { color: 'default', text: '停用' },
};

const scopeLevelMap = {
  MERCHANT: { color: 'blue', text: '商户级' },
  STORE_GROUP: { color: 'purple', text: '门店组级' },
  CITY: { color: 'cyan', text: '城市级' },
};

const initialRecords: MerchantGroupRecord[] = [
  {
    id: 'g1',
    groupCode: 'MG-SH-001',
    groupName: '上海直营夜洗门店组',
    merchantName: '鲸洗直营运营中心',
    groupType: 'ACTIVITY',
    city: '上海',
    storeCount: 4,
    scopeLevel: 'STORE_GROUP',
    scope: '夜间活动、充值返利、邀请首充奖励',
    writeoffRule: '仅限夜洗活动券跨店核销',
    owner: '平台运营-何铭',
    status: 'ENABLED',
    updatedAt: '2026-04-18 10:12:00',
  },
  {
    id: 'g2',
    groupCode: 'MG-JD-018',
    groupName: '嘉定联营核销组',
    merchantName: '嘉定联营服务商',
    groupType: 'WRITEOFF',
    city: '上海',
    storeCount: 3,
    scopeLevel: 'MERCHANT',
    scope: '跨店核销、门店自提、次卡通用',
    writeoffRule: '指定门店人工核销 + 后台补核销',
    owner: '区域运营-周可',
    status: 'DRAFT',
    updatedAt: '2026-04-17 19:28:00',
  },
  {
    id: 'g3',
    groupCode: 'MG-REPORT-003',
    groupName: '长宁经营统计组',
    merchantName: '鲸洗直营运营中心',
    groupType: 'REPORT',
    city: '上海',
    storeCount: 5,
    scopeLevel: 'CITY',
    scope: '区域经营看板、设备巡检汇总、店长排名',
    writeoffRule: '只读统计，不参与核销',
    owner: '数据运营-陶然',
    status: 'ENABLED',
    updatedAt: '2026-04-16 15:42:00',
  },
];

const MerchantGroupManagement: React.FC = () => {
  const [form] = Form.useForm<MerchantGroupRecord>();
  const [records, setRecords] = useState(initialRecords);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detail, setDetail] = useState<MerchantGroupRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MerchantGroupRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const dataSource = useMemo(
    () =>
      records.filter(
        (item) =>
          containsKeyword(keyword, [item.groupCode, item.groupName, item.merchantName, item.city, item.scope, item.owner]) &&
          (!typeFilter || item.groupType === typeFilter) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [keyword, records, statusFilter, typeFilter]
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
      valueEnum: buildValueEnum(Object.entries(groupTypeMap).map(([value, item]) => ({ value, label: item.text }))),
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
      valueEnum: buildValueEnum(Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))),
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
          <Button
            size="small"
            onClick={() => {
              setRecords((prev) =>
                prev.map((item) =>
                  item.id === record.id
                    ? { ...item, status: item.status === 'ENABLED' ? 'DISABLED' : 'ENABLED', updatedAt: new Date().toISOString() }
                    : item
                )
              );
              message.success('门店组状态已更新');
            }}
          >
            {record.status === 'ENABLED' ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRecord) {
      setRecords((prev) =>
        prev.map((item) =>
          item.id === editingRecord.id
            ? { ...item, ...values, updatedAt: new Date().toISOString() }
            : item
        )
      );
      message.success('门店组已更新');
    } else {
      setRecords((prev) => [
        {
          ...values,
          id: `group-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      message.success('门店组已创建');
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="门店组管理" subtitle="按文档补齐区域、活动、核销、统计门店组的配置与查看能力。" icon={<ApartmentOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店组总量" value={records.length} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="活动门店组" value={records.filter((item) => item.groupType === 'ACTIVITY').length} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="跨店核销组" value={records.filter((item) => item.groupType === 'WRITEOFF').length} suffix="组" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="覆盖门店" value={records.reduce((sum, item) => sum + item.storeCount, 0)} suffix="家" /></Card></Col>
      </Row>

      <ProTable<MerchantGroupRecord>
        cardBordered
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1880 }}
        toolBarRender={() => [
          <Button key="assign" onClick={() => setHelperVisible(true)}>批量配置门店</Button>,
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
        onSubmit={(values) => {
          setKeyword(String(values.keyword || ''));
          setTypeFilter(values.groupType as string | undefined);
          setStatusFilter(values.status as string | undefined);
        }}
        onReset={() => {
          setKeyword('');
          setTypeFilter(undefined);
          setStatusFilter(undefined);
        }}
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
              <Select options={Object.entries(groupTypeMap).map(([value, item]) => ({ value, label: item.text }))} />
            </Form.Item>
            <Form.Item name="scopeLevel" label="作用层级" rules={[{ required: true, message: '请选择作用层级' }]}>
              <Select options={Object.entries(scopeLevelMap).map(([value, item]) => ({ value, label: item.text }))} />
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
              <Select options={Object.entries(statusMap).map(([value, item]) => ({ value, label: item.text }))} />
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

      <Modal title="批量配置门店" open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="用途">用于把多个门店快速加入活动组、核销组或统计组。</Descriptions.Item>
          <Descriptions.Item label="建议流程">先筛商户，再选门店，再确认生效范围。</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default MerchantGroupManagement;
