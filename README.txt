BADMINTON MIXER — INSTALLABLE PHONE APP (PWA)

Included:
- Add player names (one per line; commas also work)
- Choose the number of courts
- Generate 2v2 doubles matches
- Tracks partnerships across the session and avoids repeating them where possible
- Checkbox to allow repeated partnerships
- Shows players sitting out
- Saves sessions and round history in this browser on this device
- Offline support after the app has been loaded once

IMPORTANT:
For Android to offer "Install app" / "Add to Home screen", a PWA must be served from HTTPS (or localhost). Opening index.html directly from the ZIP will let you test the interface in some browsers, but will not provide full PWA installation/offline behaviour.

EASIEST FREE WAY TO PUT IT ON YOUR PHONE:
1. On a computer, unzip this folder.
2. Create a GitHub account if needed and create a new repository, e.g. badminton-mixer.
3. Upload all files and the icons folder from this package into the repository root.
4. In the repository, open Settings > Pages.
5. Set deployment source to "Deploy from a branch", choose branch "main" and folder "/ (root)", then Save.
6. Wait for GitHub Pages to publish the site. It will provide an HTTPS URL.
7. On your Samsung phone, open that HTTPS URL in Chrome.
8. Tap Chrome's three-dot menu and choose "Install app" or "Add to Home screen".
9. Launch Badminton Mixer from your home screen.

DATA / PRIVACY:
- Session data is stored in localStorage in the browser on this device.
- There is no account and the app does not send player names to a server.
- Browser storage can be cleared by Android/Chrome cleanup or if you clear site data. This first version has no export/backup feature, so keep that in mind.
- Sessions saved in one browser/device are not automatically available in another browser/device.

PAIRING LOGIC:
- The app searches for a set of unique two-player partnerships for the round.
- If it cannot find a full set after randomized search attempts, it asks you to enable repeats.
- When repeats are allowed, prior pairings may appear again.
- It tries to fill as many courts as the number of players allows. Odd numbers of available players mean one person may sit out.
