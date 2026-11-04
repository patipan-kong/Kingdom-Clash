# Audio asset licenses

Checked 2026-11-04. **All nine item/listing records advertise the Pixabay Content License; Guardian impact now uses the PO-supplied DavidDumaisAudio replacement, verified against its official item page. Five assets are Content ID registered.**

Original source information was recovered from Windows Zone.Identifier download metadata, including the original Pixabay filenames and IDs. The nine MP3s lack ID3v1/v2 tags, but their origin metadata allowed matching official listings. No new audio was downloaded. The exact original download URLs, filenames and verification status are preserved in [asset-provenance.json](assets/asset-provenance.json); hashes identify the supplied bytes in [asset-inventory.json](assets/asset-inventory.json).

PCL below means [Pixabay Content License](https://pixabay.com/service/license-summary/). The [binding terms](https://pixabay.com/service/terms/) permit commercial/noncommercial use within their conditions and do not require attribution; standalone redistribution is restricted. This document records source evidence, not a blanket clearance of any third-party rights. Credits remain useful even when optional.

| Filename | Original title | Creator / credited uploader | Source URL | License | Attribution required? | Content ID findings |
| --- | --- | --- | --- | --- | --- | --- |
| bgm-exploration.mp3 | This World (Epic Emotional Cinematic Trailer Short) | AudioAtlant | [Pixabay item](https://pixabay.com/sound-effects/musical-this-world-epic-emotional-cinematic-trailer-short-601530/) | PCL confirmed | No under PCL | Registered |
| bgm-battle.mp3 | Battle Time (Epic Countdown Trailer Main) | AudioAtlant | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-battle-time-epic-countdown-trailer-main-473711/) | PCL confirmed | No under PCL | Registered |
| bgm-critical.mp3 | Time Pressure (Action Tension Countdown Trailer 30sec) | AudioAtlant | [Pixabay item](https://pixabay.com/sound-effects/musical-time-pressure-action-tension-countdown-trailer-30sec-609549/) | PCL confirmed | No under PCL | Registered |
| sfx-guardian-impact.mp3 | Sword Slash With Metal Shield Impact | DavidDumaisAudio | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-sword-slash-with-metal-shield-impact-185433/) | PCL confirmed | No under PCL | No registration badge observed; not a claim-free guarantee |
| sfx-keep-warning.mp3 | Warning Alarm Loop #1 | Audley_Fergine | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-warning-alarm-loop-1-279206/) | PCL confirmed | No under PCL | No registration badge observed; not a clearance guarantee |
| sfx-build-complete.mp3 | Quest Complete (1) | Yodguard | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-quest-complete-1-540192/) | PCL confirmed | No under PCL | No registration badge observed; not a clearance guarantee |
| sfx-banner-captured.mp3 | SFX - Acceptation | ALEXIS_GAMING_CAM | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-sfx-acceptation-363730/) | PCL confirmed | No under PCL | No registration badge observed; not a clearance guarantee |
| sfx-victory.mp3 | Victorious Path (Epic Action Cinematic Trailer 15sec) | AudioAtlant | [Pixabay item](https://pixabay.com/sound-effects/musical-victorious-path-epic-action-cinematic-trailer-15sec-535437/) | PCL confirmed | No under PCL | Registered |
| sfx-defeat.mp3 | Rush (Countdown Trailer 20sec) | AudioAtlant | [Pixabay item](https://pixabay.com/sound-effects/film-special-effects-rush-countdown-trailer-20sec-464967/) | PCL confirmed | No under PCL | Registered |

## Verification limits and PO actions

- Guardian replacement, 2026-11-04: PO supplied the new bytes directly at the existing filename. Zone.Identifier identifies original filename daviddumaisaudio-sword-slash-with-metal-shield-impact-185433.mp3. The official item page confirms title, DavidDumaisAudio and PCL. No registration badge was observed. The former RPG Sword Attack Combo 31 record is superseded and retained only in provenance history. Current SHA-256: `2a738b9421347bc60f18e20c0e4c4f12ee764414a9fad8f58724705b43a3d5df`.
- Critical's exact [German-language listing](https://pixabay.com/de/sound-effects/musical-time-pressure-action-tension-countdown-trailer-30sec-609549/) supplied title, creator, PCL and registered status through web search. The English page did not open. The original download ID is the same.
- Build complete is labeled AI generated on its inspected item page. That label is recorded without inferring additional ownership rights or restrictions.
- For the five registered AudioAtlant assets (three BGMs, Victory, Defeat), retain the download/license certificates and source links. None were supplied in the worktree. [Pixabay's Content ID guidance](https://pixabay.com/service/faq/) explains that registered tracks can produce platform claims despite licensed use and that download certificates may support disputes. This audit does not perform a YouTube upload or clear an account/channel.
- For the other inspected effects, absence of a registration badge does not prove no present/future claims. No claim-free guarantee is made.
- The unused sfx-victory--.mp3 was deleted at PO's explicit instruction. sfx-victory.mp3 is the sole integrated victory asset. No MP3 bytes were remixed, trimmed, extended or otherwise edited.
