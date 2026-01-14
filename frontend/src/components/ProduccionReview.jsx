import React, { useState, useEffect } from 'react';

export default function ProduccionReview({ linea, fecha, turno, onClose }) {
  const [intervalos, setIntervalos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIntervalo, setSelectedIntervalo] = useState(null);
  const [relatedTickets, setRelatedTickets] = useState([]);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3107/api';

  useEffect(() => {
    cargarDeadtimeNoJustificado();
  }, [linea, fecha, turno]);

  // Limpiar modales al desmontar
  useEffect(() => {
    return () => {
      setSelectedIntervalo(null)
      setShowTicketsModal(false)
    }
  }, []);

  const cargarDeadtimeNoJustificado = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${apiUrl}/produccion/unjustified?linea=${encodeURIComponent(linea)}&fecha=${fecha}&turno=${turno}`
      );
      if (!response.ok) throw new Error('Error cargando datos');

      const result = await response.json();
      setIntervalos(result.data || []);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClickIntervalo = async (intervalo) => {
    setSelectedIntervalo(intervalo);
    setShowTicketsModal(true);

    try {
      const response = await fetch(
        `${apiUrl}/produccion/related-tickets/${intervalo.id}`
      );
      if (!response.ok) throw new Error('Error cargando tickets');

      const result = await response.json();
      setRelatedTickets(result.data || []);
    } catch (err) {
      console.error(err);
      setRelatedTickets([]);
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

  return (
    <div className="bg-slate-900 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          Review - {turnoLabel} - {linea} ({fecha})
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

      <div className="text-slate-300 text-sm mb-4 p-3 bg-slate-800 rounded">
        <p>
          <span className="font-semibold">Deadtime no justificado</span> = Deadtime total - Minutos justificados por tickets
        </p>
        <p className="mt-2">Haz click en un intervalo para ver tickets relacionados</p>
      </div>

      {/* Tabla de Intervalos con Deadtime No Justificado */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-3 py-2 text-left text-slate-300 font-semibold">Hora</th>
              <th className="px-3 py-2 text-left text-slate-300 font-semibold">Modelo</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Deadtime Total (min)</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">Justificado (min)</th>
              <th className="px-3 py-2 text-right text-slate-300 font-semibold">No Justificado (min)</th>
              <th className="px-3 py-2 text-center text-slate-300 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {intervalos.map((int) => {
              const tiempoNoJust = int.tiempo_no_justificado || 0;
              const hasUnjustified = tiempoNoJust > 0;

              return (
                <tr
                  key={int.id}
                  className={`border-b border-slate-700 ${
                    hasUnjustified ? 'bg-red-900/20' : 'hover:bg-slate-800/50'
                  } transition`}
                >
                  <td className="px-3 py-2 text-slate-300 font-medium">{int.hora_inicio}:00</td>
                  <td className="px-3 py-2 text-slate-300">{int.modelo || 'N/A'}</td>
                  <td className="px-3 py-2 text-right text-amber-400 font-semibold">
                    {Number(int.deadtime_minutos || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-400">
                    {Number(int.minutos_justificados || 0).toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${
                    hasUnjustified ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {Number(tiempoNoJust || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleClickIntervalo(int)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Ver Tickets
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Tickets Relacionados */}
      {showTicketsModal && selectedIntervalo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                Tickets - {selectedIntervalo.hora_inicio}:00 ({linea})
              </h3>
              <button
                onClick={() => setShowTicketsModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl"
              >
                ✕
              </button>
            </div>

            {relatedTickets.length === 0 ? (
              <div className="text-slate-400 p-4 text-center">
                No hay tickets relacionados en este intervalo
              </div>
            ) : (
              <div className="space-y-3">
                {relatedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-slate-700 rounded p-4 border-l-4 border-blue-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-100">Ticket #{ticket.id}</p>
                        <p className="text-sm text-slate-400">{ticket.descr}</p>
                      </div>
                      <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                        {Number(ticket.minutos_justificados || 0).toFixed(2)} min
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                      <div>
                        <span className="text-slate-500">Modelo:</span> {ticket.modelo}
                      </div>
                      <div>
                        <span className="text-slate-500">Duración:</span> {ticket.duracion_minutos} min
                      </div>
                      <div>
                        <span className="text-slate-500">Apertura:</span>{' '}
                        {new Date(ticket.hr).toLocaleTimeString('es-MX')}
                      </div>
                      <div>
                        <span className="text-slate-500">Cierre:</span>{' '}
                        {new Date(ticket.hc).toLocaleTimeString('es-MX')}
                      </div>
                    </div>
                    {ticket.solucion && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <p className="text-xs text-slate-500">Solución:</p>
                        <p className="text-sm text-slate-300">{ticket.solucion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowTicketsModal(false)}
              className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
