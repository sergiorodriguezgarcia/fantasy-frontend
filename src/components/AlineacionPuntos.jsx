import JugadorFoto from './JugadorFoto';
import PosBadge from './PosBadge';
import { Campo, POSICIONES, coordenadas, nombreCorto } from './Campo';

/**
 * Alineación de un equipo en una jornada dibujada en el campo, con los puntos de cada jugador en
 * la esquina de su foto. Recibe { formacion, campo, banquillo } del backend: en `campo` ya están
 * aplicadas las sustituciones (`entra_por`) y el ×2 del capitán (`puntos_campo`).
 */
export default function AlineacionPuntos({ alineacion, onVerFicha }) {
  if (!alineacion?.campo?.length) {
    return (
      <div className="card text-center py-6">
        <p className="text-sm text-gray-400">Sin alineación esta jornada: el equipo no puntuó</p>
      </div>
    );
  }

  const { formacion, campo, banquillo } = alineacion;

  return (
    <div className="space-y-3">
      <Campo>
        {POSICIONES.flatMap(pos => {
          const jugadores = campo.filter(j => j.posicion === pos);
          const coords = coordenadas(formacion, pos, jugadores.length);
          return jugadores.map((j, idx) => (
            <JugadorEnCampo
              key={j.id_jugador}
              jugador={j}
              x={coords[idx][0]}
              y={coords[idx][1]}
              onClick={onVerFicha && (() => onVerFicha(j.id_jugador))}
            />
          ));
        })}
      </Campo>

      {banquillo.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-300 mb-3">
            Banquillo <span className="text-gray-500 font-normal">({banquillo.length})</span>
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {banquillo.map(j => (
              <button
                key={j.id_jugador}
                onClick={onVerFicha && (() => onVerFicha(j.id_jugador))}
                className={`flex flex-col items-center gap-1 min-w-0 ${jugo(j) ? '' : 'opacity-50'}`}
                title={j.nombre}
              >
                <span className="relative">
                  <JugadorFoto id={j.id_jugador} nombre={j.nombre} size={48} forma="cromo" className="ring-1 ring-gray-700" />
                  <PuntosBadge jugador={j} puntos={j.puntos} />
                </span>
                <PosBadge pos={j.posicion} />
                <span className="text-[11px] leading-tight text-gray-300 truncate max-w-full">
                  {nombreCorto(j.nombre)}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Los puntos del banquillo no cuentan, salvo los del suplente que entra por un titular que no jugó.
          </p>
        </div>
      )}
    </div>
  );
}

const jugo = j => (j.minutos_jugados ?? 0) > 0;

// Puntos en la esquina superior izquierda de la foto ("–" si no jugó)
function PuntosBadge({ jugador, puntos }) {
  const p = puntos ?? 0;
  const color = !jugo(jugador)
    ? 'bg-gray-600 text-gray-200'
    : p > 0 ? 'bg-green-500 text-green-950'
    : p < 0 ? 'bg-red-600 text-white'
    : 'bg-gray-400 text-gray-900';
  return (
    <span
      className={`absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black flex items-center justify-center shadow ${color}`}
      title={jugo(jugador) ? `${p} puntos${jugador.es_capitan && jugador.puntos_campo != null ? ' (capitán ×2)' : ''}` : 'No jugó'}
    >
      {jugo(jugador) ? p : '–'}
    </span>
  );
}

function JugadorEnCampo({ jugador, x, y, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 w-[19%] max-w-[80px] flex flex-col items-center min-w-0 group"
      title={jugador.entra_por ? `${jugador.nombre} (entra por ${jugador.entra_por.nombre})` : jugador.nombre}
    >
      <span className="relative">
        <JugadorFoto
          id={jugador.id_jugador}
          nombre={jugador.nombre}
          size={54}
          forma="cromo"
          className={`ring-2 shadow-md transition ${jugador.entra_por ? 'ring-sky-300' : 'ring-white/80'} group-hover:ring-yellow-300`}
        />
        <PuntosBadge jugador={jugador} puntos={jugador.puntos_campo} />
        {jugador.es_capitan && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-400 text-yellow-950 text-[10px] font-black flex items-center justify-center shadow">
            C
          </span>
        )}
      </span>
      <span className="mt-1 max-w-full truncate bg-gray-950/85 text-white text-[11px] font-semibold leading-tight px-1.5 py-0.5 rounded">
        {nombreCorto(jugador.nombre)}
      </span>
      {jugador.entra_por && (
        <span className="max-w-full truncate text-[10px] font-semibold text-sky-100 drop-shadow">
          ⇄ {nombreCorto(jugador.entra_por.nombre)}
        </span>
      )}
    </button>
  );
}
