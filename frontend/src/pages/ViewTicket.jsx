import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket } from '../api_deadtimes'

export default function ViewTicket(){
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  useEffect(() => { getTicket(id).then(setTicket).catch(console.error) }, [id])

  if (!ticket) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-white p-2 sm:p-4 md:p-8">
      <div className="max-w-3xl mx-auto border p-3 sm:p-4 md:p-6 rounded">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4">Ticket #{ticket.id} - Resumen</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm md:text-base" style={{borderCollapse: 'collapse'}}>
            <tbody>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Descripción</td><td className="py-2">{ticket.descr}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Línea</td><td className="py-2">{`Línea ${ticket.linea}`}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Equipo</td><td className="py-2">{ticket.equipo}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Modelo</td><td className="py-2">{ticket.modelo}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Turno</td><td className="py-2">{ticket.turno}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Prioridad</td><td className="py-2">{ticket.priority}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Técnico</td><td className="py-2">{ticket.tecnico}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Causa</td><td className="py-2">{ticket.causa}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Solución</td><td className="py-2">{ticket.solucion}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Rate</td><td className="py-2">{ticket.rate ?? ''}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Minutos de paro</td><td className="py-2">{ticket.minutos ?? ''}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Piezas perdidas</td><td className="py-2">{ticket.piezas ?? ''}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Deadtime</td><td className="py-2">{ticket.deadtime ?? ''}</td></tr>
              <tr className="border-b"><td className="py-2 pr-2 font-semibold">Encuesta</td><td className="py-2">{ticket.e_ser ?? ''}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row gap-2">
          <button onClick={() => window.print()} className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded text-sm sm:text-base">Imprimir</button>
          <button onClick={() => window.history.back()} className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded text-sm sm:text-base">Volver</button>
        </div>
      </div>
    </div>
  )
}
