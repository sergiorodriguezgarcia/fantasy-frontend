// Barras con los puntos del jugador jornada a jornada: verde si suma, rojo si resta y un guion en
// las que no jugó (puntos null). Con onSelect, cada columna se puede pulsar para ver su desglose.
// jornadas: [{ jornada: 3, puntos: 7, capitan: false }, ...]
// compacta: versión mini sin ejes (últimas jornadas en el panel de Mi Equipo)
export default function PuntosGrafica({ jornadas, sel = null, onSelect, compacta = false }) {
  if (!jornadas?.length) return null;

  const W = compacta ? 110 : 320;
  const H = compacta ? 32 : 140;
  const PAD = compacta
    ? { top: 2, right: 0, bottom: 2, left: 0 }
    : { top: 16, right: 4, bottom: 18, left: 4 };

  const valores = jornadas.map(j => j.puntos ?? 0);
  const yMax = Math.max(...valores, compacta ? 1 : 4);
  const yMin = Math.min(...valores, 0);
  const alto = H - PAD.top - PAD.bottom;
  const y = v => PAD.top + ((yMax - v) / (yMax - yMin)) * alto;
  const cero = y(0);

  const col = (W - PAD.left - PAD.right) / jornadas.length;
  const barra = Math.min(col * 0.65, compacta ? 14 : 22);
  // Con muchas jornadas no caben todas las etiquetas
  const conValores = !compacta && jornadas.length <= 12;
  const cadaEtiqueta = Math.ceil(jornadas.length / 12);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={compacta ? 'w-[110px] h-8' : 'w-full h-auto'}
      role="img"
      aria-label="Puntos por jornada"
    >
      {jornadas.map((j, i) => {
        const cx = PAD.left + col * i + col / 2;
        const v = j.puntos;
        const seleccionada = sel === j.jornada;
        const color = v == null || v === 0 ? 'fill-gray-600' : v > 0 ? 'fill-green-500' : 'fill-red-500';
        const top = v > 0 ? y(v) : cero;
        const h = v ? Math.max(Math.abs(y(v) - cero), 2) : 2;

        return (
          <g
            key={j.jornada}
            onClick={onSelect ? () => onSelect(seleccionada ? null : j.jornada) : undefined}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            {!compacta && (
              <rect
                x={cx - col / 2} y={0} width={col} height={H}
                className={seleccionada ? 'fill-gray-700/60' : 'fill-transparent'}
                rx="4"
              />
            )}
            <rect
              x={cx - barra / 2} y={top} width={barra} height={h}
              rx={compacta ? 1.5 : 2.5}
              className={`${color} ${sel != null && !seleccionada ? 'opacity-40' : ''}`}
            >
              <title>{`J${j.jornada}: ${v == null ? 'no jugó' : `${v > 0 ? '+' : ''}${v} pts`}${j.capitan ? ' (capitán)' : ''}`}</title>
            </rect>

            {!compacta && (conValores || seleccionada) && (
              <text
                x={cx}
                y={v < 0 ? cero + h + 10 : top - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                className={v == null ? 'fill-gray-600' : j.capitan ? 'fill-yellow-400' : 'fill-gray-300'}
              >
                {v == null ? '–' : `${v > 0 ? '+' : ''}${v}${j.capitan ? '©' : ''}`}
              </text>
            )}

            {!compacta && (i % cadaEtiqueta === 0 || seleccionada) && (
              <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" className={seleccionada ? 'fill-white' : 'fill-gray-500'}>
                J{j.jornada}
              </text>
            )}
          </g>
        );
      })}

      {!compacta && (
        <line x1={PAD.left} x2={W - PAD.right} y1={cero} y2={cero} className="stroke-gray-600" strokeWidth="1" />
      )}
    </svg>
  );
}
