/** End-to-end local UI review. Requires Vite on :4173 and Chrome CDP on :9224. */
import assert from 'node:assert/strict'
import { capture, connect, geometry, openPage } from './review-ui.mjs'

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(browser, expression, label, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await browser.evaluate(expression)) return
    await pause(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function press(browser, key, code, modifiers = 0) {
  const virtualKey = key === 'Escape' ? 27 : key === 'ArrowRight' ? 39 : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0
  await browser.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key, code, modifiers,
    windowsVirtualKeyCode: virtualKey,
    nativeVirtualKeyCode: virtualKey,
  })
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers })
}

const routes = [
  ['/generator?review=1', 1600, 1000, 'dark', 'generator-desktop'],
  ['/generator?review=1', 390, 844, 'light', 'generator-idle-mobile'],
  ['/generator?review=1&state=loading&step=3', 768, 1024, 'dark', 'generator-loading-tablet'],
  ['/generator?review=1&state=success', 390, 844, 'dark', 'generator-success-mobile'],
  ['/generator?review=1&state=html', 1366, 768, 'light', 'generator-html-laptop'],
  ['/generator?review=1&state=error', 320, 700, 'light', 'generator-error-small'],
  ['/generator?review=1&template=base', 1024, 768, 'dark', 'generator-template-classic'],
  ['/generator?review=1&template=modern', 1024, 768, 'light', 'generator-template-modern'],
  ['/generator?review=1&template=compact', 390, 844, 'dark', 'generator-template-compact-mobile'],
  ['/profile?review=1', 1366, 768, 'dark', 'profile-laptop'],
  ['/profile?review=1', 390, 844, 'dark', 'profile-ready-mobile'],
  ['/profile?review=1&state=loading', 1366, 768, 'dark', 'profile-loading-laptop'],
  ['/profile?review=1&state=advanced', 768, 1024, 'light', 'profile-advanced-tablet'],
  ['/profile?review=1&state=fetch-error', 768, 1024, 'light', 'profile-fetch-error-tablet'],
  ['/profile?review=1&profile=empty', 390, 844, 'dark', 'profile-empty-mobile'],
  ['/profile?review=1&state=importing', 390, 844, 'dark', 'profile-importing-mobile'],
  ['/profile?review=1&state=import-error', 390, 844, 'light', 'profile-import-error-mobile'],
  ['/profile?review=1&state=import-complete', 390, 844, 'light', 'profile-import-mobile'],
  ['/history?review=1', 1440, 900, 'dark', 'history-desktop'],
  ['/history?review=1', 390, 844, 'light', 'history-populated-mobile'],
  ['/history?review=1&state=loading', 1366, 768, 'dark', 'history-loading-laptop'],
  ['/history?review=1&state=empty', 768, 1024, 'light', 'history-empty-tablet'],
  ['/history?review=1&state=error', 390, 844, 'dark', 'history-error-mobile'],
  ['/history?review=1&preview=1', 1366, 768, 'dark', 'history-preview-html'],
  ['/history?review=1&preview=pdf-only', 768, 1024, 'light', 'history-preview-pdf-only'],
  ['/history?review=1&preview=no-file', 390, 844, 'dark', 'history-preview-no-file-mobile'],
]

const browser = await connect()
const results = { matrix: [], interactions: {} }

