import { useState } from 'react';
import Escudo from './Escudo';
import PlantillaRealModal from './PlantillaRealModal';

// Franja del puesto: el primero en verde y del 2º al 5º en azul
function colorPuesto(posicion) {
  if (posicion === 1) return 'bg-green-500';
  if (posicion <= 5) return 'bg-blue-500';
  return 'bg-transparent';
}

// Clasificación real de la liga de asturfutbol. Al pulsar un equipo dado de alta se abre su plantilla
export default function ClasificacionLiga({ filas }) {
  const [equipo, setEquipo] = useState(null);
  if (!filas?.length) return null;

  return (
    <div className="card">
      <div className="mb-3">
        <p className="text-gray-400 text-xs uppercase tracking-wide">Liga AsturFútbol</p>
        <p className="font-bold">Clasificación</p>
      </div>

      <ul className="divide-y divide-gray-800 text-sm">
        {filas.map(f => {
          const nombre = (
            <>
              <Escudo src={f.escudo} nombre={f.equipo} className="w-5 h-5 text-[10px]" />
              <span className="truncate" title={f.equipo}>{f.equipo}</span>
            </>
          );
          return (
            <li key={f.equipo} className="flex items-center gap-2 py-1.5">
              <span className={`w-1 h-4 rounded-full shrink-0 ${colorPuesto(f.posicion)}`} />
              <span className="w-5 text-gray-400 tabular-nums text-xs shrink-0">{f.posicion}</span>
              {f.id_equipo_real ? (
                <button
                  onClick={() => setEquipo({ id: f.id_equipo_real, nombre: f.equipo, escudo: f.escudo })}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-brand-400 transition-colors"
                  title={`Ver plantilla de ${f.equipo}`}
                >
                  {nombre}
                </button>
              ) : (
                <span className="flex items-center gap-2 min-w-0 flex-1">{nombre}</span>
              )}
              <span className="font-bold tabular-nums shrink-0">{f.puntos} pts</span>
            </li>
          );
        })}
      </ul>

      {equipo && <PlantillaRealModal equipo={equipo} onClose={() => setEquipo(null)} />}
    </div>
  );
}
