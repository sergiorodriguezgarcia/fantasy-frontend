import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import Spinner from '../components/Spinner';
import ProximosPartidos from '../components/ProximosPartidos';

export default function Inicio() {
  const { user } = useAuth();
  const [clasificacion, setClasificacion] = useState([]);
  const [jornada, setJornada] = useState(null);
  const [proxima, setProxima] = useState(null);
  const [miEquipo, setMiEquipo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.rol === 'admin') return;
    Promise.all([
      api.clasificacion().catch(() => []),
      api.jornadaActual().catch(() => null),
      api.proximaJornada().catch(() => null),
      api.miEquipo().catch(() => null),
    ]).then(([clas, jorn, prox, eq]) => {
      setClasificacion(clas);
      setJornada(jorn);
      setProxima(prox);
      setMiEquipo(eq);
    }).finally(() => setLoading(false));
  }, [user]);

  if (user?.rol === 'admin') return <Navigate to="/admin" replace />;

  if (loading) return <Spinner />;

  const miPuesto = clasificacion.findIndex(e => e.propietario === user?.nombre) + 1;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="card bg-gradient-to-br from-brand-900/40 to-gray-900">
        <p className="text-gray-400 text-sm">Hola, {user?.nombre}</p>
        <p className="text-2xl font-bold mt-1">{miEquipo?.nombre ?? 'Mi equipo'}</p>
        <div className="flex gap-6 mt-3 text-sm">
          <div>
            <p className="text-gray-400">Saldo</p>
            <p className="text-green-400 font-bold text-lg">
              {formatMoney(miEquipo?.saldo_disponible ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Posición</p>
            <p className="text-white font-bold text-lg">
              {miPuesto > 0 ? `${miPuesto}º` : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Jugadores</p>
            <p className="text-white font-bold text-lg">
              {miEquipo?.jugadores?.length ?? 0}/13
            </p>
          </div>
        </div>
      </div>

      {/* Jornada actual */}
      {jornada && (
        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Jornada</p>
              <p className="font-bold">Jornada {jornada.numero}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              jornada.estado === 'EN_CURSO' ? 'bg-green-900 text-green-300' :
              jornada.estado === 'CALCULADA' ? 'bg-blue-900 text-blue-300' :
              'bg-gray-800 text-gray-400'
            }`}>
              {jornada.estado}
            </span>
          </div>
          <Link to="/jornada" className="text-brand-400 text-sm mt-2 block hover:underline">
            Ver puntuaciones →
          </Link>
        </div>
      )}

      {/* Partidos de la próxima jornada */}
      <ProximosPartidos jornada={proxima} />

      {/* Top 5 clasificación */}
      <div className="card">
        <h2 className="font-bold mb-3 flex justify-between">
          <span>Clasificación</span>
          <Link to="/clasificacion" className="text-brand-400 text-sm font-normal hover:underline">Ver todo →</Link>
        </h2>
        {clasificacion.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no hay puntuaciones.</p>
        ) : (
          <ul className="space-y-2">
            {clasificacion.slice(0, 5).map((e, i) => (
              <li key={e.id} className={`flex justify-between items-center text-sm py-1 ${
                e.propietario === user?.nombre ? 'text-brand-300' : ''
              }`}>
                <span className="flex gap-2 items-center">
                  <span className="text-gray-500 w-4">{i + 1}.</span>
                  <span className="font-medium">{e.nombre}</span>
                </span>
                <span className="font-bold">{e.puntos_total} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/mercado" className="card text-center hover:border-brand-700 transition-colors">
          <p className="text-2xl">🔄</p>
          <p className="font-semibold mt-1">Mercado</p>
          <p className="text-xs text-gray-500">Subastas activas</p>
        </Link>
        <Link to="/mi-equipo" className="card text-center hover:border-brand-700 transition-colors">
          <p className="text-2xl">👕</p>
          <p className="font-semibold mt-1">Mi Equipo</p>
          <p className="text-xs text-gray-500">{miEquipo?.jugadores?.length ?? 0}/13 jugadores</p>
        </Link>
      </div>
    </div>
  );
}
