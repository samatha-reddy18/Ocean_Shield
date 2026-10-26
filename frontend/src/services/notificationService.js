import api from './api.js';

export const notificationApi = {
  getNotifications: async (params = {}) => {
    const { data } = await api.get('/api/notifications', { params });
    return data;
  },

  markRead: async (id) => {
    const { data } = await api.patch(`/api/notifications/${id}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.post('/api/notifications/mark-all-read');
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/api/notifications/${id}`);
    return data;
  },
};

export default notificationApi;
