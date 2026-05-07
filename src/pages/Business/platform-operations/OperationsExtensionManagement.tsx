import React from 'react';
import { Card, Col, Row, Space, Statistic, Tag } from 'antd';
import { ApiOutlined, BellOutlined, CommentOutlined, FileDoneOutlined, MobileOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageBanner from '@/components/PageBanner';

const extensionEntries = [
  { title: '小程序运营配置', path: '/mini-program-ops', icon: <MobileOutlined />, tables: 'mini_program_page_config / banner_config / agreement_content', status: '已拆分' },
  { title: '订阅授权中心', path: '/service-desk/subscribes', icon: <BellOutlined />, tables: 'user_subscribe_record', status: '已拆分' },
  { title: '开放接口中心', path: '/open-api', icon: <ApiOutlined />, tables: 'open_api_client / open_api_call_log', status: '已拆分' },
  { title: '发票中心', path: '/settlement/invoices', icon: <FileDoneOutlined />, tables: 'invoice_title / invoice_apply', status: '已拆分' },
  { title: '评价反馈中心', path: '/service-desk/evaluations', icon: <CommentOutlined />, tables: 'order_evaluation / user_feedback', status: '已拆分' },
];

const OperationsExtensionManagement: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="运营扩展中心" subtitle="作为成熟度能力导航页，避免重复维护订阅、接口、发票、评价和小程序配置数据。" icon={<ApiOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="扩展能力" value={extensionEntries.length} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="已独立拆分" value={extensionEntries.filter((item) => item.status === '已拆分').length} suffix="项" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="重复维护表" value={0} suffix="张" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="后续重点" value="API" /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        {extensionEntries.map((entry) => (
          <Col xs={24} md={12} xl={8} key={entry.path}>
            <Card hoverable onClick={() => navigate(entry.path)} bodyStyle={{ minHeight: 150 }}>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space align="start">
                  <span style={{ fontSize: 24, color: '#1677ff' }}>{entry.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{entry.title}</div>
                    <div style={{ marginTop: 8, color: '#667085', lineHeight: 1.6 }}>{entry.tables}</div>
                    <Tag color="processing" style={{ marginTop: 12 }}>{entry.status}</Tag>
                  </div>
                </Space>
                <RightOutlined style={{ color: '#98a2b3', marginTop: 4 }} />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default OperationsExtensionManagement;
