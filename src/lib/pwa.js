import { registerSW } from 'virtual:pwa-register';

// Cada cuánto se comprueba si hay una versión nueva desplegada mientras la app sigue abierta.
const INTERVALO_COMPROBACION_MS = 15 * 60 * 1000;

// Registra el service worker. Con registerType 'autoUpdate', cuando se detecta una versión
// nueva se activa y la página se recarga automáticamente.
export function registrarServiceWorker() {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      const comprobar = () => {
        if (!navigator.onLine) return;
        registration.update().catch(() => {});
      };

      setInterval(comprobar, INTERVALO_COMPROBACION_MS);
      // Al volver a la app (p. ej. desde otra app en el móvil) se comprueba al momento.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') comprobar();
      });
    },
  });
}

// --- Instalación ---------------------------------------------------------------

let eventoInstalacion = null;
const suscriptores = new Set();

function notificar() {
  suscriptores.forEach((fn) => fn(eventoInstalacion != null));
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Evita el mini-banner del navegador; mostramos nuestro propio botón.
  e.preventDefault();
  eventoInstalacion = e;
  notificar();
});

window.addEventListener('appinstalled', () => {
  eventoInstalacion = null;
  notificar();
});

export function puedeInstalarse() {
  return eventoInstalacion != null;
}

export function suscribirInstalacion(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

export async function instalarApp() {
  if (!eventoInstalacion) return;
  const evento = eventoInstalacion;
  eventoInstalacion = null;
  notificar();
  await evento.prompt();
  await evento.userChoice;
}
