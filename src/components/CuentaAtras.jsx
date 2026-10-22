import { useEffect, useRef, useState } from 'react';

function formatear(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = n => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${dos(m)}m`;
  return `${dos(m)}:${dos(s)}`;
}

// Cuenta atrás en directo hasta `fecha`. Se resalta en la última hora y avisa con onFin al llegar a cero.
export default function CuentaAtras({ fecha, onFin }) {
  const fin = new Date(fecha).getTime();
  const [ahora, setAhora] = useState(Date.now());
  // Si ya estaba vencida al montarse no se avisa (evita recargas en bucle si el reloj del móvil va adelantado)
  const avisado = useRef(fin <= Date.now());
  const restante = Math.max(0, fin - ahora);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restante === 0 && !avisado.current) {
      avisado.current = true;
      onFin?.();
    }
  }, [restante, onFin]);

  if (restante === 0) {
    return <span className="text-xs font-semibold text-gray-500">Cerrada</span>;
  }

  const cls = restante < 10 * 60_000
    ? 'text-red-400 font-bold animate-pulse'
    : restante < 60 * 60_000
      ? 'text-orange-300 font-semibold'
      : 'text-gray-500';

  return (
    <span
      className={`text-xs tabular-nums ${cls}`}
      title={`Cierra el ${new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`}
    >
      ⏱ {formatear(restante)}
    </span>
  );
}
