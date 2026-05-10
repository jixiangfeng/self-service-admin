import { Button, Checkbox, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import loginLockIcon from '../../assets/login-lock-icon.png';
import loginUserIcon from '../../assets/login-user-icon.png';
import { authApi } from '../../services/backendService';
import './index.css';

const LOGIN_REMEMBER_KEY = 'self_service_admin_login_remember';

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(LOGIN_REMEMBER_KEY);
    if (!cached) {
      form.setFieldsValue({ username: '', password: '', remember: false });
      return;
    }

    try {
      const parsed = JSON.parse(cached) as LoginFormValues;
      form.setFieldsValue({
        username: parsed.username || '',
        password: parsed.password || '',
        remember: Boolean(parsed.remember),
      });
    } catch {
      localStorage.removeItem(LOGIN_REMEMBER_KEY);
      form.setFieldsValue({ username: '', password: '', remember: false });
    }
  }, [form]);

  const persistRememberedLogin = (values: LoginFormValues) => {
    if (!values.remember) {
      localStorage.removeItem(LOGIN_REMEMBER_KEY);
      return;
    }

    localStorage.setItem(LOGIN_REMEMBER_KEY, JSON.stringify({
      username: values.username,
      password: values.password,
      remember: true,
    }));
  };

  const handleLogin = async (values: LoginFormValues) => {
    const username = values.username.trim();

    try {
      setLoading(true);
      const response = await authApi.login({
        username,
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
      persistRememberedLogin({ ...values, username });

      message.success('登录成功');
      navigate(searchParams.get('redirect') || '/', { replace: true });
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <h1>自助设备经营平台</h1>
          <p>商户、门店、设备、交易与结算的一体化运营后台</p>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-header">
              <h2>欢迎登录</h2>
              <p>请使用平台账号进入管理后台</p>
            </div>

            <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              className="login-form"
            >
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input
                  autoFocus
                  size="large"
                  placeholder="请输入用户名"
                  prefix={<img className="input-icon" src={loginUserIcon} alt="" />}
                  onPressEnter={() => form.submit()}
                />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password
                  size="large"
                  placeholder="请输入密码"
                  prefix={<img className="input-icon" src={loginLockIcon} alt="" />}
                  onPressEnter={() => form.submit()}
                />
              </Form.Item>

              <div className="form-extra">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住密码</Checkbox>
                </Form.Item>
                <span>建议仅在可信设备上使用</span>
              </div>

              <Button type="primary" htmlType="submit" loading={loading} className="login-button">
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form>

            <div className="login-footer">©2026 自助设备经营平台·Web管理端</div>
          </div>
        </section>
      </div>
    </div>
  );
}
