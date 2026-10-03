# Prayer times come from AlAdhan, fetched a month at a time and cached on the device

Sawm gets Fajr, Imsak, Maghrib and Hijri Dates from the AlAdhan API, not by calculating them on the device (e.g. with `adhan-js`). AlAdhan already maintains every calculation method and the Hijri calendar, so we don't have to. To keep the app working offline and to stay well clear of rate limits, the client fetches a whole month per location and method and caches it, so a typical user makes about one request a month.

## Considered Options

- **On-device calculation (`adhan-js`)**: fully offline with no third-party dependency, but we'd own the correctness of every calculation method and the Hijri calendar. Revisit if AlAdhan's availability becomes a problem.
