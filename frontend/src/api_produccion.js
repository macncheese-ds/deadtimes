// API para sección de Producción
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3107/api';

const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000
});

// ============================================================================
// PRODUCCIÓN - EDICIÓN
// ============================================================================

// GET /produccion/intervalos - obtener tabla de intervalos
export const getIntervalos = (linea, fecha, turno) => {
  return api.get('/produccion/intervalos', {
    params: { linea, fecha, turno }
  }).then(r => r.data);
};

// POST /produccion/intervalos - crear intervalos para línea+turno
export const crearIntervalos = (linea, fecha, turno) => {
  return api.post('/produccion/intervalos', { linea, fecha, turno }).then(r => r.data);
};

// PUT /produccion/intervalos/:id - editar producción, scrap o modelo
export const actualizarIntervalo = (intervaloId, campo, valor, numEmpleado, password) => {
  return api.put(`/produccion/intervalos/${intervaloId}`, {
    campo,
    valor,
    numEmpleado,
    password
  }).then(r => r.data);
};

// ============================================================================
// PRODUCCIÓN - REVIEW (Deadtime No Justificado)
// ============================================================================

// GET /produccion/unjustified - obtener deadtime no justificado por intervalo
export const getDeadtimeNoJustificado = (linea, fecha, turno) => {
  return api.get('/produccion/unjustified', {
    params: { linea, fecha, turno }
  }).then(r => r.data);
};

// GET /produccion/related-tickets/:intervaloId - obtener tickets relacionados
export const getTicketsRelacionados = (intervaloId) => {
  return api.get(`/produccion/related-tickets/${intervaloId}`).then(r => r.data);
};

export default api;
