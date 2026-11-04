# Audio assets

All nine requested PO-supplied MP3s are present and load through the existing Audio Foundation. All nine item/listing records advertise the Pixabay Content License (Guardian replacement verified against its official item page), and five tracks are Content ID registered; see [AUDIO_LICENSES.md](../../../docs/audio-foundation/AUDIO_LICENSES.md). Local technical verification does not constitute audio release approval.

| Filename | Purpose | Measured duration | Loop |
| --- | --- | --- | --- |
| bgm-exploration.mp3 | Default gameplay | 45.793 s | Yes |
| bgm-battle.mp3 | Nearby combat | 57.888 s | Yes |
| bgm-critical.mp3 | Azure Keep danger | 30.072 s | Yes |
| sfx-guardian-impact.mp3 | Guardian basic melee damage | 1.560 s | No |
| sfx-keep-warning.mp3 | Azure Keep damage warning | 3.892 s | No |
| sfx-build-complete.mp3 | Allied construction completed | 1.536 s | No |
| sfx-banner-captured.mp3 | Azure Banner captured | 2.456 s | No |
| sfx-victory.mp3 | Terminal victory cue | 16.562 s | No |
| sfx-defeat.mp3 | Terminal defeat cue | 19.872 s | No |

Durations are measured from actual Phaser-decoded audio buffers in Chrome. Source files are MPEG-1 Layer III, stereo, 256 kbps; source rates are 44.1 or 48 kHz. The extra `sfx-victory--.mp3` was removed with PO authorization.

The registry discovers available files at server startup/build; rebuild after adding or replacing files. Missing keys remain intentionally silent. No audio bytes were edited during integration. Loop silence, relative levels and cue lengths require PO listening review; see [integration report](../../../docs/audio-foundation/ASSET_INTEGRATION_REPORT.md). PO reports Galaxy S24 PASS for all BGM, Victory, Defeat, volumes and mute. PO also confirms replacement Guardian listening PASS and accepts all assets and playback behavior (2026-11-04); licensing caveats remain documented.
