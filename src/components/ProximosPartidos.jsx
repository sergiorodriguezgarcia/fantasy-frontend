import { useState } from 'react';
import CuentaAtras from './CuentaAtras';

// "2026-10-25" → "Domingo, 25 oct" (a mediodía para que la zona horaria no cambie el día)
function formatDia(fecha) {
  if (!fecha) return 'Fecha por confirmar';
  const txt = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Escudo del club (URL de asturfutbol.es); si no hay o no carga, la inicial del equipo
function Escudo({ src, nombre }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <span className="w-7 h-7 rounded-full bg-gray-700 text-gray-300 text-xs font-semibold flex items-center justify-center shrink-0 select-none">
        {(nombre ?? '?').replace(/^[^A-Za-zÁÉÍÓÚÑ]+/, '').charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className="w-7 h-7 object-contain shrink-0"
    />
  );
}

// Partidos de la próxima jornada (o la que está en juego) agrupados por día, con escudos y hora
export default function ProximosPartidos({ jornada }) {
  const partidos = jornada?.partidos ?? [];
  if (partidos.length === 0) return null;

  const dias = [];
  for (const p of partidos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.fecha === p.fecha) ultimo.partidos.push(p);
    else dias.push({ fecha: p.fecha, partidos: [p] });
  }

  const cierreFuturo = jornada.cierre_alineaciones && new Date(jornada.cierre_alineaciones) > new Date();

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">
            {jornada.estado === 'EN_CURSO' ? 'En juego' : 'Próxima jornada'}
          </p>
          <p className="font-bold">Jornada {jornada.numero}</p>
        </div>
        {cierreFuturo && (
          <div className="text-right">
            <p className="text-gray-500 text-[10px] uppercase tracking-wide">Cierre alineaciones</p>
            <CuentaAtras fecha={jornada.cierre_alineaciones} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {dias.map(dia => (
          <div key={dia.fecha ?? 'sin-fecha'}>
            <p className="text-xs text-gray-500 font-semibold mb-1">{formatDia(dia.fecha)}</p>
            <ul className="divide-y divide-gray-800">
              {dia.partidos.map(p => (
                <li
                  key={`${p.local}-${p.visitante}`}
                  className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-sm ${p.jugado ? 'opacity-50' : ''}`}
                >
                  <span className="flex items-center justify-end gap-2 min-w-0">
                    <span className="truncate text-right" title={p.local}>{p.local}</span>
                    <Escudo src={p.escudo_local} nombre={p.local} />
                  </span>
                  <span className="w-12 text-center text-xs tabular-nums font-semibold text-brand-300">
                    {p.jugado ? 'Final' : p.hora ?? <span className="text-gray-500 font-normal">Por fijar</span>}
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <Escudo src={p.escudo_visitante} nombre={p.visitante} />
                    <span className="truncate" title={p.visitante}>{p.visitante}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
