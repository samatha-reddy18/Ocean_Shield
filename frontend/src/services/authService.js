import api from './api.js';

export const authApi = {
  register: async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    return data;
  },

  login: async (payload) => {
    const { data } = await api.post('/api/auth/login', payload);
    return data;
  },

  getMe: async (token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await api.get('/api/auth/me', config);
    return data;
  },

  updateProfile: async (payload) => {
    const { data } = await api.patch('/api/auth/me', payload);
    return data;
  },
};

export default authApi;
