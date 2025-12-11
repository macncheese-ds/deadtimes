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
  getTicketsByEquipment,
  getTopTicketsByEquipment,
  getEquipos,
  getTopTiempos
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
  
  // States for top 5 tickets modal (machines with more failures)
  const [showTop5Modal, setShowTop5Modal] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [top5Tickets, setTop5Tickets] = useState([])
  const [loadingTop5, setLoadingTop5] = useState(false)
  
  // State for top tickets by machine chart
  const [selectedMachineForTop, setSelectedMachineForTop] = useState('')
  const [topTicketsByMachine, setTopTicketsByMachine] = useState([])
  const [loadingTopTickets, setLoadingTopTickets] = useState(false)

  // State for analysis tab
  const [maquinas, setMaquinas] = useState([])
  const [selectedMaquina, setSelectedMaquina] = useState('')
  const [topTiempos, setTopTiempos] = useState([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (lineas.length > 0) {
      loadStats()
    }
  }, [selectedLinea, dateRange, customStartDate, customEndDate, lineas.length])

  useEffect(() => {
    // Cargar la lista de máquinas
    getEquipos().then(setMaquinas).catch(console.error);
  }, []);

  useEffect(() => {
    // Cargar el TOP de tiempos perdidos
    getTopTiempos(selectedMaquina).then(setTopTiempos).catch(console.error);
  }, [selectedMaquina]);

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
    if (!Array.isArray(statsLinea)) return [];
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
    if (!Array.isArray(clasificacion)) return [];
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
    if (!Array.isArray(statsEquipos)) return [];
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
    if (!Array.isArray(statsAtencion)) return [];
    return statsAtencion.slice(0, 15).map((item, idx) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      'Tiempo Promedio': Math.round(item.promedio_minutos || 0),
      'Total Tickets': item.total_tickets
    }))
  }

  const prepareEquiposFallasData = () => {
    if (!Array.isArray(statsEquiposFallas)) return [];
    return statsEquiposFallas.slice(0, 10).map(item => ({
      name: item.equipo.length > 30 ? item.equipo.substring(0, 30) + '...' : item.equipo,
      fullName: item.equipo,
      'Total Fallas': item.total_fallas
    }))
  }

  // Handle click on equipment bar chart - using activePayload from chart click
  const handleBarChartClick = async (chartData) => {
    if (!chartData || !chartData.activePayload || chartData.activePayload.length === 0) return
    
    const payload = chartData.activePayload[0].payload
    const equipmentName = payload?.fullName || payload?.name
    
    if (!equipmentName) return
    
    openDrillDown(equipmentName, false)
  }

  // Handle click for general equipment chart (all lines)
  const handleGeneralBarChartClick = async (chartData) => {
    if (!chartData || !chartData.activePayload || chartData.activePayload.length === 0) return
    
    const payload = chartData.activePayload[0].payload
    const equipmentName = payload?.fullName || payload?.name
    
    if (!equipmentName) return
    
    openDrillDown(equipmentName, true)
  }

  // Open drill-down modal with equipment tickets
  const openDrillDown = async (equipmentName, isGeneral = false) => {
    if (!equipmentName) return
    
    setSelectedEquipment(equipmentName)
    setShowDrillDown(true)
    setLoadingDrillDown(true)
    
    try {
      const params = { equipo: equipmentName }
      
      if (!isGeneral && selectedLinea !== 'all') {
        params.linea = selectedLinea
      }
      
      if (!isGeneral && dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      } else {
        params.days = isGeneral ? 30 : dateRange
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

  // Open top 5 modal for machines with more failures bar chart
  const openTop5Modal = async (machineName) => {
    if (!machineName) return
    
    setSelectedMachine(machineName)
    setShowTop5Modal(true)
    setLoadingTop5(true)
    
    try {
      const params = { equipo: machineName, limit: 5 }
      
      // Respect the current filters (line and date range)
      if (selectedLinea !== 'all') {
        params.linea = selectedLinea
      }
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      } else {
        params.days = dateRange
      }
      
      const tickets = await getTopTicketsByEquipment(params)
      setTop5Tickets(tickets)
    } catch (error) {
      console.error('Error loading top 5 tickets:', error)
      setTop5Tickets([])
    } finally {
      setLoadingTop5(false)
    }
  }

  // Load top tickets when machine selector changes
  const loadTopTicketsByMachine = async (machineName) => {
    if (!machineName) {
      setTopTicketsByMachine([])
      return
    }
    
    setLoadingTopTickets(true)
    
    try {
      const params = { equipo: machineName, limit: 5 }
      
      if (selectedLinea !== 'all') {
        params.linea = selectedLinea
      }
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      } else {
        params.days = dateRange
      }
      
      const tickets = await getTopTicketsByEquipment(params)
      setTopTicketsByMachine(tickets)
    } catch (error) {
      console.error('Error loading top tickets by machine:', error)
      setTopTicketsByMachine([])
    } finally {
      setLoadingTopTickets(false)
    }
  }

  // Handle machine selector change
  const handleMachineSelectChange = (machineName) => {
    setSelectedMachineForTop(machineName)
    loadTopTicketsByMachine(machineName)
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
            <p className="text-slate-400 text-xs mb-3">🖱️ Haz clic en una barra para ver los Top 5 tickets con más tiempo</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={prepareEquiposData()} 
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const equipo = data.activePayload[0].payload.fullName
                    if (equipo) openTop5Modal(equipo)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
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
                <Bar dataKey="Fallas" fill="#ef4444" cursor="pointer" />
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
            <p className="text-slate-400 text-xs mb-3">🖱️ Haz clic en una barra para ver los Top 5 tickets con más tiempo</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={prepareEquiposFallasData()} 
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const equipo = data.activePayload[0].payload.fullName
                    if (equipo) openTop5Modal(equipo)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
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
                <Bar dataKey="Total Fallas" fill="#ef4444" cursor="pointer" />
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

        {/* Top 5 Tickets por Máquina - New Chart Section */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Top 5 Tickets con Más Tiempo por Máquina</h2>
              <p className="text-slate-400 text-xs mt-1">Selecciona una máquina para ver los tickets con mayor duración</p>
            </div>
            <div className="w-full sm:w-64">
              <select
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedMachineForTop}
                onChange={(e) => handleMachineSelectChange(e.target.value)}
              >
                <option value="">-- Seleccionar máquina --</option>
                {statsEquiposFallas.map((equipo, idx) => (
                  <option key={idx} value={equipo.equipo}>{equipo.equipo} ({equipo.total_fallas} fallas)</option>
                ))}
              </select>
            </div>
          </div>

          {loadingTopTickets ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-400 mb-4"></div>
              <p className="text-slate-300">Cargando tickets...</p>
            </div>
          ) : selectedMachineForTop && topTicketsByMachine.length > 0 ? (
            <div className="space-y-3">
              {topTicketsByMachine.map((ticket, idx) => (
                <div 
                  key={ticket.id} 
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${idx === 0 ? 'bg-red-600 text-white' : 
                          idx === 1 ? 'bg-orange-600 text-white' : 
                          idx === 2 ? 'bg-amber-600 text-white' : 
                          'bg-slate-600 text-slate-200'}
                      `}>
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-blue-300 font-medium">Ticket #{ticket.id}</span>
                        <span className="text-slate-500 text-xs ml-2">Línea {ticket.linea}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-amber-300">{ticket.duracion_minutos || 0}</span>
                      <span className="text-amber-400 text-sm ml-1">min</span>
                    </div>
                  </div>
                  
                  <p className="text-slate-200 text-sm mb-2">{ticket.descr}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span><span className="text-slate-500">Modelo:</span> {ticket.modelo}</span>
                    <span><span className="text-slate-500">Clasificación:</span> {ticket.clasificacion || 'N/A'}</span>
                    <span><span className="text-slate-500">Piezas:</span> <span className="text-rose-300">{ticket.piezas || 0}</span></span>
                    <span><span className="text-slate-500">Fecha:</span> {ticket.hc ? new Date(ticket.hc).toLocaleDateString('es-MX') : 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedMachineForTop ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500">No hay tickets para esta máquina en el período seleccionado</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              <p className="text-slate-500">Selecciona una máquina del selector para ver los tickets con más tiempo</p>
            </div>
          )}
        </div>

        {/* Análisis de Tiempos - Nueva Sección */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Análisis de Tiempos - TOP de Tiempos Perdidos
          </h2>
          
          {/* Selector de máquina */}
          <div className="mb-6">
            <label htmlFor="maquina" className="block text-sm font-medium text-slate-300 mb-2">
              Filtrar por Máquina:
            </label>
            <select
              id="maquina"
              value={selectedMaquina}
              onChange={(e) => setSelectedMaquina(e.target.value)}
              className="w-full sm:w-64 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Todas las Máquinas</option>
              {maquinas.map((maquina) => (
                <option key={maquina} value={maquina}>{maquina}</option>
              ))}
            </select>
          </div>

          {/* Tabla de resultados */}
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Máquina
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Causa/Clasificación
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Tiempo Total (min)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Total Tickets
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {topTiempos && topTiempos.length > 0 ? (
                  topTiempos.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                        {item.maquina || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {item.causa || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-400">
                        {item.tiempo_total || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {item.total_tickets || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-slate-400">
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No hay datos disponibles</p>
                        <p className="text-sm text-slate-500 mt-1">Verifica que existan tickets cerrados en la base de datos</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Gráfica de barras para visualizar tiempos perdidos */}
          {topTiempos && topTiempos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-slate-200 mb-4">Visualización - Tiempo Total por Causa</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTiempos.slice(0, 10).map(item => ({
                      name: `${(item.maquina || '').substring(0, 15)}${item.maquina?.length > 15 ? '...' : ''} - ${(item.causa || 'N/A').substring(0, 15)}${item.causa?.length > 15 ? '...' : ''}`,
                      fullName: `${item.maquina} - ${item.causa}`,
                      'Tiempo (min)': Number(item.tiempo_total) || 0,
                      'Tickets': Number(item.total_tickets) || 0
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      width={180}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="Tiempo (min)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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

      {/* Top 5 Modal for Machines with More Failures */}
      {showTop5Modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowTop5Modal(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-900/60 to-slate-900 border-b border-slate-700 p-4 sm:p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Top 5 Tickets con Más Tiempo
                </h2>
                <p className="text-slate-400 text-sm">
                  <span className="font-medium text-red-300">{selectedMachine}</span>
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {selectedLinea !== 'all' ? `Línea ${selectedLinea} • ` : ''}
                  {dateRange === 'custom' 
                    ? `${customStartDate} - ${customEndDate}` 
                    : `Últimos ${dateRange} días`}
                </p>
              </div>
              <button 
                onClick={() => setShowTop5Modal(false)} 
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-3 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {loadingTop5 ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-red-400 mb-4"></div>
                  <p className="text-slate-300 text-lg font-medium">Cargando tickets...</p>
                </div>
              ) : top5Tickets && top5Tickets.length > 0 ? (
                <div className="space-y-4">
                  {top5Tickets.map((ticket, idx) => (
                    <div 
                      key={ticket.id} 
                      className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg
                            ${idx === 0 ? 'bg-red-600 text-white' : 
                              idx === 1 ? 'bg-orange-600 text-white' : 
                              idx === 2 ? 'bg-amber-600 text-white' : 
                              'bg-slate-600 text-slate-200'}
                          `}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-blue-300 font-medium">Ticket #{ticket.id}</span>
                            <p className="text-slate-400 text-xs">Línea {ticket.linea}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-amber-300">{ticket.duracion_minutos || 0}</span>
                          <span className="text-amber-400 text-sm ml-1">min</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-slate-200 font-medium">{ticket.descr}</p>
                        {ticket.solucion && (
                          <p className="text-slate-400 text-sm mt-1">
                            <span className="text-emerald-400">Solución:</span> {ticket.solucion}
                          </p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs block">Modelo</span>
                          <span className="text-slate-300">{ticket.modelo}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs block">Clasificación</span>
                          <span className="text-slate-300">{ticket.clasificacion || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs block">Piezas Perdidas</span>
                          <span className="text-rose-300 font-medium">{ticket.piezas || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs block">Fecha Cierre</span>
                          <span className="text-slate-300">
                            {ticket.hc ? new Date(ticket.hc).toLocaleDateString('es-MX') : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-600 flex justify-between text-xs text-slate-400">
                        <span>Reportado: {ticket.nombre}</span>
                        <span>Técnico: {ticket.tecnico || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-500 text-lg">No hay tickets disponibles para esta máquina</p>
                  <p className="text-slate-600 text-sm mt-1">en el período seleccionado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
