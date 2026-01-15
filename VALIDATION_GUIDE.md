# Production Tab - Validation & Testing Guide

## Quick Summary

**Problems Found:**
1. ❌ Button initiates intervals, but nothing happens
2. ❌ No data registered in tables

**Root Cause:**
MySQL DECIMAL columns returned as strings → JavaScript concatenates instead of adds → Totales show corrupted values like `'00.000.000.000.000.000.000.000.000.000.000.000.00'`

**Solution:**
✅ Fixed type conversion in `GET /api/produccion/intervalos` endpoint - all DECIMAL columns now properly converted to floats before aggregation

---

## Validation Checklist

### Step 1: Verify Backend Fix Applied
- [ ] Check file: `deadtimes/backend/src/routes/produccion.js`
- [ ] Look for line ~107: `const normalizedRows = rows.map(r => ({`
- [ ] Verify all DECIMAL columns use `parseFloat()`
- [ ] **Action if missing:** Apply the fix from TROUBLESHOOTING_REPORT.md

### Step 2: Restart Backend Server
```powershell
# Stop any running Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Navigate and start backend
cd C:\Marcelo\deadtimes\backend
npm start
```
- [ ] Server shows: `Deadtimes API on 3107`
- [ ] Port 3107 is listening

### Step 3: Test API Directly

#### Test 3.1: Create Intervals
```bash
# Open PowerShell and run:
$body = @{
    linea = "1"
    fecha = "2026-01-15"
    turno = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3107/api/produccion/intervalos" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Intervalos creados para 1 - Turno 1 - 2026-01-15"
}
```

- [ ] Response is successful

#### Test 3.2: Get Intervals with Totales
```bash
Invoke-WebRequest -Uri "http://localhost:3107/api/produccion/intervalos?linea=1&fecha=2026-01-15&turno=1" `
  -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (Key Part):**
```json
{
  "totales": {
    "rate_total": 0,          ← Should be a NUMBER, not string
    "produccion_total": 0,    ← Should be a NUMBER, not string
    "scrap_total": 0,
    "deadtime_total": 0,      ← Should be 0, not "00.000.000..."
    "justificado_total": 0,   ← Should be 0, not "00.000.000..."
    "no_justificado_total": 0,← Should be 0, not "00.000.000..."
    "porcentaje_cumplimiento": 0
  },
  "data": [
    {
      "id": X,
      "hora_inicio": 8,
      "produccion": 0,        ← Should be NUMBER (0)
      "scrap": 0,             ← Should be NUMBER (0)
      "deadtime_minutos": 0,  ← Should be NUMBER (0), not string
      ...
    },
    // 12 intervals total
  ]
}
```

**Validation Points:**
- [ ] All `totales` values are **numbers**, not strings
- [ ] No concatenated strings like `"00.000.000..."`
- [ ] `deadtime_total`, `justificado_total`, `no_justificado_total` are all numbers
- [ ] 12 intervals returned (8-19 hours for turno 1)

### Step 4: Test Frontend Flow

#### 4.1 Navigate to Production Tab
- [ ] Click on "Sección Producción" in main menu
- [ ] Select "Línea 1"
- [ ] Select "Turno 1"
- [ ] Select today's date

#### 4.2 Test "Ir a Edición" (Edit View)
- [ ] Click "Ir a Edición" button
- [ ] Should show: "No hay intervalos registrados..." message
- [ ] Click "Inicializar Intervalos" button
- [ ] Should load intervals in ~2 seconds
- [ ] Verify: 12 intervals displayed in grid
- [ ] Verify: Interval buttons show `0p / 0s` (production/scrap)
- [ ] Verify: Totales section at bottom shows proper numbers:
  - [ ] `Rate Total: 0` (or correct number)
  - [ ] `Producción Total: 0`
  - [ ] `Scrap Total: 0`
  - [ ] `Deadtime Total: 0.00 min` (NOT a concatenated string)

#### 4.3 Test Editing Production
- [ ] Click on first interval (hora 8)
- [ ] In the "Producción" input field, enter: `100`
- [ ] Click outside or press Tab (triggers save)
- [ ] Wait 1 second for update
- [ ] Verify:
  - [ ] Production value updates in grid
  - [ ] Totales update correctly
  - [ ] No console errors in DevTools

#### 4.4 Test Editing Scrap
- [ ] In the "Scrap" input field, enter: `10`
- [ ] Click outside (triggers save)
- [ ] Verify:
  - [ ] Scrap value updates
  - [ ] Totales recalculate
  - [ ] Data displays properly

#### 4.5 Test Model Selection
- [ ] Click "Selecciona modelo" dropdown
- [ ] Select "FCM30 A BOT"
- [ ] Verify:
  - [ ] Producto field updates to "P00.270-44"
  - [ ] Rate field updates to "655"
  - [ ] Model saved automatically

### Step 5: Test "Ir a Review" (Review View)
- [ ] Go back to production section (click ✕)
- [ ] Click "Ir a Review" button
- [ ] Verify:
  - [ ] Table shows intervals
  - [ ] Columns: Hora, Deadtime (min), Justificado (min), No Justificado (min)
  - [ ] Values are numbers, not corrupted strings
  - [ ] Click on an interval
  - [ ] Modal shows related tickets (if any)

### Step 6: Database Verification

#### 6.1 Check Data Was Saved
```powershell
# Run diagnostic
cd C:\Marcelo\deadtimes\backend
node diagnostic.js
```

Look for:
- [ ] `produccion_intervalos` table exists ✅
- [ ] Total records > 0
- [ ] Sample shows production values (0 or the number you entered)
- [ ] Data persists correctly

