import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, startTicket, updateTicket, finishTicket } from '../api_deadtimes'

export default function HandleTicket({ user }) {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [authDone, setAuthDone] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ causa: '', solucion: '', rate: '', piezas: '', e_ser: '' })

  useEffect(() => { load() }, [id])

  function load() { getTicket(id).then(setTicket).catch(console.error) }

  async function handleStart() {
    await startTicket(id, user.nombre)
    setAuthDone(true)
    load()
  }

  function handleEdit() { setEditMode(true) }

  function saveEdit() {
    updateTicket(id, form).then(() => { setEditMode(false); load() })
  }

  function handleFinish() {
    const deadtime = form.piezas > 0 ? form.rate / form.piezas : 0
    finishTicket(id, { ...form, deadtime }).then(() => window.location.href = '/')
  }

  if (!ticket) return <div>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Manejar Ticket #{id}</h2>
      <p><strong>Descripción:</strong> {ticket.descr}</p>
      <p><strong>Línea:</strong> {ticket.linea}</p>
      <p><strong>Equipo:</strong> {ticket.equipo}</p>
      {/* Mostrar otros campos */}

      {!authDone && (
        <div>
          <p>Confirme credenciales para asignar como técnico.</p>
          <button onClick={handleStart}>Confirmar ({user.nombre})</button>
        </div>
      )}

      {authDone && (
        <div>
          <button onClick={handleEdit}>Editar</button>
          {editMode ? (
            <div>
              <select value={form.causa} onChange={e => setForm({...form, causa: e.target.value})}>
                <option value="">Seleccionar Causa</option>
                <option value="Falla mecánica">Falla mecánica</option><option value="Error humano">Error humano</option>
              </select>
              <textarea placeholder="Solución" value={form.solucion} onChange={e => setForm({...form, solucion: e.target.value})} />
              <input type="number" placeholder="Rate" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} />
              <input type="number" placeholder="Piezas perdidas" value={form.piezas} onChange={e => setForm({...form, piezas: e.target.value})} />
              <button onClick={saveEdit}>Guardar Edición</button>
            </div>
          ) : (
            <div>
              <p><strong>Causa:</strong> {ticket.causa}</p>
              <p><strong>Solución:</strong> {ticket.solucion}</p>
              <p><strong>Rate:</strong> {ticket.rate}</p>
              <p><strong>Piezas:</strong> {ticket.piezas}</p>
              <select value={form.e_ser} onChange={e => setForm({...form, e_ser: e.target.value})}>
                <option value="">Seleccionar Encuesta</option>
                <option value="Excelente">Excelente</option><option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option><option value="Malo">Malo</option><option value="Muy Malo">Muy Malo</option>
              </select>
              <button onClick={handleFinish}>Finalizar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}