/**
 * PLT-2906 — did the orientation patch fire? A binary answer, no eyeballing.
 *
 * The patch works by overwriting the model's refPointTransform rotation with the
 * min-area-rect estimate (`section-tool-orientation.ts:_doPatch`). So the rotation
 * itself is the evidence:
 *
 *   FAR01 before  →  rotZ ≈  87.7086°   (Revit TN 272.2914°, folds to −2.2914°)
 *   patch fired   →  rotZ ≈ −20.46°     (min-area-rect estimate, ~18° wrong)
 *   patch skipped →  rotZ still ≈ 87.7086°
 *
 * Run it twice: once on a fresh viewer BEFORE activating the section box, then
 * again AFTER activating it. If the number moves, the patch fired.
 *
 * Judging 18° vs 2° visually is unreliable, which is why this exists.
 */
(function rotZSnapshot() {
  const v = window.NOP_VIEWER || window.__v;
  if (!v) {
    console.warn('PLT-2906: no viewer handle — set window.__v to the viewer and re-run');
    return;
  }
  console.table(
    v.getVisibleModels().map((m, idx) => {
      const data = m.getData() || {};
      const q = new THREE.Quaternion();
      data.refPointTransform?.decompose(new THREE.Vector3(), q, new THREE.Vector3());
      return {
        idx,
        isModelsZero: idx === 0,
        name:
          (data.loadOptions &&
            (data.loadOptions.modelNameOverride || data.loadOptions.bubbleNode?.name?.())) ||
          m.label?.() ||
          `model#${idx}`,
        rotZdeg: data.refPointTransform
          ? +((new THREE.Euler().setFromQuaternion(q, 'XYZ').z * 180) / Math.PI).toFixed(4)
          : 'n/a',
      };
    }),
  );
})();
