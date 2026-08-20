import { createFileRoute } from "@tanstack/react-router";
import { proxyRequest } from "../lib/proxy.server";

const handler = ({ request }: { request: Request }) => proxyRequest(request);

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
      HEAD: handler,
      OPTIONS: handler,
    },
  },
});
