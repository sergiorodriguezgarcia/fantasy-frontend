import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import Spinner from '../components/Spinner';
import ProximosPartidos from '../components/ProximosPartidos';
import ClasificacionLiga from '../components/ClasificacionLiga';

// Máximo de jugadores por plantilla (el backend no deja fichar más: services/plantilla.js)
const MAX_JUGADORES = 15;

export default function Inicio() {
  const { user } = useAuth();
  const [clasificacion, setClasificacion] = useState([]);
  const [jornada, setJornada] = useState(null);
  const [proxima, setProxima] = useState(null);
  const [miEquipo, setMiEquipo] = useState(null);
  const [liga, setLiga] = useState([]);
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
    // La clasificación de la liga viene de la federación y puede tardar: no bloquea la pantalla
    api.clasificacionLiga().then(setLiga).catch(() => {});
  }, [user]);

  if (user?.rol === 'admin') return <Navigate to="/admin" replace />;

  if (loading) return <Spinner />;

  const miPuesto = clasificacion.findIndex(e => e.propietario === user?.nombre) + 1;
  const numJugadores = miEquipo?.jugadores?.length ?? 0;

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
          <Link to="/clasificacion" className="hover:text-brand-400 transition-colors">
            <p className="text-gray-400">Posición</p>
            <p className="font-bold text-lg">
              {miPuesto > 0 ? `${miPuesto}º` : '—'}
            </p>
          </Link>
          <Link to="/mi-equipo" className="hover:text-brand-400 transition-colors">
            <p className="text-gray-400">Jugadores</p>
            <p className={`font-bold text-lg ${numJugadores >= MAX_JUGADORES ? 'text-yellow-400' : ''}`}>
              {numJugadores}/{MAX_JUGADORES}
            </p>
          </Link>
        </div>
        {jornada && (
          <Link to="/jornada" className="text-brand-400 text-sm mt-3 block hover:underline">
            Puntuaciones de la jornada {jornada.numero} →
          </Link>
        )}
      </div>

      {/* Partidos de la próxima jornada */}
      <ProximosPartidos jornada={proxima} />

      {/* Clasificación real de la liga */}
      <ClasificacionLiga filas={liga} />
    </div>
  );
}
