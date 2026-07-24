/**
 * PLT-2906 diagnostic — paste into the browser console on a FRESH FAR01 (or FAR02)
 * viewer page, BEFORE activating the Section Box.
 *
 * Why before: SectionToolOrientation._doPatch() mutates refPointTransform IN PLACE
 * on first box activation (and caches the patch per service instance) — after that,
 * the original True-North rotation is gone and this readout lies.
 *
 * Mirrors section-tool-orientation(-math).ts exactly: fold-to-nearest-axis,
 * 4000-fragment sample budget, hull → min-area rect, tightness = rectArea/aabbArea,
 * gate = |folded| < 5° AND tightness < 0.9  (section-tool-orientation-math.ts:141-152).
 *
 * Expected on FAR01 (TN 272.2914° → folds to +2.2914°): every model passes the <5°
 * guard, so `wouldPatch` hinges purely on tightness. The interesting outputs are:
 *   - which model is models[0] (it alone decides the patch + the angle for ALL models)
 *   - rect.angle for models[0]: if ≈ ±2.29° the estimate agrees with Revit and the
 *     box should look fine; anything else is the wrong angle applied to the whole
 *     federation — the customer's "new style".
 *
 * Viewer handle: tries window.NOP_VIEWER. If undefined, expose it once from a
 * breakpoint in section-tool-service.ts (`window.__v = this._viewerService.viewer`)
 * and re-run — or we spin the instrumented diagnostics branch instead.
 */
(function diagnosePLT2906() {
  const v = window.NOP_VIEWER || window.__v;
  if (!v) {
    console.warn('PLT-2906: no viewer handle — set window.__v to the viewer and re-run');
    return;
  }
  const HALF_PI = Math.PI / 2;
  const deg = r => (r * 180) / Math.PI;
  const fold = t => t - HALF_PI * Math.round(t / HALF_PI);

  function convexHull(points) {
    if (points.length < 3) return points.slice();
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i -= 1) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function boundingAreaAlongAxis(hull, ax, ay) {
    const px = -ay, py = ax;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const q of hull) {
      const u = q[0] * ax + q[1] * ay;
      const w = q[0] * px + q[1] * py;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (w < minV) minV = w; if (w > maxV) maxV = w;
    }
    return (maxU - minU) * (maxV - minV);
  }

  function minAreaRect(points) {
    const hull = convexHull(points);
    if (hull.length < 2) return null;
    let best = null;
    for (let i = 0; i < hull.length; i += 1) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const len = Math.hypot(ex, ey);
      if (len < 1e-12) continue;
      const area = boundingAreaAlongAxis(hull, ex / len, ey / len);
      if (!best || area < best.area) best = { angle: fold(Math.atan2(ey, ex)), area };
    }
    return best;
  }

  function footprintCorners(model, budget = 4000) {
    const fl = model.getFragmentList();
    const fb = new THREE.Box3();
    const corners = [];
    const count = fl.getCount();
    const stride = Math.max(1, Math.floor(count / budget));
    for (let i = 0; i < count; i += stride) {
      if (typeof fl.isFragVisible === 'function' && !fl.isFragVisible(i)) continue;
      if (typeof fl.isFragOff === 'function' && fl.isFragOff(i)) continue;
      fl.getWorldBounds(i, fb);
      if (!Number.isFinite(fb.min.x)) continue;
      corners.push([fb.min.x, fb.min.y], [fb.max.x, fb.min.y], [fb.max.x, fb.max.y], [fb.min.x, fb.max.y]);
    }
    return corners;
  }

  function aabbArea(points) {
    if (!points.length) return 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return (maxX - minX) * (maxY - minY);
  }

  const rows = v.getVisibleModels().map((m, idx) => {
    const data = m.getData() || {};
    const rpt = data.refPointTransform;
    const applyRefPoint = !!(data.loadOptions && data.loadOptions.applyRefPoint);
    let rotZ = null;
    if (rpt) {
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      rpt.decompose(pos, quat, scl);
      rotZ = new THREE.Euler().setFromQuaternion(quat, 'XYZ').z;
    }
    const corners = footprintCorners(m);
    const rect = minAreaRect(corners);
    const worldArea = aabbArea(corners);
    const tightness = rect && worldArea > 0 ? rect.area / worldArea : 1;
    const folded = rotZ === null ? null : fold(rotZ);
    const guardPasses = folded !== null && Math.abs(folded) < 5 * (Math.PI / 180);
    return {
      isModelsZero: idx === 0,
      name: (data.loadOptions && (data.loadOptions.modelNameOverride || data.loadOptions.bubbleNode?.name?.())) || m.label?.() || data.urn || `model#${idx}`,
      applyRefPoint,
      rotZdeg: rotZ === null ? 'n/a' : deg(rotZ).toFixed(4),
      foldedDeg: folded === null ? 'n/a' : deg(folded).toFixed(4),
      tightness: tightness.toFixed(4),
      rectAngleDeg: rect ? deg(rect.angle).toFixed(4) : 'n/a',
      wouldPatch: guardPasses && tightness < 0.9,
    };
  });
  console.table(rows);
  const first = rows[0];
  if (first) {
    console.log(
      `PLT-2906 verdict: models[0] = "${first.name}" — wouldPatch=${first.wouldPatch}` +
      (first.wouldPatch
        ? `; theta applied to ALL models would be ${first.rectAngleDeg}° (Revit says ±2.29°; a mismatch here IS the bug)`
        : '; patch would NOT fire — box uses stock refPointTransform orientation'),
    );
  }
})();
