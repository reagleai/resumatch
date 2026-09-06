/** Local browser review with Chrome DevTools Protocol; no added dependencies.
 * Start isolated headless Chrome with --remote-debugging-port=9224 first.
 * node scripts/review-ui.mjs capture /generator?review=1 1440 900 dark
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

export const outputDirectory = join(tmpdir(), 'resumatch-redesign-review')
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function connect(port = 9224) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find((entry) => entry.type === 'page')
  if (!target) throw new Error('No review browser tab is available.')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const events = []
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      clearTimeout(entry.timer)
      message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result)
    } else events.push(message)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Timed out: ${method}`))
    }, 20000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result?.value
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Log.enable')
  return { send, evaluate, events, close: () => socket.close() }
}

export async function openPage(browser, path, width, height, theme = 'dark', base = 'http://127.0.0.1:4173') {
  const targetUrl = new URL(path, base)
  const expectedLocation = `${targetUrl.origin}${targetUrl.pathname}${targetUrl.search}`
  await browser.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  })
  await browser.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  // Set preference before navigation so the app's initialization effect and
  // the capture helper cannot race one another between theme scenarios.
  await browser.evaluate(`try { localStorage.setItem('rt-theme', ${JSON.stringify(theme)}) } catch {}`)
  await browser.send('Page.navigate', { url: targetUrl.href })
  const started = Date.now()
  let ready = false
  while (Date.now() - started < 15000) {
    await pause(100)
    try {
      ready = await browser.evaluate(`
        location.origin + location.pathname + location.search === ${JSON.stringify(expectedLocation)} &&
        document.readyState !== 'loading' &&
        Boolean(document.querySelector('#root > *')) &&
        Boolean(document.querySelector('.app-shell h1, .landing-section'))
      `)
      if (ready) break
    } catch (error) {
      if (!String(error).includes('Inspected target navigated or closed')) throw error
    }
  }
  if (!ready) throw new Error(`Timed out waiting for ${targetUrl.href} to render.`)
  await browser.evaluate(`(async () => {
    localStorage.setItem('rt-theme', ${JSON.stringify(theme)});
    if (document.querySelector('.app-shell')) {
      const { useAppStore } = await import('/src/store/appStore.ts');
      useAppStore.getState().setTheme(${JSON.stringify(theme)});
    }
    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]);
  })()`)
  await pause(400)
}

export async function capture(browser, name) {
  await mkdir(outputDirectory, { recursive: true })
  const screenshot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const output = join(outputDirectory, `${name}.png`)
  await writeFile(output, Buffer.from(screenshot.data, 'base64'))
  return output
}

export async function geometry(browser) {
  return browser.evaluate(`(() => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const describe = el => ({tag: el.tagName, class: String(el.className).slice(0, 100), text: el.innerText?.slice(0, 80)});
    const overflowing = [...document.querySelectorAll('.app-shell *')].filter(el => {
      if (!visible(el) || el.closest('.sr-only') || getComputedStyle(el).position === 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > innerWidth + 1;
    }).map(describe);
    const main = document.querySelector('.app-main');
    const save = document.querySelector('.profile-save-button');
    const primaryButton = document.querySelector('.btn-primary-variant, .preview-download-btn, .preview-download-btn-hero');
    const field = document.querySelector('.field-input');
    const activeNav = [...document.querySelectorAll('.app-primary-nav-item.is-active, .mobile-tabbar-item.is-active')]
      .find(visible);
    const r = save?.getBoundingClientRect();
    return {
      route: location.pathname + location.search,
      readyState: document.readyState,
      rootChildren: document.querySelector('#root')?.children.length ?? null,
      rootText: document.querySelector('#root')?.textContent?.trim().slice(0, 120) ?? null,
      scripts: [...document.scripts].map(script => script.src || 'inline'),
      viewport: [innerWidth, innerHeight],
      document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
      main: main ? [main.clientWidth, main.scrollWidth, main.clientHeight, main.scrollHeight] : null,
      overflowing,
      headings: [...document.querySelectorAll('.app-shell h1')].map(el => ({text: el.textContent, visible: visible(el), font: getComputedStyle(el).fontSize})),
      font: getComputedStyle(document.body).fontFamily,
      loadedFonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
      primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      primaryButton: primaryButton ? { color: getComputedStyle(primaryButton).color, background: getComputedStyle(primaryButton).backgroundColor } : null,
      fieldBorder: field ? getComputedStyle(field).borderColor : null,
      activeNav: activeNav ? { color: getComputedStyle(activeNav).color, background: getComputedStyle(activeNav).backgroundColor } : null,
      saveButton: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
    };
  })()`)
}

async function main() {
  const [command = 'capture', route = '/generator?review=1', width = '1440', height = '900', theme = 'dark', base = 'http://127.0.0.1:4173'] = process.argv.slice(2)
  const browser = await connect()
  try {
    if (command !== 'capture') throw new Error('Use the capture command or import helpers for an interaction review.')
    await openPage(browser, route, Number(width), Number(height), theme, base)
    const name = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'landing'}-${width}x${height}-${theme}`
    const { targetInfos } = await browser.send('Target.getTargets')
    const frameInfo = []
    for (const target of targetInfos.filter(t => t.type === 'iframe')) {
      const { sessionId } = await browser.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
      frameInfo.push(await browser.send('Runtime.evaluate', {expression: '({title:document.title,text:document.body?.innerText.slice(0,160),html:document.body?.innerHTML.slice(0,80),width:document.documentElement.scrollWidth})',returnByValue:true}, sessionId))
    }
    console.log(JSON.stringify({
      screenshot: await capture(browser, name),
      ...await geometry(browser),
      frames: await browser.send('Page.getFrameTree'),
      errors: browser.events.filter(event => event.method === 'Log.entryAdded' || event.method === 'Runtime.exceptionThrown').map(event => event.params.entry?.text ?? event.params.exceptionDetails?.text),
      targets: await browser.send('Target.getTargets'),
      frameInfo,
      preview: await browser.evaluate(`({length: document.querySelector('iframe')?.srcdoc.length})`),
    }, null, 2))
  } finally { browser.close() }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}
