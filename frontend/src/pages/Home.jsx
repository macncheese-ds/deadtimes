import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  listTickets, 
  createTicket, 
  getLineas, 
  getDescripciones, 
  getEquipos, 
  getModelos, 
  getStatsAtencion, 
  getStatsEquipos, 
  login,
  getStatsLinea,
  getStatsEquiposDetalle,
  getStatsTendencia,
  getStatsClasificacion,
  getStatsTotales
} from '../api_deadtimes'
import LoginModal from '../components/LoginModal'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Home() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lineas, setLineas] = useState([])
  const [descripciones, setDescripciones] = useState([])
  const [descripcionesLoading, setDescripcionesLoading] = useState(false)
  const [equipos, setEquipos] = useState([])
  const [modelos, setModelos] = useState([])  // Modelos filtrados por línea
  const [modelosLoading, setModelosLoading] = useState(false)
  const [selectedModelo, setSelectedModelo] = useState(null)  // Modelo completo con producto, rate, lado
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [statsAtencion, setStatsAtencion] = useState([])
  const [statsEquipos, setStatsEquipos] = useState([])
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  // Filtros para tickets abiertos
  const [filterOpenLinea, setFilterOpenLinea] = useState('')
  // Filtros para tickets cerrados
  const [filterClosedLinea, setFilterClosedLinea] = useState('')
  const [filterClosedEquipo, setFilterClosedEquipo] = useState('')
  const [filterClosedDescr, setFilterClosedDescr] = useState('')
  const [filterClosedTicketId, setFilterClosedTicketId] = useState('')
  const [filterClosedStartDate, setFilterClosedStartDate] = useState('')
  const [filterClosedEndDate, setFilterClosedEndDate] = useState('')
  // Sorting state for closed tickets
  const [sortClosedBy, setSortClosedBy] = useState('date') // 'date', 'duration_asc', 'duration_desc'
  // Form - ya NO incluye campo 'lado' ni 'producto' (lado está en el nombre del modelo)
  const [form, setForm] = useState({
    descr: '', descr_otros: '', modelo: '', linea: '', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', rate: ''
  })
  
  // Estados para Analytics
  const [selectedLinea, setSelectedLinea] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [totales, setTotales] = useState({})
  const [statsLinea, setStatsLinea] = useState([])
  const [statsEquiposDetalle, setStatsEquiposDetalle] = useState([])
  const [tendencia, setTendencia] = useState([])
  const [clasificacion, setClasificacion] = useState([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showAnalytics && lineas.length > 0) {
      loadAnalyticsStats()
    }
  }, [showAnalytics, selectedLinea, dateRange, customStartDate, customEndDate, lineas.length])

  async function loadInitialData() {
    setInitialLoading(true)
    try {
      // Cargar todo en paralelo (modelos NO se cargan aquí - se cargan al seleccionar línea)
      setDescripcionesLoading(true)
      const [lineasData, descripcionesData, equiposData, statsAtencionData, statsEquiposData] = await Promise.all([
        getLineas(),
        getDescripciones(),
        getEquipos(),
        getStatsAtencion(),
        getStatsEquipos()
      ])
      
      setLineas(lineasData)
      setDescripciones(descripcionesData)
      setEquipos(equiposData)
      // Modelos NO se setean aquí - se cargan dinámicamente al seleccionar línea
      setStatsAtencion(statsAtencionData)
      setStatsEquipos(statsEquiposData)
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
    } finally {
      setInitialLoading(false)
      setDescripcionesLoading(false)
    }
  }

  // Cargar modelos filtrados por línea seleccionada
  async function loadModelosByLinea(linea) {
    if (!linea) {
      setModelos([])
      return
    }
    try {
      setModelosLoading(true)
      const data = await getModelos(linea)
      setModelos(data)
    } catch (error) {
      console.error('Error cargando modelos por línea:', error)
      setModelos([])
    } finally {
      setModelosLoading(false)
    }
  }

  // Handler cuando se selecciona una línea - carga modelos de esa línea
  async function handleLineaChange(e) {
    const lineaValue = e.target.value
    // Resetear modelo y rate al cambiar línea
    setForm(prev => ({ 
      ...prev, 
      linea: lineaValue, 
      modelo: '', 
      rate: '' 
    }))
    setSelectedModelo(null)
    // Cargar modelos de la línea seleccionada
    await loadModelosByLinea(lineaValue)
  }

  // Handler cuando se selecciona un modelo - auto-rellena rate
  function handleModeloChange(e) {
    const modeloValue = e.target.value
    // Buscar el modelo en la lista cargada para obtener su rate
    const modeloData = modelos.find(m => m.modelo === modeloValue)
    if (modeloData) {
      setSelectedModelo(modeloData)
      // Auto-rellenar rate desde la tabla modelos
      setForm(prev => ({
        ...prev,
        modelo: modeloValue,
        rate: modeloData.rate ? String(modeloData.rate) : ''
      }))
    } else {
      setSelectedModelo(null)
      setForm(prev => ({
        ...prev,
        modelo: modeloValue,
        rate: ''
      }))
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

  async function loadDescripciones() {
    try {
      const data = await getDescripciones()
      setDescripciones(data)
    } catch (error) {
      console.error('Error cargando descripciones:', error)
    }
  }

  async function loadEquipos() {
    try {
      const data = await getEquipos()
      setEquipos(data)
    } catch (error) {
      console.error('Error cargando equipos:', error)
    }
  }

  async function loadModelos(linea = null) {
    // Función legacy - ahora usa loadModelosByLinea
    try {
      const data = await getModelos(linea)
      setModelos(data)
    } catch (error) {
      console.error('Error cargando modelos:', error)
    }
  }

  async function handleEquipoChange(e) {
    const val = e.target.value
    // Si el equipo no es NXT, resetear todas las montadoras a false
    const isNXT = val === 'NXT'
    const resetMods = isNXT ? {} : { Montadora1: false, Montadora2: false, Montadora3: false, Montadora4: false, Montadora5: false, Montadora6: false, Montadora7: false, Montadora8: false, Montadora9: false, Montadora10: false, Montadora11: false, Montadora12: false }
    setForm(prev => ({ ...prev, equipo: val, descr: '', mods: isNXT ? prev.mods : resetMods }))
    try {
      setDescripcionesLoading(true)
      const data = await getDescripciones(val || undefined)
      setDescripciones(data)
    } catch (error) {
      console.error('Error cargando descripciones por equipo:', error)
    }
    finally {
      setDescripcionesLoading(false)
    }
  }

  async function loadStats() {
    try {
      const [atencion, equiposFallas] = await Promise.all([
        getStatsAtencion(),
        getStatsEquipos()
      ])
      setStatsAtencion(atencion)
      setStatsEquipos(equiposFallas)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  async function loadAnalyticsStats() {
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
      setStatsEquiposDetalle(equiposData)
      setTendencia(tendenciaData)
      setClasificacion(clasificacionData)
      setStatsAtencion(atencionData)
      setStatsEquipos(equiposFallasData)
    } catch (error) {
      console.error('Error cargando estadísticas de analytics:', error)
    } finally {
      setRefreshing(false)
    }
  }

  async function loadTickets(statusToLoad = status) {
    setLoading(true)
    try {
      const data = await listTickets(statusToLoad)
      setTickets(data)
    } catch (error) {
      console.error('Error cargando tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    setShowCredentialsModal(true)
  }

  async function handleCredentialsConfirm({ employee_input, password }) {
    setCredentialsBusy(true)
    try {
      const data = await login(employee_input, password)
      
      // REGLA DE NEGOCIO: Validar que el usuario pueda crear tickets
      if (!data.user.puedeCrear) {
        throw new Error('No tienes permisos para crear tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Líder, Soporte, Mantenimiento.')
      }
      
      const turno = getTurno()
      // Si la descripción es "Otros", usar el valor de descr_otros
      const descripcionFinal = form.descr === '__OTROS__' ? form.descr_otros : form.descr
      
      // Si el equipo no es NXT, asegurar que todas las montadoras sean false (0)
      const modsToSend = form.equipo === 'NXT' ? form.mods : {
        Montadora1: false, Montadora2: false, Montadora3: false, Montadora4: false,
        Montadora5: false, Montadora6: false, Montadora7: false, Montadora8: false,
        Montadora9: false, Montadora10: false, Montadora11: false, Montadora12: false
      }
      
      await createTicket({ 
        ...form, 
        descr: descripcionFinal,
        mods: modsToSend,
        turno, 
        nombre: data.user.nombre, 
        num_empleado: data.user.num_empleado 
      })
      
      // Resetear form incluyendo producto y rate; limpiar modelos cargados
      setForm({ descr: '', descr_otros: '', modelo: '', linea: '', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', lado: '', producto: '', rate: '' })
      setSelectedModelo(null)
      setModelos([])
      setShowNew(false)
      setShowCredentialsModal(false)
      
      // Mostrar mensaje de éxito
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
      
      // Si está mostrando tickets abiertos, recargar la lista
      if (showOpen) {
        loadTickets()
      }
    } catch (error) {
      console.error('Error:', error)
      throw error
    } finally {
      setCredentialsBusy(false)
    }
  }

  function getTurno() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return 'Matutino'
    if (hour >= 14 && hour < 22) return 'Vespertino'
    return 'Nocturno'
  }

  // Funciones para Analytics
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

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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

  const prepareEquiposDetalleData = () => {
    if (!Array.isArray(statsEquiposDetalle)) return [];
    return statsEquiposDetalle
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
    return statsAtencion.slice(0, 15).map((item) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      'Tiempo Promedio': Math.round(item.promedio_minutos || 0),
      'Total Tickets': item.total_tickets
    }))
  }

  const prepareEquiposFallasData = () => {
    if (!Array.isArray(statsEquipos)) return [];
    return statsEquipos.slice(0, 10).map(item => ({
      name: item.equipo,
      fullName: item.equipo,
      'Total Fallas': item.total_fallas
    }))
  }

  // Filtrar tickets abiertos por línea
  const getFilteredOpenTickets = () => {
    if (!filterOpenLinea) return tickets
    return tickets.filter(t => String(t.linea) === String(filterOpenLinea))
  }

  // Filtrar tickets cerrados por múltiples criterios
  const getFilteredClosedTickets = () => {
    let filtered = tickets.filter(t => {
      // Filtro por ID de ticket
      if (filterClosedTicketId && !String(t.id).includes(filterClosedTicketId.replace('#', ''))) return false
      // Filtro por línea
      if (filterClosedLinea && String(t.linea) !== String(filterClosedLinea)) return false
      // Filtro por equipo (búsqueda parcial)
      if (filterClosedEquipo && !t.equipo?.toLowerCase().includes(filterClosedEquipo.toLowerCase())) return false
      // Filtro por descripción (búsqueda parcial)
      if (filterClosedDescr && !t.descr?.toLowerCase().includes(filterClosedDescr.toLowerCase())) return false
      // Filtro por rango de fechas
      if (filterClosedStartDate && t.hc) {
        const ticketDate = new Date(t.hc).setHours(0, 0, 0, 0)
        const startDate = new Date(filterClosedStartDate).setHours(0, 0, 0, 0)
        if (ticketDate < startDate) return false
      }
      if (filterClosedEndDate && t.hc) {
        const ticketDate = new Date(t.hc).setHours(23, 59, 59, 999)
        const endDate = new Date(filterClosedEndDate).setHours(23, 59, 59, 999)
        if (ticketDate > endDate) return false
      }
      return true
    })

    // Apply sorting
    if (sortClosedBy === 'duration_asc') {
      filtered.sort((a, b) => {
        const durA = calcularMinutos(a.hr, a.hc) || 0
        const durB = calcularMinutos(b.hr, b.hc) || 0
        return durA - durB
      })
    } else if (sortClosedBy === 'duration_desc') {
      filtered.sort((a, b) => {
        const durA = calcularMinutos(a.hr, a.hc) || 0
        const durB = calcularMinutos(b.hr, b.hc) || 0
        return durB - durA
      })
    } else {
      // Default: sort by close date (most recent first)
      filtered.sort((a, b) => {
        const dateA = a.hc ? new Date(a.hc).getTime() : 0
        const dateB = b.hc ? new Date(b.hc).getTime() : 0
        return dateB - dateA
      })
    }

    return filtered
  }

  // Helper para calcular minutos entre dos fechas
  function calcularMinutos(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return null
    const diffMs = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()
    return Math.max(0, Math.round(diffMs / 60000))
  }

  // Export closed tickets to Excel
  const exportClosedTicketsToExcel = () => {
    const ticketsToExport = getFilteredClosedTickets()
    if (!ticketsToExport || ticketsToExport.length === 0) return
    
    const data = ticketsToExport.map((ticket, idx) => ({
      '#': idx + 1,
      'ID Ticket': ticket.id,
      'Descripción': ticket.descr,
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Equipo': ticket.equipo,
      'Clasificación': ticket.clasificacion,
      'Duración (min)': calcularMinutos(ticket.hr, ticket.hc) || 0,
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
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets Cerrados')
    
    const fileName = `Tickets_Cerrados_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Reset filtros al cambiar de vista
  const resetFilters = () => {
    setFilterOpenLinea('')
    setFilterClosedLinea('')
    setFilterClosedEquipo('')
    setFilterClosedDescr('')
    setFilterClosedStartDate('')
    setFilterClosedEndDate('')
  }

  const CustomYAxisTick = ({ x, y, payload }) => {
    const text = payload.value
    
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
          {text}
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

  function toggleNew() {
    setShowNew(!showNew)
    setShowOpen(false)
    setShowClosed(false)
    setShowAnalytics(false)
    resetFilters()
  }

  function toggleOpen() {
    if (!showOpen) {
      setStatus('open')
      loadTickets('open')
      resetFilters()
    }
    setShowOpen(!showOpen)
    setShowNew(false)
    setShowClosed(false)
    setShowAnalytics(false)
  }

  function toggleClosed() {
    if (!showClosed) {
      setStatus('closed')
      loadTickets('closed')
      resetFilters()
    }
    setShowClosed(!showClosed)
    setShowNew(false)
    setShowOpen(false)
    setShowAnalytics(false)
  }

  function toggleAnalytics() {
    setShowAnalytics(!showAnalytics)
    setShowNew(false)
    setShowOpen(false)
    setShowClosed(false)
    resetFilters()
  }

  const inputClass = (value) => `border p-3 rounded-lg text-sm transition-all ${value ? 'bg-emerald-900/30 border-emerald-600/50 text-slate-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-slate-400 mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div>
        <div className="bg-slate-800 border-l-4 border-slate-600 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-semibold text-slate-100">Downtime Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Sistema de gestión de tiempos muertos</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button onClick={toggleNew} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showNew ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-emerald-900/20 hover:border-emerald-700/30'}`}>
            + Nuevo Ticket
          </button>
          <button onClick={toggleOpen} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showOpen ? 'bg-amber-900/40 border-amber-700/50 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-amber-900/20 hover:border-amber-700/30'}`}>
            Tickets Abiertos
          </button>
          <button onClick={toggleClosed} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showClosed ? 'bg-blue-900/40 border-blue-700/50 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-900/20 hover:border-blue-700/30'}`}>
            Tickets Cerrados
          </button>
          <button onClick={toggleAnalytics} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showAnalytics ? 'bg-purple-900/40 border-purple-700/50 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-purple-900/20 hover:border-purple-700/30'}`}>
            Analytics
          </button>
          <button onClick={() => navigate('/machine-analysis')} className="font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base bg-slate-800 border-slate-700 text-slate-300 hover:bg-orange-900/20 hover:border-orange-700/30">
            Análisis Máquinas
          </button>
        </div>

        {!showNew && !showOpen && !showClosed && !showAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-1">Tiempos de Atención</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">Promedio últimos 30 días</p>
              <div className="space-y-2 sm:space-y-3">
                {Array.isArray(statsAtencion) && statsAtencion.slice(0, 10).map((stat, idx) => {
                  const maxMinutes = Math.max(...statsAtencion.map(s => s.promedio_minutos), 1)
                  const widthPercent = (stat.promedio_minutos / maxMinutes) * 100
                  return (
                    <div key={idx} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-slate-500 text-xs sm:text-sm w-5 sm:w-6 font-bold">{idx + 1}.</span>
                      <span className="text-slate-400 text-xs sm:text-sm w-14 sm:w-20 font-medium">{new Date(stat.fecha).toLocaleDateString('es', {month: 'short', day: 'numeric'})}</span>
                      <div className="w-32 sm:w-40 bg-slate-700 rounded-lg h-6 sm:h-8 relative overflow-hidden">
                        <div className="bg-blue-600/60 h-full rounded-lg flex items-center justify-center transition-all duration-500" style={{ width: `${widthPercent}%` }}>
                          <span className="text-slate-100 text-xs font-semibold">{Math.round(stat.promedio_minutos)}</span>
                        </div>
                      </div>
                      <span className="text-slate-400 font-semibold text-xs sm:text-sm w-14 text-right">{Math.round(stat.promedio_minutos)} min</span>
                    </div>
                  )
                })}
                {statsAtencion.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">No hay datos disponibles</p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">Los datos aparecerán cuando se cierren tickets</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-1">Equipos con Más Fallas</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">Top 10 últimos 30 días</p>
              <div className="space-y-2 sm:space-y-3">
                {statsEquipos.map((stat, idx) => {
                  const maxFallas = statsEquipos[0]?.total_fallas || 1
                  const widthPercent = (stat.total_fallas / maxFallas) * 100
                  return (
                    <div key={idx} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-slate-500 text-xs sm:text-sm w-5 sm:w-6 font-bold">{idx + 1}.</span>
                      <span className="text-slate-300 text-xs sm:text-sm font-medium flex-1 truncate">{stat.equipo}</span>
                      <div className="w-32 sm:w-40 bg-slate-700 rounded-lg h-6 sm:h-8 relative overflow-hidden">
                        <div className="bg-rose-600/60 h-full rounded-lg flex items-center justify-center transition-all duration-500" style={{ width: `${widthPercent}%` }}>
                          <span className="text-slate-100 text-xs font-semibold">{stat.total_fallas}</span>
                        </div>
                      </div>
                      <span className="text-slate-400 font-semibold text-xs sm:text-sm w-12 text-right">{stat.total_fallas}</span>
                    </div>
                  )
                })}
                {statsEquipos.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">No hay datos disponibles</p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">Los datos aparecerán cuando se cierren tickets</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showNew && (
          <div className="bg-slate-800 rounded-lg shadow-lg border-l-4 border-slate-600 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Crear Nuevo Ticket</h2>
              <button onClick={toggleNew} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={submit} className="space-y-6">
              {/* Sección 1: Línea y Modelo - Al seleccionar línea se cargan modelos, al seleccionar modelo se auto-rellena lado/producto/rate */}
              <div className="border border-slate-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">1. Información de Línea y Modelo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Select de línea - al cambiar carga modelos filtrados */}
                  <select className={inputClass(form.linea)} value={form.linea} onChange={handleLineaChange} required>
                    <option value="">Seleccionar Línea *</option>
                    {lineas.map(lin => <option key={lin.id} value={lin.linea}>Línea {lin.linea}</option>)}
                  </select>

                  {/* Select de modelo - filtrado por línea, al seleccionar auto-rellena lado/producto/rate */}
                  <select className={inputClass(form.modelo)} value={form.modelo} onChange={handleModeloChange} required disabled={!form.linea || modelosLoading}>
                    {modelosLoading ? (
                      <option value="">Cargando modelos...</option>
                    ) : (
                      <>
                        <option value="">Seleccionar Modelo *</option>
                        {modelos.map(mod => (
                          <option key={mod.id} value={mod.modelo}>
                            {mod.modelo}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                
                {/* Mostrar rate auto-rellenado del modelo seleccionado */}
                {selectedModelo && (
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-2">Rate del modelo (auto-rellenado desde base de datos)</p>
                    <div className="text-sm">
                      <span className="text-slate-500">Rate:</span>
                      <span className="ml-2 text-blue-400 font-medium">{selectedModelo.rate || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 2: Equipo y Descripción - Desbloqueado cuando modelo está seleccionado */}
              <div className={`border rounded-lg p-4 transition-all ${form.linea && form.modelo ? 'border-slate-600' : 'border-slate-700 opacity-50'}`}>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">2. Información del Equipo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.equipo)} value={form.equipo} onChange={handleEquipoChange} required disabled={!form.linea || !form.modelo}>
                    <option value="">Seleccionar Equipo *</option>
                    {equipos.map(eq => <option key={eq.id} value={eq.equipo}>{eq.equipo}</option>)}
                  </select>

                  <select className={inputClass(form.descr)} value={form.descr} onChange={e => setForm({...form, descr: e.target.value, descr_otros: ''})} required disabled={!form.equipo}>
                    {descripcionesLoading ? (
                      <option value="">Cargando descripciones...</option>
                    ) : (
                      <>
                        <option value="">Seleccionar Descripción *</option>
                        {descripciones.map(desc => <option key={desc.id} value={desc.descripcion}>{desc.descripcion}</option>)}
                        <option value="__OTROS__">Otros (especificar)</option>
                      </>
                    )}
                  </select>

                  {form.descr === '__OTROS__' && (
                    <input 
                      className={inputClass(form.descr_otros)} 
                      placeholder="Especificar descripción de la falla *" 
                      value={form.descr_otros} 
                      onChange={e => setForm({...form, descr_otros: e.target.value})} 
                      required 
                      disabled={!form.equipo}
                    />
                  )}
                </div>
              </div>

              {/* Sección 3: Condiciones de Paro - Desbloqueado cuando Sección 2 está completa */}
              <div className={`border rounded-lg p-4 transition-all ${form.equipo && form.descr && (form.descr !== '__OTROS__' || form.descr_otros) ? 'border-slate-600' : 'border-slate-700 opacity-50'}`}>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">3. Condiciones de Paro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.pf)} value={form.pf} onChange={e => setForm({...form, pf: e.target.value})} required disabled={!form.equipo || !form.descr || (form.descr === '__OTROS__' && !form.descr_otros)}>
                    <option value="">Sección afectada *</option>
                    <option value="Equipo">Equipo</option>
                    <option value="Linea">Línea</option>
                  </select>

                  <select className={inputClass(form.pa)} value={form.pa} onChange={e => setForm({...form, pa: e.target.value})} required disabled={!form.equipo || !form.descr}>
                    <option value="">Condición de Paro *</option>
                    <option value="Intermitente">Intermitente</option>
                    <option value="Total">Total</option>
                  </select>
                </div>
              </div>

              {/* Sección 4: Clasificación - Desbloqueado cuando Sección 3 está completa */}
              <div className={`border rounded-lg p-4 transition-all ${form.pf && form.pa ? 'border-slate-600' : 'border-slate-700 opacity-50'}`}>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">4. Clasificación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.clasificacion)} value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})} required disabled={!form.pf || !form.pa}>
                    <option value="">Seleccionar Clasificación *</option>
                    {['Equipo','Facilidades','Operacion','Procesos','Calidad','Materiales','Sistemas(IT)','Produccion','Otros'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {form.clasificacion === 'Otros' && (
                    <input className={inputClass(form.clas_others)} placeholder="Especificar *" value={form.clas_others} onChange={e => setForm({...form, clas_others: e.target.value})} required />
                  )}
                </div>
              </div>

              {/* Sección 5: Montadoras - Solo habilitado cuando el equipo es NXT */}
              <div className={`border rounded-lg p-4 transition-all ${form.equipo === 'NXT' && form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others) ? 'border-slate-600' : 'border-slate-700 opacity-50'}`}>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">5. Montadoras Afectadas {form.equipo === 'NXT' ? '(Selecciona al menos una)' : '(Solo para equipo NXT)'}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <label key={i} className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${form.mods[`Montadora${i}`] ? 'bg-emerald-900/30 border-emerald-600/50' : 'bg-slate-800 border-slate-600 hover:border-slate-500'} ${form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others)) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="checkbox" className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-emerald-500" checked={form.mods[`Montadora${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`Montadora${i}`]: e.target.checked}})} disabled={form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others))} />
                      <span className="text-slate-300 text-xs sm:text-sm font-medium">M{i}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 font-medium py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg transition-colors border border-emerald-600/50 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!form.linea || !form.modelo || !form.equipo || !form.descr || (form.descr === '__OTROS__' && !form.descr_otros) || !form.pf || !form.pa || !form.clasificacion || (form.clasificacion === 'Otros' && !form.clas_others) || (form.equipo === 'NXT' && !Object.values(form.mods).some(m => m === true))}
              >
                Crear Ticket
              </button>
            </form>
          </div>
        )}

        {showOpen && (
          <div className="bg-slate-800 rounded-lg shadow-lg border-l-4 border-slate-600 p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Tickets Abiertos</h2>
              <button onClick={toggleOpen} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>
            
            {/* Filtro por Línea para tickets abiertos */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <label className="block text-slate-300 text-xs font-medium mb-2">Filtrar por Línea</label>
              <select 
                className="w-full sm:w-48 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                value={filterOpenLinea}
                onChange={e => setFilterOpenLinea(e.target.value)}
              >
                <option value="">Todas las líneas</option>
                {lineas.map(linea => (
                  <option key={linea.id} value={linea.linea}>Línea {linea.linea}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-700 border-t-slate-400"></div>
                <p className="text-slate-400 mt-4 text-sm sm:text-base">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {getFilteredOpenTickets().map(t => (
                  <div key={t.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-650 transition-all border-l-4 border-slate-500">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-100 font-semibold text-sm sm:text-base">#{t.id} - {t.descr}</h3>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1">Línea {t.linea} • {t.modelo} • {t.equipo}</p>
                        <p className="text-slate-400 text-xs mt-1">{t.nombre} • {new Date(t.hr).toLocaleString('es', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                      </div>
                      <button onClick={() => window.location.href = `/handle/${t.id}`} className="bg-amber-700/60 hover:bg-amber-600/70 text-amber-100 font-medium py-2 px-4 rounded-lg whitespace-nowrap transition-colors border border-amber-600/50 text-sm w-full sm:w-auto">
                        Manejar
                      </button>
                    </div>
                  </div>
                ))}
                {getFilteredOpenTickets().length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">{filterOpenLinea ? 'No hay tickets abiertos para esta línea' : 'No hay tickets abiertos'}</p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">{filterOpenLinea ? 'Intenta con otra línea' : 'Excelente trabajo'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showClosed && (
          <div className="bg-slate-800 rounded-lg shadow-lg border-l-4 border-slate-600 p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Tickets Cerrados</h2>
              <button onClick={toggleClosed} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>
            
            {/* Filtros multicriterio para tickets cerrados */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-300 text-xs font-medium">Filtros</span>
                <button 
                  onClick={() => {
                    setFilterClosedTicketId('')
                    setFilterClosedLinea('')
                    setFilterClosedEquipo('')
                    setFilterClosedDescr('')
                    setFilterClosedStartDate('')
                    setFilterClosedEndDate('')
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Limpiar filtros
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Filtro por ID de Ticket */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">ID Ticket</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    placeholder="#123"
                    value={filterClosedTicketId}
                    onChange={e => setFilterClosedTicketId(e.target.value)}
                  />
                </div>
                
                {/* Filtro por Línea */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Línea</label>
                  <select 
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={filterClosedLinea}
                    onChange={e => setFilterClosedLinea(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {lineas.map(linea => (
                      <option key={linea.id} value={linea.linea}>Línea {linea.linea}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por Equipo */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Equipo</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    placeholder="Buscar equipo..."
                    value={filterClosedEquipo}
                    onChange={e => setFilterClosedEquipo(e.target.value)}
                  />
                </div>
                
                {/* Filtro por Descripción */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Descripción</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    placeholder="Buscar descripción..."
                    value={filterClosedDescr}
                    onChange={e => setFilterClosedDescr(e.target.value)}
                  />
                </div>
                
                {/* Filtro por Fecha Inicio */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Desde</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={filterClosedStartDate}
                    onChange={e => setFilterClosedStartDate(e.target.value)}
                  />
                </div>
                
                {/* Filtro por Fecha Fin */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Hasta</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={filterClosedEndDate}
                    onChange={e => setFilterClosedEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Sorting and Export Controls */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-slate-400 text-xs font-medium">Ordenar por:</label>
                  <select 
                    className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={sortClosedBy}
                    onChange={e => setSortClosedBy(e.target.value)}
                  >
                    <option value="date">Fecha de Cierre (Reciente)</option>
                    <option value="duration_desc">Duración (Mayor a Menor)</option>
                    <option value="duration_asc">Duración (Menor a Mayor)</option>
                  </select>
                </div>
                
                <button
                  onClick={exportClosedTicketsToExcel}
                  disabled={getFilteredClosedTickets().length === 0}
                  className="bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-600/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>
              </div>
              
              {/* Mostrar cantidad de resultados filtrados */}
              {(filterClosedTicketId || filterClosedLinea || filterClosedEquipo || filterClosedDescr || filterClosedStartDate || filterClosedEndDate) && (
                <div className="mt-3 text-xs text-slate-400">
                  Mostrando {getFilteredClosedTickets().length} de {tickets.length} tickets
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-700 border-t-slate-400"></div>
                <p className="text-slate-400 mt-4 text-sm sm:text-base">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {getFilteredClosedTickets().map(t => {
                  const duracion = calcularMinutos(t.hr, t.hc)
                  return (
                    <div key={t.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-650 transition-all border-l-4 border-slate-500">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-100 font-semibold text-sm sm:text-base">#{t.id} - {t.descr}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm mt-1">Línea {t.linea} • {t.modelo} • {t.equipo}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Cerrado: {new Date(t.hc).toLocaleString('es', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} • {t.tecnico}
                          </p>
                          {duracion !== null && (
                            <p className="text-amber-300 text-xs mt-1 font-medium">
                              Duración: {duracion} minutos
                            </p>
                          )}
                        </div>
                        <button onClick={() => window.location.href = `/view/${t.id}`} className="bg-blue-700/60 hover:bg-blue-600/70 text-blue-100 font-medium py-2 px-4 rounded-lg whitespace-nowrap transition-colors border border-blue-600/50 text-sm w-full sm:w-auto">
                          Ver
                        </button>
                      </div>
                    </div>
                  )
                })}
                {getFilteredClosedTickets().length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">
                      {(filterClosedTicketId || filterClosedLinea || filterClosedEquipo || filterClosedDescr || filterClosedStartDate || filterClosedEndDate) 
                        ? 'No hay tickets que coincidan con los filtros' 
                        : 'No hay tickets cerrados'}
                    </p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">
                      {(filterClosedTicketId || filterClosedLinea || filterClosedEquipo || filterClosedDescr || filterClosedStartDate || filterClosedEndDate)
                        ? 'Intenta con otros criterios de búsqueda'
                        : 'Los tickets cerrados aparecerán aquí'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showAnalytics && (
          <div className="space-y-4 sm:space-y-6">
            {/* Header de Analytics */}
            <div className="bg-slate-800 rounded-lg shadow-lg border-l-4 border-purple-600 p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Analytics Dashboard</h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Estadísticas y análisis de downtime
                    {selectedLinea !== 'all' && (
                      <span className="ml-2 px-2 py-1 bg-purple-900/40 text-purple-300 rounded text-xs font-medium">
                        Línea {selectedLinea}
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={toggleAnalytics} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Filtros</h2>
                {refreshing && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-600 border-t-slate-400"></div>
                    <span>Actualizando...</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-2">Línea</label>
                  <select 
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={selectedLinea}
                    onChange={e => setSelectedLinea(e.target.value)}
                  >
                    <option value="all">Todas las líneas</option>
                    {lineas.map(linea => (
                      <option key={linea.id} value={linea.linea}>Línea {linea.linea}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-2">Período</label>
                  <select 
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
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

                {dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Desde</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Hasta</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4 shadow-lg">
                <p className="text-blue-300 text-xs font-medium">
                  Total Tickets {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-2xl font-bold text-blue-100 mt-1">{totales.total_tickets || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/50 rounded-lg p-4 shadow-lg">
                <p className="text-emerald-300 text-xs font-medium">
                  Cerrados {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-2xl font-bold text-emerald-100 mt-1">{totales.cerrados || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/50 rounded-lg p-4 shadow-lg">
                <p className="text-amber-300 text-xs font-medium">
                  Abiertos {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-2xl font-bold text-amber-100 mt-1">{totales.abiertos || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-lg p-4 shadow-lg">
                <p className="text-purple-300 text-xs font-medium">
                  Tiempo Prom {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                </p>
                <p className="text-2xl font-bold text-purple-100 mt-1">{Math.round(totales.promedio_minutos_global || 0)}<span className="text-sm ml-1">min</span></p>
              </div>
            </div>

            {/* Gráficas principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Gráfica de tickets por línea */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-4">
                  {selectedLinea !== 'all' ? `Tickets Línea ${selectedLinea}` : 'Tickets por Línea'}
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={prepareLineaData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Total Tickets" fill="#3b82f6" />
                    <Bar dataKey="Cerrados" fill="#10b981" />
                    <Bar dataKey="Abiertos" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de tendencia en el tiempo */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-4">
                  {selectedLinea !== 'all' ? `Tendencia Línea ${selectedLinea}` : 'Tendencia de Tickets'}
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={prepareTendenciaData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="cerrados" stroke="#10b981" strokeWidth={2} name="Cerrados" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de clasificación */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-4">
                  {selectedLinea !== 'all' ? `Clasificación Línea ${selectedLinea}` : 'Tickets por Clasificación'}
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={prepareClasificacionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
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
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => (
                        <span className="text-slate-300 text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de equipos con más fallas */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 xl:col-span-3">
                <h2 className="text-base font-semibold text-slate-100 mb-4">
                  {selectedLinea !== 'all' ? `Top 10 Equipos Línea ${selectedLinea}` : 'Top 10 Equipos con Más Fallas'}
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={prepareEquiposDetalleData()} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      width={200}
                      tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Fallas" cursor="pointer">
                      {prepareEquiposDetalleData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráficas adicionales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-2">Tiempos de Atención por Día</h2>
                <p className="text-slate-400 text-xs mb-4">Últimos 30 días</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareAtencionData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Tiempo Promedio" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-2">Equipos con Más Fallas (General)</h2>
                <p className="text-slate-400 text-xs mb-4">Top 10 últimos 30 días</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={prepareEquiposFallasData()} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      width={200}
                      tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Total Fallas" cursor="pointer">
                      {prepareEquiposFallasData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <LoginModal visible={showCredentialsModal} onClose={() => setShowCredentialsModal(false)} onConfirm={handleCredentialsConfirm} busy={credentialsBusy} />
      
      {/* Mensaje de éxito */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 bg-emerald-800/90 text-emerald-100 px-4 sm:px-5 py-3 rounded-lg shadow-xl z-50 border border-emerald-600/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm sm:text-base">Ticket creado exitosamente</span>
          </div>
        </div>
      )}
    </div>
  )
}
