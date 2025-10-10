import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { listTickets, createTicket, startTicket, finishTicket } from './api_deadtimes'
import Login from './pages/Login'
import Home from './pages/Home'
import HandleTicket from './pages/HandleTicket'

export default function App(){
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  })
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState({ descr: '', linea: '1', nombre: '', num_empleado: '' })

  useEffect(()=>{ load() }, [])
  function load(){ listTickets('open').then(setTickets).catch(err=>console.error(err)) }

  function submit(e){
    e.preventDefault()
    createTicket(form).then(()=>{ setForm({descr:'',linea:'1',nombre:'',num_empleado:''}); load() })
  }

  return (
    <Router>
      <div style={{ padding:20 }}>
        <h2>Deadtimes - Tickets abiertos</h2>
        <form onSubmit={submit} style={{ marginBottom:20 }}>
          <input placeholder="Descripción" value={form.descr} onChange={e=>setForm({...form, descr:e.target.value})} />
          <select value={form.linea} onChange={e=>setForm({...form,linea:e.target.value})}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
          <input placeholder="Nombre" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
          <input placeholder="Num empleado" value={form.num_empleado} onChange={e=>setForm({...form,num_empleado:e.target.value})} />
          <button type="submit">Crear</button>
        </form>

        <ul>
          {tickets.map(t => (
            <li key={t.id}>
              <strong>{t.descr}</strong> - {t.linea} - {t.nombre}
              {' '}
              <button onClick={()=> startTicket(t.id, 'Tecnico demo').then(load)}>Start</button>
              <button onClick={()=> finishTicket(t.id, { causa:'Demo', solucion:'OK', rate:100, piezas:2, e_ser:'Bueno' }).then(load)}>Finish</button>
            </li>
          ))}
        </ul>
      </div>

      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
        <Route path="/handle/:id" element={user ? <HandleTicket user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}
