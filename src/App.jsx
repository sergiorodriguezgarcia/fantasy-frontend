import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Spinner from './components/Spinner';

import Login from './pages/Login';
import Registro from './pages/Registro';
import Inicio from './pages/Inicio';
import MiEquipo from './pages/MiEquipo';
import Mercado from './pages/Mercado';
import Clasificacion from './pages/Clasificacion';
import Jornada from './pages/Jornada';
import EquipoRival from './pages/EquipoRival';
import Actividad from './pages/Actividad';

import Admin from './pages/admin/Admin';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminJugadores from './pages/admin/AdminJugadores';
import AdminJornadas from './pages/admin/AdminJornadas';
import AdminPartidos from './pages/admin/AdminPartidos';
import AdminClausulas from './pages/admin/AdminClausulas';
import AdminEquipos from './pages/admin/AdminEquipos';

// user===undefined → still loading; null → logged out; object → logged in
function RequireAuth() {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function AdminWrapper({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/registro" element={<PublicOnly><Registro /></PublicOnly>} />

        {/* Rutas privadas con Layout */}
        <Route element={<RequireAuth />}>
          <Route index element={<Inicio />} />
          <Route path="mi-equipo" element={<MiEquipo />} />
          <Route path="mercado" element={<Mercado />} />
          <Route path="clasificacion" element={<Clasificacion />} />
          <Route path="jornada" element={<Jornada />} />
          <Route path="actividad" element={<Actividad />} />
          <Route path="equipo/:id" element={<EquipoRival />} />

          {/* Admin */}
          <Route path="admin" element={<AdminWrapper><Admin /></AdminWrapper>} />
          <Route path="admin/usuarios" element={<AdminWrapper><AdminUsuarios /></AdminWrapper>} />
          <Route path="admin/jugadores" element={<AdminWrapper><AdminJugadores /></AdminWrapper>} />
          <Route path="admin/jornadas" element={<AdminWrapper><AdminJornadas /></AdminWrapper>} />
          <Route path="admin/partidos" element={<AdminWrapper><AdminPartidos /></AdminWrapper>} />
          <Route path="admin/clausulas" element={<AdminWrapper><AdminClausulas /></AdminWrapper>} />
          <Route path="admin/equipos" element={<AdminWrapper><AdminEquipos /></AdminWrapper>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
