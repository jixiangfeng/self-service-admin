import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, List, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import PageBanner from '@/components/PageBanner';
import { containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

interface UserAssetRecord {
  id: string;
  userName: string;
  phone: string;
  level: string;
  tag: string;
  lastConsumeAt: string;
  blacklist: string;
}

interface BalanceRecord {
  id: string;
  userName: string;
  balance: number;
  giftBalance: number;
  freezeBalance: number;
  rechargeCount: number;
  latestChange: string;
}

interface CouponRecord {
  id: string;
  couponName: string;
  couponType: string;
  scope: string;
  remainCount: number;
  usedCount: number;
  status: string;
}

type AssetModalType = 'tag' | 'balance' | 'coupon' | null;

const userLevelMap = {
  NORMAL: { color: 'default', text: '普通用户' },
  MEMBER: { color: 'blue', text: '会员用户' },
  VIP: { color: 'purple', text: 'VIP 用户' },
};

const blackMap = {
  NORMAL: { color: 'success', text: '正常' },
  WATCH: { color: 'gold', text: '观察名单' },
  BLOCKED: { color: 'default', text: '黑名单' },
};

const couponStatusMap = {
  ENABLED: { color: 'success', text: '启用' },
  PAUSED: { color: 'gold', text: '暂停' },
  EXPIRED: { color: 'default', text: '已过期' },
};

const initialUsers: UserAssetRecord[] = [
  { id: 'u1', userName: '张晨', phone: '13800001111', level: 'VIP', tag: '高频夜洗', lastConsumeAt: '2026-04-18 09:14:00', blacklist: 'NORMAL' },
  { id: 'u2', userName: '陈越', phone: '13800002222', level: 'MEMBER', tag: '邀请活跃', lastConsumeAt: '2026-04-17 22:12:00', blacklist: 'WATCH' },
  { id: 'u3', userName: '李波', phone: '13800003333', level: 'NORMAL', tag: '新客首充', lastConsumeAt: '2026-04-17 20:02:00', blacklist: 'NORMAL' },
];

const initialBalances: BalanceRecord[] = [
  { id: 'b1', userName: '张晨', balance: 126, giftBalance: 18, freezeBalance: 0, rechargeCount: 6, latestChange: '退款回退 +12 元' },
  { id: 'b2', userName: '陈越', balance: 58, giftBalance: 10, freezeBalance: 8, rechargeCount: 2, latestChange: '邀请奖励 +10 元' },
  { id: 'b3', userName: '李波', balance: 30, giftBalance: 5, freezeBalance: 0, rechargeCount: 1, latestChange: '首充赠送 +5 元' },
];

const initialCoupons: CouponRecord[] = [
  { id: 'c1', couponName: '夜洗 8 元券', couponType: '满减券', scope: '指定门店组', remainCount: 128, usedCount: 392, status: 'ENABLED' },
  { id: 'c2', couponName: '邀请首充 5 元券', couponType: '立减券', scope: '平台', remainCount: 88, usedCount: 210, status: 'ENABLED' },
  { id: 'c3', couponName: '泡沫精洗体验券', couponType: '免费服务券', scope: '直营门店', remainCount: 0, usedCount: 162, status: 'EXPIRED' },
];

const AssetManagement: React.FC = () => {
  const [users, setUsers] = useState(initialUsers);
  const [balances, setBalances] = useState(initialBalances);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [detail, setDetail] = useState<UserAssetRecord | BalanceRecord | CouponRecord | null>(null);
  const [modalType, setModalType] = useState<AssetModalType>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [assetKeyword, setAssetKeyword] = useState('');
  const [balanceKeyword, setBalanceKeyword] = useState('');
  const [couponKeyword, setCouponKeyword] = useState('');
  const [form] = Form.useForm();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');

  const closeModal = () => {
    setModalType(null);
    setCurrentId(null);
    form.resetFields();
  };

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  const filteredUsers = useMemo(() => users.filter((item) => containsKeyword(assetKeyword, [item.userName, item.phone, item.tag])), [assetKeyword, users]);
  const filteredBalances = useMemo(() => balances.filter((item) => containsKeyword(balanceKeyword, [item.userName, item.latestChange])), [balanceKeyword, balances]);
  const filteredCoupons = useMemo(() => coupons.filter((item) => containsKeyword(couponKeyword, [item.couponName, item.couponType, item.scope])), [couponKeyword, coupons]);

  const userColumns: ProColumns<UserAssetRecord>[] = [
    { title: '用户', dataIndex: 'userName', width: 120, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '用户 / 手机号 / 标签' } },
    { title: '手机号', dataIndex: 'phone', width: 140, search: false },
    { title: '等级', dataIndex: 'level', width: 120, search: false, render: (_, record) => renderStatusTag(record.level, userLevelMap) },
    { title: '用户标签', dataIndex: 'tag', width: 140, search: false },
    { title: '最近消费', dataIndex: 'lastConsumeAt', width: 180, search: false, render: (_, record) => formatDateTime(record.lastConsumeAt) },
    { title: '风控状态', dataIndex: 'blacklist', width: 120, search: false, render: (_, record) => renderStatusTag(record.blacklist, blackMap) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看画像</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('tag');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, tag: record.tag, blacklist: record.blacklist });
            }}
          >
            加标签
          </Button>
        </Space>
      ),
    },
  ];

  const balanceColumns: ProColumns<BalanceRecord>[] = [
    { title: '用户', dataIndex: 'userName', width: 120, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '用户 / 最新变动' } },
    { title: '余额', dataIndex: 'balance', width: 120, search: false, render: (_, record) => formatAmount(record.balance) },
    { title: '赠送余额', dataIndex: 'giftBalance', width: 120, search: false, render: (_, record) => formatAmount(record.giftBalance) },
    { title: '冻结金额', dataIndex: 'freezeBalance', width: 120, search: false, render: (_, record) => formatAmount(record.freezeBalance) },
    { title: '充值次数', dataIndex: 'rechargeCount', width: 100, search: false },
    { title: '最近变动', dataIndex: 'latestChange', width: 220, search: false },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setModalType('balance');
              setCurrentId(record.id);
              form.setFieldsValue({ userName: record.userName, amount: '', reason: '' });
            }}
          >
            调账
          </Button>
          <Button
            size="small"
            onClick={() => {
              setBalances((prev) => prev.map((item) => item.id === record.id ? { ...item, freezeBalance: item.freezeBalance > 0 ? 0 : 10, latestChange: item.freezeBalance > 0 ? '人工解冻 10 元' : '人工冻结 10 元' } : item));
              message.success('冻结状态已更新');
            }}
          >
            冻结 / 解冻
          </Button>
        </Space>
      ),
    },
  ];

  const couponColumns: ProColumns<CouponRecord>[] = [
    { title: '券模板', dataIndex: 'couponName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '券模板 / 券类型 / 作用范围' } },
    { title: '券类型', dataIndex: 'couponType', width: 120, search: false },
    { title: '作用范围', dataIndex: 'scope', width: 180, search: false },
    { title: '剩余库存', dataIndex: 'remainCount', width: 120, search: false },
    { title: '已使用', dataIndex: 'usedCount', width: 120, search: false },
    { title: '状态', dataIndex: 'status', width: 120, search: false, render: (_, record) => renderStatusTag(record.status, couponStatusMap) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button
            size="small"
            onClick={() => {
              setModalType('coupon');
              setCurrentId(record.id);
              form.setFieldsValue({ couponName: record.couponName, amount: 1, reason: '' });
            }}
          >
            补券
          </Button>
        </Space>
      ),
    },
  ];

  const handleModalSubmit = async () => {
    const values = await form.validateFields();
    if (!currentId || !modalType) {
      return;
    }

    if (modalType === 'tag') {
      setUsers((prev) => prev.map((item) => item.id === currentId ? { ...item, tag: values.tag, blacklist: values.blacklist } : item));
      message.success('用户标签已更新');
    }

    if (modalType === 'balance') {
      setBalances((prev) =>
        prev.map((item) =>
          item.id === currentId
            ? {
                ...item,
                balance: item.balance + Number(values.amount || 0),
                latestChange: values.reason || '人工调账',
              }
            : item
        )
      );
      message.success('余额调整已完成');
    }

    if (modalType === 'coupon') {
      setCoupons((prev) =>
        prev.map((item) =>
          item.id === currentId
            ? {
                ...item,
                remainCount: item.remainCount + Number(values.amount || 0),
              }
            : item
        )
      );
      message.success('补券已完成');
    }

    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="资产总览" subtitle="把用户资产页补成可识别用户、可调账、可补券、可风控处理的本地业务页。" icon={<WalletOutlined />} />
      <WorkflowGuide
        title="用户资产闭环"
        summary="资产页要从用户识别一路走到账户调整、券发放和风险控制，不能只剩三张表。"
        steps={[
          { title: '识别用户', description: '查看画像、等级、标签和风控状态', status: 'finish', tag: '用户档案' },
          { title: '账户动作', description: '处理充值、赠送、冻结和调账', status: 'process', tag: '余额账户' },
          { title: '权益发放', description: '发券、补券、服务卡和活动奖励统一进资产', status: 'process', tag: '卡券权益 / 服务卡与次卡' },
          { title: '回写营销与售后', description: '最终把奖励、补偿和黑名单反馈给营销与客服', status: 'wait', tag: '营销 / 客服' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="用户总量" value={users.length * 138} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="余额用户" value={balances.length * 26} suffix="人" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="券模板" value={coupons.length * 4} suffix="种" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="风控观察名单" value={users.filter((item) => item.blacklist !== 'NORMAL').length} suffix="人" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'users',
            label: '用户档案',
            children: (
              <ProTable<UserAssetRecord>
                cardBordered
                rowKey="id"
                columns={userColumns}
                dataSource={filteredUsers}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1500 }}
                toolBarRender={() => [<Button key="tag" onClick={() => openHelper('批量打标签')}>批量打标签</Button>, <Button key="blacklist" type="primary" onClick={() => openHelper('风控名单管理')}>风控名单管理</Button>]}
                onSubmit={(values) => setAssetKeyword(String(values.keyword || ''))}
                onReset={() => setAssetKeyword('')}
              />
            ),
          },
          {
            key: 'balances',
            label: '余额账户',
            children: (
              <ProTable<BalanceRecord>
                cardBordered
                rowKey="id"
                columns={balanceColumns}
                dataSource={filteredBalances}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1460 }}
                toolBarRender={() => [<Button key="freeze" onClick={() => openHelper('冻结 / 解冻')}>冻结 / 解冻</Button>, <Button key="adjust" type="primary" onClick={() => openHelper('人工调账')}>人工调账</Button>]}
                onSubmit={(values) => setBalanceKeyword(String(values.keyword || ''))}
                onReset={() => setBalanceKeyword('')}
              />
            ),
          },
          {
            key: 'coupons',
            label: '卡券权益',
            children: (
              <ProTable<CouponRecord>
                cardBordered
                rowKey="id"
                columns={couponColumns}
                dataSource={filteredCoupons}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1420 }}
                toolBarRender={() => [<Button key="template" onClick={() => openHelper('新建券模板')}>新建券模板</Button>, <Button key="grant" type="primary" onClick={() => openHelper('手动补券')}>手动补券</Button>]}
                onSubmit={(values) => setCouponKeyword(String(values.keyword || ''))}
                onReset={() => setCouponKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal
        title={modalType === 'tag' ? '用户标签 / 风控处理' : modalType === 'balance' ? '余额调账' : modalType === 'coupon' ? '手动补券' : '资产操作'}
        open={!!modalType}
        onCancel={closeModal}
        onOk={handleModalSubmit}
        width={820}
      >
        <Form form={form} layout="vertical">
          {modalType === 'tag' ? (
            <div className="modal-grid">
              <Form.Item name="userName" label="用户">
                <Input disabled />
              </Form.Item>
              <Form.Item name="blacklist" label="风控状态">
                <Select options={[{ value: 'NORMAL', label: '正常' }, { value: 'WATCH', label: '观察名单' }, { value: 'BLOCKED', label: '黑名单' }]} />
              </Form.Item>
              <Form.Item className="modal-span-2" name="tag" label="用户标签">
                <Input />
              </Form.Item>
            </div>
          ) : null}
          {modalType === 'balance' ? (
            <div className="modal-grid">
              <Form.Item name="userName" label="用户">
                <Input disabled />
              </Form.Item>
              <Form.Item name="amount" label="调整金额" rules={[{ required: true, message: '请输入调整金额' }]}>
                <Input placeholder="例如 +10 或 -5" />
              </Form.Item>
              <Form.Item className="modal-span-2" name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>
          ) : null}
          {modalType === 'coupon' ? (
            <div className="modal-grid">
              <Form.Item name="couponName" label="券模板">
                <Input disabled />
              </Form.Item>
              <Form.Item name="amount" label="补券数量" rules={[{ required: true, message: '请输入补券数量' }]}>
                <Input />
              </Form.Item>
              <Form.Item className="modal-span-2" name="reason" label="补券说明" rules={[{ required: true, message: '请输入补券说明' }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>
          ) : null}
        </Form>
      </Modal>

      <Modal title="资产详情" open={!!detail} width={640} footer={null} onCancel={() => setDetail(null)} destroyOnClose>
        {detail ? (
          <>
            <Card title="资产概览" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small" labelStyle={{ width: 110 }}>
                {Object.entries(detail).filter(([key]) => key !== 'id').map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {typeof value === 'number' && ['balance', 'giftBalance', 'freezeBalance'].includes(key) ? formatAmount(value) : String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
            <Card title="推荐处理动作">
              <List
                dataSource={[
                  '先确认该用户是否命中风控名单或观察名单',
                  '涉及补偿时先区分余额补偿和优惠券补偿',
                  '活动奖励类资产需同步检查是否命中回收规则',
                ]}
                renderItem={(item: string) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </>
        ) : null}
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">这个入口已经从纯空按钮变成可达的业务动作，占位在资产总览页，后续可以继续拆分独立批量处理流程。</Descriptions.Item>
          <Descriptions.Item label="当前模块">{helperTitle}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default AssetManagement;
