import type { Plugin } from "vite";

// Miniflare's HTTP bridge can report a transport failure when a Worker rejects
// a large request before consuming its body. Reject declared oversized uploads
// at the development edge; the deployed Worker also enforces the streaming cap.
export function wikiDevUploadLimit(): Plugin {
  return {
    name: "wiki-dev-upload-limit",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (
          request.method === "PUT" &&
          request.url?.split("?")[0] === "/api/admin/resources" &&
          Number(request.headers["content-length"]) > 17 * 1024 * 1024
        ) {
          response.writeHead(413, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          });
          response.end(
            JSON.stringify({
              error: "Файл слишком большой. Максимум — 16 МиБ.",
            }),
          );
          request.resume();
          return;
        }
        next();
      });
    },
  };
}
