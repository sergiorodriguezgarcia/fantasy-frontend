import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';

export default function AdminEquipos() {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [nombre, setNombre] = useState('');
  const [codEquipo, setCodEquipo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.admin.equipos();
      setEquipos(data);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await api.admin.crearEquipo(nombre.trim(), codEquipo.trim() || undefined);
      setNombre('');
      setCodEquipo('');
      setMsg('Equipo añadido correctamente');
      cargar();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Equipos reales</h1>

      {msg && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-2 text-sm text-blue-300">
          {msg} <button onClick={() => setMsg('')} className="ml-2">×</button>
        </div>
      )}

      {/* Formulario nuevo equipo */}
      <form onSubmit={handleSubmit} className="card space-y-3">
        <p className="font-semibold text-sm text-gray-300">Añadir equipo</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Nombre del equipo *"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <input
            className="input w-32"
            placeholder="Cód. equipo"
            value={codEquipo}
            onChange={e => setCodEquipo(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primario"
            disabled={guardando || !nombre.trim()}
          >
            {guardando ? '...' : 'Añadir'}
          </button>
        </div>
        <p className="text-xs text-gray-500">El código de equipo es opcional (ID de asturfutbol.es).</p>
      </form>

      {/* Lista de equipos */}
      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          {equipos.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No hay equipos todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                  <th className="text-left px-3 py-2">Equipo</th>
                  <th className="text-center px-3 py-2">Cód.</th>
                  <th className="text-right px-3 py-2">Jugadores</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map(eq => (
                  <tr key={eq.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-3 py-2 font-medium">{eq.nombre}</td>
                    <td className="px-3 py-2 text-center text-gray-400 font-mono text-xs">
                      {eq.cod_equipo ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {eq.total_jugadores}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
