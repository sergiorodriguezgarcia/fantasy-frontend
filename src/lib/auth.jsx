import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setUser(null); return; }
    api.me()
      .then(setUser)
      .catch(() => { localStorage.removeItem('token'); setUser(null); });
  }, []);

  async function login(email, password) {
    const { token, usuario } = await api.login(email, password);
    localStorage.setItem('token', token);
    setUser(usuario);
    return usuario;
  }

  async function registro(nombre, email, password) {
    const { token, usuario } = await api.registro(nombre, email, password);
    localStorage.setItem('token', token);
    setUser(usuario);
    return usuario;
  }

  // Nueva contraseña con el token del enlace del correo; el backend deja la sesión iniciada
  async function restablecerPassword(tokenEnlace, password) {
    const { token, usuario } = await api.restablecerPassword(tokenEnlace, password);
    localStorage.setItem('token', token);
    setUser(usuario);
    return usuario;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, registro, restablecerPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
