import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import Escudo from './Escudo';
import JugadorFoto from './JugadorFoto';
import JugadorModal from './JugadorModal';
import Spinner from './Spinner';

const POSICIONES = [
  { pos: 'ENT', titulo: 'Entrenador' },
  { pos: 'POR', titulo: 'Porteros' },
  { pos: 'DEF', titulo: 'Defensas' },
  { pos: 'MED', titulo: 'Centrocampistas' },
  { pos: 'DEL', titulo: 'Delanteros' },
  { pos: null, titulo: 'Sin posición' },
];

// Plantilla de un equipo real (los jugadores del club) con su valor y quién los tiene en el fantasy.
// Al pulsar un jugador se abre su ficha, desde donde se puede ofertar o pagar la cláusula
export default function PlantillaRealModal({ equipo, onClose }) {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jugadorModal, setJugadorModal] = useState(null);

  function cargar() {
    return api.jugadores({ equipo: equipo.id })
      .then(setJugadores)
      .catch(e => setError(e.message));
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    cargar().finally(() => setLoading(false));
  }, [equipo.id]);

  // Cerrar con Escape (si la ficha de un jugador está abierta, el Escape solo cierra esa ficha)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !jugadorModal) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, jugadorModal]);

  const libres = jugadores.filter(j => !j.propietario).length;
  const grupos = POSICIONES
    .map(g => ({ ...g, jugadores: jugadores.filter(j => (j.posicion ?? null) === g.pos) }))
    .filter(g => g.jugadores.length > 0);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Escudo src={equipo.escudo} nombre={equipo.nombre} className="w-12 h-12 text-lg" />
              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-tight truncate">{equipo.nombre}</h2>
                {!loading && !error && (
                  <p className="text-sm text-gray-400">
                    {jugadores.length} jugador{jugadores.length !== 1 ? 'es' : ''}
                    {' · '}
                    <span className="text-green-400">{libres} libre{libres !== 1 ? 's' : ''}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-xl leading-none ml-4 shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Body scrollable */}
          <div className="overflow-y-auto flex-1">
            {loading && <div className="p-6"><Spinner /></div>}
            {error && <p className="p-4 text-red-400 text-sm">{error}</p>}

            {!loading && !error && (
              jugadores.length === 0 ? (
                <p className="p-6 text-center text-gray-500 text-sm">Este equipo no tiene jugadores dados de alta</p>
              ) : (
                <div className="p-4 space-y-4">
                  {grupos.map(g => (
                    <div key={g.pos ?? 'sin-pos'}>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        {g.titulo} <span className="font-normal">({g.jugadores.length})</span>
                      </p>
                      <ul className="divide-y divide-gray-800">
                        {g.jugadores.map(j => (
                          <li key={j.id}>
                            <button
                              onClick={() => setJugadorModal(j.id)}
                              className="w-full flex items-center gap-3 py-2 text-left hover:bg-gray-800/60 rounded-lg px-1 transition-colors"
                            >
                              <JugadorFoto id={j.id} nombre={j.nombre} size={36} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{j.nombre}</p>
                                <p className={`text-xs truncate ${j.propietario ? 'text-gray-500' : 'text-green-400'}`}>
                                  {j.propietario ?? 'Libre'}
                                </p>
                              </div>
                              <p className="font-bold text-green-400 text-sm shrink-0">{formatMoney(j.precio_actual)}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Ficha del jugador por encima de la plantilla; tras un clausulazo cambia el propietario */}
      <JugadorModal idJugador={jugadorModal} onClose={() => setJugadorModal(null)} onCambio={cargar} />
    </>
  );
}
