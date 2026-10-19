# AI page repair checklist

- [x] Confirm the root cause of the AI issue: missing route and backend wiring for the existing AI UI.
- [x] Restore a valid AI page entry under the dashboard route so the sidebar link resolves instead of returning a 404.
- [x] Add a server-side chat API endpoint that validates authentication and tenant context before calling the model.
- [x] Add a model discovery endpoint that returns the configured provider list and graceful fallback when the provider key is unavailable.
- [x] Wire the existing chat UI to the actual transport and guarded provider selection.
- [x] Add safe loading and error handling so the chat does not send empty or duplicate requests while busy.
- [x] Validate TypeScript compilation of the AI-related code paths.
- [x] Validate runtime behavior: the page resolves and the API responds with a real HTTP status instead of 404.

## Notes
- The app is protected by auth, so visiting /ai without a session redirects to /login rather than rendering the page.
- The actual chat endpoint is reachable and returns 401 for unauthenticated requests, which is the expected guard behavior.
- The project still has unrelated repo-level TypeScript issues outside the AI fix if a full workspace-wide build is run; the AI fix itself is validated via the local route/API checks above.
