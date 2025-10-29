import React, { useEffect, useState } from 'react'
import { listTickets, createTicket, getLineas, getDescripciones, getEquipos, getModelos, getStatsAtencion, getStatsEquipos, login } from '../api_deadtimes'
import LoginModal from '../components/LoginModal'

export default function Home() {
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
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

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [])

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

  function toggleNew() {
    setShowNew(!showNew)
    setShowOpen(false)
    setShowClosed(false)
  }

  function toggleOpen() {
    if (!showOpen) {
      setStatus('open')
      loadTickets('open')
    }
    setShowOpen(!showOpen)
    setShowNew(false)
    setShowClosed(false)
  }

  function toggleClosed() {
    if (!showClosed) {
      setStatus('closed')
      loadTickets('closed')
    }
    setShowClosed(!showClosed)
    setShowNew(false)
    setShowOpen(false)
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
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 border-l-4 border-slate-600 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-semibold text-slate-100">Deadtimes Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Sistema de gestión de tiempos muertos</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button onClick={toggleNew} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showNew ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-emerald-900/20 hover:border-emerald-700/30'}`}>
            + Nuevo Ticket
          </button>
          <button onClick={toggleOpen} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showOpen ? 'bg-amber-900/40 border-amber-700/50 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-amber-900/20 hover:border-amber-700/30'}`}>
            Tickets Abiertos
          </button>
          <button onClick={toggleClosed} className={`font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg border transition-all text-sm sm:text-base ${showClosed ? 'bg-blue-900/40 border-blue-700/50 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-900/20 hover:border-blue-700/30'}`}>
            Tickets Cerrados
          </button>
        </div>

        {!showNew && !showOpen && !showClosed && (
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
