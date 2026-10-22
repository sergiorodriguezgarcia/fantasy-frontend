import { formatMoney } from '../lib/api';

// Días que faltan para que la cláusula se pueda pagar (0 si ya se puede)
export function diasProteccion(activaDesde) {
  if (!activaDesde) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desde = new Date(activaDesde);
  desde.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((desde - hoy) / 86_400_000));
}

export default function ClausulaChip({ monto, activaDesde }) {
  const dias = diasProteccion(activaDesde);
  if (dias > 0) {
    return (
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 whitespace-nowrap"
        title={`Cláusula de ${formatMoney(monto)} protegida ${dias} día${dias > 1 ? 's' : ''} más`}
      >
        🔒 {dias}d
      </span>
    );
  }
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300 whitespace-nowrap"
      title="Cláusula pagable ahora"
    >
      🔓 {formatMoney(monto)}
    </span>
  );
}
