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
    });
  }

  // Render Historical Performance chart if present
  var hp = document.getElementById('hpGraph');
  if (hp) {
    var data = readHpData(hp);
    renderHpChart(hp, data);
  }

  // Render donut charts
  var donuts = document.querySelectorAll('.fd-chart.donut');
  if (donuts.length) {
    donuts.forEach(function (el) { renderDonut(el); });
    window.addEventListener('resize', function () { donuts.forEach(function (el) { renderDonut(el); }); });
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

function renderHpChart(container, dataset) {
  // Clear
  container.innerHTML = '';

  var width = container.clientWidth;
  var height = container.clientHeight;
  var padding = { top: 20, right: 20, bottom: 36, left: 36 };
  var w = Math.max(300, width);
  var h = Math.max(200, height);
  var innerW = w - padding.left - padding.right;
  var innerH = h - padding.top - padding.bottom;

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

  var g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', 'translate(' + padding.left + ',' + padding.top + ')');
  svg.appendChild(g);

  // Tooltip element
  var tooltip = document.createElement('div');
  tooltip.className = 'hp-tooltip';
  container.appendChild(tooltip);

  var points = dataset.points;
  var n = points.length;
  if (!n) { container.appendChild(svg); return; }

  var yMax = dataset.max; // percentage scale 0..max
  var xStep = innerW / n;
  var barWidth = Math.max(16, xStep * 0.5);

  function yScale(val) { return innerH - (val / yMax) * innerH; }
  function xCenter(i) { return i * xStep + xStep / 2; }

  // Grid stripes (banded background at 2% steps)
  for (var gy = 0; gy <= yMax; gy += 2) {
    var y = yScale(gy + 2);
    var rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', y);
    rect.setAttribute('width', innerW);
    rect.setAttribute('height', (2 / yMax) * innerH);
    rect.setAttribute('fill', gy % 4 === 0 ? '#e9f2e8' : '#f3f7f3');
    rect.setAttribute('opacity', '0.8');
    g.appendChild(rect);
  }

  // Bars
  points.forEach(function (p, i) {
    var x = xCenter(i) - barWidth / 2;
    var y = yScale(p.bar);
    var rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', innerH - y);
    rect.setAttribute('fill', '#1f7a2f');
    g.appendChild(rect);
  });

  // Smooth line path
  var path = document.createElementNS(svgNS, 'path');
  var d = '';
  for (var i = 0; i < n; i++) {
    var px = xCenter(i);
    var py = yScale(points[i].line);
    if (i === 0) {
      d += 'M' + px + ' ' + py;
    } else {
      var prevX = xCenter(i - 1);
      var prevY = yScale(points[i - 1].line);
      var cx1 = prevX + (px - prevX) * 0.35;
      var cy1 = prevY;
      var cx2 = prevX + (px - prevX) * 0.65;
      var cy2 = py;
      d += ' C' + cx1 + ' ' + cy1 + ',' + cx2 + ' ' + cy2 + ',' + px + ' ' + py;
    }
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#0a2540');
  path.setAttribute('stroke-width', '3');
  g.appendChild(path);

  // Line glow (shadow)
  var glow = document.createElementNS(svgNS, 'path');
  glow.setAttribute('d', d);
  glow.setAttribute('fill', 'none');
  glow.setAttribute('stroke', '#7ea0c4');
  glow.setAttribute('stroke-width', '6');
  glow.setAttribute('opacity', '0.35');
  g.insertBefore(glow, path);

  // Line dots
  points.forEach(function (p, i) {
    var cx = xCenter(i);
    var cy = yScale(p.line);
    var dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('r', 5);
    dot.setAttribute('fill', '#fff');
    dot.setAttribute('stroke', '#2aa84a');
    dot.setAttribute('stroke-width', '3');
    dot.style.cursor = 'pointer';

    // Tooltip interactivity
    dot.addEventListener('mouseenter', function () {
      tooltip.textContent = p.label + ' • Bar: ' + p.bar + '% • Line: ' + p.line + '%';
      tooltip.classList.add('show');
      positionTooltip(tooltip, padding.left + cx, padding.top + cy);
    });
    dot.addEventListener('mousemove', function (ev) {
      positionTooltip(tooltip, ev.offsetX, ev.offsetY);
    });
    dot.addEventListener('mouseleave', function () {
      tooltip.classList.remove('show');
    });
    g.appendChild(dot);
  });

  // X labels
  points.forEach(function (p, i) {
    var tx = document.createElementNS(svgNS, 'text');
    tx.textContent = p.label;
    tx.setAttribute('x', xCenter(i));
    tx.setAttribute('y', innerH + 24);
    tx.setAttribute('text-anchor', 'middle');
    tx.setAttribute('fill', '#666');
    tx.setAttribute('font-size', '12');
    g.appendChild(tx);
  });

  container.appendChild(svg);
}

function positionTooltip(el, x, y) {
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

// Public API to update chart dynamically
window.setHistoricalPerformanceData = function setHistoricalPerformanceData(data) {
  var container = document.getElementById('hpGraph');
  if (!container) return;
  var ds = { max: (data && data.max) || 12, points: (data && data.points) || [] };
  renderHpChart(container, ds);
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

function donutSegmentPath(cx, cy, rInner, rOuter, a0, a1) {
  var large = a1 - a0 > Math.PI ? 1 : 0;
  var x0o = cx + rOuter * Math.cos(a0), y0o = cy + rOuter * Math.sin(a0);
  var x1o = cx + rOuter * Math.cos(a1), y1o = cy + rOuter * Math.sin(a1);
  var x1i = cx + rInner * Math.cos(a1), y1i = cy + rInner * Math.sin(a1);
  var x0i = cx + rInner * Math.cos(a0), y0i = cy + rInner * Math.sin(a0);
  return [
    'M', x0o, y0o,
    'A', rOuter, rOuter, 0, large, 1, x1o, y1o,
    'L', x1i, y1i,
    'A', rInner, rInner, 0, large, 0, x0i, y0i,
    'Z'
  ].join(' ');
}

