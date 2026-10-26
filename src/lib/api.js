// En desarrollo usa el proxy de Vite (/api → localhost:4000).
// En producción apunta directamente al backend (VITE_API_BASE=https://xxx.up.railway.app).
const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  // Sesión caducada: volver al login. Un login con credenciales erróneas también da 401, pero ahí
  // hay que mostrar el error del backend sin recargar la página
  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('No autenticado');
  }

  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
    return {};
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no válida de ${path}: ${text.slice(0, 100)}`);
  }
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registro: (nombre, email, password) =>
    request('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, email, password }) }),
  me: () => request('/auth/me'),
  recuperarPassword: (email) =>
    request('/auth/recuperar', { method: 'POST', body: JSON.stringify({ email }) }),
  restablecerPassword: (token, password) =>
    request('/auth/restablecer', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Jugadores
  jugadores: (params = {}) =>
    request('/jugadores?' + new URLSearchParams(params)),
  jugador: (id) => request(`/jugadores/${id}`),

  // Mi equipo
  miEquipo: () => request('/equipos/mi-equipo'),
  venderJugador: (id_jugador) =>
    request('/equipos/mi-equipo/vender', { method: 'POST', body: JSON.stringify({ id_jugador }) }),
  actualizarFormacion: (formacion, titulares, capitan) =>
    request('/equipos/mi-equipo/formacion', { method: 'PUT', body: JSON.stringify({ formacion, titulares, capitan }) }),
  subirClausula: (idPlantilla, clausula_monto) =>
    request(`/equipos/mi-equipo/clausula/${idPlantilla}`, { method: 'PUT', body: JSON.stringify({ clausula_monto }) }),
  pagarClausula: (id_jugador) =>
    request('/equipos/clausulazo', { method: 'POST', body: JSON.stringify({ id_jugador }) }),
  misLigas: () => request('/equipos/ligas'),
  unirseALiga: (codigo) =>
    request('/equipos/ligas/unirse', { method: 'POST', body: JSON.stringify({ codigo }) }),
  crearLiga: (nombre) =>
    request('/equipos/ligas', { method: 'POST', body: JSON.stringify({ nombre }) }),

  // Jornadas
  jornadas: () => request('/jornadas'),
  jornadaActual: () => request('/jornadas/actual'),
  proximaJornada: () => request('/jornadas/proxima'),
  jornada: (id) => request(`/jornadas/${id}`),
  estadisticasJornada: (id) => request(`/jornadas/${id}/estadisticas`),
  miPuntuacion: (id) => request(`/jornadas/${id}/mi-puntuacion`),

  // Mercado
  subastas: () => request('/mercado/subastas'),
  historicoMercado: () => request('/mercado/historico'),
  subasta: (id) => request(`/mercado/subastas/${id}`),
  crearSubasta: (id_jugador, precio_minimo) =>
    request('/mercado/subastas', { method: 'POST', body: JSON.stringify({ id_jugador, precio_minimo }) }),
  pujar: (idSubasta, monto) =>
    request(`/mercado/subastas/${idSubasta}/pujar`, { method: 'POST', body: JSON.stringify({ monto }) }),
  cancelarSubasta: (idSubasta) =>
    request(`/mercado/subastas/${idSubasta}/cancelar`, { method: 'POST' }),
  retirarPuja: (idSubasta) =>
    request(`/mercado/subastas/${idSubasta}/retirar-puja`, { method: 'POST' }),

  // Equipos
  equipo: (id) => request(`/equipos/${id}`),
  equipoJornada: (id, idJornada) => request(`/equipos/${id}/jornada/${idJornada}`),

  // Ofertas
  ofertasRecibidas: () => request('/ofertas/recibidas'),
  ofertasEnviadas: () => request('/ofertas/enviadas'),
  hacerOferta: (id_jugador, monto) =>
    request('/ofertas', { method: 'POST', body: JSON.stringify({ id_jugador, monto }) }),
  aceptarOferta: (id) => request(`/ofertas/${id}/aceptar`, { method: 'POST' }),
  rechazarOferta: (id) => request(`/ofertas/${id}/rechazar`, { method: 'POST' }),
  cancelarOferta: (id) => request(`/ofertas/${id}/cancelar`, { method: 'POST' }),

  // Clasificación
  clasificacion: (liga) =>
    request('/clasificacion' + (liga ? `?liga=${liga}` : '')),
  clasificacionJornada: (n) => request(`/clasificacion/jornada/${n}`),

  // Admin
  admin: {
    equipos: () => request('/admin/equipos'),
    crearEquipo: (nombre, cod_equipo) =>
      request('/admin/equipos', { method: 'POST', body: JSON.stringify({ nombre, cod_equipo }) }),
    importarJugadores: (data) =>
      request('/admin/importar-jugadores', { method: 'POST', body: JSON.stringify(data) }),
    crearJugador: (datos) =>
      request('/admin/jugadores', { method: 'POST', body: JSON.stringify(datos) }),
    editarJugador: (id, datos) =>
      request(`/admin/jugadores/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    eliminarJugador: (id) =>
      request(`/admin/jugadores/${id}`, { method: 'DELETE' }),
    crearJornada: (numero, fecha_inicio, fecha_fin) =>
      request('/admin/jornadas', { method: 'POST', body: JSON.stringify({ numero, fecha_inicio, fecha_fin }) }),
    cambiarEstadoJornada: (id, estado) =>
      request(`/admin/jornadas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),
    obtenerPartido: (id) => request(`/admin/partidos/${id}`),
    eliminarPartido: (id) => request(`/admin/partidos/${id}`, { method: 'DELETE' }),
    registrarPartido: (datos) =>
      request('/admin/partidos', { method: 'POST', body: JSON.stringify(datos) }),
    calcularJornada: (id) =>
      request(`/admin/jornadas/${id}/calcular`, { method: 'POST' }),
    previewPuntos: (id) => request(`/admin/jornadas/${id}/preview-puntos`),
    clausulazos: () => request('/admin/clausulazos'),
    importarJornada: (numero_jornada, calcular_puntos = false) =>
      request('/cron/importar-jornada', { method: 'POST', body: JSON.stringify({ numero_jornada, calcular_puntos }) }),
    estadoCron: () => request('/cron/estado'),
    // Sin n, el backend usa jugadores_por_ventana de config_mercado
    abrirVentanaMercado: (n) =>
      request('/admin/mercado/abrir-ventana', { method: 'POST', body: JSON.stringify(n ? { n } : {}) }),
    usuarios: () => request('/admin/usuarios'),
    editarUsuario: (id, datos) =>
      request(`/admin/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    eliminarUsuario: (id) =>
      request(`/admin/usuarios/${id}`, { method: 'DELETE' }),
  },
};

// URL directa (sin JWT) para usar en <img src>
export function fotoJugadorUrl(id) {
  return `${BASE}/jugadores/${id}/foto`;
}

// Importe exacto: 1250000 → "1.250.000 €"
export function formatEuros(n) {
  return `${Number(n ?? 0).toLocaleString('es-ES')} €`;
}

// Lee un importe escrito a mano: "1250000", "1.250.000", "1,25M", "1.5M", "750K" → euros (o NaN)
export function parseImporte(texto) {
  const t = String(texto ?? '').trim().toUpperCase().replace(/\s|€/g, '');
  const m = t.match(/^(\d+(?:[.,]\d+)?)([MK])$/);
  if (m) return Math.round(Number(m[1].replace(',', '.')) * (m[2] === 'M' ? 1_000_000 : 1_000));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  if (/^\d+$/.test(t)) return Number(t);
  return NaN;
}

export function formatMoney(n) {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num?.toString() ?? '0';
}
