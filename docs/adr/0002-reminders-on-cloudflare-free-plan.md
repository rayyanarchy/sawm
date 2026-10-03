# Reminders run on Cloudflare's free plan, with one Durable Object alarm per subscriber

Sawm must cost nothing to run, yet Reminders must arrive while the app is closed, which on the web means Web Push sent by a server at the right minute. The app and the reminder service both run on Cloudflare's free plan: each push subscription gets its own Durable Object, whose single alarm is set for that device's next Reminder; when it fires, it sends one push and re-arms for the following one. Users who won't install the app or allow notifications get the Calendar Export instead, because no web app can ring a real alarm.

## Considered Options

- **Every-minute cron scanning a table (Cloudflare cron + D1)**: simpler, but a busy Iftar minute would exceed the free plan's 10 ms of CPU per cron run, so it only works on the $5/month paid plan.
- **Supabase**: free projects pause after 7 days without outside activity, and its in-database cron can't keep them awake, so Reminders would silently stop outside Ramadan. Pro is $25/month.
- **Vercel Hobby**: cron runs at most once a day.
- **Native wrapper (Capacitor) for real alarms**: no longer a PWA, and app-store fees break the zero-cost rule.

## Consequences

The free plan allows 100,000 Durable Object requests a day, alarms included: roughly 30,000 devices at three Reminders a day. Growing past that means revisiting the zero-cost rule.
