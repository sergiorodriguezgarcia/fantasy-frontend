import { useState } from 'react';
import CuentaAtras from './CuentaAtras';
import Escudo from './Escudo';
import PlantillaRealModal from './PlantillaRealModal';

// "2026-10-25" → "Domingo, 25 oct" (a mediodía para que la zona horaria no cambie el día)
function formatDia(fecha) {
  if (!fecha) return 'Fecha por confirmar';
  const txt = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Escudo + nombre de un equipo del partido. Si el club está dado de alta (id), es un botón que abre
// su plantilla; visitante = escudo a la izquierda del nombre, local = a la derecha
function Equipo({ id, nombre, escudo, visitante, onAbrir }) {
  const contenido = visitante ? (
    <>
      <Escudo src={escudo} nombre={nombre} />
      <span className="truncate" title={nombre}>{nombre}</span>
    </>
  ) : (
    <>
      <span className="truncate text-right" title={nombre}>{nombre}</span>
      <Escudo src={escudo} nombre={nombre} />
    </>
  );
  const cls = `flex items-center gap-2 min-w-0 ${visitante ? '' : 'justify-end'}`;

  if (!id) return <span className={cls}>{contenido}</span>;
  return (
    <button
      onClick={() => onAbrir({ id, nombre, escudo })}
      className={`${cls} hover:text-brand-400 transition-colors`}
      title={`Ver plantilla de ${nombre}`}
    >
      {contenido}
    </button>
  );
}

// Partidos de la próxima jornada (o la que está en juego) agrupados por día, con escudos y hora.
// Al pulsar un equipo se abre su plantilla
export default function ProximosPartidos({ jornada }) {
  const [equipo, setEquipo] = useState(null);
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
                  <Equipo id={p.id_local} nombre={p.local} escudo={p.escudo_local} onAbrir={setEquipo} />
                  <span className="w-12 text-center text-xs tabular-nums font-semibold text-brand-300">
                    {p.jugado ? 'Final' : p.hora ?? <span className="text-gray-500 font-normal">Por fijar</span>}
                  </span>
                  <Equipo id={p.id_visitante} nombre={p.visitante} escudo={p.escudo_visitante} visitante onAbrir={setEquipo} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {equipo && <PlantillaRealModal equipo={equipo} onClose={() => setEquipo(null)} />}
    </div>
  );
}
