document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Allocation sliders: animate based on data-alloc
  var rows = document.querySelectorAll('.alloc-row');
  if (rows && rows.length) {
    rows.forEach(function (row) {
      var target = clampPercent(parseFloat(row.getAttribute('data-alloc')) || 0);
      animateRow(row, target, 900);
      enableAllocDragging(row);
    });
  }

  // Render Historical Performance chart (Chart.js)
  var hp = document.getElementById('hpGraph');
  if (hp) {
    renderHpChartJS(hp);
  }

  // Render donut charts (Chart.js)
  var donuts = document.querySelectorAll('.fd-chart.donut');
  if (donuts.length) {
    donuts.forEach(function (el) { renderDonutJS(el); });
    window.addEventListener('resize', function () { donuts.forEach(function (el) { renderDonutJS(el); }); });
  }

  // Accordion toggles (Risks section)
  var accToggles = document.querySelectorAll('.acc-toggle');
  if (accToggles.length) {
    accToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc-item');
        var isOpen = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }
});


// Public API to update allocation values programmatically
// Example: window.setPortfolioAllocation({ taiwan: 55, singapore: 25, california: 20 })
window.setPortfolioAllocation = function setPortfolioAllocation(map) {
  if (!map) return;
  Object.keys(map).forEach(function (key) {
    var row = document.querySelector('.alloc-row[data-key="' + key + '"]');
    if (!row) return;
    var value = clampPercent(map[key]);
    animateRow(row, value, 800);
  });
};

function clampPercent(n) {
  var num = Number(n);
  if (Number.isNaN(num)) return 0;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return num;
}

function animateRow(row, targetPercent, durationMs) {
  var fill = row.querySelector('.alloc-fill');
  var marker = row.querySelector('.alloc-marker');
  var bubble = row.querySelector('.alloc-bubble');
  if (!fill || !marker || !bubble) return;

  // Smooth animation using requestAnimationFrame
  var start = null;
  var startPercent = parseFloat(fill.style.width) || 0;
  var delta = targetPercent - startPercent;
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  function step(ts) {
    if (start === null) start = ts;
    var elapsed = ts - start;
    var t = Math.min(1, elapsed / (durationMs || 800));
    var eased = startPercent + delta * easeOutCubic(t);
    var pct = Math.max(0, Math.min(100, eased));
    fill.style.width = pct + '%';
    marker.style.left = pct + '%';
    bubble.textContent = Math.round(pct) + '%';
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Immediate, non-animated set for drag updates
function setRowPercent(row, percent) {
  var fill = row.querySelector('.alloc-fill');
  var marker = row.querySelector('.alloc-marker');
  var bubble = row.querySelector('.alloc-bubble');
  if (!fill || !marker || !bubble) return;
  var pct = clampPercent(percent);
  fill.style.width = pct + '%';
  marker.style.left = pct + '%';
  bubble.textContent = Math.round(pct) + '%';
}

// Enable pointer-based dragging on allocation sliders
function enableAllocDragging(row) {
  var slider = row.querySelector('.alloc-slider');
  var marker = row.querySelector('.alloc-marker');
  if (!slider || !marker) return;

  var isDragging = false;

  function percentFromPointer(ev) {
    var rect = slider.getBoundingClientRect();
    var x = (ev.clientX !== undefined) ? ev.clientX : 0;
    // Fallback for touch events if pointer events are not supported
    if (x === 0 && ev.touches && ev.touches[0]) x = ev.touches[0].clientX;
    var pct = ((x - rect.left) / rect.width) * 100;
    return clampPercent(pct);
  }

  function startDrag(ev) {
    isDragging = true;
    try { slider.setPointerCapture && slider.setPointerCapture(ev.pointerId); } catch (_) {}
    row.classList.add('dragging');
    setRowPercent(row, percentFromPointer(ev));
    row.setAttribute('data-alloc', String(Math.round(percentFromPointer(ev))));
    ev.preventDefault();
  }

  function moveDrag(ev) {
    if (!isDragging) return;
    setRowPercent(row, percentFromPointer(ev));
    row.setAttribute('data-alloc', String(Math.round(percentFromPointer(ev))));
    ev.preventDefault();
  }

  function endDrag(ev) {
    if (!isDragging) return;
    isDragging = false;
    try { slider.releasePointerCapture && slider.releasePointerCapture(ev.pointerId); } catch (_) {}
    row.classList.remove('dragging');
    ev.preventDefault();
  }

  // Pointer Events (covers mouse + touch on modern browsers)
  slider.addEventListener('pointerdown', startDrag);
  marker.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
}

// ----- Historical Performance Chart -----
function readHpData(container) {
  var max = parseFloat(container.getAttribute('data-max')) || 12; // percent
  var items = container.querySelectorAll('.hp-data span');
  var points = [];
  items.forEach(function (el) {
    points.push({
      label: el.getAttribute('data-label') || '',
      bar: parseFloat(el.getAttribute('data-bar')) || 0,
      line: parseFloat(el.getAttribute('data-line')) || 0,
    });
  });
  return { max: max, points: points };
}

// Replace custom SVG chart with Chart.js combo (bar + line)
function renderHpChartJS(container) {
  var data = readHpData(container);
  var labels = data.points.map(function (p) { return p.label; });
  var bars = data.points.map(function (p) { return p.bar; });
  var line = data.points.map(function (p) { return p.line; });
  container.innerHTML = '';
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var chart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Return %', data: bars, backgroundColor: '#1f7a2f', borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.8 },
        { type: 'line', label: 'Trend %', data: line, borderColor: '#0a2540', backgroundColor: 'rgba(10,37,64,0.1)', borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#2aa84a', pointBorderWidth: 3, tension: 0.35, yAxisID: 'y' }
      ]
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { drawOnChartArea: true } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
  });
  container._chart = chart;
}

