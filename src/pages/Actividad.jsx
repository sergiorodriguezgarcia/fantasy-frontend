import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import JugadorFoto from '../components/JugadorFoto';
import Spinner from '../components/Spinner';
import JugadorModal from '../components/JugadorModal';

export default function Actividad() {
  const [historico, setHistorico] = useState([]);
  const [jugadorModal, setJugadorModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.historicoMercado()
      .then(setHistorico)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <JugadorModal idJugador={jugadorModal} onClose={() => setJugadorModal(null)} />
      <h1 className="font-bold text-xl">Actividad</h1>

      {/* Histórico de fichajes: compras en el mercado, ofertas aceptadas y clausulazos */}
      {loading ? <Spinner /> : historico.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400">Todavía no hay fichajes</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {historico.map((h, i) => (
            <li key={`${h.tipo}-${h.fecha}-${i}`} className="card flex items-center gap-3">
              <JugadorFoto id={h.id_jugador} nombre={h.jugador} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-white">{h.comprador}</span> ha comprado a{' '}
                  <button className="font-semibold hover:text-brand-400 text-left" onClick={() => setJugadorModal(h.id_jugador)}>
                    {h.jugador}
                  </button>{' '}
                  por <span className="font-bold text-green-400">{formatMoney(h.monto)}</span>
                  {h.vendedor && <> a <span className="font-semibold text-white">{h.vendedor}</span></>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(h.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  {h.tipo === 'CLAUSULA' && <span className="ml-2 text-orange-300 font-semibold">🔓 Clausulazo</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
