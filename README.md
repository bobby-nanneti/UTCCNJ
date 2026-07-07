# UTCCNJ VBS Games 🎉

A collection of party games for VBS that you run from your laptop — kids join
with their phone's web browser, no app to install. You mirror one screen to
the TV, control the games from a second screen (your phone or a browser tab
on your laptop), and switch between games any time from the same host panel.

Currently included:
- **🧠 Bible Trivia** — a buzzer game with a 30-second countdown per question
  and team scores.
- **🎨 Pictionary** — one kid draws a secret Bible word on their phone, everyone
  else watches it appear live on the TV and shouts out guesses for fun. No
  teams, no scoring — just a fun shout-along round.
- **📖 Diminishing Words** — a Bible verse memorization game (also known as
  "erase-the-words" or fading). Paste in a verse, the kids read it aloud,
  then you erase one word at a time and they recite the whole verse from
  memory each time, including the erased words, until they've got it down.

---

## What you need

- Your laptop (Mac or Windows)
- **Node.js** installed (free, one-time install) — get it at https://nodejs.org
  (choose the "LTS" version, click through the installer with default options)
- Everyone (you + kids) connected to the **same WiFi network**
- The church TV, connected to your laptop (HDMI cable or screen mirroring)

You do NOT need internet access once Node.js is installed — this runs entirely
on your local WiFi network.

---

## One-time setup

1. Download/unzip this folder somewhere on your laptop, e.g. Desktop.
2. Open a Terminal (Mac) or Command Prompt/PowerShell (Windows).
3. Navigate into the folder. Example:
   ```
   cd Desktop/vbs-trivia
   ```
4. Start the server:
   ```
   node server.js
   ```
5. You'll see something like this in the terminal — **keep this window open**,
   closing it stops the game:
   ```
   === UTCCNJ VBS Games Server Running ===
   TV Display   : http://192.168.1.42:3000/tv
   Host Control : http://192.168.1.42:3000/host
                  If you're running the host panel from THIS laptop (not a phone),
                  use http://localhost:3000/host instead - Pictionary's "Copy Picture"
                  button needs that to work (browsers block clipboard image copying
                  over a plain network address like the one above, even on this laptop).
   Kids Join On : http://192.168.1.42:3000/play
   ===================================
   ```
   (Your numbers will be different — that's your laptop's local IP address.)

---

## Every time you run VBS

1. Start the server (`node server.js` in the terminal, as above).
2. On your **laptop browser**, go to the `/tv` address shown in the terminal.
   Mirror/HDMI this browser window to the church TV (full screen it with F11
   on Windows or the green button on Mac). The first time it loads, **tap the
   screen once** to enable the countdown sound effects (browsers block audio
   until you interact with the page).
3. On your **phone or a second browser tab**, go to the `/host` address.
   This is your private remote control — do NOT show this one on the TV.
   If you're running the host panel in a browser tab on the same laptop
   (not a phone), use `http://localhost:3000/host` instead of the network
   address — this is required for Pictionary's **📋 Copy Picture** button to
   work (see below).
4. At the top of the host panel, tap **🧠 Bible Trivia**, **🎨 Pictionary**, or
   **📖 Diminishing Words** to choose which game is live. The TV and every
   kid's `/play` page follow along automatically — you can switch games at
   any point (e.g. do a Trivia round, then switch to Pictionary, then back)
   without restarting the server. Trivia and Pictionary each keep their own
   scoreboard/player list independent of the others, so switching does not
   erase any game's progress.
5. Write the `/play` address on a whiteboard or slide, e.g.:
   `Join the game: 192.168.1.42:3000/play`
   Kids type that into their phone's browser (Safari/Chrome — no app), or
   scan the QR code shown on the TV. **Kids can only join once a game is
   chosen** — if the TV says "Waiting for the host to choose a game," have
   them wait until you've picked one. (Diminishing Words has no join step at
   all — kids just watch the `/play` page or the TV, nothing to tap.)
