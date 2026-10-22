import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import PosBadge from '../../components/PosBadge';
import Spinner from '../../components/Spinner';

function tarjetaToStats(tarjeta) {
  if (tarjeta === 'amarilla') return { amarillas: 1, rojas: 0 };
  if (tarjeta === 'doble')    return { amarillas: 2, rojas: 1 };
  if (tarjeta === 'roja')     return { amarillas: 0, rojas: 1 };
  return { amarillas: 0, rojas: 0 };
}

function statsToTarjeta(amarillas, rojas) {
  if (rojas > 0 && amarillas >= 2) return 'doble';
  if (rojas > 0) return 'roja';
  if (amarillas > 0) return 'amarilla';
  return 'none';
}

// Dado un array de jugadores de api.jugadores() y las estadísticas guardadas,
// devuelve el array con stats embebidas en cada jugador.
// jugo=true solo para los que tienen estadísticas en BD; el resto jugo=false.
function fusionarConStats(jugadores, savedStats) {
  const statsMap = {};
  for (const s of savedStats) {
    statsMap[s.id_jugador] = {
      jugo:        s.jugo,          // true si tiene estadísticas, false si no
      goles:       s.goles       ?? 0,
      goles_propio: s.goles_propio ?? 0,
      tarjeta:     statsToTarjeta(s.amarillas ?? 0, s.rojas ?? 0),
    };
  }
  return jugadores.map(j => ({
    ...j,
    jugo:        statsMap[j.id]?.jugo        ?? false,
    goles:       statsMap[j.id]?.goles       ?? 0,
    goles_propio: statsMap[j.id]?.goles_propio ?? 0,
    tarjeta:     statsMap[j.id]?.tarjeta     ?? 'none',
  }));
}

// Array plano sin stats (modo nuevo partido) — por defecto nadie jugó
function sinStats(jugadores) {
  return jugadores.map(j => ({
    ...j,
    jugo: false,
    goles: 0,
    goles_propio: 0,
    tarjeta: 'none',
  }));
}

function pcero(esLocal, golesLocal, golesVisitante) {
  if (golesLocal === '' || golesVisitante === '') return false;
  return esLocal ? parseInt(golesVisitante) === 0 : parseInt(golesLocal) === 0;
}

const TARJETAS = [
  { value: 'none',     label: '—',    className: 'bg-gray-800 text-gray-500 border-gray-700' },
  { value: 'amarilla', label: '🟨',   className: 'bg-yellow-900/60 text-yellow-300 border-yellow-700' },
  { value: 'doble',    label: '🟨🟥', className: 'bg-orange-900/60 text-orange-300 border-orange-700' },
  { value: 'roja',     label: '🟥',   className: 'bg-red-900/60 text-red-300 border-red-700' },
];

// Actualiza un jugador concreto dentro de un array por id.
// patch puede ser un objeto { ... } o una función (jugador) => ({ ... })
// para evitar stale closure en los contadores de incremento/decremento.
function patchJugador(arr, id, patch) {
  return arr.map(j => {
    if (j.id !== id) return j;
    const resolved = typeof patch === 'function' ? patch(j) : patch;
    return { ...j, ...resolved };
  });
}

