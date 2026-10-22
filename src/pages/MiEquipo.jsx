import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../lib/api';
import PosBadge from '../components/PosBadge';
import JugadorFoto from '../components/JugadorFoto';
import Spinner from '../components/Spinner';
import JugadorModal from '../components/JugadorModal';
import { diasProteccion } from '../components/ClausulaChip';
import { Campo, DISPOSICION, POSICIONES, nombreCorto } from '../components/Campo';

const FORMACIONES = {
  '4-3-3': { DEF: 4, MED: 3, DEL: 3 },
  '4-4-2': { DEF: 4, MED: 4, DEL: 2 },
  '3-5-2': { DEF: 3, MED: 5, DEL: 2 },
  '3-4-3': { DEF: 3, MED: 4, DEL: 3 },
};
const POS_LABEL = { POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' };

function cuotaFormacion(formacion) {
  return { POR: 1, ...(FORMACIONES[formacion] ?? { DEF: 4, MED: 3, DEL: 3 }) };
}

/**
 * Alineación como huecos por posición: { POR: [id], DEF: [id, id, null, id], ... }
 * Un hueco null está vacío. Así el jugador que entra ocupa el sitio exacto del que sale.
 * `idsPorPos` da los titulares de partida de cada posición (se recortan/rellenan a la cuota).
 */
function armarAlineacion(formacion, idsPorPos) {
  const cuota = cuotaFormacion(formacion);
  const alineacion = {};
  for (const pos of POSICIONES) {
    const ids = (idsPorPos[pos] ?? []).filter(Boolean).slice(0, cuota[pos]);
    alineacion[pos] = [...ids, ...Array(cuota[pos] - ids.length).fill(null)];
  }
  return alineacion;
}

// "2026-10-18T10:00:00Z" → "domingo 18/10, 12:00" (hora de España)
function formatCierre(iso) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
}

