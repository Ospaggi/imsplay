# Repository Guidelines

## Project Structure & Module Organization

This is a React 19 + React Router v7 TypeScript app for playing legacy AdLib, tracker, IMS, ROL, and VGM music in the browser.

- `app/routes/` contains pages and API routes; `app/routes.ts` registers them.
- `app/components/` contains UI components; DOS-themed primitives are in `app/components/dos-ui/`.
- `app/lib/` contains audio engines, format detection, worklet loading, and hooks.
- `public/` serves sample music, fonts, icons, JS loaders, and WASM binaries at the site root.
- `wasm/` holds WASM-related source/build materials.
- `build/` and `.react-router/` are generated output; do not edit them by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the dev server, normally at `http://localhost:5173`.
- `npm run build`: create the production build in `build/`.
- `npm start`: serve `build/server/index.js`.
- `npm run typecheck`: run React Router type generation and TypeScript checks.
- `npm run analyze`: analyze bundled music files.
- `npm run vgm-to-ims`: run the VGM-to-IMS conversion tool.

Run `npm run typecheck` before submitting changes. For UI or audio changes, also verify playback in a browser.

## Coding Style & Naming Conventions

Use strict TypeScript. Components use PascalCase names, such as `MusicPlayer.tsx`; hooks use `use...` names under `app/lib/hooks/`. Prefer the `~/*` alias for imports from `app/`.

Follow the existing style: two-space indentation, double quotes for imports, semicolons, and focused comments for non-obvious audio or browser behavior. Keep API-only logic under `app/routes/api/`.

## Testing Guidelines

There is no configured `npm test` script or committed test suite. Use `npm run typecheck` as the baseline automated check. When adding tests, place them near covered code as `*.test.ts` or `*.test.tsx`, and add the needed npm script/configuration.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries, for example `Fix sticky hover background on touch devices`. Keep commit subjects concise and focused on one change.

Pull requests should include a clear description, verification steps, and screenshots or recordings for visible UI changes. Mention affected formats or assets when changing parser, playback, WASM, or `public/` sample behavior.

## Assets & Configuration Tips

Do not rename or remove files in `public/` without checking sample lists and loaders. WASM and AudioWorklet files are loaded by browser path, so verify production builds after changing them. Keep secrets and local-only configuration out of the repository.
