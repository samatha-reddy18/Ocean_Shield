import api from './api.js';

export const aiApi = {
  checkHealth: async () => {
    const { data } = await api.get('/api/ai/health');
    return data;
  },

  // Trigger image analysis for a report (server resolves the image file)
  analyzeReportImage: async (reportId) => {
    const { data } = await api.post('/api/ai/analyze-image', { reportId });
    return data;
  },

  // NLP extraction on a description
  analyzeText: async (description, reportId) => {
    const { data } = await api.post('/api/ai/analyze-text', { description, reportId });
    return data;
  },

  // Duplicate detection (rule-based fallback in backend)
  checkDuplicates: async (payload) => {
    const { data } = await api.post('/api/ai/check-duplicates', payload);
    return data;
  },
};

export default aiApi;
