import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    const userId = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "admin-001";

    return next({ context: { userId } });
  }
);
