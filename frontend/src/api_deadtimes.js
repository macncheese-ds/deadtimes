import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3107';
const api = axios.create({ baseURL: baseURL + '/api' });

export const API_BASE_URL = baseURL + '/api';

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
export const getTicket = (id) => {
  const timestamp = new Date().getTime();
  return api.get(`/deadtimes/${id}?_t=${timestamp}`).then(r => r.data);
};
export const createTicket = (payload) => api.post('/deadtimes', payload).then(r => r.data);
export const startTicket = (id, tecnico, num_empleado1) => api.post(`/deadtimes/${id}/start`, { tecnico, num_empleado1 }).then(r => r.data);
export const finishTicket = (id, payload) => api.post(`/deadtimes/${id}/finish`, payload).then(r => r.data);
export const updateTicket = (id, payload) => api.put(`/deadtimes/${id}`, payload).then(r => r.data);
export const getLineas = () => api.get('/deadtimes/lineas').then(r => r.data);
export const getDescripciones = (equipo) => {
  const timestamp = new Date().getTime();
  const params = new URLSearchParams();
  if (equipo) params.append('equipo', equipo);
  params.append('_t', timestamp);
  const q = params.toString();
  return api.get(`/deadtimes/descripcion${q ? '?' + q : ''}`).then(r => r.data);
};
export const getEquipos = () => api.get('/deadtimes/equipos').then(r => r.data);

// Obtener modelos - opcionalmente filtrar por línea
// Retorna: id, modelo, producto, linea, rate, lado
export const getModelos = (linea) => {
  const params = new URLSearchParams();
  if (linea) params.append('linea', linea);
  const query = params.toString();
  return api.get(`/deadtimes/modelos${query ? '?' + query : ''}`).then(r => r.data);
};

// Obtener un modelo específico por nombre - retorna todos sus datos
export const getModeloByName = (nombre) => {
  return api.get(`/deadtimes/modelos/${encodeURIComponent(nombre)}`).then(r => r.data);
};

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

// Get detailed tickets by equipment (for drill-down in analytics)
export const getTicketsByEquipment = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/deadtimes/stats/tickets-by-equipment?${query}`).then(r => r.data);
};

// Get top N tickets with most time by equipment (for modal drill-down)
export const getTopTicketsByEquipment = (params = {}) => {
  const query = new URLSearchParams({ ...params, limit: params.limit || 5 }).toString();
  return api.get(`/deadtimes/stats/tickets-by-equipment?${query}`).then(r => r.data);
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

// Obtener el TOP de tiempos perdidos agrupados por máquina y causa
export const getTopTiempos = (maquina) => {
  const params = new URLSearchParams();
  if (maquina) params.append('maquina', maquina);
  const query = params.toString();
  return api.get(`/deadtimes/analisis/top-tiempos${query ? '?' + query : ''}`).then(r => r.data);
};

// ============================================================================
// CONFIGURACIÓN - EQUIPOS, LÍNEAS, MODELOS
// ============================================================================

// EQUIPOS
export const getConfigEquipos = () => api.get('/config/equipos').then(r => r.data.data);
export const createConfigEquipo = (payload) => api.post('/config/equipos', payload).then(r => r.data);
export const updateConfigEquipo = (id, payload) => api.put(`/config/equipos/${id}`, payload).then(r => r.data);
export const deleteConfigEquipo = (id, payload) => api.delete(`/config/equipos/${id}`, { data: payload }).then(r => r.data);

// LÍNEAS
export const getConfigLineas = () => api.get('/config/lineas').then(r => r.data.data);
export const createConfigLinea = (payload) => api.post('/config/lineas', payload).then(r => r.data);
export const updateConfigLinea = (id, payload) => api.put(`/config/lineas/${id}`, payload).then(r => r.data);
export const deleteConfigLinea = (id, payload) => api.delete(`/config/lineas/${id}`, { data: payload }).then(r => r.data);

// MODELOS
export const getConfigModelos = () => api.get('/config/modelos').then(r => r.data.data);
export const createConfigModelo = (payload) => api.post('/config/modelos', payload).then(r => r.data);
export const updateConfigModelo = (id, payload) => api.put(`/config/modelos/${id}`, payload).then(r => r.data);
export const deleteConfigModelo = (id, payload) => api.delete(`/config/modelos/${id}`, { data: payload }).then(r => r.data);

export default api;
