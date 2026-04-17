import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

/**
 * HTTP 请求客户端配置
 */

// 后端 API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function clearAuthAndRedirect() {
  localStorage.removeItem('satoken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

function isAuthExpired(status?: number, data?: any) {
  if (status === 401) return true;
  if (!data) return false;

  const code = typeof data.code === 'number' ? data.code : undefined;
  const messageText = String(data.message || '');

  return code === 401 || messageText.includes('未登录') || messageText.includes('登录已过期') || messageText.includes('token 无效');
}

// 创建 axios 实例
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
httpClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('satoken') || localStorage.getItem('token');

    if (token) {
      config.headers['satoken'] = token;
    }

    console.log('[HTTP Request]', config.method?.toUpperCase(), config.url);

    return config;
  },
  (error) => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    console.log('[HTTP Response]', response.config.url, data);

    // 统一处理响应
    if (data.code === 200) {
      return data;
    }

    if (isAuthExpired(response.status, data)) {
      message.error('未登录或登录已过期，请重新登录');
      clearAuthAndRedirect();
      return Promise.reject(new Error(data.message || '未登录或登录已过期'));
    }

    // 处理业务错误
    message.error(data.message || '请求失败');
    return Promise.reject(new Error(data.message || '请求失败'));
  },
  (error) => {
    console.error('[HTTP Response Error]', error);

    // 处理 HTTP 错误
    if (error.response) {
      const { status, data } = error.response;

      if (isAuthExpired(status, data)) {
        message.error('未登录或登录已过期，请重新登录');
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      switch (status) {
        case 403:
          message.error('没有权限访问');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error(data?.message || '服务器错误');
          break;
        default:
          message.error(data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error(error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

/**
 * 通用请求方法
 */
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return httpClient.get<any, T>(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return httpClient.post<any, T>(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return httpClient.put<any, T>(url, data, config);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return httpClient.delete<any, T>(url, config);
  },
};

export default httpClient;
