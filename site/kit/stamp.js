(function () {
  if (customElements.get('x-stamp') === undefined) {
    customElements.define('x-stamp', class extends HTMLElement {});
  }

  var fittedWidth = -1;
  function fitStages() {
    var viewport = document.documentElement.clientWidth;
    if (!viewport || viewport === fittedWidth) return;
    fittedWidth = viewport;
    var scale = viewport / 1280;
    var height = 720 * scale;
    document.querySelectorAll('.stage-slot').forEach(function (slot) {
      var fit = slot.querySelector('.stage-fit');
      var stageEl = fit && fit.firstElementChild;
      if (!stageEl) return;
      fit.style.width = viewport + 'px';
      fit.style.height = height + 'px';
      fit.style.marginLeft = 'auto';
      fit.style.marginRight = 'auto';
      stageEl.style.position = 'absolute';
      stageEl.style.left = '0';
      stageEl.style.top = '0';
      stageEl.style.transformOrigin = 'top left';
      stageEl.style.transform = 'scale(' + scale + ')';
    });
  }
  fitStages();
  window.addEventListener('resize', fitStages);
  if (window.ResizeObserver) {
    new ResizeObserver(fitStages).observe(document.documentElement);
  }

  var stamp = document.getElementById('suit-plate');
  var open = document.getElementById('plate-open');
  var zoom = document.getElementById('plate-zoom');
  var closeBtn = document.getElementById('plate-close');
  var stage = document.getElementById('plate-stage');

  function show() {
    var clone = stamp.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    clone.querySelectorAll('button').forEach(function (el) { el.remove(); });
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    clone.style.left = 'auto';
    clone.style.top = 'auto';
    clone.style.width = '1280px';
    stage.replaceChildren(clone);
    zoom.hidden = false;
    zoom.scrollTop = 0;
    zoom.scrollLeft = 0;
    closeBtn.focus();
  }

  function hide() {
    if (zoom.hidden) return;
    zoom.hidden = true;
    stage.replaceChildren();
    open.focus();
  }

  open.addEventListener('click', function (event) {
    event.stopPropagation();
    show();
  });
  stamp.addEventListener('click', function (event) {
    if (event.target.closest('button, a')) return;
    var selected = window.getSelection ? String(window.getSelection()) : '';
    if (selected) return;
    show();
  });
  closeBtn.addEventListener('click', hide);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hide();
  });

  var copyBtn = document.getElementById('install-copy');
  var copyLabel = document.getElementById('install-copy-label');
  var copyTimer = 0;
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    var ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (!ok) throw new Error('copy failed');
  }
  function copyInstall() {
    var text = document.getElementById('install-line').textContent;
    var write = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject();
    write.catch(function () { fallbackCopy(text); }).then(function () {
      copyBtn.classList.add('is-copied');
      copyLabel.textContent = 'Copied';
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(function () {
        copyBtn.classList.remove('is-copied');
        copyLabel.textContent = 'Copy';
      }, 1600);
    }, function () {
      copyLabel.textContent = 'Copy';
    });
  }
  copyBtn.addEventListener('click', copyInstall);
}());
