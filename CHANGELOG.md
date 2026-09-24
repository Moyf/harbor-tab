# Changelog

## [Unreleased]

### Features

- **Recovery speed**: new slider in the particle interaction settings that controls how fast a disturbed particle settles back home, i.e. how long a cursor pass keeps rippling. Lower values let the wave linger noticeably longer, higher values snap back almost instantly. The default is the new, clearly rippling motion described below

### Bug Fixes

- Fix the cursor ripple settling at different speeds depending on the display refresh rate: the particle physics now steps in 60 Hz reference frames, so a disturbance takes the same wall-clock time on 60 Hz, 120 Hz, and through throttled frames (previously a stalled frame skipped ahead and high-refresh displays settled faster)
- Make the default particle ripple visibly linger instead of snapping back: particles are now much less damped, so a cursor pass leaves a few clear overshoots that fade out over about 3.3 seconds, instead of a single barely visible bounce

<details>
<summary>中文说明（点击展开）</summary>

### 新增

- **恢复速度**：粒子交互设置组新增滑块，控制粒子被光标扰动后回归原位的快慢，也就是鼠标划过之后涟漪能持续多久。数值越低，波浪越悠长；越高则几乎立刻回位。默认值即下方新的、更明显的涟漪效果

### 修复

- 修复粒子涟漪的收敛速度随屏幕刷新率变化的问题：物理积分改为按 60 Hz 参考帧步进，扰动在 60 Hz、120 Hz 以及掉帧时消耗同样的实际时间（此前掉帧会一次性跳过大段时间，高刷屏则收敛更快）
- 让默认的粒子涟漪真正「荡」起来：大幅降低阻尼，鼠标划过之后会留下数次清晰的过冲并在约 3.3 秒内逐渐消散，而不是一次几乎看不见的回弹

</details>

## [1.5.0] - 2026-09-22

### Compatibility

- **Plugin renamed to Harbor Tab** (`harbor-tab`): the `first-light` id is already taken in the official plugin store, so the submission continues under a new id. The repository moved to `Moyf/harbor-tab` (old links redirect automatically); BRAT users switching from a previous install should point it at the new repo. Obsidian treats the new id as a different plugin — enable it and re-configure its settings once; the old `first-light` folder can be removed from `.obsidian/plugins/`. The lighthouse wordmark/icon is unchanged

### Bug Fixes

- Fix "ghost" home tabs: after closing a tab, the new-tab replacement could target a detached leaf and resurrect it outside the layout tree, leaving stray empty tabs and stale leaf references that other plugins tripped over. It now verifies the leaf is still attached and falls back to the most recently used empty tab
- Fix the search suggestions' keyboard scope leaking when "hide on blur" is disabled: after the search bar lost focus, arrow keys and Enter kept being captured by the stale suggestion list (e.g. Enter re-opened the highlighted result instead of editing). The list stays available for mouse clicks, but the keyboard is released

## [1.4.2] - 2026-09-14

### Compatibility

- **Plugin renamed back to First Light** (`first-light`): development continues in this repository, `Moyf/first-light`. If you previously installed the Home Tab Plus builds, Obsidian treats this as a different plugin — enable it and re-configure its settings once; the old `home-tab-plus` folder can be removed from `.obsidian/plugins/`. Install links point to `Moyf/first-light`.

### Features

- Recent files keyboard navigation now supports Home/End to jump straight to the first/last entry

### Bug Fixes

- Fix the particle wordmark rendering as a solid black dot-matrix on displays with a fractional device pixel ratio (e.g. 225% scaling): pixel sampling now reads whole pixels, so transparent areas no longer fill with particles and the logo/title keep their proper colors
- Fix a phantom horizontal scrollbar showing on the home tab whenever the particle effect is enabled: the particle canvas is scaled wider than the wordmark and centered on it, and its transparent margin used to extend the view's scrollable area; it is now clipped at the pane edge, leaving vertical scrolling untouched

### Improvements

- Icon pickers (logo icon, starred-file icons) now source their suggestions from Obsidian's official icon registry (`getIconIds()`) instead of a hardcoded list of ~830 icon ids, so the suggestion list always matches the icons available in the running app version: newly added icons appear automatically, icons Obsidian does not ship are no longer offered, and custom icons registered by other plugins can be picked and render correctly

## [1.4.0] - 2026-08-31

### Features

- Add an "Idle motion" dropdown to the particle effect with six ambient movement modes for the resting wordmark: **Wave rhythm** (a diagonal wave sweeping across the title), **Gentle float** (the whole wordmark bobbing together), **Staggered float** (a standing wave where neighbouring regions rise and fall out of phase), **Heartbeat** (a lub-dub pulse radiating from the center outward, with the amplitude growing toward the rim), **Ripple** (ring-shaped waves spreading from the center) and **Breathe** (a slow uniform radial expansion). All modes are disabled by default ("None") and run at draw time only — the cursor-ripple physics stays untouched, sine lookups use a precomputed table, and "None" keeps the original code path

