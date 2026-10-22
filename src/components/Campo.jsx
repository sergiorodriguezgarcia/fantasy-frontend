// Campo de fútbol y colocación de los jugadores por formación (compartido por Mi Equipo y las
// vistas de puntuación de una jornada).

export const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'];

// Coordenadas [x%, y%] de cada hueco en el campo por formación (ataque arriba, portería abajo).
// El nº de huecos por posición coincide con las formaciones permitidas.
const DEF_4 = [[12, 63], [37, 67], [63, 67], [88, 63]];
const DEF_3 = [[22, 65], [50, 67], [78, 65]];
const DEL_3 = [[18, 16], [50, 12], [82, 16]];
const DEL_2 = [[33, 13], [67, 13]];
const POR_1 = [[50, 88]];
export const DISPOSICION = {
  '4-3-3': { POR: POR_1, DEF: DEF_4, MED: [[24, 41], [50, 38], [76, 41]],                        DEL: DEL_3 },
  '4-4-2': { POR: POR_1, DEF: DEF_4, MED: [[12, 38], [37, 41], [63, 41], [88, 38]],              DEL: DEL_2 },
  '3-5-2': { POR: POR_1, DEF: DEF_3, MED: [[10, 36], [30, 43], [50, 38], [70, 43], [90, 36]],    DEL: DEL_2 },
  '3-4-3': { POR: POR_1, DEF: DEF_3, MED: [[12, 39], [37, 42], [63, 42], [88, 39]],              DEL: DEL_3 },
};

const ALTURA = { POR: 88, DEF: 65, MED: 40, DEL: 14 };

/**
 * Coordenadas de los `n` jugadores de una posición. Usa la disposición de la formación si encaja;
 * si no (alineaciones antiguas o incompletas), los reparte a lo ancho en su línea.
 */
export function coordenadas(formacion, pos, n) {
  const fijas = DISPOSICION[formacion]?.[pos];
  if (fijas?.length === n) return fijas;
  return Array.from({ length: n }, (_, i) => [n === 1 ? 50 : 12 + (i * 76) / (n - 1), ALTURA[pos]]);
}

// "PABLO MORAN GARCIA" → "MORAN GARCIA" (como en los fantasy, se muestra el apellido)
export function nombreCorto(nombre) {
  const palabras = (nombre ?? '').split(' ').filter(Boolean);
  return palabras.length > 1 ? palabras.slice(1).join(' ') : nombre;
}

export function Campo({ children }) {
  const linea = 'absolute border-white/30 pointer-events-none';
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-green-900 shadow-lg max-w-md mx-auto aspect-[3/4]"
      style={{ background: 'repeating-linear-gradient(180deg, #2e7d32 0 10%, #2b7330 10% 20%)' }}
    >
      {/* Marcas del campo */}
      <div className={`${linea} inset-2 border-2 rounded-sm`} />
      <div className={`${linea} left-2 right-2 top-1/2 border-t-2`} />
      <div className={`${linea} left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 rounded-full`} />
      <div className={`${linea} left-1/2 top-2 w-1/2 h-[13%] -translate-x-1/2 border-2 border-t-0`} />
      <div className={`${linea} left-1/2 top-2 w-1/4 h-[5%] -translate-x-1/2 border-2 border-t-0`} />
      <div className={`${linea} left-1/2 bottom-2 w-1/2 h-[13%] -translate-x-1/2 border-2 border-b-0`} />
      <div className={`${linea} left-1/2 bottom-2 w-1/4 h-[5%] -translate-x-1/2 border-2 border-b-0`} />

      {children}
    </div>
  );
}
