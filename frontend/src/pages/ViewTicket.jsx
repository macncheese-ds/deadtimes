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

  if (!ticket) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-slate-925 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-400 mb-4"></div>
        <p className="text-slate-300 font-medium">Cargando ticket...</p>
      </div>
    </div>
  )

  // Calcular tiempos
  const tiempoRespuesta = calcularMinutos(ticket.hr, ticket.ha);
  const tiempoAtencion = calcularMinutos(ticket.ha, ticket.hc);
  const tiempoTotal = calcularMinutos(ticket.hr, ticket.hc);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-slate-925 p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-5 sm:p-8 shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Resumen del Ticket</h1>
                <span className="badge badge-blue">#{ticket.id}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={loadTicket}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-700/30 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all border border-slate-600/50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Actualizando...' : 'Recargar'}
              </button>
            </div>
          </div>
          
          {/* Sección de Tiempos del Proceso */}
          <div className="mb-6 bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tiempos del Proceso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fecha/Hora de Creación */}
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="text-xs text-emerald-300 mb-1 font-medium">Creación del Ticket</p>
                <p className="text-sm font-semibold text-emerald-400">{formatDateTime(ticket.hr)}</p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {ticket.nombre || 'N/A'}
                </p>
              </div>
              
              {/* Fecha/Hora de Inicio de Atención */}
              <div className={`rounded-xl p-4 border ${ticket.ha ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-700/30 border-slate-600/50'}`}>
                <p className={`text-xs mb-1 font-medium ${ticket.ha ? 'text-amber-300' : 'text-slate-400'}`}>Inicio de Atención</p>
                <p className={`text-sm font-semibold ${ticket.ha ? 'text-amber-400' : 'text-slate-500'}`}>
                  {formatDateTime(ticket.ha)}
                </p>
                {tiempoRespuesta !== null && (
                  <p className="text-xs text-slate-400 mt-2">Respuesta: {tiempoRespuesta} min</p>
                )}
              </div>
              
              {/* Fecha/Hora de Cierre */}
              <div className={`rounded-xl p-4 border ${ticket.hc ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-700/30 border-slate-600/50'}`}>
                <p className={`text-xs mb-1 font-medium ${ticket.hc ? 'text-blue-300' : 'text-slate-400'}`}>Cierre del Ticket</p>
                <p className={`text-sm font-semibold ${ticket.hc ? 'text-blue-400' : 'text-slate-500'}`}>
                  {formatDateTime(ticket.hc)}
                </p>
                {tiempoTotal !== null && (
                  <p className="text-xs text-slate-400 mt-2">Total: {tiempoTotal} min</p>
                )}
              </div>
            </div>
            
            {/* Resumen de tiempos */}
            {ticket.done && tiempoTotal !== null && (
              <div className="mt-4 pt-4 border-t border-slate-600/50 grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Tiempo de Respuesta</p>
                  <p className="text-xl font-bold text-emerald-400">{tiempoRespuesta ?? 'N/A'}<span className="text-sm ml-1">min</span></p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Tiempo de Atención</p>
                  <p className="text-xl font-bold text-amber-400">{tiempoAtencion ?? 'N/A'}<span className="text-sm ml-1">min</span></p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Tiempo Total</p>
                  <p className="text-xl font-bold text-blue-400">{tiempoTotal}<span className="text-sm ml-1">min</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Información del ticket */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Descripción</p>
              <p className="text-white font-medium">{ticket.descr}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Línea</p>
              <p className="text-white font-medium">Línea {ticket.linea}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Equipo</p>
              <p className="text-white font-medium">{ticket.equipo}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Modelo</p>
              <p className="text-white font-medium">{ticket.modelo}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Turno</p>
              <p className="text-white font-medium">{ticket.turno}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Técnico</p>
              <p className="text-white font-medium">{ticket.tecnico || 'N/A'}</p>
              {ticket.num_empleado1 && <p className="text-xs text-slate-500 mt-1">#{ticket.num_empleado1}</p>}
            </div>
          </div>

          {/* Solución */}
          {ticket.solucion && (
            <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/30 mb-6">
              <p className="text-xs text-emerald-300 mb-2 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Solución Aplicada
              </p>
              <p className="text-white">{ticket.solucion}</p>
            </div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30 text-center">
              <p className="text-xs text-blue-300 mb-1">Rate</p>
              <p className="text-lg font-bold text-blue-400">{ticket.rate || 'N/A'}</p>
              <p className="text-xs text-slate-500">piezas/hr</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 text-center">
              <p className="text-xs text-amber-300 mb-1">Minutos de Paro</p>
              <p className="text-lg font-bold text-amber-400">{ticket.minutos || 'N/A'}</p>
            </div>
            <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/30 text-center">
              <p className="text-xs text-rose-300 mb-1">Piezas Perdidas</p>
              <p className="text-lg font-bold text-rose-400">{ticket.piezas || 'N/A'}</p>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30 text-center">
              <p className="text-xs text-purple-300 mb-1">Tiempo Perdido</p>
              <p className="text-lg font-bold text-purple-400">{ticket.deadtime || 'N/A'}</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => window.print()} 
              className="flex-1 sm:flex-none px-5 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl font-medium transition-all border border-slate-600/50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <button 
              onClick={() => window.history.back()} 
              className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