6. In Trivia, kids also pick a team (Red/Blue/Green/Yellow) when joining. In
   Pictionary, joining only needs a name — there are no teams and no
   scoring, it's just for fun. Once everyone's joined, tap the matching
   **▶ Start** button on your host panel.

### Running Bible Trivia
- Read the question out loud (or let them read it off the TV).
- A **30-second countdown** appears in the top-right of the TV, with ticking
  sound effects that speed up and rise in pitch as time runs low (turns red
  and pulses in the final 5 seconds, with an alarm at zero). Once it hits
  zero, kids can no longer buzz in for that question.
- Kids tap the big red **BUZZ** button on their phone.
- The TV shows who buzzed first, in order.
- You (the host) decide out loud if the answer given was correct, then tap
  **+10 / +5 / -5** on the matching team on your host panel.
- Tap **👁 Reveal Answer** to show the correct answer on the TV.
- Tap **⏭ Next Question** to move on.
- If nobody got it right, tap **🔄 Reset Buzzers** to let the same question
  be tried again.

### Running Pictionary
- Tap a player's name in the **Drawer** list (or tap **🎲 Random Drawer** —
  it automatically avoids picking the same kid twice until everyone's had a
  turn).
- Optionally type your own word/phrase into the **Custom word** box (e.g. if
  you want something tied to today's Bible lesson specifically). Leave it
  blank and tap **▶ Start Round** to have the system pick a random one from
  `pictionary-words.json` instead — either way, the box clears itself after
  each round so you don't accidentally reuse an old word.
- Once started, the drawer's phone privately shows them the secret word;
  everyone else's phone and the TV show the category (but not the word,
  and a custom word just shows as category "Custom") plus a live-updating
  drawing canvas. There's no timer — the drawer can take as long as they
  like, and the round only ends when you tap Reveal Word or Next Round.
- The drawer draws on their phone with a finger; it appears on the TV and
  host panel within a second or so. They can tap **🧹 Clear My Drawing** to
  start over mid-round.
- There's no scoring — kids just shout their guesses out loud for fun. The
  host panel privately shows you the word the whole time, so you know when
  someone's gotten it right (or can give hints) without spoiling it for
  everyone else.
- Tap **👁 Reveal Word** to show it on the TV, then **⏭ Next Round** to reset
  the canvas and pick the next drawer.
- If the drawer's picture stops updating mid-round, the host panel shows a
  warning under the word ("no new strokes for Ns") — tap **🔁 Reassign** to
  hand the round to someone else.
