import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  performSceneOptions,
  performStatusOptions,
  writeOffMethodOptions,
  writeOffObjectTypeOptions,
  writeOffStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface WriteOffRecord {
  id: string;
  writeoffNo: string;
  objectType: string;
  objectName: string;
  serviceOrderNo: string;
  userName: string;
  method: string;
  storeName: string;
  operator: string;
  amount: number;
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
  deviceCode: string;
  commandNo: string;
  commandStatus: string;
  startAt: string;
  finishAt: string;
  status: string;
  remark: string;
}

const writeOffStatusMap = buildValueEnum(writeOffStatusOptions);
const writeOffObjectTypeMap = buildValueEnum(writeOffObjectTypeOptions);
const writeOffMethodMap = buildValueEnum(writeOffMethodOptions);
const performStatusMap = buildValueEnum(performStatusOptions);
const performSceneMap = buildValueEnum(performSceneOptions);

const initialWriteOffRecords: WriteOffRecord[] = [
  { id: 'w1', writeoffNo: 'WO202604180001', objectType: 'COUPON', objectName: '夜洗 8 元券', serviceOrderNo: 'SO202604180001', userName: '张晨', method: 'AUTO', storeName: '徐汇夜洗门店', operator: '系统', amount: 8, result: '核销成功', status: 'SUCCESS', createdAt: '2026-04-18 09:15:00' },
  { id: 'w2', writeoffNo: 'WO202604180017', objectType: 'SERVICE_RIGHT', objectName: '泡沫精洗套餐权益', serviceOrderNo: 'SO202604180019', userName: '李波', method: 'DEVICE_AUTO', storeName: '虹桥旗舰洗车站', operator: '系统', amount: 29, result: '等待设备回执', status: 'PENDING', createdAt: '2026-04-18 09:30:00' },
  { id: 'w3', writeoffNo: 'WO202604170089', objectType: 'PICKUP', objectName: '门店自提订单', serviceOrderNo: 'RO202604170006', userName: '陈越', method: 'STAFF_SCAN', storeName: '嘉定联营门店', operator: '店员-周可', amount: 12, result: '用户重复核销，已回滚', status: 'ROLLED_BACK', createdAt: '2026-04-17 17:08:00' },
];

const initialPerformRecords: PerformRecord[] = [
  { id: 'p1', relationNo: 'SO202604180019', scene: 'SCAN_CAR_WASH', storeName: '虹桥旗舰洗车站', pointCode: 'BAY-03', deviceCode: 'DEV-HQ-003', commandNo: 'CMD202604180019', commandStatus: '已下发', startAt: '2026-04-18 09:27:00', finishAt: '-', status: 'STARTED', remark: '设备已启动，等待结束回执' },
  { id: 'p2', relationNo: 'SO202604170101', scene: 'PACKAGE_CAR_WASH', storeName: '嘉定联营门店', pointCode: 'BAY-02', deviceCode: 'DEV-JD-002', commandNo: 'CMD202604170101', commandStatus: '回执成功', startAt: '2026-04-17 19:42:00', finishAt: '2026-04-17 19:58:00', status: 'FINISHED', remark: '履约完成' },
  { id: 'p3', relationNo: 'SO202604170113', scene: 'TIME_CAR_WASH', storeName: '徐汇夜洗门店', pointCode: 'BAY-07', deviceCode: 'DEV-XH-007', commandNo: 'CMD202604170113', commandStatus: '回执异常', startAt: '2026-04-17 22:08:00', finishAt: '2026-04-17 22:15:00', status: 'ABNORMAL', remark: '风干设备启动失败，中途异常中断' },
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

  const filteredWriteOffs = useMemo(() => writeoffs.filter((item) => containsKeyword(writeOffKeyword, [item.writeoffNo, item.objectType, item.objectName, item.serviceOrderNo, item.userName, item.storeName, item.result])), [writeOffKeyword, writeoffs]);
  const filteredPerforms = useMemo(() => performs.filter((item) => containsKeyword(performKeyword, [item.relationNo, item.scene, item.storeName, item.pointCode, item.deviceCode, item.commandNo, item.remark])), [performKeyword, performs]);

  const writeOffColumns: ProColumns<WriteOffRecord>[] = [
    { title: '核销单号', dataIndex: 'writeoffNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '核销单号 / 对象 / 订单 / 用户 / 门店 / 结果' } },
    { title: '核销对象', dataIndex: 'objectType', width: 120, valueType: 'select', valueEnum: writeOffObjectTypeMap, render: (_, record) => renderStatusTag(record.objectType, writeOffObjectTypeMap) },
    { title: '对象名称', dataIndex: 'objectName', width: 200, search: false },
    { title: '订单号', dataIndex: 'serviceOrderNo', width: 170, search: false },
    { title: '用户', dataIndex: 'userName', width: 100, search: false },
    { title: '核销方式', dataIndex: 'method', width: 140, valueType: 'select', valueEnum: writeOffMethodMap, render: (_, record) => renderStatusTag(record.method, writeOffMethodMap) },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '操作人', dataIndex: 'operator', width: 120, search: false },
    { title: '核销金额', dataIndex: 'amount', width: 100, search: false },
    { title: '结果摘要', dataIndex: 'result', width: 180, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: writeOffStatusMap, render: (_, record) => renderStatusTag(record.status, writeOffStatusMap) },
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
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 场景 / 门店 / 点位 / 设备 / 指令 / 说明' } },
    { title: '履约场景', dataIndex: 'scene', width: 140, valueType: 'select', valueEnum: performSceneMap, render: (_, record) => renderStatusTag(record.scene, performSceneMap) },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '设备编号', dataIndex: 'deviceCode', width: 140, search: false },
    { title: '指令号', dataIndex: 'commandNo', width: 170, search: false },
    { title: '指令状态', dataIndex: 'commandStatus', width: 120, search: false },
    { title: '开始时间', dataIndex: 'startAt', width: 180, search: false, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'finishAt', width: 180, search: false, render: (_, record) => formatDateTime(record.finishAt) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: performStatusMap, render: (_, record) => renderStatusTag(record.status, performStatusMap) },
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
                scroll={{ x: 2160 }}
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
                scroll={{ x: 2080 }}
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
              <Select options={actionType === 'writeoff' ? writeOffStatusOptions : performStatusOptions} />
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
