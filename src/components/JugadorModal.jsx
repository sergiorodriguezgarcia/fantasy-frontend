import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import PosBadge from './PosBadge';
import JugadorFoto from './JugadorFoto';
import { diasProteccion } from './ClausulaChip';
import Spinner from './Spinner';
import PrecioGrafica from './PrecioGrafica';

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
          disabled={restantes === 0}
          className="w-full text-sm font-bold py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔓 Pagar cláusula · {formatMoney(clausula_monto)}
        </button>
      )}
      {restantes !== undefined && (
        <p className="text-[11px] text-gray-500 text-center">
          {restantes === 0
            ? 'Ya has pagado el máximo de cláusulas esta jornada'
            : `Te quedan ${restantes} clausulazo${restantes > 1 ? 's' : ''} esta jornada`}
        </p>
      )}
    </div>
  );
}

export default function JugadorModal({ idJugador, onClose, showOffer = true, onCambio }) {
  const { user } = useAuth();
  const [jugador, setJugador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ofertaMonto, setOfertaMonto] = useState('');
  const [ofertaMsg, setOfertaMsg] = useState('');
  const [clausulaMsg, setClausulaMsg] = useState('');

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
  const totalPuntos = stats.reduce((s, e) => s + (e.puntos ?? 0), 0);
  const totalGoles = stats.reduce((s, e) => s + (e.goles ?? 0), 0);
  const totalAm = stats.reduce((s, e) => s + (e.amarillas ?? 0), 0);
  const totalRj = stats.reduce((s, e) => s + (e.rojas ?? 0), 0);
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
            <div className="h-10 w-40 bg-gray-800 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-3">
              <JugadorFoto id={jugador.id} nombre={jugador.nombre} size={56} />
              <div>
                <PosBadge pos={jugador.posicion} />
                <h2 className="font-bold text-lg leading-tight">{jugador.nombre}</h2>
                <p className="text-sm text-gray-400">{jugador.equipo_real}</p>
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

              {/* Propietario y cláusula */}
              {jugador.equipo_fantasy && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400">
                      Propietario:{' '}
                      <span className="text-white font-medium">
                        {jugador.es_mio ? 'Tu equipo' : jugador.equipo_fantasy.nombre}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Cláusula:{' '}
                      <span className="text-orange-300 font-bold">{formatMoney(jugador.equipo_fantasy.clausula_monto)}</span>
                    </p>
                  </div>

                  {clausulaMsg && <p className="text-sm font-semibold text-green-400">{clausulaMsg}</p>}

                  {!jugador.es_mio && (
                    <BloqueClausula
                      jugador={jugador}
                      onPagada={(mensaje) => {
                        setClausulaMsg(mensaje);
                        recargar();
                        onCambio?.();
                      }}
                    />
                  )}
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

              {/* Stats globales */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Valor', value: formatMoney(jugador.precio_actual), color: 'text-green-400' },
                  { label: 'Pts totales', value: totalPuntos, color: totalPuntos >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'Goles', value: totalGoles, color: 'text-white' },
                  { label: 'Tarjetas', value: `${totalAm}🟨 ${totalRj}🟥`, color: 'text-white' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`font-bold text-sm ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Evolución del valor (desplegable) */}
              <details className="bg-gray-800 rounded-xl overflow-hidden group/seccion">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                  <span className="text-sm font-semibold text-gray-300">📈 Evolución del valor</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {variacion !== 0 && (
                      <span className={`text-xs font-bold ${variacion > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {variacion > 0 ? '+' : ''}{variacion}%
                      </span>
                    )}
                    <span className="text-gray-600 text-xs group-open/seccion:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="border-t border-gray-700 px-4 py-3">
                  <PrecioGrafica key={jugador.id} puntos={puntosPrecio} />
                </div>
              </details>

              {/* Desglose por jornada (desplegable, de la más reciente a la más antigua) */}
              {stats.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">Sin estadísticas registradas</p>
                </div>
              ) : (
                <details className="bg-gray-800/50 rounded-xl overflow-hidden group/seccion">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                    <span className="text-sm font-semibold text-gray-300">
                      📋 Desglose por jornada
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {stats.length} jornada{stats.length > 1 ? 's' : ''}
                      </span>
                    </span>
                    <span className="text-gray-600 text-xs group-open/seccion:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="space-y-3 px-2 pb-2">
                    {[...stats].reverse().map(s => {
                      // El backend da el desglose con sus reglas; suma los puntos guardados si la
                      // jornada está calculada y los provisionales si no
                      const lineas = s.desglose ?? [];
                      const puntosFinales = lineas.reduce((t, l) => t + l.puntos, 0);

                      return (
                        <details key={s.jornada} className="bg-gray-800 rounded-xl overflow-hidden group">
                          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                                J{s.jornada}
                              </span>
                              {s.partido && (
                                <span className="text-xs text-gray-400 hidden sm:block">
                                  {s.partido.local} {s.partido.goles_local}-{s.partido.goles_visitante} {s.partido.visitante}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{s.minutos}'</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Resumen icónico */}
                              <div className="flex items-center gap-1.5 text-xs">
                                {s.goles > 0 && <span className="text-white">⚽×{s.goles}</span>}
                                {s.amarillas > 0 && <span>🟨×{s.amarillas}</span>}
                                {s.rojas > 0 && <span>🟥×{s.rojas}</span>}
                                {s.porteria_cero && s.minutos >= 60 && <span title="Portería a cero">🧤</span>}
                                {s.victoria && <span title="Victoria del equipo">✅</span>}
                                {s.es_capitan && <span title="Capitán">©</span>}
                              </div>
                              <span className={`font-bold text-base min-w-[2.5rem] text-right ${
                                puntosFinales > 0 ? 'text-green-400' : puntosFinales < 0 ? 'text-red-400' : 'text-gray-500'
                              }`}>
                                {puntosFinales > 0 ? '+' : ''}{puntosFinales}
                              </span>
                              <span className="text-gray-600 text-xs group-open:rotate-180 transition-transform">▼</span>
                            </div>
                          </summary>
  
                          {/* Desglose expandible */}
                          <div className="border-t border-gray-700 px-4 py-3 space-y-1.5">
                            {s.partido && (
                              <p className="text-xs text-gray-400 mb-2 sm:hidden">
                                {s.partido.local} {s.partido.goles_local}-{s.partido.goles_visitante} {s.partido.visitante}
                              </p>
                            )}
                            {lineas.length === 0 ? (
                              <p className="text-xs text-gray-600">Sin puntuación este partido</p>
                            ) : (
                              // Las líneas a 0 son informativas (p. ej. portería a cero sin llegar a 60 min)
                              lineas.map((l, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className={l.puntos === 0 ? 'text-gray-600' : 'text-gray-300'}>{l.concepto}</span>
                                  {l.puntos !== 0 && <PtsColor pts={l.puntos} />}
                                </div>
                              ))
                            )}
                            <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between text-sm font-bold">
                              <span className="text-gray-300">Total jornada {s.jornada}</span>
                              <PtsColor pts={puntosFinales} />
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
