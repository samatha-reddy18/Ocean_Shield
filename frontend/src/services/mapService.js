import api from './api.js';

export const mapApi = {
  // Map markers (lightweight report data)
  getMapReports: async (params = {}) => {
    const { data } = await api.get('/api/map/reports', { params });
    return data;
  },

  // Report-density hotspots
  getHotspots: async (params = {}) => {
    const { data } = await api.get('/api/map/hotspots', { params });
    return data;
  },
};

export default mapApi;
