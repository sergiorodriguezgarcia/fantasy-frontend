import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import logoHorizontal from '../assets/logo-horizontal-oscuro.png';

// Pedir el enlace para restablecer la contraseña
export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.recuperarPassword(email);
      setEnviado(res.mensaje);
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
        <h2 className="font-bold text-lg mb-2">¿Has olvidado tu contraseña?</h2>

        {enviado ? (
          <div className="space-y-3 text-sm">
            <p className="text-green-400">{enviado}</p>
            <p className="text-gray-400">
              Revisa también la carpeta de spam. El enlace caduca en 1 hora; si no te llega, puedes pedir otro.
            </p>
            <button onClick={() => setEnviado('')} className="btn-secondary w-full">Pedir otro enlace</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-400">
              Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
            </p>
            <div>
              <label htmlFor="recuperar-email" className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                id="recuperar-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-brand-400 hover:underline">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
