import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const SECCIONES = [
  { to: '/admin/usuarios',   icon: '👥', label: 'Usuarios',    desc: 'Gestionar cuentas y roles' },
  { to: '/admin/equipos',    icon: '🏟️', label: 'Equipos',     desc: 'Gestionar equipos reales' },
  { to: '/admin/jugadores',  icon: '👤', label: 'Jugadores',   desc: 'Gestionar catálogo y posiciones' },
  { to: '/admin/jornadas',   icon: '📅', label: 'Jornadas',    desc: 'Crear, abrir, cerrar y calcular' },
  { to: '/admin/partidos',   icon: '⚽', label: 'Partidos',    desc: 'Introducir estadísticas manualmente' },
  { to: '/admin/clausulas',  icon: '📋', label: 'Cláusulas',   desc: 'Historial de clausulazos' },
];

export default function Admin() {
  const [abriendo, setAbriendo] = useState(false);
  const [msgVentana, setMsgVentana] = useState('');

  async function abrirVentana() {
    setAbriendo(true);
    setMsgVentana('');
    try {
      const res = await api.admin.abrirVentanaMercado();
      if (res.ok) {
        setMsgVentana(`Ventana abierta: ${res.subastas_creadas} subastas creadas (cierre: ${new Date(res.cierre).toLocaleTimeString()})`);
      } else {
        setMsgVentana(res.motivo ?? 'Ya hay una ventana abierta hoy');
      }
    } catch (e) {
      setMsgVentana(`Error: ${e.message}`);
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-2xl">⚙️</span>
        <h1 className="font-bold text-xl">Panel de Administración</h1>
      </div>

      {/* Acciones rápidas */}
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-gray-400">Mercado</p>
        <div className="flex items-center gap-3">
          <button
            onClick={abrirVentana}
            disabled={abriendo}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {abriendo ? 'Abriendo...' : 'Abrir ventana de mercado'}
          </button>
          {msgVentana && <p className="text-sm text-gray-300">{msgVentana}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {SECCIONES.map(s => (
          <Link key={s.to} to={s.to} className="card hover:border-brand-700 transition-colors flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="font-bold">{s.label}</p>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
