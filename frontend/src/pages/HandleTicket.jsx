import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, startTicket, updateTicket, finishTicket } from '../api_deadtimes'

export default function HandleTicket({ user }) {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ causa: '', solucion: '', rate: '', e_ser: '' })

  useEffect(() => { load() }, [id])

  function load() { getTicket(id).then(setTicket).catch(console.error) }

  async function handleStart() {
    await startTicket(id, user.nombre)
    load()
  }

  function handleEdit() { setEditMode(true) }

  function saveEdit() {
    updateTicket(id, form).then(() => { setEditMode(false); load() })
  }

  async function handleFinish() {
    // Now the backend will compute minutos (hc - hr) and derive piezas and deadtime.
    const rateNum = Number(form.rate) || 0
    try {
      await finishTicket(id, { causa: form.causa, solucion: form.solucion, rate: rateNum, e_ser: form.e_ser })
      // Pequeña pausa para asegurar que el backend procesó el cierre
      await new Promise(resolve => setTimeout(resolve, 300))
      window.location.href = '/'
    } catch (error) {
      console.error('Error al finalizar ticket:', error)
      alert('Error al finalizar el ticket. Intenta de nuevo.')
    }
  }

  if (!ticket) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white p-3 sm:p-4 md:p-6 rounded shadow-md">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Manejar Ticket #{id}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 text-sm sm:text-base">
          <p><strong>Descripción:</strong> {ticket.descr}</p>
          <p><strong>Línea:</strong> Línea {ticket.linea}</p>
          <p><strong>Equipo:</strong> {ticket.equipo}</p>
          <p><strong>Modelo:</strong> {ticket.modelo}</p>
          <p><strong>Turno:</strong> {ticket.turno}</p>
          <p><strong>Prioridad:</strong> {ticket.priority}</p>
        </div>

        {!ticket.ha && (
          <div className="mb-4 md:mb-6">
            <button className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded text-sm sm:text-base" onClick={handleStart}>Asignar como Técnico ({user.nombre})</button>
          </div>
        )}

        {ticket.ha && (
          <div className="mt-4 md:mt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 md:mb-4">Información del Técnico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.causa} onChange={e => setForm({...form, causa: e.target.value})} required>
                <option value="">Seleccionar Causa</option>
                <option value="Falla mecánica">Falla mecánica</option>
                <option value="Error humano">Error humano</option>
                <option value="Falla eléctrica">Falla eléctrica</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Otra">Otra</option>
              </select>
              <input className="border p-2 rounded text-sm sm:text-base w-full" type="number" placeholder="Rate (producción afectada)" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} required />
              {/* minutos is calculated server-side from hr/hc; user only provides rate */}
              <select className="border p-2 rounded text-sm sm:text-base w-full md:col-span-2" value={form.e_ser} onChange={e => setForm({...form, e_ser: e.target.value})} required>
                <option value="">Encuesta de Servicio</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Muy Malo">Muy Malo</option>
              </select>
            </div>
            <textarea className="border p-2 rounded w-full mt-3 md:mt-4 text-sm sm:text-base" rows="4" placeholder="Solución aplicada" value={form.solucion} onChange={e => setForm({...form, solucion: e.target.value})} required />
            <button className="mt-3 md:mt-4 w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded text-sm sm:text-base font-medium" onClick={handleFinish} disabled={!form.causa || !form.solucion || !form.rate || !form.e_ser}>Finalizar Ticket</button>
          </div>
        )}
      </div>
    </div>
  )
}