# PROTOTYPE: Today screen directions (#38)

Throwaway. Three structurally different takes on the Today screen, switchable with `?variant=A|B|C`
on the real Today route, with real times from the app core. Run `pnpm prototype`.

- `?state=before-suhoor|fasting|not-fasting` simulates the moment of the day (the clock keeps ticking).
- `?theme=light|dark` overrides the system theme.
- `?place=Karachi` picks the first search result if there's no Saved Location yet.

Nothing here is merged into `main`. The winning direction is rebuilt properly in #40.
