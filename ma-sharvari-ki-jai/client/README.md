# Client Dev Notes

- API proxy points to `http://localhost:5000` (see `vite.config.ts`). Ensure the server runs there.
- For local dev without auth, set `AUTH_DISABLED=true` in the server `.env`.
- Segments page includes Smart Builder and Visual Builder (drag-and-drop). Visual builder outputs a Group rules tree compatible with backend preview/save.
