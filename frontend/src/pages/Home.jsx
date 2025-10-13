import React, { useEffect, useState } from 'react'
import { listTickets, createTicket } from '../api_deadtimes'

export default function Home({ user }) {
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    descr: '', modelo: '', linea: '1', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: '', lado: 'TOP'
  })

  useEffect(() => { load() }, [status])

  function load() { listTickets(status).then(setTickets).catch(console.error) }

  function submit(e) {
    e.preventDefault()
    const turno = getTurno()
    createTicket({ ...form, turno, nombre: user.nombre, num_empleado: user.num_empleado }).then(() => {
      setForm({ descr: '', modelo: '', linea: '1', equipo: '', mods: {}, pf: '', pa: '', clasificacion: '', clas_others: '', priority: '', lado: 'TOP' })
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
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6 px-2">Deadtimes - {user.nombre}</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 md:mb-6 px-2">
          <button className={`px-4 py-2 rounded text-sm sm:text-base ${status === 'open' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setStatus('open')}>Abiertos</button>
          <button className={`px-4 py-2 rounded text-sm sm:text-base ${status === 'closed' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setStatus('closed')}>Cerrados</button>
          <button className="px-4 py-2 bg-green-500 text-white rounded text-sm sm:text-base" onClick={() => setShowNew(true)}>+ Nuevo Ticket</button>
        </div>

        {showNew && (
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded shadow-md mb-4 md:mb-6 mx-2">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 md:mb-4">Nuevo Ticket</h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.linea} onChange={e => setForm({...form, linea: e.target.value})}>
                <option value="1">Línea 1</option>
                <option value="2">Línea 2</option>
                <option value="3">Línea 3</option>
                <option value="4">Línea 4</option>
              </select>

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                <option value="">Seleccionar Modelo</option>
                <option value="MGH100 RCU">MGH100 RCU</option>
                <option value="MGH100 BL7">MGH100 BL7</option>
                <option value="IDB PLOCK">IDB PLOCK</option>
                <option value="IDB MAIN">IDB MAIN</option>
                <option value="IDB IPTS">IDB IPTS</option>
                <option value="POWER PACK">POWER PACK</option>
                <option value="MGH MOCI">MGH MOCI</option>
                <option value="MGH100 ESC">MGH100 ESC</option>
                <option value="FCM 30W">FCM 30W</option>
                <option value="MRR35">MRR35</option>
                <option value="IAMM">IAMM</option>
                <option value="IAMM2">IAMM2</option>
                <option value="IAMMD">IAMMD</option>
                <option value="FRHC">FRHC</option>
              </select>

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.lado} onChange={e => setForm({...form, lado: e.target.value})}>
                <option value="TOP">TOP</option>
                <option value="BOT">BOT</option>
              </select>

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})}>
                <option value="">Seleccionar Equipo</option>
                <option value="Equipo 1">Equipo 1</option>
                <option value="Equipo 2">Equipo 2</option>
              </select>

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.descr} onChange={e => setForm({...form, descr: e.target.value})}>
                <option value="">Seleccionar Descripción</option>
                <option value="Falla eléctrica">Falla eléctrica</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>

              {/* PF = Sección afectada (Equipo / Linea) */}
              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.pf} onChange={e => setForm({...form, pf: e.target.value})}>
                <option value="">Seleccionar Sección afectada</option>
                <option value="Equipo">Equipo</option>
                <option value="Linea">Linea</option>
              </select>

              {/* PA = Condición de paro (Intermitente / Total) */}
              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.pa} onChange={e => setForm({...form, pa: e.target.value})}>
                <option value="">Seleccionar Condición de Paro</option>
                <option value="Intermitente">Intermitente</option>
                <option value="Total">Total</option>
              </select>

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                <option value="">Seleccionar Clasificación</option>
                <option value="Equipo">Equipo</option>
                <option value="Facilidades">Facilidades</option>
                <option value="Operacion">Operacion</option>
                <option value="Procesos">Procesos</option>
                <option value="Calidad">Calidad</option>
                <option value="Materiales">Materiales</option>
                <option value="Sistemas(IT)">Sistemas(IT)</option>
                <option value="Otros">Otros</option>
              </select>
              {form.clasificacion === 'Otros' && <input className="border p-2 rounded text-sm sm:text-base w-full" placeholder="Especificar clasificación" value={form.clas_others} onChange={e => setForm({...form, clas_others: e.target.value})} />}

              <select className="border p-2 rounded text-sm sm:text-base w-full" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="">Seleccionar Prioridad</option>
                <option value="Se da prioridad al equipo">Se da prioridad al equipo</option>
                <option value="Se da prioridad a otro equipo">Se da prioridad a otro equipo</option>
              </select>
              <div className="col-span-1 md:col-span-2">
                <label className="block mb-2 text-sm sm:text-base font-medium">Montadoras aplicables:</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <label key={i} className="flex items-center text-xs sm:text-sm">
                      <input type="checkbox" className="mr-1" checked={form.mods[`Montadora${i}`] || false} onChange={e => setForm({...form, mods: {...form.mods, [`Montadora${i}`]: e.target.checked}})} />
                      M{i}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded text-sm sm:text-base font-medium">Crear</button>
                <button type="button" className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded text-sm sm:text-base" onClick={() => setShowNew(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded shadow-md p-3 sm:p-4 md:p-6 mx-2">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 md:mb-4">Tickets {status === 'open' ? 'Abiertos' : 'Cerrados'}</h2>
          <ul className="space-y-2">
            {tickets.map(t => (
              <li key={t.id} className="border p-3 sm:p-4 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm md:text-base flex-1">
                  <strong className="block sm:inline">{t.descr}</strong>
                  <span className="block sm:inline text-gray-600"> - Línea {t.linea} - {t.modelo ? `${t.modelo}` : ''} - {t.nombre} - {t.equipo}</span>
                </div>
                {status === 'open' ? (
                  <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-yellow-500 text-white rounded text-sm sm:text-base whitespace-nowrap" onClick={() => window.location.href = `/handle/${t.id}`}>Manejar</button>
                ) : (
                  <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded text-sm sm:text-base whitespace-nowrap" onClick={() => window.location.href = `/view/${t.id}`}>Ver</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}