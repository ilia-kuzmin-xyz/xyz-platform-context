#!/usr/bin/env python3
"""
PLT-2649 — detect stale (mis-elevated) PA12 360 captures.

Method (as requested): issues are ground-truth (correctly aligned with the model),
so their coordinate span defines the valid model envelope. 360 captures falling
outside that envelope — primarily ABOVE it on the vertical axis — are stale.

Key facts established during analysis (see ../context.md "Update 2026-07-15"):
  * Vertical axis in the stored coords is Y (within-level stdev of Y == 0.000;
    X/Z vary as the horizontal plan). The viewer transform's swapYZ=true matches.
  * Capture (x,y,z) == its roomCapturePoint (x,y,z) exactly for all matched rows,
    so staleness lives in the room/capture-point coordinates, not a per-capture drift.
Inputs: the four uploaded exports (issues / two 360capture pages / roomcapturepoints).
"""
import json, csv, sys, statistics as st
from collections import defaultdict, Counter

BASE = sys.argv[1] if len(sys.argv)>1 else "."
def load(f):
    with open(f"{BASE}/{f}") as fh: return json.load(fh)["records"]

issues = load("0aa33544-issues.json")
caps   = load("bf703e53-360captures.json") + load("37afabb3-360captures_1.json")
rcp    = load("66505636-roomcapturepoints.json")

# --- ground-truth envelope from issues (Y = vertical) ---
def col(rows,k): return sorted(r[k] for r in rows if r.get(k) is not None)
iy, ix, iz = col(issues,"yMeters"), col(issues,"xMeters"), col(issues,"zMeters")
Y_MAX_VALID = 25.0        # safely above top issue (22.1) & top real level (15.9),
                          # far below the stale band (47-53). Gap 16..47 is empty.
Y_MIN_VALID = -3.0
XZ_MARGIN   = 5.0

def classify(c):
    y=c.get("yMeters")
    if y is None: return ("SKIP","no_coords")
    if y > Y_MAX_VALID: return ("STALE", f"too_high_Y={y:.1f}(>{Y_MAX_VALID:.0f})")
    if y < Y_MIN_VALID: return ("SUSPECT","too_low")
    x,z=c["xMeters"],c["zMeters"]
    if x<ix[0]-XZ_MARGIN or x>ix[-1]+XZ_MARGIN or z<iz[0]-XZ_MARGIN or z>iz[-1]+XZ_MARGIN:
        return ("SUSPECT","horizontal_outlier")
    return ("OK","within_envelope")

rows=[(c,)+classify(c) for c in caps]
stale =[c for c,cl,_ in rows if cl=="STALE"]
susp  =[c for c,cl,_ in rows if cl=="SUSPECT"]
ok    =[c for c,cl,_ in rows if cl=="OK"]

print(f"issue envelope: Y[{iy[0]:.1f},{iy[-1]:.1f}] X[{ix[0]:.1f},{ix[-1]:.1f}] Z[{iz[0]:.1f},{iz[-1]:.1f}]")
print(f"captures: {len(caps)} | STALE(too high) {len(stale)} ({100*len(stale)/len(caps):.1f}%) | "
      f"SUSPECT {len(susp)} | OK {len(ok)}")
print("stale rooms:", len({c.get('modelRoomId') for c in stale}),
      "| stale levels:", {(c.get('modelLevelId') or '')[:8] for c in stale},
      "| stale capture-points:", len({c.get('roomCapturePointId') for c in stale}))

with open(f"{BASE}/PLT-2649-stale-360-captures.csv","w",newline="") as fh:
    w=csv.writer(fh)
    w.writerow(["classification","reason","fileReferenceId","roomCapturePointId",
                "modelRoomId","modelLevelId","xMeters","yMeters","zMeters","fileName","imageTakenOn"])
    for c,cl,rs in rows:
        if cl in ("STALE","SUSPECT"):
            w.writerow([cl,rs,c.get("fileReferenceId"),c.get("roomCapturePointId"),c.get("modelRoomId"),
                        c.get("modelLevelId"),c.get("xMeters"),c.get("yMeters"),c.get("zMeters"),
                        c.get("fileName"),c.get("imageTakenOn")])

# cohort summary for hand-off (rooms + capture points to remediate)
cohort={
 "stale_level_id": sorted({c.get('modelLevelId') for c in stale}),
 "stale_room_ids": sorted({c.get('modelRoomId') for c in stale}),
 "stale_capture_point_ids": sorted({c.get('roomCapturePointId') for c in stale}),
 "counts": {"stale":len(stale),"suspect":len(susp),"ok":len(ok),"total":len(caps)},
 "stale_elevation_m": 50.4, "valid_top_elevation_m": iy[-1],
}
with open(f"{BASE}/PLT-2649-stale-cohort.json","w") as fh: json.dump(cohort,fh,indent=2)
print("wrote PLT-2649-stale-360-captures.csv and PLT-2649-stale-cohort.json")
