import React, { useEffect, useState } from 'react'
import { listTickets, createTicket } from '../api_deadtimes'

export default function Home({ user }) {
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    descr: '', modelo: '', linea: '1', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: ''
  })

  useEffect(() => { load() }, [status])

  function load() { listTickets(status).then(setTickets).catch(console.error) }

  function submit(e) {
    e.preventDefault()
    const turno = getTurno()
    createTicket({ ...form, turno, nombre: user.nombre, num_empleado: user.num_empleado }).then(() => {
      setForm({ descr: '', modelo: '', linea: '1', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: '' })
      setShowNew(false)
      load()
    })
  }

  function getTurno() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return 'Matutino'
    if (hour >= 14 && hour < 22) return 'Vespertino'
    return 'Nocturno'
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Deadtimes - {user.nombre} ({user.num_empleado})</h2>
      <button onClick={() => setStatus('open')}>Abiertos</button>
      <button onClick={() => setStatus('closed')}>Cerrados</button>
      <button onClick={() => setShowNew(true)}>Nuevo Ticket</button>

      {showNew && (
        <form onSubmit={submit} style={{ border: '1px solid #ccc', padding: 10, marginTop: 10 }}>
          <h3>Nuevo Ticket</h3>
          <select value={form.linea} onChange={e => setForm({...form, linea: e.target.value})}>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
          </select>
          <select value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
            <option value="">Seleccionar Modelo</option>
            <option value="Modelo A">Modelo A</option><option value="Modelo B">Modelo B</option>
          </select>
          <select value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})}>
            <option value="">Seleccionar Equipo</option>
            <option value="Equipo 1">Equipo 1</option><option value="Equipo 2">Equipo 2</option>
          </select>
          <select value={form.descr} onChange={e => setForm({...form, descr: e.target.value})}>
            <option value="">Seleccionar Descripción</option>
            <option value="Falla eléctrica">Falla eléctrica</option><option value="Mantenimiento">Mantenimiento</option>
          </select>
          {/* Mods checkboxes */}
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <label key={i}><input type="checkbox" checked={form.mods[`mod${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`mod${i}`]: e.target.checked}})} /> Mod {i}</label>
          ))}
          <select value={form.pf} onChange={e => setForm({...form, pf: e.target.value})}>
            <option value="">Seleccionar PF</option><option value="Total">Total</option><option value="Intermitente">Intermitente</option>
          </select>
          <select value={form.pa} onChange={e => setForm({...form, pa: e.target.value})}>
            <option value="">Seleccionar PA</option><option value="Equipo">Equipo</option><option value="Linea">Linea</option>
          </select>
          <select value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})}>
            <option value="">Seleccionar Clasificación</option>
            <option value="Equipo">Equipo</option><option value="Facilidades">Facilidades</option><option value="Operacion">Operacion</option>
            <option value="Procesos">Procesos</option><option value="Calidad">Calidad</option><option value="Materiales">Materiales</option>
            <option value="Sistemas(IT)">Sistemas(IT)</option>
          </select>
          {form.clasificacion === 'Sistemas(IT)' && <input placeholder="Otros" value={form.clas_others} onChange={e => setForm({...form, clas_others: e.target.value})} />}
          <input placeholder="Prioridad" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
          <button type="submit">Crear</button>
          <button type="button" onClick={() => setShowNew(false)}>Cancelar</button>
        </form>
      )}

      <ul>
        {tickets.map(t => (
          <li key={t.id}>
            <strong>{t.descr}</strong> - {t.linea} - {t.nombre} - {t.equipo}
            {status === 'open' && <button onClick={() => window.location.href = `/handle/${t.id}`}>Manejar</button>}
          </li>
        ))}
      </ul>
    </div>
  )
}