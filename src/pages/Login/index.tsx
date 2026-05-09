import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/backendService';
import './index.css';

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      const response = await authApi.login({
        username: values.username,
        password: values.password,
      });
      const currentUser = response.data.user;
      const user = {
        userId: currentUser.id,
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        role: currentUser.role,
      };

      localStorage.setItem('satoken', response.data.token);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('rememberLogin', values.remember ? '1' : '0');

      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">SZ</div>
          <h2>自助设备经营平台</h2>
          <p className="subtitle">Web管理端</p>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
          className="login-form"
          initialValues={{ username: 'admin', password: '123456', remember: false }}
        >
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能小于6位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住密码</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} className="login-button">
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <p>© 2024 自助设备经营平台</p>
        </div>
      </div>
    </div>
  );
}
