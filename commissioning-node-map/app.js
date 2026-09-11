const CARD_W = 300;
  const COL_GAP = 112;
  const ROW_GAP = 64;

  /**
   * Bumped whenever the packing geometry changes.
   *
   * A saved layout wins over the default one, which is right for a board
   * somebody arranged — and wrong for one they never touched, because then a
   * change to the spacing here can never reach them. A layout saved under
   * different geometry is stale, and stale beats absent only if you never
   * change the geometry.
   */
  const LAYOUT_VERSION = 2;

  /**
   * Where the first card sits, measured rather than assumed.
   *
   * A stage heading carries a blurb that wraps differently depending on which
   * font actually loaded, so a fixed offset clears it on one machine and
   * collides on the next. Ask the headings how tall they are.
   */
  function stageTop() {
    let tallest = 0;
    document.querySelectorAll('.stage-label').forEach(label => {
      tallest = Math.max(tallest, label.offsetHeight);
    });
    return Math.round(tallest + 40);
  }

  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('canvas');

  /* ------------------------------------------------------------------ build */
  STAGES.forEach((stage, index) => {
    const label = document.createElement('div');
    label.className = 'stage-label';
    label.style.left = `${index * (CARD_W + COL_GAP)}px`;
    label.style.top = '0px';
    label.textContent = stage.title;
    const blurb = document.createElement('b');
    blurb.textContent = stage.blurb;
    label.appendChild(blurb);
    canvas.appendChild(label);
  });

  const STORES = LAYERS.filter(layer => layer.role === 'store');
  /* A proposal is not a place data lives, so it never counts towards whether
     the stores line up — it only says what one of them is meant to become. */
  const BASE_STORES = STORES.filter(layer => !layer.extends);

  /* One toggle per layer, carrying that layer's badge — so the bar is both the
     layer manager and the key to what the badges on the cards mean. */
  const toggleHost = document.getElementById('layer-toggles');
  LAYERS.forEach(layer => {
    const toggle = document.createElement('label');
    toggle.className = 'toggle';
    toggle.dataset.layer = layer.key;
    toggle.style.setProperty('--layer', layer.colour);
    const ROLE_IS = { surface: 'screens', store: 'a place data lives', status: 'how far it got' };
    toggle.title = `${layer.label} — ${ROLE_IS[layer.role] ?? layer.role}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.band = layer.key;
    input.checked = true;

    const chip = document.createElement('i');
    chip.className = 'chip';
    chip.textContent = layer.tag;

    toggle.append(input, chip);
    toggleHost.appendChild(toggle);
  });

  CONCEPTS.forEach(concept => {
    const card = document.createElement('button');
    card.className = 'concept';
    card.type = 'button';
    card.dataset.id = concept.id;
    if (concept.flag) card.dataset.flag = '1';
    card.setAttribute('aria-pressed', 'false');

    const title = document.createElement('h3');
    title.textContent = concept.name;
    card.appendChild(title);

    const stack = document.createElement('div');
    stack.className = 'stack';

    LAYERS.forEach((layer, depth) => {
      const declared = concept.sheets[layer.key];
      // A sparse layer says nothing about most concepts, and silence is not an
      // absence worth drawing — it simply does not appear there.
      if (!declared && layer.sparse) return;

      const sheet = declared ?? { absent: `Not described in ${layer.label}` };
      const node = document.createElement('div');
      node.className = 'sheet' + (sheet.absent ? ' ghost' : '');
      node.dataset.layer = layer.key;
      node.dataset.role = layer.role;
      if (layer.provisional) node.dataset.provisional = '';
      node.style.setProperty('--layer', layer.colour);
      node.style.setProperty('--depth', String(depth + 1));

      const row = document.createElement('div');
      row.className = 'row';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = layer.tag;
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = sheet.absent ?? sheet.label;
      row.append(tag, label);
      node.appendChild(row);

      if (sheet.detail) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = sheet.detail;
        node.appendChild(sub);
      }

      stack.appendChild(node);
    });

    card.appendChild(stack);
    canvas.appendChild(card);
    concept.el = card;
  });

  const byId = new Map(CONCEPTS.map(concept => [concept.id, concept]));

  /**
   * Registers each stack against the sheets that are actually showing.
   *
   * Two real sheets overlap by a label-line, so both labels read. A missing
   * sheet is never overlapped — an empty slot you cannot see says nothing. The
   * front sheet is the last real one, which is therefore unobstructed and the
   * only one with room to say more.
   */
  function layoutStacks() {
    document.querySelectorAll('.stack').forEach(stack => {
      const shown = [...stack.children].filter(sheet => !sheet.hidden);
      let previous = null;

      shown.forEach(sheet => {
        const overlaps = previous
          && !previous.classList.contains('ghost')
          && !sheet.classList.contains('ghost');
        sheet.style.marginTop = previous ? (overlaps ? '-1.6rem' : '0.3rem') : '0';
        sheet.style.marginLeft = previous ? '0.55rem' : '0';
        previous = sheet;
      });

      stack.querySelectorAll('.sheet').forEach(sheet => sheet.classList.remove('front'));
      const front = shown.filter(sheet => !sheet.classList.contains('ghost')).pop();
      if (front) front.classList.add('front');
    });
  }

  /* ----------------------------------------------------------- positioning */
  /* Each board keeps its own layout and layer state: the coverage page carries
     extra layers, so its cards are a different height and its packing is not
     the map's. Set window.BOARD_ID before this script to name a board. */
  const BOARD = typeof BOARD_ID === 'string' ? BOARD_ID : 'map';
  const LS_POS = `cx-node-map-layout:${BOARD}`;
  const LS_STATE = `cx-node-map-sheets:${BOARD}`;

  function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (error) { return null; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* blocked */ }
  }

  /** Stage columns, packed top to bottom. The board's honest reading order. */
  function tidy() {
    const top = stageTop();
    const nextY = STAGES.map(() => top);
    CONCEPTS.forEach(concept => {
      const column = concept.stage - 1;
      concept.x = column * (CARD_W + COL_GAP);
      concept.y = nextY[column];
      place(concept);
      nextY[column] += concept.el.offsetHeight + ROW_GAP;
    });
  }

  function place(concept) {
    concept.el.style.left = `${concept.x}px`;
    concept.el.style.top = `${concept.y}px`;
  }

  /** True once the reader has dragged something; their arrangement then wins. */
  let arranged = false;

  function savePositions() {
    const at = {};
    CONCEPTS.forEach(concept => { at[concept.id] = [Math.round(concept.x), Math.round(concept.y)]; });
    writeStore(LS_POS, { v: LAYOUT_VERSION, arranged, at });
  }

  /** The saved layout, but only if this build packed it and a human arranged it. */
  function savedArrangement() {
    const saved = readStore(LS_POS);
    if (!saved || saved.v !== LAYOUT_VERSION || !saved.arranged) return null;
    return saved.at ?? null;
  }

  /** Re-pack unless the reader has arranged the board themselves. */
  function repack() {
    if (arranged) return;
    tidy();
    savePositions();
  }

  /* ------------------------------------------------------------------- view */
  const view = { x: 24, y: 20, k: 1 };
  const zoomLevel = document.getElementById('zoom-level');

  function draw() {
    canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    viewport.style.backgroundSize = `${24 * view.k}px ${24 * view.k}px`;
    viewport.style.backgroundPosition = `${view.x}px ${view.y}px`;
    zoomLevel.textContent = `${Math.round(view.k * 100)}%`;
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function bounds() {
    let right = 0;
    let bottom = 0;
    CONCEPTS.forEach(concept => {
      right = Math.max(right, concept.x + CARD_W);
      bottom = Math.max(bottom, concept.y + concept.el.offsetHeight);
    });
    return { right, bottom };
  }

  function fit() {
    const box = bounds();
    if (!viewport.clientWidth || !viewport.clientHeight || !box.right) return;
    const pad = 28;
    view.k = clamp(Math.min(
      (viewport.clientWidth - pad * 2) / box.right,
      (viewport.clientHeight - pad * 2) / box.bottom,
    ), 0.2, 1);
    view.x = (viewport.clientWidth - box.right * view.k) / 2;
    view.y = pad;
    draw();
  }

  /** Opens showing the top-left of the board at a readable size, not fitted —
      the whole point of a board is that you zoom into it. */
  function openingView() {
    const box = bounds();
    // Measured before the container has a size, every number below is garbage;
    // the observer at the end re-runs this the moment it does.
    if (!viewport.clientWidth || !box.right) return;
    view.k = clamp((viewport.clientWidth - 48) / box.right, 0.55, 1);
    view.x = 24;
    view.y = 20;
    draw();
  }

  function zoomAt(factor, cx, cy) {
    const k = clamp(view.k * factor, 0.2, 2.5);
    const ratio = k / view.k;
    view.x = cx - (cx - view.x) * ratio;
    view.y = cy - (cy - view.y) * ratio;
    view.k = k;
    draw();
  }

  /* ------------------------------------------------------- pan, zoom, drag */
  let drag = null;

  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    const card = event.target.closest('.concept');
    // Capture keeps the gesture alive past the cursor leaving the board, but it
    // throws if the pointer is already gone — which must not lose the drag.
    try { viewport.setPointerCapture(event.pointerId); } catch { /* no capture */ }

    drag = {
      card: card ? byId.get(card.dataset.id) : null,
      startX: event.clientX,
      startY: event.clientY,
      originX: card ? byId.get(card.dataset.id).x : view.x,
      originY: card ? byId.get(card.dataset.id).y : view.y,
      moved: false,
    };

    if (!card) viewport.classList.add('panning');
  });

  viewport.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;

    if (!drag.moved) {
      drag.moved = true;
      if (drag.card) drag.card.el.classList.add('dragging');
    }

    if (drag.card) {
      drag.card.x = drag.originX + dx / view.k;
      drag.card.y = drag.originY + dy / view.k;
      place(drag.card);
    } else {
      view.x = drag.originX + dx;
      view.y = drag.originY + dy;
      draw();
    }
  });

  viewport.addEventListener('pointerup', event => {
    if (!drag) return;
    viewport.classList.remove('panning');

    if (drag.card) {
      drag.card.el.classList.remove('dragging');
      if (drag.moved) { arranged = true; savePositions(); }
      else select(drag.card.id);
    } else if (!drag.moved) {
      select(null);
    }

    drag = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  });

  /* A cancelled gesture — a touch turning into a system swipe, say — would
     otherwise leave the card following the pointer for good. */
  viewport.addEventListener('pointercancel', () => {
    if (!drag) return;
    viewport.classList.remove('panning');
    if (drag.card) {
      drag.card.el.classList.remove('dragging');
      if (drag.moved) { arranged = true; savePositions(); }
    }
    drag = null;
  });

  viewport.addEventListener('wheel', event => {
    // Inside the comparison window the wheel belongs to the window's own scroll.
    if (event.target.closest('.window')) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAt(Math.exp(-event.deltaY * 0.0016), event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  /* A focused card is useless off-screen, so bring it into view. */
  canvas.addEventListener('focusin', event => {
    const card = event.target.closest('.concept');
    if (!card || drag) return;
    const concept = byId.get(card.dataset.id);
    const left = concept.x * view.k + view.x;
    const top = concept.y * view.k + view.y;
    const height = card.offsetHeight * view.k;
    if (left < 0 || left + CARD_W * view.k > viewport.clientWidth) view.x = 40 - concept.x * view.k;
    if (top < 0 || top + height > viewport.clientHeight) view.y = 40 - concept.y * view.k;
    draw();
  });

  /* ------------------------------------------------------- comparison window */
  const scrim = document.getElementById('scrim');
  const windowEl = document.getElementById('window');
  let selected = null;
  let lastFocused = null;

  function add(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  /**
   * How well one attribute lines up: which store layers actually hold it.
   *
   * The marker is the tags of the layers that do — `BA` when both, `B` when
   * only ours — so it reads correctly for any number of layers rather than
   * assuming exactly two.
   */
  function alignment(row) {
    const held = BASE_STORES.filter(layer => row[layer.key]);
    if (held.length === BASE_STORES.length) return { state: 'aligned', held };
    if (held.length === 0) return { state: 'neither', held };
    return { state: 'partial', held };
  }

  /**
   * The marker: one dot per store, filled where that store holds the
   * attribute, hollow where it does not.
   *
   * It used to be the layers' tags run together — fine as `BA`, nonsense once
   * a tag is a word. Dots also stay legible however many layers there are.
   */
  function marker(cell, held) {
    BASE_STORES.forEach(layer => {
      const dot = add(cell, 'span', held.includes(layer) ? 'dot on' : 'dot');
      dot.style.setProperty('--layer', layer.colour);
      dot.title = `${held.includes(layer) ? 'in' : 'not in'} ${layer.label}`;
    });
  }

  /**
   * What a delta layer's cell should read for one row.
   *
   * The point of `extends` is that nothing here is hand-labelled: a proposal
   * that repeats what the base already says shows as unchanged, so a gap that
   * has since been filled stops claiming to be a gap.
   */
  function delta(layer, row) {
    const proposed = row[layer.key];
    const base = row[layer.extends];

    if (proposed === TBD) return { text: 'not specified yet', kind: 'tbd' };
    if (!proposed) return base ? { text: 'unchanged', kind: 'same' } : { text: '', kind: 'same' };
    if (!base) return { text: proposed, kind: 'added' };
    if (proposed === base) return { text: 'unchanged', kind: 'same' };
    return { text: proposed, kind: 'changed' };
  }

  /**
   * Looks a cell's value up in the column registry.
   *
   * A value may name a bare column of the concept's own table, a qualified
   * `table.column`, or several separated by a slash — so each part is resolved
   * on its own and only what is found gets decorated.
   */
  function lookupColumn(layer, concept, part) {
    const registry = TABLES[layer.key];
    if (!registry) return null;
    const bare = part.trim().replace(/\(.*$/, '');
    if (bare.includes('.')) {
      const [table, column] = bare.split('.');
      return registry[table]?.[column] ? { table, column, meta: registry[table][column] } : null;
    }
    const table = concept.sheets[layer.key]?.table;
    return table && registry[table]?.[bare]
      ? { table, column: bare, meta: registry[table][bare] }
      : null;
  }

  /** Renders one store cell as name · keys · type, with its permitted values. */
  function describeColumn(cell, layer, concept, value) {
    value.split(/\s*\/\s*/).forEach((part, index) => {
      const found = lookupColumn(layer, concept, part);
      const line = add(cell, 'div', 'colline');
      if (index > 0) line.classList.add('also');
      add(line, 'span', 'cn', part.trim());

      if (!found) { add(line, 'span', 'keys'); add(line, 'span', 'ct'); return; }
      const { meta } = found;
      const keys = add(line, 'span', 'keys');
      if (meta.pk) add(keys, 'span', 'badge pk', 'PK');
      if (meta.fk) {
        const badge = add(keys, 'span', 'badge fk', 'FK');
        badge.title = `references ${meta.fk}`;
      }
      if (meta.en) add(keys, 'span', 'badge en', 'ENUM');
      add(line, 'span', 'ct', meta.t);

      if (meta.en) {
        const values = add(cell, 'div', 'values');
        meta.en.forEach(one => add(values, 'span', 'val', one));
      }
      /* The target only earns a line when the column name does not already
         give it away — `asset_id → asset` tells nobody anything. */
      if (meta.fk && !found.column.toLowerCase().includes(meta.fk.toLowerCase().replace(/_/g, ''))
          && !found.column.toLowerCase().replace(/_/g, '').includes(meta.fk.toLowerCase().replace(/_/g, ''))) {
        add(cell, 'div', 'ref', `→ ${meta.fk}`);
      }
    });
  }

  /** What a concept accounts for of the table it names, per store layer. */
  function coverage(concept, rows) {
    return STORES.map(layer => {
      const sheet = concept.sheets[layer.key];
      if (!sheet || !sheet.table) return null;
      const columns = (TABLES[layer.key] ?? {})[sheet.table];
      if (!columns) return null;
      const all = Object.keys(columns);
      const named = new Set();
      rows.forEach(row => {
        const value = row[layer.key];
        if (!value) return;
        // A row may name a column, or a column reached through another table.
        value.split(/\s*\/\s*/).forEach(part => {
          const bare = part.trim().replace(/^.*\./, '').replace(/\(.*$/, '');
          if (all.includes(bare)) named.add(bare);
        });
      });
      return { layer, table: sheet.table, total: all.length, named: named.size };
    }).filter(Boolean);
  }

  function buildWindow(concept) {
    windowEl.textContent = '';
    const rows = concept.fields ?? [];
    /* A sparse layer earns a column only where the concept speaks about it.
       Otherwise every window carried an empty "Proposed" column. */
    const columns = LAYERS.filter(layer => !layer.sparse || concept.sheets[layer.key]);
    const tally = { aligned: 0, partial: 0, neither: 0 };
    rows.forEach(row => { tally[alignment(row).state] += 1; });

    // ------------------------------------------------------------ header
    const header = add(windowEl, 'header');
    const heading = add(header, 'div');
    add(heading, 'h2', null, concept.name).id = 'window-title';
    // Only the counts that are not zero; a run of zeroes reads as noise.
    const counted = [
      [tally.aligned, 'line up'],
      [tally.partial, 'in one store only'],
      [tally.neither, 'stored nowhere'],
    ].filter(([n]) => n > 0).map(([n, what]) => `${n} ${what}`);
    add(heading, 'div', 'tally', counted.join(' · '));

    const close = add(header, 'button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => closeWindow());

    // -------------------------------------------------------------- table
    const body = add(windowEl, 'div', 'body');
    const grid = add(body, 'div', 'grid');
    /* The screen column holds a short phrase; the store columns hold
       identifiers, badges and a type, so they get the room. */
    const share = columns.map(layer => (layer.role === 'surface' ? '0.85fr' : '1.25fr')).join(' ');
    grid.style.gridTemplateColumns = `2.7rem ${share}`;
    add(grid, 'div', 'head');
    columns.forEach(layer => {
      add(grid, 'div', 'head', layer.column).style.setProperty('--layer', layer.colour);
    });

    rows.forEach(row => {
      // The grid lays cells out directly, so every cell of a row carries the
      // row's class — that is what lets a whole row take a colour.
      const { state, held } = alignment(row);
      const where = `r-${state}`;
      const cells = [];
      marker(add(grid, 'div', `cell mark ${where}`), held);
      columns.forEach(layer => {
        if (layer.extends) {
          const { text, kind } = delta(layer, row);
          const cell = add(grid, 'div',
            `cell ${kind === 'added' || kind === 'changed' ? 'col' : 'none'} d-${kind} ${where}`,
            kind === 'same' ? '' : text);
          cell.style.setProperty('--layer', layer.colour);
          if (kind === 'same') cell.title = 'unchanged by the proposal';
          return;
        }
        const value = row[layer.key];
        if (!value) {
          add(grid, 'div', `cell none ${where}`, '—').title =
            layer.role === 'store' ? 'nothing here' : 'not surfaced on screen';
          return;
        }
        if (layer.role !== 'store') {
          add(grid, 'div', `cell ui ${where}`, value);
          return;
        }
        const cell = add(grid, 'div', `cell col ${where}`);
        cell.style.setProperty('--layer', layer.colour);
        describeColumn(cell, layer, concept, value);
      });

      /* The rule under a row is drawn once, by its note if it has one and by
         the row's own cells otherwise — so it never leaves a stray segment. */
      if (row.note) add(grid, 'div', `cell note row-end ${where}`, row.note);
      else [...grid.children].slice(-1 - columns.length).forEach(cell => cell.classList.add('row-end'));
    });

    // ------------------------------------------------------------- footer
    const footer = add(windowEl, 'footer');
    if (concept.note) add(footer, 'p', concept.flag ? 'gap' : '', concept.note);

    /* Any layer that makes a claim has to say where it came from and when, or
       it becomes folklore — a proposal about api-v2, or a reading of a design. */
    LAYERS.filter(layer => layer.source && concept.sheets[layer.key]).forEach(layer => {
      const proposal = add(footer, 'p', 'proposal');
      add(proposal, 'strong', null, `${layer.label}: `);
      proposal.append(concept.sheets[layer.key].detail ?? concept.sheets[layer.key].label);
      add(footer, 'p', 'house', `Source — ${layer.source}`);
    });

    const covered = coverage(concept, rows);
    if (covered.length) {
      add(footer, 'p', 'house', covered
        .map(item => `${item.table}: ${item.named} of ${item.total} columns accounted for here`)
        .join(' · '));
    }

  }

  function openWindow(id) {
    const concept = byId.get(id);
    if (!concept) return;
    selected = id;
    lastFocused = document.activeElement;

    viewport.classList.add('has-selection');
    CONCEPTS.forEach(other => {
      const on = other.id === id;
      other.el.classList.toggle('is-selected', on);
      other.el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    buildWindow(concept);
    scrim.hidden = false;
    windowEl.querySelector('.close').focus();
  }

  function closeWindow() {
    if (!selected) return;
    selected = null;
    scrim.hidden = true;
    viewport.classList.remove('has-selection');
    CONCEPTS.forEach(concept => {
      concept.el.classList.remove('is-selected');
      concept.el.setAttribute('aria-pressed', 'false');
    });
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
  }

  function select(id) {
    if (selected === id) closeWindow();
    else openWindow(id);
  }

  scrim.addEventListener('pointerdown', event => {
    // Only a click on the scrim itself dismisses; the window swallows its own.
    if (event.target === scrim) closeWindow();
    event.stopPropagation();
  });

  addEventListener('keydown', event => {
    if (event.key === 'Escape') closeWindow();
  });

  /* ---------------------------------------------------------------- layers */
  function persistState() {
    const state = {};
    document.querySelectorAll('[data-band]').forEach(input => { state[input.dataset.band] = input.checked; });
    state.gaps = document.getElementById('gaps-toggle').checked;
    writeStore(LS_STATE, state);
  }

  function setLayer(layer, on) {
    document.querySelectorAll(`.sheet[data-layer="${layer}"]`).forEach(sheet => { sheet.hidden = !on; });
    layoutStacks();
    // Hiding a sheet changes every card's height, so the packing is stale.
    repack();
  }

  document.querySelectorAll('[data-band]').forEach(input => {
    input.addEventListener('change', () => {
      setLayer(input.dataset.band, input.checked);
      persistState();
    });
  });

  document.getElementById('gaps-toggle').addEventListener('change', event => {
    document.body.classList.toggle('show-gaps', event.target.checked);
    persistState();
  });

  document.getElementById('zoom-in').addEventListener('click', () => {
    zoomAt(1.25, viewport.clientWidth / 2, viewport.clientHeight / 2);
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    zoomAt(0.8, viewport.clientWidth / 2, viewport.clientHeight / 2);
  });
  document.getElementById('fit').addEventListener('click', fit);
  document.getElementById('tidy').addEventListener('click', () => {
    arranged = false;
    tidy();
    savePositions();
    openingView();
  });

  /* ------------------------------------------------------------------- boot */
  const savedState = readStore(LS_STATE);
  if (savedState) {
    document.querySelectorAll('[data-band]').forEach(input => {
      if (typeof savedState[input.dataset.band] === 'boolean') {
        input.checked = savedState[input.dataset.band];
        document.querySelectorAll(`.sheet[data-layer="${input.dataset.band}"]`).forEach(sheet => {
          sheet.hidden = !input.checked;
        });
      }
    });
    if (savedState.gaps) {
      document.getElementById('gaps-toggle').checked = true;
      document.body.classList.add('show-gaps');
    }
  }

  layoutStacks();
  tidy();

  const savedPositions = savedArrangement();
  if (savedPositions) {
    arranged = true;
    CONCEPTS.forEach(concept => {
      const at = savedPositions[concept.id];
      if (Array.isArray(at) && at.length === 2) {
        concept.x = at[0];
        concept.y = at[1];
        place(concept);
      }
    });
  }

  openingView();

  /* The board may be built inside a container that has no size yet — a hidden
     pane, a thumbnail pass, an iframe still being laid out. Lay it out again
     the first time it actually gains one, or it stays scaled to nothing. */
  if (typeof ResizeObserver === 'function') {
    let sized = viewport.clientWidth > 0 && viewport.clientHeight > 0;
    const observer = new ResizeObserver(() => {
      if (sized || !viewport.clientWidth || !viewport.clientHeight) return;
      sized = true;
      layoutStacks();
      repack();
      openingView();
    });
    observer.observe(viewport);
  }

  addEventListener('resize', draw);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      repack();
      draw();
    });
  }