export default function MiEquipo() {
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', tipo: 'ok' });
  const [guardando, setGuardando] = useState(false);
  const [jugadorModal, setJugadorModal] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [ofertasMsg, setOfertasMsg] = useState({ text: '', tipo: 'ok' });

  // Estado local de la alineación (draft)
  const [formacion, setFormacion] = useState('4-3-3');
  const [alineacion, setAlineacion] = useState(() => armarAlineacion('4-3-3', {}));
  const [capitan, setCapitan] = useState(null);

  // Panel de cambio abierto: { tipo: 'hueco', pos, idx } | { tipo: 'banquillo', id } | null
  const [seleccion, setSeleccion] = useState(null);

  function cargarOfertas() {
    api.ofertasRecibidas()
      .then(data => setOfertas(data.filter(o => o.tipo === 'USUARIO')))
      .catch(() => {});
  }

  function cargar() {
    setLoading(true);
    cargarOfertas();
    api.miEquipo()
      .then(data => {
        setEquipo(data);
        // Inicializar draft con la alineación guardada
        const f = FORMACIONES[data.formacion] ? data.formacion : '4-3-3';
        setFormacion(f);
        const idsPorPos = {};
        for (const j of data.jugadores.filter(j => j.es_titular)) {
          (idsPorPos[j.posicion] ??= []).push(j.id_jugador);
        }
        setAlineacion(armarAlineacion(f, idsPorPos));
        setCapitan(data.jugadores.find(j => j.es_capitan)?.id_jugador ?? null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []);

  const titulares = new Set(Object.values(alineacion).flat().filter(Boolean));

  // Al cambiar formación se conservan los titulares que caben; los que sobran pasan al banquillo
  function cambiarFormacion(nueva) {
    const nuevaAlineacion = armarAlineacion(nueva, alineacion);
    setFormacion(nueva);
    setAlineacion(nuevaAlineacion);
    const siguenTitulares = new Set(Object.values(nuevaAlineacion).flat());
    if (capitan && !siguenTitulares.has(capitan)) setCapitan(null);
  }

  // Coloca `idEntra` (o null para vaciar) en el hueco; el que estuviera ahí vuelve al banquillo
  function ponerEnHueco(pos, idx, idEntra) {
    const sale = alineacion[pos][idx];
    setAlineacion(prev => ({
      ...prev,
      [pos]: prev[pos].map((id, i) => (i === idx ? idEntra : id)),
    }));
    if (sale && capitan === sale) setCapitan(null);
    setSeleccion(null);
  }

  function alternarCapitan(idJugador) {
    if (!titulares.has(idJugador)) return;
    setCapitan(prev => (prev === idJugador ? null : idJugador));
  }

  async function vender(idJugador, precioActual) {
    try {
      const res = await api.venderJugador(idJugador);
      setMsg({ text: res.mensaje ?? `Vendido por ${formatMoney(precioActual)}`, tipo: 'ok' });
      setSeleccion(null);
      cargar();
    } catch (e) {
      setMsg({ text: e.message, tipo: 'error' });
    }
  }

  // Sube la cláusula y actualiza el estado local sin recargar (para no perder la alineación sin guardar)
  async function subirClausula(jugador, nueva) {
    const res = await api.subirClausula(jugador.id_plantilla, nueva);
    setEquipo(prev => ({
      ...prev,
      saldo_disponible: Number(prev.saldo_disponible) - res.coste,
      jugadores: prev.jugadores.map(j =>
        j.id_plantilla === jugador.id_plantilla ? { ...j, clausula_monto: res.clausula_monto } : j
      ),
    }));
    setMsg({ text: `Cláusula de ${jugador.nombre} subida a ${formatMoney(res.clausula_monto)} (coste ${formatMoney(res.coste)})`, tipo: 'ok' });
  }

  async function gestionarOferta(id, accion) {
    try {
      const res = accion === 'aceptar'
        ? await api.aceptarOferta(id)
        : await api.rechazarOferta(id);
      setOfertasMsg({ text: res.mensaje ?? (accion === 'aceptar' ? 'Oferta aceptada' : 'Oferta rechazada'), tipo: 'ok' });
      cargar(); // recargar equipo y ofertas
    } catch (e) {
      setOfertasMsg({ text: e.message, tipo: 'error' });
    }
  }

  async function guardarAlineacion() {
    const cuota = cuotaFormacion(formacion);
    for (const pos of POSICIONES) {
      const huecosLibres = alineacion[pos].filter(id => !id).length;
      if (huecosLibres > 0) {
        setMsg({ text: `Te faltan ${huecosLibres} ${pos} para completar la formación ${formacion} (${cuota[pos]} ${pos})`, tipo: 'error' });
        return;
      }
    }
    if (!capitan) {
      setMsg({ text: 'Debes seleccionar un capitán', tipo: 'error' });
      return;
    }

    setGuardando(true);
    try {
      await api.actualizarFormacion(formacion, Array.from(titulares), capitan);
      setMsg({ text: 'Alineación guardada correctamente', tipo: 'ok' });
      cargar();
    } catch (e) {
      setMsg({ text: e.message, tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-400">{error}</p>;

  const porId = new Map(equipo.jugadores.map(j => [j.id_jugador, j]));
  const banquillo = equipo.jugadores.filter(j => !titulares.has(j.id_jugador));
  const valorPlantilla = equipo.jugadores.reduce((s, j) => s + parseInt(j.precio_actual), 0);
  const titularesCount = titulares.size;
  const alineacionCompleta = titularesCount === 11 && capitan && titulares.has(capitan);
  const alineacionGuardada = !!equipo.formacion;
  // Con la jornada empezada no se puede tocar la alineación hasta que se calcule
  const cierre = equipo.alineaciones ?? {};
  const bloqueada = !!cierre.cerrada;

  return (
    <div className="space-y-4">
      <JugadorModal idJugador={jugadorModal} onClose={() => setJugadorModal(null)} showOffer={false} />

      {seleccion && (
        <PanelCambio
          seleccion={seleccion}
          alineacion={alineacion}
          porId={porId}
          banquillo={banquillo}
          capitan={capitan}
          bloqueada={bloqueada}
          saldo={Number(equipo.saldo_disponible)}
          onSubirClausula={subirClausula}
          onClose={() => setSeleccion(null)}
          onPonerEnHueco={ponerEnHueco}
          onCapitan={alternarCapitan}
          onVerFicha={id => setJugadorModal(id)}
          onVender={vender}
        />
      )}

      {/* Cabecera */}
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-bold text-xl">{equipo.nombre}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm">
              <div><p className="text-gray-400">Saldo</p><p className="text-green-400 font-bold">{formatMoney(equipo.saldo_disponible)}</p></div>
              <div><p className="text-gray-400">Valor</p><p className="font-bold">{formatMoney(valorPlantilla)}</p></div>
              <div><p className="text-gray-400">Plantilla</p><p className="font-bold">{equipo.jugadores.length} jug.</p></div>
              <div title="Cláusulas que aún puedes pagar esta jornada">
                <p className="text-gray-400">Clausulazos</p>
                <p className="font-bold text-orange-300">{equipo.clausulazos_restantes ?? '-'}/4</p>
              </div>
            </div>
          </div>
          {alineacionGuardada && (
            <span className="text-xs bg-green-900/50 border border-green-700 text-green-300 px-2 py-1 rounded-full shrink-0">
              ✓ {equipo.formacion}
            </span>
          )}
        </div>
      </div>

      {/* Ofertas recibidas */}
      {ofertas.length > 0 && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-300">
            Ofertas de otros usuarios
            <span className="ml-2 bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-0.5 rounded-full">
              {ofertas.length}
            </span>
          </p>

          {ofertasMsg.text && (
            <div className={`border rounded-lg px-3 py-2 text-sm flex justify-between ${
              ofertasMsg.tipo === 'ok'
                ? 'bg-green-900/30 border-green-700 text-green-300'
                : 'bg-red-900/30 border-red-700 text-red-300'
            }`}>
              {ofertasMsg.text}
              <button onClick={() => setOfertasMsg({ text: '', tipo: 'ok' })}>×</button>
            </div>
          )}

          <ul className="space-y-2">
            {ofertas.map(o => (
              <li key={o.id} className="flex items-center gap-3 py-2 px-3 bg-gray-800 rounded-xl">
                <div className="flex-1 min-w-0">
                  <button
                    className="font-medium text-sm hover:text-brand-400 transition-colors text-left truncate"
                    onClick={() => setJugadorModal(o.id_jugador)}
                  >
                    {o.jugador}
                  </button>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.tipo === 'SISTEMA' ? 'Oferta del sistema' : `De: ${o.comprador}`}
                    {' · '}Precio actual: {formatMoney(o.precio_actual)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-green-400">{formatMoney(o.monto)}</p>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => gestionarOferta(o.id, 'aceptar')}
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => gestionarOferta(o.id, 'rechazar')}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-0.5 rounded"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {equipo.jugadores.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 mb-3">Tu equipo está vacío</p>
          <Link to="/mercado" className="btn-primary">Ir al mercado</Link>
        </div>
      ) : (
        <>
          {/* Cierre de alineaciones */}
          {bloqueada ? (
            <div className="border rounded-lg px-3 py-2 text-sm bg-yellow-900/30 border-yellow-700 text-yellow-200">
              🔒 Alineaciones cerradas: la jornada {cierre.jornada} ya ha empezado.
              Podrás cambiar la alineación cuando se calcule.
            </div>
          ) : cierre.cierre && (
            <div className="border rounded-lg px-3 py-2 text-sm bg-gray-800/60 border-gray-700 text-gray-300">
              ⏰ Las alineaciones de la jornada {cierre.jornada} se cierran el{' '}
              <span className="font-semibold text-white">{formatCierre(cierre.cierre)}</span>
            </div>
          )}

          {/* Selector de formación */}
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(FORMACIONES).map(f => (
              <button
                key={f}
                onClick={() => cambiarFormacion(f)}
                disabled={bloqueada}
                className={`py-2 rounded-lg text-sm font-bold border transition-colors disabled:cursor-not-allowed ${
                  formacion === f
                    ? 'bg-brand-700 border-brand-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 disabled:opacity-50 disabled:hover:border-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Campo */}
          <Campo>
            {POSICIONES.flatMap(pos => alineacion[pos].map((id, idx) => {
              const [x, y] = DISPOSICION[formacion][pos][idx];
              return (
                <HuecoCampo
                  key={`${pos}-${idx}`}
                  pos={pos}
                  x={x}
                  y={y}
                  jugador={id ? porId.get(id) : null}
                  esCapitan={!!id && capitan === id}
                  onClick={() => setSeleccion({ tipo: 'hueco', pos, idx })}
                />
              );
            }))}
          </Campo>

          {/* Resumen y guardar */}
          <div className="card">
            <div className="text-sm mb-3">
              <span className={titularesCount === 11 ? 'text-green-400' : 'text-gray-400'}>
                {titularesCount}/11 titulares
              </span>
              <span className="mx-2 text-gray-700">·</span>
              <span className={capitan ? 'text-yellow-400' : 'text-gray-400'}>
                {capitan ? `© ${porId.get(capitan)?.nombre}` : 'Sin capitán (toca un titular para elegirlo)'}
              </span>
            </div>

            {!alineacionGuardada && (
              <p className="text-xs text-red-400 mb-3">
                Sin alineación guardada: tu equipo no puntuará esta jornada
              </p>
            )}

            <button
              onClick={guardarAlineacion}
              disabled={guardando || !alineacionCompleta || bloqueada}
              className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${
                alineacionCompleta && !bloqueada
                  ? 'bg-brand-700 hover:bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {bloqueada ? '🔒 Alineación cerrada' : guardando ? 'Guardando...' : 'Guardar alineación'}
            </button>
          </div>

          {/* Banquillo */}
          <div className="card">
            <p className="text-sm font-semibold text-gray-300 mb-3">
              Banquillo <span className="text-gray-500 font-normal">({banquillo.length})</span>
            </p>
            {banquillo.length === 0 ? (
              <p className="text-xs text-gray-500">Todos tus jugadores están en el campo</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {banquillo.map(j => (
                  <button
                    key={j.id_jugador}
                    onClick={() => setSeleccion({ tipo: 'banquillo', id: j.id_jugador })}
                    className="flex flex-col items-center gap-1 min-w-0 group"
                    title={j.nombre}
                  >
                    <JugadorFoto
                      id={j.id_jugador}
                      nombre={j.nombre}
                      size={48}
                      forma="cromo"
                      className="ring-1 ring-gray-700 group-hover:ring-brand-500 transition"
                    />
                    <PosBadge pos={j.posicion} />
                    <span className="text-[11px] leading-tight text-gray-300 truncate max-w-full">
                      {nombreCorto(j.nombre)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Campo de fútbol ─────────────────────────────────────────

// Hueco posicionado en el campo; left/top animados para que al cambiar de formación los jugadores se desplacen
function HuecoCampo({ pos, x, y, jugador, esCapitan, onClick }) {
  const colocacion = {
    style: { left: `${x}%`, top: `${y}%` },
    className: 'absolute -translate-x-1/2 -translate-y-1/2 w-[19%] max-w-[80px] flex flex-col items-center transition-all duration-500 ease-out',
  };

  if (!jugador) {
    return (
      <button onClick={onClick} style={colocacion.style} className={`${colocacion.className} gap-1`}>
        <span className="w-[54px] h-[68px] rounded-lg border-2 border-dashed border-white/60 bg-black/15 flex items-center justify-center text-white/80 text-2xl hover:bg-black/30 transition-colors">
          +
        </span>
        <PosBadge pos={pos} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={colocacion.style}
      className={`${colocacion.className} min-w-0 group`}
      title={jugador.nombre}
    >
      <span className="relative">
        <JugadorFoto
          id={jugador.id_jugador}
          nombre={jugador.nombre}
          size={54}
          forma="cromo"
          className="ring-2 ring-white/80 shadow-md group-hover:ring-yellow-300 transition"
        />
        {esCapitan && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-400 text-yellow-950 text-[10px] font-black flex items-center justify-center shadow">
            C
          </span>
        )}
      </span>
      <span className="mt-1 max-w-full truncate bg-gray-950/85 text-white text-[11px] font-semibold leading-tight px-1.5 py-0.5 rounded">
        {nombreCorto(jugador.nombre)}
      </span>
      <span className="text-[10px] font-semibold text-green-100 drop-shadow">
        {formatMoney(jugador.precio_actual)}
      </span>
    </button>
  );
}

// ── Panel inferior de cambios ───────────────────────────────

const CLAUSULA_MAX = 150_000_000;
const COSTE_SUBIDA = 1;

// Cláusula del jugador propio: estado de la protección y subida (cuesta el 100% del incremento)
function SeccionClausula({ jugador, saldo, onSubir }) {
  const actual = Number(jugador.clausula_monto);
  const [editando, setEditando] = useState(false);
  const [nueva, setNueva] = useState(Math.min(CLAUSULA_MAX, actual + 5_000_000));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const dias = diasProteccion(jugador.clausula_activa_desde);
  const coste = Math.max(0, Math.ceil((nueva - actual) * COSTE_SUBIDA));
  const valida = nueva > actual && nueva <= CLAUSULA_MAX && coste <= saldo;

  async function confirmar() {
    setGuardando(true);
    setError('');
    try {
      await onSubir(jugador, nueva);
      setEditando(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400">Cláusula</p>
          <p className="font-bold text-orange-300">{formatMoney(actual)}</p>
        </div>
        <p className="text-[11px] text-right text-gray-400">
          {dias > 0 ? `🔒 Protegido ${dias} día${dias > 1 ? 's' : ''} más` : '🔓 Cualquiera puede pagarla ya'}
        </p>
      </div>

      {actual >= CLAUSULA_MAX ? (
        <p className="text-xs text-gray-500">Cláusula al máximo ({formatMoney(CLAUSULA_MAX)})</p>
      ) : !editando ? (
        <button
          onClick={() => setEditando(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-700 text-gray-200 hover:bg-gray-600"
        >
          Subir cláusula
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {[5_000_000, 10_000_000, 25_000_000].map(inc => (
              <button
                key={inc}
                onClick={() => setNueva(Math.min(CLAUSULA_MAX, actual + inc))}
                className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                +{formatMoney(inc)}
              </button>
            ))}
            <button
              onClick={() => setNueva(CLAUSULA_MAX)}
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Máx
            </button>
          </div>
          <input
            type="number"
            className="input text-sm"
            value={nueva}
            min={actual + 1}
            max={CLAUSULA_MAX}
            step={100_000}
            onChange={e => setNueva(Number(e.target.value))}
          />
          <p className="text-xs text-gray-400">
            Nueva cláusula <span className="text-white font-semibold">{formatMoney(nueva)}</span>
            {' · '}Coste <span className={coste <= saldo ? 'text-orange-300 font-semibold' : 'text-red-400 font-semibold'}>{formatMoney(coste)}</span>
            {' '}(lo mismo que la subida)
          </p>
          {nueva > CLAUSULA_MAX && <p className="text-xs text-red-400">Máximo {formatMoney(CLAUSULA_MAX)}</p>}
          {coste > saldo && <p className="text-xs text-red-400">No tienes saldo suficiente</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={confirmar}
              disabled={!valida || guardando}
              className="text-xs bg-orange-700 hover:bg-orange-600 text-white px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Subiendo...' : `Pagar ${formatMoney(coste)}`}
            </button>
            <button
              onClick={() => { setEditando(false); setError(''); }}
              className="text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 px-3 py-1.5 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelCambio({ seleccion, alineacion, porId, banquillo, capitan, bloqueada, saldo, onSubirClausula, onClose, onPonerEnHueco, onCapitan, onVerFicha, onVender }) {
  const [confirmarVenta, setConfirmarVenta] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const esHueco = seleccion.tipo === 'hueco';
  const jugador = esHueco
    ? porId.get(alineacion[seleccion.pos][seleccion.idx]) ?? null
    : porId.get(seleccion.id);
  const pos = esHueco ? seleccion.pos : jugador?.posicion;
  const huecosPos = alineacion[pos] ?? [];
  const suplentesPos = banquillo.filter(j => j.posicion === pos && j.id_jugador !== jugador?.id_jugador);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div className="flex items-center gap-2">
            <PosBadge pos={pos} />
            <span className="font-semibold">
              {esHueco ? (jugador ? 'Cambiar jugador' : `Elegir ${POS_LABEL[pos]?.toLowerCase() ?? 'jugador'}`) : 'Suplente'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Jugador seleccionado */}
        {jugador && (
          <div className="p-4 border-b border-gray-800 space-y-3">
            <div className="flex items-center gap-3">
              <JugadorFoto id={jugador.id_jugador} nombre={jugador.nombre} size={56} forma="cromo" />
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {capitan === jugador.id_jugador && <span className="text-yellow-400 mr-1">©</span>}
                  {jugador.nombre}
                </p>
                <p className="text-xs text-gray-400">{jugador.equipo_real}</p>
                <p className="text-sm text-green-400 font-bold">{formatMoney(jugador.precio_actual)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {esHueco && !bloqueada && (
                <button
                  onClick={() => onCapitan(jugador.id_jugador)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    capitan === jugador.id_jugador
                      ? 'bg-yellow-500 text-yellow-950'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {capitan === jugador.id_jugador ? '© Capitán' : 'Hacer capitán'}
                </button>
              )}
              <button
                onClick={() => onVerFicha(jugador.id_jugador)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                Ver ficha
              </button>
              {esHueco && !bloqueada && (
                <button
                  onClick={() => onPonerEnHueco(seleccion.pos, seleccion.idx, null)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Mandar al banquillo
                </button>
              )}
              <button
                onClick={() => setConfirmarVenta(v => !v)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-800 text-orange-400 hover:bg-orange-900/40"
              >
                Vender
              </button>
            </div>

            <SeccionClausula
              key={jugador.id_plantilla}
              jugador={jugador}
              saldo={saldo}
              onSubir={onSubirClausula}
            />

            {confirmarVenta && (
              <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 flex-1">
                  Vender por <span className="text-green-400 font-bold">{formatMoney(jugador.precio_actual)}</span> al instante
                </span>
                <button
                  onClick={() => onVender(jugador.id_jugador, jugador.precio_actual)}
                  className="text-xs bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Opciones de cambio */}
        <div className="p-4">
          {bloqueada ? (
            <p className="text-sm text-gray-500">🔒 Alineaciones cerradas hasta que se calcule la jornada en juego.</p>
          ) : !pos || !huecosPos.length ? (
            <p className="text-sm text-gray-500">Este jugador no tiene posición asignada y no puede alinearse.</p>
          ) : esHueco ? (
            <>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {jugador ? 'Cambiar por' : 'Suplentes disponibles'}
              </p>
              {suplentesPos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tienes {POS_LABEL[pos].toLowerCase()}s en el banquillo.{' '}
                  <Link to="/mercado" className="text-brand-400 hover:underline">Ir al mercado</Link>
                </p>
              ) : (
                <ul className="space-y-1">
                  {suplentesPos.map(j => (
                    <FilaOpcion
                      key={j.id_jugador}
                      jugador={j}
                      accion="⇄"
                      onClick={() => onPonerEnHueco(seleccion.pos, seleccion.idx, j.id_jugador)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sacar al campo en lugar de</p>
              <ul className="space-y-1">
                {huecosPos.map((id, idx) => (
                  id ? (
                    <FilaOpcion
                      key={id}
                      jugador={porId.get(id)}
                      accion="⇄"
                      onClick={() => onPonerEnHueco(pos, idx, jugador.id_jugador)}
                    />
                  ) : (
                    <li key={`libre-${idx}`}>
                      <button
                        onClick={() => onPonerEnHueco(pos, idx, jugador.id_jugador)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-700 hover:border-brand-600 hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400">+</span>
                        <span className="flex-1 text-sm text-gray-400">Hueco libre</span>
                        <span className="text-brand-400 font-bold">+</span>
                      </button>
                    </li>
                  )
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaOpcion({ jugador, accion, onClick }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
      >
        <JugadorFoto id={jugador.id_jugador} nombre={jugador.nombre} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{jugador.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{jugador.equipo_real} · {formatMoney(jugador.precio_actual)}</p>
        </div>
        <span className="text-brand-400 font-bold text-lg">{accion}</span>
      </button>
    </li>
  );
}
