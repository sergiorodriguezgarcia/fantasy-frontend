import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import PosBadge from '../../components/PosBadge';
import Spinner from '../../components/Spinner';

const ESTADOS = ['PENDIENTE', 'EN_CURSO', 'CERRADA', 'CALCULADA'];

export default function AdminJornadas() {
  const navigate = useNavigate();
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [nueva, setNueva] = useState({ numero: '', fecha_inicio: '', fecha_fin: '' });
  const [calculando, setCalculando] = useState(null);
  const [preview, setPreview] = useState(null);      // { idJornada, datos }
  const [cargandoPreview, setCargandoPreview] = useState(null);

  async function cargar() {
    const j = await api.jornadas();
    setJornadas(j);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crearJornada(e) {
    e.preventDefault();
    try {
      await api.admin.crearJornada(parseInt(nueva.numero), nueva.fecha_inicio, nueva.fecha_fin);
      setMsg(`Jornada ${nueva.numero} creada`);
      setNueva({ numero: '', fecha_inicio: '', fecha_fin: '' });
      cargar();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.admin.cambiarEstadoJornada(id, estado);
      setMsg(`Estado cambiado a ${estado}`);
      cargar();
    } catch (err) { setMsg(`Error: ${err.message}`); }
  }

  async function verPreview(id) {
    if (preview?.idJornada === id) { setPreview(null); return; }
    setCargandoPreview(id);
    try {
      const datos = await api.admin.previewPuntos(id);
      setPreview({ idJornada: id, datos });
    } catch (err) { setMsg(`Error: ${err.message}`); }
    finally { setCargandoPreview(null); }
  }

  async function calcular(id, numero) {
    if (!confirm(`¿Calcular puntos de la Jornada ${numero}? Esto actualizará precios y clasificación.`)) return;
    setCalculando(id);
    try {
      const res = await api.admin.calcularJornada(id);
      setMsg(`Jornada ${numero} calculada: ${res.jugadores_calculados} jugadores, ${res.equipos_calculados} equipos`);
      cargar();
    } catch (err) { setMsg(`Error: ${err.message}`); }
    finally { setCalculando(null); }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Jornadas</h1>

      {msg && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-2 text-sm text-blue-300">
          {msg} <button onClick={() => setMsg('')} className="ml-2">×</button>
        </div>
      )}

      {/* Crear jornada */}
      <form onSubmit={crearJornada} className="card space-y-3">
        <h2 className="font-semibold text-gray-300">Nueva jornada</h2>
        <div className="flex gap-2">
          <input className="input text-sm w-24" type="number" placeholder="Nº" min="1"
            value={nueva.numero} onChange={e => setNueva(f => ({ ...f, numero: e.target.value }))} required />
          <input className="input text-sm" type="date"
            value={nueva.fecha_inicio} onChange={e => setNueva(f => ({ ...f, fecha_inicio: e.target.value }))} />
          <input className="input text-sm" type="date"
            value={nueva.fecha_fin} onChange={e => setNueva(f => ({ ...f, fecha_fin: e.target.value }))} />
        </div>
        <button className="btn-primary text-sm">Crear</button>
      </form>

      {/* Lista de jornadas */}
      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {jornadas.map(j => (
            <div key={j.id} className="card space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">Jornada {j.numero}</p>
                  {j.fecha_inicio && <p className="text-xs text-gray-500">{j.fecha_inicio?.slice(0, 10)}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  j.estado === 'EN_CURSO' ? 'bg-green-900 text-green-300' :
                  j.estado === 'CALCULADA' ? 'bg-blue-900 text-blue-300' :
                  j.estado === 'CERRADA' ? 'bg-orange-900 text-orange-300' :
                  'bg-gray-800 text-gray-400'
                }`}>{j.estado}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`/admin/partidos?jornada=${j.id}`)}
                  className="btn-primary text-xs py-1 px-3"
                >
                  📋 Partidos
                </button>
                <button
                  onClick={() => verPreview(j.id)}
                  disabled={cargandoPreview === j.id}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  {cargandoPreview === j.id ? 'Cargando…' : preview?.idJornada === j.id ? '▲ Ocultar puntos' : '👁 Ver puntos'}
                </button>
                {ESTADOS.filter(e => e !== j.estado).map(e => (
                  <button key={e} onClick={() => cambiarEstado(j.id, e)}
                    className="btn-secondary text-xs py-1 px-2">
                    → {e}
                  </button>
                ))}
                {j.estado === 'CERRADA' && (
                  <button
                    onClick={() => calcular(j.id, j.numero)}
                    disabled={calculando === j.id}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    {calculando === j.id ? 'Calculando…' : '⚡ Calcular puntos'}
                  </button>
                )}
              </div>

              {preview?.idJornada === j.id && (
                <div className="mt-2 border-t border-gray-700 pt-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 mb-2">
                    Puntuaciones provisionales — {preview.datos.length} jugadores con estadísticas
                  </p>
                  {preview.datos.length === 0 ? (
                    <p className="text-xs text-gray-600">No hay estadísticas registradas aún.</p>
                  ) : (
                    <div className="space-y-0.5 max-h-96 overflow-y-auto">
                      <div className="grid text-xs text-gray-500 px-2 mb-1"
                           style={{ gridTemplateColumns: '1fr 80px 40px 40px 40px 40px 44px' }}>
                        <span>Jugador</span>
                        <span className="truncate">Equipo</span>
                        <span className="text-center">Min</span>
                        <span className="text-center">G</span>
                        <span className="text-center">Am</span>
                        <span className="text-center">Ro</span>
                        <span className="text-right font-bold">Pts</span>
                      </div>
                      {[...preview.datos]
                        .sort((a, b) => b.puntos - a.puntos)
                        .map(p => (
                          <div key={p.id_jugador}
                               className="grid items-center text-xs px-2 py-1 rounded hover:bg-gray-800"
                               style={{ gridTemplateColumns: '1fr 80px 40px 40px 40px 40px 44px' }}>
                            <div className="flex items-center gap-1 min-w-0">
                              <PosBadge pos={p.posicion} />
                              <span className="truncate">{p.nombre}</span>
                            </div>
                            <span className="text-gray-500 truncate text-[10px]">{p.equipo_real}</span>
                            <span className="text-center text-gray-400">{p.minutos_jugados}</span>
                            <span className="text-center">{p.goles > 0 ? <span className="text-green-400">{p.goles}</span> : <span className="text-gray-600">0</span>}</span>
                            <span className="text-center">{p.amarillas > 0 ? <span className="text-yellow-400">{p.amarillas}</span> : <span className="text-gray-600">0</span>}</span>
                            <span className="text-center">{p.rojas > 0 ? <span className="text-red-400">{p.rojas}</span> : <span className="text-gray-600">0</span>}</span>
                            <span className={`text-right font-bold ${p.puntos > 0 ? 'text-green-300' : p.puntos < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {p.puntos}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
