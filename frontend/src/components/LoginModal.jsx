import React, { useState, useRef, useEffect } from 'react';
import { login } from '../api_deadtimes';

export default function LoginModal({ visible, defaultEmployee = '', onClose, onConfirm, busy }) {
  const [employeeInput, setEmployeeInput] = useState(defaultEmployee);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const employeeInputRef = useRef(null);

  // Reiniciar todo cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setEmployeeInput(defaultEmployee);
      setPassword('');
      setStatus(null);
      // Focus en el campo de empleado al abrir
      setTimeout(() => {
        if (employeeInputRef.current) {
          employeeInputRef.current.focus();
        }
      }, 100);
    }
  }, [visible, defaultEmployee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    
    if (!employeeInput.trim()) {
      setStatus('Ingrese su número de empleado');
      return;
    }
    if (!password) {
      setStatus('Ingrese su contraseña');
      return;
    }

    try {
      await onConfirm({ employee_input: employeeInput.trim(), password });
    } catch (err) {
      const msg = err && err.message ? err.message : 'Error autenticando';
      setStatus(msg);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 text-slate-100 rounded-lg p-6 w-full max-w-sm shadow-2xl border border-slate-700">
        <h3 className="text-xl font-semibold mb-2 text-slate-100">Iniciar Sesión</h3>
        <p className="text-sm text-slate-400 mb-5">Ingrese sus credenciales para continuar</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Número de Empleado</label>
            <input
              ref={employeeInputRef}
              type="text"
              className="w-full border border-slate-600 bg-slate-700 text-slate-100 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
              value={employeeInput}
              onChange={(e) => setEmployeeInput(e.target.value)}
              placeholder="Ej: 1A, 123B"
              autoComplete="username"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Contraseña</label>
            <input
              type="password"
              className="w-full border border-slate-600 bg-slate-700 text-slate-100 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {status && (
            <div className="text-sm text-rose-400 bg-rose-900/20 border border-rose-700/30 p-3 rounded-lg mb-4">
              {status}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-5">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors border border-slate-600"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={busy}
            >
              {busy ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
