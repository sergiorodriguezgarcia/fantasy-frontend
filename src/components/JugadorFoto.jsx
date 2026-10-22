import { useState } from 'react';
import { fotoJugadorUrl } from '../lib/api';

// Jugadores cuya foto ya dio 404: evita reintentar en cada render/página
const sinFoto = new Set();

function iniciales(nombre) {
  return (nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

// forma: 'circulo' (avatar) | 'cromo' (retrato rectangular, alto = 1.25 × ancho)
export default function JugadorFoto({ id, nombre, size = 32, forma = 'circulo', className = '' }) {
  // Se guarda el id que falló (no un booleano) por si el componente se reutiliza con otro jugador
  const [idFallido, setIdFallido] = useState(null);
  const error = !id || sinFoto.has(id) || idFallido === id;
  const cromo = forma === 'cromo';
  const style = {
    width: size,
    height: cromo ? Math.round(size * 1.25) : size,
    fontSize: Math.round(size * 0.38),
  };
  const redondeo = cromo ? 'rounded-lg' : 'rounded-full';

  if (error) {
    return (
      <span
        className={`${redondeo} bg-gray-700 text-gray-300 font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
        style={style}
        aria-hidden="true"
      >
        {iniciales(nombre)}
      </span>
    );
  }

  return (
    <img
      src={fotoJugadorUrl(id)}
      alt={nombre ?? ''}
      loading="lazy"
      className={`${redondeo} object-cover object-top bg-gray-700 shrink-0 ${className}`}
      style={style}
      onError={() => { sinFoto.add(id); setIdFallido(id); }}
    />
  );
}
