import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

function TornTicketIllustration() {
  return (
    <svg
      viewBox="0 0 220 140"
      width={220}
      height={140}
      className="mx-auto"
      role="img"
      aria-label="Ilustração de um ingresso rasgado"
    >
      <g transform="translate(0,4)">
        <path
          d="M8 20 h95 a8 8 0 0 1 8 8 v10 a8 8 0 0 0 0 16 v10 a8 8 0 0 1 -8 8 H8 Z"
          fill="var(--color-secondary)"
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
        <path
          d="M111 20 l4 8 l-6 6 l6 6 l-6 6 l6 6 l-6 6 l4 8 h95 a8 8 0 0 0 8 -8 V44 a8 8 0 0 1 0 -16 V20 a8 8 0 0 0 -8 -8 H115 Z"
          fill="var(--color-sun)"
          stroke="var(--color-ink)"
          strokeWidth="2"
          transform="translate(0,0)"
          opacity="0.9"
        />
        <circle
          cx="150"
          cy="52"
          r="12"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <line
          x1="0"
          y1="15"
          x2="30"
          y2="55"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <line
          x1="220"
          y1="10"
          x2="185"
          y2="60"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </g>
    </svg>
  );
}

export function NotFoundState() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="max-w-md text-center">
        <TornTicketIllustration />
        <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Esse rolê não existe</h1>
        <p className="mt-2 text-muted-foreground">
          A página que você procura não foi encontrada, foi movida ou o link está incorreto.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
}