try {
  for (const [route, width, height, theme, name] of routes) {
    await openPage(browser, route, width, height, theme)
    const metrics = await geometry(browser)
    const state = await browser.evaluate(`(() => ({
      app: Boolean(document.querySelector('.app-shell')),
      activeNav: [...document.querySelectorAll('[aria-current="page"]')].map(el => el.textContent.trim()),
      dialogs: document.querySelectorAll('dialog[open]').length,
      alerts: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent.trim().slice(0, 120)),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }))()`)
    results.matrix.push({ name, route, width, height, theme, screenshot: await capture(browser, name), metrics, state })
  }

  await openPage(browser, '/profile?review=1&preview=1', 390, 844, 'dark')
  results.interactions.modalBeforeEscape = await browser.evaluate(`({
    open: Boolean(document.querySelector('dialog[open]')),
    active: document.activeElement?.getAttribute('aria-label'),
    source: document.querySelector('.document-paper iframe')?.src.split(':')[0],
  })`)
  await press(browser, 'Escape', 'Escape')
  await waitFor(browser, `!document.querySelector('dialog[open]')`, 'preview modal to close')
  results.interactions.modalClosedWithEscape = true

  await openPage(browser, '/generator?review=1', 1024, 768, 'dark')
  await browser.evaluate(`(() => {
    document.querySelector('.template-gallery > summary')?.click();
    const button = document.querySelector('.template-preview-btn');
    button?.focus();
    button?.click();
  })()`)
  await waitFor(browser, `Boolean(document.querySelector('dialog[open]'))`, 'template preview to open')
  const disclosureBeforeClose = await browser.evaluate(`document.querySelector('.template-gallery')?.open`)
  await press(browser, 'Escape', 'Escape')
  await waitFor(browser, `!document.querySelector('dialog[open]')`, 'template preview to close')
  await waitFor(browser, `document.activeElement?.classList.contains('template-preview-btn')`, 'template preview focus restoration')
  results.interactions.templatePreview = await browser.evaluate(`({
    disclosureBeforeClose: ${JSON.stringify(disclosureBeforeClose)},
    disclosureAfterClose: document.querySelector('.template-gallery')?.open,
    restoredFocus: document.activeElement?.classList.contains('template-preview-btn'),
  })`)

  await openPage(browser, '/generator?review=1', 390, 844, 'dark')
  await browser.evaluate(`document.querySelector('#generator-details-tab').focus()`)
  await press(browser, 'ArrowRight', 'ArrowRight')
  results.interactions.mobileTabs = await browser.evaluate(`({
    selected: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
    focus: document.activeElement?.id,
  })`)

  await press(browser, '3', 'Digit3', 1)
  await waitFor(browser, `location.pathname === '/history'`, 'keyboard navigation')
  results.interactions.keyboardNavigation = await browser.evaluate(`location.pathname + location.search`)

  await openPage(browser, '/generator?review=1&state=error', 390, 844, 'dark')
  await browser.evaluate(`document.querySelector('.empty-state-action')?.click()`)
  await waitFor(browser, `document.querySelector('.generator-status')?.textContent.includes('Ready')`, 'generation retry', 10000)
  results.interactions.retryGenerated = await browser.evaluate(`({
    status: document.querySelector('.generator-status')?.textContent.trim(),
    result: document.querySelector('.preview-context strong')?.textContent.trim(),
  })`)

  await openPage(browser, '/history?review=1', 1366, 768, 'dark')
  const originalCount = await browser.evaluate(`document.querySelectorAll('.history-card').length`)
  await browser.evaluate(`document.querySelector('.history-delete-action')?.click()`)
  await waitFor(browser, `Boolean(document.querySelector('.history-delete-confirmation'))`, 'delete confirmation')
  await press(browser, 'Escape', 'Escape')
  const escapedCount = await browser.evaluate(`document.querySelectorAll('.history-card').length`)
  await browser.evaluate(`document.querySelector('.history-delete-action')?.click()`)
  await browser.evaluate(`document.querySelector('.history-confirm-delete-btn')?.click()`)
  await waitFor(browser, `document.querySelectorAll('.history-card').length === ${originalCount - 1}`, 'fixture deletion')
  results.interactions.historyDelete = {
    originalCount,
    escapedCount,
    finalCount: await browser.evaluate(`document.querySelectorAll('.history-card').length`),
  }

  await openPage(browser, '/profile?review=1&profile=empty', 390, 844, 'dark')
  await browser.evaluate(`(() => {
    const input = document.querySelector('input[type="file"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['local review'], 'sample-resume.pdf', { type: 'application/pdf' }));
    Object.defineProperty(input, 'files', { value: transfer.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`)
  await waitFor(browser, `Boolean(document.querySelector('.import-summary'))`, 'local import fixture', 10000)
  results.interactions.localImport = await browser.evaluate(`({
    report: document.querySelector('.import-summary')?.innerText.trim(),
    firstName: document.querySelector('#input-firstName')?.value,
    fileSource: document.querySelector('.profile-preview-frame-pdf')?.src,
  })`)

  await browser.evaluate(`document.querySelector('.profile-save-button')?.click()`)
  await waitFor(browser, `document.querySelector('.profile-save-button')?.textContent.includes('Saved')`, 'local profile save')
  results.interactions.localSave = await browser.evaluate(`document.querySelector('.profile-save-button')?.textContent.trim()`)

  await openPage(browser, '/profile?review=1&profile=empty', 390, 844, 'dark')
  await browser.evaluate(`document.querySelector('.profile-save-button')?.click()`)
  await waitFor(browser, `Boolean(document.querySelector('#profile-resume-error'))`, 'profile validation error')
  results.interactions.invalidProfileFocus = await browser.evaluate(`({
    activeLabel: document.activeElement?.getAttribute('aria-label'),
    invalid: document.activeElement?.getAttribute('aria-invalid'),
    error: document.querySelector('#profile-resume-error')?.textContent,
  })`)

  await openPage(browser, '/profile?review=1&preview=1', 390, 844, 'dark')
  const initialScale = await browser.evaluate(`document.querySelector('.document-scale')?.textContent`)
  await browser.evaluate(`[...document.querySelectorAll('button')].find(el => el.textContent.includes('Actual size'))?.click()`)
  results.interactions.documentScale = await browser.evaluate(`({
    initial: ${JSON.stringify(initialScale)},
    current: document.querySelector('.document-scale')?.textContent,
    pressed: [...document.querySelectorAll('button')].find(el => el.textContent.includes('Actual size'))?.getAttribute('aria-pressed'),
  })`)

  await openPage(browser, '/', 1440, 900, 'dark')
  results.interactions.landing = await browser.evaluate(`({
    appShell: Boolean(document.querySelector('.app-shell')),
    landing: Boolean(document.querySelector('.landing-section')),
    pathname: location.pathname,
  })`)

  await openPage(browser, '/generator?review=1', 1366, 768, 'dark', 'http://127.0.0.1:4174')
  results.interactions.productionGate = await browser.evaluate(`({
    appShell: Boolean(document.querySelector('.app-shell')),
    landing: Boolean(document.querySelector('.landing-section')),
    pathname: location.pathname,
    reviewBadge: Boolean(document.querySelector('.review-mode-badge')),
  })`)

  for (const item of results.matrix) {
    assert.equal(item.state.app, true, `${item.name} did not render the application shell`)
    assert.equal(item.state.horizontalOverflow, false, `${item.name} overflowed the viewport`)
    assert.deepEqual(item.metrics.overflowing, [], `${item.name} contained off-viewport elements`)
  }
  assert.equal(results.interactions.modalBeforeEscape.open, true)
  assert.equal(results.interactions.modalBeforeEscape.source, 'blob')
  assert.equal(results.interactions.modalClosedWithEscape, true)
  assert.deepEqual(results.interactions.templatePreview, {
    disclosureBeforeClose: true,
    disclosureAfterClose: true,
    restoredFocus: true,
  })
  assert.deepEqual(results.interactions.mobileTabs, {
    selected: 'Preview',
    focus: 'generator-preview-tab',
  })
  assert.equal(results.interactions.keyboardNavigation, '/history?review=1')
  assert.equal(results.interactions.retryGenerated.status, 'Ready')
  assert.deepEqual(results.interactions.historyDelete, { originalCount: 3, escapedCount: 3, finalCount: 2 })
  assert.equal(results.interactions.localImport.firstName, 'Alex')
  assert.equal(results.interactions.localSave, 'Saved')
  assert.equal(results.interactions.invalidProfileFocus.invalid, 'true')
  assert.equal(results.interactions.documentScale.current, '100%')
  assert.equal(results.interactions.landing.landing, true)
  assert.equal(results.interactions.landing.appShell, false)
  assert.deepEqual(results.interactions.productionGate, {
    appShell: false,
    landing: true,
    pathname: '/generator',
    reviewBadge: false,
  })

  console.log(JSON.stringify({
    matrix: results.matrix.map(({ name, route, width, height, theme, state }) => ({
      name, route, viewport: `${width}x${height}`, theme,
      dialogs: state.dialogs, alerts: state.alerts.length,
      horizontalOverflow: state.horizontalOverflow,
    })),
    interactions: results.interactions,
  }, null, 2))
} finally {
  browser.close()
}