function positionTooltip(el, x, y) {
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

// Public API to update chart dynamically
window.setHistoricalPerformanceData = function setHistoricalPerformanceData(data) {
  var container = document.getElementById('hpGraph');
  if (!container || !container._chart) return;
  var ds = (data && data.points) || [];
  container._chart.data.labels = ds.map(function (p) { return p.label; });
  container._chart.data.datasets[0].data = ds.map(function (p) { return p.bar; });
  container._chart.data.datasets[1].data = ds.map(function (p) { return p.line; });
  container._chart.update();
};

// ----- Donut charts -----
function renderDonut(container) {
  var specRaw = container.getAttribute('data-donut');
  if (!specRaw) return;
  var spec;
  try { spec = JSON.parse(specRaw); } catch (e) { return; }
  var segments = spec.segments || [];
  var sum = segments.reduce(function (s, p) { return s + Number(p.value || 0); }, 0);
  var total = (spec.total === undefined || spec.total === null) ? sum : Number(spec.total);
  if (!segments.length || !total) return;

  container.innerHTML = '';
  var w = container.clientWidth;
  var h = container.clientHeight;
  var size = Math.min(w, h);
  // 70% ring thickness: inner radius is 30% of outer radius
  var thicknessRatio = 0.70; // 0..1, portion of radius taken by ring
  var outerR = size * 0.50;
  var innerR = Math.max(1, outerR * (1 - thicknessRatio));
  var cx = w / 2;
  var cy = h / 2;
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

  var start = -Math.PI / 2; // start at top
  segments.forEach(function (seg) {
    var angle = (seg.value / total) * Math.PI * 2;
    var end = start + angle;
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('fill', seg.color || '#2aa84a');
    // Subtle separation between segments
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', String(Math.max(2, size * 0.01)));
    path.setAttribute('d', donutSegmentPath(cx, cy, innerR, outerR, start, end));
    svg.appendChild(path);
    start = end;
  });

  // center hole for crispness
  var center = document.createElementNS(svgNS, 'circle');
  center.setAttribute('cx', cx);
  center.setAttribute('cy', cy);
  center.setAttribute('r', innerR * 0.92);
  center.setAttribute('fill', '#fff');
  svg.appendChild(center);

  // labels: prefer inside ring
  var curr = -Math.PI / 2;
  var ringWidth = outerR - innerR;
  var fontSize = Math.max(10, Math.min(ringWidth * 0.55, size * 0.14));
  segments.forEach(function (seg) {
    var ang = (seg.value / total) * Math.PI * 2;
    var mid = curr + ang / 2;
    var rLabel = (innerR + outerR) / 2;
    var lx = cx + rLabel * Math.cos(mid);
    var ly = cy + rLabel * Math.sin(mid);
    var text = document.createElementNS(svgNS, 'text');
    text.textContent = seg.text || seg.label || String(seg.value);
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('font-weight', '700');
    text.setAttribute('paint-order', 'stroke');
    text.setAttribute('stroke', 'rgba(0,0,0,0.25)');
    text.setAttribute('stroke-width', '2');
    svg.appendChild(text);
    curr += ang;
  });

  container.appendChild(svg);
}

// Chart.js doughnut replacement
function renderDonutJS(container) {
  var specRaw = container.getAttribute('data-donut');
  if (!specRaw) return;
  var spec; try { spec = JSON.parse(specRaw); } catch (e) { return; }
  var segments = spec.segments || [];
  var sum = segments.reduce(function (s, p) { return s + Number(p.value || 0); }, 0);
  var total = (spec.total === undefined || spec.total === null) ? sum : Number(spec.total);
  if (!segments.length || !total) return;

  container.innerHTML = '';
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);

  var labels = segments.map(function (s) { return s.label || ''; });
  var values = segments.map(function (s) { return Number(s.value || 0); });
  var colors = segments.map(function (s) { return s.color || '#2aa84a'; });

  var chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false } } }
  });
  container._chart = chart;
}

