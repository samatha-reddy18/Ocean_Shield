import api from './api.js';

export const satelliteApi = {
  // Curated GIBS layer catalog + default imagery date
  getLayers: async () => {
    const { data } = await api.get('/api/satellite/layers');
    return data;
  },

  // Tile URL template for a Leaflet tile layer (layer id + YYYY-MM-DD date)
  getTiles: async (layer, date) => {
    const { data } = await api.get('/api/satellite/tiles', { params: { layer, date } });
    return data;
  },

  // Fetch a downloadable snapshot image. Uses the authenticated axios client
  // (token stays in the header, not the URL) and returns a blob URL.
  fetchSnapshot: async ({ layers, date, bbox, width, height }) => {
    const { data } = await api.get('/api/satellite/snapshot', {
      params: {
        layers: layers.join(','),
        bbox: bbox.join(','),
        date: date || undefined,
        width: width || 1024,
        height: height || 1024,
      },
      responseType: 'blob',
      timeout: 40000,
    });
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    return { url, blob };
  },
};

export default satelliteApi;
