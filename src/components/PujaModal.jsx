import { useEffect, useState } from 'react';
import { api, formatEuros, parseImporte } from '../lib/api';
import JugadorFoto from './JugadorFoto';
import PosBadge from './PosBadge';

// Pujar (o mejorar la puja) en una subasta: importe exacto, mínimo y saldo que queda bloqueado
export default function PujaModal({ subasta, saldo, onClose, onPujada }) {
  const minima = Number(subasta.puja_minima ?? subasta.precio_actual);
  const miPuja = Number(subasta.mi_puja ?? 0);
  // La puja anterior se devuelve al mejorarla, así que cuenta como saldo para la nueva
  const maximo = saldo === null ? Infinity : Number(saldo) + miPuja;

  const [texto, setTexto] = useState(String(Math.max(minima, miPuja)));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const monto = parseImporte(texto);
  const valido = Number.isFinite(monto) && monto > 0;
  const aviso = !valido
    ? 'Escribe un importe, por ejemplo 1.250.000 o 1,25M'
    : monto < minima
      ? `La puja mínima es ${formatEuros(minima)}`
      : monto > maximo
        ? `No tienes saldo suficiente (máximo ${formatEuros(maximo)})`
        : miPuja && monto === miPuja
          ? 'Es la misma cantidad que tu puja actual'
          : '';

  async function confirmar(e) {
    e.preventDefault();
    if (aviso) return;
    setEnviando(true);
    setError('');
    try {
      await api.pujar(subasta.id, monto);
      onPujada(monto);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const sugerencias = [
    ['Mínimo', minima],
    ['+10%', Math.ceil((minima * 1.1) / 10_000) * 10_000],
    ['+25%', Math.ceil((minima * 1.25) / 10_000) * 10_000],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={confirmar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="puja-titulo"
        className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-4 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <JugadorFoto id={subasta.id_jugador} nombre={subasta.jugador} size={44} />
            <div>
              <PosBadge pos={subasta.posicion} />
              <h2 id="puja-titulo" className="font-bold leading-tight">
                {miPuja ? 'Mejorar puja' : 'Pujar'} por {subasta.jugador}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Puja mínima</span>
            <span className="font-semibold">{formatEuros(minima)}</span>
          </div>
          {miPuja > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tu puja actual</span>
              <span className="font-semibold text-yellow-400">{formatEuros(miPuja)}</span>
            </div>
          )}
          {saldo !== null && (
            <div className="flex justify-between">
              <span className="text-gray-400">Saldo disponible</span>
              <span className="font-semibold text-green-400">{formatEuros(saldo)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="puja-monto" className="block text-sm text-gray-400">Tu puja (€)</label>
          <input
            id="puja-monto"
            className="input text-lg font-bold"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
          <div className="flex gap-2">
            {sugerencias.map(([etiqueta, valor]) => (
              <button
                key={etiqueta}
                type="button"
                onClick={() => setTexto(String(valor))}
                className="flex-1 text-xs py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
              >
                {etiqueta}
              </button>
            ))}
          </div>
          {valido && <p className="text-sm text-gray-300">= {formatEuros(monto)}</p>}
        </div>

        {aviso ? (
          <p className="text-sm text-yellow-400">{aviso}</p>
        ) : saldo !== null && (
          <p className="text-xs text-gray-400">
            Se bloquearán {formatEuros(monto)} hasta que cierre la subasta. Te quedará{' '}
            <span className="text-white font-semibold">{formatEuros(maximo - monto)}</span> disponible.
            Si no ganas, se te devuelve todo.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">Cancelar</button>
          <button type="submit" disabled={!!aviso || enviando} className="btn-primary flex-1 py-3">
            {enviando ? 'Pujando…' : miPuja ? 'Mejorar puja' : 'Pujar'}
          </button>
        </div>
      </form>
    </div>
  );
}
