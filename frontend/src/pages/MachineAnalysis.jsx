import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEquipos, getTicketsByEquipment, getLineas } from '../api_deadtimes'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

// Convertir minutos a formato H:MM h (e.g. 90 → "1:30 h")
function formatMinutes(mins) {
  if (mins === null || mins === undefined) return 'N/A';
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}:${String(m).padStart(2, '0')} h`;
}

export default function MachineAnalysis() {
  const navigate = useNavigate()
  const [maquinas, setMaquinas] = useState([])
  const [lineas, setLineas] = useState([])
  const [selectedMaquina, setSelectedMaquina] = useState('')
  const [selectedLinea, setSelectedLinea] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [specialExportLoading, setSpecialExportLoading] = useState(false)
  const [specialExportProgress, setSpecialExportProgress] = useState('')
  const [showSpecialExportModal, setShowSpecialExportModal] = useState(false)

  useEffect(() => {
    loadMaquinas()
    loadLineas()
  }, [])

  // Limpiar modales al desmontar
  useEffect(() => {
    return () => {
      setShowModal(false)
      setSelectedTicket(null)
    }
  }, [])

  useEffect(() => {
    if (selectedMaquina) {
      loadTickets()
    } else {
      setTickets([])
    }
  }, [selectedMaquina, selectedLinea, dateRange, customStartDate, customEndDate])

  async function loadMaquinas() {
    try {
      const data = await getEquipos()
      // Extraer solo los nombres de equipo
      const equipoNames = data.map(item => item.equipo)
      setMaquinas(equipoNames)
    } catch (error) {
      console.error('Error cargando máquinas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadLineas() {
    try {
      const data = await getLineas()
      setLineas(data)
    } catch (error) {
      console.error('Error cargando líneas:', error)
    }
  }

  async function loadTickets() {
    if (!selectedMaquina) return
    
    setLoadingTickets(true)
    try {
      const params = {}
      
      // Si es 'all', enviar el parámetro para indicar todas las máquinas
      // Si es 'sin_otros', enviar el parámetro para excluir "otros"
      if (selectedMaquina === 'all') {
        params.equipo = 'all'
      } else if (selectedMaquina === 'sin_otros') {
        params.equipo = 'sin_otros'
      } else {
        params.equipo = selectedMaquina
      }
      
      // Agregar filtro de línea si está seleccionado
      if (selectedLinea) {
        params.linea = selectedLinea
      }
      
      // Manejar fechas personalizadas
      if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          // normalizar datetime-local -> 'YYYY-MM-DD HH:MM:SS'
          const normalize = (val) => {
            if (!val) return val
            if (val.includes('T')) return val.replace('T', ' ') + ':00'
            if (val.length === 10) return val + ' 00:00:00'
            return val
          }
          params.startDate = normalize(customStartDate)
          params.endDate = normalize(customEndDate)
        } else {
          // Si no hay fechas válidas, usar 30 días por defecto
          params.days = '30'
        }
      } else {
        params.days = dateRange
      }
      
      const data = await getTicketsByEquipment(params)
      // Ordenar por duración descendente
      const sortedData = data.sort((a, b) => (b.duracion_minutos || 0) - (a.duracion_minutos || 0))
      setTickets(sortedData)
    } catch (error) {
      console.error('Error cargando tickets:', error)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  const prepareChartData = () => {
    return tickets.slice(0, 10).map((ticket, idx) => ({
      name: `#${ticket.id}`,
      fullData: ticket,
      'Tiempo (h)': parseFloat(((ticket.duracion_minutos || 0) / 60).toFixed(2)),
      'Piezas Perdidas': ticket.piezas || 0
    }))
  }

  const exportToExcel = () => {
    if (!tickets || tickets.length === 0) return
    
    const data = tickets.map((ticket, idx) => ({
      '#': idx + 1,
      'ID Ticket': ticket.id,
      'Máquina': ticket.equipo,
      'Descripción': ticket.descr,
      'Clasificación': ticket.clasificacion || 'N/A',
      'Modelo': ticket.modelo,
      'Línea': ticket.linea,
      'Duración (min)': ticket.duracion_minutos || 0,
      'Duración (horas)': parseFloat(((ticket.duracion_minutos || 0) / 60).toFixed(2)),
      'Piezas Perdidas': ticket.piezas || 0,
      'Reportado por': ticket.nombre,
      'Técnico': ticket.tecnico,
      'Solución': ticket.solucion || '',
      'Fecha Apertura': ticket.hr ? new Date(ticket.hr).toLocaleString('es-MX') : '',
      'Fecha Cierre': ticket.hc ? new Date(ticket.hc).toLocaleString('es-MX') : ''
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis de Máquina')
    
    const nombreArchivo = selectedMaquina === 'all' ? 'Todas_Maquinas' : selectedMaquina === 'sin_otros' ? 'Sin_Otros' : selectedMaquina
    const fileName = `Analisis_${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // ─── REPORTE DIARIO (special export) ────────────────────────────────────────
  const specialExportDiario = async () => {
    setSpecialExportLoading(true)
    setSpecialExportProgress('Obteniendo tickets...')
    try {
      const params = { equipo: 'all' }
      if (selectedLinea) params.linea = selectedLinea

      if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          const norm = v => v.includes('T') ? v.replace('T', ' ') + ':00' : v + ' 00:00:00'
          params.startDate = norm(customStartDate)
          params.endDate   = norm(customEndDate)
        } else { params.days = '30' }
      } else {
        params.days = dateRange
      }

      const allTickets = await getTicketsByEquipment(params)
      if (!allTickets || allTickets.length === 0) {
        setSpecialExportProgress('No hay tickets para este período.')
        setTimeout(() => setShowSpecialExportModal(false), 2000)
        return
      }

      setSpecialExportProgress(`Procesando ${allTickets.length} tickets...`)

      // Group by day (using hc, fallback hr)
      const byDay = {}
      allTickets.forEach(t => {
        const ref  = t.hc || t.hr
        const day  = ref ? new Date(ref).toISOString().split('T')[0] : 'Sin-Fecha'
        const linKey = `Línea ${t.linea}`
        if (!byDay[day]) byDay[day] = {}
        if (!byDay[day][linKey]) byDay[day][linKey] = []
        byDay[day][linKey].push(t)
      })

      const days = Object.keys(byDay).sort()

      // ── ExcelJS workbook ──────────────────────────────────────────────────────
      const wb = new ExcelJS.Workbook()
      wb.creator  = 'Deadtimes App'
      wb.created  = new Date()

      // Colour palette per line index
      const LINE_COLORS = [
        { header: '1F3864', row1: 'D6E4F7', row2: 'EBF2FB', accent: '2E75B6' },
        { header: '375623', row1: 'D9EAD3', row2: 'EEF7EB', accent: '548235' },
        { header: '7B3F00', row1: 'FCE8D5', row2: 'FDF4EE', accent: 'C55A11' },
        { header: '4B0082', row1: 'E8DAEF', row2: 'F5EEF8', accent: '7D3C98' },
        { header: '880808', row1: 'FADBD8', row2: 'FDECEA', accent: 'C0392B' },
        { header: '0B3D91', row1: 'D2E6FE', row2: 'EBF4FF', accent: '1A5276' },
      ]
      const getLC = idx => LINE_COLORS[idx % LINE_COLORS.length]

      const applyBorder = cell => {
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FF94A3B8' } },
          left:   { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right:  { style: 'thin', color: { argb: 'FF94A3B8' } },
        }
      }

      // ── SUMMARY sheet ────────────────────────────────────────────────────────
      setSpecialExportProgress('Generando hoja Resumen...')
      const ws0 = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
      ws0.columns = [
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 },
      ]

      // Title
      ws0.mergeCells('A1:F1')
      const title = ws0.getCell('A1')
      title.value = `REPORTE DIARIO DE TIEMPOS MUERTOS  •  Generado: ${new Date().toLocaleString('es-MX')}`
      title.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
      title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      title.alignment = { horizontal: 'center', vertical: 'middle' }
      ws0.getRow(1).height = 28

      ws0.mergeCells('A2:F2')
      const sub = ws0.getCell('A2')
      sub.value = `Período: ${days[0]} → ${days[days.length - 1]}   |   Línea${selectedLinea ? ': ' + selectedLinea : 'a: Todas'}`
      sub.font  = { size: 10, color: { argb: 'FF94A3B8' } }
      sub.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
      sub.alignment = { horizontal: 'center' }
      ws0.getRow(2).height = 18

      ws0.addRow([])

      // Header row
      const hRow = ws0.addRow(['Fecha', 'Línea', 'Tickets', 'Duración Total (min)', 'Duración Total (h)', 'Piezas Perdidas'])
      hRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        applyBorder(cell)
      })
      ws0.getRow(ws0.rowCount).height = 20

      let lineColorMap = {}
      let lcIdx = 0

      days.forEach(day => {
        const lineEntries = Object.entries(byDay[day]).sort(([a], [b]) => a.localeCompare(b))
        lineEntries.forEach(([linea, tks]) => {
          if (lineColorMap[linea] === undefined) { lineColorMap[linea] = lcIdx++ }
          const lc = getLC(lineColorMap[linea])
          const totalMin   = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas= tks.reduce((s, t) => s + (t.piezas || 0), 0)
          const dRow = ws0.addRow([
            day,
            linea,
            tks.length,
            totalMin,
            parseFloat((totalMin / 60).toFixed(2)),
            totalPiezas
          ])
          dRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + lc.row1 } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.font = { size: 10 }
            applyBorder(cell)
          })
        })
      })

      // ── One sheet per day ──────────────────────────────────────────────────
      for (let di = 0; di < days.length; di++) {
        const day = days[di]
        setSpecialExportProgress(`Generando hoja ${di + 1}/${days.length}: ${day}...`)

        const sheetName = day // YYYY-MM-DD fits in 31 chars
        const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] })
        ws.columns = [
          { width: 5 },  // #
          { width: 7 },  // ID
          { width: 14 }, // Equipo
          { width: 32 }, // Descripción
          { width: 16 }, // Clasificación
          { width: 12 }, // Duración min
          { width: 12 }, // Duración h
          { width: 9 },  // Piezas
          { width: 16 }, // Técnico
          { width: 20 }, // Apertura
          { width: 20 }, // Cierre
          { width: 35 }, // Solución
        ]

        // Day title banner
        ws.mergeCells('A1:L1')
        const dayTitle = ws.getCell('A1')
        dayTitle.value = `📅  REPORTE DEL DÍA: ${day}`
        dayTitle.font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
        dayTitle.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
        dayTitle.alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getRow(1).height = 30

        // ── Chart-data summary per line (first section, easy to select & chart in Excel)
        ws.addRow([])
        ws.mergeCells(`A${ws.rowCount}:L${ws.rowCount}`)
        const chartLabel = ws.getCell(`A${ws.rowCount}`)
        chartLabel.value = '📊  DATOS PARA GRÁFICA POR LÍNEA'
        chartLabel.font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
        chartLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
        chartLabel.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
        ws.getRow(ws.rowCount).height = 22

        const cHdr = ws.addRow(['Línea', 'Total Tickets', 'Duración Total (min)', 'Duración Total (h)', 'Piezas Perdidas', '', '', '', '', '', '', ''])
        cHdr.eachCell((cell, col) => {
          if (col <= 5) {
            cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            applyBorder(cell)
          }
        })
        ws.getRow(ws.rowCount).height = 18

        const lineEntries = Object.entries(byDay[day]).sort(([a], [b]) => a.localeCompare(b))
        lineEntries.forEach(([linea, tks]) => {
          const lc  = getLC(lineColorMap[linea] ?? 0)
          const totalMin    = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas = tks.reduce((s, t) => s + (t.piezas || 0), 0)
          const cRow = ws.addRow([
            linea, tks.length, totalMin,
            parseFloat((totalMin / 60).toFixed(2)), totalPiezas,
          ])
          cRow.eachCell((cell, col) => {
            if (col <= 5) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + lc.row1 } }
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
              cell.font = { bold: col === 1, size: 10 }
              applyBorder(cell)
            }
          })
        })

        ws.addRow([])
        ws.mergeCells(`A${ws.rowCount}:L${ws.rowCount}`)
        const detailLabel = ws.getCell(`A${ws.rowCount}`)
        detailLabel.value = '📋  DETALLE DE TICKETS POR LÍNEA'
        detailLabel.font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
        detailLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
        detailLabel.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
        ws.getRow(ws.rowCount).height = 22

        // ── Ticket sections per line
        lineEntries.forEach(([linea, tks]) => {
          const lc = getLC(lineColorMap[linea] ?? 0)

          ws.addRow([])

          // Line header banner
          ws.mergeCells(`A${ws.rowCount}:L${ws.rowCount}`)
          const lHdr = ws.getCell(`A${ws.rowCount}`)
          lHdr.value = `  ${linea.toUpperCase()}  —  ${tks.length} ticket(s)`
          lHdr.font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
          lHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + lc.header } }
          lHdr.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
          ws.getRow(ws.rowCount).height = 24

          // Column headers
          const colHdr = ws.addRow(['#', 'ID', 'Equipo', 'Descripción', 'Clasificación', 'Dur (min)', 'Dur (h)', 'Piezas', 'Técnico', 'Apertura', 'Cierre', 'Solución'])
          colHdr.eachCell(cell => {
            cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + lc.accent } }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
            applyBorder(cell)
          })
          ws.getRow(ws.rowCount).height = 18

          // Ticket rows
          tks.forEach((t, i) => {
            const isOdd = i % 2 === 0
            const fgColor = 'FF' + (isOdd ? lc.row1 : lc.row2)
            const dRow = ws.addRow([
              i + 1,
              t.id,
              t.equipo,
              t.descr,
              t.clasificacion || 'N/A',
              t.duracion_minutos || 0,
              parseFloat(((t.duracion_minutos || 0) / 60).toFixed(2)),
              t.piezas || 0,
              t.tecnico || 'N/A',
              t.hr  ? new Date(t.hr).toLocaleString('es-MX')  : '',
              t.hc  ? new Date(t.hc).toLocaleString('es-MX')  : '',
              t.solucion || '',
            ])
            dRow.eachCell((cell, col) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } }
              cell.font = { size: 9 }
              cell.alignment = { vertical: 'middle', wrapText: col === 4 || col === 12 }
              applyBorder(cell)
            })
            dRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
            dRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
            dRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
            dRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
            dRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }
          })

          // Line totals
          const totalMin    = tks.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
          const totalPiezas = tks.reduce((s, t) => s + (t.piezas || 0), 0)
          const totRow = ws.addRow(['', '', '', `TOTAL ${linea}`, '', totalMin, parseFloat((totalMin / 60).toFixed(2)), totalPiezas])
          totRow.eachCell(cell => {
            cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + lc.accent } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            applyBorder(cell)
          })
          totRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
          ws.getRow(ws.rowCount).height = 18
        })
      }

      // Write file
      setSpecialExportProgress('Guardando archivo...')
      const buf  = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const period = dateRange === 'custom'
        ? `${customStartDate?.slice(0,10)}_${customEndDate?.slice(0,10)}`
        : `ultimos${dateRange}dias`
      a.download = `Reporte_Diario_${period}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      setSpecialExportProgress('¡Listo! Descarga completada ✓')
      setTimeout(() => setShowSpecialExportModal(false), 2000)
    } catch (err) {
      console.error('Special export error:', err)
      setSpecialExportProgress(`Error: ${err.message}`)
    } finally {
      setSpecialExportLoading(false)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket)
    setShowModal(true)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload.fullData
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 font-medium text-sm mb-2">Ticket #{data.id}</p>
          <p className="text-xs text-slate-400 mb-1">{data.descr}</p>
          <p className="text-xs text-amber-300">Tiempo: {formatMinutes(data.duracion_minutos || 0)}</p>
          <p className="text-xs text-rose-300">Piezas: {data.piezas || 0}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-slate-400 mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Cargando análisis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="bg-slate-800 border-l-4 border-orange-600 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-3xl font-semibold text-slate-100 flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Análisis de Máquinas
              </h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">
                Visualiza los tickets con mayores tiempos por máquina para identificar errores y tiempos de atención
              </p>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Volver
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selector de máquina */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Máquina</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedMaquina}
                onChange={e => setSelectedMaquina(e.target.value)}
              >
                <option value="">-- Seleccionar máquina --</option>
                <option value="all">Todas las máquinas</option>
                <option value="sin_otros">Sin otros</option>
                {maquinas.map((maquina, idx) => (
                  <option key={idx} value={maquina}>{maquina}</option>
                ))}
              </select>
            </div>

            {/* Selector de línea */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Línea (opcional)</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
              >
                <option value="">Todas las líneas</option>
                {lineas.map(linea => (
                  <option key={linea.id} value={linea.linea}>Línea {linea.linea}</option>
                ))}
              </select>
            </div>

            {/* Selector de rango de fechas */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Período</label>
              <select 
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="60">Últimos 60 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Botones de exportar */}
            <div className="flex items-end gap-2">
              <button
                onClick={exportToExcel}
                disabled={!tickets || tickets.length === 0}
                className="flex-1 bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 px-3 py-2.5 rounded-lg transition-colors border border-emerald-600/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={() => { setShowSpecialExportModal(true); specialExportDiario() }}
                disabled={specialExportLoading}
                className="flex-1 bg-violet-700/70 hover:bg-violet-600/80 text-violet-100 px-3 py-2.5 rounded-lg transition-all border border-violet-500/60 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                title="Reporte diario: todas las líneas separadas por día"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reporte Diario
              </button>
            </div>

            {/* Fechas personalizadas */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Desde</label>
                  <input 
                    type="datetime-local"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Hasta</label>
                  <input 
                    type="datetime-local"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-2.5 text-sm"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        {!selectedMaquina ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <svg className="w-20 h-20 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-slate-400 text-lg">Selecciona una máquina o "Todas las máquinas" para ver el análisis</p>
          </div>
        ) : loadingTickets ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-orange-400 mb-4"></div>
            <p className="text-slate-300 text-lg font-medium">Cargando tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-12 text-center">
            <svg className="w-20 h-20 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-400 text-lg">No hay tickets para esta máquina</p>
            <p className="text-slate-500 text-sm mt-1">en el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Estadísticas resumidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total Tickets</p>
                    <p className="text-3xl font-bold text-blue-100 mt-1">{tickets.length}</p>
                  </div>
                  <div className="bg-blue-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-300 text-sm font-medium">Tiempo Total</p>
                    <p className="text-3xl font-bold text-amber-100 mt-1">
                      {formatMinutes(tickets.reduce((sum, t) => sum + (t.duracion_minutos || 0), 0))}
                    </p>
                  </div>
                  <div className="bg-amber-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Tiempo Promedio</p>
                    <p className="text-3xl font-bold text-purple-100 mt-1">
                      {formatMinutes(Math.round(tickets.reduce((sum, t) => sum + (t.duracion_minutos || 0), 0) / tickets.length))}
                    </p>
                  </div>
                  <div className="bg-purple-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-900/40 to-rose-800/20 border border-rose-700/50 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-rose-300 text-sm font-medium">Piezas Perdidas</p>
                    <p className="text-3xl font-bold text-rose-100 mt-1">
                      {tickets.reduce((sum, t) => sum + (t.piezas || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-rose-700/40 p-3 rounded-full">
                    <svg className="w-6 h-6 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfica de Top 10 tickets */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Top 10 Tickets con Mayor Tiempo</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={prepareChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Tiempo (h)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla detallada de tickets */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                Detalle de Tickets - {selectedMaquina}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-300 uppercase bg-slate-700">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Máquina</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Clasificación</th>
                      <th className="px-4 py-3">Sección</th>
                      <th className="px-4 py-3">Condición</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Línea</th>
                      <th className="px-4 py-3">Duración</th>
                      <th className="px-4 py-3">Piezas</th>
                      <th className="px-4 py-3">Fecha Cierre</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, idx) => (
                      <tr key={ticket.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-blue-300">#{ticket.id}</td>
                        <td className="px-4 py-3 text-orange-300 font-medium">{ticket.equipo}</td>
                        <td className="px-4 py-3 text-slate-200 max-w-xs truncate" title={ticket.descr}>
                          {ticket.descr}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="px-2 py-1 bg-slate-600 rounded text-xs">
                            {ticket.clasificacion || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{ticket.pa || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{ticket.pf || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-300">{ticket.modelo}</td>
                        <td className="px-4 py-3 text-slate-300">Línea {ticket.linea}</td>
                        <td className="px-4 py-3 text-amber-300 font-semibold">
                          {formatMinutes(ticket.duracion_minutos || 0)}
                        </td>
                        <td className="px-4 py-3 text-rose-300">{ticket.piezas || 0}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {ticket.hc ? new Date(ticket.hc).toLocaleDateString('es-MX') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openTicketDetail(ticket)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle de ticket */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-900/60 to-slate-900 border-b border-slate-700 p-4 sm:p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">
                  Ticket #{selectedTicket.id}
                </h2>
                <p className="text-slate-400 text-sm">{selectedTicket.equipo}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-3 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                {/* Información principal */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Información del Ticket</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Descripción:</span>
                      <span className="text-slate-200">{selectedTicket.descr}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Clasificación:</span>
                      <span className="text-slate-200">{selectedTicket.clasificacion || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Modelo:</span>
                      <span className="text-slate-200">{selectedTicket.modelo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Línea:</span>
                      <span className="text-slate-200">Línea {selectedTicket.linea}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sección Afectada:</span>
                      <span className="text-slate-200">{selectedTicket.pa || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Condición de Paro:</span>
                      <span className="text-slate-200">{selectedTicket.pf || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Montadoras afectadas - Mostrar solo si es NXT */}
                {selectedTicket.equipo === 'NXT' && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                    <h3 className="text-cyan-300 font-medium mb-3">Montadoras Afectadas</h3>
                    <div className="grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <div key={i} className={`flex items-center justify-center py-2 px-1 rounded text-sm font-medium ${
                          selectedTicket[`mod${i}`] ? 'bg-cyan-500/40 text-cyan-300 border border-cyan-500/60' : 'bg-slate-700/30 text-slate-500 border border-slate-600/30'
                        }`}>
                          M{i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiempos */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Tiempos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Duración Total:</span>
                      <span className="text-amber-300 font-bold text-lg">
                        {formatMinutes(selectedTicket.duracion_minutos || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fecha Apertura:</span>
                      <span className="text-slate-200">
                        {selectedTicket.hr ? new Date(selectedTicket.hr).toLocaleString('es-MX') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fecha Cierre:</span>
                      <span className="text-slate-200">
                        {selectedTicket.hc ? new Date(selectedTicket.hc).toLocaleString('es-MX') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Producción */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Impacto en Producción</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Piezas Perdidas:</span>
                      <span className="text-rose-300 font-bold text-lg">{selectedTicket.piezas || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tiempo Perdido (Deadtime):</span>
                      <span className="text-amber-300 font-bold text-lg">
                        {formatMinutes(selectedTicket.deadtime || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-slate-300 font-medium mb-3">Personal Involucrado</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Reportado por:</span>
                      <span className="text-slate-200">{selectedTicket.nombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Técnico Asignado:</span>
                      <span className="text-slate-200">{selectedTicket.tecnico || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Solución */}
                {selectedTicket.solucion && (
                  <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
                    <h3 className="text-emerald-300 font-medium mb-2">Solución Aplicada</h3>
                    <p className="text-slate-200 text-sm">{selectedTicket.solucion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Special Export Progress Modal */}
      {showSpecialExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-violet-500/40 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-900/50 border border-violet-500/50 flex items-center justify-center">
              {specialExportLoading ? (
                <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Reporte Diario</h3>
            <p className="text-slate-300 text-sm mb-1">Todas las líneas · Separado por día</p>
            <p className="text-violet-300 text-sm mt-4 font-medium">{specialExportProgress}</p>
            {!specialExportLoading && (
              <button
                onClick={() => setShowSpecialExportModal(false)}
                className="mt-5 px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
