import React, { useEffect, useState, useRef } from 'react'
import { getDisplayTickets, getEstado } from '../api_deadtimes'

// Convertir minutos a formato H:MM h (e.g. 90 → "1:30 h")
function formatMinutes(mins) {
  if (mins === null || mins === undefined) return 'N/A';
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}:${String(m).padStart(2, '0')} h`;
}

export default function DisplayVisualization({ linea, mantenimientoActivo = {}, cambioModeloActivo = {}, auditoriaActivo = {} }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [mantenimientoActualizado, setMantenimientoActualizado] = useState(false)
  const [cambioModeloActualizado, setCambioModeloActualizado] = useState(false)
  const [auditoriaActualizado, setAuditoriaActualizado] = useState(false)
  const [idioma, setIdioma] = useState(0) // 0: Español, 1: English, 2: 한국어
  const [prevTickets, setPrevTickets] = useState([])
  const [newTicketIds, setNewTicketIds] = useState(new Set())
  const audioRef = useRef(null)

  const mensajes = {
    mantenimiento: ['MANTENIMIENTO', 'MAINTENANCE', '유지보수'],
    cambio: ['CAMBIO DE MODELO', 'MODEL CHANGE', '모델 변경'],
    auditoria: ['AUDITORÍA', 'AUDIT', '감사'],
    linea: ['Línea', 'Line', '라인']
  }

  // Función para determinar el color según la duración
  const getTimeColor = (duracionMinutos) => {
    if (!duracionMinutos) return 'bg-neutral-950 text-neutral-200'
    const mins = Math.round(duracionMinutos)
    if (mins <= 15) return 'bg-neutral-800 border border-neutral-700 text-neutral-200'
    if (mins <= 30) return 'bg-neutral-700 border border-neutral-600 text-white font-medium'
    return 'bg-white text-black font-bold shadow-md shadow-white/20'
  }

  // Detectar cambio en estado y reproducir/detener sonido
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sonido.mp3')
    }

    if (cambioModeloActualizado) {
      // Cambio de modelo activado: reproducir sonido en loop
      audioRef.current.loop = true
      audioRef.current.play().catch(err => console.error('Error reproduciendo sonido:', err))
    } else {
      // Cambio de modelo desactivado: detener sonido
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [cambioModeloActualizado])

  // Auto-refresh cada 5 segundos para tickets
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCount(c => c + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Verificar estados cada 3 segundos
  useEffect(() => {
    if (!linea) return

    const checkEstado = async () => {
      try {
        const data = await getEstado(linea)
        if (data.success && data.estado) {
          setMantenimientoActualizado(Boolean(data.estado.mantenimiento))
          setCambioModeloActualizado(Boolean(data.estado.cambio_modelo))
          setAuditoriaActualizado(Boolean(data.estado.auditoria))
        }
      } catch (err) {
        console.error('Error verificando estado:', err)
      }
    }

    // Cargar estado inicial
    checkEstado()

    // Intervalos para verificar cambios
    const interval = setInterval(checkEstado, 3000)
    return () => clearInterval(interval)
  }, [linea])

  // Rotación de idiomas cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setIdioma(prev => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true)
        const data = await getDisplayTickets(linea)
        if (data.success) {
          const newTickets = data.ticketsActivos || []
          
          // Detectar nuevos tickets
          const prevIds = new Set(prevTickets.map(t => t.id))
          const newIds = newTickets.map(t => t.id)
          const addedIds = newIds.filter(id => !prevIds.has(id))
          
          // Actualizar lista de tickets nuevos
          const updated = new Set(newTicketIds)
          addedIds.forEach(id => updated.add(id))
          
          // Limpiar tickets nuevos después de 1 segundo
          setTimeout(() => {
            updated.forEach(id => updated.delete(id))
            setNewTicketIds(new Set(updated))
          }, 1000)
          
          setNewTicketIds(updated)
          setTickets(newTickets)
          setPrevTickets(newTickets)
          setError(null)
        } else {
          setError(data.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [linea, refreshCount])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-900">
        <div className="text-white text-2xl text-center">
          <p className="mb-4">Error</p>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-4 relative">
      {/* Overlay de Mantenimiento */}
      {mantenimientoActualizado && (
        <div className="animate-pulse-white fixed inset-0 bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl flex items-center justify-center z-40 pointer-events-none rounded-lg">
          <div className="text-center">
            <p className="text-5xl font-black text-white drop-shadow-2xl tracking-widest transition-all duration-500">{mensajes.mantenimiento[idioma]}</p>
            <p className="text-2xl text-neutral-200 mt-4 drop-shadow-lg">{mensajes.linea[idioma]} {linea}</p>
          </div>
        </div>
      )}

      {/* Overlay de Cambio de Modelo */}
      {cambioModeloActualizado && (
        <div className="animate-pulse-white fixed inset-0 bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl flex items-center justify-center z-40 pointer-events-none rounded-lg">
          <div className="text-center">
            <p className="text-5xl font-black text-white drop-shadow-2xl tracking-widest transition-all duration-500">{mensajes.cambio[idioma]}</p>
            <p className="text-2xl text-neutral-200 mt-4 drop-shadow-lg">{mensajes.linea[idioma]} {linea}</p>
          </div>
        </div>
      )}

      {/* Overlay de Auditoría */}
      {auditoriaActualizado && (
        <div className="animate-pulse-white fixed inset-0 bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl flex items-center justify-center z-40 pointer-events-none rounded-lg">
          <div className="text-center">
            <p className="text-5xl font-black text-white drop-shadow-2xl tracking-widest transition-all duration-500">{mensajes.auditoria[idioma]}</p>
            <p className="text-2xl text-neutral-200 mt-4 drop-shadow-lg">{mensajes.linea[idioma]} {linea}</p>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Línea: {linea}</h1>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <p className="text-neutral-300">Activos: {tickets.length}</p>
          <p className="text-neutral-400">{new Date().toLocaleTimeString('es-MX')}</p>
        </div>
      </div>

      {/* Grid de Tickets */}
      {tickets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-neutral-300 text-2xl">Sin tickets activos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {tickets.map(ticket => (
            <div 
              key={ticket.id} 
              className={`bg-neutral-900 border-2 border-neutral-700 rounded-lg p-2 sm:p-3 animate-fade-in-smooth hover:shadow-lg transition-all duration-300 ${
                newTicketIds.has(ticket.id) ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''
              }`}
            >
              {/* Equipo */}
              <div className="mb-2">
                <p className="text-neutral-400 text-xs font-semibold">EQUIPO</p>
                <p className="text-white text-sm font-bold truncate">{ticket.equipo}</p>
              </div>

              {/* Descripción */}
              <div className="mb-2">
                <p className="text-neutral-400 text-xs font-semibold">PROBLEMA</p>
                <p className="text-white text-xs line-clamp-2">{ticket.descr || 'N/A'}</p>
              </div>

              {/* Modelo */}
              <div className="mb-2">
                <p className="text-neutral-400 text-xs font-semibold">MODELO</p>
                <p className="text-white text-xs truncate">{ticket.modelo || 'N/A'}</p>
              </div>

              {/* Duración */}
              <div className={`mb-2 ${getTimeColor(ticket.duracion_minutos)} rounded p-1.5`}>
                <p className="text-neutral-300 text-xs">TIEMPO</p>
                <p className="text-lg font-bold">
                  {ticket.duracion_minutos ? formatMinutes(Math.round(ticket.duracion_minutos)) : 'Reciente'}
                </p>
              </div>

              {/* Clasificación */}
              {ticket.clasificacion && (
                <div className="mb-2">
                  <p className="text-neutral-400 text-xs font-semibold">CLASIF.</p>
                  <p className="text-white text-xs font-semibold truncate">{ticket.clasificacion}</p>
                </div>
              )}

              {/* Turno */}
              <div className="text-neutral-400 text-xs">
                T{ticket.turno}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
