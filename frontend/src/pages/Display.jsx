import React, { useEffect, useState } from 'react'
import { getDisplayTickets } from '../api_deadtimes'
import DisplayVisualization from '../components/DisplayVisualization'

export default function Display() {
  const [displayActive, setDisplayActive] = useState(false)
  const [linea, setLinea] = useState('')
  const [loading, setLoading] = useState(true)

  // Verificar si el modo está activado al cargar
  useEffect(() => {
    const active = sessionStorage.getItem('displayModeActive') === 'true'
    const savedLinea = sessionStorage.getItem('displayLinea')
    
    setDisplayActive(active)
    if (active && savedLinea) {
      setLinea(savedLinea)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  // Si el modo está activo y hay línea, mostrar visualización
  if (displayActive && linea) {
    return <DisplayVisualization linea={linea} />
  }

  // Si no está activado, mostrar mensaje
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Modo Visualización</h1>
        
        <div className="bg-yellow-900 border border-yellow-600 rounded p-4 mb-6">
          <p className="text-yellow-200 text-center">
            El modo de visualización no está activado.
          </p>
          <p className="text-yellow-300 text-sm text-center mt-2">
            Ve a Configuration → Modos Visualización para activarlo
          </p>
        </div>

        <div className="bg-gray-700 rounded p-4">
          <p className="text-gray-300 text-sm">
            El modo de visualización mostrará automáticamente los tickets activos de una línea de producción, con actualización cada 5 segundos.
          </p>
          <p className="text-gray-400 text-xs mt-3">
            Solo disponible después de activarlo desde la configuración.
          </p>
        </div>
      </div>
    </div>
  )
}
