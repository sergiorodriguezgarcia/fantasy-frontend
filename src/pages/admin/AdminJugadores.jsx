import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import PosBadge from '../../components/PosBadge';
import Spinner from '../../components/Spinner';

const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'];

export default function AdminJugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [filtroEq, setFiltroEq] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', tipo: 'ok' });
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', posicion: '' });

  // Formulario nuevo jugador
  const [nuevo, setNuevo] = useState({ nombre: '', posicion: '', id_equipo_real: '' });
  const [guardando, setGuardando] = useState(false);
  const nombreRef = useRef(null);

  async function cargar() {
    setLoading(true);
    const [j, e] = await Promise.all([
      api.jugadores(filtroEq ? { equipo: filtroEq } : {}),
      api.admin.equipos(),
    ]);
    setJugadores(j);
    setEquipos(e);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [filtroEq]);

  function flash(text, tipo = 'ok') {
    setMsg({ text, tipo });
    setTimeout(() => setMsg({ text: '', tipo: 'ok' }), 3000);
  }

  async function crearJugador(e) {
    e.preventDefault();
    if (!nuevo.nombre.trim() || !nuevo.posicion) return;
    setGuardando(true);
    try {
      await api.admin.crearJugador({
        nombre: nuevo.nombre.trim().toUpperCase(),
        posicion: nuevo.posicion,
        id_equipo_real: nuevo.id_equipo_real ? parseInt(nuevo.id_equipo_real) : undefined,
      });
      flash(`✓ ${nuevo.nombre.trim().toUpperCase()} añadido`);
      // Mantener equipo y posición, limpiar solo nombre para agilizar entrada
      setNuevo(prev => ({ ...prev, nombre: '' }));
      nombreRef.current?.focus();
      cargar();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(j) {
    setEditando(j.id);
    setEditForm({ nombre: j.nombre, posicion: j.posicion ?? '' });
  }

  async function guardarEdicion(id) {
    try {
      await api.admin.editarJugador(id, {
        nombre: editForm.nombre,
        posicion: editForm.posicion || undefined,
      });
      flash('Jugador actualizado');
      setEditando(null);
      cargar();
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  async function eliminarJugador(j) {
    if (!confirm(`¿Eliminar a ${j.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.admin.eliminarJugador(j.id);
      flash(`✓ ${j.nombre} eliminado`);
      cargar();
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  async function importarJSON() {
    const texto = prompt('Pega el JSON de equipos (formato del scraper):');
    if (!texto) return;
    try {
      const data = JSON.parse(texto);
      const res = await api.admin.importarJugadores(data);
      flash(`Importados: ${res.equipos} equipos, ${res.jugadores} jugadores`);
      cargar();
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-xl">Jugadores</h1>
        <button onClick={importarJSON} className="btn-secondary text-sm">
          📥 JSON
        </button>
      </div>

      {msg.text && (
        <div className={`border rounded-lg px-3 py-2 text-sm ${
          msg.tipo === 'ok'
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Formulario añadir jugador */}
      <form onSubmit={crearJugador} className="card space-y-2">
        <p className="font-semibold text-sm text-gray-300">Añadir jugador</p>

        <input
          ref={nombreRef}
          className="input w-full"
          placeholder="Nombre del jugador *"
          value={nuevo.nombre}
          onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
          required
          autoComplete="off"
        />

        <div className="grid grid-cols-2 gap-2">
          {/* Selector posición */}
          <div className="grid grid-cols-4 gap-1">
            {POSICIONES.map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => setNuevo(p => ({ ...p, posicion: pos }))}
                className={`py-2 rounded text-xs font-bold border transition-colors ${
                  nuevo.posicion === pos
                    ? 'bg-brand-700 border-brand-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Selector equipo */}
          <select
            className="input text-sm"
            value={nuevo.id_equipo_real}
            onChange={e => setNuevo(p => ({ ...p, id_equipo_real: e.target.value }))}
          >
            <option value="">Sin equipo</option>
            {equipos.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={guardando || !nuevo.nombre.trim() || !nuevo.posicion}
          className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${
            nuevo.nombre.trim() && nuevo.posicion
              ? 'bg-brand-700 hover:bg-brand-600 text-white'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {guardando ? 'Guardando...' : '+ Añadir jugador'}
        </button>
      </form>

      {/* Filtro por equipo */}
      <select
        className="input text-sm w-full"
        value={filtroEq}
        onChange={e => setFiltroEq(e.target.value)}
      >
        <option value="">Todos los equipos ({jugadores.length} jugadores)</option>
        {equipos.map(e => (
          <option key={e.id} value={e.id}>{e.nombre} ({e.total_jugadores})</option>
        ))}
      </select>

      {/* Lista de jugadores */}
      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          {jugadores.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 text-center">No hay jugadores todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-center px-2 py-2">Pos</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map(j => (
                  editando === j.id ? (
                    <tr key={j.id} className="border-b border-gray-700 bg-gray-800/50">
                      <td colSpan={3} className="px-3 py-2 space-y-2">
                        <input
                          className="input w-full text-sm"
                          value={editForm.nombre}
                          onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                          autoFocus
                          autoComplete="off"
                        />
                        <div className="flex gap-1">
                          {POSICIONES.map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setEditForm(p => ({ ...p, posicion: pos }))}
                              className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors ${
                                editForm.posicion === pos
                                  ? 'bg-brand-700 border-brand-600 text-white'
                                  : 'bg-gray-700 border-gray-600 text-gray-400'
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => guardarEdicion(j.id)}
                            disabled={!editForm.nombre.trim()}
                            className="flex-1 py-1.5 rounded bg-brand-700 text-white text-xs font-bold hover:bg-brand-600 disabled:opacity-40"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => eliminarJugador(j)}
                            className="px-3 py-1.5 rounded bg-red-900 text-red-300 text-xs hover:bg-red-800 border border-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                  <tr key={j.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium truncate max-w-[160px]">{j.nombre}</p>
                      <p className="text-xs text-gray-500">{j.equipo_real}</p>
                    </td>
                    <td className="text-center px-2 py-2">
                      <PosBadge pos={j.posicion} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <button
                        onClick={() => abrirEdicion(j)}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                  )
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
