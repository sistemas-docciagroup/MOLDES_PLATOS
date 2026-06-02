import { createMiddleware } from "@tanstack/react-start";
import { mockAuth } from "@/lib/mock-auth";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const session = mockAuth.getSession();
    return next({
      headers: session ? { Authorization: `Bearer ${session.id}` } : {},
    });
  }
);
