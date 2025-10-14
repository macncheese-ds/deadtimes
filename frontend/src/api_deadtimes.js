import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Agregar timestamp para evitar cache en navegador
  config.headers['Cache-Control'] = 'no-cache';
  return config;
});

export const listTickets = (status='open') => {
  // Agregar timestamp como query param para evitar cache
  const timestamp = new Date().getTime();
  return api.get(`/deadtimes?status=${status}&_t=${timestamp}`).then(r => r.data);
};
export const getTicket = (id) => api.get(`/deadtimes/${id}`).then(r => r.data);
export const createTicket = (payload) => api.post('/deadtimes', payload).then(r => r.data);
export const startTicket = (id, tecnico) => api.post(`/deadtimes/${id}/start`, { tecnico }).then(r => r.data);
export const finishTicket = (id, payload) => api.post(`/deadtimes/${id}/finish`, payload).then(r => r.data);
export const updateTicket = (id, payload) => api.put(`/deadtimes/${id}`, payload).then(r => r.data);

export default api;
