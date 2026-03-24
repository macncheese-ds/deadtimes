import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  getStatsTotales,
  getTicket,
  startTicket,
  finishTicket,
  getTicketsByEquipment,
  getEstado,
  setMantenimiento,
  setCambioModelo,
  setAuditoria,
  getMttrMtbf
} from '../api_deadtimes'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { getDowntimeAnalytics } from '../api_produccion'
import LoginModal from '../components/LoginModal'
import ProduccionSection from '../components/ProduccionSection'
import Configuration from './Configuration'
import DisplayVisualization from '../components/DisplayVisualization'
import LanguageSwitcher from '../components/LanguageSwitcher'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0284c7']

// Helper para formatear fecha/hora
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper para convertir minutos a horas con 2 decimales
function minutosAHoras(minutos) {
  if (!minutos && minutos !== 0) return 0;
  return Math.round((minutos / 60) * 100) / 100;
}

// Helper para convertir minutos a formato H:MM h (e.g. 90 → "1:30 h")
function formatMinutes(mins) {
  if (mins === null || mins === undefined) return 'N/A';
  const total = Math.round(Number(mins));
  if (isNaN(total)) return 'N/A';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}:${String(m).padStart(2, '0')} h`;
}

// Helper para formatear datetime-local (preserva hora local)
function formatToDatetimeLocal(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper para formatear horas decimales → H:MM h (ej: 1.5 → "1:30 h", 0.78 → "46m")
function formatHoras(horas) {
  if (horas === null || horas === undefined) return '0m';
  const totalMins = Math.round(Number(horas) * 60);
  if (isNaN(totalMins)) return '0m';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}:${String(m).padStart(2, '0')} h`;
}

