import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import logoHorizontal from '../assets/logo-horizontal-oscuro.png';

// Elegir contraseña nueva desde el enlace del correo (/restablecer?token=...)
export default function RestablecerPassword() {
  const { restablecerPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', repetir: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.repetir) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await restablecerPassword(token, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6">
          <img src={logoHorizontal} alt="AsturFútbol Fantasy" className="w-full max-w-[280px] h-auto mx-auto" />
        </h1>
        <h2 className="font-bold text-lg mb-4">Nueva contraseña</h2>

        {!token ? (
          <p className="text-sm text-red-400">
            El enlace no es válido. Ábrelo directamente desde el correo o{' '}
            <Link to="/recuperar" className="text-brand-400 hover:underline">pide uno nuevo</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nueva-password" className="block text-sm text-gray-400 mb-1">Contraseña nueva</label>
              <input
                id="nueva-password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="repetir-password" className="block text-sm text-gray-400 mb-1">Repite la contraseña</label>
              <input
                id="repetir-password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={form.repetir}
                onChange={e => setForm(f => ({ ...f, repetir: e.target.value }))}
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">
                {error}{' '}
                {error.includes('caducado') && (
                  <Link to="/recuperar" className="text-brand-400 hover:underline">Pedir otro enlace</Link>
                )}
              </p>
            )}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar y entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
