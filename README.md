# Take Over

http://127.0.0.1:5500/

A playable, browser-based cybersecurity awareness mini game for our hackathon, built with plain HTML, CSS and JavaScript. No packages, server, or database required.

## Play

Open `index.html` in a browser and press **Start shift**. You have 7 real minutes (1:00 PM to 5:00 PM in game) to complete five tasks. Use the apps in the laptop dock to switch between Tasks, Email, Company Info, Network, Security, Files, Backup, and Reports.

Random security distractions interrupt your shift. The first event arrives after 25–45 seconds. After an incident and any resulting popups or lock are cleared, there is another random 25–45 second break. Only one incident can be active at a time.

Security events:
- **DDoS:** Open Network and flush 5–8 traffic alerts. Begin responding within 10 seconds. If you ignore the event or fail to finish, controls lock for 6 seconds.
- **Emails:** Open Email within 10 seconds and Approve or Deny within the following 20 seconds. Verify sender domains under Company Info; even legitimate emails can have typos. Wrong or missed decisions cover the screen with seven popups you must close.
- **Login attempts:** Open Security within 10 seconds and approve or block within 15 seconds. Compare the employee, device and location with Company Info. Wrong or missed decisions lock controls for 6 seconds.

All security events are **simulations** and do not perform real network, email, account, or backup operations. The takeover meter starts at zero and tracks a signed security score from -100 to +100. Positive scores are green, negative scores are red, and zero is neutral. Correct tasks give +10; wrong task submissions give -5. Each submitted file gives +3 when correct (once per file) or -5 when incorrect. Each traffic flush gives +2, successful incident resolution gives +6, and closing each error popup gives +1. Wrong or missed emails cost 18 points; wrong or missed logins or DDoS events cost 12 points. Navigation and changing a selection do not score points; submitting a decision does. The win condition is completing all five ordinary tasks before the shift deadline.

## Project files

- `index.html` — laptop template and all eight app screens
- `style.css` — laptop shell, responsive HUD, app screens, and alerts
- `script.js` — seven-minute timer, tasks, random security events, penalties, and game results

For development/testing, opening `index.html?test=1` exposes `window.takeoverTest.trigger('ddos'|'email'|'login')` after pressing Start, so the incident UI can be previewed without waiting for a random event. These hooks aren't enabled in normal gameplay.


The screen has a subtle, transparent scanline overlay that does not block clicks. To adjust the event pacing, change `eventMinWait` and `eventMaxWait` (seconds) in `script.js`.

**Play again** starts a fresh shift immediately: tasks, selections, takeover, incidents, penalties, and the seven-minute timer are reset.
