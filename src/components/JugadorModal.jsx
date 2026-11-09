import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import PosBadge from './PosBadge';
import JugadorFoto from './JugadorFoto';
import { diasProteccion } from './ClausulaChip';
import Spinner from './Spinner';
import PrecioGrafica from './PrecioGrafica';
import PuntosGrafica from './PuntosGrafica';

// Valor inicial + precio tras cada jornada calculada (+ valor actual si ha cambiado después)
function seriePrecio(jugador) {
  const serie = [
    { etiqueta: 'Ini', precio: Number(jugador.precio_inicial) },
    ...(jugador.historial_precio ?? []).map(h => ({ etiqueta: `J${h.jornada}`, precio: Number(h.precio) })),
  ];
  if (serie.at(-1).precio !== Number(jugador.precio_actual)) {
    serie.push({ etiqueta: 'Hoy', precio: Number(jugador.precio_actual) });
  }
  return serie;
}

function PtsColor({ pts }) {
  const cls = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-500';
  return <span className={`font-bold ${cls}`}>{pts > 0 ? '+' : ''}{pts}</span>;
}

// Pagar la cláusula de un jugador de otro equipo (o mostrar cuánto le queda de protección)
function BloqueClausula({ jugador, onPagada }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState('');
  const { clausula_monto, clausula_activa_desde } = jugador.equipo_fantasy;
  const dias = diasProteccion(clausula_activa_desde);
  const restantes = jugador.clausulazos_restantes;
  const cerrados = jugador.clausulazos_cerrados;

  if (dias > 0) {
    return (
      <p className="text-xs text-gray-500">
        🔒 Protegido {dias} día{dias > 1 ? 's' : ''} más (hasta el{' '}
        {new Date(clausula_activa_desde).toLocaleDateString('es-ES')})
      </p>
    );
  }

  async function pagar() {
    setPagando(true);
    setError('');
    try {
      const res = await api.pagarClausula(jugador.id);
      setConfirmando(false);
      onPagada(res.mensaje);
    } catch (e) {
      setError(e.message);
    } finally {
      setPagando(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      {confirmando ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">
            Se te descontarán <span className="text-orange-300 font-bold">{formatMoney(clausula_monto)}</span> y{' '}
            {jugador.nombre} pasará a tu banquillo al instante.
          </p>
          <div className="flex gap-2">
            <button onClick={pagar} disabled={pagando} className="btn-primary text-sm flex-1 bg-orange-600 hover:bg-orange-700">
              {pagando ? 'Pagando...' : 'Confirmar clausulazo'}
            </button>
            <button onClick={() => setConfirmando(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmando(true)}
          disabled={restantes === 0 || !!cerrados}
          className="w-full text-sm font-bold py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔓 Pagar cláusula · {formatMoney(clausula_monto)}
        </button>
      )}
      {cerrados ? (
        <p className="text-[11px] text-gray-500 text-center">
          Cerrados hasta que se calcule la jornada {cerrados.numero} (cierran 24 h antes de su primer partido)
        </p>
      ) : restantes !== undefined && (
        <p className="text-[11px] text-gray-500 text-center">
          {restantes === 0
            ? 'Ya has pagado el máximo de cláusulas esta jornada'
            : `Te quedan ${restantes} clausulazo${restantes > 1 ? 's' : ''} esta jornada`}
        </p>
      )}
    </div>
  );
}

// Puntos de una jornada: suma del desglose del backend (los guardados si la jornada está calculada y
// los provisionales si no)
function puntosJornada(s) {
  return (s.desglose ?? []).reduce((t, l) => t + l.puntos, 0);
}

function PtsPill({ pts }) {
  if (pts == null) return <span className="min-w-[2.75rem] text-center text-sm font-bold text-gray-600">–</span>;
  const cls = pts > 0 ? 'bg-green-900/60 text-green-300' : pts < 0 ? 'bg-red-900/60 text-red-300' : 'bg-gray-800 text-gray-400';
  return (
    <span className={`min-w-[2.75rem] text-center text-sm font-bold tabular-nums px-2 py-0.5 rounded-full ${cls}`}>
      {pts > 0 ? '+' : ''}{pts}
    </span>
  );
}

// Historial de puntos: gráfica de barras + lista de jornadas (la más reciente arriba). Al pulsar una
// barra o una fila se despliega su desglose; solo una a la vez
function HistorialPuntos({ jugador, jornadas, sel, onSel }) {
  const esEnt = jugador.posicion === 'ENT';

  return (
    <div className="space-y-3">
      <PuntosGrafica
        jornadas={jornadas.map(j => ({ jornada: j.jornada, puntos: j.puntos, capitan: j.stat?.es_capitan }))}
        sel={sel}
        onSelect={onSel}
      />

      <ul className="space-y-1.5">
        {[...jornadas].reverse().map(({ jornada, puntos, stat: s }) => {
          const abierta = sel === jornada;
          return (
            <li key={jornada} className={`rounded-xl overflow-hidden transition-colors ${abierta ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
              <button
                onClick={() => onSel(abierta ? null : jornada)}
                disabled={!s}
                className="w-full flex items-center gap-3 px-3 py-2 text-left disabled:cursor-default"
              >
                <span className="text-[11px] font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full shrink-0">
                  J{jornada}
                </span>
                <div className="flex-1 min-w-0">
                  {!s ? (
                    <p className="text-xs text-gray-500">No jugó</p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-300 truncate">
                        {s.partido
                          ? `${s.partido.local} ${s.partido.goles_local}-${s.partido.goles_visitante} ${s.partido.visitante}`
                          : 'Partido sin acta'}
                      </p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        {!esEnt && <span>{s.minutos}'</span>}
                        {s.goles > 0 && <span className="text-gray-300">⚽{s.goles > 1 ? `×${s.goles}` : ''}</span>}
                        {s.amarillas > 0 && <span>🟨{s.amarillas > 1 ? `×${s.amarillas}` : ''}</span>}
                        {s.rojas > 0 && <span>🟥</span>}
                        {s.es_capitan && <span className="text-yellow-400 font-bold" title="Capitán">©</span>}
                      </p>
                    </>
                  )}
                </div>
                <PtsPill pts={puntos} />
              </button>

              {abierta && s && (
                <div className="border-t border-gray-700 mx-3 py-2 space-y-1.5">
                  {(s.desglose ?? []).length === 0 ? (
                    <p className="text-xs text-gray-600">Sin puntuación este partido</p>
                  ) : (
                    // Las líneas a 0 son informativas (p. ej. portería a cero sin llegar a 60 min)
                    s.desglose.map((l, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className={l.puntos === 0 ? 'text-gray-600' : 'text-gray-300'}>{l.concepto}</span>
                        {l.puntos !== 0 && <PtsColor pts={l.puntos} />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function JugadorModal({ idJugador, onClose, showOffer = true, onCambio }) {
  const [jugador, setJugador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ofertaMonto, setOfertaMonto] = useState('');
  const [ofertaMsg, setOfertaMsg] = useState('');
  const [clausulaMsg, setClausulaMsg] = useState('');
  const [pestana, setPestana] = useState('puntos');
  const [sel, setSel] = useState(null);

  function recargar() {
    api.jugador(idJugador).then(setJugador).catch(() => {});
  }

  useEffect(() => {
    if (!idJugador) return;
    setLoading(true);
    setError('');
    setOfertaMonto('');
    setOfertaMsg('');
    setClausulaMsg('');
    setPestana('puntos');
    setSel(null);
    api.jugador(idJugador)
      .then(setJugador)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [idJugador]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!idJugador) return null;

  const stats = jugador?.estadisticas ?? [];
  const esEnt = jugador?.posicion === 'ENT';
  // Una entrada por jornada jugada (o en juego con datos); null en las que no disputó
  const porJornada = new Map(stats.map(s => [s.jornada, s]));
  const numeros = [...new Set([...(jugador?.jornadas_disputadas ?? []), ...porJornada.keys()])].sort((a, b) => a - b);
  const jornadas = numeros.map(n => {
    const s = porJornada.get(n);
    return { jornada: n, stat: s, puntos: s ? puntosJornada(s) : null };
  });
  const totalPuntos = jornadas.reduce((t, j) => t + (j.puntos ?? 0), 0);
  const jugados = esEnt ? stats.length : stats.filter(s => s.minutos > 0).length;
  const media = jugados ? (totalPuntos / jugados).toFixed(1).replace('.', ',').replace(',0', '') : '–';
  const totalGoles = stats.reduce((s, e) => s + (e.goles ?? 0), 0);
  const ultima = jornadas.at(-1);
  const colorPts = v => (v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-300');

  const puntosPrecio = jugador ? seriePrecio(jugador) : [];
  const variacion = puntosPrecio.length > 1 && puntosPrecio[0].precio > 0
    ? Math.round(((puntosPrecio.at(-1).precio - puntosPrecio[0].precio) / puntosPrecio[0].precio) * 100)
    : 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-800 shrink-0">
          {loading || !jugador ? (
            <div className="h-16 w-48 bg-gray-800 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <JugadorFoto id={jugador.id} nombre={jugador.nombre} size={64} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <PosBadge pos={jugador.posicion} />
                  <h2 className="font-bold text-lg leading-tight truncate">{jugador.nombre}</h2>
                </div>
                <p className="text-sm text-gray-400 truncate">{jugador.equipo_real}</p>
                <p className="text-sm mt-0.5">
                  <span className="text-green-400 font-bold">{formatMoney(jugador.precio_actual)}</span>
                  {variacion !== 0 && (
                    <span className={`ml-2 text-xs font-bold ${variacion > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {variacion > 0 ? '▲ +' : '▼ '}{variacion}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
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

          {jugador && !loading && (
            <div className="p-4 space-y-4">

              {/* Propietario y cláusula (los propios se gestionan desde Mi Equipo) */}
              {jugador.equipo_fantasy && !jugador.es_mio && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400">
                      Propietario:{' '}
                      <span className="text-white font-medium">{jugador.equipo_fantasy.nombre}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Cláusula:{' '}
                      <span className="text-orange-300 font-bold">{formatMoney(jugador.equipo_fantasy.clausula_monto)}</span>
                    </p>
                  </div>

                  {clausulaMsg && <p className="text-sm font-semibold text-green-400">{clausulaMsg}</p>}

                  <BloqueClausula
                    jugador={jugador}
                    onPagada={(mensaje) => {
                      setClausulaMsg(mensaje);
                      recargar();
                      onCambio?.();
                    }}
                  />
                </div>
              )}

              {/* Hacer oferta — solo si el jugador pertenece a otro equipo */}
              {showOffer && jugador.equipo_fantasy && !jugador.es_mio && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  {ofertaMsg ? (
                    <p className={`text-sm font-medium ${ofertaMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                      {ofertaMsg}
                      <button onClick={() => setOfertaMsg('')} className="ml-2 text-gray-500 text-xs">×</button>
                    </p>
                  ) : (
                    <>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input text-sm flex-1"
                        placeholder="Tu oferta en €"
                        value={ofertaMonto}
                        onChange={e => setOfertaMonto(e.target.value)}
                        min={Number(jugador.precio_actual)}
                      />
                      <button
                        className="btn-primary text-sm px-3"
                        disabled={!ofertaMonto || parseInt(ofertaMonto) < Number(jugador.precio_actual)}
                        onClick={async () => {
                          try {
                            await api.hacerOferta(jugador.id, parseInt(ofertaMonto));
                            setOfertaMsg('Oferta enviada correctamente');
                            setOfertaMonto('');
                          } catch (e) {
                            setOfertaMsg(`Error: ${e.message}`);
                          }
                        }}
                      >
                        Hacer oferta
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Mínimo: {formatMoney(jugador.precio_actual)} (valor actual)</p>
                    </>
                  )}
                </div>
              )}

              {/* Resumen de puntos: lo primero que se ve */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Puntos totales', value: totalPuntos, color: colorPts(totalPuntos) },
                    {
                      label: ultima ? `Jornada ${ultima.jornada}` : 'Última jornada',
                      value: ultima?.puntos == null ? '–' : `${ultima.puntos > 0 ? '+' : ''}${ultima.puntos}`,
                      color: colorPts(ultima?.puntos),
                    },
                    { label: 'Media', value: media, color: 'text-gray-200' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-800 rounded-lg py-2">
                      <p className="text-[11px] text-gray-500">{label}</p>
                      <p className={`text-2xl font-extrabold tabular-nums leading-tight ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {esEnt ? `${jugados} jornada${jugados !== 1 ? 's' : ''}` : `${jugados} partido${jugados !== 1 ? 's' : ''} jugado${jugados !== 1 ? 's' : ''}`}
                  {!esEnt && ` · ${totalGoles} gol${totalGoles !== 1 ? 'es' : ''}`}
                </p>
              </div>

              {/* Pestañas */}
              <div className="flex bg-gray-800 rounded-lg p-1 text-sm font-semibold">
                {[['puntos', 'Puntos'], ['valor', 'Valor']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setPestana(id)}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${
                      pestana === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pestana === 'puntos' ? (
                jornadas.length === 0 ? (
                  <p className="text-center py-6 text-gray-500 text-sm">Aún no ha disputado ninguna jornada</p>
                ) : (
                  <HistorialPuntos jugador={jugador} jornadas={jornadas} sel={sel} onSel={setSel} />
                )
              ) : (
                <PrecioGrafica key={jugador.id} puntos={puntosPrecio} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
