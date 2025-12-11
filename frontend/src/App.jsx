import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import HandleTicket from './pages/HandleTicket'
import ViewTicket from './pages/ViewTicket'
import Analytics from './pages/Analytics'
import MachineAnalysis from './pages/MachineAnalysis'

export default function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/handle/:id" element={<HandleTicket />} />
        <Route path="/view/:id" element={<ViewTicket />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/machine-analysis" element={<MachineAnalysis />} />
      </Routes>
    </Router>
  )
}
