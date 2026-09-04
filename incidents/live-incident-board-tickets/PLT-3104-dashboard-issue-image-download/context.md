# PLT-3104 — Dashboard issue images vanish after pressing Download

**Raised** 2026-09-04 11:00 by Yash Patel (Freshdesk 7853, Waiting on 3rd line)
**Status** Open · Medium · assignee Ilia Kuzmin
**Project** PA18 · QA issue **#0024**
**Session ID** `platform-web-f90ceddc-edf0-41e5-ab66-6225055e2691`

## ⭐ READ THIS FIRST

The customer pressed **Download** on a QA issue's image in the **Dashboard**; afterwards the
images were missing. **Web Viewer unaffected.** A page refresh restored them. Neither the
customer nor Support could reproduce it afterwards.

**Four code-level defects are confirmed by reading the source. One of them fully explains
"Web Viewer fine / Dashboard broken".** The trigger condition (why the URL failed in the first
place) is a well-supported hypothesis, not proven.

## The component

`components/dashboard-panels/quality-panel/components/issue-details-panel/dashboard-image-carousel.tsx`

## Confirmed defects

### 1. `handleDownload` never checks `response.ok` — the headline bug

```ts
const response = await fetch(activeMedia.url)
const blob = await response.blob()          // a 403 body is still a blob
const blobUrl = URL.createObjectURL(blob)
link.download = getMediaFilename()
link.click()                                 // saves Azure's error XML as <name>.jpg
```
(`dashboard-image-carousel.tsx:60-88`)

`fetch` does **not** reject on 4xx/5xx. So when the URL fails, the Azure
`AuthenticationFailed` XML is wrapped in a blob and saved under the image's filename. The
download *looks* successful. The `catch` block never runs, so the fallback never fires either.

**This is exactly why the Web Viewer is fine.** The viewer's carousel delegates to the shared
`useBlobDownload` hook (`hooks/use-blob-download.ts:12-35`), which uses **axios** —
axios rejects on non-2xx, so a 403 is caught, logged, and no file is written. The Dashboard
hand-rolled the same logic with `fetch` and lost that property.

### 2. Duplicated logic instead of reusing the shared hook

`useBlobDownload` exists for precisely this job. It also carries the cross-origin
`download`-attribute workaround (documented there, tracked as **PAPI-3385**: storage does not
serve `Content-Disposition`) and an `isDownloading` re-entrancy guard. The Dashboard
reimplementation has neither.

### 3. `activeMediaError` is sticky — this is why only a refresh cures it

`setActiveMediaError(true)` on `onError` (lines 178, 195). It is reset only by the effect on
`[activeMedia.kind, activeMedia.url, activeMediaIndex, ...]` (lines 43-49). There is no retry
and no re-signing of the URL. Once a load fails, the stage renders `MediaErrorMain` until the
user changes image or reloads the page — matching the reporter's "corrected once a page refresh".

### 4. Thumbnails have no error handling at all

`renderThumbnail` (lines 250-262) renders a bare `<Box component='img'>` with no `onError`.
A failed URL shows the browser's broken-image glyph. The viewer's equivalent uses
`MediaErrorThumbnail` (`issue-carousel-v2.tsx:683`). This is why the report says
"**the images**" plural, not just the main one.

## Why the URL failed — hypothesis, NOT proven

Attachment URLs are **time-limited Azure SAS URLs** minted server-side:
`issues.service.ts:402-403` → `resolveDownloadUrl` → `generateTokenisedBlobDownloadUrl`.

SAS lifetime arithmetic from `src/util/blob-download-url.cache.ts`:

| constant | value |
|---|---|
| `REDIS_BLOB_SAS_ENTRY_PX_MS` (Redis entry) | 24 h |
| `AZURE_BLOB_SAS_TTL_BUFFER_OVER_REDIS_MS` | 15 min |
| Azure SAS minted for | 24 h 15 min |
| `REDIS_MIN_SAS_REMAINING_MS_FOR_CACHE_HIT` | 1 h |

A cached SAS is served while remaining cache validity exceeds 1 h, i.e. up to 23 h after mint.
So a URL reaching the browser has **between ~1 h 15 min and ~24 h 15 min** of validity left.
The floor is by design and is sane — but the Dashboard holds those URLs in component state for
the life of the tab, with no re-sign path.

Chain that fits every detail of the report:

1. Tab open long enough that the SAS on those URLs expires.
2. Already-rendered images keep displaying from the browser cache — nothing looks wrong.
3. Download pressed → first real network request to that URL in a while → **403**.
4. No `ok` check (defect 1) → a corrupt file is saved and no error is surfaced.
5. The images re-request and fail → `onError` → sticky error (defect 3) + broken thumbs
   (defect 4) → "images are missing".
6. Refresh → API returns a freshly minted (or fresher cached) SAS → images return.

This also explains the **non-reproducibility**: it needs an aged tab. Support testing on a
fresh page load would never see it, which is what happened.

**Not verified:** that the customer's SAS had actually expired, and the precise browser-cache
interaction in step 5. Settling it needs the network log for session
`platform-web-f90ceddc-edf0-41e5-ab66-6225055e2691` — specifically whether any storage request
returned 403.

## Recommended fix

1. **Replace the hand-rolled `handleDownload` with `useBlobDownload`.** Smallest change, kills
   the silent-corrupt-download and restores the re-entrancy guard. Fixes the Dashboard/Viewer
   asymmetry at its root.
2. **Check `response.ok`** wherever `fetch` is used for a download, if the hand-rolled path is
   kept for any reason.
3. **Give thumbnails `MediaErrorThumbnail`**, as the viewer already does.
4. **On image error, refetch the issue to obtain a freshly signed URL** instead of latching an
   error for the life of the component. This is the cure for the whole class, not just this
   ticket — any expired SAS currently becomes a permanent broken image until reload.
5. Longer term: serve `Content-Disposition` from storage (**PAPI-3385**) and delete the blob
   dance in both places.

## Also noticed, separate and minor

`services/issue/issue-service.ts:1484` — `downloadIssues` (the CSV export) calls
`window.URL.revokeObjectURL(link.href)` synchronously after `link.click()`. That is a known
race: some browsers abort the download because the URL is revoked before the save begins.
`useBlobDownload` has the same shape but revokes in `finally` after an await, so it is less
exposed. Worth a defensive `setTimeout` or a `revoke` on the next tick. Not this ticket.

## Nothing was reproduced live

This analysis is source-reading only. No prod writes, no state changes. The 403 hypothesis is
checkable from logs by anyone with access to the session id above.
