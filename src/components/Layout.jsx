import { useSyncExternalStore } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { instalarApp, puedeInstalarse, suscribirInstalacion } from '../lib/pwa';
import logoHorizontal from '../assets/logo-horizontal-oscuro.png';

const NAV = [
  { to: '/',           label: 'Inicio',        icon: '🏠' },
  { to: '/mi-equipo',  label: 'Mi Equipo',     icon: '👕' },
  { to: '/mercado',    label: 'Mercado',        icon: '🔄' },
  { to: '/clasificacion', label: 'Tabla',      icon: '🏆' },
  { to: '/actividad',  label: 'Actividad',     icon: '📰' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const instalable = useSyncExternalStore(suscribirInstalacion, puedeInstalarse);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="shrink-0" aria-label="AsturFútbol Fantasy - Inicio">
          <img src={logoHorizontal} alt="AsturFútbol Fantasy" className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {instalable && (
            <button
              onClick={instalarApp}
              className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
            >
              Instalar app
            </button>
          )}
          {user && (
            <>
              <span className="text-gray-400 hidden sm:block">{user.nombre}</span>
              {user.rol === 'admin' && (
                <Link to="/admin" className="text-yellow-400 font-semibold hover:text-yellow-300">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 transition-colors">
                Salir
              </button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) — solo para usuarios normales */}
      {user && user.rol !== 'admin' && (
        <nav className="bg-gray-900 border-t border-gray-800 sticky bottom-0">
          <ul className="flex justify-around">
            {NAV.map(({ to, label, icon }) => {
              const active = location.pathname === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                      active ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="mt-0.5">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