export default function AdminPartidos() {
  const [searchParams] = useSearchParams();
  const [jornadas, setJornadas]   = useState([]);
  const [equipos, setEquipos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState({ text: '', tipo: 'ok' });
  const [enviando, setEnviando]   = useState(false);

  const [idJornada, setIdJornada]             = useState(searchParams.get('jornada') ?? '');
  const [idLocal, setIdLocal]                 = useState('');
  const [idVisitante, setIdVisitante]         = useState('');
  const [golesLocal, setGolesLocal]           = useState('');
  const [golesVisitante, setGolesVisitante]   = useState('');

  // Arrays de jugadores con stats embebidas: { id, nombre, posicion, equipo_real, jugo, goles, goles_propio, tarjeta }
  const [jugLocal, setJugLocal]   = useState([]);
  const [jugVisit, setJugVisit]   = useState([]);
  const [cargandoJug, setCargandoJug] = useState(false);

  const [partidosJornada, setPartidosJornada] = useState([]);

  // Mientras esté seteado con { local, visit } iguales a idLocal/idVisitante,
  // el useEffect de carga de jugadores NO ejecuta la llamada a la API.
  // NO se limpia dentro del efecto (para sobrevivir la doble ejecución de StrictMode).
  // Solo se limpia desde fuera: al cambiar equipo manualmente o tras guardar.
  const editModeRef = useRef(null);
  // Versión incremental: cada vez que se lanza una llamada de jugadores vía useEffect
  // se guarda el número de versión. Si al resolver ya hay una versión más nueva (o
  // cargarPartidoEditar ha marcado editModeRef), se descarta el resultado.
  const jugFetchVersionRef = useRef(0);

  useEffect(() => {
    Promise.all([api.jornadas(), api.admin.equipos()])
      .then(([j, e]) => { setJornadas(j); setEquipos(e); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!idJornada) { setPartidosJornada([]); return; }
    api.jornada(idJornada).then(j => setPartidosJornada(j.partidos ?? []));
  }, [idJornada]);

  // Carga jugadores cuando el usuario selecciona equipos manualmente.
  // Se salta la carga si cargarPartidoEditar ya puso datos para estos mismos equipos.
  useEffect(() => {
    if (!idLocal || !idVisitante) {
      setJugLocal([]);
      setJugVisit([]);
      return;
    }
    const em = editModeRef.current;
    if (em && em.local === idLocal && em.visit === idVisitante) {
      return; // datos ya cargados por cargarPartidoEditar — no sobreescribir
    }
    const version = ++jugFetchVersionRef.current;
    setCargandoJug(true);
    Promise.all([
      api.jugadores({ equipo: idLocal }),
      api.jugadores({ equipo: idVisitante }),
    ]).then(([local, visit]) => {
      // Descartar si hay una versión más nueva o si hay modo edición activo.
      if (version !== jugFetchVersionRef.current) return;
      if (editModeRef.current) return;
      // Actualización funcional: si ya hay jugadores con jugo=true en el estado
      // (puestos por cargarPartidoEditar), no los reseteamos.
      setJugLocal(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        return sinStats(local).map(p => ({ ...p, jugo: prevMap.get(p.id)?.jugo ?? false }));
      });
      setJugVisit(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        return sinStats(visit).map(p => ({ ...p, jugo: prevMap.get(p.id)?.jugo ?? false }));
      });
    }).finally(() => {
      if (version === jugFetchVersionRef.current) setCargandoJug(false);
    });
  }, [idLocal, idVisitante]);

  // ── Helpers para modificar stats de un jugador ──────────────
  function setLocalStat(id, patch) {
    setJugLocal(prev => patchJugador(prev, id, patch));
  }
  function setVisitStat(id, patch) {
    setJugVisit(prev => patchJugador(prev, id, patch));
  }

  // ── Cargar partido existente para editar ─────────────────────
  async function cargarPartidoEditar(partido) {
    try {
      // Pre-setear editModeRef ANTES del await para que cualquier llamada
      // api.jugadores() en vuelo que resuelva durante el await vea el modo
      // edición activo y no sobreescriba los datos.
      // equipo_local/visitante viene del JOIN con equipos_reales (nombre exacto);
      // nombre_local/visitante es el texto guardado en partidos (fallback).
      const localNombre = (partido.equipo_local ?? partido.nombre_local ?? '').toUpperCase();
      const visitNombre = (partido.equipo_visitante ?? partido.nombre_visitante ?? '').toUpperCase();
      const preLocal = equipos.find(e => e.nombre.toUpperCase() === localNombre);
      const preVisit = equipos.find(e => e.nombre.toUpperCase() === visitNombre);
      if (preLocal && preVisit) {
        editModeRef.current = { local: preLocal.id.toString(), visit: preVisit.id.toString() };
      }
      jugFetchVersionRef.current++;
      setCargandoJug(true);

      const data = await api.admin.obtenerPartido(partido.id);

      const eqLocal = equipos.find(e => e.nombre.toUpperCase() === data.nombre_local?.toUpperCase());
      const eqVisit = equipos.find(e => e.nombre.toUpperCase() === data.nombre_visitante?.toUpperCase());

      if (!eqLocal || !eqVisit) {
        setMsg({ text: 'Equipos del partido no encontrados en la BD', tipo: 'error' });
        return;
      }

      const newLocal = eqLocal.id.toString();
      const newVisit = eqVisit.id.toString();

      // El endpoint ya devuelve TODOS los jugadores de ambos equipos con sus stats.
      // Los usamos directamente sin llamadas extra a /api/jugadores.
      const toPlayer = s => {
        const tarjeta = statsToTarjeta(s.amarillas ?? 0, s.rojas ?? 0);
        const tieneStats = (s.goles ?? 0) > 0 || (s.goles_propio ?? 0) > 0 || tarjeta !== 'none';
        return {
          id:           s.id_jugador,
          nombre:       s.nombre,
          posicion:     s.posicion,
          equipo_real:  s.equipo_real,
          jugo:         s.jugo || tieneStats,
          goles:        s.goles        ?? 0,
          goles_propio: s.goles_propio ?? 0,
          tarjeta,
        };
      };

      const localUp = data.nombre_local?.toUpperCase();
      const visitUp = data.nombre_visitante?.toUpperCase();
      const stats   = data.estadisticas ?? [];

      const localPlayers = stats.filter(s => s.equipo_real?.toUpperCase() === localUp).map(toPlayer);
      const visitPlayers = stats.filter(s => s.equipo_real?.toUpperCase() === visitUp).map(toPlayer);

      setGolesLocal(data.goles_local ?? '');
      setGolesVisitante(data.goles_visitante ?? '');

      editModeRef.current = { local: newLocal, visit: newVisit };

      setIdLocal(newLocal);
      setIdVisitante(newVisit);
      setJugLocal(localPlayers);
      setJugVisit(visitPlayers);

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      setMsg({ text: err.message, tipo: 'error' });
    } finally {
      setCargandoJug(false);
    }
  }

  // ── Guardar partido ──────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!idJornada) { setMsg({ text: 'Selecciona una jornada', tipo: 'error' }); return; }
    if (!idLocal || !idVisitante) { setMsg({ text: 'Selecciona ambos equipos', tipo: 'error' }); return; }

    const nombreLocal     = equipos.find(eq => eq.id === parseInt(idLocal))?.nombre     ?? '';
    const nombreVisitante = equipos.find(eq => eq.id === parseInt(idVisitante))?.nombre ?? '';

    const jugadoresPayload = [...jugLocal, ...jugVisit]
      .map(j => {
        const { amarillas, rojas } = tarjetaToStats(j.tarjeta);
        // Si tiene alguna stat, el jugador forzosamente jugó (evita error al togglear)
        const jugo = j.jugo || j.goles > 0 || j.goles_propio > 0 || amarillas > 0 || rojas > 0;
        return {
          id_jugador:      j.id,
          jugo,
          minutos_jugados: jugo ? 90 : 0,
          goles:           j.goles,
          goles_propio:    j.goles_propio,
          amarillas,
          rojas,
        };
      });

    setEnviando(true);
    try {
      const res = await api.admin.registrarPartido({
        id_jornada:       parseInt(idJornada),
        nombre_local:     nombreLocal,
        nombre_visitante: nombreVisitante,
        goles_local:      golesLocal      !== '' ? parseInt(golesLocal)      : null,
        goles_visitante:  golesVisitante  !== '' ? parseInt(golesVisitante)  : null,
        jugadores:        jugadoresPayload,
      });
      setMsg({ text: `Partido guardado (ID ${res.id_partido}). ${res.estadisticas_insertadas} estadísticas.`, tipo: 'ok' });
      api.jornada(idJornada).then(j => setPartidosJornada(j.partidos ?? []));
      // Reset
      editModeRef.current = null;
      setIdLocal(''); setIdVisitante('');
      setGolesLocal(''); setGolesVisitante('');
    } catch (err) {
      setMsg({ text: err.message, tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <Spinner />;

  const equipoLocal     = equipos.find(eq => eq.id === parseInt(idLocal));
  const equipoVisitante = equipos.find(eq => eq.id === parseInt(idVisitante));
  const tenemosEquipos  = idLocal && idVisitante && idLocal !== idVisitante;
  const tenemosResult   = golesLocal !== '' && golesVisitante !== '';

  function marcarTodos(setStat, jugs, jugo) {
    jugs.forEach(j => setStat(j.id, { jugo }));
  }

  function renderEquipo({ label, jugs, setStat, esLocal }) {
    const todosJugaron = jugs.length > 0 && jugs.every(j => j.jugo);
    const ningunoJugo  = jugs.length > 0 && jugs.every(j => !j.jugo);
    return (
      <div key={label} className="card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-200">{label}</h2>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button type="button"
              onClick={() => marcarTodos(setStat, jugs, true)}
              disabled={todosJugaron}
              className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-800 disabled:opacity-30"
            >Todos ✓</button>
            <button type="button"
              onClick={() => marcarTodos(setStat, jugs, false)}
              disabled={ningunoJugo}
              className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 disabled:opacity-30"
            >Ninguno ✗</button>
            {tenemosResult && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                pcero(esLocal, golesLocal, golesVisitante)
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-gray-800 text-gray-500'
              }`}>
                {pcero(esLocal, golesLocal, golesVisitante) ? '✓ P0' : 'Sin P0'}
              </span>
            )}
          </div>
        </div>

        {jugs.length === 0 && (
          <p className="text-xs text-gray-600">Este equipo no tiene jugadores en la BD.</p>
        )}

        <div className="space-y-1">
          <div className="grid gap-1 text-xs text-gray-500 px-1"
               style={{ gridTemplateColumns: '1fr 60px 60px 80px 28px' }}>
            <span>Jugador</span>
            <span className="text-center">Goles</span>
            <span className="text-center">PP</span>
            <span className="text-center">Tarjeta</span>
            <span className="text-center">Jugó</span>
          </div>

          {jugs.map(j => (
            <div
              key={j.id}
              className={`grid gap-1 items-center rounded-lg px-1 py-1.5 transition-colors ${j.jugo ? '' : 'opacity-40'}`}
              style={{ gridTemplateColumns: '1fr 60px 60px 80px 28px' }}
            >
              {/* Nombre */}
              <div className="min-w-0 flex items-center gap-1">
                <PosBadge pos={j.posicion} />
                <p className="text-xs font-medium truncate">{j.nombre}</p>
              </div>

              {/* Goles */}
              <div className="flex items-center justify-center gap-1">
                <button type="button"
                  onClick={() => setStat(j.id, cur => ({ goles: Math.max(0, cur.goles - 1) }))}
                  disabled={!j.jugo || j.goles === 0}
                  className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs disabled:opacity-30"
                >−</button>
                <span className="w-4 text-center text-sm font-bold">{j.goles}</span>
                <button type="button"
                  onClick={() => setStat(j.id, cur => ({ goles: cur.goles + 1 }))}
                  disabled={!j.jugo}
                  className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs disabled:opacity-30"
                >+</button>
              </div>

              {/* Gol en propia puerta */}
              <div className="flex items-center justify-center gap-1">
                <button type="button"
                  onClick={() => setStat(j.id, cur => ({ goles_propio: Math.max(0, cur.goles_propio - 1) }))}
                  disabled={!j.jugo || j.goles_propio === 0}
                  className="w-5 h-5 rounded bg-gray-700 text-red-400 text-xs disabled:opacity-30"
                >−</button>
                <span className={`w-4 text-center text-sm font-bold ${j.goles_propio > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                  {j.goles_propio}
                </span>
                <button type="button"
                  onClick={() => setStat(j.id, cur => ({ goles_propio: cur.goles_propio + 1 }))}
                  disabled={!j.jugo}
                  className="w-5 h-5 rounded bg-gray-700 text-red-400 text-xs disabled:opacity-30"
                >+</button>
              </div>

              {/* Tarjeta */}
              <div className="flex gap-0.5 justify-center">
                {TARJETAS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    disabled={!j.jugo}
                    onClick={() => setStat(j.id, { tarjeta: t.value })}
                    className={`flex-1 py-0.5 rounded border text-xs transition-colors ${
                      j.tarjeta === t.value ? t.className : 'bg-gray-800 border-gray-700 text-gray-600'
                    } disabled:opacity-30`}
                    title={t.value === 'doble' ? 'Doble amarilla (= roja)' : t.value}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Jugó toggle */}
              <button
                type="button"
                onClick={() => setStat(j.id, cur => ({ jugo: !cur.jugo }))}
                className={`w-6 h-6 rounded text-xs font-bold mx-auto flex items-center justify-center transition-colors ${
                  j.jugo ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-600'
                }`}
                title={j.jugo ? 'Jugó — pulsa para marcar como no jugó' : 'No jugó'}
              >
                {j.jugo ? '✓' : '✗'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Registrar Partido</h1>

      {msg.text && (
        <div className={`border rounded-lg px-3 py-2 text-sm flex justify-between ${
          msg.tipo === 'ok'
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          {msg.text}
          <button onClick={() => setMsg({ text: '', tipo: 'ok' })}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Jornada */}
        <div className="card space-y-2">
          <label className="text-sm font-semibold text-gray-300">Jornada</label>
          <select className="input text-sm" value={idJornada}
            onChange={e => setIdJornada(e.target.value)} required>
            <option value="">— Selecciona jornada —</option>
            {jornadas.map(j => (
              <option key={j.id} value={j.id}>Jornada {j.numero} ({j.estado})</option>
            ))}
          </select>
        </div>

        {/* Partidos ya registrados en la jornada */}
        {partidosJornada.length > 0 && (
          <div className="card space-y-2">
            <p className="text-sm font-semibold text-gray-300">Partidos registrados — pulsa para editar</p>
            {partidosJornada.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cargarPartidoEditar(p)}
                  className="flex-1 flex justify-between items-center text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm truncate">{p.nombre_local} vs {p.nombre_visitante}</span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">
                    {p.goles_local ?? '?'} — {p.goles_visitante ?? '?'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar "${p.nombre_local} vs ${p.nombre_visitante}"? Se borrarán también sus estadísticas.`)) return;
                    try {
                      await api.admin.eliminarPartido(p.id);
                      api.jornada(idJornada).then(j => setPartidosJornada(j.partidos ?? []));
                    } catch (err) {
                      setMsg({ text: err.message, tipo: 'error' });
                    }
                  }}
                  className="shrink-0 px-2 py-2 rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/70 text-xs border border-red-800"
                  title="Eliminar partido"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Equipos y resultado */}
        <div className="card space-y-3">
          <label className="text-sm font-semibold text-gray-300">Equipos y resultado</label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Local</p>
              <select className="input text-sm" value={idLocal}
                onChange={e => { editModeRef.current = null; setJugLocal([]); setJugVisit([]); setIdLocal(e.target.value); }} required>
                <option value="">— Local —</option>
                {equipos.map(eq => (
                  <option key={eq.id} value={eq.id} disabled={eq.id === parseInt(idVisitante)}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Visitante</p>
              <select className="input text-sm" value={idVisitante}
                onChange={e => { editModeRef.current = null; setJugLocal([]); setJugVisit([]); setIdVisitante(e.target.value); }} required>
                <option value="">— Visitante —</option>
                {equipos.map(eq => (
                  <option key={eq.id} value={eq.id} disabled={eq.id === parseInt(idLocal)}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resultado */}
          <div className="flex items-center gap-3 justify-center">
            <input
              type="number" min="0" max="20"
              className="input text-center text-xl font-bold w-16"
              placeholder="0"
              value={golesLocal}
              onChange={e => setGolesLocal(e.target.value)}
            />
            <span className="text-gray-500 font-bold">—</span>
            <input
              type="number" min="0" max="20"
              className="input text-center text-xl font-bold w-16"
              placeholder="0"
              value={golesVisitante}
              onChange={e => setGolesVisitante(e.target.value)}
            />
          </div>

          {tenemosResult && (
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className={`rounded py-1 px-2 ${parseInt(golesVisitante) === 0 ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                {parseInt(golesVisitante) === 0 ? '✓ Portería a cero' : 'Sin portería a cero'}
                <p className="text-gray-500">{equipoLocal?.nombre}</p>
              </div>
              <div className={`rounded py-1 px-2 ${parseInt(golesLocal) === 0 ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                {parseInt(golesLocal) === 0 ? '✓ Portería a cero' : 'Sin portería a cero'}
                <p className="text-gray-500">{equipoVisitante?.nombre}</p>
              </div>
            </div>
          )}
        </div>

        {/* Jugadores */}
        {tenemosEquipos && (
          cargandoJug ? <Spinner /> : (
            <>
              {renderEquipo({ label: equipoLocal?.nombre ?? 'Local',      jugs: jugLocal, setStat: setLocalStat, esLocal: true  })}
              {renderEquipo({ label: equipoVisitante?.nombre ?? 'Visitante', jugs: jugVisit, setStat: setVisitStat, esLocal: false })}
            </>
          )
        )}

        <button
          type="submit"
          disabled={enviando || cargandoJug || !tenemosEquipos || !idJornada}
          className={`w-full py-3 rounded-lg font-bold transition-colors ${
            tenemosEquipos && idJornada && !cargandoJug
              ? 'bg-brand-700 hover:bg-brand-600 text-white'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {enviando ? 'Guardando…' : cargandoJug ? 'Cargando jugadores…' : '💾 Guardar partido'}
        </button>
      </form>
    </div>
  );
}
