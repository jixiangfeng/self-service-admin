import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface WriteOffRecord {
  id: string;
  writeoffNo: string;
  objectType: string;
  objectName: string;
  method: string;
  storeName: string;
  operator: string;
  result: string;
  status: string;
  createdAt: string;
}

interface PerformRecord {
  id: string;
  relationNo: string;
  scene: string;
  storeName: string;
  pointCode: string;
  startAt: string;
  finishAt: string;
  status: string;
  remark: string;
}

const writeOffStatusMap = {
  SUCCESS: { color: 'success', text: '核销成功' },
  PENDING: { color: 'gold', text: '待核销' },
  ROLLED_BACK: { color: 'default', text: '已回滚' },
  EXCEPTION: { color: 'warning', text: '异常处理' },
};

const performStatusMap = {
  STARTED: { color: 'processing', text: '履约中' },
  FINISHED: { color: 'success', text: '已完成' },
  ABNORMAL: { color: 'warning', text: '异常中断' },
};

const initialWriteOffRecords: WriteOffRecord[] = [
  { id: 'w1', writeoffNo: 'WO202604180001', objectType: '优惠券', objectName: '夜洗 8 元券', method: '自动核销', storeName: '徐汇夜洗门店', operator: '系统', result: '核销成功', status: 'SUCCESS', createdAt: '2026-04-18 09:15:00' },
  { id: 'w2', writeoffNo: 'WO202604180017', objectType: '服务权益', objectName: '泡沫精洗套餐权益', method: '设备自动核销', storeName: '虹桥旗舰洗车站', operator: '系统', result: '等待设备回执', status: 'PENDING', createdAt: '2026-04-18 09:30:00' },
  { id: 'w3', writeoffNo: 'WO202604170089', objectType: '自提资格', objectName: '门店自提订单', method: '店员扫码', storeName: '嘉定联营门店', operator: '店员-周可', result: '用户重复核销，已回滚', status: 'ROLLED_BACK', createdAt: '2026-04-17 17:08:00' },
];

const initialPerformRecords: PerformRecord[] = [
  { id: 'p1', relationNo: 'SO202604180019', scene: '扫码洗车', storeName: '虹桥旗舰洗车站', pointCode: 'BAY-03', startAt: '2026-04-18 09:27:00', finishAt: '-', status: 'STARTED', remark: '设备已启动，等待结束回执' },
  { id: 'p2', relationNo: 'SO202604170101', scene: '套餐洗车', storeName: '嘉定联营门店', pointCode: 'BAY-02', startAt: '2026-04-17 19:42:00', finishAt: '2026-04-17 19:58:00', status: 'FINISHED', remark: '履约完成' },
  { id: 'p3', relationNo: 'SO202604170113', scene: '夜洗按时长', storeName: '徐汇夜洗门店', pointCode: 'BAY-07', startAt: '2026-04-17 22:08:00', finishAt: '2026-04-17 22:15:00', status: 'ABNORMAL', remark: '风干设备启动失败，中途异常中断' },
];

