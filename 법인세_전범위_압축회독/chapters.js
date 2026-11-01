(() => {
  const dialog = document.querySelector('#source-preview')

  // Old bookmarks point to the question or PDF panel inside its former chapter.
  function followBookmark() {
    if (/^#exam-\d{4}-\d+$/.test(location.hash)) {
      const problem = document.getElementById(location.hash.slice(1))
      if (problem?.matches('a[href^="exam.html#q"]')) location.replace(problem.href)
      return
    }
    if (!location.hash.startsWith('#pdf-view-') || dialog.open) return
    const target = document.getElementById(location.hash.slice(1))
    const link = target?.querySelector('a[data-preview]')
    if (link && dialog.showModal) {
      for (let el = link.parentElement; el; el = el.parentElement) {
        if (el.tagName === 'DETAILS') el.open = true
      }
      link.click()
    }
  }
  window.addEventListener('hashchange', followBookmark)
  followBookmark()
})()
