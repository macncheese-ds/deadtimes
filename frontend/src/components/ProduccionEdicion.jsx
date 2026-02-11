import React, { useState, useEffect } from 'react';
import { getRegistros, guardarRegistro, eliminarRegistro, getModelosProduccion } from '../api_produccion';
import { getLineas, login } from '../api_deadtimes';
import LoginModal from './LoginModal';

// Generar 24 intervalos de 1 hora: 00:00-01:00, 01:00-02:00, ..., 23:00-00:00
const INTERVALOS = Array.from({ length: 24 }, (_, i) => {
  const h = i;
  const hNext = (i + 1) % 24;
  return {
    h,
    hNext,
    inicio: String(h).padStart(2, '0') + ':00:00',
    final: String(hNext).padStart(2, '0') + ':00:00',
    label: String(h).padStart(2, '0') + ':00 - ' + String(hNext).padStart(2, '0') + ':00'
  };
});

function filaVacia(int) {
  return {
    id: null,
    h: int.h,
    inicio: int.inicio,
    final: int.final,
    label: int.label,
    modelo: '',
    capacidad: 0,
    produccion: 0,
    scrap: 0,
    acumulado: 0,
    acumulado1: 0,
    delta: 0,
    dt: 0,
    pctProd: 0,
    pctCump: 0
  };
}

// Extraer la hora (0-23) de un valor TIME que viene como string "HH:MM:SS" o "H:MM:SS"
function extraerHora(val) {
  if (val == null) return -1;
  var s = String(val);
  var m = s.match(/^(\d{1,2})/);
  if (m) return parseInt(m[1], 10);
  return -1;
}

