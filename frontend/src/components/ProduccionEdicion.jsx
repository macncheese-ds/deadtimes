import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';

export default function ProduccionEdicion({ linea, fecha, turno, onClose }) {
  const [intervalos, setIntervalos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [editingField, setEditingField] = useState(null); // { intervaloId, campo, valor }
  const [totales, setTotales] = useState({});
  const [initializingIntervalos, setInitializingIntervalos] = useState(false);
  const [selectedIntervaloId, setSelectedIntervaloId] = useState(null); // ID del intervalo seleccionado
  const [editValues, setEditValues] = useState({}); // { produccion, scrap } para edición directa
  const [modelos, setModelos] = useState([]); // Lista de modelos disponibles para la línea
  const [modelosLoading, setModelosLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3107/api';

  // Cargar intervalos
  useEffect(() => {
    if (linea) {
      cargarIntervalos();
      cargarModelos();
    }
  }, [linea, fecha, turno]);

  // Actualizar intervalo actual cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      cargarIntervalos();
    }, 60000); // actualizar cada minuto
    return () => clearInterval(interval);
  }, [linea, fecha, turno]);

  // Limpiar modales al desmontar
  useEffect(() => {
    return () => {
      setShowLoginModal(false)
      setEditingField(null)
    }
  }, []);

  const cargarIntervalos = async () => {
    setLoading(true);
    setError('');
    try {
      // Cargar los intervalos existentes (sin crear automáticamente)
      const response = await fetch(
        `${apiUrl}/produccion/intervalos?linea=${encodeURIComponent(linea)}&fecha=${fecha}&turno=${turno}`
      );
      if (!response.ok) throw new Error('Error cargando intervalos');

      const result = await response.json();
      setIntervalos(result.data || []);
      setTotales(result.totales || {});
      
      // Seleccionar el primer intervalo por defecto
      if ((result.data || []).length > 0 && !selectedIntervaloId) {
        setSelectedIntervaloId(result.data[0].id);
        setEditValues({
          produccion: result.data[0].produccion || 0,
          scrap: result.data[0].scrap || 0,
          modelo: result.data[0].modelo || ''
        });
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cargarModelos = async () => {
    if (!linea) return; // No cargar si no hay línea
    
    setModelosLoading(true);
    try {
      const url = `${apiUrl}/produccion/modelos?linea=${encodeURIComponent(linea)}`;
      console.log('Cargando modelos desde:', url);
      
      const response = await fetch(url);
      console.log('Respuesta status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Modelos cargados:', result);
      
      setModelos(result.data || []);
    } catch (err) {
      console.error('Error cargando modelos:', err);
      setModelos([]);
    } finally {
      setModelosLoading(false);
    }
  };

  const handleInitializeIntervalos = async () => {
    setInitializingIntervalos(true);
    try {
      const response = await fetch(`${apiUrl}/produccion/intervalos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linea, fecha, turno: parseInt(turno) })
      });

      if (!response.ok) throw new Error('Error inicializando intervalos');

      // Recargar después de inicializar
      await cargarIntervalos();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setInitializingIntervalos(false);
    }
  };

  // Manejar cambio de intervalo seleccionado
  const handleSelectIntervalo = (intervalo) => {
    setSelectedIntervaloId(intervalo.id);
    setEditValues({
      produccion: intervalo.produccion || 0,
      scrap: intervalo.scrap || 0,
      modelo: intervalo.modelo || ''
    });
  };

  // Manejar cambio de modelo y actualizar producto y rate
  const handleModeloChange = (modeloNombre) => {
    const modeloSeleccionado = modelos.find(m => m.modelo === modeloNombre);
    
    const nuevosDatos = {
      ...editValues,
      modelo: modeloNombre,
      producto: modeloSeleccionado?.producto || '',
      rate: modeloSeleccionado?.rate || 0
    };
    
    setEditValues(nuevosDatos);
    
    // Guardar modelo automáticamente
    if (selectedIntervaloId && modeloNombre) {
      handleGuardarCambios('modelo', modeloNombre);
    }
  };

  // Guardar cambios sin modal
  const handleGuardarCambios = async (campo, valor) => {
    if (!selectedIntervaloId) return;

    try {
      const response = await fetch(`${apiUrl}/produccion/intervalos/${selectedIntervaloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campo,
          valor: parseInt(valor) || 0,
          numEmpleado: '0000', // Usuario genérico para edición rápida
          password: '1111'     // Contraseña genérica
        })
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error al guardar:', result.error);
        return;
      }

      // Actualizar la lista local
      await cargarIntervalos();
    } catch (err) {
      console.error('Error guardando:', err);
    }
  };

  // Navegar entre intervalos
  const handleIntervaloAnterior = () => {
    const idx = intervalos.findIndex(i => i.id === selectedIntervaloId);
    if (idx > 0) {
      handleSelectIntervalo(intervalos[idx - 1]);
    }
  };

  const handleIntervaloSiguiente = () => {
    const idx = intervalos.findIndex(i => i.id === selectedIntervaloId);
    if (idx < intervalos.length - 1) {
      handleSelectIntervalo(intervalos[idx + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const turnoLabel = turno == 1 ? 'Turno 1 (08:00 - 20:00)' : 'Turno 2 (20:00 - 08:00)';
  const intervaloActual = intervalos.find(int => int.id === selectedIntervaloId);
  const idxActual = intervalos.findIndex(int => int.id === selectedIntervaloId);

  return (
    <div className="bg-slate-900 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          {turnoLabel} - {linea} ({fecha})
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Mensaje si no hay intervalos */}
      {!loading && intervalos.length === 0 && (
        <div className="bg-blue-900/30 border border-blue-600 text-blue-300 px-4 py-4 rounded mb-4">
          <p className="mb-3">No hay intervalos registrados para esta línea, fecha y turno.</p>
          <button
            onClick={handleInitializeIntervalos}
            disabled={initializingIntervalos}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
          >
            {initializingIntervalos ? 'Inicializando...' : 'Inicializar Intervalos'}
          </button>
        </div>
      )}

      {/* Interfaz de Edición con Navegación */}
      {intervalos.length > 0 && intervaloActual && (
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-100">
              Intervalo {idxActual + 1}/{intervalos.length} - {intervaloActual.hora_inicio}:00 hrs
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleIntervaloAnterior}
                disabled={idxActual === 0}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition"
              >
                ← Anterior
              </button>
              <button
                onClick={handleIntervaloSiguiente}
                disabled={idxActual === intervalos.length - 1}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda - Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Modelo</label>
                <select
                  value={editValues.modelo}
                  onChange={(e) => handleModeloChange(e.target.value)}
                  disabled={modelosLoading}
                  className="w-full bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-100 px-3 py-2 rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Selecciona modelo --</option>
                  {modelos.map((m) => (
                    <option key={m.id || m.modelo} value={m.modelo}>
                      {m.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Producto</label>
                <div className="bg-slate-700 text-slate-300 px-3 py-2 rounded">
                  {editValues.producto || intervaloActual.producto || '-'}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Rate</label>
                <div className="bg-slate-700 text-slate-300 px-3 py-2 rounded">
                  {editValues.rate || intervaloActual.rate || 0} piezas/hora
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Rate Acumulado</label>
                <div className="bg-slate-700 text-slate-300 px-3 py-2 rounded">
                  {intervaloActual.rate_acumulado || 0}
                </div>
              </div>
            </div>

            {/* Columna Derecha - Edición */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Producción</label>
                <input
                  type="number"
                  value={editValues.produccion}
                  onChange={(e) => setEditValues({...editValues, produccion: e.target.value})}
                  onBlur={() => handleGuardarCambios('produccion', editValues.produccion)}
                  placeholder="0"
                  className="w-full bg-green-900/30 border-2 border-green-600 hover:border-green-500 text-green-300 px-3 py-3 rounded font-bold text-2xl text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Scrap</label>
                <input
                  type="number"
                  value={editValues.scrap}
                  onChange={(e) => setEditValues({...editValues, scrap: e.target.value})}
                  onBlur={() => handleGuardarCambios('scrap', editValues.scrap)}
                  placeholder="0"
                  className="w-full bg-red-900/30 border-2 border-red-600 hover:border-red-500 text-red-300 px-3 py-3 rounded font-bold text-2xl text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Producción Acumulada</label>
                <div className="bg-slate-700 text-slate-300 px-3 py-2 rounded">
                  {intervaloActual.produccion_acumulada || 0}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Delta</label>
                <div className="bg-slate-700 text-slate-300 px-3 py-2 rounded">
                  {intervaloActual.delta || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-slate-700 rounded">
            <div>
              <p className="text-slate-400 text-xs">Deadtime (min)</p>
              <p className="text-amber-300 font-bold text-lg">
                {Number(intervaloActual.deadtime_minutos || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Cumplimiento %</p>
              <p className="text-slate-100 font-bold text-lg">
                {intervaloActual.porcentaje_cumplimiento}%
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Justificado (min)</p>
              <p className="text-blue-300 font-bold">
                {Number(intervaloActual.justificado_minutos || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">No Justificado (min)</p>
              <p className="text-red-300 font-bold">
                {Number(intervaloActual.tiempo_no_justificado || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Botón para registrar intervalo */}
          <div className="mt-6">
            <button
              onClick={() => {
                handleGuardarCambios('produccion', editValues.produccion);
                handleGuardarCambios('scrap', editValues.scrap);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded font-bold text-lg transition shadow-lg"
            >
              ✓ Registrar Intervalo
            </button>
          </div>
        </div>
      )}

      {/* Lista rápida de todos los intervalos */}
      {intervalos.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Resumen de Intervalos</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {intervalos.map((int, idx) => (
              <button
                key={int.id}
                onClick={() => handleSelectIntervalo(int)}
                className={`p-3 rounded transition font-medium ${
                  selectedIntervaloId === int.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="text-sm opacity-75">{int.hora_inicio}:00</div>
                <div className="text-lg">
                  {int.produccion || 0}p / {int.scrap || 0}s
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Intervalos (deshabilitada - usar solo la vista de ticket actual) */}
      {false && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">Hora</th>
              </tr>
            </thead>
          </table>
        </div>
      )}

      {/* Totales */}
      {intervaloActual && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6 p-4 bg-slate-800 rounded">
          <div>
            <p className="text-slate-400 text-sm">Rate Total</p>
            <p className="text-slate-100 font-bold text-lg">{totales.rate_total || 0}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Producción Total</p>
            <p className="text-green-400 font-bold text-lg">{totales.produccion_total || 0}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Scrap Total</p>
            <p className="text-red-400 font-bold text-lg">{totales.scrap_total || 0}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Deadtime Total</p>
            <p className="text-amber-400 font-bold text-lg">
              {Number(totales.deadtime_total || 0).toFixed(2)} min
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Justificado</p>
            <p className="text-blue-400 font-bold text-lg">
              {Number(totales.justificado_total || 0).toFixed(2)} min
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Cumplimiento</p>
            <p className="text-slate-100 font-bold text-lg">{totales.porcentaje_cumplimiento}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
