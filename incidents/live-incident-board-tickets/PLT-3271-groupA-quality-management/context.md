# PLT-3271 — Unable to remove video attachment from QA issue

First folder 2026-10-28. **Status Customer Release Check** (since 10-27 09:13 UTC, Freshdesk 8266 Waiting on customer), fixVersion **26.4.1**. Fetched live, 8 comments.

Yash reported the X on a video attachment errors when editing an existing issue (network error in his screenshot, unopenable). Darminder's fix (`115529`, `e737747d2` #2297): a `deleteFromStorage` helper, storage deletion only for media uploaded in the current form (`status === 'success'`); an issue's existing videos are unlinked on Save like photos, not deleted; label says Video or Image. His developer test covered creating an issue then removing the video, **not editing an existing issue's video, which is the customer's case** (inferred from his comment text). Gennaro verified on Staging 26.4.1 (10-20).

Release check (verified): `e737747d2` is inside `v26.4.1`.
Ball with the customer. Nothing owed by us. Unopenable: two inline screenshots (403). Not verified: removal of an existing video on an existing issue on prod.