export default function ProduccionEdicion({ onClose }) {
  const [lineas, setLineas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedLinea, setSelectedLinea] = useState('');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [filas, setFilas] = useState(INTERVALOS.map(filaVacia));
  
  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'save' | 'saveAll' | 'delete', idx: number }

  // Cargar lineas al montar
  useEffect(() => {
    (async () => {
      try {
        const data = await getLineas();
        setLineas(data || []);
        if (data && data.length > 0) {
          setSelectedLinea(data[0].linea || data[0].nombre || '');
        }
      } catch (err) {
        console.error('Error cargando lineas:', err);
      }
    })();
  }, []);

  // Cargar modelos y registros cuando cambia linea o fecha
  useEffect(() => {
    if (selectedLinea && selectedFecha) {
      cargarModelos();
      cargarRegistros();
    }
  }, [selectedLinea, selectedFecha]);

  const cargarModelos = async () => {
    try {
      const result = await getModelosProduccion(selectedLinea);
      setModelos(result.data || []);
    } catch (err) {
      console.error('Error cargando modelos:', err);
      setModelos([]);
    }
  };

  // Mapear array de registros del servidor a las 24 filas de intervalos
  const mapearRegistros = (data) => {
    var acumCap = 0;
    var acumProd = 0;
    return INTERVALOS.map(function(int) {
      var reg = data.find(function(r) {
        return extraerHora(r.inicio) === int.h;
      });

      if (reg) {
        var cap = parseInt(reg.capacidad) || 0;
        var prod = parseInt(reg.produccion) || 0;
        acumCap += cap;
        acumProd += prod;
        var delta = cap - prod;
        var dt = cap > 0 ? parseFloat(((delta * 60) / cap).toFixed(2)) : 0;
        var pctProd = cap > 0 ? parseFloat(((prod / cap) * 100).toFixed(1)) : 0;
        var pctCump = acumCap > 0 ? parseFloat(((acumProd / acumCap) * 100).toFixed(1)) : 0;

        return {
          id: reg.id,
          h: int.h,
          inicio: int.inicio,
          final: int.final,
          label: int.label,
          modelo: reg.modelo || '',
          capacidad: cap,
          produccion: prod,
          scrap: parseInt(reg.scrap) || 0,
          acumulado: acumCap,
          acumulado1: acumProd,
          delta: delta,
          dt: dt,
          pctProd: pctProd,
          pctCump: pctCump
        };
      }

      return filaVacia(int);
    });
  };

  const cargarRegistros = async () => {
    if (!selectedLinea || !selectedFecha) return;
    setLoading(true);
    setError('');
    try {
      const result = await getRegistros(selectedLinea, selectedFecha);
      var data = result.data || [];
      console.log('cargarRegistros linea=' + selectedLinea + ' fecha=' + selectedFecha + ' rows=' + data.length, data);
      setFilas(mapearRegistros(data));
    } catch (err) {
      setError('Error cargando registros: ' + err.message);
      console.error('Error cargando registros:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalcular acumulados localmente al editar
  const recalcularLocal = (arr) => {
    var acumCap = 0;
    var acumProd = 0;
    return arr.map(function(fila) {
      var cap = parseInt(fila.capacidad) || 0;
      var prod = parseInt(fila.produccion) || 0;
      acumCap += cap;
      acumProd += prod;
      var delta = cap - prod;
      var dt = cap > 0 ? parseFloat(((delta * 60) / cap).toFixed(2)) : 0;
      var pctProd = cap > 0 ? parseFloat(((prod / cap) * 100).toFixed(1)) : 0;
      var pctCump = acumCap > 0 ? parseFloat(((acumProd / acumCap) * 100).toFixed(1)) : 0;
      return { ...fila, acumulado: acumCap, acumulado1: acumProd, delta: delta, dt: dt, pctProd: pctProd, pctCump: pctCump };
    });
  };

  const handleModeloChange = (idx, modeloNombre) => {
    const modeloObj = modelos.find(function(m) { return m.modelo === modeloNombre; });
    const rate = modeloObj ? parseInt(modeloObj.rate) || 0 : 0;
    const arr = [...filas];
    arr[idx] = { ...arr[idx], modelo: modeloNombre, capacidad: rate };
    setFilas(recalcularLocal(arr));
  };

  const handleProduccionChange = (idx, valor) => {
    const arr = [...filas];
    arr[idx] = { ...arr[idx], produccion: parseInt(valor) || 0 };
    setFilas(recalcularLocal(arr));
  };

  const handleScrapChange = (idx, valor) => {
    const arr = [...filas];
    arr[idx] = { ...arr[idx], scrap: parseInt(valor) || 0 };
    setFilas(recalcularLocal(arr));
  };

  const handleGuardarFila = async (idx) => {
    const fila = filas[idx];
    if (!fila.modelo && fila.produccion === 0 && fila.capacidad === 0) {
      setError('Completa al menos el modelo o la produccion');
      setTimeout(function() { setError(''); }, 3000);
      return;
    }
    // Show auth modal before saving
    setPendingAction({ type: 'save', idx });
    setShowAuthModal(true);
  };

  const executeGuardarFila = async (idx) => {
    const fila = filas[idx];
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await guardarRegistro({
        id: fila.id || undefined,
        linea: selectedLinea,
        fecha: selectedFecha,
        inicio: fila.inicio,
        final: fila.final,
        modelo: fila.modelo,
        capacidad: fila.capacidad,
        produccion: fila.produccion,
        scrap: fila.scrap
      });
      if (result.success) {
        // Usar datos de la respuesta directamente si los tiene
        if (result.data && result.data.length > 0) {
          console.log('guardar: usando datos de respuesta, rows=' + result.data.length);
          setFilas(mapearRegistros(result.data));
        } else {
          await cargarRegistros();
        }
        setSuccessMsg('Guardado: ' + fila.label);
        setTimeout(function() { setSuccessMsg(''); }, 2000);
      }
    } catch (err) {
      setError('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarFila = async (idx) => {
    const fila = filas[idx];
    if (!fila.id) return;
    // Show auth modal before deleting
    setPendingAction({ type: 'delete', idx });
    setShowAuthModal(true);
  };

  const executeEliminarFila = async (idx) => {
    const fila = filas[idx];
    try {
      const result = await eliminarRegistro(fila.id);
      if (result.success) {
        // Usar datos de la respuesta directamente si los tiene
        if (result.data) {
          console.log('eliminar: usando datos de respuesta, rows=' + result.data.length);
          setFilas(mapearRegistros(result.data));
        } else {
          await cargarRegistros();
        }
        setSuccessMsg('Registro eliminado');
        setTimeout(function() { setSuccessMsg(''); }, 2000);
      }
    } catch (err) {
      setError('Error eliminando: ' + err.message);
    }
  };

  const handleGuardarTodo = async () => {
    // Show auth modal before saving all
    setPendingAction({ type: 'saveAll' });
    setShowAuthModal(true);
  };

  const executeGuardarTodo = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      for (var i = 0; i < filas.length; i++) {
        var fila = filas[i];
        if (fila.modelo || fila.produccion > 0 || fila.capacidad > 0) {
          await guardarRegistro({
            id: fila.id || undefined,
            linea: selectedLinea,
            fecha: selectedFecha,
            inicio: fila.inicio,
            final: fila.final,
            modelo: fila.modelo,
            capacidad: fila.capacidad,
            produccion: fila.produccion,
            scrap: fila.scrap
          });
        }
      }
      // Recargar desde el servidor para tener datos frescos
      await cargarRegistros();
      setSuccessMsg('Todos los registros guardados');
      setTimeout(function() { setSuccessMsg(''); }, 3000);
    } catch (err) {
      setError('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAuthConfirm = async ({ employee_input, password }) => {
    setAuthBusy(true);
    try {
      const data = await login(employee_input, password);
      
      // Check if user has Lider or Ingeniero role
      const userRole = (data.user.rolOriginal || '').toLowerCase();
      if (userRole !== 'lider' && userRole !== 'ingeniero') {
        throw new Error('Solo Líderes e Ingenieros pueden modificar datos de producción.');
      }
      
      // Auth successful, close modal and execute pending action
      setShowAuthModal(false);
      
      // Execute the pending action
      if (pendingAction) {
        if (pendingAction.type === 'save') {
          await executeGuardarFila(pendingAction.idx);
        } else if (pendingAction.type === 'delete') {
          await executeEliminarFila(pendingAction.idx);
        } else if (pendingAction.type === 'saveAll') {
          await executeGuardarTodo();
        }
      }
      
      setPendingAction(null);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
    setPendingAction(null);
  };

  // Totales
  var totCapacidad = 0, totProduccion = 0, totScrap = 0, totDelta = 0, totDt = 0;
  filas.forEach(function(f) {
    totCapacidad += parseInt(f.capacidad) || 0;
    totProduccion += parseInt(f.produccion) || 0;
    totScrap += parseInt(f.scrap) || 0;
    totDelta += parseInt(f.delta) || 0;
    totDt += parseFloat(f.dt) || 0;
  });
  var totalPct = totCapacidad > 0 ? ((totProduccion / totCapacidad) * 100).toFixed(1) : '0.0';

  // Color helpers
  function pctColor(val) {
    if (val >= 90) return 'text-green-400';
    if (val >= 70) return 'text-yellow-300';
    if (val > 0) return 'text-red-400';
    return 'text-slate-500';
  }

  return (
    <>
      <LoginModal
        visible={showAuthModal}
        onClose={handleAuthCancel}
        onConfirm={handleAuthConfirm}
        busy={authBusy}
      />
      
      <div className="glass-card rounded-2xl shadow-2xl p-3 sm:p-6 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
          Produccion
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-red-600 flex items-center justify-center text-white text-lg font-bold transition-colors"
          >
            X
          </button>
        )}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <label className="block text-slate-200 text-sm font-semibold mb-1">Linea</label>
          <select
            value={selectedLinea}
            onChange={function(e) { setSelectedLinea(e.target.value); }}
            className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-3 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Selecciona --</option>
            {lineas.map(function(l) {
              return (
                <option key={l.id || l.linea} value={l.linea || l.nombre}>
                  {l.linea || l.nombre}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-slate-200 text-sm font-semibold mb-1">Fecha</label>
          <input
            type="date"
            value={selectedFecha}
            onChange={function(e) { setSelectedFecha(e.target.value); }}
            className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-3 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGuardarTodo}
            disabled={saving || !selectedLinea}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-bold transition text-base shadow-lg"
          >
            {saving ? 'Guardando...' : 'GUARDAR TODO'}
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-900/70 border-2 border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4 text-sm font-semibold">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-900/70 border-2 border-green-500 text-green-100 px-4 py-3 rounded-lg mb-4 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Tabla */}
      {!loading && selectedLinea && (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-800 border-b-2 border-slate-600">
                <th className="px-2 py-3 text-left text-slate-200 font-bold text-sm">Hora</th>
                <th className="px-2 py-3 text-left text-slate-200 font-bold text-sm">Modelo</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">Cap</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">Acum</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">Prod</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">ProdAcum</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">%Prod</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">%Cump</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">Delta</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">DT min</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm">Scrap</th>
                <th className="px-2 py-3 text-center text-slate-200 font-bold text-sm w-24">Acc</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(function(fila, idx) {
                var hasData = fila.modelo || fila.produccion > 0 || fila.capacidad > 0;
                var rowBg = hasData ? 'bg-slate-800/90' : 'bg-slate-900/50';
                return (
                  <tr key={idx} className={rowBg + ' border-b border-slate-700/60 hover:bg-slate-700/70 transition'}>
                    {/* Hora */}
                    <td className="px-2 py-2 text-white font-bold text-sm whitespace-nowrap">
                      {String(fila.h).padStart(2, '0')}:00
                    </td>

                    {/* Modelo */}
                    <td className="px-2 py-2">
                      <select
                        value={fila.modelo}
                        onChange={function(e) { handleModeloChange(idx, e.target.value); }}
                        className="w-full bg-slate-700 border-2 border-slate-500 text-white px-2 py-2 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">--</option>
                        {modelos.map(function(m) {
                          return (
                            <option key={m.id || m.modelo} value={m.modelo}>
                              {m.modelo}
                            </option>
                          );
                        })}
                      </select>
                    </td>

                    {/* Capacidad (auto desde rate del modelo) */}
                    <td className="px-2 py-2 text-center text-white font-bold text-base">
                      {fila.capacidad || '-'}
                    </td>

                    {/* Acumulado capacidad */}
                    <td className="px-2 py-2 text-center text-blue-300 font-bold text-base">
                      {fila.acumulado || '-'}
                    </td>

                    {/* Produccion (input editable) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={fila.produccion || ''}
                        onChange={function(e) { handleProduccionChange(idx, e.target.value); }}
                        placeholder="0"
                        className="w-20 bg-green-900/40 border-2 border-green-600 text-green-100 px-2 py-2 rounded text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 min-h-[44px]"
                      />
                    </td>

                    {/* Prod acumulada */}
                    <td className="px-2 py-2 text-center text-green-300 font-bold text-base">
                      {fila.acumulado1 || '-'}
                    </td>

                    {/* % Prod = produccion / capacidad * 100 */}
                    <td className={'px-2 py-2 text-center font-bold text-sm ' + (fila.pctProd >= 100 ? 'text-green-300' : fila.pctProd >= 80 ? 'text-yellow-300' : fila.pctProd > 0 ? 'text-red-300' : 'text-slate-500')}>
                      {fila.capacidad > 0 ? fila.pctProd + '%' : '-'}
                    </td>

                    {/* % Cumplimiento = acumProd / acumCap * 100 */}
                    <td className={'px-2 py-2 text-center font-bold text-sm ' + (fila.pctCump >= 90 ? 'text-green-300' : fila.pctCump >= 70 ? 'text-yellow-300' : fila.pctCump > 0 ? 'text-red-300' : 'text-slate-500')}>
                      {fila.acumulado > 0 ? fila.pctCump + '%' : '-'}
                    </td>

                    {/* Delta = capacidad - produccion */}
                    <td className={'px-2 py-2 text-center font-bold text-sm ' + (fila.delta > 0 ? 'text-red-400' : fila.delta < 0 ? 'text-green-400' : 'text-slate-500')}>
                      {fila.capacidad > 0 ? fila.delta : '-'}
                    </td>

                    {/* DT minutos = (delta * 60) / capacidad */}
                    <td className={'px-2 py-2 text-center font-bold text-sm ' + (fila.dt > 15 ? 'text-red-400' : fila.dt > 0 ? 'text-amber-300' : 'text-slate-500')}>
                      {fila.capacidad > 0 ? fila.dt.toFixed(1) : '-'}
                    </td>

                    {/* Scrap (input editable) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={fila.scrap || ''}
                        onChange={function(e) { handleScrapChange(idx, e.target.value); }}
                        placeholder="0"
                        className="w-16 bg-red-900/40 border-2 border-red-600 text-red-100 px-2 py-2 rounded text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 min-h-[44px]"
                      />
                    </td>

                    {/* Acciones: OK para guardar, X para eliminar */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={function() { handleGuardarFila(idx); }}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-800 disabled:opacity-50 text-white w-11 h-11 rounded font-bold text-sm transition flex items-center justify-center"
                          title="Guardar fila"
                        >
                          OK
                        </button>
                        {fila.id && (
                          <button
                            onClick={function() { handleEliminarFila(idx); }}
                            className="bg-red-600 hover:bg-red-500 active:bg-red-800 text-white w-11 h-11 rounded font-bold text-sm transition flex items-center justify-center"
                            title="Eliminar fila"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totales */}
            <tfoot>
              <tr className="bg-slate-700 border-t-2 border-slate-500">
                <td className="px-2 py-3 text-white font-bold text-sm">TOTAL</td>
                <td className="px-2 py-3"></td>
                <td className="px-2 py-3 text-center text-white font-bold text-base">{totCapacidad}</td>
                <td className="px-2 py-3 text-center text-blue-300 font-bold text-base">{totCapacidad}</td>
                <td className="px-2 py-3 text-center text-green-300 font-bold text-base">{totProduccion}</td>
                <td className="px-2 py-3 text-center text-green-300 font-bold text-base">{totProduccion}</td>
                <td className={'px-2 py-3 text-center font-bold text-base ' + pctColor(parseFloat(totalPct))}>{totalPct}%</td>
                <td className={'px-2 py-3 text-center font-bold text-base ' + pctColor(parseFloat(totalPct))}>{totalPct}%</td>
                <td className="px-2 py-3 text-center text-red-400 font-bold text-base">{totDelta}</td>
                <td className="px-2 py-3 text-center text-amber-300 font-bold text-base">{totDt.toFixed(1)}</td>
                <td className="px-2 py-3 text-center text-red-300 font-bold text-base">{totScrap}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Sin linea seleccionada */}
      {!selectedLinea && !loading && (
        <div className="text-center text-slate-400 py-8 text-base">
          Selecciona una linea para comenzar
        </div>
      )}
      </div>
    </>
  );
}
