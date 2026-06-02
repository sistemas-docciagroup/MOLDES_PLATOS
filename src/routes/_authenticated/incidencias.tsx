import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/incidencias")({
  beforeLoad: () => {
    throw redirect({ to: "/moldes" });
  },
  component: LegacyIncidenciasRedirect,
});

function LegacyIncidenciasRedirect() {
  return null;
}