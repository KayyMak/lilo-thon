import Link from "next/link";

/**
 * One step on the path: a marker on the connecting line plus its own bounded
 * region (Common Region). Locked steps render muted and are not links.
 */
export function PathNode({
  marker,
  title,
  detail,
  href,
  muted = false,
  className = "",
  markerClassName = "border-zinc-300 bg-background dark:border-zinc-700",
  children,
}: {
  marker: React.ReactNode;
  title: string;
  detail: string;
  href?: string;
  muted?: boolean;
  className?: string;
  markerClassName?: string;
  children?: React.ReactNode;
}) {
  const body = (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-3 pr-5 transition-colors ${
        muted ? "border-transparent text-zinc-400 dark:text-zinc-600" : "border-zinc-200 dark:border-zinc-800"
      } ${href ? "hover:border-foreground" : ""} ${className}`}
    >
      <span
        className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${markerClassName}`}
      >
        {marker}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className={`text-sm ${muted ? "" : "text-zinc-500"}`}>{detail}</span>
        {children}
      </span>
    </div>
  );

  return <li>{href ? <Link href={href}>{body}</Link> : body}</li>;
}

export function LockIcon() {
  return (
    <svg aria-label="Locked" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg aria-label="Complete" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
