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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3107/api';

  // Cargar intervalos
  useEffect(() => {
    cargarIntervalos();
  }, [linea, fecha, turno]);

  const cargarIntervalos = async () => {
    setLoading(true);
    setError('');
    try {
      // Primero crear los intervalos si no existen
      await fetch(`${apiUrl}/produccion/intervalos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linea, fecha, turno: parseInt(turno) })
      });

      // Luego cargar los intervalos
      const response = await fetch(
        `${apiUrl}/produccion/intervalos?linea=${encodeURIComponent(linea)}&fecha=${fecha}&turno=${turno}`
      );
      if (!response.ok) throw new Error('Error cargando intervalos');

      const result = await response.json();
      setIntervalos(result.data || []);
      setTotales(result.totales || {});
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarProduccion = (intervaloId, valorActual) => {
    setEditingField({
      intervaloId,
      campo: 'produccion',
      valor: valorActual || '',
      valorAnterior: valorActual
    });
    setShowLoginModal(true);
  };

  const handleEditarScrap = (intervaloId, valorActual) => {
    setEditingField({
      intervaloId,
      campo: 'scrap',
      valor: valorActual || '',
      valorAnterior: valorActual
    });
    setShowLoginModal(true);
  };

  const handleCambiarModelo = (intervaloId, modeloActual) => {
    setEditingField({
      intervaloId,
      campo: 'modelo',
      valor: modeloActual || '',
      valorAnterior: modeloActual
    });
    // Aquí podría abrirse un modal de selección de modelo
    setShowLoginModal(true);
  };

  const handleLoginConfirm = async ({ employee_input, password }) => {
    if (!editingField) return;
    
    setLoginBusy(true);
    try {
      const response = await fetch(`${apiUrl}/produccion/intervalos/${editingField.intervaloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campo: editingField.campo,
          valor: editingField.valor,
          numEmpleado: employee_input,
          password
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar');
      }

      // Recargar intervalos
      await cargarIntervalos();
      setShowLoginModal(false);
      setEditingField(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoginBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const horas = turno == 1 ? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : [20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
  const turnoLabel = turno == 1 ? 'Turno 1 (08:00 - 20:00)' : 'Turno 2 (20:00 - 08:00)';

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

      {/* Tabla de Intervalos */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-3 py-2 text-left text-slate-300 font-semibold">Hora</th>
              <th className="px-3 py-2 text-left text-slate-300 font-semibold">Modelo</th>
              <th className="px-3 py-2 text-left text-slate-300 font-semibold">Producto</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Rate</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Acu. Rate</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Producción</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Acu. Prod</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Scrap</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Delta</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Deadtime (min)</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Cumpl. %</th>
            </tr>
          </thead>
          <tbody>
            {intervalos.map((int, idx) => (
              <tr key={int.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                <td className="px-3 py-2 text-slate-300 font-medium">{int.hora_inicio}:00</td>
                <td className="px-3 py-2 text-slate-300">
                  <button
                    onClick={() => handleCambiarModelo(int.id, int.modelo)}
                    className="text-blue-400 hover:text-blue-300 underline text-left"
                  >
                    {int.modelo || 'N/A'}
                  </button>
                </td>
                <td className="px-3 py-2 text-slate-400">{int.producto || '-'}</td>
                <td className="px-3 py-2 text-right text-slate-300">{int.rate}</td>
                <td className="px-3 py-2 text-right text-slate-300">{int.rate_acumulado}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleEditarProduccion(int.id, int.produccion)}
                    className="bg-green-900/50 hover:bg-green-800/50 text-green-300 px-3 py-1 rounded font-medium"
                  >
                    {int.produccion}
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-slate-300">{int.produccion_acumulada}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleEditarScrap(int.id, int.scrap)}
                    className="bg-red-900/50 hover:bg-red-800/50 text-red-300 px-3 py-1 rounded font-medium"
                  >
                    {int.scrap}
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-slate-300">{int.delta}</td>
                <td className="px-3 py-2 text-right text-amber-300 font-semibold">
                  {int.deadtime_minutos ? int.deadtime_minutos.toFixed(2) : '0.00'}
                </td>
                <td className="px-3 py-2 text-right text-slate-300">
                  {int.porcentaje_cumplimiento}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
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
            {totales.deadtime_total ? totales.deadtime_total.toFixed(2) : '0.00'} min
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Justificado</p>
          <p className="text-blue-400 font-bold text-lg">
            {totales.justificado_total ? totales.justificado_total.toFixed(2) : '0.00'} min
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Cumplimiento</p>
          <p className="text-slate-100 font-bold text-lg">{totales.porcentaje_cumplimiento}%</p>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          title={`Confirmar edición - Campo: ${editingField?.campo}`}
          onClose={() => setShowLoginModal(false)}
          onConfirm={handleLoginConfirm}
          isBusy={loginBusy}
          requirePassword={true}
        />
      )}
    </div>
  );
}
