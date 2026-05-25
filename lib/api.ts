import axios from 'axios';
import { Platform } from 'react-native';
import { getItem, removeItem } from '@/lib/storage';

export const BASE_URL = 'https://linkerxmobile-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
  },
  timeout: 10000,
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
