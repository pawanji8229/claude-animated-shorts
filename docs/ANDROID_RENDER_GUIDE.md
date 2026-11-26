# Render and download from an Android phone (no PC)

All rendering runs on GitHub's free standard runners (`ubuntu-latest`). Public repositories get free Actions minutes on standard runners.
A 5 s 540x960 preview takes about 1–3 minutes of render time, plus about 2–4 minutes of setup.

## A. Start a render (Chrome on Android, recommended)
1. Open `https://github.com/pawanji8229/claude-animated-shorts/actions` in Chrome and sign in.
   - If you see "Workflows aren't being run on this forked repository", tap **I understand my workflows, go ahead and enable them**.
2. Tap **Render video** in the workflow list (open the ☰ / "All workflows" menu if it's hidden).
   - It appears only after the workflow file is on `main`, so merge the PR first.
   - Before merging, the PR itself triggers an automatic preview render (see section C).
3. Tap **Run workflow**. Choose:
   - **Branch**: `main`.
   - **Composition**: `InventorWalkInPreview` (fast) or `InventorWalkIn` (1080x1920).
   - **captions**: on or off.
   - **stills**: e.g. `8,70,140`.
   - **frames**: leave empty for the full 5 s.
4. Tap the green **Run workflow** button. Pull down to refresh: a yellow dot means running, a green check means done, a red X means failed.

> The GitHub Android app can show runs and logs, but in many versions it cannot start `workflow_dispatch` runs or download artifacts. Use Chrome for those steps. In Chrome, "Desktop site" mode makes the Actions page easier to use.

## B. Download the MP4 and stills
1. Open the finished run (green check).
2. Scroll to **Artifacts** at the bottom of the run summary and tap e.g. `InventorWalkInPreview-12`.
3. Chrome downloads a `.zip`. Open **Files** (or Chrome → Downloads), tap the zip and choose **Extract**.
4. Inside: `InventorWalkInPreview.mp4`, `stills/*.png` and `probe.txt` (width/height/fps/frame count). Tap the MP4 to play it.
   Artifacts are kept for 14 days.

## C. Preview renders on pull requests
Every PR that changes `studio/**` renders the low-res preview automatically.
- Open the PR, go to the **Checks** tab, then **Render video**, then **Summary**, then **Artifacts**.

## D. Quick look without downloading
The committed test outputs are in `studio/previews/` on the PR branch. Open a PNG on github.com to view it.
To get the MP4, tap it and use **⋯** then **Download** (or "View raw").

## Troubleshooting
- Red X at **Install dependencies**: the lockfile is out of sync. Ask Claude Code to run `npm install` in `studio/` and commit `package-lock.json`.
- Red X at **Download Remotion's headless browser**: a transient network error. Tap **Re-run jobs**.
- Very slow or timed out (45 min): render the `InventorWalkInPreview` composition or set a **frames** range such as `0-74`.
