// API para sección de Producción
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3107/api';

const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000
});

// ============================================================================
// PRODUCCIÓN - Registros
// ============================================================================

// GET /produccion/registros - obtener registros para línea+fecha
export const getRegistros = (linea, fecha) => {
  return api.get('/produccion/registros', {
    params: { linea, fecha }
  }).then(r => r.data);
};

// POST /produccion/registros - crear/actualizar un registro
export const guardarRegistro = (data) => {
  return api.post('/produccion/registros', data).then(r => r.data);
};

// DELETE /produccion/registros/:id - eliminar un registro
export const eliminarRegistro = (id) => {
  return api.delete(`/produccion/registros/${id}`).then(r => r.data);
};

// GET /produccion/modelos - obtener modelos (opcionalmente por línea)
export const getModelosProduccion = (linea) => {
  const params = {};
  if (linea) params.linea = linea;
  return api.get('/produccion/modelos', { params }).then(r => r.data);
};

// GET /produccion/downtime-analytics - obtener intervalos de producción con DT y tickets
export const getDowntimeAnalytics = (linea, fecha) => {
  return api.get('/produccion/downtime-analytics', {
    params: { linea, fecha }
  }).then(r => r.data);
};

export default api;
