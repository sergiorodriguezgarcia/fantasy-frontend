import { useState } from 'react';

// Escudo del club (URL de asturfutbol.es); si no hay o no carga, la inicial del equipo
export default function Escudo({ src, nombre, className = 'w-7 h-7 text-xs' }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <span className={`${className} rounded-full bg-gray-700 text-gray-300 font-semibold flex items-center justify-center shrink-0 select-none`}>
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
      className={`${className} object-contain shrink-0`}
    />
  );
}
