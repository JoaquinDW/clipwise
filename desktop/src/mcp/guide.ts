/**
 * What the user's agent needs to know to pick clips well.
 *
 * This is the judgment the cloud pipeline paid GPT for (see the system prompt in
 * lib/ai/highlights.ts), rewritten for an agent that calls tools instead of
 * filling one JSON blob. The agent's own model does the work; we only describe
 * what a good clip is and what the renderer can do.
 */

export const CLIPPING_GUIDE = `# Momentreel clipping guide

You are choosing moments from a long video to publish as vertical 9:16 shorts
(TikTok, Reels, YouTube Shorts). Momentreel runs on the user's computer: it
downloads, transcribes and renders. You decide what to cut.

## Workflow
1. import_video with a YouTube link or an absolute file path. It returns a video_id.
2. get_video with wait_seconds until status is "ready". Long videos take a while
   (download + local transcription); keep calling it, it is cheap.
3. Read the transcript. For videos over 5 minutes call get_candidates first: it
   returns the strongest windows by heuristic score with context, so you rarely
   need the whole transcript. Use get_transcript (paged with next_from) for the
   rest or to check boundaries.
4. create_clips with your picks. Rendering runs in the background.
5. list_clips until every clip is "ready", then give the user the file paths.
   Use update_clip to fix a boundary, the caption style or the framing.

## What makes a clip
- Strong hook in the first 3 seconds: a claim, a question, a surprise.
- Self-contained: makes sense with no context from the rest of the video.
- One idea, complete: a story with its payoff, an argument with its conclusion.
- Emotion or value: funny, surprising, inspiring, useful, controversial.
- Quotable: a line someone would repeat.
- Length 15-60 s, sweet spot 20-40 s. Never under 5 s or over 180 s.

## Boundaries
- Start at the first word of a sentence and end after the last word of one.
  The transcript lines are [start-end] in seconds from the start of the video;
  use those numbers. Never cut mid-sentence.
- Prefer starting a little late (skip the warm-up) over ending early (cutting
  the payoff).

## Scoring (score 0-100)
Hook 0-30, emotional impact 0-25, self-containment 0-20, value 0-15,
quotability 0-10. Order your picks by score.

## Framing (cropStrategy.method)
- track_speaker: one person talking (podcasts, talking heads). The default.
- track_action: one person moving or demonstrating.
- blur_sides: two or more people in frame, or full-width visuals (slides,
  diagrams): keeps the whole width over a blurred background.
- wide_shot: static center crop for screen recordings and landscapes.
subjectPosition (left/center/right) only matters for wide_shot.

Optional layoutType for composed layouts, each with layoutRegions as fractions
0-1 of the source frame: interview_split (two people side by side stacked
50/50), gameplay_cam (face cam on top 30%, gameplay below), tutorial_pip
(screen with a small face overlay). Use "standard" when unsure.

## Language
Write titles, hooks, descriptions and tags in the language of the video.

## Captions
Captions are burned in from the word timings automatically. Styles: classic,
bold, minimal, viral, podcast. Leave captionStyle out to use the user's
default unless they asked for one.
`;
