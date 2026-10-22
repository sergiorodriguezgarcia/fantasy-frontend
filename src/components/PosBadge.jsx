export default function PosBadge({ pos }) {
  const cls = pos ? `badge-${pos}` : 'badge-null';
  return <span className={cls}>{pos ?? '?'}</span>;
}
