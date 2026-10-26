import { useEffect, useState } from 'react';
import { api, formatMoney, formatEuros } from '../lib/api';
import PosBadge from '../components/PosBadge';
import JugadorFoto from '../components/JugadorFoto';
import Spinner from '../components/Spinner';
import JugadorModal from '../components/JugadorModal';
import CuentaAtras from '../components/CuentaAtras';
import PujaModal from '../components/PujaModal';

export default function Mercado() {
  const [tab, setTab] = useState('subastas'); // 'subastas' | 'jugadores' | 'ofertas'
  const [subastas, setSubastas] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [ofertasRecibidas, setOfertasRecibidas] = useState([]);
  const [ofertasEnviadas, setOfertasEnviadas] = useState([]);
  const [filtros, setFiltros] = useState({ posicion: '', nombre: '', disponible: 'true' });
  const [jugadorModal, setJugadorModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saldo, setSaldo] = useState(null);
  const [subastaPuja, setSubastaPuja] = useState(null);

  useEffect(() => {
    cargarSubastas();
    cargarOfertas();
    api.miEquipo().then(e => setSaldo(e.saldo_disponible)).catch(() => {});
  }, []);

  async function cargarSubastas() {
    setLoading(true);
    try {
      const data = await api.subastas();
      setSubastas(data);
    } finally {
      setLoading(false);
    }
  }

  async function cargarOfertas() {
    try {
      const [recibidas, enviadas] = await Promise.all([
        api.ofertasRecibidas(),
        api.ofertasEnviadas(),
      ]);
      setOfertasRecibidas(recibidas.filter(o => o.tipo === 'USUARIO'));
      setOfertasEnviadas(enviadas);
    } catch {}
  }

  async function cargarJugadores() {
    setLoading(true);
    try {
      const params = {};
      if (filtros.posicion) params.posicion = filtros.posicion;
      if (filtros.nombre) params.nombre = filtros.nombre;
      if (filtros.disponible) params.disponible = filtros.disponible;
      const data = await api.jugadores(params);
      setJugadores(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'jugadores') cargarJugadores();
    else if (tab === 'subastas') cargarSubastas();
    else if (tab === 'ofertas') cargarOfertas();
  }, [tab]);

  async function gestionarOferta(id, accion) {
    try {
      const res = accion === 'aceptar'
        ? await api.aceptarOferta(id)
        : accion === 'rechazar'
          ? await api.rechazarOferta(id)
          : await api.cancelarOferta(id);
      setMsg(res.mensaje ?? { aceptar: 'Oferta aceptada', rechazar: 'Oferta rechazada', cancelar: 'Oferta cancelada' }[accion]);
      cargarOfertas();
      api.miEquipo().then(e => setSaldo(e.saldo_disponible)).catch(() => {});
    } catch (e) { setMsg(`Error: ${e.message}`); }
  }

  function pujaRegistrada(monto) {
    setSubastaPuja(null);
    setMsg(`Puja de ${formatEuros(monto)} registrada`);
    cargarSubastas();
    api.miEquipo().then(e => setSaldo(e.saldo_disponible)).catch(() => {});
  }

  async function cancelarSubasta(idSubasta) {
    if (!confirm('¿Cancelar la subasta? Las pujas serán devueltas a los pujadores.')) return;
    try {
      const res = await api.cancelarSubasta(idSubasta);
      setMsg(res.mensaje ?? 'Subasta cancelada');
      cargarSubastas();
      api.miEquipo().then(e => setSaldo(e.saldo_disponible)).catch(() => {});
    } catch (e) { setMsg(`Error: ${e.message}`); }
  }

  async function retirarPuja(idSubasta) {
    if (!confirm('¿Retirar tu puja? El saldo bloqueado te será devuelto.')) return;
    try {
      const res = await api.retirarPuja(idSubasta);
      setMsg(res.mensaje ?? 'Puja retirada');
      cargarSubastas();
      api.miEquipo().then(e => setSaldo(e.saldo_disponible)).catch(() => {});
    } catch (e) { setMsg(`Error: ${e.message}`); }
  }

  return (
    <div className="space-y-4">
      <JugadorModal idJugador={jugadorModal} onClose={() => setJugadorModal(null)} />
      {subastaPuja && (
        <PujaModal
          subasta={subastaPuja}
          saldo={saldo}
          onClose={() => setSubastaPuja(null)}
          onPujada={pujaRegistrada}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Mercado</h1>
        {saldo !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo disponible</p>
            <p className="font-bold text-green-400">{formatMoney(saldo)}</p>
          </div>
        )}
      </div>

      {msg && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-2 text-sm text-blue-300">
          {msg} <button onClick={() => setMsg('')} className="ml-2 text-blue-400">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {[
          ['subastas', 'Subastas'],
          ['jugadores', 'Jugadores'],
          ['ofertas', `Ofertas${(ofertasRecibidas.length + ofertasEnviadas.length) > 0 ? ` (${ofertasRecibidas.length + ofertasEnviadas.length})` : ''}`],
        ].map(([key, label]) => (
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

      {/* Subastas activas */}
      {tab === 'subastas' && (
        loading ? <Spinner /> : subastas.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400">No hay subastas activas hoy</p>
            <p className="text-gray-500 text-sm mt-1">El mercado se abre cada día a las 19:00 y las subastas cierran al día siguiente a la misma hora</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {subastas.map(s => {
              const pujaMax = s.puja_info?.monto ?? s.precio_minimo;
              const miPuja = s.mi_puja;
              return (
                <li key={s.id} className="card space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <JugadorFoto id={s.id_jugador} nombre={s.jugador} size={40} />
                      <div>
                        <div className="flex items-center gap-2">
                          <PosBadge pos={s.posicion} />
                          <button
                            className="font-bold hover:text-brand-400 transition-colors text-left"
                            onClick={() => setJugadorModal(s.id_jugador)}
                          >
                            {s.jugador}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {s.equipo_real}
                          {s.tipo === 'SISTEMA' ? ' · Mercado libre' : ` · Vendedor: ${s.vendedor}`}
                        </p>
                      </div>
                    </div>
                    <CuentaAtras fecha={s.fecha_cierre} onFin={cargarSubastas} />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm space-y-0.5">
                      {miPuja ? (
                        <div>
                          <span className="text-gray-400">Tu puja: </span>
                          <span className="font-bold text-yellow-400">{formatMoney(miPuja)}</span>
                          <span className="text-gray-500 ml-1">({s.puja_info?.total ?? 0} pujas)</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-gray-400">Puja mínima: </span>
                          <span className="font-bold text-green-400">{formatMoney(s.puja_minima ?? s.precio_actual)}</span>
                          <span className="text-gray-500 ml-1">({s.puja_info?.total ?? 0} pujas)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {s.es_mia ? (
                        <button
                          onClick={() => cancelarSubasta(s.id)}
                          className="text-sm py-1 px-3 bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800 rounded-lg transition-colors"
                        >
                          Cancelar subasta
                        </button>
                      ) : miPuja ? (
                        <>
                          <button
                            onClick={() => retirarPuja(s.id)}
                            className="text-sm py-1 px-3 bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => setSubastaPuja(s)}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            Mejorar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSubastaPuja(s)}
                          className="btn-primary text-sm py-1 px-3"
                        >
                          Pujar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* Ofertas entre usuarios */}
      {tab === 'ofertas' && (
        <div className="space-y-4">
          {/* Recibidas */}
          <div>
            <p className="text-sm font-semibold text-gray-400 mb-2">
              Recibidas
              {ofertasRecibidas.length > 0 && (
                <span className="ml-2 bg-yellow-600 text-yellow-100 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {ofertasRecibidas.length}
                </span>
              )}
            </p>
            {ofertasRecibidas.length === 0 ? (
              <p className="text-sm text-gray-600 py-2">Ningún usuario te ha hecho oferta por tus jugadores</p>
            ) : (
              <ul className="space-y-2">
                {ofertasRecibidas.map(o => (
                  <li key={o.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <button className="font-medium text-sm hover:text-brand-400 text-left" onClick={() => setJugadorModal(o.id_jugador)}>
                        {o.jugador}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">
                        De: <span className="text-gray-300">{o.comprador}</span> · Valor: {formatMoney(o.precio_actual)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-400">{formatMoney(o.monto)}</p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => gestionarOferta(o.id, 'aceptar')} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded">
                          Aceptar
                        </button>
                        <button onClick={() => gestionarOferta(o.id, 'rechazar')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Enviadas */}
          <div>
            <p className="text-sm font-semibold text-gray-400 mb-2">Enviadas</p>
            {ofertasEnviadas.length === 0 ? (
              <p className="text-sm text-gray-600 py-2">No tienes ofertas pendientes. Haz clic en un jugador rival para hacer una oferta.</p>
            ) : (
              <ul className="space-y-2">
                {ofertasEnviadas.map(o => (
                  <li key={o.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <button className="font-medium text-sm hover:text-brand-400 text-left" onClick={() => setJugadorModal(o.id_jugador)}>
                        {o.jugador}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">
                        A: <span className="text-gray-300">{o.vendedor}</span> · Valor: {formatMoney(o.precio_actual)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-yellow-400">{formatMoney(o.monto)}</p>
                      <button onClick={() => gestionarOferta(o.id, 'cancelar')} className="text-xs bg-gray-700 hover:bg-red-900/50 hover:text-red-400 text-gray-400 px-2 py-0.5 rounded mt-1">
                        Cancelar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Catálogo de jugadores */}
      {tab === 'jugadores' && (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="flex gap-2">
            <select
              className="input text-sm"
              value={filtros.posicion}
              onChange={e => setFiltros(f => ({ ...f, posicion: e.target.value }))}
            >
              <option value="">Todas posiciones</option>
              {['POR', 'DEF', 'MED', 'DEL'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              className="input text-sm"
              placeholder="Buscar nombre..."
              value={filtros.nombre}
              onChange={e => setFiltros(f => ({ ...f, nombre: e.target.value }))}
            />
            <button onClick={cargarJugadores} className="btn-secondary text-sm px-3">🔍</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={filtros.disponible === 'true'}
              onChange={e => setFiltros(f => ({ ...f, disponible: e.target.checked ? 'true' : '' }))}
              className="accent-brand-500"
            />
            Solo disponibles (sin dueño)
          </label>

          {loading ? <Spinner /> : (
            <ul className="space-y-2">
              {jugadores.map(j => (
                <li
                  key={j.id}
                  className="card flex items-center gap-3 cursor-pointer hover:border-gray-600 transition-colors"
                  onClick={() => setJugadorModal(j.id)}
                >
                  <JugadorFoto id={j.id} nombre={j.nombre} size={36} />
                  <PosBadge pos={j.posicion} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate hover:text-brand-400 transition-colors">{j.nombre}</p>
                    <p className="text-xs text-gray-500">{j.equipo_real}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400 text-sm">{formatMoney(j.precio_actual)}</p>
                    {j.en_plantilla && <p className="text-xs text-gray-500">En plantilla</p>}
                  </div>
                </li>
              ))}
              {jugadores.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Sin resultados</p>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
