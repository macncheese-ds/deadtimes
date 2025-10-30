import React, { useEffect, useState } from 'react'
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Home() {
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
  const [equipos, setEquipos] = useState([])
  const [modelos, setModelos] = useState([])
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [statsAtencion, setStatsAtencion] = useState([])
  const [statsEquipos, setStatsEquipos] = useState([])
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [form, setForm] = useState({
    descr: '', modelo: '', linea: '', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: '', lado: 'TOP'
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
      // Cargar todo en paralelo
      const [lineasData, descripcionesData, equiposData, modelosData, statsAtencionData, statsEquiposData] = await Promise.all([
        getLineas(),
        getDescripciones(),
        getEquipos(),
        getModelos(),
        getStatsAtencion(),
        getStatsEquipos()
      ])
      
      setLineas(lineasData)
      setDescripciones(descripcionesData)
      setEquipos(equiposData)
      setModelos(modelosData)
      setStatsAtencion(statsAtencionData)
      setStatsEquipos(statsEquiposData)
      
      // Establecer primera línea por defecto
      if (lineasData.length > 0) {
        setForm(prev => ({ ...prev, linea: lineasData[0].linea }))
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  async function loadLineas() {
    try {
      const data = await getLineas()
      setLineas(data)
      if (data.length > 0 && !form.linea) {
        setForm(prev => ({ ...prev, linea: data[0].linea }))
      }
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

  async function loadModelos() {
    try {
      const data = await getModelos()
      setModelos(data)
    } catch (error) {
      console.error('Error cargando modelos:', error)
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
      
      const turno = getTurno()
      await createTicket({ 
        ...form, 
        turno, 
        nombre: data.user.nombre, 
        num_empleado: data.user.num_empleado 
      })
      
      setForm({ descr: '', modelo: '', linea: lineas[0]?.linea || '', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: '', lado: 'TOP' })
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
    return statsAtencion.slice(0, 15).map((item) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      'Tiempo Promedio': Math.round(item.promedio_minutos || 0),
      'Total Tickets': item.total_tickets
    }))
  }

  const prepareEquiposFallasData = () => {
    return statsEquipos.slice(0, 10).map(item => ({
      name: item.equipo.length > 30 ? item.equipo.substring(0, 30) + '...' : item.equipo,
      fullName: item.equipo,
      'Total Fallas': item.total_fallas
    }))
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

  function toggleNew() {
    setShowNew(!showNew)
    setShowOpen(false)
    setShowClosed(false)
    setShowAnalytics(false)
  }

  function toggleOpen() {
    if (!showOpen) {
      setStatus('open')
      loadTickets('open')
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
          <h1 className="text-xl sm:text-3xl font-semibold text-slate-100">Deadtimes Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Sistema de gestión de tiempos muertos</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
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
        </div>

        {!showNew && !showOpen && !showClosed && !showAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-1">Tiempos de Atención</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">Promedio últimos 30 días</p>
              <div className="space-y-2 sm:space-y-3">
                {statsAtencion.slice(0, 10).map((stat, idx) => {
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
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <select className={inputClass(form.linea)} value={form.linea} onChange={e => setForm({...form, linea: e.target.value})} required>
                <option value="">Línea *</option>
                {lineas.map(lin => <option key={lin.id} value={lin.linea}>Línea {lin.linea}</option>)}
              </select>

              <select className={inputClass(form.modelo)} value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} required>
                <option value="">Modelo *</option>
                {modelos.map(mod => <option key={mod.id} value={mod.modelo}>{mod.modelo}</option>)}
              </select>

              <select className={inputClass(form.lado)} value={form.lado} onChange={e => setForm({...form, lado: e.target.value})} required>
                <option value="TOP">TOP</option>
                <option value="BOT">BOT</option>
              </select>

              <select className={inputClass(form.equipo)} value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})} required>
                <option value="">Equipo *</option>
                {equipos.map(eq => <option key={eq.id} value={eq.equipo}>{eq.equipo}</option>)}
              </select>

              <select className={inputClass(form.descr)} value={form.descr} onChange={e => setForm({...form, descr: e.target.value})} required>
                <option value="">Descripción *</option>
                {descripciones.map(desc => <option key={desc.id} value={desc.descripcion}>{desc.descripcion}</option>)}
              </select>

              <select className={inputClass(form.pf)} value={form.pf} onChange={e => setForm({...form, pf: e.target.value})} required>
                <option value="">Sección afectada *</option>
                <option value="Equipo">Equipo</option>
                <option value="Linea">Línea</option>
              </select>

              <select className={inputClass(form.pa)} value={form.pa} onChange={e => setForm({...form, pa: e.target.value})} required>
                <option value="">Condición de Paro *</option>
                <option value="Intermitente">Intermitente</option>
                <option value="Total">Total</option>
              </select>

              <select className={inputClass(form.clasificacion)} value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})} required>
                <option value="">Clasificación *</option>
                {['Equipo','Facilidades','Operacion','Procesos','Calidad','Materiales','Sistemas(IT)','Otros'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {form.clasificacion === 'Otros' && (
                <input className={inputClass(form.clas_others)} placeholder="Especificar *" value={form.clas_others} onChange={e => setForm({...form, clas_others: e.target.value})} required />
              )}

              <select className={inputClass(form.priority)} value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} required>
                <option value="">Prioridad *</option>
                <option value="Se da prioridad al equipo">Prioridad al equipo</option>
                <option value="Se da prioridad a otro equipo">Prioridad a otro</option>
              </select>

              <div className="col-span-1 md:col-span-2">
                <label className="block mb-2 sm:mb-3 text-slate-300 font-medium text-sm sm:text-base">Montadoras aplicables *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <label key={i} className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${form.mods[`Montadora${i}`] ? 'bg-emerald-900/30 border-emerald-600/50' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                      <input type="checkbox" className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-emerald-500" checked={form.mods[`Montadora${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`Montadora${i}`]: e.target.checked}})} />
                      <span className="text-slate-300 text-xs sm:text-sm font-medium">M{i}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="md:col-span-2 bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 font-medium py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg transition-colors border border-emerald-600/50 text-sm sm:text-base">
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
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-700 border-t-slate-400"></div>
                <p className="text-slate-400 mt-4 text-sm sm:text-base">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {tickets.map(t => (
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
                {tickets.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">No hay tickets abiertos</p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">Excelente trabajo</p>
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
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-700 border-t-slate-400"></div>
                <p className="text-slate-400 mt-4 text-sm sm:text-base">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {tickets.map(t => (
                  <div key={t.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-650 transition-all border-l-4 border-slate-500">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-100 font-semibold text-sm sm:text-base">#{t.id} - {t.descr}</h3>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1">Línea {t.linea} • {t.modelo} • {t.equipo}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          Cerrado: {new Date(t.hc).toLocaleString('es', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} • {t.tecnico}
                        </p>
                      </div>
                      <button onClick={() => window.location.href = `/view/${t.id}`} className="bg-blue-700/60 hover:bg-blue-600/70 text-blue-100 font-medium py-2 px-4 rounded-lg whitespace-nowrap transition-colors border border-blue-600/50 text-sm w-full sm:w-auto">
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-500 text-sm sm:text-base">No hay tickets cerrados</p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">Los tickets cerrados aparecerán aquí</p>
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
                    Estadísticas y análisis de deadtimes
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={prepareEquiposDetalleData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      width={150} 
                      tick={<CustomYAxisTick />}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Fallas" fill="#ef4444" />
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareEquiposFallasData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      width={150}
                      tick={<CustomYAxisTick />}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Total Fallas" fill="#ef4444" />
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