#### 6.2 Check Audit Log
Run in MySQL:
```sql
SELECT * FROM auditor_cambios 
WHERE tabla_afectada = 'produccion_intervalos' 
ORDER BY timestamp DESC 
LIMIT 5;
```

Verify:
- [ ] Your edits are logged
- [ ] `num_empleado` shows as "0000" (generic user)
- [ ] `campo` shows "produccion" or "scrap"
- [ ] `valor_nuevo` shows your entered values

---

## Troubleshooting

### Problem: Still seeing corrupted totales like "00.000..."

**Solution:**
1. Stop backend: `Get-Process node | Stop-Process -Force`
2. Verify code fix in `deadtimes/backend/src/routes/produccion.js` (line ~105+)
3. Start backend again: `npm start`
4. Clear browser cache: Ctrl+Shift+Delete
5. Test again

### Problem: "Error inicializando intervalos"

**Solution:**
1. Check backend logs for error message
2. Verify database connection: `node diagnostic.js`
3. Ensure database `deadtimes` exists and is accessible
4. Check `.env` file has correct DB credentials

### Problem: Intervals not showing after clicking "Inicializar"

**Solution:**
1. Open DevTools → Console (F12)
2. Look for error messages
3. Check Network tab → POST /api/produccion/intervalos
   - Should return status 200
   - Response should have `"success": true`
4. Check Network tab → GET /api/produccion/intervalos
   - Should return status 200
   - Response `data` array should have 12 items

### Problem: Data doesn't persist after refresh

**Solution:**
1. Verify intervals were actually saved by running:
   ```bash
   Push-Location C:\Marcelo\deadtimes\backend
   node diagnostic.js
   ```
2. Check if `produccion_intervalos` has records
3. Verify `updated_at` timestamp is recent
4. If data exists but doesn't load:
   - Clear browser cache
   - Hard refresh (Ctrl+F5)
   - Check browser console for errors

---

## Expected Behavior After Fix

### ✅ Edición View Should:
- Display 12 intervals in a grid (hours 8-19 for turno 1)
- Allow editing production and scrap values
- Auto-save on blur/change
- Display totales at bottom with proper numbers
- Show deadtime calculations
- Allow model selection from dropdown

### ✅ Review View Should:
- Show intervals with deadtime analysis
- Display proper numbers (not concatenated strings)
- Allow clicking intervals to see related tickets
- Show modal with ticket details

### ✅ Data Should:
- Persist in database after editing
- Appear in audit log when changed
- Be retrievable via API with correct data types
- Show up correctly in both frontend and database

---

## Key Metrics to Verify

| Metric | Expected | How to Check |
|--------|----------|--------------|
| Intervals created | 12 per turno | Count items in `/intervalos` response |
| Data type: deadtime_total | `number` | `typeof response.totales.deadtime_total === 'number'` |
| Data type: NOT string concat | NOT `"00.000..."` | Value should never contain multiple dots |
| Database records | > 0 | `SELECT COUNT(*) FROM produccion_intervalos` |
| Updates logged | 1+ per edit | `SELECT COUNT(*) FROM auditor_cambios WHERE tabla_afectada='produccion_intervalos'` |
| API response time | < 500ms | Check Network tab in DevTools |

---

## Success Criteria

✅ **All of the following must be true:**

1. POST /api/produccion/intervalos returns status 200
2. GET /api/produccion/intervalos returns proper numbers (not strings)
3. Intervals display in frontend without errors
4. Production/scrap edits save and persist
5. Totales display correct calculations (not concatenated strings)
6. Data appears in database with correct values
7. Audit log records all changes

---

## Quick Test Script

```powershell
# Save as C:\Marcelo\deadtimes\backend\quick_test.ps1

Write-Host "🔍 Quick Production Tab Validation" -ForegroundColor Cyan
Write-Host "=================================="

# Test 1: API responds
Write-Host "`n1️⃣  Testing API connection..."
$response = Invoke-WebRequest -Uri "http://localhost:3107/api/deadtimes/lineas" -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "   ✅ API is responding"
} else {
    Write-Host "   ❌ API not responding - Start backend server"
    exit
}

# Test 2: Create intervals
Write-Host "`n2️⃣  Testing interval creation..."
$body = @{
    linea = "1"
    fecha = (Get-Date -Format "yyyy-MM-dd")
    turno = 1
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3107/api/produccion/intervalos" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    Write-Host "   ✅ Intervals created"
} else {
    Write-Host "   ❌ Failed to create intervals"
    exit
}

# Test 3: Verify data types
Write-Host "`n3️⃣  Verifying data types..."
$response = Invoke-WebRequest -Uri "http://localhost:3107/api/produccion/intervalos?linea=1&fecha=$(Get-Date -Format 'yyyy-MM-dd')&turno=1" `
  -Method GET -ErrorAction SilentlyContinue | ConvertFrom-Json

$deadtime = $response.totales.deadtime_total
if ($deadtime -is [Double] -or $deadtime -is [Int]) {
    Write-Host "   ✅ Deadtime total is a number: $deadtime"
} else {
    Write-Host "   ❌ Deadtime total is NOT a number: $deadtime (type: $($deadtime.GetType().Name))"
}

Write-Host "`n✅ Validation complete"
```

Run with: `powershell C:\Marcelo\deadtimes\backend\quick_test.ps1`

---

## Support

If issues persist after following this guide:

1. Check [TROUBLESHOOTING_REPORT.md](TROUBLESHOOTING_REPORT.md) for detailed technical explanation
2. Review `deadtimes/backend/src/routes/produccion.js` lines 105-152 for the type conversion logic
3. Run `node diagnostic.js` to verify database schema
4. Check browser DevTools Console (F12) for frontend errors
5. Check backend logs for API errors

