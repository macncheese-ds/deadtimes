import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getLineas, 
  getStatsLinea, 
  getStatsEquiposDetalle, 
  getStatsTendencia, 
  getStatsClasificacion, 
  getStatsTotales,
  getStatsAtencion,
  getStatsEquipos,
  getTicketsByEquipment
} from '../api_deadtimes'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Analytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lineas, setLineas] = useState([])
  const [selectedLinea, setSelectedLinea] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Datos de estadísticas
  const [totales, setTotales] = useState({})
  const [statsLinea, setStatsLinea] = useState([])
  const [statsEquipos, setStatsEquipos] = useState([])
  const [tendencia, setTendencia] = useState([])
  const [clasificacion, setClasificacion] = useState([])
  const [statsAtencion, setStatsAtencion] = useState([])
  const [statsEquiposFallas, setStatsEquiposFallas] = useState([])
  
  // States for drill-down modal
  const [showDrillDown, setShowDrillDown] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [drillDownTickets, setDrillDownTickets] = useState([])
  const [loadingDrillDown, setLoadingDrillDown] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (lineas.length > 0) {
      loadStats()
    }
  }, [selectedLinea, dateRange, customStartDate, customEndDate, lineas.length])

  async function loadInitialData() {
    setLoading(true)
    try {
      const lineasData = await getLineas()
      setLineas(lineasData)
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    setRefreshing(true)
    try {
      const params = {}
      
      if (selectedLinea !== 'all') {
        params.linea = selectedLinea
      }
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      } else {
        params.days = dateRange
      }

      const [totalesData, lineaData, equiposData, tendenciaData, clasificacionData, atencionData, equiposFallasData] = await Promise.all([
        getStatsTotales(params),
        getStatsLinea(params),
        getStatsEquiposDetalle(params),
        getStatsTendencia(params),
        getStatsClasificacion(params),
        getStatsAtencion(),
        getStatsEquipos()
      ])

      setTotales(totalesData)
      setStatsLinea(lineaData)
      setStatsEquipos(equiposData)
      setTendencia(tendenciaData)
      setClasificacion(clasificacionData)
      setStatsAtencion(atencionData)
      setStatsEquiposFallas(equiposFallasData)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Formatear datos para gráficas
  const prepareLineaData = () => {
    return statsLinea.map(item => ({
      name: `Línea ${item.linea}`,
      'Total Tickets': item.total_tickets,
      'Cerrados': item.cerrados,
      'Abiertos': item.abiertos,
      'Tiempo Prom (min)': Math.round(item.promedio_minutos || 0)
    }))
  }

  const prepareTendenciaData = () => {
    if (!tendencia || tendencia.length === 0) return []
    
    const grouped = {}
    tendencia.forEach(item => {
      // La fecha viene del backend como 'YYYY-MM-DD' desde DATE(hr)
      const fechaStr = typeof item.fecha === 'string' ? item.fecha.split('T')[0] : item.fecha
      const fechaObj = new Date(fechaStr + 'T00:00:00')
      const fechaDisplay = fechaObj.toLocaleDateString('es', { month: 'short', day: 'numeric' })
      
      if (!grouped[fechaStr]) {
        grouped[fechaStr] = { 
          fecha: fechaDisplay, 
          fechaSort: fechaObj,
          total: 0, 
          cerrados: 0 
        }
      }
      // Sumar los valores de cada línea para el mismo día
      grouped[fechaStr].total += Number(item.total_tickets) || 0
      grouped[fechaStr].cerrados += Number(item.cerrados) || 0
    })
    
    return Object.values(grouped)
      .sort((a, b) => a.fechaSort - b.fechaSort)
      .slice(-30)
      .map(({ fecha, total, cerrados }) => ({ fecha, total, cerrados }))
  }

  const prepareClasificacionData = () => {
    const grouped = {}
    clasificacion.forEach(item => {
      if (!grouped[item.clasificacion]) {
        grouped[item.clasificacion] = 0
      }
      grouped[item.clasificacion] += item.total_tickets
    })
    
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value)
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    if (percent < 0.05) return null
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const prepareEquiposData = () => {
    return statsEquipos
      .slice(0, 10)
      .map(item => ({
        name: item.equipo,
        fullName: item.equipo,
        'Fallas': item.total_fallas,
        'Tiempo Prom': Math.round(item.promedio_minutos || 0),
        'Piezas Perdidas': item.total_piezas_perdidas || 0
      }))
  }

  const prepareAtencionData = () => {
    return statsAtencion.slice(0, 15).map((item, idx) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      'Tiempo Promedio': Math.round(item.promedio_minutos || 0),
      'Total Tickets': item.total_tickets
    }))
  }

  const prepareEquiposFallasData = () => {
    return statsEquiposFallas.slice(0, 10).map(item => ({
      name: item.equipo.length > 30 ? item.equipo.substring(0, 30) + '...' : item.equipo,
      fullName: item.equipo,
      'Total Fallas': item.total_fallas
    }))
  }

  // Handle click on equipment bar chart
  const handleEquipmentClick = async (data) => {
    if (!data || !data.fullName) return
    
    setSelectedEquipment(data.fullName)
    setShowDrillDown(true)
    setLoadingDrillDown(true)
    
    try {
      const params = { equipo: data.fullName }
      
      if (selectedLinea !== 'all') {
        params.linea = selectedLinea
      }
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      } else {
        params.days = dateRange
      }
      
      const tickets = await getTicketsByEquipment(params)
      setDrillDownTickets(tickets)
    } catch (error) {
      console.error('Error loading equipment tickets:', error)
      setDrillDownTickets([])
    } finally {
      setLoadingDrillDown(false)
    }
  }

  // Export drill-down tickets to Excel
  const exportDrillDownToExcel = () => {
    if (!drillDownTickets || drillDownTickets.length === 0) return
    
    const data = drillDownTickets.map((ticket, idx) => ({
      '#': idx + 1,
      'ID Ticket': ticket.id,
      'Descripción': ticket.descr,
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Equipo': ticket.equipo,
      'Clasificación': ticket.clasificacion,
      'Duración (min)': ticket.duracion_minutos || 0,
      'Piezas Perdidas': ticket.piezas || 0,
      'Tiempo Perdido': ticket.deadtime || 0,
      'Reportado por': ticket.nombre,
      'Técnico': ticket.tecnico,
      'Solución': ticket.solucion || '',
      'Fecha Apertura': ticket.hr ? new Date(ticket.hr).toLocaleString('es-MX') : '',
      'Fecha Cierre': ticket.hc ? new Date(ticket.hc).toLocaleString('es-MX') : ''
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
    
    const fileName = `Tickets_${selectedEquipment}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const CustomYAxisTick = ({ x, y, payload }) => {
    const maxLength = 25
    const text = payload.value
    const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fill="#94a3b8" 
          fontSize={11}
          fontWeight={400}
        >
          {displayText}
        </text>
      </g>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 font-medium text-sm mb-2">{data.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 border-l-4 border-blue-600 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-3xl font-semibold text-slate-100">Analytics Dashboard</h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">
                Estadísticas y análisis de downtime
                {selectedLinea !== 'all' && (
                  <span className="ml-2 px-2 py-1 bg-blue-900/40 text-blue-300 rounded text-xs font-medium">
                    Línea {selectedLinea}
                  </span>
                )}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Filtros</h2>
            {refreshing && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-slate-400"></div>
                <span>Actualizando...</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selector de línea */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Línea</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
              >
                <option value="all">Todas las líneas</option>
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

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">
                  Total Tickets {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-3xl font-bold text-blue-100 mt-1">{totales.total_tickets || 0}</p>
              </div>
              <div className="bg-blue-700/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-300 text-sm font-medium">
                  Cerrados {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-3xl font-bold text-emerald-100 mt-1">{totales.cerrados || 0}</p>
              </div>
              <div className="bg-emerald-700/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-300 text-sm font-medium">
                  Abiertos {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-3xl font-bold text-amber-100 mt-1">{totales.abiertos || 0}</p>
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
                <p className="text-purple-300 text-sm font-medium">
                  Tiempo Prom {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-3xl font-bold text-purple-100 mt-1">{Math.round(totales.promedio_minutos_global || 0)}<span className="text-lg ml-1">min</span></p>
              </div>
              <div className="bg-purple-700/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficas principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfica de tickets por línea */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              {selectedLinea !== 'all' ? `Tickets Línea ${selectedLinea}` : 'Tickets por Línea'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareLineaData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="Total Tickets" fill="#3b82f6" />
                <Bar dataKey="Cerrados" fill="#10b981" />
                <Bar dataKey="Abiertos" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de tendencia en el tiempo */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              {selectedLinea !== 'all' ? `Tendencia Línea ${selectedLinea}` : 'Tendencia de Tickets'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prepareTendenciaData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fecha" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="cerrados" stroke="#10b981" strokeWidth={2} name="Cerrados" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de clasificación */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              {selectedLinea !== 'all' ? `Clasificación Línea ${selectedLinea}` : 'Tickets por Clasificación'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareClasificacionData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prepareClasificacionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value, entry) => (
                    <span className="text-slate-300 text-sm">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de equipos con más fallas - INTERACTIVE */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              {selectedLinea !== 'all' ? `Top 10 Equipos Línea ${selectedLinea}` : 'Top 10 Equipos con Más Fallas'}
            </h2>
            <p className="text-slate-400 text-xs mb-3">Haz clic en una barra para ver los tickets detallados</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareEquiposData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={180} 
                  tick={<CustomYAxisTick />}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="Fallas" 
                  fill="#ef4444" 
                  onClick={handleEquipmentClick}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficas adicionales - Tiempos de Atención y Equipos con Más Fallas General */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfica de tiempos de atención */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Tiempos de Atención por Día</h2>
            <p className="text-slate-400 text-xs mb-4">Últimos 30 días - Promedio de minutos de atención</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prepareAtencionData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Tiempo Promedio" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de equipos con más fallas general - INTERACTIVE */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Equipos con Más Fallas (General)</h2>
            <p className="text-slate-400 text-xs mb-3">Top 10 últimos 30 días - Todas las líneas</p>
            <p className="text-slate-400 text-xs mb-3">Haz clic en una barra para ver los tickets detallados</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareEquiposFallasData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={180}
                  tick={<CustomYAxisTick />}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="Total Fallas" 
                  fill="#ef4444"
                  onClick={handleEquipmentClick}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tablas detalladas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabla detallada de líneas */}
          {statsLinea.length > 0 && (
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                {selectedLinea !== 'all' ? `Detalle Línea ${selectedLinea}` : 'Detalle por Línea'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-300 uppercase bg-slate-700">
                    <tr>
                      <th className="px-4 py-3">Línea</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Cerrados</th>
                      <th className="px-4 py-3">Abiertos</th>
                      <th className="px-4 py-3">Tiempo Prom</th>
                      <th className="px-4 py-3">Piezas Perdidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsLinea.map((linea, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-slate-200">Línea {linea.linea}</td>
                        <td className="px-4 py-3 text-blue-300">{linea.total_tickets}</td>
                        <td className="px-4 py-3 text-emerald-300">{linea.cerrados}</td>
                        <td className="px-4 py-3 text-amber-300">{linea.abiertos}</td>
                        <td className="px-4 py-3 text-purple-300">{Math.round(linea.promedio_minutos || 0)} min</td>
                        <td className="px-4 py-3 text-rose-300">{linea.total_piezas_perdidas || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla detallada de equipos */}
          {statsEquipos.length > 0 && (
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                {selectedLinea !== 'all' ? `Detalle de Equipos Línea ${selectedLinea}` : 'Detalle de Equipos'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-300 uppercase bg-slate-700">
                    <tr>
                      <th className="px-4 py-3">Equipo</th>
                      <th className="px-4 py-3">Línea</th>
                      <th className="px-4 py-3">Fallas</th>
                      <th className="px-4 py-3">Tiempo Prom</th>
                      <th className="px-4 py-3">Piezas Perdidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsEquipos.slice(0, 15).map((equipo, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-slate-200">{equipo.equipo}</td>
                        <td className="px-4 py-3 text-slate-300">Línea {equipo.linea}</td>
                        <td className="px-4 py-3 text-rose-300">{equipo.total_fallas}</td>
                        <td className="px-4 py-3 text-purple-300">{Math.round(equipo.promedio_minutos || 0)} min</td>
                        <td className="px-4 py-3 text-amber-300">{equipo.total_piezas_perdidas || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drill-Down Modal for Equipment Details */}
      {showDrillDown && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDrillDown(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 sm:p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">
                  Tickets Detallados - {selectedEquipment}
                </h2>
                <p className="text-slate-400 text-sm">
                  Ordenados por tiempo consumido (mayor a menor)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportDrillDownToExcel}
                  disabled={!drillDownTickets || drillDownTickets.length === 0}
                  className="bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-600/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>
                <button 
                  onClick={() => setShowDrillDown(false)} 
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-3"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingDrillDown ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-slate-400 mb-4"></div>
                  <p className="text-slate-300 text-lg font-medium">Cargando tickets...</p>
                </div>
              ) : drillDownTickets && drillDownTickets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-300 uppercase bg-slate-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3">Modelo</th>
                        <th className="px-4 py-3">Línea</th>
                        <th className="px-4 py-3">Clasificación</th>
                        <th className="px-4 py-3">Duración (min)</th>
                        <th className="px-4 py-3">Piezas</th>
                        <th className="px-4 py-3">Reportado</th>
                        <th className="px-4 py-3">Técnico</th>
                        <th className="px-4 py-3">Fecha Cierre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillDownTickets.map((ticket, idx) => (
                        <tr key={ticket.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-blue-300">#{ticket.id}</td>
                          <td className="px-4 py-3 text-slate-200">{ticket.descr}</td>
                          <td className="px-4 py-3 text-slate-300">{ticket.modelo}</td>
                          <td className="px-4 py-3 text-slate-300">Línea {ticket.linea}</td>
                          <td className="px-4 py-3 text-slate-300">{ticket.clasificacion}</td>
                          <td className="px-4 py-3 text-amber-300 font-semibold">{ticket.duracion_minutos || 0}</td>
                          <td className="px-4 py-3 text-rose-300">{ticket.piezas || 0}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{ticket.nombre}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{ticket.tecnico}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {ticket.hc ? new Date(ticket.hc).toLocaleDateString('es-MX') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-lg">No hay tickets disponibles para este equipo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
