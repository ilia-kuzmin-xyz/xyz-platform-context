# Canvas updates — how to try them on dev

Everything runs on the **dev environment**: `https://frontend.holosite.dev`.

**Start here:** https://frontend.holosite.dev/projects/68b19ae480f11301198805f0/canvas/library

The **Library** is the home base — the grid of all dashboards. From there you create new ones and open existing ones.

## The pages (endpoints)

Using the test project `68b19ae480f11301198805f0`:

| Page | URL | What it is |
|------|-----|-----------|
| **Canvas (edit)** | `…/projects/68b19ae480f11301198805f0/canvas` | Start a brand-new dashboard. Chat on the right, dashboard on the left. |
| **A specific session** | `…/projects/68b19ae480f11301198805f0/canvas/:session_id` | An existing dashboard you're editing. You normally reach it by clicking a Draft tile — the `:session_id` fills in automatically. |
| **Library (the tiles page)** | `…/projects/68b19ae480f11301198805f0/canvas/library` | The main grid of all dashboards in the project (Drafts + Published). |
| **Published dashboard (view-only)** | `…/projects/68b19ae480f11301198805f0/canvas/library/:session_id` | A published dashboard, full-screen, no chat. This is what teammates see. Reached by clicking a Published tile. |

You don't need to type these by hand — the **Library** and **Create new dashboard** buttons in the top bar move you between them. The table is just so you know where you are. (Any other project works too — swap in its id from the project's URL.)

What's new in one line: dashboards you create are now **saved**, can be **shared with the whole project**, and live in a **Library** of tiles.

---

## 1. Start at the Library
1. Open the **Start here** link — you land on the Library (`…/canvas/library`).
2. You'll see tiles for every dashboard in the project:
   - **Draft** = work in progress (yours only — teammates don't see your drafts).
   - **Published** = shared with everyone on the project.
3. This is the home base — everything starts and ends here.

## 2. Create a dashboard, and watch it save
1. From the Library, click **Create new dashboard**.
2. Ask for a dashboard (e.g. *"show open issues by category"*).
3. Once it appears, **refresh the page**.
4. ✅ It comes back exactly as you left it. (Before, it disappeared on refresh.) Notice the URL now ends in a session id, and a new **Draft** tile is waiting back in the Library.

## 3. Publish a dashboard to share it
1. Open one of your dashboards (click a Draft tile).
2. Click **Publish** → confirm.
3. The tile flips to **Published** and gets a preview image.
4. Anyone on the project can now open it.
   - Made a better version later? Just hit **Publish** again — the shared one updates.

## 4. Viewing a published dashboard
1. In the Library, click any **Published** tile.
2. It opens **full-screen, read-only** — no chat, just the dashboard. This is what your teammates see.
3. If it's yours, an **Edit** button lets you jump back in and change it.

## 5. Tidy up
- Hover any tile → the **⋯** menu lets you **Rename** or **Delete**.

---

## What to look for / give feedback on
- Does saving + refresh feel reliable?
- Is the Draft vs Published distinction clear?
- Are the Library tiles (preview image, names, who published) useful at a glance?
- Does Publish → view-as-teammate match what you'd expect?

## Good to know (early version)
- Deleting hides a dashboard but doesn't fully erase storage yet — fine for testing.
- A published dashboard shows the **most recent data we saved for it**; if no one has refreshed it in a while, numbers may be a little behind (it won't break, just may be slightly stale).
- If a dashboard ever looks empty, reopening it in edit mode and regenerating fixes it.
