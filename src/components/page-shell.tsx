import type { ReactNode } from "react";
export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 ${className}`}>{children}</div>
  );
}
