import api from './api.js';

export const reportApi = {
  // Public list with filters
  getReports: async (params = {}) => {
    const { data } = await api.get('/api/reports', { params });
    return data;
  },

  // Current user's reports
  getMyReports: async (params = {}) => {
    const { data } = await api.get('/api/reports/my', { params });
    return data;
  },

  // Single report details
  getReportById: async (id) => {
    const { data } = await api.get(`/api/reports/${id}`);
    return data;
  },

  // Create a report (multipart: images + JSON fields)
  createReport: async (formData) => {
    const { data } = await api.post('/api/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateReport: async (id, payload) => {
    const { data } = await api.patch(`/api/reports/${id}`, payload);
    return data;
  },

  deleteReport: async (id) => {
    const { data } = await api.delete(`/api/reports/${id}`);
    return data;
  },
};

export default reportApi;
