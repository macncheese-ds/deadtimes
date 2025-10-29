import React, { useState, useRef, useEffect } from 'react';
import api from '../api_deadtimes';
import { API_BASE_URL } from '../api_deadtimes';

export default function LoginModal({ visible, defaultEmployee = '', onClose, onConfirm, busy }) {
  const [phase, setPhase] = useState('scan'); // 'scan' or 'password'
  const [employeeInput, setEmployeeInput] = useState(defaultEmployee);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [foundUser, setFoundUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastLookupUrl, setLastLookupUrl] = useState(null);
  const [lastLookupResp, setLastLookupResp] = useState(null);
  const [lastLookupErr, setLastLookupErr] = useState(null);
  const debugEnabled = typeof window !== 'undefined' && window.location.search.includes('debugScan=1');

  // Reiniciar todo cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setPhase('scan');
      setEmployeeInput(defaultEmployee);
      setPassword('');
      setStatus(null);
      setFoundUser(null);
      setScanBuffer('');
      setScanning(false);
      setLastLookupUrl(null);
      setLastLookupResp(null);
      setLastLookupErr(null);
    }
  }, [visible, defaultEmployee]);

  // Focus the input trap whenever the modal opens in scan phase
  useEffect(() => {
    if (visible && phase === 'scan') {
      // Focus the input trap after a short delay to capture scanner input on PDA
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.value = '';
        }
      }, 100);
    }
  }, [visible, phase]);

  // Global key listener to capture scanner input even if focus is elsewhere.
  useEffect(() => {
    if (!visible || phase !== 'scan') return;

    let localBuffer = '';
    
    const processScannedCode = async (code) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setStatus('No se detectó código');
        return;
      }
      
      setScanning(true);
      setStatus(null);
      const cleaned = trimmed.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      console.log('[LoginModal] Processing scan - raw:', trimmed, 'cleaned:', cleaned);
      setLastLookupUrl(`${API_BASE_URL || ''}/auth/lookup/${encodeURIComponent(cleaned)}`);
      
      try {
        const resp = await api.lookupUser(cleaned);
        console.log('[LoginModal] lookup SUCCESS:', resp);
        setLastLookupResp(resp);
        setLastLookupErr(null);
        setFoundUser(resp);
        setEmployeeInput(resp.num_empleado || resp.usuario || cleaned);
        setPhase('password');
      } catch (err) {
        console.error('[LoginModal] lookup FAILED:', err);
        setLastLookupErr({ message: err.message, status: err.status });
        setStatus(err.message || 'Usuario no encontrado');
      } finally {
        setScanning(false);
      }
    };
    
    const onKey = (e) => {
      console.log('[LoginModal] Key event:', e.key, 'buffer:', localBuffer);
      
      if (e.key === 'Enter') {
        const code = localBuffer || (inputRef.current && inputRef.current.value) || '';
        localBuffer = '';
        setScanBuffer('');
        if (inputRef.current) inputRef.current.value = '';
        if (window._scanTimeout) { clearTimeout(window._scanTimeout); window._scanTimeout = null; }
        processScannedCode(code);
      } else if (e.key.length === 1 || e.key === 'Shift' || e.key === 'Tab') {
        if (e.key.length === 1) {
          localBuffer += e.key;
          setScanBuffer(localBuffer);
        }
        // Zebra scanners often send data quickly without Enter - use shorter timeout
        if (window._scanTimeout) clearTimeout(window._scanTimeout);
        window._scanTimeout = setTimeout(() => {
          const code = localBuffer;
          localBuffer = '';
          setScanBuffer('');
          if (inputRef.current) inputRef.current.value = '';
          if (code && code.trim()) {
            console.log('[LoginModal] Auto-submit after timeout, buffer:', code);
            processScannedCode(code);
          }
        }, 200); // Increased to 200ms for Zebra devices
      }
    };

    const onPaste = (ev) => {
      const pasted = (ev.clipboardData || window.clipboardData).getData('text') || '';
      console.log('[LoginModal] Paste event:', pasted);
      if (!pasted) return;
      localBuffer = '';
      setScanBuffer('');
      if (window._scanTimeout) { clearTimeout(window._scanTimeout); window._scanTimeout = null; }
      processScannedCode(pasted);
    };
    
    // Zebra DataWedge intent handler (if configured)
    const onInput = (ev) => {
      if (ev.target === inputRef.current) {
        const val = ev.target.value;
        console.log('[LoginModal] Input event value:', val);
        if (val && val.length > 2) {
          localBuffer = '';
          setScanBuffer('');
          if (window._scanTimeout) { clearTimeout(window._scanTimeout); window._scanTimeout = null; }
          ev.target.value = '';
          processScannedCode(val);
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    if (inputRef.current) {
      inputRef.current.addEventListener('input', onInput);
    }
    
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('paste', onPaste);
      if (inputRef.current) {
        inputRef.current.removeEventListener('input', onInput);
      }
      if (window._scanTimeout) { clearTimeout(window._scanTimeout); window._scanTimeout = null; }
    };
  }, [visible, phase]);

  // Do not return early before hooks are registered. The actual UI return will check `visible`.

  const handleScannerKey = (e) => {
    // Forward to document listener - single handling path
    console.log('[LoginModal] Input key:', e.key);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await onConfirm({ employee_input: employeeInput || foundUser?.num_empleado || '', password });
    } catch (err) {
      const msg = err && err.message ? err.message : 'Error autenticando';
      setStatus(msg);
    }
  };

  // Only render the modal UI when requested. Hooks above always run.
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 text-gray-100 rounded-lg p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        {/* Simple scanner box (animation removed as requested) */}
        <style>{`
          .scanner-box { height: 120px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:2px dashed #4b5563; background:#1f2937 }
          .scanner-text { font-weight:700; color:#f3f4f6 }
        `}</style>

        {phase === 'scan' ? (
          <div>
            <h3 className="text-lg font-semibold mb-3">Escanear Gaffet</h3>
            <p className="text-sm text-gray-400 mb-4">Por favor, escanee su gaffet desde la PDA. La aplicación está esperando el escaneo.</p>

            <div className="mb-3">
              <div className="scanner-box mb-2" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Large transparent input trap that fills the scan box - captures PDA scanner without showing keyboard */}
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="none"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onKeyDown={handleScannerKey}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    fontSize: '16px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    cursor: 'default',
                    caretColor: 'transparent'
                  }}
                />
                <div className="scanner-text" style={{ pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
                  {scanning ? 'Escaneando...' : 'ESCANEE SU GAFFET'}
                  {scanBuffer && <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Buffer: {scanBuffer}</div>}
                </div>
              </div>
            </div>

            {status && <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded mb-3">{status}</div>}

            <div className="flex gap-3 justify-end">
                <button type="button" onClick={onClose} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">Cancelar</button>
              </div>

              {debugEnabled && (
                <div className="mt-4 p-3 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300">
                  <div><strong>Debug Scan</strong></div>
                  <div>buffer: <code>{scanBuffer}</code></div>
                  <div>lastUrl: <code>{lastLookupUrl}</code></div>
                  <div>lastResp: <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(lastLookupResp || {}, null, 2)}</pre></div>
                  <div>lastErr: <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(lastLookupErr || {}, null, 2)}</pre></div>
                </div>
              )}
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-3">Gaffet Aceptado</h3>
            <p className="text-sm text-gray-400 mb-4">Usuario encontrado: <strong className="text-gray-100">{foundUser?.nombre || foundUser?.usuario}</strong></p>

            <form onSubmit={submitPassword}>
              <div className="mb-3">
                <label className="block text-sm text-gray-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  className="w-full border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                />
              </div>

              {status && <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded mb-3">{status}</div>}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setPhase('scan'); setPassword(''); }} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">← Volver</button>
                <button type="submit" className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Verificando...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
