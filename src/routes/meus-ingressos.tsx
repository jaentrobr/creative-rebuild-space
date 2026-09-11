import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/meus-ingressos")({ component: () => <Outlet /> });
