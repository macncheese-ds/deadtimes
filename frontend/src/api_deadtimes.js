import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const API_BASE_URL = '/api';

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
export const startTicket = (id, tecnico, num_empleado1) => api.post(`/deadtimes/${id}/start`, { tecnico, num_empleado1 }).then(r => r.data);
export const finishTicket = (id, payload) => api.post(`/deadtimes/${id}/finish`, payload).then(r => r.data);
export const updateTicket = (id, payload) => api.put(`/deadtimes/${id}`, payload).then(r => r.data);
export const getLineas = () => api.get('/deadtimes/lineas').then(r => r.data);
export const getDescripciones = () => api.get('/deadtimes/descripciones').then(r => r.data);
export const getEquipos = () => api.get('/deadtimes/equipos').then(r => r.data);
export const getModelos = () => api.get('/deadtimes/modelos').then(r => r.data);
export const getStatsAtencion = () => api.get('/deadtimes/stats/atencion').then(r => r.data);
export const getStatsEquipos = () => api.get('/deadtimes/stats/equipos').then(r => r.data);

// Nuevas funciones para analytics
export const getStatsLinea = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/linea?${query}`).then(r => r.data);
};

export const getStatsEquiposDetalle = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/equipos-detalle?${query}`).then(r => r.data);
};

export const getStatsTendencia = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/tendencia?${query}`).then(r => r.data);
};

export const getStatsClasificacion = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/clasificacion?${query}`).then(r => r.data);
};

export const getStatsTotales = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/totales?${query}`).then(r => r.data);
};

// Auth functions with credentials system
export const login = async (employee_input, password) => {
  const { data } = await api.post('/auth/login', { employee_input, password });
  return data;
};

export const lookupUser = async (employeeInput) => {
  try {
    const { data } = await api.get(`/auth/lookup/${encodeURIComponent(employeeInput)}`);
    if (!data.success) throw new Error(data.error || 'Usuario no encontrado');
    return data;
  } catch (err) {
    if (err.response) {
      if (err.response.status === 404) throw new Error('Usuario no encontrado');
      throw new Error(err.response.data?.error || 'Error buscando usuario');
    }
    throw new Error('Error de conexión');
  }
};

api.lookupUser = lookupUser;

export default api;
