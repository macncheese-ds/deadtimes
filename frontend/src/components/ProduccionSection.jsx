import React, { useState, useEffect } from 'react';
import { getLineas } from '../api_deadtimes';
import ProduccionEdicion from './ProduccionEdicion';
import ProduccionReview from './ProduccionReview';

export default function ProduccionSection({ onClose }) {
  const [view, setView] = useState(null); // null | 'edicion' | 'review'
  const [lineas, setLineas] = useState([]);
  const [selectedLinea, setSelectedLinea] = useState('');
  const [selectedTurno, setSelectedTurno] = useState('1');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [lineasLoading, setLineasLoading] = useState(false);

  // Cargar líneas al montar
  React.useEffect(() => {
    cargarLineas();
  }, []);

  // Limpiar vistas al desmontar el componente
  useEffect(() => {
    return () => {
      setView(null)
    }
  }, []);

  // Crear un wrapper para onClose que limpie los estados
  const handleClose = () => {
    setView(null)
    setSelectedLinea('')
    setSelectedTurno('1')
    onClose()
  }

  const cargarLineas = async () => {
    setLineasLoading(true);
    try {
      const data = await getLineas();
      setLineas(data || []);
      if (data && data.length > 0) {
        setSelectedLinea(data[0].linea);
      }
    } catch (err) {
      console.error('Error cargando líneas:', err);
    } finally {
      setLineasLoading(false);
    }
  };

  const handleSeleccionar = (viewType) => {
    if (!selectedLinea) {
      alert('Por favor selecciona una línea');
      return;
    }
    setView(viewType);
  };

  if (view === 'edicion' && selectedLinea) {
    return (
      <ProduccionEdicion
        linea={selectedLinea}
        fecha={selectedFecha}
        turno={selectedTurno}
        onClose={() => setView(null)}
      />
    );
  }

  if (view === 'review' && selectedLinea) {
    return (
      <ProduccionReview
        linea={selectedLinea}
        fecha={selectedFecha}
        turno={selectedTurno}
        onClose={() => setView(null)}
      />
    );
  }

  return (
    <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Sección Producción</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Línea</label>
          <select
            value={selectedLinea}
            onChange={(e) => setSelectedLinea(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={lineasLoading}
          >
            <option value="">-- Selecciona línea --</option>
            {lineas.map((l) => (
              <option key={l.id || l.linea} value={l.linea}>
                {l.linea}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Turno</label>
          <select
            value={selectedTurno}
            onChange={(e) => setSelectedTurno(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Turno 1 (08:00 - 20:00)</option>
            <option value="2">Turno 2 (20:00 - 08:00)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Fecha</label>
          <input
            type="date"
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Botones de Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleSeleccionar('edicion')}
          className="group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-500 text-white shadow-lg shadow-blue-500/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Ir a Edición</span>
        </button>
        <button
          onClick={() => handleSeleccionar('review')}
          className="group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-purple-500 text-white shadow-lg shadow-purple-500/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Ir a Review</span>
        </button>
      </div>

      {/* Información */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm space-y-2">
        <p>
          <span className="font-semibold text-slate-200">📊 Edición:</span> Carga tabla de intervalos (1h) para registrar producción y scrap. Requiere credenciales.
        </p>
        <p>
          <span className="font-semibold text-slate-200">👁️ Review:</span> Visualiza deadtime no justificado. Haz click en un intervalo para ver tickets relacionados.
        </p>
      </div>
    </div>
  );
}
