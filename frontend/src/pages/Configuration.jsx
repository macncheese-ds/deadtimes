import React, { useState, useEffect } from 'react'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import LoginModal from '../components/LoginModal'
import {
  login,
  getConfigEquipos,
  createConfigEquipo,
  updateConfigEquipo,
  deleteConfigEquipo,
  getConfigLineas,
  createConfigLinea,
  updateConfigLinea,
  deleteConfigLinea,
  getConfigModelos,
  createConfigModelo,
  updateConfigModelo,
  deleteConfigModelo
} from '../api_deadtimes'

export default function Configuration({ onBack }) {
  const [activeTab, setActiveTab] = useState('equipos')
  const [currentCredentials, setCurrentCredentials] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [inactivityWarning, setInactivityWarning] = useState(false)
  
  // Hook para detectar inactividad y cerrar sesión después de 2 minutos
  useInactivityTimeout(() => {
    setCurrentCredentials(null)
    setAuthError('')
    setInactivityWarning(true)
    setTimeout(() => setInactivityWarning(false), 5000)
  }, 2)
  
  // Estado para Equipos
  const [equipos, setEquipos] = useState([])
  const [equiposLoading, setEquiposLoading] = useState(false)
  const [newEquipo, setNewEquipo] = useState('')
  const [editingEquipo, setEditingEquipo] = useState(null)
  const [editingEquipoValue, setEditingEquipoValue] = useState('')
  const [equipoMessage, setEquipoMessage] = useState('')
  
  // Estado para Líneas
  const [lineas, setLineas] = useState([])
  const [lineasLoading, setLineasLoading] = useState(false)
  const [newLinea, setNewLinea] = useState('')
  const [editingLinea, setEditingLinea] = useState(null)
  const [editingLineaValue, setEditingLineaValue] = useState('')
  const [lineaMessage, setLineaMessage] = useState('')
  
  // Estado para Modelos
  const [modelos, setModelos] = useState([])
  const [modelosLoading, setModelosLoading] = useState(false)
  const [newModelo, setNewModelo] = useState('')
  const [editingModelo, setEditingModelo] = useState(null)
  const [editingModeloData, setEditingModeloData] = useState(null)
  const [modeloMessage, setModeloMessage] = useState('')
  const [allLineas, setAllLineas] = useState([])  // Para dropdown en modelos

  // Limpiar todos los modales al desmontar el componente
  useEffect(() => {
    return () => {
      setShowCredentialsModal(false)
      setEditingEquipo(null)
      setEditingLinea(null)
      setEditingModelo(null)
      setActiveTab('equipos')
    }
  }, [])

  // Crear un wrapper para onBack que limpie los estados antes de volver
  const handleBack = () => {
    setShowCredentialsModal(false)
    setEditingEquipo(null)
    setEditingLinea(null)
    setEditingModelo(null)
    setActiveTab('equipos')
    setCurrentCredentials(null)
    setAuthError('')
    onBack()
  }

  // Cargar datos al cambiar de tab
  useEffect(() => {
    if (activeTab === 'equipos') {
      loadEquipos()
    } else if (activeTab === 'lineas') {
      loadLineas()
    } else if (activeTab === 'modelos') {
      loadModelos()
      loadAllLineas()
    }
  }, [activeTab])

  // Cargar todas las líneas para dropdown (usado en modelos)
  const loadAllLineas = async () => {
    try {
      const data = await getConfigLineas()
      setAllLineas(data || [])
    } catch (err) {
      console.error('Error cargando líneas:', err)
    }
  }

  // ============================================================================
  // EQUIPOS
  // ============================================================================

  const loadEquipos = async () => {
    setEquiposLoading(true)
    try {
      const data = await getConfigEquipos()
      setEquipos(data || [])
    } catch (err) {
      console.error('Error cargando equipos:', err)
      setEquipoMessage('Error al cargar equipos')
    } finally {
      setEquiposLoading(false)
    }
  }

  const handleAddEquipo = async () => {
    if (!newEquipo.trim()) {
      setEquipoMessage('Por favor ingresa un nombre de equipo')
      return
    }

    try {
      const payload = { equipo: newEquipo.trim() }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await createConfigEquipo(payload)
      setEquipos([...equipos, result.data].sort((a, b) => a.equipo.localeCompare(b.equipo)))
      setNewEquipo('')
      setEquipoMessage('Equipo creado exitosamente')
      setTimeout(() => setEquipoMessage(''), 3000)
    } catch (err) {
      setEquipoMessage('Error al crear equipo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleEditEquipo = (equipo) => {
    setEditingEquipo(equipo.id)
    setEditingEquipoValue(equipo.equipo)
  }

  const handleSaveEquipo = async () => {
    if (!editingEquipoValue.trim()) {
      setEquipoMessage('Por favor ingresa un nombre de equipo')
      return
    }

    try {
      const payload = { equipo: editingEquipoValue.trim() }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await updateConfigEquipo(editingEquipo, payload)
      setEquipos(equipos.map(e => e.id === editingEquipo ? result.data : e).sort((a, b) => a.equipo.localeCompare(b.equipo)))
      setEditingEquipo(null)
      setEditingEquipoValue('')
      setEquipoMessage('Equipo actualizado exitosamente')
      setTimeout(() => setEquipoMessage(''), 3000)
    } catch (err) {
      setEquipoMessage('Error al actualizar equipo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleDeleteEquipo = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este equipo?')) return

    try {
      const payload = {}
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      await deleteConfigEquipo(id, payload)
      setEquipos(equipos.filter(e => e.id !== id))
      setEquipoMessage('Equipo eliminado exitosamente')
      setTimeout(() => setEquipoMessage(''), 3000)
    } catch (err) {
      setEquipoMessage('Error al eliminar equipo: ' + (err.message || 'Error desconocido'))
    }
  }

  // ============================================================================
  // LÍNEAS
  // ============================================================================

  const loadLineas = async () => {
    setLineasLoading(true)
    try {
      const data = await getConfigLineas()
      setLineas(data || [])
    } catch (err) {
      console.error('Error cargando líneas:', err)
      setLineaMessage('Error al cargar líneas')
    } finally {
      setLineasLoading(false)
    }
  }

  const handleAddLinea = async () => {
    if (!newLinea.trim()) {
      setLineaMessage('Por favor ingresa un nombre de línea')
      return
    }

    try {
      const payload = { linea: newLinea.trim() }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await createConfigLinea(payload)
      setLineas([...lineas, result.data].sort((a, b) => a.linea.localeCompare(b.linea)))
      setNewLinea('')
      setLineaMessage('Línea creada exitosamente')
      setTimeout(() => setLineaMessage(''), 3000)
    } catch (err) {
      setLineaMessage('Error al crear línea: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleEditLinea = (linea) => {
    setEditingLinea(linea.id)
    setEditingLineaValue(linea.linea)
  }

  const handleSaveLinea = async () => {
    if (!editingLineaValue.trim()) {
      setLineaMessage('Por favor ingresa un nombre de línea')
      return
    }

    try {
      const payload = { linea: editingLineaValue.trim() }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await updateConfigLinea(editingLinea, payload)
      setLineas(lineas.map(l => l.id === editingLinea ? result.data : l).sort((a, b) => a.linea.localeCompare(b.linea)))
      setEditingLinea(null)
      setEditingLineaValue('')
      setLineaMessage('Línea actualizada exitosamente')
      setTimeout(() => setLineaMessage(''), 3000)
    } catch (err) {
      setLineaMessage('Error al actualizar línea: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleDeleteLinea = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta línea?')) return

    try {
      const payload = {}
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      await deleteConfigLinea(id, payload)
      setLineas(lineas.filter(l => l.id !== id))
      setLineaMessage('Línea eliminada exitosamente')
      setTimeout(() => setLineaMessage(''), 3000)
    } catch (err) {
      setLineaMessage('Error al eliminar línea: ' + (err.message || 'Error desconocido'))
    }
  }

  // ============================================================================
  // MODELOS
  // ============================================================================

  const loadModelos = async () => {
    setModelosLoading(true)
    try {
      const data = await getConfigModelos()
      setModelos(data || [])
    } catch (err) {
      console.error('Error cargando modelos:', err)
      setModeloMessage('Error al cargar modelos')
    } finally {
      setModelosLoading(false)
    }
  }

  const handleAddModelo = async () => {
    if (!newModelo.trim()) {
      setModeloMessage('Por favor ingresa un nombre de modelo')
      return
    }

    try {
      const payload = { modelo: newModelo.trim() }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await createConfigModelo(payload)
      setModelos([...modelos, result.data].sort((a, b) => a.modelo.localeCompare(b.modelo)))
      setNewModelo('')
      setModeloMessage('Modelo creado exitosamente')
      setTimeout(() => setModeloMessage(''), 3000)
    } catch (err) {
      setModeloMessage('Error al crear modelo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleEditModelo = (modelo) => {
    setEditingModelo(modelo.id)
    setEditingModeloData({
      modelo: modelo.modelo || '',
      producto: modelo.producto || '',
      linea: modelo.linea || '',
      rate: modelo.rate || ''
    })
  }

  const handleSaveModelo = async () => {
    if (!editingModeloData.modelo.trim()) {
      setModeloMessage('Por favor ingresa un nombre de modelo')
      return
    }

    try {
      const payload = {
        modelo: editingModeloData.modelo.trim(),
        producto: editingModeloData.producto.trim() || null,
        linea: editingModeloData.linea.trim() || null,
        rate: editingModeloData.rate ? parseInt(editingModeloData.rate, 10) : null
      }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await updateConfigModelo(editingModelo, payload)
      setModelos(modelos.map(m => m.id === editingModelo ? result.data : m).sort((a, b) => a.modelo.localeCompare(b.modelo)))
      setEditingModelo(null)
      setEditingModeloData(null)
      setModeloMessage('Modelo actualizado exitosamente')
      setTimeout(() => setModeloMessage(''), 3000)
    } catch (err) {
      console.error('Error al actualizar modelo:', err.response?.status, err.response?.data || err.message)
      setModeloMessage('Error al actualizar modelo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleDeleteModelo = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este modelo?')) return

    try {
      const payload = {}
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      await deleteConfigModelo(id, payload)
      setModelos(modelos.filter(m => m.id !== id))
      setModeloMessage('Modelo eliminado exitosamente')
      setTimeout(() => setModeloMessage(''), 3000)
    } catch (err) {
      setModeloMessage('Error al eliminar modelo: ' + (err.message || 'Error desconocido'))
    }
  }

  
  module.exports = Configuration

  const handleAddDisplayMode = async () => {
    if (!newDisplayMode.linea.trim()) {
      setDisplayModeMessage('Por favor ingresa el nombre de la línea')
      return
    }

    try {
      const payload = {
        linea: newDisplayMode.linea.trim(),
        descripcion: newDisplayMode.descripcion.trim() || '',
        allowed_ips: newDisplayMode.allowed_ips,
        activo: true
      }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      const result = await createDisplayMode(payload)
      setDisplayModes([...displayModes, payload].sort((a, b) => a.linea.localeCompare(b.linea)))
      setNewDisplayMode({ linea: '', descripcion: '', allowed_ips: [] })
      setNewIPInput('')
      setDisplayModeMessage('Modo de visualización creado exitosamente')
      setTimeout(() => setDisplayModeMessage(''), 3000)
    } catch (err) {
      setDisplayModeMessage('Error al crear modo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleEditDisplayMode = (mode) => {
    setEditingDisplayMode(mode.id)
    setEditingDisplayModeData({ ...mode })
  }

  const handleSaveDisplayMode = async () => {
    if (!editingDisplayModeData.linea.trim()) {
      setDisplayModeMessage('Por favor ingresa el nombre de la línea')
      return
    }

    try {
      const payload = {
        linea: editingDisplayModeData.linea.trim(),
        descripcion: editingDisplayModeData.descripcion.trim() || '',
        allowed_ips: editingDisplayModeData.allowed_ips,
        activo: editingDisplayModeData.activo !== false
      }
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      await updateDisplayMode(editingDisplayMode, payload)
      setDisplayModes(displayModes.map(m => m.id === editingDisplayMode ? { ...payload, id: editingDisplayMode } : m).sort((a, b) => a.linea.localeCompare(b.linea)))
      setEditingDisplayMode(null)
      setEditingDisplayModeData(null)
      setDisplayModeMessage('Modo de visualización actualizado exitosamente')
      setTimeout(() => setDisplayModeMessage(''), 3000)
    } catch (err) {
      setDisplayModeMessage('Error al actualizar modo: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleDeleteDisplayMode = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este modo de visualización?')) return

    try {
      const payload = {}
      if (currentCredentials) {
        payload.numEmpleado = currentCredentials.num_empleado
        payload.password = currentCredentials.password
      }

      await deleteDisplayMode(id, payload)
      setDisplayModes(displayModes.filter(m => m.id !== id))
      setDisplayModeMessage('Modo de visualización eliminado exitosamente')
      setTimeout(() => setDisplayModeMessage(''), 3000)
    } catch (err) {
      setDisplayModeMessage('Error al eliminar modo: ' + (err.message || 'Error desconocido'))
    }
  }

  const addIPToNewMode = () => {
    if (newIPInput.trim()) {
      if (!newDisplayMode.allowed_ips.includes(newIPInput.trim())) {
        setNewDisplayMode({
          ...newDisplayMode,
          allowed_ips: [...newDisplayMode.allowed_ips, newIPInput.trim()]
        })
      }
      setNewIPInput('')
    }
  }

  const removeIPFromNewMode = (ipToRemove) => {
    setNewDisplayMode({
      ...newDisplayMode,
      allowed_ips: newDisplayMode.allowed_ips.filter(ip => ip !== ipToRemove)
    })
  }

  const addIPToEditMode = (ip) => {
    if (ip.trim() && !editingDisplayModeData.allowed_ips.includes(ip.trim())) {
      setEditingDisplayModeData({
        ...editingDisplayModeData,
        allowed_ips: [...editingDisplayModeData.allowed_ips, ip.trim()]
      })
    }
  }

  const removeIPFromEditMode = (ipToRemove) => {
    setEditingDisplayModeData({
      ...editingDisplayModeData,
      allowed_ips: editingDisplayModeData.allowed_ips.filter(ip => ip !== ipToRemove)
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <LoginModal
        visible={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onConfirm={async (credentials) => {
          try {
            const loginResult = await login(credentials.employee_input, credentials.password)
            if (loginResult.success) {
              // Verify role is ingeniero - usar rolOriginal de la base de credenciales
              if (loginResult.user.rolOriginal && loginResult.user.rolOriginal.toLowerCase() !== 'ingeniero') {
                setAuthError('Solo los ingenieros pueden acceder a la configuración')
                setAccessDenied(true)
                setTimeout(() => setAccessDenied(false), 5000)
                return
              }
              setCurrentCredentials({
                num_empleado: loginResult.user.num_empleado,
                nombre: loginResult.user.nombre,
                password: credentials.password,
                rol: loginResult.user.rolOriginal
              })
              setAuthError('')
              setShowCredentialsModal(false)
            }
          } catch (err) {
            setAuthError(err.message || 'Error al autenticarse')
          }
        }}
        busy={false}
      />

      {/* Inactivity Warning */}
      {inactivityWarning && (
        <div className="mb-6 p-4 bg-orange-900/30 border border-orange-600/50 text-orange-300 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          <span>Sesión cerrada por inactividad (2 minutos sin movimiento)</span>
        </div>
      )}

      {/* Access Denied Alert */}
      {accessDenied && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded text-red-400">
          {authError}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Configuración</h1>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            Volver
          </button>
        </div>

        {/* Credenciales Info */}
        <div className="mb-6 p-4 bg-slate-800 border border-blue-500/30 rounded">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">
              {currentCredentials ? (
                <>
                  Conectado como: <span className="font-bold text-blue-400">{currentCredentials.nombre}</span>
                  {currentCredentials.rol && (
                    <span className="ml-3 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs font-medium">
                      {currentCredentials.rol}
                    </span>
                  )}
                </>
              ) : (
                'No autorizado - Se requiere login de ingeniero'
              )}
            </p>
            <button
              onClick={() => {
                if (currentCredentials) {
                  setCurrentCredentials(null)
                  setAuthError('')
                } else {
                  setShowCredentialsModal(true)
                }
              }}
              className={`px-4 py-2 rounded transition ${
                currentCredentials
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentCredentials ? 'Cerrar Sesión' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>

        {!currentCredentials && (
          <div className="mb-8 p-6 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-yellow-200 text-center">
              Por favor inicia sesión para acceder a la configuración. Se requiere ser ingeniero.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {[
            { key: 'equipos', label: 'Equipos' },
            { key: 'lineas', label: 'Líneas' },
            { key: 'modelos', label: 'Modelos' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={!currentCredentials}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              } ${!currentCredentials ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* EQUIPOS TAB */}
        {activeTab === 'equipos' && currentCredentials && (
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white">Gestionar Equipos</h2>

            {equipoMessage && (
              <div className={`mb-4 p-4 rounded ${
                equipoMessage.includes('Error') 
                  ? 'bg-red-900/30 text-red-300 border border-red-600' 
                  : 'bg-green-900/30 text-green-300 border border-green-600'
              }`}>
                {equipoMessage}
              </div>
            )}

            {/* Agregar Nuevo */}
            <div className="mb-8 p-4 bg-slate-700/50 rounded border border-slate-600">
              <h3 className="text-lg font-semibold mb-4 text-white">Agregar Nuevo Equipo</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEquipo}
                  onChange={(e) => setNewEquipo(e.target.value)}
                  placeholder="Nombre del equipo"
                  className="flex-1 px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEquipo()}
                />
                <button
                  onClick={handleAddEquipo}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Lista */}
            {equiposLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : equipos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No hay equipos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700 border-b border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipos.map(equipo => (
                      <tr key={equipo.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-gray-300">{equipo.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {editingEquipo === equipo.id ? (
                            <input
                              type="text"
                              value={editingEquipoValue}
                              onChange={(e) => setEditingEquipoValue(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            equipo.equipo
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingEquipo === equipo.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEquipo}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingEquipo(null)}
                                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditEquipo(equipo)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteEquipo(equipo.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LÍNEAS TAB */}
        {activeTab === 'lineas' && currentCredentials && (
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white">Gestionar Líneas</h2>

            {lineaMessage && (
              <div className={`mb-4 p-4 rounded ${
                lineaMessage.includes('Error') 
                  ? 'bg-red-900/30 text-red-300 border border-red-600' 
                  : 'bg-green-900/30 text-green-300 border border-green-600'
              }`}>
                {lineaMessage}
              </div>
            )}

            {/* Agregar Nuevo */}
            <div className="mb-8 p-4 bg-slate-700/50 rounded border border-slate-600">
              <h3 className="text-lg font-semibold mb-4 text-white">Agregar Nueva Línea</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLinea}
                  onChange={(e) => setNewLinea(e.target.value)}
                  placeholder="Nombre de la línea"
                  className="flex-1 px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLinea()}
                />
                <button
                  onClick={handleAddLinea}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Lista */}
            {lineasLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : lineas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No hay líneas registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700 border-b border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map(linea => (
                      <tr key={linea.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-gray-300">{linea.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {editingLinea === linea.id ? (
                            <input
                              type="text"
                              value={editingLineaValue}
                              onChange={(e) => setEditingLineaValue(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            linea.linea
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingLinea === linea.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveLinea}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingLinea(null)}
                                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditLinea(linea)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteLinea(linea.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODELOS TAB */}
        {activeTab === 'modelos' && currentCredentials && (
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white">Gestionar Modelos</h2>

            {modeloMessage && (
              <div className={`mb-4 p-4 rounded ${
                modeloMessage.includes('Error') 
                  ? 'bg-red-900/30 text-red-300 border border-red-600' 
                  : 'bg-green-900/30 text-green-300 border border-green-600'
              }`}>
                {modeloMessage}
              </div>
            )}

            {/* Agregar Nuevo */}
            <div className="mb-8 p-4 bg-slate-700/50 rounded border border-slate-600">
              <h3 className="text-lg font-semibold mb-4 text-white">Agregar Nuevo Modelo</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelo}
                  onChange={(e) => setNewModelo(e.target.value)}
                  placeholder="Nombre del modelo"
                  className="flex-1 px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddModelo()}
                />
                <button
                  onClick={handleAddModelo}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Lista */}
            {modelosLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No hay modelos registrados</div>
            ) : (
              <div className="space-y-4">
                {modelos.map(modelo => (
                  <div key={modelo.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    {editingModelo === modelo.id ? (
                      // EDIT MODE
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-white mb-2">Modelo</label>
                            <input
                              type="text"
                              value={editingModeloData.modelo}
                              onChange={(e) => setEditingModeloData({ ...editingModeloData, modelo: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white mb-2">Producto</label>
                            <input
                              type="text"
                              value={editingModeloData.producto}
                              onChange={(e) => setEditingModeloData({ ...editingModeloData, producto: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ej: MGH100 RCU"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white mb-2">Línea</label>
                            <select
                              value={editingModeloData.linea}
                              onChange={(e) => setEditingModeloData({ ...editingModeloData, linea: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Seleccionar línea</option>
                              {allLineas.map(linea => (
                                <option key={linea.id} value={linea.linea}>{linea.linea}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white mb-2">Rate (piezas/hr)</label>
                            <input
                              type="number"
                              value={editingModeloData.rate}
                              onChange={(e) => setEditingModeloData({ ...editingModeloData, rate: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ej: 100"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-slate-600">
                          <button
                            onClick={handleSaveModelo}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-semibold"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => {
                              setEditingModelo(null)
                              setEditingModeloData(null)
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold text-white text-lg">#{modelo.id}</span>
                            <span className="font-semibold text-white text-lg">{modelo.modelo}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Producto:</span>
                              <p className="text-white">{modelo.producto || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Línea:</span>
                              <p className="text-white">{modelo.linea || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Rate:</span>
                              <p className="text-white">{modelo.rate ? `${modelo.rate} pz/hr` : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditModelo(modelo)}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteModelo(modelo.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
