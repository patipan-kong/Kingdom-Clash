# Physical Galaxy S24 listening procedure

## Final PO approval — 2026-11-04

Physical Galaxy S24 listening: **PASS**. PO accepts all audio assets and playback behavior, including Exploration/Battle/Critical BGM, Victory/Defeat, replacement Guardian Impact, Music 30%, SFX 50%, Mute All OFF, volume controls and saved preferences. Existing licensing and Content ID evidence caveats remain applicable. PO authorizes one local commit; no push, merge or deployment. Earlier pending-listening notes below are historical and superseded by this approval.


Prepared 2026-11-04. Technical integration has PO approval for human listening. **No asset or game-runtime changes are part of this procedure.** No listening results are claimed yet. Allow roughly 15-25 minutes plus gameplay time to reach mission results.

## 1. Start a local-only test server on the PC

In PowerShell:

```powershell
Set-Location G:\work\ark\arkhero-audio
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5217 --strictPort
```

This runs the existing Vite development server; no source changes or public deployment. Keep the terminal open. Run ipconfig in another terminal and find the IPv4 address of the active Wi-Fi/Ethernet adapter. Connect the S24 to the same trusted local network. If Windows asks about access, allow the local server only on your trusted private network. Guest-Wi-Fi/client isolation may prevent the phone reaching the PC.

On the S24, open Chrome in landscape and visit:

- Asset-loop listening: http://PC_IP:5217/docs/audio-foundation/PHONE_LISTENING.html
- Actual game: http://PC_IP:5217/?encounter=prototype

Replace PC_IP with the PC's IPv4 address; localhost on the phone points to the phone. Use the same URL/origin for all persistence checks. Record phone model, Android/Chrome versions, output route (speaker/headphones/Bluetooth), system media volume and actual landscape viewport if known. Desktop 780x360 emulation does not count as this physical-device test.

Start with a comfortable low system media volume, use the phone speaker first, and keep that volume fixed when comparing tracks. Repeat any uncertain artifact on headphones if available. An audible judgment should state which output was used.

## 2. Hear one complete natural loop of every BGM

Use the documentation-only listening page first. It reads the existing MP3s with native browser audio controls; it does not run or change the game. It pauses other players when one starts. The three BGM players have native loop enabled; SFX players do not loop.

For each BGM: start at 0:00, keep the screen awake/tab visible, do not scrub, pause, change playback speed or switch players, and listen through the end into the repeated opening. Watch the timeline wrap back to 0 and hear at least ten seconds of the next repetition. A paused/interrupted run is incomplete; restart that track at 0:00 and repeat.

| BGM | File length | Minimum uninterrupted listening time |
| --- | --- | --- |
| Exploration | 45.793 s | 60 s |
| Battle | 57.888 s | 70 s |
| Critical | 30.072 s | 45 s |

Record for each: audible gap/quiet interval, click/pop, perceived volume jump, trailer-style ending, whether the restart feels natural, and accept/review. Known PCM estimates of the near-silent seam are Exploration 4.73 s, Battle 2.90 s and Critical 0.71 s. These measurements are prompts for listening, not a prediction of exactly what every listener hears. None of these BGMs is under 30 seconds; Critical is only just over 30 seconds.

This pass confirms physical-device asset/loop quality through Chrome's native player. It does **not** confirm Phaser looping, state logic, transition fades, game volume controls or SFX mixing. The unchanged Phaser engine already passed automated full natural-loop checks. Listen to an in-game full loop as well whenever the state can be held; record it separately, using the same minimum times. A state change ends that in-game loop trial.

Stop the asset player before entering the game.

## 3. In-game unlock, states and cues

Use the actual Quick Play URL above. Tap the game to provide a user gesture. Set Pause > Audio to Mute All OFF, Music 30%, SFX 50%, then Back > Resume. The game is paused inside Audio Settings, so test audible changes after resuming.

| Check | Action | Listen/observe |
| --- | --- | --- |
| Exploration | Stay away from combat with a healthy Azure Keep. Start a fresh match if needed. | Default BGM starts after interaction; no stacked tracks. An uninterrupted 60 s stay covers its full loop. |
| Battle | Engage enemies with Guardian or fight near Crimson Keep; land/receive at least two positive hits within two seconds. Sustained attacks on a healthy Crimson Keep can help hold the state. | Battle BGM replaces Exploration with the existing transition. Keep significant combat active for a 70 s loop trial if practical. A lull longer than about eight seconds can return Exploration. Do not count an interrupted trial. |
| Critical | Let enemies damage Azure Keep. Two positive hits within three seconds trigger the short threat episode. For a full loop trial, leave the Keep alive at <=30% HP, then clear/hold off attackers. | Critical overrides Battle. The two-hit episode alone holds only ten seconds, too short for a complete Critical loop. The persistent low-HP condition can support a 45 s trial. Stop before the Keep is destroyed; that becomes Defeat. Low-HP state clears only above 40% if health recovers. |
| Guardian SFX | Land a normal melee hit. | Impact matches damage, is audible, and rapid attacks do not produce an uncontrolled pile-up. |
| Keep warning | Allow damage to a living Azure Keep. | Warning is audible and throttled, rather than repeating every hit. |
| Build / Banner | Finish a normal building. On a Chapter 4 mission already accessible to the tester, clear a camp and raise its Banner. | One completion cue; capture is distinguishable and does not also sound like generic construction. |
| Victory | Complete a mission or destroy Crimson Keep in Quick Play. | Gameplay BGM stops. Victory plays once; wait at least 22 s. Note whether the 16.562 s cue fits the result screen and whether it retriggers. |
| Defeat | In a fresh Quick Play match, allow Azure Keep to be destroyed. | Gameplay BGM stops. Defeat plays once; wait at least 25 s. Note whether the 19.872 s cue fits and whether another warning/music overlaps unintentionally. |

