import { useState } from 'react';
import { formatMoney } from '../lib/api';

const W = 320;
const H = 150;
const PAD = { top: 20, right: 12, bottom: 22, left: 40 };

// Gráfica de línea con la evolución del valor del jugador jornada a jornada.
// puntos: [{ etiqueta: 'J1', precio: 5000000 }, ...]
export default function PrecioGrafica({ puntos }) {
  const [sel, setSel] = useState(puntos.length - 1);

  if (puntos.length < 2) {
    return <p className="text-xs text-gray-500">Aún no hay jornadas calculadas para ver su evolución</p>;
  }

  const precios = puntos.map(p => p.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const margen = (max - min) * 0.15 || max * 0.05 || 1;
  const yMin = min - margen;
  const yMax = max + margen;
  const ancho = W - PAD.left - PAD.right;
  const alto = H - PAD.top - PAD.bottom;
  const x = i => PAD.left + (i / (puntos.length - 1)) * ancho;
  const y = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * alto;

  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.precio)}`).join(' ');
  const area = `${linea} L${x(puntos.length - 1)},${PAD.top + alto} L${x(0)},${PAD.top + alto} Z`;
  const color = precios.at(-1) >= precios[0] ? 'text-green-400' : 'text-red-400';
  // Con muchas jornadas no caben todas las etiquetas del eje X
  const cadaEtiqueta = Math.ceil(puntos.length / 8);
  const marcasY = min === max ? [min] : [min, (min + max) / 2, max];

  const idx = Math.min(sel, puntos.length - 1);
  const actual = puntos[idx];
  const delta = idx > 0 ? actual.precio - puntos[idx - 1].precio : 0;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-auto ${color}`} role="img" aria-label="Evolución del valor del jugador">
        {/* Rejilla y eje Y */}
        {marcasY.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-gray-700" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="fill-gray-500" fontSize="9">
              {formatMoney(v)}
            </text>
          </g>
        ))}

        {/* Eje X */}
        {puntos.map((p, i) => (i % cadaEtiqueta === 0 || i === puntos.length - 1) && (
          <text key={p.etiqueta} x={x(i)} y={H - 6} textAnchor="middle" className="fill-gray-500" fontSize="9">
            {p.etiqueta}
          </text>
        ))}

        <path d={area} fill="currentColor" fillOpacity="0.12" />
        <path d={linea} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Punto seleccionado */}
        <line x1={x(idx)} x2={x(idx)} y1={PAD.top} y2={PAD.top + alto} className="stroke-gray-600" />
        {puntos.map((p, i) => (
          <circle key={p.etiqueta} cx={x(i)} cy={y(p.precio)} r={i === idx ? 4 : 2.5} fill="currentColor" />
        ))}

        {/* Zonas táctiles amplias para seleccionar cada punto */}
        {puntos.map((p, i) => (
          <rect
            key={p.etiqueta}
            x={x(i) - ancho / (puntos.length - 1) / 2}
            y={0}
            width={ancho / (puntos.length - 1)}
            height={H}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setSel(i)}
            onClick={() => setSel(i)}
          >
            <title>{`${p.etiqueta}: ${formatMoney(p.precio)}`}</title>
          </rect>
        ))}
      </svg>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{actual.etiqueta === 'Ini' ? 'Valor inicial' : actual.etiqueta === 'Hoy' ? 'Valor actual' : `Jornada ${actual.etiqueta.slice(1)}`}</span>
        <span>
          <span className="font-bold text-white">{formatMoney(actual.precio)}</span>
          {delta !== 0 && (
            <span className={`ml-2 font-semibold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {delta > 0 ? '+' : '-'}{formatMoney(Math.abs(delta))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