- Like the finished drawing? Tap **📋 Copy Picture** (right below the canvas
  preview on the host panel) to copy it to your clipboard, then paste it
  into a document, email, or slideshow with Ctrl+V. **This only works if
  the host panel is open at `http://localhost:3000/host`** (see step 3
  above) — browsers block clipboard image copying over a plain network
  address like `http://10.0.0.3:3000/host`, even from the same laptop. If
  you see an error message when tapping it, it'll tell you exactly what
  went wrong (e.g. it'll remind you to switch to the `localhost` address).

### Running Diminishing Words
- Paste a Bible verse into the text box on the host panel and tap
  **📖 Set Verse**. It appears word-for-word on the TV and on every kid's
  `/play` page (nobody needs to join anything for this game).
- Have the kids read the whole verse aloud together once.
- On the host panel, tap a word to select it (it gets a gold outline), then
  tap **🫥 Erase Selected Word**. That word disappears into a blank line
  everywhere except the host panel (which always shows you the real word,
  so you can still read along/prompt).
- Have the kids read the verse aloud again, including the erased word from
  memory. Repeat — select and erase another word, read aloud again — as
  many times as you like, fading out more of the verse each round.
- Tap an **already-erased** word on the host panel to instantly bring it
  back (no confirmation needed) if the kids need a reminder.
- **🔄 Restore All Words** brings back the entire verse (handy if you want
  to start the fading process over from the beginning with the same
  verse). **⚠ Clear Verse** wipes it completely so you can paste a new one.

---

## Customizing the questions / words

**Trivia**: open `questions.json` in any text editor (Notepad, TextEdit, VS
Code). Each question looks like this:

```json
{ "category": "Bible Basics", "difficulty": "easy", "question": "Who built a big boat?", "answer": "Noah" }
```

**Pictionary**: open `pictionary-words.json` the same way. Each word looks
like this:

```json
{ "word": "Noah's Ark", "category": "Bible Stories", "difficulty": "easy" }
```

For either file: add, remove, or edit as many entries as you like — just
keep the same format and make sure each entry ends with a comma except the
very last one. Save the file, then restart the server (Ctrl+C in the
terminal, then `node server.js` again) for changes to take effect.

Tip: Put your easiest questions/words first for younger kids at the start,
and save trickier ones for later rounds.

---

## Troubleshooting

- **Kids can't connect / page won't load on phone**: Make sure their phone
  WiFi is on the same network as your laptop, not on cellular data. If church
  WiFi is unreliable, turn on a personal hotspot on your phone and connect
  your laptop + kids' phones to that instead.
- **IP address changed** (e.g. you're at a different building/WiFi than last
  time): No action needed - the QR code on the TV lobby screen is generated
  fresh every time it's loaded from whatever network address the laptop
  currently has, so it's always correct. Just double check the `/play`
  address printed in the terminal if you're writing it out by hand somewhere.
- **Phone remembers the last kid's name (and team, for Trivia)**: The
  `/play` page remembers who joined so a refresh doesn't force re-typing.
  If a different kid picks up the same phone, tap **"Not you? Switch
  player"** to clear it and enter a new name. Trivia and Pictionary
  remember separately, so a kid who already joined Trivia will still need
  to join Pictionary (name only) the first time you switch to it.
- **Pictionary has no scoreboard at all**: this is intentional — it's a
  just-for-fun shout-along round with no teams and no points. Trivia's
  scoreboard is completely separate and unaffected by anything in
  Pictionary. Pictionary also has its own independent player list, so
  switching games doesn't require everyone to rejoin the other one.
- **Switching away from Trivia mid-question pauses its timer, it doesn't
  cancel it**: the host panel shows a "⏸ Timer paused (Ns left)" banner
  with a **▶ Resume** button for whenever you switch back to Trivia — the
  countdown does not keep running (or silently expire) while you're on
  Pictionary. This doesn't apply to Pictionary itself, which has no timer.
- **Pictionary drawing looks a little "bursty," not perfectly smooth**:
  that's normal — the drawing updates roughly every second, which is
  fine for a party game and keeps the app working over shaky church WiFi
  with lots of phones connected.
- **Want a fresh game (new day of VBS)**: Tap **⚠ Reset Whole Game** (Trivia)
  to clear its players and scores, **⚠ Reset Pictionary** to clear its
  player list and current round, or **⚠ Clear Verse** (Diminishing Words) to
  wipe the current verse. These reset independently.
- **Diminishing Words has no join step and no scoring**: this is
  intentional — kids don't do anything on their phones for this game except
  watch, so there's nothing to join and no per-kid roster at all.
- **Too many kids on weak WiFi**: Consider running two smaller sessions
  (younger group, older group) instead of one big one — makes buzzing fairer
  for younger kids anyway, since older kids react faster.

---

## Ideas for other rounds

- Split into a "younger kids" round (ages 5-8, easier questions, maybe skip
  buzzing and just go around) and an "older kids" round (9-13, full buzzer
  speed).
- Alternate Trivia, Pictionary, and Diminishing Words rounds to keep energy
  up during a long session — Diminishing Words works well as a calmer,
  more focused round between the higher-energy buzzer/drawing games.
- Trivia's team names/colors are fixed (Red/Blue/Green/Yellow) — assign kids
  to teams as they walk in with colored stickers or lanyards matching team
  colors. Pictionary has no teams or scoring, so no assignment needed for
  that one — it's meant as a lighter, no-pressure round between Trivia
  rounds.

Have a great VBS! 🙌