const FulfillmentManagement: React.FC = () => {
  const [writeOffKeyword, setWriteOffKeyword] = useState('');
  const [performKeyword, setPerformKeyword] = useState('');
  const [writeoffs, setWriteoffs] = useState(initialWriteOffRecords);
  const [performs, setPerforms] = useState(initialPerformRecords);
  const [detail, setDetail] = useState<WriteOffRecord | PerformRecord | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'writeoff' | 'perform'>('writeoff');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<{ status: string; remark: string }>();

  const filteredWriteOffs = useMemo(() => writeoffs.filter((item) => containsKeyword(writeOffKeyword, [item.writeoffNo, item.objectType, item.objectName, item.storeName, item.result])), [writeOffKeyword, writeoffs]);
  const filteredPerforms = useMemo(() => performs.filter((item) => containsKeyword(performKeyword, [item.relationNo, item.scene, item.storeName, item.pointCode, item.remark])), [performKeyword, performs]);

  const writeOffColumns: ProColumns<WriteOffRecord>[] = [
    { title: '核销单号', dataIndex: 'writeoffNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '核销单号 / 对象 / 门店 / 结果' } },
    { title: '核销对象', dataIndex: 'objectType', width: 120, search: false },
    { title: '对象名称', dataIndex: 'objectName', width: 200, search: false },
    { title: '核销方式', dataIndex: 'method', width: 140, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '操作人', dataIndex: 'operator', width: 120, search: false },
    { title: '结果摘要', dataIndex: 'result', width: 180, search: false },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
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
              setActionType('writeoff');
              setCurrentId(record.id);
              actionForm.setFieldsValue({ status: record.status, remark: record.result });
              setActionModalVisible(true);
            }}
          >
            补核销
          </Button>
          <Button
            size="small"
            onClick={() => {
              setWriteoffs((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'ROLLED_BACK', result: '已执行人工回滚' } : item));
              message.success('核销记录已回滚');
            }}
          >
            回滚
          </Button>
        </Space>
      ),
    },
  ];

  const performColumns: ProColumns<PerformRecord>[] = [
    { title: '关联单号', dataIndex: 'relationNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 场景 / 门店 / 点位 / 说明' } },
    { title: '履约场景', dataIndex: 'scene', width: 140, search: false },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '开始时间', dataIndex: 'startAt', width: 180, search: false, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'finishAt', width: 180, search: false, render: (_, record) => formatDateTime(record.finishAt) },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, performStatusMap) },
    { title: '备注', dataIndex: 'remark', width: 200, search: false },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>日志</Button>
          <Button
            size="small"
            onClick={() => {
              setActionType('perform');
              setCurrentId(record.id);
              actionForm.setFieldsValue({ status: record.status, remark: record.remark });
              setActionModalVisible(true);
            }}
          >
            异常处理
          </Button>
          <Button
            size="small"
            onClick={() => {
              setPerforms((prev) => prev.map((item) => item.id === record.id ? { ...item, status: 'FINISHED', finishAt: new Date().toISOString(), remark: '已人工纠偏完成履约' } : item));
              message.success('履约状态已纠偏');
            }}
          >
            纠偏完成
          </Button>
        </Space>
      ),
    },
  ];

  const handleActionSubmit = async () => {
    const values = await actionForm.validateFields();
    if (!currentId) {
      return;
    }

    if (actionType === 'writeoff') {
      setWriteoffs((prev) => prev.map((item) => item.id === currentId ? { ...item, status: values.status, result: values.remark } : item));
      message.success('核销记录已更新');
    } else {
      setPerforms((prev) => prev.map((item) => item.id === currentId ? { ...item, status: values.status, remark: values.remark, finishAt: values.status === 'FINISHED' ? new Date().toISOString() : item.finishAt } : item));
      message.success('履约记录已更新');
    }

    setActionModalVisible(false);
    setCurrentId(null);
    actionForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="核销履约" subtitle="管理权益核销记录、履约日志、异常处理和后台补核销动作。" icon={<AuditOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待核销" value={writeoffs.filter((item) => item.status === 'PENDING').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="履约中" value={performs.filter((item) => item.status === 'STARTED').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="异常回滚" value={writeoffs.filter((item) => item.status === 'ROLLED_BACK').length} suffix="笔" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="异常履约" value={performs.filter((item) => item.status === 'ABNORMAL').length} suffix="单" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'writeoff',
            label: '核销记录',
            children: (
              <ProTable<WriteOffRecord>
                cardBordered
                rowKey="id"
                columns={writeOffColumns}
                dataSource={filteredWriteOffs}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1840 }}
                toolBarRender={() => [<Button key="rollback">异常回滚</Button>, <Button key="supplement" type="primary">后台补核销</Button>]}
                onSubmit={(values) => setWriteOffKeyword(String(values.keyword || ''))}
                onReset={() => setWriteOffKeyword('')}
              />
            ),
          },
          {
            key: 'perform',
            label: '履约日志',
            children: (
              <ProTable<PerformRecord>
                cardBordered
                rowKey="id"
                columns={performColumns}
                dataSource={filteredPerforms}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1780 }}
                toolBarRender={() => [<Button key="refresh">刷新状态</Button>, <Button key="manual" type="primary">人工履约纠偏</Button>]}
                onSubmit={(values) => setPerformKeyword(String(values.keyword || ''))}
                onReset={() => setPerformKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal title="记录详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={720}>
        {detail ? (
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={actionType === 'writeoff' ? '补核销处理' : '履约异常处理'}
        open={actionModalVisible}
        onOk={handleActionSubmit}
        onCancel={() => {
          setActionModalVisible(false);
          setCurrentId(null);
          actionForm.resetFields();
        }}
        width={760}
      >
        <Form form={actionForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={Object.entries(actionType === 'writeoff' ? writeOffStatusMap : performStatusMap).map(([value, item]) => ({ value, label: item.text }))} />
            </Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="remark" label="处理说明" rules={[{ required: true, message: '请输入处理说明' }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FulfillmentManagement;
