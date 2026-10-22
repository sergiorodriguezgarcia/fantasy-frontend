import { useEffect, useState } from 'react';
import { api, formatMoney } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import Spinner from '../../components/Spinner';

export default function AdminUsuarios() {
  const { user: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', tipo: 'ok' });
  const [confirmando, setConfirmando] = useState(null); // id a eliminar

  function cargar() {
    setLoading(true);
    api.admin.usuarios()
      .then(setUsuarios)
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []);

  async function cambiarRol(id, rolActual) {
    const nuevoRol = rolActual === 'admin' ? 'user' : 'admin';
    try {
      await api.admin.editarUsuario(id, { rol: nuevoRol });
      setMsg({ text: `Rol cambiado a ${nuevoRol}`, tipo: 'ok' });
      cargar();
    } catch (e) {
      setMsg({ text: e.message, tipo: 'error' });
    }
  }

  async function eliminar(id) {
    try {
      await api.admin.eliminarUsuario(id);
      setMsg({ text: 'Usuario eliminado', tipo: 'ok' });
      setConfirmando(null);
      cargar();
    } catch (e) {
      setMsg({ text: e.message, tipo: 'error' });
      setConfirmando(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Usuarios</h1>

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

      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{u.nombre}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      u.rol === 'admin'
                        ? 'bg-yellow-500 text-yellow-950'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {u.rol}
                    </span>
                    {u.id === yo?.id && (
                      <span className="text-xs text-gray-500">(tú)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{u.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Registrado: {new Date(u.creado_en).toLocaleDateString('es-ES')}
                  </p>
                </div>

                {/* Solo para otros usuarios, no para uno mismo */}
                {u.id !== yo?.id && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => cambiarRol(u.id, u.rol)}
                      className="btn-secondary text-xs py-1 px-2"
                      title={u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    >
                      {u.rol === 'admin' ? '↓ user' : '↑ admin'}
                    </button>
                    {confirmando === u.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => eliminar(u.id)}
                          className="btn-danger text-xs py-1 px-2"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmando(null)}
                          className="btn-secondary text-xs py-1 px-2"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmando(u.id)}
                        className="text-red-500 hover:text-red-400 text-xs py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Info del equipo fantasy si existe */}
              {u.id_equipo ? (
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded px-2 py-1 flex gap-4">
                  <span>Equipo: <span className="text-gray-300">{u.nombre_equipo}</span></span>
                  <span>Saldo: <span className="text-green-400">{formatMoney(u.saldo_disponible)}</span></span>
                  {u.saldo_bloqueado > 0 && (
                    <span>Bloqueado: <span className="text-yellow-400">{formatMoney(u.saldo_bloqueado)}</span></span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">Sin equipo fantasy (administrador)</p>
              )}
            </div>
          ))}

          {usuarios.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No hay usuarios registrados.</p>
          )}
        </div>
      )}
    </div>
  );
}
