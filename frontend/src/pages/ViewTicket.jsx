import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket } from '../api_deadtimes'

// Helper para formatear fecha/hora
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Calcular diferencia en minutos entre dos fechas
function calcularMinutos(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null;
  const diffMs = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export default function ViewTicket(){
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const loadTicket = () => {
    setLoading(true)
    getTicket(id)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  
  useEffect(() => { loadTicket() }, [id])

  if (!ticket) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><span className="text-slate-300">Cargando...</span></div>

  // Calcular tiempos
  const tiempoRespuesta = calcularMinutos(ticket.hr, ticket.ha); // Tiempo desde creación hasta inicio de atención
  const tiempoAtencion = calcularMinutos(ticket.ha, ticket.hc);  // Tiempo de atención (ha a hc)
  const tiempoTotal = calcularMinutos(ticket.hr, ticket.hc);     // Tiempo total (hr a hc)

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-100">Ticket #{ticket.id} - Resumen</h1>
          <button 
            onClick={loadTicket}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Actualizando...' : 'Recargar'}
          </button>
        </div>
        
        {/* Sección de Tiempos del Proceso */}
        <div className="mb-6 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Tiempos del Proceso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fecha/Hora de Creación */}
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Creación del Ticket</p>
              <p className="text-sm font-medium text-emerald-400">{formatDateTime(ticket.hr)}</p>
              <p className="text-xs text-slate-500 mt-1">Reportado por: {ticket.nombre || 'N/A'}</p>
            </div>
            
            {/* Fecha/Hora de Inicio de Atención */}
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Inicio de Atención</p>
              <p className={`text-sm font-medium ${ticket.ha ? 'text-amber-400' : 'text-slate-500'}`}>
                {formatDateTime(ticket.ha)}
              </p>
              {tiempoRespuesta !== null && (
                <p className="text-xs text-slate-500 mt-1">Respuesta: {tiempoRespuesta} min</p>
              )}
            </div>
            
            {/* Fecha/Hora de Cierre */}
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Cierre del Ticket</p>
              <p className={`text-sm font-medium ${ticket.hc ? 'text-blue-400' : 'text-slate-500'}`}>
                {formatDateTime(ticket.hc)}
              </p>
              {tiempoTotal !== null && (
                <p className="text-xs text-slate-500 mt-1">Total: {tiempoTotal} min</p>
              )}
            </div>
          </div>
          
          {/* Resumen de tiempos */}
          {ticket.done && tiempoTotal !== null && (
            <div className="mt-4 pt-4 border-t border-slate-600 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400">Tiempo de Respuesta</p>
                <p className="text-lg font-bold text-emerald-400">{tiempoRespuesta ?? 'N/A'} min</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tiempo de Atención</p>
                <p className="text-lg font-bold text-amber-400">{tiempoAtencion ?? 'N/A'} min</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tiempo Total</p>
                <p className="text-lg font-bold text-blue-400">{tiempoTotal} min</p>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm md:text-base" style={{borderCollapse: 'collapse'}}>
            <tbody>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Descripción</td><td className="py-3 text-slate-300">{ticket.descr}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Línea</td><td className="py-3 text-slate-300">{`Línea ${ticket.linea}`}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Equipo</td><td className="py-3 text-slate-300">{ticket.equipo}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Modelo</td><td className="py-3 text-slate-300">{ticket.modelo}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Turno</td><td className="py-3 text-slate-300">{ticket.turno}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Técnico</td><td className="py-3 text-slate-300">{ticket.tecnico}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Num. Empleado Técnico</td><td className="py-3 text-slate-300">{ticket.num_empleado1 || 'N/A'}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Solución</td><td className="py-3 text-slate-300">{ticket.solucion}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Rate</td><td className="py-3 text-slate-300">{ticket.rate ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Minutos de paro</td><td className="py-3 text-slate-300">{ticket.minutos ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Piezas perdidas</td><td className="py-3 text-slate-300">{ticket.piezas ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Tiempo Perdido</td><td className="py-3 text-slate-300">{ticket.deadtime ?? ''}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={() => window.print()} className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 text-slate-100 rounded-lg text-sm sm:text-base font-medium hover:bg-slate-600 transition-colors border border-slate-600">Imprimir</button>
          <button onClick={() => window.history.back()} className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 text-slate-200 rounded-lg text-sm sm:text-base font-medium hover:bg-slate-600 transition-colors border border-slate-600">Volver</button>
        </div>
      </div>
    </div>
  )
}
