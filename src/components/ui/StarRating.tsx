export default function StarRating({
  value,
  size = 16,
  showValue = true,
  outOf = 5,
}: {
  value: number | null;
  size?: number;
  showValue?: boolean;
  outOf?: number;
}) {
  if (value == null) {
    return <span className="text-sm text-muted">Insufficient history</span>;
  }
  const stars = Array.from({ length: outOf }, (_, i) => {
    const fill = clampFill(value - i);
    return fill;
  });

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex" aria-hidden>
        {stars.map((fill, i) => (
          <Star key={i} fill={fill} size={size} />
        ))}
      </span>
      {showValue && (
        <span className="tabular text-sm font-medium text-muted">
          {value.toFixed(1)} / {outOf}
        </span>
      )}
    </span>
  );
}

function clampFill(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `star-${Math.round(fill * 100)}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--accent)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--border)" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L10 1.5z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}