No console commands, forced states, debug overrides or runtime edits are required. If a state cannot be held for a full in-game loop during normal play, record that trial as incomplete; the separate asset-loop pass still gives a controlled physical listening result without changing gameplay.

## 4. Music, SFX, mute and persistence

1. During audible gameplay, Pause > Audio: set Music 20%, SFX 80%. Back > Resume. Confirm music is quieter while Guardian impact stays clear.
2. Set Music 0%, SFX 80%; resume and land a melee hit. Confirm SFX works with silent music. Then set Music 50%, SFX 0%; resume and hit again. Confirm music works with silent SFX.
3. Set Music 20%, SFX 80%, Mute All ON. Confirm displayed percentages remain 20/80. Back > Resume and land hits: both channels should be silent. Reopen Audio and confirm percentages are still 20/80.
4. Refresh the same game URL while muted. Tap if needed, then inspect Audio: mute and 20/80 should persist. Turn mute OFF, resume and verify both channels return at their saved levels.
5. Judge mixing at one fixed system volume: Critical may feel louder than Exploration, Banner may be quiet beside Keep warning, and overlapping 1.8 s melee effects may sound busy. Record findings; do not adjust files.

## 5. Pause, background, restart and navigation

- Pause mid-track, wait five seconds, then resume. Confirm music suspends and resumes without a second copy. Repeat once while a SFX is playing; transient effects should be cleared.
- Switch to another app, then return; repeat after locking/unlocking the phone. Confirm background audio stops and gameplay remains paused until Resume. If playback does not return, note whether another tap is needed.
- Restart/replay three times. Confirm one fresh gameplay BGM each time, no old cue trailing into a replay, and preferences retained.
- Return to Main Menu / mission selection: no battle music or terminal cue should linger. The Quick Play query intentionally auto-launches a match on Main Menu creation; before testing a normal menu exit, revisit http://PC_IP:5217/ without the query and enter through the normal menus. Do not interpret the direct-launch fixture's immediate restart as an audio leak.
- Check Pause > Audio controls fit in the physical landscape viewport, are tappable and do not move Guardian or fire attacks.

When finished, stop the PC server with Ctrl+C.

## 6. Content ID evidence to retain

These five AudioAtlant assets are marked Content ID registered in the audited source listings:

| Game file | Original title | Pixabay item ID |
| --- | --- | --- |
| bgm-exploration.mp3 | This World (Epic Emotional Cinematic Trailer Short) | 601530 |
| bgm-battle.mp3 | Battle Time (Epic Countdown Trailer Main) | 473711 |
| bgm-critical.mp3 | Time Pressure (Action Tension Countdown Trailer 30sec) | 609549 |
| sfx-victory.mp3 | Victorious Path (Epic Action Cinematic Trailer 15sec) | 535437 |
| sfx-defeat.mp3 | Rush (Countdown Trailer 20sec) | 464967 |

Keep each original download/license certificate where offered; original title, creator, item URL/ID and original download filename; actual download date if known; a dated copy/screenshot of the item page showing its license and Content ID badge; the applicable Pixabay license/terms; and the retained file's SHA-256 from assets/asset-inventory.json. Preserve any creator/platform clearance correspondence and future claim/dispute receipts. Do not substitute an upload date for an unknown download date.

Certificates/source pages were not downloaded automatically in this task. These records support potential claims; they do not guarantee no Content ID claim. See [Pixabay's official guidance](https://pixabay.com/service/faq/) and [our license audit](AUDIO_LICENSES.md) for source links. No upload, dispute or creator contact is part of this procedure.

## 7. PO feedback template

- Device / Android / Chrome / speaker or headphones / system media volume:
- Exploration: full asset loop heard? Full in-game loop heard? Gap/jump/ending comments:
- Battle: full asset loop heard? Full in-game loop heard? Gap/jump/ending comments:
- Critical: full asset loop heard? Full in-game loop heard? Loudness/gap/ending comments:
- Victory / Defeat: one-shot behavior and length/tone acceptable?
- Guardian / Keep / Build / Banner: clarity, timing, balance, excessive overlap?
- Music and SFX controls / Mute / saved percentages: pass or issue:
- Pause / background / lock screen / replay / navigation / touch layout: pass or issue:
- Asset-specific decisions: accept as-is / request a specified adjustment / not tested:

Stop for PO listening feedback. Do not trim, normalize, crossfade, replace, commit, push, merge or deploy as part of this pass.

## PO feedback and default update — 2026-11-04

PO reports Galaxy S24 PASS for Exploration, Battle and Critical BGM, Victory, volume controls and Mute All. Defeat is not yet tested. Guardian Impact was slightly loud at the previous settings.

First-run defaults are Music 30%, SFX 50%, Mute All OFF. Saved settings are preserved; returning testers must manually select 30%/50% and mute OFF to evaluate these levels. No storage reset is needed. Evaluate Guardian Impact at 50% SFX before considering a separate gain adjustment. Individual cue gain, MP3s, loops and transitions are unchanged. Defeat listening and PO approval remain pending. Historical browser captures retain the defaults used at their original test date.

## Guardian replacement and Defeat confirmation — 2026-11-04

PO confirms Defeat passes physical Galaxy S24 listening. Guardian Impact now uses Sword Slash With Metal Shield Impact by DavidDumaisAudio (1.560 s). Listen again at SFX 50%, Music 30%, mute OFF; saved preferences are preserved, so set these manually if needed. Refresh/reopen the local game to load the replacement. Check individual and repeated melee hits, overlap, tone and loudness. Replacement listening approval is pending; no individual gain or trigger changes were made.
