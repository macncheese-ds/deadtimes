import React, { useState } from 'react';
import api from '../api_deadtimes';

export default function Login({ setUser }) {
  const [num_empleado, setNum] = useState('');
  const [password, setPass] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { num_empleado: parseInt(num_empleado), password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e) {
      setError(e.response?.data?.message || 'Credenciales inválidas');
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
      <h2>Login (Escaneo Gaffet)</h2>
      <form onSubmit={submit}>
        <input
          type="number"
          placeholder="Número de Empleado"
          value={num_empleado}
          onChange={e => setNum(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPass(e.target.value)}
          required
        />
        <button type="submit">Iniciar Sesión</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}