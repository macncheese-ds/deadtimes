import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket } from '../api_deadtimes'

export default function ViewTicket(){
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  useEffect(() => { getTicket(id).then(setTicket).catch(console.error) }, [id])

  if (!ticket) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><span className="text-slate-300">Cargando...</span></div>

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 md:mb-6 text-slate-100">Ticket #{ticket.id} - Resumen</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm md:text-base" style={{borderCollapse: 'collapse'}}>
            <tbody>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Descripción</td><td className="py-3 text-slate-300">{ticket.descr}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Línea</td><td className="py-3 text-slate-300">{`Línea ${ticket.linea}`}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Equipo</td><td className="py-3 text-slate-300">{ticket.equipo}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Modelo</td><td className="py-3 text-slate-300">{ticket.modelo}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Turno</td><td className="py-3 text-slate-300">{ticket.turno}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Prioridad</td><td className="py-3 text-slate-300">{ticket.priority}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Técnico</td><td className="py-3 text-slate-300">{ticket.tecnico}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Num. Empleado Técnico</td><td className="py-3 text-slate-300">{ticket.num_empleado1 || 'N/A'}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Causa</td><td className="py-3 text-slate-300">{ticket.causa}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Solución</td><td className="py-3 text-slate-300">{ticket.solucion}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Rate</td><td className="py-3 text-slate-300">{ticket.rate ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Minutos de paro</td><td className="py-3 text-slate-300">{ticket.minutos ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Piezas perdidas</td><td className="py-3 text-slate-300">{ticket.piezas ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Deadtime</td><td className="py-3 text-slate-300">{ticket.deadtime ?? ''}</td></tr>
              <tr className="border-b border-slate-700"><td className="py-3 pr-4 font-semibold text-slate-100">Encuesta</td><td className="py-3 text-slate-300">{ticket.e_ser ?? ''}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={() => window.print()} className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 text-slate-100 rounded-lg text-sm sm:text-base font-medium hover:bg-slate-600 transition-colors border border-slate-600">Imprimir</button>
          <button onClick={() => window.history.back()} className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 text-slate-200 rounded-lg text-sm sm:text-base font-medium hover:bg-slate-600 transition-colors border border-slate-600">Volver</button>
        </div>
      </div>
    </div>
  )
}
