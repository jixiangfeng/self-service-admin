import React from 'react';
import { Card, Col, List, Row, Statistic, Tag } from 'antd';
import {
  CarOutlined,
  DeploymentUnitOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import PageBanner from '@/components/PageBanner';

const cards = [
  { title: '商户数量', value: 0, icon: <TeamOutlined /> },
  { title: '门店数量', value: 0, icon: <ShopOutlined /> },
  { title: '工位数量', value: 0, icon: <CarOutlined /> },
  { title: '设备数量', value: 0, icon: <DeploymentUnitOutlined /> },
];

const todoList = [
  '确定后台一期菜单和页面边界',
  '补充商户、门店、设备的数据模型',
  '设计订单、服务商品和计费规则页面',
  '补齐设备接入和远程控制接口',
];

const Dashboard: React.FC = () => (
  <div style={{ padding: 24 }}>
    <PageBanner
      title="自助洗车后台工作台"
      subtitle="当前先保留系统管理能力和业务模块占位，后续逐步补齐商户、门店、设备和订单页面。"
      icon={<DeploymentUnitOutlined />}
    />

    <Row gutter={[16, 16]}>
      {cards.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card>
            <Statistic title={item.title} value={item.value} prefix={item.icon} />
          </Card>
        </Col>
      ))}
    </Row>

    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
      <Col xs={24} lg={14}>
        <Card title="当前建设范围">
          <List
            dataSource={todoList}
            renderItem={(item) => (
              <List.Item>
                <Tag color="processing">规划中</Tag>
                {item}
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="已接入能力">
          <List
            dataSource={[
              '登录鉴权',
              '用户管理',
              '角色管理',
              '菜单权限管理',
              '数据字典管理',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        </Card>
      </Col>
    </Row>
  </div>
);

export default Dashboard;
