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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Deadtimes - {user.nombre}</h1>
        <div className="flex space-x-4 mb-6">
          <button className={`px-4 py-2 rounded ${status === 'open' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setStatus('open')}>Abiertos</button>
          <button className={`px-4 py-2 rounded ${status === 'closed' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setStatus('closed')}>Cerrados</button>
          <button className="px-4 py-2 bg-green-500 text-white rounded" onClick={() => setShowNew(true)}>Nuevo Ticket</button>
        </div>

        {showNew && (
          <div className="bg-white p-6 rounded shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Nuevo Ticket</h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="border p-2 rounded" value={form.linea} onChange={e => setForm({...form, linea: e.target.value})}>
                <option value="1">Línea 1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
              </select>
              <select className="border p-2 rounded" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                <option value="">Seleccionar Modelo</option>
                <option value="Modelo A">Modelo A</option><option value="Modelo B">Modelo B</option>
              </select>
              <select className="border p-2 rounded" value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})}>
                <option value="">Seleccionar Equipo</option>
                <option value="Equipo 1">Equipo 1</option><option value="Equipo 2">Equipo 2</option>
              </select>
              <select className="border p-2 rounded" value={form.descr} onChange={e => setForm({...form, descr: e.target.value})}>
                <option value="">Seleccionar Descripción</option>
                <option value="Falla eléctrica">Falla eléctrica</option><option value="Mantenimiento">Mantenimiento</option>
              </select>
              <select className="border p-2 rounded" value={form.pf} onChange={e => setForm({...form, pf: e.target.value})}>
                <option value="">Seleccionar PF</option><option value="Total">Total</option><option value="Intermitente">Intermitente</option>
              </select>
              <select className="border p-2 rounded" value={form.pa} onChange={e => setForm({...form, pa: e.target.value})}>
                <option value="">Seleccionar PA</option><option value="Equipo">Equipo</option><option value="Linea">Linea</option>
              </select>
              <select className="border p-2 rounded" value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                <option value="">Seleccionar Clasificación</option>
                <option value="Equipo">Equipo</option><option value="Facilidades">Facilidades</option><option value="Operacion">Operacion</option>
                <option value="Procesos">Procesos</option><option value="Calidad">Calidad</option><option value="Materiales">Materiales</option>
                <option value="Sistemas(IT)">Sistemas(IT)</option>
              </select>
              {form.clasificacion === 'Sistemas(IT)' && <input className="border p-2 rounded" placeholder="Otros" value={form.clas_others} onChange={e => setForm({...form, clas_others: e.target.value})} />}
              <input className="border p-2 rounded" placeholder="Prioridad" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
              <div className="col-span-2">
                <label className="block mb-2">Mods aplicables:</label>
                <div className="grid grid-cols-6 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <label key={i} className="flex items-center">
                      <input type="checkbox" className="mr-1" checked={form.mods[`mod${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`mod${i}`]: e.target.checked}})} />
                      Mod {i}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex space-x-4">
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Crear</button>
                <button type="button" className="px-4 py-2 bg-gray-500 text-white rounded" onClick={() => setShowNew(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tickets {status === 'open' ? 'Abiertos' : 'Cerrados'}</h2>
          <ul className="space-y-2">
            {tickets.map(t => (
              <li key={t.id} className="border p-4 rounded flex justify-between items-center">
                <div>
                  <strong>{t.descr}</strong> - Línea {t.linea} - {t.nombre} - {t.equipo}
                </div>
                {status === 'open' && <button className="px-4 py-2 bg-yellow-500 text-white rounded" onClick={() => window.location.href = `/handle/${t.id}`}>Manejar</button>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}