# Sawm

A fasting companion. Sawm shows when today's fast begins and ends where you are, plans the fasts you keep, and reminds you before Suhoor and at Iftar. It's an installable web app: free, with no account, and your data stays on your phone.

Sawm is being rebuilt. The plan is the spec in [#36](https://github.com/rayyanarchy/sawm/issues/36) and its tickets. The previous Flask app lives on the `archive/flask-main` branch.

## Running it

You need Node 22 and pnpm.

```sh
pnpm install
pnpm dev
```

Then open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the app and its Cloudflare Worker locally, with hot reload |
| `pnpm test` | Runs the tests |
| `pnpm typecheck` | Type-checks the app, the Worker and the tooling |
| `pnpm lint` | Lints everything |
| `pnpm build` | Builds the app and the Worker into `dist/` |
| `pnpm preview` | Serves the production build locally |
| `pnpm fixtures:record` | Re-records the real responses the tests are served |

## How it's built

- **`src/core`** is Sawm without its screens: every rule and every piece of data, behind one interface. It talks to the outside world only through the device it's given (network, storage, clock), so tests can hand it recorded responses and a clock they control.
- **`src/ui`** holds the React screens. They render what the core says and hold no logic of their own.
- **`src/device`** is the real device: `fetch`, IndexedDB and the system clock.
- **`worker`** is the Cloudflare Worker that serves the app and, later, delivers Reminders.

Times and Hijri dates come from [AlAdhan](https://aladhan.com/prayer-times-api); place search comes from [Photon](https://photon.komoot.io) (OpenStreetMap data).

The project's vocabulary is defined in [`CONTEXT.md`](CONTEXT.md), and the decisions behind its shape are in [`docs/adr`](docs/adr).

## License

[MIT](LICENSE)
