(() => {
  'use strict';

  function displayAnswer(field) {
    const value = field.value.trim();
    if (!value) return '미입력';
    const unit = field.dataset.unit;
    if (!unit || !/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) return value;
    const [integer, decimal] = value.replaceAll(',', '').split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return grouped + (decimal === undefined ? '' : '.' + decimal) + unit;
  }

  const clearAttempts = [];
  for (const entry of document.querySelectorAll('.calc-entry')) {
    const solution = entry.nextElementSibling;
    const fields = entry.querySelectorAll('input, select');
    const outputs = solution.querySelectorAll('output[for]');
    function sync() {
      for (const output of outputs) {
        output.value = displayAnswer(document.getElementById(output.htmlFor.value));
      }
    }
    function clear() {
      for (const field of fields) field.value = '';
      solution.open = false;
      sync();
    }
    entry.addEventListener('input', sync);
    entry.addEventListener('change', sync);
    const reset = entry.querySelector('[data-calc-reset]');
    reset.hidden = false;
    reset.addEventListener('click', () => {
      clear();
      fields[0].focus();
    });
    clearAttempts.push(clear);
  }

  function clearPage() {
    for (const clear of clearAttempts) clear();
  }
  window.addEventListener('pagehide', clearPage);
  window.addEventListener('pageshow', event => {
    if (event.persisted) clearPage();
  });
})();
