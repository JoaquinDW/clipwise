# Whisper Word Timestamps Fix - 2026-01-01

## Problem Identified

The Whisper API was returning 0 words despite requesting word-level timestamps.

**Error:**
```
✅ Transcription complete: 58 segments, 0 words
⚠️ AI HALLUCINATION DETECTED!
Original words: []
```

## Root Cause

The OpenAI Whisper API expects array parameters in multipart/form-data to be sent as **multiple form fields with `[]` notation**, not as a JSON string.

**Incorrect (before):**
```typescript
formData.append('timestamp_granularities', JSON.stringify(['segment', 'word']));
```

**Correct (after):**
```typescript
formData.append('timestamp_granularities[]', 'segment');
formData.append('timestamp_granularities[]', 'word');
```

## Fix Applied

### File: [lib/ai/transcribe.ts](lib/ai/transcribe.ts)

**Lines 59-61:**
```typescript
// OpenAI API expects array fields to be sent as separate form fields
formData.append('timestamp_granularities[]', 'segment');
formData.append('timestamp_granularities[]', 'word');
```

**Lines 86-96:** Added comprehensive debugging logs
```typescript
// Debug logging for word-level timestamps
console.log('📊 Whisper API Response Summary:');
console.log(`  - Language detected: ${data.language}`);
console.log(`  - Duration: ${data.duration}s`);
console.log(`  - Segments: ${data.segments?.length || 0}`);
console.log(`  - Words in response: ${data.words?.length || 0}`);

if (!data.words || data.words.length === 0) {
  console.warn('⚠️ WARNING: Whisper API did not return word-level timestamps!');
  console.warn('   This may cause caption generation to fail.');
  console.warn('   Response keys:', Object.keys(data));
}
```

## IMPORTANT: Existing Videos

**This fix only applies to newly processed videos.**

### For Existing Videos (already in database):

The `words` field in the database is `null` or `[]` for videos processed before this fix. You have two options:

#### Option 1: Delete and Re-Upload (Recommended)
1. Delete the existing video from the dashboard
2. Upload the video again
3. Process it from scratch
4. The new transcription will include word-level timestamps

#### Option 2: Re-Transcribe via Retry Endpoint
1. Use the retry endpoint: `POST /api/videos/[id]/retry`
2. This will delete the old transcription and re-run Whisper
3. The new transcription will include word-level timestamps

**DO NOT use the regenerate endpoint** - it reuses the existing transcription which doesn't have word timestamps.

## Verification

After processing a new video, you should see in the console:

```
📊 Whisper API Response Summary:
  - Language detected: es
  - Duration: 67.2s
  - Segments: 58
  - Words in response: 323  ← Should be > 0 now!
✅ Processed 323 words with timestamps
✅ Transcription complete: 58 segments, 323 words
```

## Expected Console Output After Fix

### During Transcription:
```
🎤 Step 1: Transcribing with Whisper...
📊 Whisper API Response Summary:
  - Language detected: es
  - Duration: 67.2s
  - Segments: 58
  - Words in response: 323
✅ Processed 323 words with timestamps
✅ Transcription complete: 58 segments, 323 words
```

### During Caption Generation:
```
💬 Generating captions with word-level timing...
✅ Caption validation passed - all words from original transcription
```

**No more hallucination errors!**

## Testing Checklist

- [ ] Upload a new video (or use retry endpoint on existing video)
- [ ] Check console logs show "Words in response: > 0"
- [ ] Verify transcription saved to database includes `words` field
- [ ] Generate clips and verify captions match audio exactly
- [ ] Confirm no hallucination errors

## Technical Details

### FormData Array Encoding

Many REST APIs expect array parameters to be encoded as:
```
field[]=value1
field[]=value2
```

Not as:
```
field=["value1","value2"]  ❌
```

This is standard multipart/form-data behavior, and OpenAI Whisper API follows this convention.

### Why Regenerate Didn't Work

The `/api/videos/[id]/regenerate` endpoint:
1. Loads existing transcription from database
2. Filters words for each clip
3. Generates captions

If the transcription was created before the fix, `transcription.words` is empty, so caption generation fails.

The `/api/videos/[id]/retry` endpoint:
1. **Deletes** old transcription
2. **Re-runs** Whisper API
3. Saves new transcription with word timestamps
4. Continues with clip generation

## Database Schema

The `Transcription` model already supports the `words` field:

```prisma
model Transcription {
  id          String   @id @default(cuid())
  videoId     String   @unique
  text        String   @db.Text
  language    String?
  segments    Json     // Array of {start, end, text}
  words       Json?    // Array of {word, start, end} ← This field
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt @default(now())
}
```

---

**Fix Status:** ✅ Complete
**Breaking Changes:** No - backward compatible
**Requires Action:** Yes - existing videos need re-processing
**Date:** 2026-01-01
