# Caption Desk

A browser-based subtitle editor for SRT and basic WebVTT. Open [the live app](https://caption-desk-daniel.danpraneet.chatgpt.site) or open `index.html` locally. No install or account is needed.

Import a caption file, attach a local video for playback, edit text and timing, review overlaps and readability prompts, and export full subtitles or a re-timed SRT for a selected clip. The included example is fictional. Video stays in the browser; save a JSON backup to preserve work.

## Batch clip delivery

Set the source start and end, name the clip, and add it to the batch. Queue up to 50 clips from the same source, then download a ZIP containing an SRT and VTT for every clip, plus `clip-review.csv` with exact source ranges, boundary trims and readability flags. Each subtitle file is rebased to its own clip start. Source captions are unchanged. The batch is included in project backups; old backups remain supported.

A caption crossing a clip boundary retains its words but gets shorter timing. Review those captions against the recording for cut-off speech. This tool exports subtitles; it does not cut or render video.

[Read the guide](Caption_Desk_Guide.html). Automated flags do not verify whether the transcription matches the recording; listen and check names, negations, quotations and context.

## Source and verification

Editable source is in `dist/`. Node.js is needed only for development:

```sh
npm test
npm run build
```

The build writes the self-contained `index.html` and styled guide. There are no package dependencies. Core coverage includes 24 subtitle checks and five batch checks; a generated ZIP was additionally extracted with Python's independent ZIP reader to verify CRCs, Unicode filenames and rebased timestamps. Browser interaction, physical projector and real-media playback checks were not performed for this update.
