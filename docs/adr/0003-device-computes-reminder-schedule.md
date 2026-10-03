# The device computes the Reminder Schedule; the server only delivers it

All the rules that decide Planned Fasts (Followed Fast Types, Skips, One-off Fasts, the Hijri Offset, Forbidden Days) live only in the app. The device turns them into a Reminder Schedule (exact instants plus message text for the next 60 days) and uploads it with its anonymous push subscription whenever it changes or the app is opened. The server stores nothing else: no account, no location, no settings. There is one implementation of the fast rules, and almost no personal data leaves the phone.

## Considered Options

- **Server computes Planned Fasts**: stays current even if the app is never opened, but duplicates the fast rules on the server and stores each user's location and settings there.
- **Google sign-in**: would only add cross-device sync of settings; not worth an account system in v1.

## Consequences

A device that isn't opened for 60 days stops receiving Reminders. A week before its Reminder Schedule runs out, the last scheduled push asks the user to open Sawm.
