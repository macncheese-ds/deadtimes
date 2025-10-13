import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import HandleTicket from './pages/HandleTicket'
import ViewTicket from './pages/ViewTicket'

export default function App(){
  const [user] = useState({ nombre: 'Usuario Demo', num_empleado: 12345 }) // Simulado

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/handle/:id" element={<HandleTicket user={user} />} />
          <Route path="/view/:id" element={<ViewTicket />} />
      </Routes>
    </Router>
  )
}
