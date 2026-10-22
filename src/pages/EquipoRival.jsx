import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatMoney } from '../lib/api';
import PosBadge from '../components/PosBadge';
import JugadorFoto from '../components/JugadorFoto';
import Spinner from '../components/Spinner';
import JugadorModal from '../components/JugadorModal';
import ClausulaChip from '../components/ClausulaChip';
import AlineacionPuntos from '../components/AlineacionPuntos';

const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'];
const POS_LABEL = { POR: 'Portero', DEF: 'Defensas', MED: 'Mediocampistas', DEL: 'Delanteros' };

export default function EquipoRival() {
  const { id } = useParams();
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jugadorModal, setJugadorModal] = useState(null);
  const [tab, setTab] = useState('plantilla');

  // Jornada tab state
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSel, setJornadaSel] = useState(null);
  const [jornadaData, setJornadaData] = useState(null);
  const [loadingJornada, setLoadingJornada] = useState(false);

  function cargarEquipo() {
    return api.equipo(id).then(setEquipo);
  }

  useEffect(() => {
    cargarEquipo()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    api.jornadas().then(jorns => {
      const calculadas = jorns.filter(j => j.estado === 'CALCULADA');
      setJornadas(calculadas);
      if (calculadas.length > 0) {
        const ultima = calculadas[calculadas.length - 1];
        setJornadaSel(ultima);
        cargarJornada(ultima);
      }
    });
  }, [id]);

  async function cargarJornada(j) {
    setJornadaSel(j);
    setLoadingJornada(true);
    try {
      const data = await api.equipoJornada(id, j.id);
      setJornadaData(data);
    } finally {
      setLoadingJornada(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-400">{error}</p>;

  const titulares = equipo.jugadores.filter(j => j.es_titular);
  const suplentes = equipo.jugadores.filter(j => !j.es_titular);
  const valorPlantilla = equipo.jugadores.reduce((s, j) => s + parseInt(j.precio_actual), 0);
  const puntosTotal = equipo.jugadores.reduce((s, j) => s + parseInt(j.puntos_total), 0);

  return (
    <div className="space-y-4">
      <JugadorModal
        idJugador={jugadorModal}
        onClose={() => setJugadorModal(null)}
        onCambio={() => cargarEquipo().catch(() => {})}
      />

      {/* Cabecera */}
      <div className="card">
        <h1 className="font-bold text-xl">{equipo.nombre}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{equipo.propietario}</p>
        <div className="flex gap-4 mt-3 text-sm">
          <div><p className="text-gray-400">Puntos</p><p className="text-green-400 font-bold">{puntosTotal}</p></div>
          <div><p className="text-gray-400">Valor</p><p className="font-bold">{formatMoney(valorPlantilla)}</p></div>
          <div><p className="text-gray-400">Plantilla</p><p className="font-bold">{equipo.jugadores.length} jug.</p></div>
          {equipo.formacion && (
            <div><p className="text-gray-400">Formación</p><p className="font-bold">{equipo.formacion}</p></div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {[['plantilla', 'Plantilla'], ['jornada', 'Por jornada']].map(([key, label]) => (
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

      {tab === 'plantilla' && (
        <>
          {/* Titulares por posición */}
          {POSICIONES.map(pos => {
            const jugadoresPos = titulares.filter(j => j.posicion === pos);
            if (jugadoresPos.length === 0) return null;
            return (
              <div key={pos} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <PosBadge pos={pos} />
                  <span className="text-sm font-semibold text-gray-300">{POS_LABEL[pos]}</span>
                </div>
                <ul className="space-y-1">
                  {jugadoresPos.map(j => (
                    <li key={j.id_jugador}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-gray-800 cursor-pointer hover:bg-gray-750"
                      onClick={() => setJugadorModal(j.id_jugador)}
                    >
                      <JugadorFoto id={j.id_jugador} nombre={j.nombre} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate hover:text-brand-400">
                          {j.es_capitan && <span className="text-yellow-400 mr-1">©</span>}
                          {j.nombre}
                        </p>
                        <p className="text-xs text-gray-500">{j.equipo_real}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-400">{j.puntos_total} pts</p>
                        <p className="text-xs text-gray-500">{formatMoney(j.precio_actual)}</p>
                        <ClausulaChip monto={j.clausula_monto} activaDesde={j.clausula_activa_desde} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Suplentes */}
          {suplentes.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-gray-400 mb-2">Suplentes</p>
              <ul className="space-y-1">
                {suplentes.map(j => (
                  <li key={j.id_jugador}
                    className="flex items-center gap-2 text-sm py-1 cursor-pointer"
                    onClick={() => setJugadorModal(j.id_jugador)}
                  >
                    <PosBadge pos={j.posicion} />
                    <JugadorFoto id={j.id_jugador} nombre={j.nombre} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-400 hover:text-brand-400">{j.nombre}</p>
                      <p className="text-xs text-gray-600">{j.equipo_real}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-gray-400">{j.puntos_total} pts</p>
                      <ClausulaChip monto={j.clausula_monto} activaDesde={j.clausula_activa_desde} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === 'jornada' && (
        <div className="space-y-3">
          {jornadas.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay jornadas calculadas</p>
          ) : (
            <>
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

              {loadingJornada ? <Spinner /> : jornadaData && (
                <>
                  <div className="card flex justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Puntos jornada</p>
                      <p className="text-3xl font-bold text-green-400">{jornadaData.puntos_jornada ?? 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Acumulados</p>
                      <p className="text-2xl font-bold">{jornadaData.puntos_acumulados ?? 0}</p>
                    </div>
                  </div>
                  <AlineacionPuntos alineacion={jornadaData.alineacion} onVerFicha={setJugadorModal} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
