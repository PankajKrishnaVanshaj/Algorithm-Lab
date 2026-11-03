'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const DEFAULT_VALUES = [42, 18, 63, 7, 35, 91, 24, 56, 12, 78, 30, 4, 68, 48, 15, 84, 27, 52, 10, 73, 39, 60, 21, 95];
  const SORT_META = {
    bubble: { name: 'Bubble Sort', best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', description: 'Repeatedly compares neighboring values and swaps them when they are out of order.' },
    selection: { name: 'Selection Sort', best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', description: 'Finds the smallest remaining value and moves it to the next sorted position.' },
    insertion: { name: 'Insertion Sort', best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', description: 'Builds a sorted prefix by inserting each new value into its correct position.' },
    merge: { name: 'Merge Sort', best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', description: 'Splits the array into smaller parts, sorts them, and merges the sorted parts.' },
    quick: { name: 'Quick Sort', best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n) avg., O(n) worst', description: 'Partitions values around a pivot, then sorts the partitions recursively.' }
  };
  const SORT_CODE = {
    bubble: ['for each pass through the array:', '  for each adjacent pair:', '    if left value > right value:', '      swap the two values', '  mark the final position as sorted'],
    selection: ['for each position i:', '  minIndex = i', '  scan the remaining values', '  remember the smallest value', '  swap values at i and minIndex'],
    insertion: ['for i from 1 to n - 1:', '  current = array[i]', '  shift larger values one place right', '  insert current into the gap'],
    merge: ['split the array into two halves', 'recursively sort the left half', 'recursively sort the right half', 'compare the front of both halves', 'write the smaller value into the result'],
    quick: ['choose the last value as pivot', 'scan values from left to right', 'move values smaller than pivot left', 'place pivot in its final position', 'repeat for both partitions']
  };

  const state = {
    view: 'sorting',
    theme: 'light',
    playing: false,
    timer: null,
    speed: 1,
    sorting: { algorithm: 'quick', values: [...DEFAULT_VALUES], steps: [], index: 0, metrics: { comparisons: 0, swaps: 0, writes: 0 }, comparison: null },
    searching: { algorithm: 'binary', values: [4, 7, 12, 18, 24, 35, 42, 56, 63, 78, 91], target: 42, steps: [], index: 0, metrics: { comparisons: 0 }, notice: '' },
    graphs: { algorithm: 'dijkstra', start: 'A', goal: 'G', steps: [], index: 0, metrics: { visits: 0, relaxations: 0 } },
    structures: { type: 'stack', items: [12, 24, 36], message: 'Stack initialized. The most recently added value is at the top.' }
  };

  const GRAPH_NODES = [
    { id: 'A', x: 88, y: 150 }, { id: 'B', x: 278, y: 66 }, { id: 'C', x: 278, y: 236 },
    { id: 'D', x: 485, y: 65 }, { id: 'E', x: 485, y: 155 }, { id: 'F', x: 485, y: 250 }, { id: 'G', x: 710, y: 155 }
  ];
  const GRAPH_EDGES = [
    ['A', 'B', 4], ['A', 'C', 3], ['B', 'D', 5], ['B', 'E', 2], ['C', 'E', 4], ['C', 'F', 6], ['D', 'G', 3], ['E', 'G', 2], ['F', 'G', 2]
  ];

  function stopPlayback() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
  }

  function getActiveRun() {
    return state[state.view];
  }

  function getRunSteps() {
    const run = getActiveRun();
    return run && Array.isArray(run.steps) ? run.steps : [];
  }

  function moveStep(direction) {
    const run = getActiveRun();
    if (!run || !run.steps.length) return;
    run.index = clamp(run.index + direction, 0, run.steps.length - 1);
    if (run.index === run.steps.length - 1) stopPlayback();
    renderWorkspace();
  }

  function startPlayback() {
    const run = getActiveRun();
    if (!run || !run.steps || run.steps.length < 2) return;
    if (state.playing) {
      stopPlayback();
      renderWorkspace();
      return;
    }
    if (run.index >= run.steps.length - 1) run.index = 0;
    state.playing = true;
    const interval = Math.max(180, Math.round(900 / state.speed));
    state.timer = window.setInterval(() => {
      const active = getActiveRun();
      if (!active || active.index >= active.steps.length - 1) {
        stopPlayback();
      } else {
        active.index += 1;
        if (active.index >= active.steps.length - 1) stopPlayback();
      }
      renderWorkspace();
    }, interval);
    renderWorkspace();
  }

  function playbackMarkup(run) {
    const count = run.steps.length;
    const index = count ? run.index : 0;
    const atStart = index <= 0;
    const atEnd = count < 2 || index >= count - 1;
    return `
      <div class="playback" aria-label="Playback controls">
        <button class="btn" type="button" data-action="step-back" ${atStart ? 'disabled' : ''} aria-label="Previous step">←</button>
        <button class="btn primary" type="button" data-action="toggle-play" ${count < 2 ? 'disabled' : ''}>${state.playing ? 'Ⅱ Pause' : atEnd ? '↻ Replay' : '▶ Play'}</button>
        <button class="btn" type="button" data-action="step-forward" ${atEnd ? 'disabled' : ''} aria-label="Next step">→</button>
        <div class="progress-wrap"><input type="range" min="0" max="${Math.max(0, count - 1)}" value="${index}" data-action="scrub" aria-label="Choose algorithm step" ${count < 2 ? 'disabled' : ''}></div>
        <span class="step-counter">${count ? index + 1 : 0} / ${count}</span>
        <select class="speed-select" data-action="set-speed" aria-label="Playback speed"><option value="0.5" ${state.speed === .5 ? 'selected' : ''}>0.5×</option><option value="1" ${state.speed === 1 ? 'selected' : ''}>1×</option><option value="1.5" ${state.speed === 1.5 ? 'selected' : ''}>1.5×</option><option value="2" ${state.speed === 2 ? 'selected' : ''}>2×</option><option value="3" ${state.speed === 3 ? 'selected' : ''}>3×</option></select>
      </div>`;
  }

  function metricCard(label, value, sub) {
    return `<div class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`;
  }

  function codePanel(lines, activeLine = -1) {
    return `<div class="info-panel"><h3>How the logic works</h3><pre class="code-block">${lines.map((line, i) => `<span class="code-line ${i === activeLine ? 'active' : ''}">${escapeHTML(line)}</span>`).join('')}</pre></div>`;
  }

  function complexityPanel(items) {
    return `<div class="info-panel"><h3>Complexity reference</h3><div class="complexity-chips">${items.map(([label, value]) => `<span class="complexity-chip">${label}: <strong>${value}</strong></span>`).join('')}</div></div>`;
  }

  function parseIntegerList(raw, maxItems = 50) {
    const tokens = String(raw).split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new Error('Enter at least one integer.');
    if (tokens.length > maxItems) throw new Error(`Use ${maxItems} values or fewer to keep the visualization responsive.`);
    const values = tokens.map((token) => {
      if (!/^-?\d+$/.test(token)) throw new Error(`“${token}” is not a whole number. Separate values with commas or spaces.`);
      const value = Number(token);
      if (!Number.isSafeInteger(value) || Math.abs(value) > 999999) throw new Error('Use whole numbers between −999,999 and 999,999.');
      return value;
    });
    return values;
  }

  function createSortingRun(algorithm, source, capture = true) {
    const a = [...source];
    const n = a.length;
    const metrics = { comparisons: 0, swaps: 0, writes: 0 };
    const steps = [];
    let sorted = new Set();
    const record = (message, active = [], kind = 'compare', pivot = -1, line = -1) => {
      if (!capture) return;
      steps.push({ array: [...a], active: [...active], sorted: [...sorted], kind, pivot, message, metrics: { ...metrics }, line });
    };
    const swap = (i, j, message = `Swap index ${i} with index ${j}.`) => {
      if (i === j) return;
      [a[i], a[j]] = [a[j], a[i]];
      metrics.swaps += 1;
      metrics.writes += 2;
      record(message, [i, j], 'swap');
    };

    record(`Starting ${SORT_META[algorithm].name} with ${n} values.`, [], 'start', -1, 0);
    if (algorithm === 'bubble') {
      for (let end = n - 1; end > 0; end--) {
        let changed = false;
        for (let j = 0; j < end; j++) {
          metrics.comparisons += 1;
          record(`Compare ${a[j]} and ${a[j + 1]}.`, [j, j + 1], 'compare', -1, 2);
          if (a[j] > a[j + 1]) { swap(j, j + 1, `${a[j]} is greater than ${a[j + 1]}, so swap the pair.`); changed = true; }
        }
        sorted.add(end);
        record(`Pass complete. Index ${end} is now in its final position.`, [end], 'sorted', -1, 4);
        if (!changed) break;
      }
      if (n) sorted.add(0);
    } else if (algorithm === 'selection') {
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        record(`Find the smallest value from index ${i} onward.`, [i], 'active', -1, 1);
        for (let j = i + 1; j < n; j++) {
          metrics.comparisons += 1;
          record(`Compare candidate ${a[j]} with current minimum ${a[min]}.`, [j, min], 'compare', -1, 2);
          if (a[j] < a[min]) { min = j; record(`${a[min]} is the new minimum.`, [min], 'active', -1, 3); }
        }
        if (min !== i) swap(i, min, `Place minimum value ${a[min]} at index ${i}.`);
        sorted.add(i);
        record(`Index ${i} is fixed in the sorted prefix.`, [i], 'sorted', -1, 4);
      }
      if (n) sorted.add(n - 1);
    } else if (algorithm === 'insertion') {
      for (let i = 1; i < n; i++) {
        const current = a[i];
        let j = i - 1;
        record(`Take ${current} as the value to insert into the sorted prefix.`, [i], 'active', -1, 1);
        while (j >= 0) {
          metrics.comparisons += 1;
          record(`Compare ${a[j]} with ${current}.`, [j, j + 1], 'compare', -1, 2);
          if (a[j] <= current) break;
          a[j + 1] = a[j]; metrics.writes += 1;
          record(`Shift ${a[j]} one position to the right.`, [j, j + 1], 'write', -1, 2);
          j--;
        }
        a[j + 1] = current; metrics.writes += 1;
        record(`Insert ${current} at index ${j + 1}.`, [j + 1], 'write', -1, 3);
        for (let k = 0; k <= i; k++) sorted.add(k);
      }
    } else if (algorithm === 'merge') {
      function mergeSort(left, right) {
        if (right - left <= 1) return;
        const mid = Math.floor((left + right) / 2);
        record(`Split the range ${left}–${right - 1} into two smaller ranges.`, [left, mid, right - 1], 'active', -1, 0);
        mergeSort(left, mid); mergeSort(mid, right);
        const merged = [];
        let i = left, j = mid;
        while (i < mid && j < right) {
          metrics.comparisons += 1;
          record(`Compare ${a[i]} from the left half with ${a[j]} from the right half.`, [i, j], 'compare', -1, 3);
          if (a[i] <= a[j]) merged.push(a[i++]); else merged.push(a[j++]);
        }
        while (i < mid) merged.push(a[i++]);
        while (j < right) merged.push(a[j++]);
        for (let k = 0; k < merged.length; k++) {
          a[left + k] = merged[k]; metrics.writes += 1;
          record(`Write ${merged[k]} into index ${left + k} while merging.`, [left + k], 'write', -1, 4);
        }
        if (left === 0 && right === n) { sorted = new Set(Array.from({ length: n }, (_, idx) => idx)); }
        record(`Merged range ${left}–${right - 1} is ordered.`, Array.from({ length: right - left }, (_, idx) => left + idx), 'sorted', -1, 4);
      }
      mergeSort(0, n);
      sorted = new Set(Array.from({ length: n }, (_, idx) => idx));
    } else if (algorithm === 'quick') {
      function partition(low, high) {
        const pivot = a[high]; let i = low - 1;
        record(`Choose ${pivot} at index ${high} as the pivot.`, [high], 'pivot', high, 0);
        for (let j = low; j < high; j++) {
          metrics.comparisons += 1;
          record(`Compare ${a[j]} with pivot ${pivot}.`, [j, high], 'compare', high, 1);
          if (a[j] <= pivot) { i++; if (i !== j) swap(i, j, `Move ${a[j]} to the left side of the pivot.`); }
        }
        if (i + 1 !== high) swap(i + 1, high, `Place pivot ${pivot} in its final position.`);
        sorted.add(i + 1);
        record(`Pivot ${pivot} is now fixed at index ${i + 1}.`, [i + 1], 'sorted', i + 1, 3);
        return i + 1;
      }
      function quickSort(low, high) {
        if (low >= high) { if (low === high) sorted.add(low); return; }
        const pivotIndex = partition(low, high);
        quickSort(low, pivotIndex - 1); quickSort(pivotIndex + 1, high);
      }
      quickSort(0, n - 1);
      sorted = new Set(Array.from({ length: n }, (_, idx) => idx));
    }
    sorted = new Set(Array.from({ length: n }, (_, idx) => idx));
    record(`${SORT_META[algorithm].name} complete. The array is sorted.`, [], 'done', -1, -1);
    return { steps, metrics, result: a };
  }

  function refreshSorting() {
    stopPlayback();
    const run = createSortingRun(state.sorting.algorithm, state.sorting.values, true);
    state.sorting.steps = run.steps;
    state.sorting.index = 0;
    state.sorting.metrics = run.metrics;
    state.sorting.comparison = null;
  }

  function compareSorting() {
    stopPlayback();
    const rows = Object.keys(SORT_META).map((algorithm) => {
      const start = performance.now();
      const run = createSortingRun(algorithm, state.sorting.values, false);
      const elapsed = performance.now() - start;
      return { algorithm, ...run.metrics, elapsed };
    });
    const minComparisons = Math.min(...rows.map((row) => row.comparisons));
    state.sorting.comparison = { rows, minComparisons };
  }

  function renderBars(values, step, options = {}) {
    if (!values || !values.length) return '<div class="empty-state">No values to display.</div>';
    const max = Math.max(...values.map((v) => Math.abs(v)), 1);
    const min = Math.min(...values.map((v) => Math.abs(v)), 0);
    const active = new Set(step?.active || []);
    const sorted = new Set(step?.sorted || []);
    const found = new Set(step?.found ? [step.foundIndex] : []);
    const low = typeof step?.low === 'number' ? step.low : 0;
    const high = typeof step?.high === 'number' ? step.high : values.length - 1;
    return `<div class="bars-stage" role="img" aria-label="Array visualization with ${values.length} values">${values.map((value, index) => {
      const height = Math.max(6, Math.round((Math.abs(value) / max) * 83));
      const isDim = options.search && (index < low || index > high) && !active.has(index) && !found.has(index);
      const cls = ['bar-item', active.has(index) ? 'is-active' : '', index === step?.pivot ? 'is-pivot' : '', sorted.has(index) ? 'is-sorted' : '', found.has(index) ? 'is-found' : '', isDim ? 'is-dim' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}" style="--bar-height:${height}%" title="Index ${index}: ${value}"><span class="bar-value">${value}</span><div class="bar"></div><span class="bar-index">${index}</span></div>`;
    }).join('')}</div>`;
  }

  function sortControls() {
    const sort = state.sorting;
    return `<aside class="control-panel">
      <div class="panel-title">Configure your run <small>01 / SORTING</small></div>
      <div class="field"><label for="sort-algorithm">Algorithm</label><select id="sort-algorithm" data-action="set-sort-algorithm">${Object.entries(SORT_META).map(([key, meta]) => `<option value="${key}" ${sort.algorithm === key ? 'selected' : ''}>${meta.name}</option>`).join('')}</select><span class="hint">${SORT_META[sort.algorithm].description}</span></div>
      <div class="field"><label for="sort-values">Input values <span class="field-label">(comma or space separated)</span></label><textarea id="sort-values" spellcheck="false" aria-describedby="sort-input-hint">${sort.values.join(', ')}</textarea><span class="hint" id="sort-input-hint">Up to 50 integers. Negative values and duplicates are supported.</span><div class="button-row"><button class="btn primary" type="button" data-action="apply-sort-values">Apply input</button><button class="btn" type="button" data-action="random-sort-values">Randomize</button></div></div>
      <div class="field"><label>Quick test cases</label><div class="button-row"><button class="btn" type="button" data-preset="sorted">Sorted</button><button class="btn" type="button" data-preset="reversed">Reversed</button><button class="btn" type="button" data-preset="duplicates">Duplicates</button></div></div>
      <div class="small-divider"></div>
      <div class="field"><label for="sort-size">Number of values: <strong id="sort-size-label">${sort.values.length}</strong></label><input id="sort-size" type="range" min="5" max="50" value="${clamp(sort.values.length, 5, 50)}" data-action="sort-size"><span class="hint">Changing the size generates a new random array.</span></div>
      <div class="button-row"><button class="btn subtle" type="button" data-action="reset-sort">↻ Reset visualization</button><button class="btn" type="button" data-action="compare-sort">⇄ Compare all</button></div>
      <div class="tiny-note">The array is processed locally in this tab. It is not uploaded or saved to a server.</div>
    </aside>`;
  }

  function renderSort() {
    const sort = state.sorting;
    const step = sort.steps[sort.index] || { array: sort.values, active: [], sorted: [], message: 'Choose an algorithm and start exploring.' };
    const metrics = step.metrics || sort.metrics;
    const meta = SORT_META[sort.algorithm];
    const compare = sort.comparison;
    const compareMarkup = compare ? `<section class="compare-panel"><div class="compare-head"><div><h3>Algorithm comparison</h3><p>Same input array · measured as educational operation counts</p></div><button class="btn" data-action="close-compare" type="button">Close</button></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Algorithm</th><th>Comparisons</th><th>Writes</th><th>Swaps</th><th>Time complexity (average)</th></tr></thead><tbody>${compare.rows.map((row) => `<tr><td><strong>${SORT_META[row.algorithm].name}</strong></td><td class="mono ${row.comparisons === compare.minComparisons ? 'best-cell' : ''}">${row.comparisons.toLocaleString()}</td><td class="mono">${row.writes.toLocaleString()}</td><td class="mono">${row.swaps.toLocaleString()}</td><td class="mono">${SORT_META[row.algorithm].average}</td></tr>`).join('')}</tbody></table></div><div class="callout" style="margin-top:12px"><strong>How to read this:</strong> Comparison counts describe this exact input and implementation. Browser timing is intentionally not used to rank algorithms because short runs are affected by device and scheduling noise.</div></section>` : '';
    return `<div class="workbench">${sortControls()}<div class="visual-column">
      <section class="visual-panel"><div class="visual-header"><div><h3>${meta.name} visualization</h3><p>Watch values move into their final positions, one operation at a time.</p></div><span class="status-pill ${step.kind === 'done' ? '' : 'neutral'}">${step.kind === 'done' ? '✓ Complete' : 'LIVE SIMULATION'}</span></div>
        ${renderBars(step.array, step)}
        <div class="legend"><span class="legend-item"><i class="legend-dot"></i> Unsorted</span><span class="legend-item"><i class="legend-dot active"></i> Comparing / moving</span><span class="legend-item"><i class="legend-dot pivot"></i> Pivot</span><span class="legend-item"><i class="legend-dot sorted"></i> Sorted</span></div>
        ${playbackMarkup(sort)}
        <div class="step-description" role="status" aria-live="polite"><strong>Step ${sort.index + 1}:</strong> ${escapeHTML(step.message || 'Ready to begin.')}</div>
      </section>
      <div class="metrics-grid">${metricCard('Comparisons', (metrics.comparisons || 0).toLocaleString(), 'Value checks')}${metricCard('Swaps', (metrics.swaps || 0).toLocaleString(), 'Pair exchanges')}${metricCard('Writes', (metrics.writes || 0).toLocaleString(), 'Array updates')}${metricCard('Input size', sort.values.length, 'Array elements')}</div>
      <div class="info-grid">${codePanel(SORT_CODE[sort.algorithm], step.line)}${complexityPanel([['Best', meta.best], ['Average', meta.average], ['Worst', meta.worst], ['Extra space', meta.space]])}</div>
      ${compareMarkup}
    </div></div>`;
  }

  function createSearchRun(algorithm, values, target) {
    const source = [...values];
    const arr = algorithm === 'binary' ? [...source].sort((a, b) => a - b) : source;
    const steps = [];
    const metrics = { comparisons: 0 };
    const record = (message, active, low, high, foundIndex = -1, line = -1) => steps.push({ array: [...arr], active: active >= 0 ? [active] : [], low, high, found: foundIndex >= 0, foundIndex, message, metrics: { ...metrics }, line });
    if (algorithm === 'linear') {
      record('Start at the first element and scan from left to right.', -1, 0, arr.length - 1, -1, 0);
      for (let i = 0; i < arr.length; i++) {
        metrics.comparisons += 1;
        if (arr[i] === target) { record(`Found ${target} at index ${i}.`, i, i, i, i, 2); break; }
        record(`${arr[i]} is not ${target}. Move to the next index.`, i, i + 1, arr.length - 1, -1, 1);
      }
      if (!steps.some((step) => step.found)) record(`${target} is not present in this array.`, -1, arr.length, arr.length - 1, -1, 3);
    } else {
      let low = 0, high = arr.length - 1, found = false;
      record(`Search the sorted array for ${target}.`, -1, low, high, -1, 0);
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        metrics.comparisons += 1;
        if (arr[mid] === target) { record(`Found ${target} at index ${mid}.`, mid, low, high, mid, 3); found = true; break; }
        if (arr[mid] < target) { record(`${arr[mid]} is smaller than ${target}. Discard the left half.`, mid, low, high, -1, 1); low = mid + 1; }
        else { record(`${arr[mid]} is larger than ${target}. Discard the right half.`, mid, low, high, -1, 2); high = mid - 1; }
      }
      if (!found) record(`${target} is not present in this array.`, -1, low, high, -1, 4);
    }
    return { values: arr, steps, metrics };
  }

  function refreshSearch() {
    stopPlayback();
    state.searching.notice = state.searching.algorithm === 'binary' && state.searching.values.some((value, index) => index > 0 && state.searching.values[index - 1] > value)
      ? 'The input is not sorted. Binary Search will use a sorted working copy.' : '';
    const run = createSearchRun(state.searching.algorithm, state.searching.values, state.searching.target);
    state.searching.displayValues = run.values;
    state.searching.steps = run.steps;
    state.searching.index = 0;
    state.searching.metrics = run.metrics;
  }

  function renderSearch() {
    const search = state.searching;
    const step = search.steps[search.index] || { array: search.values, active: [], low: 0, high: search.values.length - 1, message: 'Set a target value and run the search.', metrics: { comparisons: 0 } };
    const isBinary = search.algorithm === 'binary';
    const array = search.displayValues || search.values;
    const meta = isBinary ? { name: 'Binary Search', best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' } : { name: 'Linear Search', best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' };
    return `<div class="workbench"><aside class="control-panel"><div class="panel-title">Configure your search <small>02 / SEARCHING</small></div>
      <div class="field"><label for="search-algorithm">Search algorithm</label><select id="search-algorithm" data-action="set-search-algorithm"><option value="linear" ${!isBinary ? 'selected' : ''}>Linear Search</option><option value="binary" ${isBinary ? 'selected' : ''}>Binary Search</option></select><span class="hint">${isBinary ? 'Repeatedly halves a sorted search range.' : 'Checks each element until a match is found or the list ends.'}</span></div>
      <div class="field"><label for="search-values">Input values</label><textarea id="search-values" spellcheck="false">${search.values.join(', ')}</textarea><span class="hint">Up to 50 whole numbers. Binary Search uses a sorted working copy.</span></div>
      <div class="field"><label for="search-target">Target value</label><input id="search-target" type="number" step="1" value="${search.target}"><span class="hint">Enter the integer you want to find.</span></div>
      <div class="button-row"><button class="btn primary" type="button" data-action="run-search">Run search</button><button class="btn" type="button" data-action="reset-search">Reset</button></div>
      ${search.notice ? `<div class="notice">${escapeHTML(search.notice)}</div>` : ''}
      <div class="callout"><strong>Important:</strong> Binary Search only works on ordered data. Your original input is preserved; the displayed working copy is sorted before the search.</div>
    </aside><div class="visual-column"><section class="visual-panel"><div class="visual-header"><div><h3>${meta.name} visualization</h3><p>Follow the search range and see which index is checked next.</p></div><span class="status-pill ${step.found ? '' : 'neutral'}">${step.found ? '✓ Target found' : 'SEARCH TRACE'}</span></div>
      ${renderBars(step.array || array, step, { search: true })}
      <div class="legend"><span class="legend-item"><i class="legend-dot"></i> Remaining range</span><span class="legend-item"><i class="legend-dot active"></i> Current check</span><span class="legend-item"><i class="legend-dot sorted"></i> Match found</span></div>
      ${playbackMarkup(search)}<div class="step-description" role="status" aria-live="polite"><strong>Step ${search.index + 1}:</strong> ${escapeHTML(step.message || 'Ready to search.')}</div></section>
      <div class="metrics-grid">${metricCard('Comparisons', (step.metrics?.comparisons || 0).toLocaleString(), 'Target checks')}${metricCard('Target', search.target, 'Value requested')}${metricCard('Array size', array.length, 'Elements')}${metricCard('Result', step.found ? `Index ${step.foundIndex}` : (search.steps.length && search.index === search.steps.length - 1 ? 'Not found' : 'Pending'), 'Zero-based index')}</div>
      <div class="info-grid">${codePanel(isBinary ? ['low = 0; high = n - 1', 'while low <= high:', '  mid = floor((low + high) / 2)', '  if array[mid] < target: low = mid + 1', '  else if array[mid] > target: high = mid - 1', '  else: return mid'] : ['for each index i from 0 to n - 1:', '  compare array[i] with target', '  if they are equal:', '    return i', 'return not found'], step.line)}${complexityPanel([['Best', meta.best], ['Average', meta.average], ['Worst', meta.worst], ['Extra space', meta.space]])}</div>
    </div></div>`;
  }

  function makeGraphRun(algorithm, start, goal) {
    const adj = Object.fromEntries(GRAPH_NODES.map((node) => [node.id, []]));
    GRAPH_EDGES.forEach(([a, b, weight]) => { adj[a].push({ to: b, weight }); adj[b].push({ to: a, weight }); });
    Object.values(adj).forEach((list) => list.sort((a, b) => a.to.localeCompare(b.to)));
    const steps = [];
    const metrics = { visits: 0, relaxations: 0 };
    const visited = new Set(); const parent = {}; const distances = Object.fromEntries(GRAPH_NODES.map(({ id }) => [id, Infinity]));
    const record = (message, current = '', frontier = [], kind = 'visit') => steps.push({ message, current, frontier: [...frontier], visited: [...visited], distances: { ...distances }, parent: { ...parent }, metrics: { ...metrics }, kind });
    distances[start] = 0;
    if (algorithm === 'bfs' || algorithm === 'dfs') {
      const frontier = [start];
      record(`${algorithm === 'bfs' ? 'Breadth-first' : 'Depth-first'} search starts at node ${start}.`, '', frontier, 'start');
      while (frontier.length) {
        const node = algorithm === 'bfs' ? frontier.shift() : frontier.pop();
        if (visited.has(node)) continue;
        visited.add(node); metrics.visits += 1;
        record(`Visit node ${node}.`, node, frontier, 'current');
        if (node === goal) break;
        const neighbors = [...adj[node]];
        if (algorithm === 'dfs') neighbors.reverse();
        for (const edge of neighbors) {
          if (!visited.has(edge.to) && !frontier.includes(edge.to)) {
            frontier.push(edge.to); parent[edge.to] = node;
            record(`Add neighbor ${edge.to} to the ${algorithm === 'bfs' ? 'queue' : 'stack'}.`, node, frontier, 'frontier');
          }
        }
      }
    } else {
      const remaining = new Set(GRAPH_NODES.map(({ id }) => id));
      record(`Dijkstra's algorithm starts at ${start} with distance 0.`, '', [...remaining], 'start');
      while (remaining.size) {
        let current = '';
        for (const id of remaining) if (!current || distances[id] < distances[current]) current = id;
        if (!current || distances[current] === Infinity) break;
        remaining.delete(current); visited.add(current); metrics.visits += 1;
        record(`Select ${current}, the unvisited node with the smallest known distance (${distances[current]}).`, current, [...remaining], 'current');
        if (current === goal) break;
        for (const edge of adj[current]) {
          if (!remaining.has(edge.to)) continue;
          const candidate = distances[current] + edge.weight;
          metrics.relaxations += 1;
          if (candidate < distances[edge.to]) {
            distances[edge.to] = candidate; parent[edge.to] = current;
            record(`Update distance to ${edge.to}: ${candidate} via ${current}.`, current, [...remaining], 'relax');
          } else {
            record(`Keep the existing distance to ${edge.to}; ${candidate} is not shorter.`, current, [...remaining], 'check');
          }
        }
      }
    }
    const path = [];
    if (start === goal) path.push(start);
    else if (parent[goal]) {
      let cursor = goal; path.push(cursor);
      while (cursor !== start && parent[cursor]) { cursor = parent[cursor]; path.push(cursor); }
      if (path[path.length - 1] === start) path.reverse(); else path.length = 0;
    }
    const finalMetric = algorithm === 'dijkstra' ? distances[goal] : path.length;
    record(path.length ? `Path found: ${path.join(' → ')}${algorithm === 'dijkstra' ? ` (total weight ${finalMetric}).` : '.'}` : `Search finished. ${goal} was not reached from ${start}.`, '', [], 'done');
    steps[steps.length - 1].path = path;
    steps[steps.length - 1].goalDistance = distances[goal];
    return { steps, metrics };
  }

  function refreshGraph() {
    stopPlayback();
    const run = makeGraphRun(state.graphs.algorithm, state.graphs.start, state.graphs.goal);
    state.graphs.steps = run.steps; state.graphs.index = 0; state.graphs.metrics = run.metrics;
  }

  function renderGraphSvg(step) {
    const positions = Object.fromEntries(GRAPH_NODES.map((node) => [node.id, node]));
    const path = step.path || [];
    const pathEdges = new Set(path.slice(1).map((id, index) => [path[index], id].sort().join('-')));
    const visited = new Set(step.visited || []); const frontier = new Set(step.frontier || []);
    const edges = GRAPH_EDGES.map(([a, b, weight]) => {
      const p1 = positions[a], p2 = positions[b];
      const key = [a, b].sort().join('-');
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      return `<g><line class="edge ${pathEdges.has(key) ? 'path' : ''}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/><rect x="${mx - 12}" y="${my - 10}" width="24" height="18" rx="6" fill="var(--surface-2)"/><text class="edge-label" x="${mx}" y="${my + 3}" text-anchor="middle">${weight}</text></g>`;
    }).join('');
    const nodes = GRAPH_NODES.map((node) => {
      const cls = [visited.has(node.id) ? 'visited' : '', frontier.has(node.id) ? 'frontier' : '', step.current === node.id ? 'current' : '', path.includes(node.id) ? 'path' : ''].filter(Boolean).join(' ');
      const distance = Number.isFinite(step.distances?.[node.id]) ? step.distances[node.id] : '∞';
      return `<g class="node ${cls}"><circle cx="${node.x}" cy="${node.y}" r="23"/><text x="${node.x}" y="${node.y}">${node.id}</text><text x="${node.x}" y="${node.y + 39}" style="font:10px var(--mono);fill:var(--muted)">${state.graphs.algorithm === 'dijkstra' ? distance : ''}</text></g>`;
    }).join('');
    return `<svg class="graph-stage" viewBox="0 0 800 315" role="img" aria-label="Undirected weighted graph with seven nodes A through G">${edges}${nodes}</svg>`;
  }

  function renderGraphs() {
    const graph = state.graphs;
    const step = graph.steps[graph.index] || { message: 'Choose an algorithm and run the sample graph.', visited: [], frontier: [], distances: {}, parent: {}, metrics: {} };
    const dijkstra = graph.algorithm === 'dijkstra';
    return `<div class="workbench"><aside class="control-panel"><div class="panel-title">Explore a graph <small>03 / GRAPHS</small></div>
      <div class="field"><label for="graph-algorithm">Graph algorithm</label><select id="graph-algorithm" data-action="set-graph-algorithm"><option value="bfs" ${graph.algorithm === 'bfs' ? 'selected' : ''}>Breadth-first Search (BFS)</option><option value="dfs" ${graph.algorithm === 'dfs' ? 'selected' : ''}>Depth-first Search (DFS)</option><option value="dijkstra" ${dijkstra ? 'selected' : ''}>Dijkstra's Shortest Path</option></select><span class="hint">${dijkstra ? 'Finds a minimum-weight path using non-negative edge weights.' : graph.algorithm === 'bfs' ? 'Explores neighbors level by level using a queue.' : 'Explores one branch deeply before backtracking.'}</span></div>
      <div class="inline-field"><div class="field"><label for="graph-start">Start node</label><select id="graph-start" data-action="set-graph-start">${GRAPH_NODES.map(({ id }) => `<option ${graph.start === id ? 'selected' : ''}>${id}</option>`).join('')}</select></div><div class="field"><label for="graph-goal">Goal node</label><select id="graph-goal" data-action="set-graph-goal">${GRAPH_NODES.map(({ id }) => `<option ${graph.goal === id ? 'selected' : ''}>${id}</option>`).join('')}</select></div></div>
      <div class="button-row"><button class="btn primary" type="button" data-action="run-graph">Run algorithm</button><button class="btn" type="button" data-action="reset-graph">Reset</button></div>
      <div class="callout"><strong>Sample graph:</strong> Seven nodes with undirected, non-negative weighted edges. Edge labels show weights. BFS and DFS ignore weights; Dijkstra uses them.</div>
      <div class="tiny-note">Dijkstra's algorithm is not suitable for graphs with negative edge weights. This sample contains only positive weights.</div>
    </aside><div class="visual-column"><section class="visual-panel"><div class="visual-header"><div><h3>${dijkstra ? "Dijkstra's shortest path" : graph.algorithm === 'bfs' ? 'Breadth-first search' : 'Depth-first search'}</h3><p>Start at ${graph.start}, explore toward ${graph.goal}.</p></div><span class="status-pill neutral">GRAPH TRAVERSAL</span></div>
      ${renderGraphSvg(step)}<div class="graph-state"><span><i class="g-current"></i> Current node</span><span><i class="g-frontier"></i> Frontier</span><span><i class="g-visited"></i> Visited</span><span><i class="g-path"></i> Final path</span></div>
      ${playbackMarkup(graph)}<div class="step-description" role="status" aria-live="polite"><strong>Step ${graph.index + 1}:</strong> ${escapeHTML(step.message || '')}</div></section>
      <div class="metrics-grid">${metricCard('Visited nodes', (step.metrics?.visits || 0).toLocaleString(), 'Nodes processed')}${metricCard('Relaxations', (step.metrics?.relaxations || 0).toLocaleString(), 'Edge checks')}${metricCard('Frontier size', (step.frontier || []).length, 'Pending nodes')}${metricCard('Goal', graph.goal, dijkstra && Number.isFinite(step.goalDistance) ? `Weight ${step.goalDistance}` : 'Target node')}</div>
      <div class="info-grid">${codePanel(dijkstra ? ['set distance[start] = 0', 'while an unvisited node remains:', '  choose the node with smallest distance', '  for each neighboring node:', '    relax edge if a shorter path is found', 'return shortest known path'] : graph.algorithm === 'bfs' ? ['queue = [start]', 'while queue is not empty:', '  node = queue.removeFirst()', '  visit node', '  add unvisited neighbors to queue'] : ['stack = [start]', 'while stack is not empty:', '  node = stack.removeLast()', '  if node is not visited:', '    visit node', '    push unvisited neighbors'], dijkstra ? (step.kind === 'start' ? 0 : step.kind === 'current' ? 2 : (step.kind === 'relax' || step.kind === 'check' ? 4 : -1)) : (step.kind === 'start' ? 0 : step.kind === 'current' ? 3 : step.kind === 'frontier' ? 4 : -1))}${complexityPanel(dijkstra ? [['Visualizer time', 'O(V² + E)'], ['Space', 'O(V)'], ['Weights', 'Non-negative']] : [['Time', 'O(V + E)'], ['Space', 'O(V)'], ['Uses', graph.algorithm === 'bfs' ? 'Queue' : 'Stack']])}</div>
      <div class="callout"><strong>Path note:</strong> ${dijkstra ? 'The highlighted path has the smallest total edge weight for this sample graph.' : 'The highlighted route is the traversal-tree route to the goal, not necessarily the lowest-weight path.'} This visualizer uses a simple scan to select the next node, giving O(V² + E) time. A min-priority queue can improve the standard implementation to O((V + E) log V).</div>
    </div></div>`;
  }

  function structureControls() {
    const type = state.structures.type;
    const isLinked = type === 'linked';
    return `<aside class="control-panel"><div class="panel-title">Choose a structure <small>04 / DATA STRUCTURES</small></div>
      <div class="field"><label for="structure-type">Data structure</label><select id="structure-type" data-action="set-structure-type"><option value="stack" ${type === 'stack' ? 'selected' : ''}>Stack (LIFO)</option><option value="queue" ${type === 'queue' ? 'selected' : ''}>Queue (FIFO)</option><option value="linked" ${isLinked ? 'selected' : ''}>Singly Linked List</option></select></div>
      <div class="field"><label for="structure-value">Value</label><input id="structure-value" type="number" step="1" value="99" placeholder="Enter an integer"></div>
      <div class="button-row">${type === 'stack' ? '<button class="btn primary" data-action="struct-push" type="button">＋ Push</button><button class="btn" data-action="struct-pop" type="button">− Pop</button>' : type === 'queue' ? '<button class="btn primary" data-action="struct-enqueue" type="button">＋ Enqueue</button><button class="btn" data-action="struct-dequeue" type="button">− Dequeue</button>' : '<button class="btn primary" data-action="struct-append" type="button">Append</button><button class="btn" data-action="struct-prepend" type="button">Prepend</button>'}</div>
      ${isLinked ? '<div class="field"><label for="delete-value">Delete / find value</label><input id="delete-value" type="number" step="1" value="24"><div class="button-row"><button class="btn" data-action="struct-delete" type="button">Delete first match</button><button class="btn" data-action="struct-find" type="button">Find</button></div></div>' : ''}
      <div class="small-divider"></div><div class="button-row"><button class="btn subtle" type="button" data-action="clear-structure">Clear structure</button><button class="btn" type="button" data-action="reset-structure">Restore sample</button></div>
      <div class="callout"><strong>${type === 'stack' ? 'LIFO' : type === 'queue' ? 'FIFO' : 'Sequential links'}:</strong> ${type === 'stack' ? 'Last In, First Out. Push and pop operate on the top.' : type === 'queue' ? 'First In, First Out. Enqueue at the rear and dequeue from the front.' : 'Each node stores a value and a reference to the next node.'}</div>
      <div class="tiny-note">This is an interactive model. Operations change the in-page structure only.</div>
    </aside>`;
  }

  function renderStructureView() {
    const { type, items, message } = state.structures;
    let visual = '';
    if (!items.length) visual = '<div class="structure-empty">The structure is empty. Add a value to begin.</div>';
    else if (type === 'stack') visual = `<div class="stack-stage">${items.map((value, index) => `<div class="struct-cell ${index === items.length - 1 ? 'stack-top' : ''}">${value}<small>${index === items.length - 1 ? 'TOP' : `ITEM ${index + 1}`}</small></div>`).join('')}</div>`;
    else if (type === 'queue') visual = `<div class="structure-stage">${items.map((value, index) => `${index ? '<span class="struct-arrow" aria-hidden="true">→</span>' : ''}<div class="struct-cell">${value}<small>${index === 0 ? 'FRONT' : index === items.length - 1 ? 'REAR' : `ITEM ${index + 1}`}</small></div>`).join('')}</div>`;
    else visual = `<div class="structure-stage">${items.map((value, index) => `${index ? '<span class="struct-arrow" aria-hidden="true">→</span>' : ''}<div class="struct-cell">${value}<small>NODE ${index + 1}</small></div>`).join('')}<span class="struct-arrow" aria-hidden="true">→</span><div class="struct-cell">∅<small>NULL</small></div></div>`;
    const title = type === 'stack' ? 'Stack visualizer' : type === 'queue' ? 'Queue visualizer' : 'Linked list visualizer';
    const complexity = type === 'linked' ? [['Prepend', 'O(1)'], ['Append*', 'O(n)'], ['Search', 'O(n)'], ['Delete*', 'O(n)']] : type === 'stack' ? [['Push', 'O(1)'], ['Pop', 'O(1)'], ['Peek', 'O(1)'], ['Search', 'O(n)']] : [['Enqueue', 'O(1)'], ['Dequeue', 'O(1)'], ['Front', 'O(1)'], ['Search', 'O(n)']];
    return `<div class="workbench">${structureControls()}<div class="visual-column"><section class="visual-panel"><div class="visual-header"><div><h3>${title}</h3><p>${items.length} element${items.length === 1 ? '' : 's'} currently stored.</p></div><span class="status-pill neutral">INTERACTIVE MODEL</span></div><div class="${type === 'stack' ? 'structure-stage' : ''}">${visual}</div><div class="operation-message"><strong>Last operation:</strong> ${escapeHTML(message)}</div></section>
      <div class="metrics-grid">${metricCard('Elements', items.length, 'Current size')}${metricCard('First value', items.length ? items[0] : '—', type === 'queue' ? 'Front' : type === 'linked' ? 'Head' : 'Bottom')}${metricCard('Last value', items.length ? items[items.length - 1] : '—', type === 'queue' ? 'Rear' : type === 'linked' ? 'Tail' : 'Top')}${metricCard('Storage', 'Dynamic', 'Conceptual model')}</div>
      <div class="info-grid">${codePanel(type === 'stack' ? ['push(value):', '  add value to the top', '', 'pop():', '  remove and return the top value'] : type === 'queue' ? ['enqueue(value):', '  add value at the rear', '', 'dequeue():', '  remove and return the front value'] : ['append(value):', '  create a new node', '  connect the current tail to it', '', 'search(value):', '  follow next references until found'], -1)}${complexityPanel(complexity)}</div>
      ${type === 'linked' ? '<div class="callout"><strong>*Implementation detail:</strong> This model stores nodes in a JavaScript array for clarity. In a pointer-based singly linked list, append is O(n) without a tail reference and O(1) with one; deleting a value still requires locating its previous node.</div>' : ''}
    </div></div>`;
  }

  function setView(view) {
    if (!['sorting', 'searching', 'graphs', 'structures'].includes(view)) return;
    stopPlayback(); state.view = view;
    if (view === 'sorting' && !state.sorting.steps.length) refreshSorting();
    if (view === 'searching' && !state.searching.steps.length) refreshSearch();
    if (view === 'graphs' && !state.graphs.steps.length) refreshGraph();
    $$('.workspace-tab').forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle('is-active', active);
      if (active) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    });
    renderWorkspace();
  }

  function renderWorkspace() {
    const workspace = $('#workspace');
    if (!workspace) return;
    workspace.setAttribute('aria-busy', 'false');
    if (state.view === 'sorting') workspace.innerHTML = renderSort();
    else if (state.view === 'searching') workspace.innerHTML = renderSearch();
    else if (state.view === 'graphs') workspace.innerHTML = renderGraphs();
    else workspace.innerHTML = renderStructureView();
  }

  function applySortValues() {
    try {
      const values = parseIntegerList($('#sort-values')?.value || '');
      state.sorting.values = values; refreshSorting(); renderWorkspace();
    } catch (error) { showNotice(error.message, 'sort-values'); }
  }

  function showNotice(message, fieldId) {
    const field = fieldId ? document.getElementById(fieldId) : null;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    window.alert(message);
  }

  function randomArray(size = state.sorting.values.length) {
    return Array.from({ length: clamp(size, 5, 50) }, () => Math.floor(Math.random() * 96) + 4);
  }

  function applySearchValues() {
    try {
      const values = parseIntegerList($('#search-values')?.value || '');
      const targetText = $('#search-target')?.value ?? '';
      if (targetText.trim() === '' || !Number.isSafeInteger(Number(targetText))) throw new Error('Enter a valid whole-number target.');
      const target = Number(targetText);
      if (Math.abs(target) > 999999) throw new Error('Use a target between −999,999 and 999,999.');
      state.searching.values = values; state.searching.target = target;
      state.searching.notice = state.searching.algorithm === 'binary' && values.some((value, index) => index > 0 && values[index - 1] > value) ? 'The input is not sorted. Binary Search will use a sorted working copy.' : '';
      refreshSearch(); renderWorkspace();
    } catch (error) { showNotice(error.message, 'search-values'); }
  }

  function applyStructureAction(action) {
    const model = state.structures;
    const valueInput = $('#structure-value');
    const value = valueInput && valueInput.value.trim() !== '' ? Number(valueInput.value) : NaN;
    const validValue = Number.isSafeInteger(value) && Math.abs(value) <= 999999;
    const maxSize = 25;
    const requireValue = ['struct-push', 'struct-enqueue', 'struct-append', 'struct-prepend'].includes(action);
    if (requireValue && !validValue) { showNotice('Enter a whole number between −999,999 and 999,999.', 'structure-value'); return; }
    if (requireValue && model.items.length >= maxSize) { showNotice(`This visualizer supports up to ${maxSize} nodes at a time.`); return; }
    if (action === 'struct-push') { model.items.push(value); model.message = `Pushed ${value} onto the stack.`; }
    else if (action === 'struct-pop') { model.message = model.items.length ? `Popped ${model.items.pop()} from the top.` : 'Cannot pop: the stack is empty.'; }
    else if (action === 'struct-enqueue') { model.items.push(value); model.message = `Enqueued ${value} at the rear of the queue.`; }
    else if (action === 'struct-dequeue') { model.message = model.items.length ? `Dequeued ${model.items.shift()} from the front.` : 'Cannot dequeue: the queue is empty.'; }
    else if (action === 'struct-append') { model.items.push(value); model.message = `Appended ${value} as the new tail node.`; }
    else if (action === 'struct-prepend') { model.items.unshift(value); model.message = `Prepended ${value} as the new head node.`; }
    else if (action === 'struct-delete') {
      const target = Number($('#delete-value')?.value);
      if (!Number.isSafeInteger(target)) model.message = 'Enter a valid whole number to delete.';
      else { const index = model.items.indexOf(target); if (index < 0) model.message = `${target} was not found; no node was removed.`; else { model.items.splice(index, 1); model.message = `Deleted the first node containing ${target}.`; } }
    } else if (action === 'struct-find') {
      const target = Number($('#delete-value')?.value); const index = model.items.indexOf(target);
      model.message = index < 0 ? `${target} was not found in the list.` : `Found ${target} at position ${index + 1} (zero-based index ${index}).`;
    }
    renderWorkspace();
  }

  function handleClick(event) {
    const tab = event.target.closest('[data-view]');
    if (tab) { setView(tab.dataset.view); return; }
    const presetButton = event.target.closest('[data-preset]');
    if (presetButton) {
      const values = [...state.sorting.values];
      if (presetButton.dataset.preset === 'sorted') values.sort((a, b) => a - b);
      if (presetButton.dataset.preset === 'reversed') values.sort((a, b) => b - a);
      if (presetButton.dataset.preset === 'duplicates') { const pool = [5, 10, 15, 20, 25, 30]; for (let i = 0; i < values.length; i++) values[i] = pool[Math.floor(Math.random() * pool.length)]; }
      state.sorting.values = values; refreshSorting(); renderWorkspace(); return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'toggle-theme') {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = state.theme;
      try { localStorage.setItem('pankri-algorithm-lab-theme', state.theme); } catch (_) { /* Theme still works for this session. */ }
      const icon = $('.theme-icon'); if (icon) icon.textContent = state.theme === 'dark' ? '☀' : '☾';
    } else if (action === 'apply-sort-values') applySortValues();
    else if (action === 'random-sort-values') { state.sorting.values = randomArray(); refreshSorting(); renderWorkspace(); }
    else if (action === 'reset-sort') { refreshSorting(); renderWorkspace(); }
    else if (action === 'compare-sort') { compareSorting(); renderWorkspace(); }
    else if (action === 'close-compare') { state.sorting.comparison = null; renderWorkspace(); }
    else if (action === 'step-back') { stopPlayback(); moveStep(-1); }
    else if (action === 'step-forward') { stopPlayback(); moveStep(1); }
    else if (action === 'toggle-play') startPlayback();
    else if (action === 'run-search') applySearchValues();
    else if (action === 'reset-search') { refreshSearch(); renderWorkspace(); }
    else if (action === 'run-graph') { refreshGraph(); renderWorkspace(); }
    else if (action === 'reset-graph') { state.graphs.algorithm = 'dijkstra'; state.graphs.start = 'A'; state.graphs.goal = 'G'; refreshGraph(); renderWorkspace(); }
    else if (action.startsWith('struct-')) applyStructureAction(action);
    else if (action === 'clear-structure') { state.structures.items = []; state.structures.message = 'Structure cleared.'; renderWorkspace(); }
    else if (action === 'reset-structure') { state.structures.items = [12, 24, 36]; state.structures.message = 'Sample structure restored.'; renderWorkspace(); }
  }

  function handleChange(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action) return;
    if (action === 'set-sort-algorithm') { state.sorting.algorithm = target.value; refreshSorting(); renderWorkspace(); }
    else if (action === 'sort-size') {
      const size = Number(target.value); state.sorting.values = randomArray(size); refreshSorting(); renderWorkspace();
    } else if (action === 'set-search-algorithm') { state.searching.algorithm = target.value; refreshSearch(); renderWorkspace(); }
    else if (action === 'set-graph-algorithm') { state.graphs.algorithm = target.value; refreshGraph(); renderWorkspace(); }
    else if (action === 'set-graph-start') { state.graphs.start = target.value; refreshGraph(); renderWorkspace(); }
    else if (action === 'set-graph-goal') { state.graphs.goal = target.value; refreshGraph(); renderWorkspace(); }
    else if (action === 'set-structure-type') { state.structures.type = target.value; state.structures.message = `${target.options[target.selectedIndex].text} selected.`; renderWorkspace(); }
    else if (action === 'set-speed') { state.speed = Number(target.value); if (state.playing) { stopPlayback(); startPlayback(); } }
    else if (action === 'scrub') { stopPlayback(); const run = getActiveRun(); if (run) { run.index = Number(target.value); renderWorkspace(); } }
  }

  function handleInput(event) {
    if (event.target.id === 'sort-size-label') return;
    if (event.target.id === 'sort-size') { const label = $('#sort-size-label'); if (label) label.textContent = event.target.value; }
  }

  function init() {
    try {
      const savedTheme = localStorage.getItem('pankri-algorithm-lab-theme');
      if (savedTheme === 'dark' || savedTheme === 'light') state.theme = savedTheme;
    } catch (_) { /* Continue with the default theme. */ }
    document.documentElement.dataset.theme = state.theme;
    const icon = $('.theme-icon'); if (icon) icon.textContent = state.theme === 'dark' ? '☀' : '☾';
    refreshSorting(); refreshSearch(); refreshGraph();
    const requestedView = new URLSearchParams(window.location.search).get('view');
    if (requestedView && ['sorting', 'searching', 'graphs', 'structures'].includes(requestedView)) state.view = requestedView;
    renderWorkspace();
    $$('.workspace-tab').forEach((tab) => { const active = tab.dataset.view === state.view; tab.classList.toggle('is-active', active); if (active) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current'); });
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) { stopPlayback(); renderWorkspace(); } });
  }

  init();
})();
