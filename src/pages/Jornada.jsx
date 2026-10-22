import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import PosBadge from '../components/PosBadge';
import Spinner from '../components/Spinner';
import JugadorModal from '../components/JugadorModal';
import AlineacionPuntos from '../components/AlineacionPuntos';

export default function Jornada() {
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSel, setJornadaSel] = useState(null);
  const [stats, setStats] = useState([]);
  const [miPuntuacion, setMiPuntuacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('global'); // 'global' | 'mio'
  const [jugadorModal, setJugadorModal] = useState(null);

  useEffect(() => {
    api.jornadas().then(jorns => {
      const calculadas = jorns.filter(j => j.estado === 'CALCULADA');
      setJornadas(calculadas);
      if (calculadas.length > 0) {
        const ultima = calculadas[calculadas.length - 1];
        cargarJornada(ultima);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function cargarJornada(j) {
    setLoading(true);
    setJornadaSel(j);
    try {
      const [s, mp] = await Promise.all([
        api.estadisticasJornada(j.id),
        api.miPuntuacion(j.id),
      ]);
      setStats(s);
      setMiPuntuacion(mp);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !jornadaSel) return <Spinner />;

  if (jornadas.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-400">Aún no hay jornadas calculadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <JugadorModal idJugador={jugadorModal} onClose={() => setJugadorModal(null)} />
      <h1 className="font-bold text-xl">Jornada</h1>

      {/* Selector de jornada */}
      <div className="flex gap-2 flex-wrap">
        {jornadas.map(j => (
          <button
            key={j.id}
            onClick={() => cargarJornada(j)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              jornadaSel?.id === j.id ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            J{j.numero}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-800">
            {[['global', '📊 Todos'], ['mio', '👕 Mi equipo']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  tab === key ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'global' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left px-3 py-2">Jugador</th>
                    <th className="text-right px-3 py-2 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <PosBadge pos={s.posicion} />
                          <span>{s.jugador}</span>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">{s.equipo_real}</p>
                      </td>
                      <td className="text-right px-3 py-2 font-bold text-green-400">{s.puntos ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'mio' && miPuntuacion && (
            <div className="space-y-3">
              <div className="card flex justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Puntos esta jornada</p>
                  <p className="text-3xl font-bold text-green-400">{miPuntuacion.puntos_jornada ?? 0}</p>
                  {miPuntuacion.premio != null && (
                    <p className="text-sm text-yellow-400 font-semibold mt-1" title="100.000€ por cada punto de la jornada">
                      Premio: +{formatMoney(miPuntuacion.premio)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Acumulados</p>
                  <p className="text-2xl font-bold">{miPuntuacion.puntos_acumulados ?? 0}</p>
                </div>
              </div>
              <AlineacionPuntos alineacion={miPuntuacion.alineacion} onVerFicha={setJugadorModal} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
