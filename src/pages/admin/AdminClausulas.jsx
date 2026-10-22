import { useEffect, useState } from 'react';
import { api, formatMoney } from '../../lib/api';
import Spinner from '../../components/Spinner';

// Historial de clausulazos. Ya no requieren aprobación: se ejecutan al instante al pagarse.
export default function AdminClausulas() {
  const [clausulazos, setClausulazos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.clausulazos()
      .then(setClausulazos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-xl">Clausulazos</h1>
        <p className="text-sm text-gray-400 mt-1">
          Cláusulas pagadas por los usuarios. Se ejecutan al instante, sin aprobación.
          Reglas: protección de 15 días tras cada fichaje, cláusula máxima de 150M,
          subir la cláusula cuesta el 100% del incremento y máximo 4 clausulazos por usuario y jornada.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? <Spinner /> : (
        <div className="card">
          {clausulazos.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no se ha pagado ninguna cláusula</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {clausulazos.map(c => (
                <li key={c.id} className="flex justify-between items-center gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.jugador}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.vendedor} → <span className="text-gray-300">{c.comprador}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-300">{formatMoney(c.monto)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(c.creado_en).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      {' · '}tras J{c.periodo_jornada}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
