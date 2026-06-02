import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Registro no disponible</h1>
        <p className="text-sm text-muted-foreground">
          El registro de nuevos usuarios está gestionado por el administrador del sistema.
        </p>
        <Link to="/login" className="inline-block text-sm text-primary underline">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
