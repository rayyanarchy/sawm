# Sawm

A fasting companion: it tells a Muslim when today's fast begins and ends, and which fasts are coming up.

## Language

### The fasting day

**Suhoor**:
The time the fast begins each day, taken from the Fajr prayer time; eating and drinking must stop by then. Also the name of the pre-dawn meal.
_Avoid_: Sehri, Fajr (as a label), Imsak

**Iftar**:
The time the fast ends each day, taken from the Maghrib prayer time. Also the name of the meal that breaks the fast.
_Avoid_: Maghrib (as a label)

**Imsak**:
A precautionary stop a few minutes before Suhoor. Optional and secondary; never treated as the boundary of the fast.

**Eating Window**:
The period from Iftar until the next Suhoor, when eating and drinking are permitted.

**Saved Location**:
The one place whose Suhoor and Iftar times Sawm shows. Changes only when the user confirms it.

**Calculation Method**:
The convention (e.g. Karachi, Umm al-Qura, ISNA) used to derive Suhoor and Iftar from the sun's position. Defaults from the Saved Location's country.

**High-Latitude Rule**:
The convention used to set Suhoor in places where the sky never gets fully dark in summer, so Fajr can't be found the normal way.

**Minute Adjustment**:
A user's nudge of Suhoor or Iftar by a few minutes, so Sawm matches their local mosque's timetable.
_Avoid_: offset (reserved for the Hijri Offset), tune

### Fasts

**Fast Type**:
A kind of fast Sawm knows about: Ramadan, Six of Shawwal, White Days, Mondays & Thursdays, Fast of Dawud, Day of Arafah, Ashura, First Nine of Dhul Hijjah.
_Avoid_: fast category, preset

**Followed Fast Type**:
A Fast Type the user has chosen to observe.

**Forbidden Day**:
A day on which fasting is not allowed: Eid al-Fitr, Eid al-Adha and the Days of Tashreeq. Overrides every Fast Type and cannot be switched off.
_Avoid_: blocked day

**Disliked Day**:
A day on which voluntary fasting is discouraged but not forbidden, such as a Friday on its own or the Day of Doubt. Not the same as a Forbidden Day.

**Planned Fast**:
A specific date the user is expected to fast, derived from their Followed Fast Types, plus One-off Fasts, minus Skips; a date is one Planned Fast however many Fast Types it matches. "Fasting today" means today is a Planned Fast.
_Avoid_: fasting day, scheduled fast

**Skip**:
The user's decision not to fast on a date, or a run of dates, that would otherwise be Planned Fasts.

**One-off Fast**:
A single date the user adds as a Planned Fast outside their Followed Fast Types.

**Current Fast**:
The Planned Fast in progress: between its Suhoor and its Iftar.

**Next Fast**:
The nearest Planned Fast whose Suhoor is still ahead.

### Calendar

**Hijri Date**:
The date in the Islamic lunar calendar, as calculated by the data source and then shifted by the Hijri Offset.

**Hijri Offset**:
A user setting of up to ±2 days that shifts every Hijri Date to match the user's community's moon sighting.
_Avoid_: moon sighting adjustment

**Makkah Date**:
The Hijri Date as Makkah reckons it, with no Hijri Offset. Used for the Day of Arafah only when the user chooses to follow Makkah.

**Month-end Check**:
The question Sawm asks on the evening of the 29th of Sha'ban, Ramadan and Dhul Qa'dah (and Dhul Hijjah, for those following Ashura): has the next month been announced for tomorrow? The answer adjusts the Hijri Offset.
_Avoid_: moon check, sighting prompt

### Reminders

**Reminder**:
A notification Sawm schedules for a set moment, delivered whether or not the app is open.
_Avoid_: alarm (Sawm cannot ring alarms)

**Suhoor Reminder**:
A Reminder a set number of minutes before Suhoor on a Planned Fast.

**Iftar Reminder**:
A Reminder at Iftar on a Planned Fast.

**Night-before Reminder**:
A Reminder the evening before a voluntary Planned Fast, so the user can make their intention and plan Suhoor.

**Month-end Check Reminder**:
A Reminder on the evening of a Month-end Check, pointing the user to the question.

**Renewal Reminder**:
The last Reminder in a Reminder Schedule, a week before it runs out, asking the user to open Sawm so Reminders continue.

**Reminder Schedule**:
The upcoming Reminders for one device, covering the next 60 days and renewed each time the user opens Sawm.

**Calendar Export**:
A file of Planned Fasts with their Suhoor and Iftar times and alerts, which the user adds to their phone's own calendar so alerts fire even without Sawm installed.