## [1.3.2] - 2026-08-30

### Features

- Add an "Individual margins" toggle for the logo: when enabled, the four sides (top / right / bottom / left) can each be tuned separately; when disabled (default), the single uniform margin applies
- Move "Logo scale" to the top of the Logo layout settings group

### Bug Fixes

- Fix the particle wordmark occasionally not refreshing after settings changes: logo position, logo scale and logo margins are now part of the rebuild signature (previously only detected when the container happened to resize), a tripped rebuild circuit breaker now retries after a cooldown instead of dropping the pending change, and a rapid-settings race no longer tears down the freshly built engine

## [1.3.1] - 2026-08-30

### Compatibility

- **Plugin id renamed** from `home-tab-plus` to `first-light`: the 1.3.0 release still shipped under the old id. After updating, Obsidian treats this as a different plugin — re-enable it and re-configure its settings once; the old `home-tab-plus` folder can be removed from `.obsidian/plugins/`. Install links now point to `Moyf/first-light`.

### Features

- Add logo position and margin settings for the wordmark area, with dedicated i18n entries
- Add a selection highlight sub-page at the end of Appearance, with i18n entries
- Recent files navigation now loops: continuing past the last entry wraps back to the search bar
- Widen particle effect slider ranges (spacing 1–8, dot size down to 0.2) and tune defaults to a finer lattice

### Bug Fixes

- Fix suggester popovers being trapped behind popout windows: suggestion popups now render in the focused window, and settings-page suggesters (font / icon / image) migrated to the official `AbstractInputSuggest`, which positions itself correctly in popout settings windows
- Fix the particle engine resolving `devicePixelRatio`, computed styles and canvas resources from the main window instead of the window hosting the view (popout-safe)
- Fix a startup race that could wipe stored recent files before they were loaded
- Keep home tab leaf positions across plugin reloads: `onunload` no longer detaches the plugin's leaves
- Fix logo icon color falling back to `currentColor` when no custom color is set
- Bake the computed `stroke` of logo SVGs into the rasterized image so particle icons keep their color (CSS variables do not resolve in standalone SVG images)
- Style the native color input used by declarative settings rows, and re-render the page when a color mode dropdown changes so the custom color picker appears

### Improvements

- Resolve all Obsidian plugin review lint findings: explicit types instead of `Function`/`any`, no `@ts-ignore`, `app` passed explicitly to file utils, `window.`-prefixed timers and animation frames, `createEl` helpers, removal of deprecated `setDynamicTooltip` and of global `app` access (also fixes a latent crash in unresolved-link path resolution)
- Drop unused dependencies (`builtin-modules`, `fs-extra`, `dotenv`)

## [1.3.0] - 2026-08-30

### Features

- Add an interactive particle wordmark effect: render the logo and title as a dot grid that ripples around the cursor, with a monochrome mode (luminance-shaded single hue) and tunable parameters (canvas scale, particle spacing, dot size, disturbance radius/strength)
- Organize settings into native sub-pages (Search / Logo / Title style / Particle effect) with the declarative settings API
- Rebrand the plugin as **First Light**
- Modernize the settings tab with the Obsidian 1.13 declarative settings API (`getSettingDefinitions`)
- Add a plugin icon (`house`) to the settings sidebar
- Add i18n support with English and Simplified Chinese locales (`getLanguage()`-based)

### Improvements

- Fix typos and apply sentence case to setting names ("Show shorcuts" → "Show shortcuts", "Debug Mode" → "Debug mode")
- Split combined control rows (logo, title font, colors) into one-control-per-row layout

### Compatibility

- Raise minimum Obsidian version to 1.13.0 (required by the declarative settings API)

## [1.2.3] - 2026-05-08

### Features

- Add dedicated icons for canvas, base, and database file types (`LayoutDashboard` / `Table` / `Database`)
- Add `.base`, `.components`, `.xdb` as recognized file types in the lookup table
- Add search filter support for the Recent Files section
- Support jumping to headings directly from search results
- Display alias and title matches in search suggestions
- Add hide-on-blur setting

### Improvements

- Improve fuzzy search ranking and match analysis
- Optimize sorting scores for search suggestions
- Improve suggestion item handling and lower match threshold for better recall
- Optimize heading display in suggestions

### Bug Fixes

- Fix keyboard event cleanup by calling `destroy()` in `homeView.onClose()`
- Fix key mapping issues for keyboard navigation

---

## [1.2.2] and earlier

See git history.
