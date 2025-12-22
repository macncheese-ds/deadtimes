import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEquipos, getTicketsByEquipment, getLineas } from '../api_deadtimes'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'

export default function MachineAnalysis() {
  const navigate = useNavigate()
  const [maquinas, setMaquinas] = useState([])
  const [lineas, setLineas] = useState([])
  const [selectedMaquina, setSelectedMaquina] = useState('')
  const [selectedLinea, setSelectedLinea] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadMaquinas()
    loadLineas()
  }, [])

  useEffect(() => {
    if (selectedMaquina) {
      loadTickets()
    } else {
      setTickets([])
    }
  }, [selectedMaquina, selectedLinea, dateRange, customStartDate, customEndDate])

  async function loadMaquinas() {
    try {
      const data = await getEquipos()
      // Extraer solo los nombres de equipo
      const equipoNames = data.map(item => item.equipo)
      setMaquinas(equipoNames)
    } catch (error) {
      console.error('Error cargando máquinas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadLineas() {
    try {
      const data = await getLineas()
      setLineas(data)
    } catch (error) {
      console.error('Error cargando líneas:', error)
    }
  }

  async function loadTickets() {
    if (!selectedMaquina) return
    
    setLoadingTickets(true)
    try {
      const params = {}
      
      // Si es 'all', enviar el parámetro para indicar todas las máquinas
      // Si es 'sin_otros', enviar el parámetro para excluir "otros"
      if (selectedMaquina === 'all') {
        params.equipo = 'all'
      } else if (selectedMaquina === 'sin_otros') {
        params.equipo = 'sin_otros'
      } else {
        params.equipo = selectedMaquina
      }
      
      // Agregar filtro de línea si está seleccionado
      if (selectedLinea) {
        params.linea = selectedLinea
      }
      
      // Manejar fechas personalizadas
      if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          params.startDate = customStartDate
          params.endDate = customEndDate
        } else {
          // Si no hay fechas válidas, usar 30 días por defecto
          params.days = '30'
        }
      } else {
        params.days = dateRange
      }
      
      const data = await getTicketsByEquipment(params)
      // Ordenar por duración descendente
      const sortedData = data.sort((a, b) => (b.duracion_minutos || 0) - (a.duracion_minutos || 0))
      setTickets(sortedData)
    } catch (error) {
      console.error('Error cargando tickets:', error)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  const prepareChartData = () => {
    return tickets.slice(0, 10).map((ticket, idx) => ({
      name: `#${ticket.id}`,
      fullData: ticket,
      'Tiempo (min)': ticket.duracion_minutos || 0,
      'Piezas Perdidas': ticket.piezas || 0
    }))
  }

  const exportToExcel = () => {
    if (!tickets || tickets.length === 0) return
    
    const data = tickets.map((ticket, idx) => ({
      '#': idx + 1,
      'ID Ticket': ticket.id,
      'Máquina': ticket.equipo,
      'Descripción': ticket.descr,
      'Clasificación': ticket.clasificacion || 'N/A',
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Duración (min)': ticket.duracion_minutos || 0,
      'Piezas Perdidas': ticket.piezas || 0,
      'Reportado por': ticket.nombre,
      'Técnico': ticket.tecnico,
      'Solución': ticket.solucion || '',
      'Fecha Apertura': ticket.hr ? new Date(ticket.hr).toLocaleString('es-MX') : '',
      'Fecha Cierre': ticket.hc ? new Date(ticket.hc).toLocaleString('es-MX') : ''
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis de Máquina')
    
    const nombreArchivo = selectedMaquina === 'all' ? 'Todas_Maquinas' : selectedMaquina === 'sin_otros' ? 'Sin_Otros' : selectedMaquina
    const fileName = `Analisis_${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket)
    setShowModal(true)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload.fullData
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 font-medium text-sm mb-2">Ticket #{data.id}</p>
          <p className="text-xs text-slate-400 mb-1">{data.descr}</p>
          <p className="text-xs text-amber-300">Tiempo: {data.duracion_minutos || 0} min</p>
          <p className="text-xs text-rose-300">Piezas: {data.piezas || 0}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-slate-400 mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Cargando análisis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="bg-slate-800 border-l-4 border-orange-600 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-3xl font-semibold text-slate-100 flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Análisis de Máquinas
              </h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">
                Visualiza los tickets con mayores tiempos por máquina para identificar errores y tiempos de atención
              </p>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Volver
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selector de máquina */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Máquina</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedMaquina}
                onChange={e => setSelectedMaquina(e.target.value)}
              >
                <option value="">-- Seleccionar máquina --</option>
                <option value="all">Todas las máquinas</option>
                <option value="sin_otros">Sin otros</option>
                {maquinas.map((maquina, idx) => (
                  <option key={idx} value={maquina}>{maquina}</option>
                ))}
              </select>
            </div>

            {/* Selector de línea */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Línea (opcional)</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
              >
                <option value="">Todas las líneas</option>
                {lineas.map(linea => (
                  <option key={linea.id} value={linea.linea}>Línea {linea.linea}</option>
                ))}
              </select>
            </div>

            {/* Selector de rango de fechas */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Período</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="60">Últimos 60 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Botón de exportar */}
            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                disabled={!tickets || tickets.length === 0}
                className="w-full bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 px-4 py-2.5 rounded-lg transition-colors border border-emerald-600/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar a Excel
              </button>
            </div>

            {/* Fechas personalizadas */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Desde</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Hasta</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        {!selectedMaquina ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <svg className="w-20 h-20 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-slate-400 text-lg">Selecciona una máquina o "Todas las máquinas" para ver el análisis</p>
          </div>
        ) : loadingTickets ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-orange-400 mb-4"></div>
            <p className="text-slate-300 text-lg font-medium">Cargando tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <svg className="w-20 h-20 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-400 text-lg">No hay tickets para esta máquina</p>
            <p className="text-slate-500 text-sm mt-1">en el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Estadísticas resumidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total Tickets</p>
                    <p className="text-3xl font-bold text-blue-100 mt-1">{tickets.length}</p>
                  </div>
                  <div className="bg-blue-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-300 text-sm font-medium">Tiempo Total</p>
                    <p className="text-3xl font-bold text-amber-100 mt-1">
                      {tickets.reduce((sum, t) => sum + (t.duracion_minutos || 0), 0)}
                      <span className="text-lg ml-1">min</span>
                    </p>
                  </div>
                  <div className="bg-amber-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Tiempo Promedio</p>
                    <p className="text-3xl font-bold text-purple-100 mt-1">
                      {Math.round(tickets.reduce((sum, t) => sum + (t.duracion_minutos || 0), 0) / tickets.length)}
                      <span className="text-lg ml-1">min</span>
                    </p>
                  </div>
                  <div className="bg-purple-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-900/40 to-rose-800/20 border border-rose-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-rose-300 text-sm font-medium">Piezas Perdidas</p>
                    <p className="text-3xl font-bold text-rose-100 mt-1">
                      {tickets.reduce((sum, t) => sum + (t.piezas || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-rose-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfica de Top 10 tickets */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Top 10 Tickets con Mayor Tiempo</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={prepareChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Tiempo (min)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla detallada de tickets */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                Detalle de Tickets - {selectedMaquina}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-300 uppercase bg-slate-700">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Máquina</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Clasificación</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Línea</th>
                      <th className="px-4 py-3">Duración</th>
                      <th className="px-4 py-3">Piezas</th>
                      <th className="px-4 py-3">Fecha Cierre</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, idx) => (
                      <tr key={ticket.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-blue-300">#{ticket.id}</td>
                        <td className="px-4 py-3 text-orange-300 font-medium">{ticket.equipo}</td>
                        <td className="px-4 py-3 text-slate-200 max-w-xs truncate" title={ticket.descr}>
                          {ticket.descr}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="px-2 py-1 bg-slate-600 rounded text-xs">
                            {ticket.clasificacion || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{ticket.modelo}</td>
                        <td className="px-4 py-3 text-slate-300">Línea {ticket.linea}</td>
                        <td className="px-4 py-3 text-amber-300 font-semibold">
                          {ticket.duracion_minutos || 0} min
                        </td>
                        <td className="px-4 py-3 text-rose-300">{ticket.piezas || 0}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {ticket.hc ? new Date(ticket.hc).toLocaleDateString('es-MX') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openTicketDetail(ticket)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle de ticket */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-900/60 to-slate-900 border-b border-slate-700 p-4 sm:p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">
                  Ticket #{selectedTicket.id}
                </h2>
                <p className="text-slate-400 text-sm">{selectedTicket.equipo}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-3 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                {/* Información principal */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Información del Ticket</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Descripción:</span>
                      <span className="text-slate-200">{selectedTicket.descr}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Clasificación:</span>
                      <span className="text-slate-200">{selectedTicket.clasificacion || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Modelo:</span>
                      <span className="text-slate-200">{selectedTicket.modelo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Línea:</span>
                      <span className="text-slate-200">Línea {selectedTicket.linea}</span>
                    </div>
                  </div>
                </div>

                {/* Tiempos */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Tiempos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Duración Total:</span>
                      <span className="text-amber-300 font-bold text-lg">
                        {selectedTicket.duracion_minutos || 0} min
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fecha Apertura:</span>
                      <span className="text-slate-200">
                        {selectedTicket.hr ? new Date(selectedTicket.hr).toLocaleString('es-MX') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fecha Cierre:</span>
                      <span className="text-slate-200">
                        {selectedTicket.hc ? new Date(selectedTicket.hc).toLocaleString('es-MX') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Producción */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Impacto en Producción</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Piezas Perdidas:</span>
                      <span className="text-rose-300 font-bold text-lg">{selectedTicket.piezas || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tiempo Perdido (Deadtime):</span>
                      <span className="text-amber-300 font-bold text-lg">
                        {selectedTicket.deadtime || 0} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Personal Involucrado</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Reportado por:</span>
                      <span className="text-slate-200">{selectedTicket.nombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Técnico Asignado:</span>
                      <span className="text-slate-200">{selectedTicket.tecnico || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Solución */}
                {selectedTicket.solucion && (
                  <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
                    <h3 className="text-emerald-300 font-medium mb-2">Solución Aplicada</h3>
                    <p className="text-slate-200 text-sm">{selectedTicket.solucion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
