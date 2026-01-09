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
  getStatsTotales,
  getTicket,
  startTicket,
  finishTicket,
  getTicketsByEquipment
} from '../api_deadtimes'
import LoginModal from '../components/LoginModal'
import ProduccionSection from '../components/ProduccionSection'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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

// Helper para formatear horas (ej: 1.5 hrs, 0.25 hrs)
function formatHoras(horas) {
  if (!horas && horas !== 0) return '0';
  return horas.toFixed(2);
}

export default function Home() {
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showProduccion, setShowProduccion] = useState(false)
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
  const [analyticsTab, setAnalyticsTab] = useState('general') // 'general' | 'maquinas' | 'horas'
  const [machineEquipo, setMachineEquipo] = useState('')
  const [machineLinea, setMachineLinea] = useState('')
  const [machineTickets, setMachineTickets] = useState([])
  
  // Estados para Análisis por Horas
  const [hourlyData, setHourlyData] = useState([])
  const [hourlyLoading, setHourlyLoading] = useState(false)
  const [machineLoading, setMachineLoading] = useState(false)
  const [machineDetailTicket, setMachineDetailTicket] = useState(null)
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

  async function loadTickets(statusToLoad = status) {
    setLoading(true)
    try {
      const data = await listTickets(statusToLoad)
      // Marcar sólo tickets nuevos para animación suave
      setTickets(prev => {
        const prevMap = new Map((prev || []).map(p => [p.id, p]))
        const enhanced = data.map(item => ({ ...item, _isNew: !prevMap.has(item.id) }))
        // Limpiar marca _isNew después de 1.5s
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
        throw new Error('No tienes permisos para cerrar tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Soporte, Mantenimiento.')
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
        const ticketDate = new Date(t.hc).getTime()
        // Si el filtro trae hora (datetime-local), respetarla; si sólo trae fecha, usar inicio del día
        const startDate = filterClosedStartDate.includes('T')
          ? new Date(filterClosedStartDate).getTime()
          : new Date(filterClosedStartDate).setHours(0, 0, 0, 0)
        if (ticketDate < startDate) return false
      }
      if (filterClosedEndDate && t.hc) {
        const ticketDate = new Date(t.hc).getTime()
        // Si el filtro trae hora (datetime-local), respetarla; si sólo trae fecha, usar fin del día
        const endDate = filterClosedEndDate.includes('T')
          ? new Date(filterClosedEndDate).getTime()
          : new Date(filterClosedEndDate).setHours(23, 59, 59, 999)
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

  function toggleProduccion() {
    setShowProduccion(!showProduccion)
    setShowNew(false)
    setShowOpen(false)
    setShowClosed(false)
    setShowAnalytics(false)
    resetFilters()
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <button onClick={toggleNew} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showNew ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
            <svg className={`w-6 h-6 transition-transform duration-300 ${showNew ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nuevo Ticket</span>
          </button>
          <button onClick={toggleOpen} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showOpen ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
            <svg className={`w-6 h-6 transition-transform duration-300 ${showOpen ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Abiertos</span>
          </button>
          <button onClick={toggleClosed} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showClosed ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
            <svg className={`w-6 h-6 transition-transform duration-300 ${showClosed ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Cerrados</span>
          </button>
          <button onClick={toggleAnalytics} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showAnalytics ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
            <svg className={`w-6 h-6 transition-transform duration-300 ${showAnalytics ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics</span>
          </button>
          <button onClick={toggleProduccion} className={`group relative font-semibold py-4 px-5 rounded-xl border transition-all duration-300 text-sm flex flex-col items-center gap-2 ${showProduccion ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white'}`}>
            <svg className={`w-6 h-6 transition-transform duration-300 ${showProduccion ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Producción</span>
          </button>
        </div>

        {!showNew && !showOpen && !showClosed && !showAnalytics && !showProduccion && (
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
                    <h2 className="text-lg font-bold text-white">Tiempos de Atención</h2>
                    <p className="text-slate-400 text-xs">Promedio últimos 30 días</p>
                  </div>
                </div>
                <span className="badge badge-blue">30 días</span>
              </div>
              <div className="space-y-3">
                {Array.isArray(statsAtencion) && statsAtencion.slice(0, 10).map((stat, idx) => {
                  const maxHoras = Math.max(...statsAtencion.map(s => minutosAHoras(s.promedio_minutos)), 0.01)
                  const horasValue = minutosAHoras(stat.promedio_minutos)
                  const widthPercent = (horasValue / maxHoras) * 100
                  return (
                    <div key={idx} className="flex items-center gap-3 group">
                      <span className="text-slate-500 text-xs w-5 font-bold">#{idx + 1}</span>
                      <span className="text-slate-400 text-xs w-16 font-medium">{new Date(stat.fecha).toLocaleDateString('es', {month: 'short', day: 'numeric'})}</span>
                      <div className="flex-1 bg-slate-700/50 rounded-full h-7 relative overflow-hidden">
                        <div 
                          className="bg-cyan-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out" 
                          style={{ width: `${Math.max(widthPercent, 20)}%` }}
                        >
                          <span className="text-white text-xs font-bold drop-shadow">{formatHoras(horasValue)}</span>
                        </div>
                      </div>
                      <span className="text-slate-300 font-semibold text-xs w-16 text-right">{formatHoras(horasValue)} hrs</span>
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
                    <p className="text-slate-400 font-medium">No hay datos disponibles</p>
                    <p className="text-slate-500 text-xs mt-1">Los datos aparecerán cuando se cierren tickets</p>
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
                    <h2 className="text-lg font-bold text-white">Equipos con Más Fallas</h2>
                    <p className="text-slate-400 text-xs">Top 10 últimos 30 días</p>
                  </div>
                </div>
                <span className="badge badge-red">Top 10</span>
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
                    <p className="text-slate-400 font-medium">No hay datos disponibles</p>
                    <p className="text-slate-500 text-xs mt-1">Los datos aparecerán cuando se cierren tickets</p>
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
                <h2 className="text-xl font-bold text-white">Crear Nuevo Ticket</h2>
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
                  <h3 className="text-sm font-semibold text-white">Información de Línea y Modelo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className={inputClass(form.linea)} value={form.linea} onChange={handleLineaChange} required>
                    <option value="">Seleccionar Línea *</option>
                    {lineas.map(lin => <option key={lin.id} value={lin.linea}>Línea {lin.linea}</option>)}
                  </select>

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
                
                {selectedModelo && (
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Rate del modelo (automático)</p>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-slate-300 font-semibold">{selectedModelo.rate || 'N/A'} piezas/hr</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 2: Equipo y Descripción */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.linea && form.modelo ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.linea && form.modelo ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>2</span>
                  <h3 className="text-sm font-semibold text-white">Información del Equipo</h3>
                </div>
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

              {/* Sección 3: Condiciones de Paro */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.equipo && form.descr && (form.descr !== '__OTROS__' || form.descr_otros) ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.equipo && form.descr && (form.descr !== '__OTROS__' || form.descr_otros) ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>3</span>
                  <h3 className="text-sm font-semibold text-white">Condiciones de Paro</h3>
                </div>
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

              {/* Sección 4: Clasificación */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.pf && form.pa ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.pf && form.pa ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>4</span>
                  <h3 className="text-sm font-semibold text-white">Clasificación</h3>
                </div>
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

              {/* Sección 5: Montadoras */}
              <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all duration-300 ${form.equipo === 'NXT' && form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others) ? 'border-slate-700/50' : 'border-slate-700/30 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${form.equipo === 'NXT' ? 'bg-slate-500 text-white' : 'bg-slate-600 text-slate-400'}`}>5</span>
                  <h3 className="text-sm font-semibold text-white">Montadoras Afectadas {form.equipo === 'NXT' ? '' : '(Solo NXT)'}</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <label key={i} className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${form.mods[`Montadora${i}`] ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'} ${form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others)) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="checkbox" className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-emerald-500" checked={form.mods[`Montadora${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`Montadora${i}`]: e.target.checked}})} disabled={form.equipo !== 'NXT' || !(form.clasificacion && (form.clasificacion !== 'Otros' || form.clas_others))} />
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
                          {t.nombre} • {new Date(t.hr).toLocaleString('es', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
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
                  disabled={getFilteredClosedTickets().length === 0}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors border border-slate-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  const duracionHrs = calcularHoras(t.hr, t.hc)
                  return (
                    <div key={t.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-650 transition-all border-l-4 border-slate-500">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-100 font-semibold text-sm sm:text-base">#{t.id} - {t.descr}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm mt-1">Linea {t.linea} - {t.modelo} - {t.equipo}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Cerrado: {new Date(t.hc).toLocaleString('es', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} - {t.tecnico}
                          </p>
                          {duracionHrs !== null && (
                            <p className="text-slate-300 text-xs mt-1 font-medium">
                              Duracion: {formatHoras(duracionHrs)} hrs
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
                      formatter={(value) => [formatHoras(value) + ' hrs', 'Tiempo Promedio']}
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
                      <p className="text-slate-400 text-xs mt-1">{formatHoras(turno.horas)} hrs totales</p>
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
                          formatter={(value) => [formatHoras(value) + ' hrs', 'Horas Downtime']}
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
                          formatter={(value) => [formatHoras(value) + ' hrs', 'Promedio']}
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
                    <div className="mt-4 flex justify-end">
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
                              <p className="text-slate-400 text-xs mb-1">Línea</p>
                              <p className="text-white font-semibold">Línea {machineDetailTicket.linea}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Modelo</p>
                              <p className="text-white font-semibold">{machineDetailTicket.modelo}</p>
                            </div>
                          </div>

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
          </div>
        )}

        {showProduccion && (
          <ProduccionSection onClose={() => { setShowProduccion(false); resetFilters() }} />
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
                          onChange={e => setHandleForm({...handleForm, solucion: e.target.value})}
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
                      <p className="text-xl font-bold text-white">{selectedTicket.deadtime || 0}</p>
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
                  </div>

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
                      onChange={e => setEditForm({...editForm, descr: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Modelo</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={editForm.modelo}
                      onChange={e => setEditForm({...editForm, modelo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Equipo</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={editForm.equipo}
                      onChange={e => setEditForm({...editForm, equipo: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Hora de Apertura</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={editForm.hr}
                        onChange={e => setEditForm({...editForm, hr: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Hora de Cierre</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={editForm.hc}
                        onChange={e => setEditForm({...editForm, hc: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Solución</label>
                    <textarea 
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      rows="3"
                      value={editForm.solucion}
                      onChange={e => setEditForm({...editForm, solucion: e.target.value})}
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
    </div>
  )
}
