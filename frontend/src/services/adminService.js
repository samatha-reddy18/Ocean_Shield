import api from './api.js';

export const adminApi = {
  getDashboard: async () => {
    const { data } = await api.get('/api/admin/dashboard');
    return data;
  },

  getReportsForReview: async (params = {}) => {
    const { data } = await api.get('/api/admin/reports', { params });
    return data;
  },

  updateReportStatus: async (id, payload) => {
    const { data } = await api.patch(`/api/admin/reports/${id}/status`, payload);
    return data;
  },

  getReviewLogs: async (params = {}) => {
    const { data } = await api.get('/api/admin/review-logs', { params });
    return data;
  },
};

export default adminApi;
