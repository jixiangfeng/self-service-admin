import React, { useState } from 'react';
import { Button, Card, Col, Descriptions, List, Modal, Row, Statistic, Tag } from 'antd';
import { ApartmentOutlined, BarChartOutlined, FundProjectionScreenOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageBanner from '@/components/PageBanner';
import { WorkflowGuide } from '@/pages/Business/shared';

const summaryCards = [
  { title: '已落管理页', value: 24, icon: <ApartmentOutlined /> },
  { title: '一期主链路', value: 5, icon: <FundProjectionScreenOutlined /> },
  { title: '二期扩展页', value: 10, icon: <SettingOutlined /> },
  { title: '平台看板维度', value: 4, icon: <BarChartOutlined /> },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');

  const openHelper = (title: string) => {
    setHelperTitle(title);
    setHelperVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="工作台"
        subtitle="平台经营总览与关键业务闭环入口。"
        icon={<FundProjectionScreenOutlined />}
      />

      <Row gutter={[16, 16]}>
        {summaryCards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card>
              <Statistic title={item.title} value={item.value} prefix={item.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24}>
          <WorkflowGuide
            title="经营建档闭环"
            summary="先建商户，再开门店、配点位、绑设备，最后进入商品和交易配置。当前菜单已按这个顺序收敛。"
            steps={[
              { title: '商户建档', description: '维护主体信息、联系人和结算账户', status: 'finish', tag: '入口：商户管理' },
              { title: '门店开设', description: '配置门店档案、营业时间和服务能力', status: 'finish', tag: '入口：门店管理' },
              { title: '点位与设备', description: '建立点位、二维码和设备绑定关系', status: 'process', tag: '入口：点位 / 设备管理' },
              { title: '商品上架', description: '配置服务商品、计费规则和适用范围', status: 'wait', tag: '入口：商品与服务' },
            ]}
            actions={[
              { key: 'merchant', label: '去商户管理', type: 'primary', onClick: () => navigate('/merchant') },
              { key: 'store', label: '去门店管理', onClick: () => navigate('/store') },
            ]}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <WorkflowGuide
            title="活动投放闭环"
            summary="活动不是孤立页面，要串起券模板、充值活动、邀请活动和跨店范围。"
            steps={[
              { title: '券模板', description: '先定义券模板、范围、门槛和有效期', status: 'finish', tag: '券模板管理' },
              { title: '活动范围', description: '选择门店组、跨店活动或商户范围', status: 'process', tag: '跨店活动 / 门店组' },
              { title: '奖励策略', description: '配置邀请、充值、发券和预算规则', status: 'process', tag: '邀请活动 / 充值活动' },
              { title: '效果复盘', description: '回看发放量、ROI 和奖励回收', status: 'wait', tag: '活动营销中心' },
            ]}
            actions={[
              { key: 'coupon', label: '去券模板', type: 'primary', onClick: () => navigate('/marketing/coupon-templates') },
              { key: 'campaign', label: '去活动中心', onClick: () => navigate('/marketing') },
            ]}
          />
        </Col>
        <Col xs={24} xl={12}>
          <WorkflowGuide
            title="订单处置闭环"
            summary="订单不是只看列表，要能一路走到退款、售后、核销和结算。"
            steps={[
              { title: '订单识别', description: '扫码订单、选点位订单和套餐订单统一归口', status: 'finish', tag: '交易中心' },
              { title: '履约追踪', description: '看设备启动、核销记录和履约日志', status: 'process', tag: '核销履约' },
              { title: '售后补偿', description: '处理故障工单、退款审核和补偿发放', status: 'process', tag: '客服工单 / 资产' },
              { title: '结算复盘', description: '回到结算单、分润和报表看最终结果', status: 'wait', tag: '结算与运营' },
            ]}
            actions={[
              { key: 'trade', label: '去交易中心', type: 'primary', onClick: () => navigate('/trade') },
              { key: 'settlement', label: '去结算总览', onClick: () => navigate('/settlement') },
            ]}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <Card title="当前设计取向" extra={<Button size="small" onClick={() => openHelper('设计取向')}>查看更多</Button>}>
            <List
              dataSource={[
                '左侧导航按组织职责拆成商户中心、门店运营、商品服务、交易履约、用户资产、活动营销、财务结算、数据报表、客服消息等模块。',
                '高频入口优先靠前，低频和规划模块统一后置，减少来回找菜单。',
                '核心 CRUD 页已经逐步从小弹窗过渡到更完整的侧边抽屉表单。',
                '后续接后端时仍按业务闭环推进，但导航本身不再强行做成流程图。']}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="processing">调整中</Tag>
                  {item}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="建议你优先体验" extra={<Button size="small" onClick={() => openHelper('体验路径')}>查看路径</Button>}>
            <List
              dataSource={[
                '商户中心：商户管理 -> 商户后台 -> 门店组管理',
                '门店运营：门店管理 -> 点位管理 -> 设备管理 -> 门店运营台',
                '商品服务 / 交易履约：商品与服务 -> 交易中心 -> 核销履约',
                '活动营销 / 财务结算：券模板管理 -> 充值活动 -> 邀请活动 -> 结算总览',
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="gold">推荐</Tag>
                  {item}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={720}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">工作台保留聚合导航和体验建议，后续可以继续拆出“最近变更”“异常提醒”“审批待办”等板块。</Descriptions.Item>
          <Descriptions.Item label="当前入口">{helperTitle}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default Dashboard;
