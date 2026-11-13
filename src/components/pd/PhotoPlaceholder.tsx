export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_10px,var(--color-secondary)_10px_20px)] ${className}`}>
      <span className="rounded bg-card/90 px-2 py-1 text-xs text-muted-foreground">Photo unavailable</span>
    </div>
  );
}
