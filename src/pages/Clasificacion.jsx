import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import Spinner from '../components/Spinner';

export default function Clasificacion() {
  const { user } = useAuth();
  const [tabla, setTabla] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSel, setJornadaSel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.clasificacion(),
      api.jornadas(),
    ]).then(([clas, jorns]) => {
      setTabla(clas);
      setJornadas(jorns.filter(j => j.estado === 'CALCULADA'));
    }).finally(() => setLoading(false));
  }, []);

  async function verJornada(n) {
    if (jornadaSel === n) { setJornadaSel(null); setTabla(await api.clasificacion()); return; }
    setJornadaSel(n);
    const data = await api.clasificacionJornada(n);
    setTabla(data);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Clasificación</h1>

      {/* Selector de jornada */}
      {jornadas.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setJornadaSel(null); api.clasificacion().then(setTabla); }}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              jornadaSel === null ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            General
          </button>
          {jornadas.map(j => (
            <button
              key={j.numero}
              onClick={() => verJornada(j.numero)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                jornadaSel === j.numero ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              J{j.numero}
            </button>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs">
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Equipo</th>
              <th className="text-right px-4 py-2">Pts</th>
              <th className="text-right px-4 py-2 hidden sm:table-cell">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tabla.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-6">Sin datos todavía</td></tr>
            ) : tabla.map((e, i) => {
              const esMio = e.propietario === user?.nombre;
              return (
                <tr key={e.id} className={`border-b border-gray-800/50 last:border-0 ${esMio ? 'bg-brand-900/20' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link to={`/equipo/${e.id}`} className={`font-medium hover:underline ${esMio ? 'text-brand-300' : 'hover:text-brand-400'}`}>
                      {e.nombre}
                    </Link>
                    <p className="text-xs text-gray-500">{e.propietario}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    {jornadaSel ? e.puntos_jornada ?? 0 : e.puntos_total}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">
                    {formatMoney(e.valor_plantilla_actual ?? e.valor_plantilla ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
