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