export default function Home() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showProduccion, setShowProduccion] = useState(false)
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [showDisplay, setShowDisplay] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [displayLineaSelected, setDisplayLineaSelected] = useState('')
  const [mantenimientoActivo, setMantenimientoActivo] = useState({})
  const [cambioModeloActivo, setCambioModeloActivo] = useState({})
  const [auditoriaActivo, setAuditoriaActivo] = useState({})
  const [showMantenimiento, setShowMantenimiento] = useState(false)
  const [showCambioModelo, setShowCambioModelo] = useState(false)
  const [showAuditoria, setShowAuditoria] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lineas, setLineas] = useState([])
  const [descripciones, setDescripciones] = useState([])
  const [descripcionesLoading, setDescripcionesLoading] = useState(false)
  const [equipos, setEquipos] = useState([])
  const [modelos, setModelos] = useState([])
  const [modelosLoading, setModelosLoading] = useState(false)
  const [selectedModelo, setSelectedModelo] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [currentCredentials, setCurrentCredentials] = useState(null)
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
  const [sortClosedBy, setSortClosedBy] = useState('date')
  // Pagination state for closed tickets
  const [closedPage, setClosedPage] = useState(1)
  const [closedTotal, setClosedTotal] = useState(0)
  const [closedTotalPages, setClosedTotalPages] = useState(0)
  const closedSearchTimer = useRef(null)
  // Form
  const [form, setForm] = useState({
    descr: '', descr_otros: '', modelo: '', linea: '', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', rate: ''
  })

  // Estados para Analytics
  const [selectedLinea, setSelectedLinea] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Normaliza valores de input datetime-local ("YYYY-MM-DDTHH:MM")
  function normalizeDateTimeInput(val) {
    if (!val) return val
    if (val.includes('T')) return val.replace('T', ' ') + ':00'
    if (val.length === 10) return val + ' 00:00:00'
    return val
  }

  // Estados para Handle/View Ticket Modal
  const [showHandleModal, setShowHandleModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [handleForm, setHandleForm] = useState({ solucion: '' })

  // Estados para Edit Ticket Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState(false)
  const [editCredentialsNeeded, setEditCredentialsNeeded] = useState(false)
  const [handleCredentialsModal, setHandleCredentialsModal] = useState(false)
  const [handleCredentialsBusy, setHandleCredentialsBusy] = useState(false)

  // Estados para Análisis de Máquinas (integrado en Analytics)
  const [analyticsTab, setAnalyticsTab] = useState('general') // 'general' | 'maquinas' | 'horas' | 'mttr'
  const [machineEquipo, setMachineEquipo] = useState('')
  const [machineLinea, setMachineLinea] = useState('')
  const [machineTickets, setMachineTickets] = useState([])

  // Estados para Análisis por Horas
  const [hourlyData, setHourlyData] = useState([])
  const [hourlyLoading, setHourlyLoading] = useState(false)
  const [machineLoading, setMachineLoading] = useState(false)
  const [machineDetailTicket, setMachineDetailTicket] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  // Special export state
  const [specialExportLoading, setSpecialExportLoading] = useState(false)
  const [specialExportProgress, setSpecialExportProgress] = useState('')
  const [showSpecialExportModal, setShowSpecialExportModal] = useState(false)
  const [totales, setTotales] = useState({})
  const [statsLinea, setStatsLinea] = useState([])
  const [statsEquiposDetalle, setStatsEquiposDetalle] = useState([])
  const [tendencia, setTendencia] = useState([])
  const [clasificacion, setClasificacion] = useState([])
  const [inactivityWarning, setInactivityWarning] = useState(false)

  // Estados para MTTR/MTBF
  const [mttrMtbfData, setMttrMtbfData] = useState([])
  const [mttrMachines, setMttrMachines] = useState([])
  const [selectedMttrMachine, setSelectedMttrMachine] = useState('')
  const [mttrPeriod, setMttrPeriod] = useState('weekly')
  const [mttrLoading, setMttrLoading] = useState(false)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0) // 0 = current week, -1 = previous, etc.
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0) // 0 = current month, -1 = previous, etc.
  const [currentYearOffset, setCurrentYearOffset] = useState(0) // 0 = current year, -1 = previous, etc.

  // Estados para Downtime Analytics tab
  const [downtimeLinea, setDowntimeLinea] = useState('')
  const [downtimeFecha, setDowntimeFecha] = useState(new Date().toISOString().slice(0, 10))
  const [downtimeData, setDowntimeData] = useState(null)
  const [downtimeLoading, setDowntimeLoading] = useState(false)
  const [downtimeExpandedRow, setDowntimeExpandedRow] = useState(null)

  // Hook para detectar inactividad y cerrar sesión después de 2 minutos
  useInactivityTimeout(() => {
    // Logout: limpiar credenciales y cerrar sesiones
    localStorage.removeItem('token')
    setCurrentCredentials(null)
    setShowConfiguration(false)
    setInactivityWarning(true)
    // Mostrar el aviso por 5 segundos
    setTimeout(() => setInactivityWarning(false), 5000)
  }, 2)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [])

  // Poll tickets every 10s when the "open" tickets view is visible
  useEffect(() => {
    let iv
    if (showOpen) {
      // carga inmediata y luego polling cada 10s
      loadTickets('open')
      iv = setInterval(() => loadTickets('open'), 10000)
    }
    return () => {
      if (iv) clearInterval(iv)
    }
  }, [showOpen])

  useEffect(() => {
    if (showAnalytics && lineas.length > 0) {
      loadAnalyticsStats()
    }
  }, [showAnalytics, selectedLinea, dateRange, customStartDate, customEndDate, lineas.length])

  useEffect(() => {
    // Load MTTR/MTBF data when tab is active
    if (showAnalytics && analyticsTab === 'mttr') {
      loadMttrMtbfData();
    }
  }, [showAnalytics, analyticsTab, mttrPeriod, selectedMttrMachine, currentWeekOffset, currentMonthOffset, currentYearOffset, customStartDate, customEndDate]);

  // Load machines list for MTTR filter
  useEffect(() => {
    if (showAnalytics && analyticsTab === 'mttr' && mttrMachines.length === 0) {
      getMttrMtbf({ period: 'weekly' }).then(data => {
        const machines = [...new Set(data.map(d => d.machine))].sort();
        setMttrMachines(machines);
      }).catch(console.error);
    }
  }, [showAnalytics, analyticsTab]);

  // Load downtime analytics when tab is active and filters are set
  useEffect(() => {
    if (showAnalytics && analyticsTab === 'downtime' && downtimeLinea && downtimeFecha) {
      loadDowntimeAnalytics()
    }
  }, [showAnalytics, analyticsTab, downtimeLinea, downtimeFecha])

  // Poll mantenimiento and cambio_modelo state every 3 seconds
  useEffect(() => {
    let iv
    const pollMaintenance = async () => {
      try {
        if (lineas.length === 0) return

        const mantenimientoMap = {}
        const cambioModeloMap = {}
        const auditoriaMap = {}

        // Check each line's mantenimiento, cambio_modelo and auditoria status
        for (const linea of lineas) {
          const estado = await getEstado(linea.linea)
          if (estado && estado.estado) {
            mantenimientoMap[linea.linea] = estado.estado.mantenimiento === 1
            cambioModeloMap[linea.linea] = estado.estado.cambio_modelo === 1
            auditoriaMap[linea.linea] = estado.estado.auditoria === 1
          }
        }

        // Update states
        setMantenimientoActivo(mantenimientoMap)
        setCambioModeloActivo(cambioModeloMap)
        setAuditoriaActivo(auditoriaMap)
      } catch (error) {
        console.error('Error polling maintenance state:', error)
      }
    }

    // Initial check and then every 3 seconds
    pollMaintenance()
    iv = setInterval(pollMaintenance, 3000)
    return () => {
      if (iv) clearInterval(iv)
    }
  }, [lineas])

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
        params.startDate = normalizeDateTimeInput(customStartDate)
        params.endDate = normalizeDateTimeInput(customEndDate)
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

  async function loadDowntimeAnalytics() {
    if (!downtimeLinea || !downtimeFecha) return
    setDowntimeLoading(true)
    setDowntimeExpandedRow(null)
    try {
      const result = await getDowntimeAnalytics(downtimeLinea, downtimeFecha)
      if (result.success) {
        setDowntimeData(result.data)
      }
    } catch (error) {
      console.error('Error cargando downtime analytics:', error)
    } finally {
      setDowntimeLoading(false)
    }
  }

  async function loadMttrMtbfData() {
    setMttrLoading(true)
    try {
      const params = { period: mttrPeriod }

      // Add machine filter if selected
      if (selectedMttrMachine) {
        params.machine = selectedMttrMachine
      }

      // Calculate date range based on period and offset
      if (mttrPeriod === 'weekly') {
        // Get Monday of the target week (using ISO weeks: Monday = 1, Sunday = 7)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Move to target week
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + (currentWeekOffset * 7))

        // Find Monday of that week (getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayOfWeek = targetDate.getDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday=6 days back, else (day-1)

        const mondayDate = new Date(targetDate)
        mondayDate.setDate(targetDate.getDate() - daysToSubtract)

        const sundayDate = new Date(mondayDate)
        sundayDate.setDate(mondayDate.getDate() + 6)

        params.startDate = mondayDate.toISOString().split('T')[0]
        params.endDate = sundayDate.toISOString().split('T')[0]

      } else if (mttrPeriod === 'monthly') {
        // Get first and last day of target month
        const today = new Date()
        const targetDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1)
        params.startDate = targetDate.toISOString().split('T')[0]

        const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
        params.endDate = lastDayOfMonth.toISOString().split('T')[0]

      } else if (mttrPeriod === 'annual') {
        // Get first and last day of target year
        const today = new Date()
        const targetYear = today.getFullYear() + currentYearOffset
        params.startDate = `${targetYear}-01-01`
        params.endDate = `${targetYear}-12-31`

      } else if (mttrPeriod === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate
        params.endDate = customEndDate
      }

      const data = await getMttrMtbf(params)
      setMttrMtbfData(data)
    } catch (error) {
      console.error('Error loading MTTR/MTBF data:', error)
      setMttrMtbfData([])
    } finally {
      setMttrLoading(false)
    }
  }
  function prepareMttrMtbfData() {
    if (!Array.isArray(mttrMtbfData) || mttrMtbfData.length === 0) return [];

    // Targets always weekly (data is always grouped by week)
    const targets = { mttr: 0.8, mtbf: 12 };

    // Group by week (period_key)
    const grouped = {}

    mttrMtbfData.forEach(item => {
      const weekKey = item.period_key;

      if (!grouped[weekKey]) {
        // Format week label as "DD/MM - DD/MM"
        const startDate = new Date(item.period_key + 'T00:00:00');
        const endDate = new Date(item.period_end_date + 'T00:00:00');

        const startStr = startDate.toLocaleDateString('es', { day: 'numeric', month: 'numeric' });
        const endStr = endDate.toLocaleDateString('es', { day: 'numeric', month: 'numeric', year: 'numeric' });

        grouped[weekKey] = {
          weekKey: weekKey,
          weekLabel: `${startStr} - ${endStr}`,
          startDate: item.period_key,
          endDate: item.period_end_date,
          equipment: []
        }
      }

      grouped[weekKey].equipment.push({
        name: item.machine,
        mttr: parseFloat(item.mttr) || 0,
        mtbf: parseFloat(item.mtbf) || 0,
        mttr_target: targets.mttr,
        mtbf_target: targets.mtbf,
        incidents: item.incident_count || 0,
        downtime: item.total_downtime || 0
      })
    })

    // Convert to array and sort by date
    return Object.values(grouped)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }

  // For WEEKLY view: X-axis = equipment names, one bar per machine
  function prepareWeeklyChartData() {
    const weeks = prepareMttrMtbfData();
    if (weeks.length === 0) return { mttr: [], mtbf: [], machines: [] };

    // Aggregate raw values across all weeks for each machine
    const machineData = {};
    const availableTimeWeekly = 132; // hours per week

    weeks.forEach(week => {
      week.equipment.forEach(eq => {
        if (!machineData[eq.name]) {
          machineData[eq.name] = {
            machine: eq.name,
            totalDowntime: 0,  // Sum of raw downtime hours
            totalIncidents: 0  // Sum of raw incident count
          };
        }
        machineData[eq.name].totalDowntime += eq.downtime || 0;
        machineData[eq.name].totalIncidents += eq.incidents || 0;
      });
    });

    const machines = Object.keys(machineData).sort();

    // Create chart data - calculate MTTR/MTBF from raw values
    // MTTR = Total downtime / Total events
    // MTBF = Available time / Total events
    const mttrData = machines.map(m => ({
      name: m,
      MTTR: machineData[m].totalIncidents > 0
        ? parseFloat((machineData[m].totalDowntime / machineData[m].totalIncidents).toFixed(2))
        : 0,
      Incidentes: machineData[m].totalIncidents
    }));

    const mtbfData = machines.map(m => ({
      name: m,
      MTBF: machineData[m].totalIncidents > 0
        ? parseFloat((availableTimeWeekly / machineData[m].totalIncidents).toFixed(2))
        : availableTimeWeekly
    }));

    return { mttr: mttrData, mtbf: mtbfData, machines };
  }

  // For MONTHLY view: X-axis = weeks within the month
  function prepareMonthlyChartData() {
    if (!mttrMtbfData || mttrMtbfData.length === 0) return { mttr: [], mtbf: [] };

    // For monthly period: aggregate raw values then calculate MTTR/MTBF
    // MTTR = Total downtime / Total events
    // MTBF = Available time (528h) / Total events
    if (mttrPeriod === 'monthly') {
      // Group by month - sum raw values across all machines
      const monthsMap = new Map();

      mttrMtbfData.forEach(item => {
        const monthKey = item.period_key.substring(0, 7); // YYYY-MM
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, { totalDowntime: 0, totalEvents: 0 });
        }
        const month = monthsMap.get(monthKey);
        month.totalDowntime += item.total_downtime || 0; // Sum raw downtime hours
        month.totalEvents += item.incident_count || 0;   // Sum raw event count
      });

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const availableTime = 528; // hours per month

      const mttrData = sortedMonths.map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        // MTTR = Total downtime / Total events
        const mttr = data.totalEvents > 0 ? data.totalDowntime / data.totalEvents : 0;
        return {
          week: `${monthName} ${year}`,
          'Promedio MTTR': parseFloat(mttr.toFixed(2))
        };
      });

      const mtbfData = sortedMonths.map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        // MTBF = Available time / Total events
        const mtbf = data.totalEvents > 0 ? availableTime / data.totalEvents : availableTime;
        return {
          week: `${monthName} ${year}`,
          'Promedio MTBF': parseFloat(mtbf.toFixed(2))
        };
      });

      return { mttr: mttrData, mtbf: mtbfData };
    }

    // For annual period: aggregate by week using raw values
    // Group by week, sum raw values, then calculate MTTR/MTBF
    const weeksMap = new Map();
    const availableTimeWeekly = 132; // hours per week

    mttrMtbfData.forEach(item => {
      const weekKey = item.period_key;
      if (!weeksMap.has(weekKey)) {
        const startDate = new Date(item.period_key + 'T00:00:00');
        const endDate = new Date(item.period_end_date + 'T00:00:00');
        const startStr = startDate.toLocaleDateString('es', { day: 'numeric', month: 'numeric' });
        const endStr = endDate.toLocaleDateString('es', { day: 'numeric', month: 'numeric', year: 'numeric' });

        weeksMap.set(weekKey, {
          weekLabel: `${startStr} - ${endStr}`,
          totalDowntime: 0,
          totalEvents: 0
        });
      }
      const week = weeksMap.get(weekKey);
      week.totalDowntime += item.total_downtime || 0;
      week.totalEvents += item.incident_count || 0;
    });

    const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const mttrData = sortedWeeks.map(([weekKey, data]) => {
      // MTTR = Total downtime / Total events
      const mttr = data.totalEvents > 0 ? data.totalDowntime / data.totalEvents : 0;
      return {
        week: data.weekLabel,
        'Promedio MTTR': parseFloat(mttr.toFixed(2))
      };
    });

    const mtbfData = sortedWeeks.map(([weekKey, data]) => {
      // MTBF = Available time / Total events
      const mtbf = data.totalEvents > 0 ? availableTimeWeekly / data.totalEvents : availableTimeWeekly;
      return {
        week: data.weekLabel,
        'Promedio MTBF': parseFloat(mtbf.toFixed(2))
      };
    });

    return { mttr: mttrData, mtbf: mtbfData };
  }

  async function loadTickets(statusToLoad = status, extraParams = {}) {
    setLoading(true)
    try {
      if (statusToLoad === 'closed') {
        // Server-side filtering/pagination for closed tickets
        const params = { ...extraParams }
        if (!params.page) params.page = closedPage
        if (filterClosedTicketId) params.ticketId = filterClosedTicketId
        if (filterClosedLinea) params.linea = filterClosedLinea
        if (filterClosedEquipo) params.equipo = filterClosedEquipo
        if (filterClosedDescr) params.descr = filterClosedDescr
        if (filterClosedStartDate) params.startDate = filterClosedStartDate
        if (filterClosedEndDate) params.endDate = filterClosedEndDate
        if (sortClosedBy) params.sortBy = sortClosedBy
        params.limit = 50

        const result = await listTickets('closed', params)
        setTickets(result.rows || [])
        setClosedTotal(result.total || 0)
        setClosedPage(result.page || 1)
        setClosedTotalPages(result.totalPages || 0)
      } else {
        const data = await listTickets(statusToLoad)
        // Marcar sólo tickets nuevos para animación suave
        setTickets(prev => {
          const prevMap = new Map((prev || []).map(p => [p.id, p]))
          const enhanced = data.map(item => ({ ...item, _isNew: !prevMap.has(item.id) }))
          const hasNew = enhanced.some(e => e._isNew)
          if (hasNew) {
            setTimeout(() => {
              setTickets(cur => (cur || []).map(t => {
                if (t._isNew) {
                  const copy = { ...t }
                  delete copy._isNew
                  return copy
                }
                return t
              }))
            }, 1500)
          }
          return enhanced
        })
      }
    } catch (error) {
      console.error('Error cargando tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search for closed tickets - triggers 400ms after last filter change
  const triggerClosedSearch = useCallback(() => {
    if (closedSearchTimer.current) clearTimeout(closedSearchTimer.current)
    closedSearchTimer.current = setTimeout(() => {
      loadTickets('closed', { page: 1 })
    }, 400)
  }, [filterClosedTicketId, filterClosedLinea, filterClosedEquipo, filterClosedDescr, filterClosedStartDate, filterClosedEndDate, sortClosedBy])

  // Re-trigger search when filters or sorting change (only when closed view is active)
  useEffect(() => {
    if (showClosed) {
      triggerClosedSearch()
    }
    return () => {
      if (closedSearchTimer.current) clearTimeout(closedSearchTimer.current)
    }
  }, [filterClosedTicketId, filterClosedLinea, filterClosedEquipo, filterClosedDescr, filterClosedStartDate, filterClosedEndDate, sortClosedBy])

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

      // Guardar credenciales para uso en modales
      setCurrentCredentials({
        num_empleado: data.user.num_empleado,
        nombre: data.user.nombre
      })

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
    if (hour >= 8 && hour < 20) return '1'
    return '2'
  }

  // ===== FUNCIONES PARA MODAL DE MANEJAR TICKET =====
  async function openHandleModal(ticketId) {
    setSelectedTicketId(ticketId)
    setTicketLoading(true)
    setShowHandleModal(true)
    setHandleForm({ solucion: '' })
    try {
      const data = await getTicket(ticketId)
      setSelectedTicket(data)
    } catch (error) {
      console.error('Error cargando ticket:', error)
    } finally {
      setTicketLoading(false)
    }
  }

  async function openViewModal(ticketId) {
    setSelectedTicketId(ticketId)
    setTicketLoading(true)
    setShowViewModal(true)
    try {
      const data = await getTicket(ticketId)
      setSelectedTicket(data)
    } catch (error) {
      console.error('Error cargando ticket:', error)
    } finally {
      setTicketLoading(false)
    }
  }

  function openEditModal() {
    if (!selectedTicket) return
    setEditError('')
    setEditSuccess(false)
    setEditForm({
      id: selectedTicket.id,
      descr: selectedTicket.descr || '',
      modelo: selectedTicket.modelo || '',
      equipo: selectedTicket.equipo || '',
      hr: formatToDatetimeLocal(selectedTicket.hr),
      hc: formatToDatetimeLocal(selectedTicket.hc),
      solucion: selectedTicket.solucion || ''
    })

    // Cargar modelos de la línea del ticket
    if (selectedTicket.linea) {
      setModelosLoading(true)
      getModelos(selectedTicket.linea)
        .then(data => {
          setModelos(data)
        })
        .catch(error => {
          console.error('Error cargando modelos:', error)
          setModelos([])
        })
        .finally(() => {
          setModelosLoading(false)
        })
    }

    setShowEditModal(true)
  }

  function closeHandleModal() {
    setShowHandleModal(false)
    setSelectedTicket(null)
    setSelectedTicketId(null)
    setHandleForm({ solucion: '' })
  }

  function closeViewModal() {
    setShowViewModal(false)
    setSelectedTicket(null)
    setSelectedTicketId(null)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setEditingTicketId(null)
    setEditForm(null)
    setEditError('')
    setEditSuccess(false)
  }

  function saveEditTicket() {
    if (!editForm || !editForm.id) return
    setEditCredentialsNeeded(true)
  }

  async function confirmEditWithCredentials({ employee_input, password }) {
    if (!editForm || !editForm.id) return

    setEditLoading(true)
    setEditError('')
    setEditSuccess(false)

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3107'
      const response = await fetch(`${baseURL}/api/deadtimes/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee': employee_input || '',
          'Authorization': `Basic ${btoa(`${employee_input}:${password}`)}`
        },
        body: JSON.stringify({
          descr: editForm.descr,
          modelo: editForm.modelo,
          equipo: editForm.equipo,
          hr: editForm.hr,
          hc: editForm.hc,
          solucion: editForm.solucion
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar el ticket')
      }

      setEditSuccess(true)
      setTimeout(() => {
        closeEditModal()
        loadTickets('closed')
        setEditCredentialsNeeded(false)
      }, 1500)
    } catch (error) {
      console.error('Error guardando ticket:', error)
      setEditError(error.message || 'Error al guardar los cambios')
    } finally {
      setEditLoading(false)
      setEditCredentialsNeeded(false)
    }
  }

  async function handleStartTicket() {
    setHandleCredentialsModal(true)
  }

  async function handleTicketCredentialsConfirm({ employee_input, password }) {
    setHandleCredentialsBusy(true)
    try {
      const data = await login(employee_input, password)
      if (!data.user.puedeAtender) {
        throw new Error('No tienes permisos para cerrar tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Soporte, Mantenimiento, Calidad.')
      }
      // Guardar credenciales
      setCurrentCredentials({
        num_empleado: data.user.num_empleado,
        nombre: data.user.nombre
      })
      await startTicket(selectedTicketId, data.user.nombre, data.user.num_empleado)
      setHandleCredentialsModal(false)
      // Recargar el ticket
      const updatedTicket = await getTicket(selectedTicketId)
      setSelectedTicket(updatedTicket)
    } catch (error) {
      console.error('Error:', error)
      throw error
    } finally {
      setHandleCredentialsBusy(false)
    }
  }

  async function handleFinishTicket() {
    if (!handleForm.solucion) {
      alert('Por favor ingresa la solución aplicada')
      return
    }
    if (!selectedTicket.rate) {
      alert('No se encontró el rate del modelo')
      return
    }
    try {
      await finishTicket(selectedTicketId, { solucion: handleForm.solucion, rate: Number(selectedTicket.rate) })
      closeHandleModal()
      // Recargar tickets abiertos si están visibles
      if (showOpen) {
        loadTickets('open')
      }
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    } catch (error) {
      console.error('Error al finalizar ticket:', error)
      alert('Error al finalizar el ticket')
    }
  }

  // ===== FUNCIONES PARA ANÁLISIS DE MÁQUINAS =====
  async function loadMachineTickets() {
    if (!machineEquipo) {
      setMachineTickets([])
      return
    }
    setMachineLoading(true)
    try {
      const params = { equipo: machineEquipo }
      if (machineLinea) params.linea = machineLinea
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = normalizeDateTimeInput(customStartDate)
        params.endDate = normalizeDateTimeInput(customEndDate)
      } else {
        params.days = dateRange
      }
      const data = await getTicketsByEquipment(params)
      const sortedData = data.sort((a, b) => (b.duracion_minutos || 0) - (a.duracion_minutos || 0))
      setMachineTickets(sortedData)
    } catch (error) {
      console.error('Error cargando tickets de máquina:', error)
      setMachineTickets([])
    } finally {
      setMachineLoading(false)
    }
  }

  useEffect(() => {
    if (showAnalytics && analyticsTab === 'maquinas' && machineEquipo) {
      loadMachineTickets()
    }
  }, [machineEquipo, machineLinea, dateRange, customStartDate, customEndDate, analyticsTab])

  const prepareMachineChartData = () => {
    return machineTickets.slice(0, 10).map((ticket) => ({
      name: `#${ticket.id}`,
      fullData: ticket,
      'Tiempo (hrs)': minutosAHoras(ticket.duracion_minutos || 0),
      'Piezas Perdidas': ticket.piezas || 0
    }))
  }

  const exportMachineToExcel = () => {
    if (!machineTickets || machineTickets.length === 0) return
    const data = machineTickets.map((ticket, idx) => ({
      '#': idx + 1,
      'ID Ticket': ticket.id,
      'Máquina': ticket.equipo,
      'Descripción': ticket.descr,
      'Clasificación': ticket.clasificacion || 'N/A',
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Duración (hrs)': minutosAHoras(ticket.duracion_minutos || 0),
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
    const nombreArchivo = machineEquipo === 'all' ? 'Todas_Maquinas' : machineEquipo === 'sin_otros' ? 'Sin_Otros' : machineEquipo
    const fileName = `Analisis_${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // ===== REPORTE DIARIO (special export) =====================================
  const specialExportDiario = async () => {
    setSpecialExportLoading(true)
    setSpecialExportProgress('Obteniendo tickets...')
    try {
      const params = { equipo: 'all' }
      if (machineLinea) params.linea = machineLinea
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = normalizeDateTimeInput(customStartDate)
        params.endDate   = normalizeDateTimeInput(customEndDate)
      } else {
        params.days = dateRange
      }

      const allTickets = await getTicketsByEquipment(params)
      if (!allTickets || allTickets.length === 0) {
        setSpecialExportProgress('No hay tickets para este período.')
        setTimeout(() => setShowSpecialExportModal(false), 2000)
        return
      }

      setSpecialExportProgress(`Procesando ${allTickets.length} tickets...`)

      // Group: day → linea → tickets[]
      const byDay = {}
      allTickets.forEach(t => {
        const ref    = t.hc || t.hr
        const day    = ref ? new Date(ref).toISOString().split('T')[0] : 'Sin-Fecha'
        const linKey = `Línea ${t.linea}`
        if (!byDay[day]) byDay[day] = {}
        if (!byDay[day][linKey]) byDay[day][linKey] = []
        byDay[day][linKey].push(t)
      })

      const days = Object.keys(byDay).sort()
      const wb   = XLSX.utils.book_new()

      const makeSheet = (rows, colWidths) => {
        const ws = XLSX.utils.aoa_to_sheet(rows)
        if (colWidths) ws['!cols'] = colWidths
        return ws
      }

      // Resumen sheet
      setSpecialExportProgress('Generando hoja Resumen...')
      const summaryRows = [
        [`REPORTE DIARIO DE TIEMPOS MUERTOS  •  Generado: ${new Date().toLocaleString('es-MX')}`],
        [`Período: ${days[0]} → ${days[days.length - 1]}   |   Línea${machineLinea ? ': ' + machineLinea : 'a: Todas'}`],
        [],
        ['Fecha', 'Línea', 'Tickets', 'Dur. Total (min)', 'Dur. Total (h)', 'Piezas Perdidas'],
      ]
      days.forEach(day => {
        Object.entries(byDay[day]).sort(([a], [b]) => a.localeCompare(b)).forEach(([linea, tks]) => {
          const totalMin    = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas = tks.reduce((s, t) => s + (t.piezas || 0), 0)
          summaryRows.push([day, linea, tks.length, totalMin, parseFloat((totalMin / 60).toFixed(2)), totalPiezas])
        })
      })
      XLSX.utils.book_append_sheet(wb, makeSheet(summaryRows, [
        { wch: 13 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      ]), 'Resumen')

      // One sheet per day
      for (let di = 0; di < days.length; di++) {
        const day = days[di]
        setSpecialExportProgress(`Hoja ${di + 1}/${days.length}: ${day}...`)

        const lineEntries = Object.entries(byDay[day]).sort(([a], [b]) => a.localeCompare(b))
        const rows = []
        rows.push([`REPORTE DEL DÍA: ${day}`])
        rows.push([])

        // Chart-data summary
        rows.push([`📊  DATOS PARA GRÁFICA POR LÍNEA`])
        rows.push(['Línea', 'Total Tickets', 'Dur. Total (min)', 'Dur. Total (h)', 'Piezas Perdidas'])
        lineEntries.forEach(([linea, tks]) => {
          const totalMin    = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas = tks.reduce((s, t) => s + (t.piezas || 0), 0)
          rows.push([linea, tks.length, totalMin, parseFloat((totalMin / 60).toFixed(2)), totalPiezas])
        })
        rows.push([])

        // Ticket detail per line
        rows.push([`📋  DETALLE DE TICKETS POR LÍNEA`])
        lineEntries.forEach(([linea, tks]) => {
          rows.push([])
          rows.push([`== ${linea.toUpperCase()} == (${tks.length} tickets)`])
          rows.push(['#', 'ID', 'Equipo', 'Descripción', 'Clasificación', 'Dur (min)', 'Dur (h)', 'Piezas', 'Técnico', 'Apertura', 'Cierre', 'Solución'])
          tks.forEach((t, i) => {
            rows.push([
              i + 1, t.id, t.equipo, t.descr, t.clasificacion || 'N/A',
              t.duracion_minutos || 0,
              parseFloat(((t.duracion_minutos || 0) / 60).toFixed(2)),
              t.piezas || 0, t.tecnico || 'N/A',
              t.hr ? new Date(t.hr).toLocaleString('es-MX') : '',
              t.hc ? new Date(t.hc).toLocaleString('es-MX') : '',
              t.solucion || '',
            ])
          })
          const totalMin    = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas = tks.reduce((s, t) => s + (t.piezas || 0), 0)
          rows.push(['', '', '', `TOTAL ${linea}`, '', totalMin, parseFloat((totalMin / 60).toFixed(2)), totalPiezas])
        })

        XLSX.utils.book_append_sheet(wb, makeSheet(rows, [
          { wch: 4 }, { wch: 7 }, { wch: 14 }, { wch: 32 }, { wch: 16 },
          { wch: 11 }, { wch: 10 }, { wch: 9 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 35 },
        ]), day)
      }

      setSpecialExportProgress('Guardando archivo...')
      const period = dateRange === 'custom'
        ? `${customStartDate?.slice(0, 10)}_${customEndDate?.slice(0, 10)}`
        : `ultimos${dateRange}dias`
      XLSX.writeFile(wb, `Reporte_Diario_${period}.xlsx`)

      setSpecialExportProgress('¡Listo! Descarga completada ✓')
      setTimeout(() => setShowSpecialExportModal(false), 2000)
    } catch (err) {
      console.error('Special export error:', err)
      setSpecialExportProgress(`Error: ${err.message}`)
    } finally {
      setSpecialExportLoading(false)
    }
  }
  // ============================================================================

  // Funciones para Analytics
  const prepareLineaData = () => {
    if (!Array.isArray(statsLinea)) return [];
    return statsLinea.map(item => ({
      name: `Línea ${item.linea}`,
      'Total Tickets': item.total_tickets,
      'Cerrados': item.cerrados,
      'Abiertos': item.abiertos,
      'Tiempo Prom (hrs)': minutosAHoras(item.promedio_minutos || 0)
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
        'Tiempo Prom (hrs)': minutosAHoras(item.promedio_minutos || 0),
        'Piezas Perdidas': item.total_piezas_perdidas || 0
      }))
  }

  const prepareAtencionData = () => {
    if (!Array.isArray(statsAtencion)) return [];
    return statsAtencion.slice(0, 15).map((item) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      'Tiempo Promedio (hrs)': minutosAHoras(item.promedio_minutos || 0),
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

  // Tickets cerrados - filtrado y paginado por el servidor
  const getFilteredClosedTickets = () => tickets

  // Helper para calcular minutos entre dos fechas
  function calcularMinutos(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return null
    const diffMs = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()
    return Math.max(0, Math.round(diffMs / 60000))
  }

  // Helper para calcular horas entre dos fechas
  function calcularHoras(fechaInicio, fechaFin) {
    const mins = calcularMinutos(fechaInicio, fechaFin)
    return mins !== null ? minutosAHoras(mins) : null
  }

  // Preparar datos para análisis por hora del día
  const prepareHourlyAnalysis = () => {
    // Usar tickets cerrados para el análisis
    const closedTickets = tickets.filter(t => t.hc)

    // Agrupar por hora del día (0-23)
    const hourlyStats = {}
    for (let h = 0; h < 24; h++) {
      hourlyStats[h] = { hora: h, totalTickets: 0, totalHoras: 0, piezasPerdidas: 0 }
    }

    closedTickets.forEach(ticket => {
      if (ticket.hr) {
        const hora = new Date(ticket.hr).getHours()
        hourlyStats[hora].totalTickets++
        const duracionHrs = calcularHoras(ticket.hr, ticket.hc) || 0
        hourlyStats[hora].totalHoras += duracionHrs
        hourlyStats[hora].piezasPerdidas += ticket.piezas || 0
      }
    })

    return Object.values(hourlyStats).map(stat => ({
      ...stat,
      horaLabel: `${stat.hora.toString().padStart(2, '0')}:00`,
      promedioHoras: stat.totalTickets > 0 ? Math.round((stat.totalHoras / stat.totalTickets) * 100) / 100 : 0
    }))
  }

  // Obtener horas críticas (más tickets)
  const getHorasCriticas = () => {
    const data = prepareHourlyAnalysis()
    return [...data].sort((a, b) => b.totalTickets - a.totalTickets).slice(0, 5)
  }

  // Obtener distribución por turno
  const getDistribucionTurnos = () => {
    const data = prepareHourlyAnalysis()
    const turno1 = data.filter(d => d.hora >= 8 && d.hora < 20) // 8am - 8pm
    const turno2 = data.filter(d => d.hora < 8 || d.hora >= 20) // 8pm - 8am

    return [
      { name: 'Turno 1 (8:00-20:00)', tickets: turno1.reduce((acc, d) => acc + d.totalTickets, 0), horas: Math.round(turno1.reduce((acc, d) => acc + d.totalHoras, 0) * 100) / 100 },
      { name: 'Turno 2 (20:00-8:00)', tickets: turno2.reduce((acc, d) => acc + d.totalTickets, 0), horas: Math.round(turno2.reduce((acc, d) => acc + d.totalHoras, 0) * 100) / 100 }
    ]
  }

  // Export closed tickets to Excel (current page)
  const exportClosedTicketsToExcel = () => {
    const ticketsToExport = tickets
    if (!ticketsToExport || ticketsToExport.length === 0) return

    const data = ticketsToExport.map((ticket, idx) => ({
      '#': (closedPage - 1) * 50 + idx + 1,
      'ID Ticket': ticket.id,
      'Descripción': ticket.descr,
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Equipo': ticket.equipo,
      'Clasificación': ticket.clasificacion,
      'Duración (hrs)': calcularHoras(ticket.hr, ticket.hc) || 0,
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

    const fileName = `Tickets_Cerrados_Pag${closedPage}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Reset filtros al cambiar de vista
  const resetFilters = () => {
    setFilterOpenLinea('')
    setFilterClosedLinea('')
    setFilterClosedEquipo('')
    setFilterClosedDescr('')
    setFilterClosedTicketId('')
    setFilterClosedStartDate('')
    setFilterClosedEndDate('')
    setClosedPage(1)
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
    if (showNew) {
      setShowNew(false)
    } else {
      setShowNew(true)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowToolsMenu(false)
    }
    resetFilters()
  }

  function toggleOpen() {
    if (showOpen) {
      setShowOpen(false)
    } else {
      setShowNew(false)
      setShowOpen(true)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowToolsMenu(false)
      setStatus('open')
      loadTickets('open')
    }
    resetFilters()
  }

  function toggleClosed() {
    if (showClosed) {
      setShowClosed(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(true)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowToolsMenu(false)
      setStatus('closed')
      loadTickets('closed', { page: 1 })
    }
    resetFilters()
  }

  function toggleAnalytics() {
    if (showAnalytics) {
      setShowAnalytics(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(true)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowToolsMenu(false)
    }
    resetFilters()
  }

  function toggleProduccion() {
    if (showProduccion) {
      setShowProduccion(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(true)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowToolsMenu(false)
    }
    resetFilters()
  }

  function toggleConfiguration() {
    if (showConfiguration) {
      setShowConfiguration(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(true)
      setShowDisplay(false)
      setShowToolsMenu(false)
      setShowMantenimiento(false)
      setShowCambioModelo(false)
      setShowAuditoria(false)
    }
    resetFilters()
  }

  function toggleMantenimiento() {
    if (showMantenimiento) {
      setShowMantenimiento(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowMantenimiento(true)
      setShowCambioModelo(false)
      setShowAuditoria(false)
    }
    resetFilters()
  }

  function toggleCambioModelo() {
    if (showCambioModelo) {
      setShowCambioModelo(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowMantenimiento(false)
      setShowCambioModelo(true)
      setShowAuditoria(false)
    }
    resetFilters()
  }

  function toggleAuditoria() {
    if (showAuditoria) {
      setShowAuditoria(false)
    } else {
      setShowNew(false)
      setShowOpen(false)
      setShowClosed(false)
      setShowAnalytics(false)
      setShowProduccion(false)
      setShowConfiguration(false)
      setShowDisplay(false)
      setShowMantenimiento(false)
      setShowCambioModelo(false)
      setShowAuditoria(true)
    }
    resetFilters()
  }

  // Handlers para manejar cambios de estado en BD
  async function handleMantenimientoToggle(linea, currentState) {
    try {
      const newState = !currentState;
      const response = await setMantenimiento(linea, newState);
      if (response.success) {
        // Actualizar estado local
        setMantenimientoActivo(prev => ({
          ...prev,
          [linea]: newState
        }));
      } else {
        console.error('Error actualizando mantenimiento:', response.error);
      }
    } catch (error) {
      console.error('Error en handleMantenimientoToggle:', error);
    }
  }

  async function handleCambioModeloToggle(linea, currentState) {
    try {
      const newState = !currentState;
      const response = await setCambioModelo(linea, newState);
      if (response.success) {
        // Actualizar estado local
        setCambioModeloActivo(prev => ({
          ...prev,
          [linea]: newState
        }));
      } else {
        console.error('Error actualizando cambio de modelo:', response.error);
      }
    } catch (error) {
      console.error('Error en handleCambioModeloToggle:', error);
    }
  }

  async function handleAuditoriaToggle(linea, currentState) {
    try {
      const newState = !currentState;
      const response = await setAuditoria(linea, newState);
      if (response.success) {
        // Actualizar estado local
        setAuditoriaActivo(prev => ({
          ...prev,
          [linea]: newState
        }));
      } else {
        console.error('Error actualizando auditoría:', response.error);
      }
    } catch (error) {
      console.error('Error en handleAuditoriaToggle:', error);
    }
  }

  const inputClass = (value) => `border p-3 rounded-lg text-sm transition-all ${value ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`

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
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4 lg:p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Inactivity Warning */}
        {inactivityWarning && (
          <div className="mb-4 p-4 bg-orange-900/30 border border-orange-600/50 text-orange-300 rounded-lg flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            <span>{t('configurationPage.inactivityWarning')}</span>
          </div>
        )}

        {/* Header */}
        <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-6 mb-4 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-700"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Downtime Manager</h1>
                  <p className="text-slate-400 text-sm sm:text-base mt-0.5">Sistema de gestión de tiempos muertos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                <span>Sistema Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <button onClick={toggleNew} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showNew ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
              <svg className={`w-6 h-6 transition-transform duration-300 ${showNew ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{t('nav.newTicket')}</span>
            </button>
            <button onClick={toggleOpen} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showOpen ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
              <svg className={`w-6 h-6 transition-transform duration-300 ${showOpen ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('nav.open')}</span>
            </button>
            <button onClick={toggleClosed} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showClosed ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
              <svg className={`w-6 h-6 transition-transform duration-300 ${showClosed ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('nav.closed')}</span>
            </button>
            <button onClick={toggleProduccion} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showProduccion ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
              <svg className={`w-6 h-6 transition-transform duration-300 ${showProduccion ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{t('nav.produccion')}</span>
            </button>
            <div className="flex justify-center lg:justify-start">
              <LanguageSwitcher className="w-full sm:w-auto" />
            </div>
          </div>

          {/* Collapsible Tools Menu */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="w-full font-semibold py-3 px-5 flex items-center justify-between text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>{t('nav.tools')}</span>
              </div>
              <svg className={`w-5 h-5 transition-transform duration-300 ${showToolsMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {showToolsMenu && (
              <div className="border-t border-slate-700 grid grid-cols-1 sm:grid-cols-6 gap-2 p-3">
                <button onClick={() => {
                  setShowConfiguration(true)
                  setShowNew(false)
                  setShowOpen(false)
                  setShowClosed(false)
                  setShowAnalytics(false)
                  setShowProduccion(false)
                  setShowDisplay(false)
                  setShowMantenimiento(false)
                  setShowCambioModelo(false)
                  setShowAuditoria(false)
                  resetFilters()
                }} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showConfiguration ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showConfiguration ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t('nav.configuration')}</span>
                </button>

                <button onClick={() => {
                  setShowAnalytics(true)
                  setShowNew(false)
                  setShowOpen(false)
                  setShowClosed(false)
                  setShowConfiguration(false)
                  setShowProduccion(false)
                  setShowDisplay(false)
                  setShowMantenimiento(false)
                  setShowCambioModelo(false)
                  setShowAuditoria(false)
                  resetFilters()
                }} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showAnalytics ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showAnalytics ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>{t('nav.analytics')}</span>
                </button>

                <button onClick={() => {
                  setShowDisplay(true)
                  setShowNew(false)
                  setShowOpen(false)
                  setShowClosed(false)
                  setShowAnalytics(false)
                  setShowConfiguration(false)
                  setShowProduccion(false)
                  setShowMantenimiento(false)
                  setShowCambioModelo(false)
                  setShowAuditoria(false)
                  resetFilters()
                }} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showDisplay ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showDisplay ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{t('nav.display')}</span>
                </button>

                <button onClick={() => toggleMantenimiento()} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${Object.values(mantenimientoActivo).includes(true) ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50' : showMantenimiento ? 'bg-blue-700 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showMantenimiento ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t('nav.maintenance')}</span>
                </button>

                <button onClick={() => toggleCambioModelo()} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${Object.values(cambioModeloActivo).includes(true) ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-500/50' : showCambioModelo ? 'bg-amber-700 border-amber-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showCambioModelo ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{t('nav.modelChange')}</span>
                </button>

                <button onClick={() => toggleAuditoria()} className={`group relative font-semibold py-4 px-5 rounded-lg border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${Object.values(auditoriaActivo).includes(true) ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/50' : showAuditoria ? 'bg-purple-700 border-purple-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showAuditoria ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>{t('nav.audit')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {!showNew && !showOpen && !showClosed && !showAnalytics && !showProduccion && !showConfiguration && !showDisplay && !showMantenimiento && !showCambioModelo && !showAuditoria && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
            {/* Tiempos de Atención Card */}
            <div className="glass-card rounded-2xl shadow-xl p-5 sm:p-6 card-hover">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t('stats.responseTime')}</h2>
                    <p className="text-slate-400 text-xs">{t('stats.averageLastDays')}</p>
                  </div>
                </div>
                <span className="badge badge-blue">{t('stats.days30')}</span>
              </div>
              <div className="space-y-3">
                {Array.isArray(statsAtencion) && statsAtencion.slice(0, 10).map((stat, idx) => {
                  const maxHoras = Math.max(...statsAtencion.map(s => minutosAHoras(s.promedio_minutos)), 0.01)
                  const horasValue = minutosAHoras(stat.promedio_minutos)
                  const widthPercent = (horasValue / maxHoras) * 100
                  return (
                    <div key={idx} className="flex items-center gap-3 group">
                      <span className="text-slate-500 text-xs w-5 font-bold">#{idx + 1}</span>
                      <span className="text-slate-400 text-xs w-16 font-medium">{new Date(stat.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' })}</span>
                      <div className="flex-1 bg-slate-700/50 rounded-full h-7 relative overflow-hidden">
                        <div
                          className="bg-cyan-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(widthPercent, 20)}%` }}
                        >
                          <span className="text-white text-xs font-bold drop-shadow">{formatHoras(horasValue)}</span>
                        </div>
                      </div>
                      <span className="text-slate-300 font-semibold text-xs w-16 text-right">{formatHoras(horasValue)}</span>
                    </div>
                  )
                })}
                {statsAtencion.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium">{t('common.noDataAvailable')}</p>
                    <p className="text-slate-500 text-xs mt-1">{t('common.dataWhenClosed')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipos con Más Fallas Card */}
            <div className="glass-card rounded-2xl shadow-xl p-5 sm:p-6 card-hover">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t('stats.equipmentWithMostFailures')}</h2>
                    <p className="text-slate-400 text-xs">{t('stats.topFailures')}</p>
                  </div>
                </div>
                <span className="badge badge-red">{t('stats.topFailures')}</span>
              </div>
              <div className="space-y-3">
                {statsEquipos.map((stat, idx) => {
                  const maxFallas = statsEquipos[0]?.total_fallas || 1
                  const widthPercent = (stat.total_fallas / maxFallas) * 100
                  return (
                    <div key={idx} className="flex items-center gap-3 group">
                      <span className="text-slate-500 text-xs w-5 font-bold">#{idx + 1}</span>
                      <span className="text-slate-300 text-xs font-medium w-28 truncate" title={stat.equipo}>{stat.equipo}</span>
                      <div className="flex-1 bg-slate-700/50 rounded-full h-7 relative overflow-hidden">
                        <div
                          className="bg-amber-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(widthPercent, 15)}%` }}
                        >
                          <span className="text-white text-xs font-bold drop-shadow">{stat.total_fallas}</span>
                        </div>
                      </div>
                      <span className="text-slate-300 font-semibold text-xs w-10 text-right">{stat.total_fallas}</span>
                    </div>
                  )
                })}
                {statsEquipos.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium">{t('common.noDataAvailable')}</p>
                    <p className="text-slate-500 text-xs mt-1">{t('common.dataWhenClosed')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showNew && (
          <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 mb-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">{t('tickets.newTicketFormTitle')}</h2>
              </div>
              <button onClick={toggleNew} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="space-y-6">
              {/* Sección 1: Línea y Modelo */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-sm font-semibold text-white">{t('tickets.lineModelInfo')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className={inputClass(form.linea)} value={form.linea} onChange={handleLineaChange} required>
                    <option value="">{t('tickets.selectLine')}</option>
                    {lineas.map(lin => <option key={lin.id} value={lin.linea}>Línea {lin.linea}</option>)}
                  </select>

                  <select className={inputClass(form.modelo)} value={form.modelo} onChange={handleModeloChange} required disabled={!form.linea || modelosLoading}>
                    {modelosLoading ? (
                      <option value="">{t('common.loadingModels')}</option>
                    ) : (
                      <>
                        <option value="">{t('tickets.selectModel')}</option>
                        {modelos.map(mod => (
                          <option key={mod.id} value={mod.modelo}>
                            {mod.modelo}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {selectedModelo && (
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-2 font-medium">{t('tickets.modelRateAuto')}</p>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-slate-300 font-semibold">{selectedModelo.rate || 'N/A'} {t('tickets.piecesPerHour')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 2: Equipo y Descripción */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.linea && form.modelo ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.linea && form.modelo ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>2</span>
                  <h3 className="text-sm font-semibold text-white">{t('tickets.equipmentInfo')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.equipo)} value={form.equipo} onChange={handleEquipoChange} required disabled={!form.linea || !form.modelo}>
                    <option value="">{t('tickets.selectEquipment')}</option>
                    {equipos.map(eq => <option key={eq.id} value={eq.equipo}>{eq.equipo}</option>)}
                  </select>

                  <select className={inputClass(form.descr)} value={form.descr} onChange={e => setForm({ ...form, descr: e.target.value, descr_otros: '' })} required disabled={!form.equipo}>
                    {descripcionesLoading ? (
                      <option value="">{t('common.loadingDescriptions')}</option>
                    ) : (
                      <>
                        <option value="">Seleccionar Descripción *</option>
                        {descripciones.map(desc => <option key={desc.id} value={desc.descripcion}>{desc.descripcion}</option>)}
                        <option value="__OTROS__">{t('tickets.specifyOther')}</option>
                      </>
                    )}
                  </select>

                  {form.descr === '__OTROS__' && (
                    <input
                      className={inputClass(form.descr_otros)}
                      placeholder={t('tickets.specifyFailure')}
                      value={form.descr_otros}
                      onChange={e => setForm({ ...form, descr_otros: e.target.value })}
                      required
                      disabled={!form.equipo}
                    />
                  )}
                </div>
              </div>

              {/* Sección 3: Condiciones de Paro */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.equipo && form.descr && (form.descr !== '__OTROS__' || form.descr_otros) ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.equipo && form.descr && (form.descr !== '__OTROS__' || form.descr_otros) ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>3</span>
                  <h3 className="text-sm font-semibold text-white">{t('tickets.stopConditions')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.pf)} value={form.pf} onChange={e => setForm({ ...form, pf: e.target.value })} required disabled={!form.equipo || !form.descr || (form.descr === '__OTROS__' && !form.descr_otros)}>
                    <option value="">{t('tickets.affectedSection')}</option>
                    <option value="Equipo">Equipo</option>
                    <option value="Linea">Línea</option>
                  </select>

                  <select className={inputClass(form.pa)} value={form.pa} onChange={e => setForm({ ...form, pa: e.target.value })} required disabled={!form.equipo || !form.descr}>
                    <option value="">{t('tickets.stopCondition')}</option>
                    <option value="Intermitente">Intermitente</option>
                    <option value="Total">Total</option>
                  </select>
                </div>
              </div>

              {/* Sección 4: Clasificación */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.pf && form.pa ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.pf && form.pa ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>4</span>
                  <h3 className="text-sm font-semibold text-white">{t('tickets.classification')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <select className={inputClass(form.clasificacion)} value={form.clasificacion} onChange={e => setForm({ ...form, clasificacion: e.target.value })} required disabled={!form.pf || !form.pa}>
                    <option value="">{t('tickets.selectClassification')}</option>
                    {['Equipo', 'Facilidades', 'Operacion', 'Procesos', 'Calidad', 'Materiales', 'Sistemas(IT)', 'Produccion', 'Otros'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {form.clasificacion === 'Otros' && (
                    <input className={inputClass(form.clas_others)} placeholder="Especificar *" value={form.clas_others} onChange={e => setForm({ ...form, clas_others: e.target.value })} required />
                  )}
                </div>
              </div>

              {/* Sección 5: Montadoras */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.equipo === 'NXT' && form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others) ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.equipo === 'NXT' ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>5</span>
                  <h3 className="text-sm font-semibold text-white">Montadoras Afectadas {form.equipo === 'NXT' ? '' : '(Solo NXT)'}</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                    <label key={i} className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${form.mods[`Montadora${i}`] ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'} ${form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others)) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="checkbox" className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-emerald-500" checked={form.mods[`Montadora${i}`] || false} onChange={e => setForm({ ...form, mods: { ...form.mods, [`Montadora${i}`]: e.target.checked } })} disabled={form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others))} />
                      <span className="text-slate-300 text-xs sm:text-sm font-medium">M{i}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!form.linea || !form.modelo || !form.equipo || !form.descr || (form.descr === '__OTROS__' && !form.descr_otros) || !form.pf || !form.pa || !form.clasificacion || (form.clasificacion === 'Otros' && !form.clas_others) || (form.equipo === 'NXT' && !Object.values(form.mods).some(m => m === true))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear Ticket
              </button>
            </form>
          </div>
        )}

        {showOpen && (
          <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Tickets Abiertos</h2>
              </div>
              <button onClick={toggleOpen} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filtro por Línea */}
            <div className="mb-5 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <label className="block text-slate-300 text-xs font-medium mb-2">Filtrar por Línea</label>
              <select
                className="w-full sm:w-48 bg-slate-700/50 border border-slate-600/50 text-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-amber-400"></div>
                <p className="text-slate-400 mt-4">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredOpenTickets().map((t, idx) => (
                  <div key={t.id} className={`bg-slate-800/80 rounded-xl p-4 hover:bg-slate-700/80 transition-all duration-300 border-l-4 border-slate-500 card-hover ${t._isNew ? 'animate-slide-up' : ''}`} style={t._isNew ? { animationDelay: `${idx * 50}ms` } : {}}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge badge-amber">#{t.id}</span>
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                        </div>
                        <h3 className="text-white font-semibold text-sm sm:text-base mb-1">{t.descr}</h3>
                        <p className="text-slate-400 text-xs sm:text-sm">Línea {t.linea} • {t.modelo} • {t.equipo}</p>
                        <p className="text-slate-500 text-xs mt-2 flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {t.nombre} • {new Date(t.hr).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button onClick={() => openHandleModal(t.id)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-300 text-sm w-full sm:w-auto flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Manejar
                      </button>
                    </div>
                  </div>
                ))}
                {getFilteredOpenTickets().length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-300 font-medium">{filterOpenLinea ? 'No hay tickets para esta línea' : 'No hay tickets abiertos'}</p>
                    <p className="text-slate-500 text-sm mt-1">¡Excelente trabajo!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showClosed && (
          <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Tickets Cerrados</h2>
              </div>
              <button onClick={toggleClosed} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filtros multicriterio */}
            <div className="mb-5 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white text-sm font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros
                </span>
                <button
                  onClick={() => {
                    setFilterClosedTicketId('')
                    setFilterClosedLinea('')
                    setFilterClosedEquipo('')
                    setFilterClosedDescr('')
                    setFilterClosedStartDate('')
                    setFilterClosedEndDate('')
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 font-medium transition-colors"
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
                    type="datetime-local"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                    value={filterClosedStartDate}
                    onChange={e => setFilterClosedStartDate(e.target.value)}
                  />
                </div>

                {/* Filtro por Fecha Fin */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Hasta</label>
                  <input
                    type="datetime-local"
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
                  disabled={tickets.length === 0}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors border border-slate-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>
              </div>

              {/* Mostrar cantidad de resultados */}
              <div className="mt-3 text-xs text-slate-400">
                Mostrando {tickets.length} de {closedTotal} tickets {closedTotalPages > 1 && `(Página ${closedPage} de ${closedTotalPages})`}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-700 border-t-slate-400"></div>
                <p className="text-slate-400 mt-4 text-sm sm:text-base">Cargando tickets...</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {tickets.map(t => {
                  const duracionHrs = calcularHoras(t.hr, t.hc)
                  return (
                    <div key={t.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-650 transition-all border-l-4 border-slate-500">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-100 font-semibold text-sm sm:text-base">#{t.id} - {t.descr}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm mt-1">Linea {t.linea} - {t.modelo} - {t.equipo}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Cerrado: {new Date(t.hc).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {t.tecnico}
                          </p>
                          {duracionHrs !== null && (
                            <p className="text-slate-300 text-xs mt-1 font-medium">
                              Duracion: {formatHoras(duracionHrs)}
                            </p>
                          )}
                        </div>
                        <button onClick={() => openViewModal(t.id)} className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-lg whitespace-nowrap transition-colors border border-slate-500 text-sm w-full sm:w-auto">
                          Ver
                        </button>
                      </div>
                    </div>
                  )
                })}
                {tickets.length === 0 && (
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

                {/* Pagination Controls */}
                {closedTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => { setClosedPage(p => Math.max(1, p - 1)); loadTickets('closed', { page: closedPage - 1 }) }}
                      disabled={closedPage <= 1}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors border border-slate-600 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="text-slate-300 text-sm font-medium">
                      Página {closedPage} de {closedTotalPages}
                    </span>
                    <button
                      onClick={() => { setClosedPage(p => Math.min(closedTotalPages, p + 1)); loadTickets('closed', { page: closedPage + 1 }) }}
                      disabled={closedPage >= closedTotalPages}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors border border-slate-600 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Siguiente →
                    </button>
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
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Analytics Dashboard</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Estadísticas y análisis de downtime
                      {selectedLinea !== 'all' && analyticsTab === 'general' && (
                        <span className="ml-2 px-2 py-1 bg-purple-900/40 text-purple-300 rounded text-xs font-medium">
                          Línea {selectedLinea}
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={toggleAnalytics} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-t border-slate-700 pt-4 flex-wrap">
                  <button
                    onClick={() => setAnalyticsTab('general')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${analyticsTab === 'general' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      General
                    </span>
                  </button>
                  <button
                    onClick={() => { setAnalyticsTab('horas'); setStatus('closed'); loadTickets('closed'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${analyticsTab === 'horas' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Por Horas
                    </span>
                  </button>
                  <button
                    onClick={() => setAnalyticsTab('maquinas')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${analyticsTab === 'maquinas' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Por Maquina
                    </span>
                  </button>
                  <button
                    onClick={() => setAnalyticsTab('mttr')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${analyticsTab === 'mttr' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      MTTR/MTBF
                    </span>
                  </button>
                  <button
                    onClick={() => setAnalyticsTab('downtime')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${analyticsTab === 'downtime' ? 'bg-red-600 text-white shadow-lg shadow-red-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Downtime
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* GENERAL TAB */}
            {analyticsTab === 'general' && (
              <>
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
                            type="datetime-local"
                            className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-xs font-medium mb-2">Hasta</label>
                          <input
                            type="datetime-local"
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
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">
                      Total Tickets {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">{totales.total_tickets || 0}</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">
                      Cerrados {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">{totales.cerrados || 0}</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">
                      Abiertos {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">{totales.abiertos || 0}</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">
                      Tiempo Prom {selectedLinea !== 'all' ? `(Línea ${selectedLinea})` : ''}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">{formatHoras(minutosAHoras(totales.promedio_minutos_global || 0))}<span className="text-sm ml-1">hrs</span></p>
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
                        <Bar dataKey="Total Tickets" fill="#6366f1" />
                        <Bar dataKey="Cerrados" fill="#059669" />
                        <Bar dataKey="Abiertos" fill="#d97706" />
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
                        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" />
                        <Line type="monotone" dataKey="cerrados" stroke="#059669" strokeWidth={2} name="Cerrados" />
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
                          fill="#6366f1"
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

                {/* Graficas adicionales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-2">Tiempos de Atencion por Dia</h2>
                    <p className="text-slate-400 text-xs mb-4">Ultimos 30 dias</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareAtencionData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          labelStyle={{ color: '#e2e8f0' }}
                          formatter={(value) => [formatHoras(value), 'Tiempo Promedio']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line
                          type="monotone"
                          dataKey="Tiempo Promedio (hrs)"
                          stroke="#0891b2"
                          strokeWidth={2}
                          dot={{ fill: '#0891b2', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-2">Equipos con Mas Fallas (General)</h2>
                    <p className="text-slate-400 text-xs mb-4">Top 10 ultimos 30 dias</p>
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
              </>
            )}

            {/* HOURS TAB */}
            {analyticsTab === 'horas' && (
              <>
                {/* Resumen por turnos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {getDistribucionTurnos().map((turno, idx) => (
                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">{turno.name}</p>
                      <p className="text-2xl font-bold text-white mt-1">{turno.tickets} <span className="text-sm">tickets</span></p>
                      <p className="text-slate-400 text-xs mt-1">{formatHoras(turno.horas)} totales</p>
                    </div>
                  ))}
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">Total Analizado</p>
                    <p className="text-2xl font-bold text-white mt-1">{tickets.filter(t => t.hc).length} <span className="text-sm">tickets</span></p>
                    <p className="text-slate-400 text-xs mt-1">cerrados</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-medium">Tiempo Total</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatHoras(prepareHourlyAnalysis().reduce((acc, d) => acc + d.totalHoras, 0))} <span className="text-sm">hrs</span></p>
                    <p className="text-slate-400 text-xs mt-1">downtime acumulado</p>
                  </div>
                </div>

                {/* Grafica de distribucion por hora */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-2">Tickets por Hora del Dia</h2>
                    <p className="text-slate-400 text-xs mb-4">Distribucion de incidencias (0-23 hrs)</p>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={prepareHourlyAnalysis()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="horaLabel" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          labelStyle={{ color: '#e2e8f0' }}
                          formatter={(value, name) => {
                            if (name === 'totalHoras' || name === 'promedioHoras') return [formatHoras(value) + ' hrs', name === 'totalHoras' ? 'Horas Totales' : 'Promedio'];
                            return [value, name === 'totalTickets' ? 'Tickets' : name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="totalTickets" name="Tickets" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-2">Tiempo de Downtime por Hora</h2>
                    <p className="text-slate-400 text-xs mb-4">Horas acumuladas de downtime</p>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={prepareHourlyAnalysis()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="horaLabel" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          labelStyle={{ color: '#e2e8f0' }}
                          formatter={(value) => [formatHoras(value), 'Horas Downtime']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="totalHoras" name="Horas Downtime" fill="#d97706" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Horas criticas y promedio */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-4">Horas Criticas (Mas Tickets)</h2>
                    <div className="space-y-3">
                      {getHorasCriticas().map((hora, idx) => {
                        const maxTickets = getHorasCriticas()[0]?.totalTickets || 1
                        const widthPercent = (hora.totalTickets / maxTickets) * 100
                        return (
                          <div key={idx} className="flex items-center gap-3 group">
                            <span className="text-slate-500 text-xs w-5 font-bold">#{idx + 1}</span>
                            <span className="text-slate-300 text-sm font-medium w-14">{hora.horaLabel}</span>
                            <div className="flex-1 bg-slate-700/50 rounded-full h-7 relative overflow-hidden">
                              <div
                                className="bg-red-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
                                style={{ width: `${Math.max(widthPercent, 15)}%` }}
                              >
                                <span className="text-white text-xs font-bold drop-shadow">{hora.totalTickets}</span>
                              </div>
                            </div>
                            <span className="text-slate-300 font-semibold text-xs w-20 text-right">{hora.totalTickets} tickets</span>
                          </div>
                        )
                      })}
                      {getHorasCriticas().length === 0 && (
                        <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-2">Tiempo Promedio de Atencion por Hora</h2>
                    <p className="text-slate-400 text-xs mb-4">Promedio de horas por ticket en cada hora del dia</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareHourlyAnalysis()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="horaLabel" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          labelStyle={{ color: '#e2e8f0' }}
                          formatter={(value) => [formatHoras(value), 'Promedio']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line
                          type="monotone"
                          dataKey="promedioHoras"
                          name="Promedio (hrs)"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          dot={{ fill: '#7c3aed', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabla completa de distribucion */}
                <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-slate-100 mb-4">Tabla Completa de Distribucion por Hora</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 font-medium">Hora</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium">Tickets</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium">Horas Totales</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium">Promedio (hrs)</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium">Piezas Perdidas</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium">Turno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepareHourlyAnalysis().map((hora, idx) => (
                          <tr key={idx} className={`border-b border-slate-700/50 ${hora.totalTickets > 0 ? 'hover:bg-slate-700/30' : 'opacity-50'}`}>
                            <td className="py-2 px-3 text-slate-200 font-medium">{hora.horaLabel}</td>
                            <td className="py-2 px-3 text-center text-slate-300">{hora.totalTickets}</td>
                            <td className="py-2 px-3 text-center text-slate-300">{formatHoras(hora.totalHoras)}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{formatHoras(hora.promedioHoras)}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{hora.piezasPerdidas}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${hora.hora >= 8 && hora.hora < 20 ? 'bg-slate-700 text-slate-300' : 'bg-slate-600 text-slate-200'}`}>
                                {hora.hora >= 8 && hora.hora < 20 ? 'T1' : 'T2'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* MACHINES TAB */}
            {analyticsTab === 'maquinas' && (
              <>
                {/* Filtros de Máquinas */}
                <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Filtros de Análisis por Máquina
                    </h2>
                    {machineLoading && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-600 border-t-orange-400"></div>
                        <span>Cargando...</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Equipo/Máquina</label>
                      <select
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={machineEquipo}
                        onChange={e => setMachineEquipo(e.target.value)}
                      >
                        <option value="">Seleccionar equipo...</option>
                        <option value="all">Todos los equipos</option>
                        <option value="sin_otros">Todos (sin "Otros")</option>
                        {equipos.map(eq => (
                          <option key={eq.id} value={eq.equipo}>{eq.equipo}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Línea (opcional)</label>
                      <select
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={machineLinea}
                        onChange={e => setMachineLinea(e.target.value)}
                      >
                        <option value="">Todas las líneas</option>
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
                            type="datetime-local"
                            className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-xs font-medium mb-2">Hasta</label>
                          <input
                            type="datetime-local"
                            className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                            value={customEndDate}
                            onChange={e => setCustomEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {machineEquipo && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={exportMachineToExcel}
                        disabled={machineTickets.length === 0}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors border border-slate-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar a Excel
                      </button>
                      <button
                        onClick={() => { setShowSpecialExportModal(true); specialExportDiario() }}
                        disabled={specialExportLoading}
                        className="bg-violet-700/80 hover:bg-violet-600 text-violet-100 px-4 py-2 rounded-lg transition-all border border-violet-500/60 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-violet-900/30"
                        title="Descarga todas las líneas separadas por día en Excel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {specialExportLoading ? 'Generando...' : 'Reporte Diario'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Resumen de máquina */}
                {machineEquipo && machineTickets.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">Total Tickets</p>
                      <p className="text-2xl font-bold text-white mt-1">{machineTickets.length}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">Tiempo Total</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatHoras(minutosAHoras(machineTickets.reduce((acc, t) => acc + (t.duracion_minutos || 0), 0)))} <span className="text-sm">hrs</span>
                      </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">Tiempo Promedio</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatHoras(minutosAHoras(machineTickets.reduce((acc, t) => acc + (t.duracion_minutos || 0), 0) / machineTickets.length))} <span className="text-sm">hrs</span>
                      </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">Piezas Perdidas</p>
                      <p className="text-2xl font-bold text-white mt-1">{machineTickets.reduce((acc, t) => acc + (t.piezas || 0), 0)}</p>
                    </div>
                  </div>
                )}

                {/* Gráfica y lista de tickets */}
                {machineEquipo && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfica de barras */}
                    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                      <h2 className="text-base font-semibold text-slate-100 mb-2">Top 10 Tickets por Duración</h2>
                      <p className="text-slate-400 text-xs mb-4">Click en una barra para ver detalles</p>
                      {machineTickets.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={prepareMachineChartData()}
                            layout="vertical"
                            margin={{ left: 10, right: 20 }}
                            onClick={(data) => {
                              if (data && data.activePayload && data.activePayload[0]) {
                                setMachineDetailTicket(data.activePayload[0].payload.fullData)
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" stroke="#94a3b8" />
                            <YAxis
                              dataKey="name"
                              type="category"
                              stroke="#94a3b8"
                              width={60}
                              tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                              labelStyle={{ color: '#e2e8f0' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Tiempo (hrs)" fill="#f97316" cursor="pointer" />
                            <Bar dataKey="Piezas Perdidas" fill="#ef4444" cursor="pointer" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[350px] flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-slate-400">No hay datos para mostrar</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lista de tickets - siempre visible */}
                    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                      <h2 className="text-base font-semibold text-slate-100 mb-4">Lista de Tickets</h2>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {machineTickets.slice(0, 20).map((ticket, idx) => (
                          <div
                            key={ticket.id}
                            className="bg-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-600/50 transition-colors border-l-2 border-orange-500"
                            onClick={() => setMachineDetailTicket(ticket)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white text-sm font-medium">#{ticket.id} - {ticket.descr}</p>
                                <p className="text-slate-400 text-xs mt-1">Linea {ticket.linea} - {ticket.modelo}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-orange-400 font-semibold text-sm">{formatHoras(minutosAHoras(ticket.duracion_minutos || 0))} hrs</p>
                                <p className="text-rose-400 text-xs">{ticket.piezas || 0} pzs</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {machineTickets.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-slate-400">Selecciona un equipo para ver sus tickets</p>
                          </div>
                        )}
                        {machineTickets.length > 20 && (
                          <p className="text-center text-slate-500 text-xs py-2">
                            Mostrando 20 de {machineTickets.length} tickets
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal de detalle de ticket de máquina */}
                {machineDetailTicket && (
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700">
                      <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">Ticket #{machineDetailTicket.id}</h2>
                            <p className="text-slate-400 text-sm">{machineEquipo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setMachineDetailTicket(null)}
                          className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Métricas principales */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                            <p className="text-slate-400 text-xs">Duración</p>
                            <p className="text-xl font-bold text-white">{formatHoras(minutosAHoras(machineDetailTicket.duracion_minutos || 0))} hrs</p>
                          </div>
                          <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                            <p className="text-slate-400 text-xs">Piezas Perdidas</p>
                            <p className="text-xl font-bold text-white">{machineDetailTicket.piezas || 0}</p>
                          </div>
                        </div>

                        {/* Información del ticket */}
                        <div className="space-y-3">
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Equipo / Máquina</p>
                            <p className="text-white font-semibold">{machineDetailTicket.equipo}</p>
                          </div>

                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Descripción del Problema</p>
                            <p className="text-white">{machineDetailTicket.descr}</p>
                          </div>

                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Clasificación</p>
                            <p className="text-white">{machineDetailTicket.clasificacion || 'N/A'}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Sección Afectada</p>
                              <p className="text-white font-semibold">{machineDetailTicket.pa || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Condición de Paro</p>
                              <p className="text-white font-semibold">{machineDetailTicket.pf || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Línea</p>
                              <p className="text-white font-semibold">Línea {machineDetailTicket.linea}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Modelo</p>
                              <p className="text-white font-semibold">{machineDetailTicket.modelo}</p>
                            </div>
                          </div>

                          {/* Montadoras afectadas - solo si es NXT */}
                          {machineDetailTicket.equipo === 'NXT' && (
                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                              <p className="text-cyan-300 text-xs font-medium mb-2">Montadoras Afectadas</p>
                              <div className="grid grid-cols-6 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                  <div key={i} className={`flex items-center justify-center py-1.5 rounded text-xs font-medium ${machineDetailTicket[`mod${i}`] ? 'bg-cyan-500/40 text-cyan-300 border border-cyan-500/60' : 'bg-slate-700/30 text-slate-500 border border-slate-600/30'
                                    }`}>
                                    M{i}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Solución Aplicada</p>
                            <p className="text-white">{machineDetailTicket.solucion || 'Sin solución registrada'}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Reportado por</p>
                              <p className="text-white">{machineDetailTicket.nombre}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Técnico</p>
                              <p className="text-white">{machineDetailTicket.tecnico || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Apertura</p>
                              <p className="text-white text-sm">{machineDetailTicket.hr ? new Date(machineDetailTicket.hr).toLocaleString('es-MX') : 'N/A'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Cierre</p>
                              <p className="text-white text-sm">{machineDetailTicket.hc ? new Date(machineDetailTicket.hc).toLocaleString('es-MX') : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!machineEquipo && (
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-300 font-medium">Selecciona un equipo para analizar</p>
                    <p className="text-slate-500 text-sm mt-1">Usa los filtros de arriba para ver el análisis por máquina</p>
                  </div>
                )}
              </>
            )}

            {/* MTTR/MTBF TAB */}
            {analyticsTab === 'mttr' && (
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  MTTR/MTBF - Análisis de Confiabilidad
                </h2>

                {/* Filters and Navigation for MTTR/MTBF */}
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {/* Period Selector and Navigation Combined */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Período:
                      </label>
                      <select
                        value={mttrPeriod}
                        onChange={(e) => {
                          setMttrPeriod(e.target.value)
                          setCurrentWeekOffset(0)
                          setCurrentMonthOffset(0)
                          setCurrentYearOffset(0)
                        }}
                        className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="annual">Anual</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Máquina:
                      </label>
                      <select
                        value={selectedMttrMachine}
                        onChange={(e) => setSelectedMttrMachine(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Todas las Máquinas</option>
                        {mttrMachines.map((machine) => (
                          <option key={machine} value={machine}>{machine}</option>
                        ))}
                      </select>
                    </div>

                    {mttrPeriod === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Desde:</label>
                          <input
                            type="date"
                            className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Hasta:</label>
                          <input
                            type="date"
                            className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Navigation Buttons */}
                    {mttrPeriod !== 'custom' && (
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => {
                            if (mttrPeriod === 'weekly') setCurrentWeekOffset(currentWeekOffset - 1)
                            else if (mttrPeriod === 'monthly') setCurrentMonthOffset(currentMonthOffset - 1)
                            else if (mttrPeriod === 'annual') setCurrentYearOffset(currentYearOffset - 1)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
                        >
                          ← Anterior
                        </button>

                        <div className="text-center px-4 py-2 bg-slate-700/50 rounded-lg min-w-[180px]">
                          {mttrPeriod === 'weekly' && (
                            (() => {
                              const today = new Date()
                              const targetDate = new Date(today)
                              targetDate.setDate(targetDate.getDate() + (currentWeekOffset * 7))
                              const dayOfWeek = targetDate.getDay()
                              const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                              const mondayDate = new Date(targetDate)
                              mondayDate.setDate(diff)
                              const sundayDate = new Date(mondayDate)
                              sundayDate.setDate(sundayDate.getDate() + 6)

                              return (
                                <div>
                                  <p className="text-slate-200 text-sm font-medium">
                                    {mondayDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {sundayDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              )
                            })()
                          )}

                          {mttrPeriod === 'monthly' && (
                            (() => {
                              const today = new Date()
                              const targetDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1)
                              const monthName = targetDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

                              return (
                                <p className="text-slate-200 text-sm font-medium capitalize">{monthName}</p>
                              )
                            })()
                          )}

                          {mttrPeriod === 'annual' && (
                            (() => {
                              const today = new Date()
                              const targetYear = today.getFullYear() + currentYearOffset

                              return (
                                <p className="text-slate-200 text-sm font-medium">{targetYear}</p>
                              )
                            })()
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (mttrPeriod === 'weekly') setCurrentWeekOffset(currentWeekOffset + 1)
                            else if (mttrPeriod === 'monthly') setCurrentMonthOffset(currentMonthOffset + 1)
                            else if (mttrPeriod === 'annual') setCurrentYearOffset(currentYearOffset + 1)
                          }}
                          disabled={(mttrPeriod === 'weekly' && currentWeekOffset >= 0) || (mttrPeriod === 'monthly' && currentMonthOffset >= 0) || (mttrPeriod === 'annual' && currentYearOffset >= 0)}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${(mttrPeriod === 'weekly' && currentWeekOffset >= 0) || (mttrPeriod === 'monthly' && currentMonthOffset >= 0) || (mttrPeriod === 'annual' && currentYearOffset >= 0)
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                          Siguiente →
                        </button>

                        {(currentWeekOffset !== 0 || currentMonthOffset !== 0 || currentYearOffset !== 0) && (
                          <button
                            onClick={() => {
                              setCurrentWeekOffset(0)
                              setCurrentMonthOffset(0)
                              setCurrentYearOffset(0)
                            }}
                            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
                          >
                            Actual
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* MTTR/MTBF Chart */}
                {mttrLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-slate-400 mb-3"></div>
                      <p className="text-slate-400">Cargando datos MTTR/MTBF...</p>
                    </div>
                  </div>
                ) : mttrMtbfData && mttrMtbfData.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-6">
                      {/* MTTR Chart */}
                      <div>
                        <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          MTTR (Mean Time To Repair) - {mttrPeriod === 'annual' ? 'Por Semanas del Año' : mttrPeriod === 'monthly' ? 'Por Mes' : 'Por Equipos'}
                          <span className="text-sm text-slate-400 ml-2">Target: {mttrPeriod === 'monthly' ? '3.6' : '0.8'}h (menor es mejor)</span>
                        </h3>
                        <div className="h-[500px] w-full">
                          {mttrPeriod === 'weekly' ? (
                            // Weekly view: Equipment on X-axis
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={prepareWeeklyChartData().mttr}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                  dataKey="name"
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                                  label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                  formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) + 'h' : value, name]}
                                />
                                <Legend />
                                <ReferenceLine y={0.8} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Target: 0.8h', position: 'right', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                                <Bar dataKey="MTTR" fill="#ef4444" name="MTTR (hrs)" />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            // Monthly/Annual view: Weeks on X-axis
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={prepareMonthlyChartData().mttr}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                  dataKey="week"
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  interval={0}
                                />
                                <YAxis
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                                  label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                  formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) + 'h' : value, name]}
                                />
                                <Legend />
                                <ReferenceLine y={mttrPeriod === 'monthly' ? 3.6 : 0.8} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Target: ${mttrPeriod === 'monthly' ? '3.6' : '0.8'}h`, position: 'right', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                                <Bar dataKey="Promedio MTTR" fill="#ef4444" name="Promedio MTTR (hrs)" />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* MTBF Chart */}
                      <div>
                        <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          MTBF (Mean Time Between Failures) - {mttrPeriod === 'annual' ? 'Por Semanas del Año' : mttrPeriod === 'monthly' ? 'Por Mes' : 'Por Equipos'}
                          <span className="text-sm text-slate-400 ml-2">Target: {mttrPeriod === 'monthly' ? '48' : '12'}h (mayor es mejor)</span>
                        </h3>
                        <div className="h-[500px] w-full">
                          {mttrPeriod === 'weekly' ? (
                            // Weekly view: Equipment on X-axis
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={prepareWeeklyChartData().mtbf}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                  dataKey="name"
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                                  label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                  formatter={(value) => [typeof value === 'number' ? value.toFixed(2) + 'h' : value, 'MTBF']}
                                />
                                <Legend />
                                <ReferenceLine y={12} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Target: 12h', position: 'right', fill: '#10b981', fontSize: 12, fontWeight: 'bold' }} />
                                <Bar dataKey="MTBF" fill="#10b981" name="MTBF (hrs)" />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            // Monthly/Annual view: Weeks on X-axis
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={prepareMonthlyChartData().mtbf}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                  dataKey="week"
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  interval={0}
                                />
                                <YAxis
                                  stroke="#94a3b8"
                                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                                  label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                  formatter={(value) => [typeof value === 'number' ? value.toFixed(2) + 'h' : value, 'Promedio MTBF']}
                                />
                                <Legend />
                                <ReferenceLine y={mttrPeriod === 'monthly' ? 48 : 12} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Target: ${mttrPeriod === 'monthly' ? '48' : '12'}h`, position: 'right', fill: '#10b981', fontSize: 12, fontWeight: 'bold' }} />
                                <Bar dataKey="Promedio MTBF" fill="#10b981" name="Promedio MTBF (hrs)" />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Debug: Full Data Details */}
                    <div className="mt-6 bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-200 mb-4">Datos Detallados (Debug)</h3>

                      {mttrPeriod === 'monthly' ? (
                        // Monthly view: Show aggregated data per month
                        (() => {
                          const monthsMap = new Map();
                          mttrMtbfData.forEach(item => {
                            const monthKey = item.period_key.substring(0, 7);
                            if (!monthsMap.has(monthKey)) {
                              monthsMap.set(monthKey, { totalDowntime: 0, totalEvents: 0, machines: [] });
                            }
                            const month = monthsMap.get(monthKey);
                            month.totalDowntime += item.total_downtime || 0;
                            month.totalEvents += item.incident_count || 0;
                            month.machines.push({
                              machine: item.machine,
                              downtime: item.total_downtime,
                              events: item.incident_count
                            });
                          });
                          const availableTime = 528;
                          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

                          return Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([monthKey, data]) => {
                            const [year, month] = monthKey.split('-');
                            const monthName = monthNames[parseInt(month) - 1];
                            const mttr = data.totalEvents > 0 ? data.totalDowntime / data.totalEvents : 0;
                            const mtbf = data.totalEvents > 0 ? availableTime / data.totalEvents : availableTime;

                            return (
                              <div key={monthKey} className="mb-6 last:mb-0">
                                <h4 className="text-md font-semibold text-cyan-400 mb-2">{monthName} {year}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                                  <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Total Downtime</p>
                                    <p className="text-white font-bold">{data.totalDowntime.toFixed(2)}h</p>
                                  </div>
                                  <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Total Eventos</p>
                                    <p className="text-white font-bold">{data.totalEvents}</p>
                                  </div>
                                  <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Tiempo Disponible</p>
                                    <p className="text-white font-bold">{availableTime}h</p>
                                  </div>
                                  <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Máquinas con datos</p>
                                    <p className="text-white font-bold">{data.machines.length}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                  <div className="bg-red-900/30 border border-red-700 p-2 rounded">
                                    <p className="text-red-300 text-xs">MTTR = Total Downtime / Total Eventos</p>
                                    <p className="text-red-400 font-bold">{data.totalDowntime.toFixed(2)} / {data.totalEvents} = {mttr.toFixed(2)}h</p>
                                    <p className="text-slate-400 text-xs mt-1">Target: 3.6h</p>
                                  </div>
                                  <div className="bg-emerald-900/30 border border-emerald-700 p-2 rounded">
                                    <p className="text-emerald-300 text-xs">MTBF = Tiempo Disponible / Total Eventos</p>
                                    <p className="text-emerald-400 font-bold">{availableTime} / {data.totalEvents} = {mtbf.toFixed(2)}h</p>
                                    <p className="text-slate-400 text-xs mt-1">Target: 48h</p>
                                  </div>
                                </div>
                                <details className="text-xs">
                                  <summary className="text-slate-400 cursor-pointer hover:text-slate-300">Ver datos por máquina ({data.machines.length})</summary>
                                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {data.machines.map((m, i) => (
                                      <div key={i} className="bg-slate-800/50 p-2 rounded text-slate-300">
                                        <p className="font-medium text-slate-200">{m.machine}</p>
                                        <p>Downtime: {m.downtime?.toFixed(2) || 0}h</p>
                                        <p>Eventos: {m.events || 0}</p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            );
                          });
                        })()
                      ) : mttrPeriod === 'weekly' ? (
                        // Weekly view: Show data per machine
                        (() => {
                          const machineData = {};
                          const availableTime = 132;

                          mttrMtbfData.forEach(item => {
                            if (!machineData[item.machine]) {
                              machineData[item.machine] = { totalDowntime: 0, totalEvents: 0 };
                            }
                            machineData[item.machine].totalDowntime += item.total_downtime || 0;
                            machineData[item.machine].totalEvents += item.incident_count || 0;
                          });

                          const machines = Object.keys(machineData).sort();
                          const totalDowntime = machines.reduce((sum, m) => sum + machineData[m].totalDowntime, 0);
                          const totalEvents = machines.reduce((sum, m) => sum + machineData[m].totalEvents, 0);

                          return (
                            <div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                                <div className="bg-slate-800 p-2 rounded">
                                  <p className="text-slate-400 text-xs">Tiempo Disponible (semanal)</p>
                                  <p className="text-white font-bold">{availableTime}h</p>
                                </div>
                                <div className="bg-slate-800 p-2 rounded">
                                  <p className="text-slate-400 text-xs">Total Downtime (todas las máquinas)</p>
                                  <p className="text-white font-bold">{totalDowntime.toFixed(2)}h</p>
                                </div>
                                <div className="bg-slate-800 p-2 rounded">
                                  <p className="text-slate-400 text-xs">Total Eventos (todas las máquinas)</p>
                                  <p className="text-white font-bold">{totalEvents}</p>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-600">
                                      <th className="text-left text-slate-400 p-2">Máquina</th>
                                      <th className="text-right text-slate-400 p-2">Downtime (h)</th>
                                      <th className="text-right text-slate-400 p-2">Eventos</th>
                                      <th className="text-right text-red-400 p-2">MTTR (h)</th>
                                      <th className="text-right text-slate-400 p-2">Fórmula MTTR</th>
                                      <th className="text-right text-emerald-400 p-2">MTBF (h)</th>
                                      <th className="text-right text-slate-400 p-2">Fórmula MTBF</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {machines.map(m => {
                                      const d = machineData[m];
                                      const mttr = d.totalEvents > 0 ? d.totalDowntime / d.totalEvents : 0;
                                      const mtbf = d.totalEvents > 0 ? availableTime / d.totalEvents : availableTime;
                                      return (
                                        <tr key={m} className="border-b border-slate-700">
                                          <td className="text-slate-200 p-2">{m}</td>
                                          <td className="text-right text-slate-300 p-2">{d.totalDowntime.toFixed(2)}</td>
                                          <td className="text-right text-slate-300 p-2">{d.totalEvents}</td>
                                          <td className={`text-right p-2 font-bold ${mttr <= 0.8 ? 'text-emerald-400' : 'text-red-400'}`}>{mttr.toFixed(2)}</td>
                                          <td className="text-right text-slate-500 p-2">{d.totalDowntime.toFixed(2)} / {d.totalEvents}</td>
                                          <td className={`text-right p-2 font-bold ${mtbf >= 12 ? 'text-emerald-400' : 'text-red-400'}`}>{mtbf.toFixed(2)}</td>
                                          <td className="text-right text-slate-500 p-2">{availableTime} / {d.totalEvents}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-slate-400 text-xs mt-3">Target MTTR: 0.8h | Target MTBF: 12h</p>
                            </div>
                          );
                        })()
                      ) : (
                        // Annual view: Show data per week
                        (() => {
                          const weeksMap = new Map();
                          const availableTime = 132;

                          mttrMtbfData.forEach(item => {
                            const weekKey = item.period_key;
                            if (!weeksMap.has(weekKey)) {
                              weeksMap.set(weekKey, {
                                periodEnd: item.period_end_date,
                                totalDowntime: 0,
                                totalEvents: 0
                              });
                            }
                            const week = weeksMap.get(weekKey);
                            week.totalDowntime += item.total_downtime || 0;
                            week.totalEvents += item.incident_count || 0;
                          });

                          const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-600">
                                    <th className="text-left text-slate-400 p-2">Semana</th>
                                    <th className="text-right text-slate-400 p-2">Downtime Total (h)</th>
                                    <th className="text-right text-slate-400 p-2">Eventos Total</th>
                                    <th className="text-right text-red-400 p-2">MTTR (h)</th>
                                    <th className="text-right text-slate-400 p-2">Fórmula</th>
                                    <th className="text-right text-emerald-400 p-2">MTBF (h)</th>
                                    <th className="text-right text-slate-400 p-2">Fórmula</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedWeeks.map(([weekKey, data]) => {
                                    const startDate = new Date(weekKey + 'T00:00:00');
                                    const endDate = new Date(data.periodEnd + 'T00:00:00');
                                    const label = `${startDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
                                    const mttr = data.totalEvents > 0 ? data.totalDowntime / data.totalEvents : 0;
                                    const mtbf = data.totalEvents > 0 ? availableTime / data.totalEvents : availableTime;
                                    return (
                                      <tr key={weekKey} className="border-b border-slate-700">
                                        <td className="text-slate-200 p-2">{label}</td>
                                        <td className="text-right text-slate-300 p-2">{data.totalDowntime.toFixed(2)}</td>
                                        <td className="text-right text-slate-300 p-2">{data.totalEvents}</td>
                                        <td className={`text-right p-2 font-bold ${mttr <= 0.8 ? 'text-emerald-400' : 'text-red-400'}`}>{mttr.toFixed(2)}</td>
                                        <td className="text-right text-slate-500 p-2">{data.totalDowntime.toFixed(2)} / {data.totalEvents}</td>
                                        <td className={`text-right p-2 font-bold ${mtbf >= 12 ? 'text-emerald-400' : 'text-red-400'}`}>{mtbf.toFixed(2)}</td>
                                        <td className="text-right text-slate-500 p-2">{availableTime} / {data.totalEvents}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <p className="text-slate-400 text-xs mt-3">Tiempo disponible por semana: {availableTime}h | Target MTTR: 0.8h | Target MTBF: 12h</p>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Summary Statistics - Only for weekly view */}
                    {mttrPeriod === 'weekly' && prepareWeeklyChartData().mttr.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-slate-200 mb-4">Resumen por Equipo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {prepareWeeklyChartData().mttr.map((eq, idx) => {
                            const mtbfData = prepareWeeklyChartData().mtbf.find(m => m.name === eq.name);
                            return (
                              <div key={idx} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                                <p className="text-slate-300 text-sm font-medium mb-2">{eq.name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-slate-400">MTTR</p>
                                    <p className={`text-lg font-bold ${eq.MTTR <= 0.8 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {eq.MTTR?.toFixed(2) || '0.00'}h
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">MTBF</p>
                                    <p className={`text-lg font-bold ${(mtbfData?.MTBF || 0) >= 12 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {mtbfData?.MTBF?.toFixed(2) || '0.00'}h
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Incidentes: {eq.Incidentes || 0}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500">No hay datos MTTR/MTBF disponibles</p>
                    <p className="text-slate-600 text-sm mt-1">Verifica que existan registros en la base de datos</p>
                  </div>
                )}
              </div>
            )}

            {/* DOWNTIME TAB */}
            {analyticsTab === 'downtime' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Downtime por Intervalo de Producción
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">
                    Muestra el DT de producción menos el tiempo de tickets registrados en cada intervalo horario. Solo visual — no modifica la base de datos.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Línea</label>
                      <select
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={downtimeLinea}
                        onChange={e => setDowntimeLinea(e.target.value)}
                      >
                        <option value="">Seleccionar línea</option>
                        {lineas.map(l => (
                          <option key={l.id} value={l.linea}>Línea {l.linea}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-2">Fecha</label>
                      <input
                        type="date"
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2 text-sm"
                        value={downtimeFecha}
                        onChange={e => setDowntimeFecha(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={loadDowntimeAnalytics}
                        disabled={!downtimeLinea || !downtimeFecha || downtimeLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {downtimeLoading ? 'Cargando...' : 'Consultar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                {downtimeData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">DT Total (Producción)</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {downtimeData.summary.totalDt.toFixed(2)} <span className="text-sm text-slate-400">min</span>
                      </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">DT Justificado (Tickets)</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">
                        {downtimeData.summary.totalTicketDt.toFixed(2)} <span className="text-sm text-slate-400">min</span>
                      </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">DT Sin Justificar</p>
                      <p className="text-2xl font-bold text-red-400 mt-1">
                        {downtimeData.summary.totalAdjustedDt.toFixed(2)} <span className="text-sm text-slate-400">min</span>
                      </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium">Tickets Totales</p>
                      <p className="text-2xl font-bold text-purple-400 mt-1">
                        {downtimeData.summary.totalTickets}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bar Chart */}
                {downtimeData && downtimeData.intervals.length > 0 && (
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h3 className="text-sm font-semibold text-slate-100 mb-4">DT vs Tickets por Intervalo</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={downtimeData.intervals.map(i => ({
                        name: `${i.inicio?.substring(0, 5) || ''}-${i.final?.substring(0, 5) || ''}`,
                        'DT Producción': i.dt,
                        'Tickets': i.ticketDeadtimeMin,
                        'DT Ajustado': i.adjustedDt
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                        <Legend />
                        <Bar dataKey="DT Producción" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Tickets" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="DT Ajustado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Table */}
                {downtimeData && (
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
                    <h3 className="text-sm font-semibold text-slate-100 mb-4">Detalle por Intervalo Horario</h3>
                    {downtimeData.intervals.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500">No hay registros de producción para esta línea y fecha</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left text-slate-400 font-medium py-2 px-3">Hora</th>
                              <th className="text-left text-slate-400 font-medium py-2 px-3">Modelo</th>
                              <th className="text-right text-slate-400 font-medium py-2 px-3">Cap</th>
                              <th className="text-right text-slate-400 font-medium py-2 px-3">Prod</th>
                              <th className="text-right text-slate-400 font-medium py-2 px-3">Delta</th>
                              <th className="text-right text-slate-400 font-medium py-2 px-3">DT (min)</th>
                              <th className="text-right text-cyan-400 font-medium py-2 px-3">Tickets (min)</th>
                              <th className="text-right text-red-400 font-medium py-2 px-3">DT Ajustado</th>
                              <th className="text-center text-slate-400 font-medium py-2 px-3">Tickets</th>
                              <th className="text-center text-slate-400 font-medium py-2 px-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {downtimeData.intervals.map((interval, idx) => (
                              <React.Fragment key={interval.id || idx}>
                                <tr
                                  className={`border-b border-slate-700/50 transition-colors ${interval.ticketCount > 0 ? 'cursor-pointer hover:bg-slate-700/50' : ''} ${downtimeExpandedRow === idx ? 'bg-slate-700/30' : ''}`}
                                  onClick={() => {
                                    if (interval.ticketCount > 0) {
                                      setDowntimeExpandedRow(downtimeExpandedRow === idx ? null : idx)
                                    }
                                  }}
                                >
                                  <td className="py-2 px-3 text-slate-200 font-mono text-xs">
                                    {interval.inicio?.substring(0, 5)} - {interval.final?.substring(0, 5)}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 text-xs">{interval.modelo || '-'}</td>
                                  <td className="py-2 px-3 text-right text-slate-300">{interval.capacidad || 0}</td>
                                  <td className="py-2 px-3 text-right text-slate-300">{interval.produccion || 0}</td>
                                  <td className="py-2 px-3 text-right text-slate-300">{interval.delta || 0}</td>
                                  <td className="py-2 px-3 text-right text-yellow-300 font-medium">{interval.dt.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right text-cyan-400 font-medium">{interval.ticketDeadtimeMin.toFixed(2)}</td>
                                  <td className={`py-2 px-3 text-right font-bold ${interval.adjustedDt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {interval.adjustedDt.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {interval.ticketCount > 0 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-900/50 text-cyan-300 text-xs font-bold">
                                        {interval.ticketCount}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {interval.ticketCount > 0 && (
                                      <svg className={`w-4 h-4 text-slate-400 transition-transform inline-block ${downtimeExpandedRow === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )}
                                  </td>
                                </tr>
                                {/* Expanded ticket details */}
                                {downtimeExpandedRow === idx && interval.ticketCount > 0 && (
                                  <tr>
                                    <td colSpan={10} className="p-0">
                                      <div className="bg-slate-900/60 border-l-4 border-cyan-500 mx-2 my-1 rounded-lg p-4">
                                        <h4 className="text-cyan-300 text-xs font-semibold mb-3 flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                          </svg>
                                          Tickets en este intervalo ({interval.inicio?.substring(0, 5)} - {interval.final?.substring(0, 5)})
                                        </h4>
                                        <div className="space-y-2">
                                          {interval.tickets.map(t => (
                                            <div
                                              key={t.id}
                                              className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-700/60 transition-colors"
                                              onClick={(e) => { e.stopPropagation(); openViewModal(t.id); }}
                                            >
                                              <div className="flex justify-between items-start flex-wrap gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-mono text-slate-500">#{t.id}</span>
                                                    <span className="text-sm font-medium text-slate-200">{t.equipo || 'Sin equipo'}</span>
                                                    {t.clasificacion && (
                                                      <span className="px-2 py-0.5 rounded text-xs bg-purple-900/40 text-purple-300">{t.clasificacion}</span>
                                                    )}
                                                    <span className="text-xs text-cyan-400 ml-auto flex items-center gap-1">
                                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                      </svg>
                                                      Ver detalle
                                                    </span>
                                                  </div>
                                                  <p className="text-xs text-slate-400 mt-1 truncate">{t.descr || 'Sin descripción'}</p>
                                                  {t.solucion && <p className="text-xs text-slate-500 mt-1 truncate">Solución: {t.solucion}</p>}
                                                  <div className="flex gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                                                    <span>Abierto: {t.hr ? new Date(t.hr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                    <span>Cerrado: {t.hc ? new Date(t.hc).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                    {t.tecnico && <span>Técnico: {t.tecnico}</span>}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <p className="text-sm font-bold text-cyan-400">{parseFloat(t.deadtime || 0).toFixed(2)} min</p>
                                                  {t.piezas > 0 && <p className="text-xs text-slate-500">{t.piezas} pzas perdidas</p>}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                          {/* Totals row */}
                          <tfoot>
                            <tr className="border-t-2 border-slate-600">
                              <td colSpan={5} className="py-2 px-3 text-right text-slate-300 font-semibold">Totales:</td>
                              <td className="py-2 px-3 text-right text-yellow-300 font-bold">{downtimeData.summary.totalDt.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-cyan-400 font-bold">{downtimeData.summary.totalTicketDt.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-red-400 font-bold">{downtimeData.summary.totalAdjustedDt.toFixed(2)}</td>
                              <td className="py-2 px-3 text-center text-purple-400 font-bold">{downtimeData.summary.totalTickets}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!downtimeData && !downtimeLoading && (
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-8 text-center">
                    <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-400">Selecciona una línea y fecha para ver el análisis de downtime</p>
                    <p className="text-slate-500 text-sm mt-1">Compara el DT de producción contra los tickets registrados</p>
                  </div>
                )}

                {/* Loading state */}
                {downtimeLoading && (
                  <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-red-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando análisis de downtime...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showProduccion && (
          <ProduccionSection onClose={() => { setShowProduccion(false); resetFilters() }} />
        )}

        {showDisplay && !displayLineaSelected && (
          <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Modo Visualización</h2>
              </div>
              <button onClick={() => setShowDisplay(false)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-300 text-sm">Selecciona una línea para mostrar el modo visualización:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {lineas.map(linea => (
                  <button
                    key={linea.id}
                    onClick={() => setDisplayLineaSelected(linea.linea)}
                    className="bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 group"
                  >
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Línea {linea.linea}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDisplay && displayLineaSelected && (
          <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={async () => {
                  try {
                    // Deactivate display in database (all other devices will detect via polling)
                    await setDisplayMode(displayLineaSelected, false)
                  } catch (error) {
                    console.error('Error deactivating display:', error)
                  }
                  setShowDisplay(false)
                  setDisplayLineaSelected('')
                }}
                className="w-10 h-10 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              <DisplayVisualization linea={displayLineaSelected} mantenimientoActivo={mantenimientoActivo} cambioModeloActivo={cambioModeloActivo} auditoriaActivo={auditoriaActivo} />
            </div>
          </div>
        )}


      </div>

      <LoginModal visible={showCredentialsModal} onClose={() => setShowCredentialsModal(false)} onConfirm={handleCredentialsConfirm} busy={credentialsBusy} />

      {/* Modal para Manejar Ticket */}
      {showHandleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Manejar Ticket #{selectedTicketId}</h2>
                  <p className="text-slate-400 text-sm">Atender y cerrar ticket</p>
                </div>
              </div>
              <button onClick={closeHandleModal} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {ticketLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-slate-400"></div>
                  <p className="text-slate-400 mt-4">Cargando ticket...</p>
                </div>
              ) : selectedTicket ? (
                <div className="space-y-5">
                  {/* Info del ticket */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Línea</p>
                      <p className="text-white font-semibold">Línea {selectedTicket.linea}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Modelo</p>
                      <p className="text-white font-semibold">{selectedTicket.modelo}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Equipo</p>
                      <p className="text-white font-semibold">{selectedTicket.equipo}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Rate</p>
                      <p className="text-white font-semibold">{selectedTicket.rate || 'N/A'} pzs/hr</p>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Descripción del problema</p>
                    <p className="text-white font-medium mt-1">{selectedTicket.descr}</p>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Reportado por</p>
                    <p className="text-white">{selectedTicket.nombre} - {selectedTicket.hr ? new Date(selectedTicket.hr).toLocaleString('es-MX') : ''}</p>
                  </div>

                  {/* Estado del técnico */}
                  {selectedTicket.tecnico ? (
                    <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">En atención</span>
                      </div>
                      <p className="text-slate-300 text-sm">Técnico: {selectedTicket.tecnico}</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartTicket}
                      className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Tomar Ticket
                    </button>
                  )}

                  {/* Formulario de solución (solo si hay técnico asignado) */}
                  {selectedTicket.tecnico && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Solución aplicada *</label>
                        <textarea
                          className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          placeholder="Describe la solución aplicada al problema..."
                          value={handleForm.solucion}
                          onChange={e => setHandleForm({ ...handleForm, solucion: e.target.value })}
                        />
                      </div>

                      <button
                        onClick={handleFinishTicket}
                        disabled={!handleForm.solucion}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Cerrar Ticket
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No se pudo cargar el ticket</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para credenciales de técnico */}
      <LoginModal
        visible={handleCredentialsModal}
        onClose={() => setHandleCredentialsModal(false)}
        onConfirm={handleTicketCredentialsConfirm}
        busy={handleCredentialsBusy}
      />

      {/* Modal para credenciales de edición */}
      <LoginModal
        visible={editCredentialsNeeded}
        onClose={() => setEditCredentialsNeeded(false)}
        onConfirm={confirmEditWithCredentials}
        busy={editLoading}
        title="Confirmar edición"
        subtitle="Ingresa tus credenciales para confirmar los cambios"
      />

      {/* Modal para Ver Ticket */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ticket #{selectedTicketId}</h2>
                  <p className="text-slate-400 text-sm">Detalles del ticket cerrado</p>
                </div>
              </div>
              <button onClick={closeViewModal} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {ticketLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-slate-400"></div>
                  <p className="text-slate-400 mt-4">Cargando ticket...</p>
                </div>
              ) : selectedTicket ? (
                <div className="space-y-5">
                  {/* Metricas principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs">Duracion</p>
                      <p className="text-xl font-bold text-white">{formatHoras(minutosAHoras(selectedTicket.duracion_minutos || calcularMinutos(selectedTicket.hr, selectedTicket.hc) || 0))} hrs</p>
                    </div>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs">Piezas Perdidas</p>
                      <p className="text-xl font-bold text-white">{selectedTicket.piezas || 0}</p>
                    </div>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs">Deadtime</p>
                      <p className="text-xl font-bold text-white">{formatMinutes(selectedTicket.deadtime)}</p>
                    </div>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs">Linea</p>
                      <p className="text-xl font-bold text-white">{selectedTicket.linea}</p>
                    </div>
                  </div>

                  {/* Info del equipo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Modelo</p>
                      <p className="text-white font-semibold">{selectedTicket.modelo}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Equipo</p>
                      <p className="text-white font-semibold">{selectedTicket.equipo}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Sección Afectada</p>
                      <p className="text-white font-semibold">{selectedTicket.pa || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Condición de Paro</p>
                      <p className="text-white font-semibold">{selectedTicket.pf || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Montadoras afectadas - Mostrar solo si es NXT */}
                  {selectedTicket.equipo === 'NXT' && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                      <p className="text-cyan-300 text-xs font-medium mb-3">Montadoras Afectadas</p>
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                          <div key={i} className={`flex items-center justify-center py-2 rounded text-sm font-medium ${selectedTicket[`mod${i}`] ? 'bg-cyan-500/40 text-cyan-300 border border-cyan-500/60' : 'bg-slate-700/30 text-slate-500 border border-slate-600/30'
                            }`}>
                            M{i}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Descripción del problema</p>
                    <p className="text-white font-medium mt-1">{selectedTicket.descr}</p>
                  </div>

                  {selectedTicket.clasificacion && (
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Clasificación</p>
                      <p className="text-white">{selectedTicket.clasificacion}</p>
                    </div>
                  )}

                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                    <p className="text-emerald-400 text-xs font-medium mb-1">Solución aplicada</p>
                    <p className="text-white">{selectedTicket.solucion || 'Sin solución registrada'}</p>
                  </div>

                  {/* Tiempos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Apertura</p>
                      <p className="text-white text-sm">{selectedTicket.hr ? new Date(selectedTicket.hr).toLocaleString('es-MX') : 'N/A'}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Cierre</p>
                      <p className="text-white text-sm">{selectedTicket.hc ? new Date(selectedTicket.hc).toLocaleString('es-MX') : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Personal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Reportado por</p>
                      <p className="text-white">{selectedTicket.nombre}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Técnico</p>
                      <p className="text-white">{selectedTicket.tecnico || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={openEditModal}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mt-6"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar Ticket
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No se pudo cargar el ticket</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Editar Ticket #{editForm.id}</h2>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                  ✓ Ticket actualizado exitosamente
                </div>
              )}

              {editLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-slate-400"></div>
                  <p className="text-slate-400 mt-2">Guardando cambios...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Descripción</label>
                    <input
                      type="text"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={editForm.descr}
                      onChange={e => setEditForm({ ...editForm, descr: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Modelo</label>
                    <select
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={editForm.modelo}
                      onChange={e => setEditForm({ ...editForm, modelo: e.target.value })}
                    >
                      <option value="">Seleccionar modelo...</option>
                      {modelos.map(m => (
                        <option key={m.modelo} value={m.modelo}>{m.modelo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Equipo</label>
                    <select
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={editForm.equipo}
                      onChange={e => setEditForm({ ...editForm, equipo: e.target.value })}
                    >
                      <option value="">Seleccionar equipo...</option>
                      {equipos.map(eq => (
                        <option key={eq.equipo} value={eq.equipo}>{eq.equipo}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Hora de Apertura</label>
                      <input
                        type="datetime-local"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={editForm.hr}
                        onChange={e => setEditForm({ ...editForm, hr: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Hora de Cierre</label>
                      <input
                        type="datetime-local"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={editForm.hc}
                        onChange={e => setEditForm({ ...editForm, hc: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Solución</label>
                    <textarea
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      rows="3"
                      value={editForm.solucion}
                      onChange={e => setEditForm({ ...editForm, solucion: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-700">
                    <button
                      onClick={saveEditTicket}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      disabled={editLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Cambios
                    </button>
                    <button
                      onClick={closeEditModal}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      disabled={editLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfiguration && (
        <Configuration
          onBack={() => setShowConfiguration(false)}
        />
      )}

      {showMantenimiento && (
        <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.25 3h11.5A2.25 2.25 0 0120 5.25v13.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V5.25A2.25 2.25 0 015.25 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Mantenimiento</h2>
            </div>
            <button onClick={() => setShowMantenimiento(false)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Selecciona las líneas en mantenimiento:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lineas.map(linea => (
                <button
                  key={`mant-${linea.id}`}
                  onClick={() => handleMantenimientoToggle(linea.linea, mantenimientoActivo[linea.linea])}
                  className={`border-2 font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 group ${mantenimientoActivo[linea.linea]
                      ? 'bg-blue-900/40 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white'
                    }`}
                >
                  <svg className={`w-5 h-5 transition-colors ${mantenimientoActivo[linea.linea] ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Línea {linea.linea}</span>
                  {mantenimientoActivo[linea.linea] && (
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded-full mt-1">Activo</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCambioModelo && (
        <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Cambio de Modelo</h2>
            </div>
            <button onClick={() => setShowCambioModelo(false)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Selecciona las líneas en cambio de modelo:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lineas.map(linea => (
                <button
                  key={`cambio-${linea.id}`}
                  onClick={() => handleCambioModeloToggle(linea.linea, cambioModeloActivo[linea.linea])}
                  className={`border-2 font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 group ${cambioModeloActivo[linea.linea]
                      ? 'bg-amber-900/40 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white'
                    }`}
                >
                  <svg className={`w-5 h-5 transition-colors ${cambioModeloActivo[linea.linea] ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Línea {linea.linea}</span>
                  {cambioModeloActivo[linea.linea] && (
                    <span className="text-xs bg-amber-600 px-2 py-1 rounded-full mt-1">Activo</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAuditoria && (
        <div className="glass-card rounded-2xl shadow-2xl p-5 sm:p-8 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Auditoría</h2>
            </div>
            <button onClick={() => setShowAuditoria(false)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Selecciona las líneas en auditoría:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lineas.map(linea => (
                <button
                  key={`auditoria-${linea.id}`}
                  onClick={() => handleAuditoriaToggle(linea.linea, auditoriaActivo[linea.linea])}
                  className={`border-2 font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 group ${auditoriaActivo[linea.linea]
                      ? 'bg-purple-900/40 border-purple-500 text-purple-200 shadow-lg shadow-purple-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white'
                    }`}
                >
                  <svg className={`w-5 h-5 transition-colors ${auditoriaActivo[linea.linea] ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>Línea {linea.linea}</span>
                  {auditoriaActivo[linea.linea] && (
                    <span className="text-xs bg-purple-600 px-2 py-1 rounded-full mt-1">Activo</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-5 py-4 rounded-xl shadow-2xl z-50 border border-emerald-400/30 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-semibold">Ticket creado exitosamente</span>
          </div>
        </div>
      )}

      {/* Reporte Diario Progress Modal */}
      {showSpecialExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-violet-500/40 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-900/50 border border-violet-500/50 flex items-center justify-center">
              {specialExportLoading ? (
                <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Reporte Diario</h3>
            <p className="text-slate-400 text-sm">Todas las líneas · Separado por día</p>
            <p className="text-violet-300 text-sm mt-4 font-medium min-h-[20px]">{specialExportProgress}</p>
            {!specialExportLoading && (
              <button
                onClick={() => setShowSpecialExportModal(false)}
                className="mt-5 px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
