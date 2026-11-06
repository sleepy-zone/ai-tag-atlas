/* ============================================================
   Tag Atlas · v3
   Vanilla JS, no dependencies. Data comes from data/*.js globals.
   ============================================================ */

(function () {
  'use strict';

  var DATA = window.TAG_ATLAS;
  var RECIPES = window.TAG_RECIPES;
  if (!DATA || !RECIPES) {
    document.body.innerHTML = '<p style="padding:40px;font-family:monospace">数据没有加载：请确认 data/tags.js 与 data/recipes.js 存在。</p>';
    return;
  }

  var TERMS = DATA.terms;
  var CATS = DATA.categories;
  var RECIPE_LIST = RECIPES.recipes || [];
  var byEn = new Map(TERMS.map(function (t) { return [t.en, t]; }));
  var bySlug = new Map(TERMS.map(function (t) { return [t.id, t.en]; }));
  var catById = new Map(CATS.map(function (c) { return [c.id, c]; }));
  var TOTAL = TERMS.length;

  var PROMPT_ORDER = [
    'color', 'material', 'pattern', 'detail', 'length',
    'body', 'hair', 'face', 'expression', 'mouth',
    'top', 'dress', 'bottom', 'outerwear', 'neckline', 'sleeve',
    'underwear', 'legwear', 'shoes', 'accessory',
    'composition', 'view', 'pose', 'hand',
    'scene', 'light', 'animal', 'season', 'occasion',
  ];
  var ORDER = new Map(PROMPT_ORDER.map(function (c, i) { return [c, i]; }));
  var PAGE = 96;
  var STORE = 'tagatlas.v3';

  var DEFAULT_NEG = 'lowres, bad anatomy, bad hands, extra fingers, missing fingers, watermark, signature, text, jpeg artifacts, multiple views, deformed face';

  var STYLE_PRESETS = [
    { zh: '柔和动漫风', label: 'soft anime', en: 'soft anime style' },
    { zh: '赛璐璐平涂', label: 'cel shading', en: 'cel shading, flat colors, clean lineart' },
    { zh: '写实摄影', label: 'photorealistic', en: 'photorealistic, natural skin texture, soft studio light' },
    { zh: '电影感', label: 'cinematic', en: 'cinematic lighting, film grain, shallow depth of field' },
    { zh: '水彩插画', label: 'watercolor', en: 'watercolor illustration, soft washes, paper texture' },
    { zh: '厚涂油画', label: 'painterly', en: 'painterly, thick brush strokes, oil painting' },
    { zh: '赛博霓虹', label: 'cyberpunk', en: 'cyberpunk, neon glow, high contrast' },
    { zh: '暗黑奇幻', label: 'dark fantasy', en: 'dark fantasy, moody atmosphere, dramatic shadows' },
    { zh: '清新日系', label: 'Japanese', en: 'Japanese illustration, pastel colors, airy' },
    { zh: '3D 渲染', label: '3d render', en: '3d render, octane render, subsurface scattering' },
    { zh: '复古胶片', label: 'vintage film', en: 'vintage film photo, grain, warm tones' },
    { zh: '极简线稿', label: 'line art', en: 'minimalist line art, monochrome, clean background' },
    { zh: '国风工笔', label: 'gongbi', en: 'Chinese gongbi painting, fine lines, muted colors' },
    { zh: '像素风', label: 'pixel art', en: 'pixel art, 16-bit, limited palette' },
  ];

  var state = {
    q: '',
    cat: 'all',
    nsfw: false,
    selected: [],
    shown: PAGE,
    theme: 'dark',
    prefix: '1girl, solo',
    suffix: 'soft anime style',
    negative: DEFAULT_NEG,
  };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var el = {
    q: $('#q'),
    catList: $('#catList'),
    themeBtn: $('#themeBtn'),
    nsfwBtn: $('#nsfwBtn'),
    recipeList: $('#recipeList'),
    recipePrev: $('#recipePrev'),
    recipeNext: $('#recipeNext'),
    tagGrid: $('#tagGrid'),
    resultCount: $('#resultCount'),
    moreBtn: $('#moreBtn'),
    emptyState: $('#emptyState'),
    activeFilters: $('#activeFilters'),
    resetBtn: $('#resetBtn'),
    selected: $('#selected'),
    benchEmpty: $('#benchEmpty'),
    prefix: $('#prefix'),
    suffixPreset: $('#suffixPreset'),
    negative: $('#negative'),
    prompt: $('#prompt'),
    copyPrompt: $('#copyPrompt'),
    clearBtn: $('#clearBtn'),
    randomBtn: $('#randomBtn'),
    copyLink: $('#copyLink'),
    benchFab: $('#benchFab'),
    fabCount: $('#fabCount'),
    bench: $('#bench'),
    benchClose: $('#benchClose'),
    backdrop: $('#backdrop'),
    toast: $('#toast'),
    statTerms: $('#statTerms'),
    statCats: $('#statCats'),
    statRecipes: $('#statRecipes'),
    heroTerms: $('#heroTerms'),
    heroCats: $('#heroCats'),
    heroRecipes: $('#heroRecipes'),
  };

  /* ---------- utils ---------- */

  var toastTimer = null;
  function toast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 1800);
  }

  function copyText(text, message) {
    if (!text) return;
    var done = function () { toast(message || '已复制'); };
    var fail = function () { toast('复制失败，请手动选择'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        if (fallbackCopy(text)) done(); else fail();
      });
    } else if (fallbackCopy(text)) {
      done();
    } else {
      fail();
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        theme: state.theme,
        prefix: state.prefix,
        suffix: state.suffix,
        negative: state.negative,
        selected: state.selected,
      }));
    } catch (e) { /* ignore */ }
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.theme === 'light' || s.theme === 'dark') state.theme = s.theme;
      if (typeof s.prefix === 'string') state.prefix = s.prefix;
      if (typeof s.suffix === 'string') {
        var knownSuffix = s.suffix === '' || STYLE_PRESETS.some(function (p) { return p.en === s.suffix; });
        state.suffix = knownSuffix ? s.suffix : 'soft anime style';
      }
      if (typeof s.negative === 'string') state.negative = s.negative;
      if (Array.isArray(s.selected)) state.selected = s.selected.filter(function (en) { return byEn.has(en); });
    } catch (e) { /* ignore */ }
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    saveSettings();
  }

  function countLabel(n) { return String(n); }

  function catName(id) {
    var c = catById.get(id);
    return c ? c.zh : id;
  }

  /* ---------- search ---------- */

  var hayCache = new Map();
  function haystack(t) {
    var cached = hayCache.get(t.en);
    if (cached) return cached;
    var parts = [t.en, t.zh, t.primary, t.danbooru || ''];
    parts = parts.concat(t.aliases || [], t.zhAliases || [], [catName(t.primary)]);
    var s = parts.join(' ').toLowerCase();
    hayCache.set(t.en, s);
    return s;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return TERMS.filter(function (t) {
      if (state.cat !== 'all' && t.primary !== state.cat) return false;
      if (!state.nsfw && t.nsfw) return false;
      if (!q) return true;
      return haystack(t).indexOf(q) !== -1;
    });
  }

  /* ---------- hash ---------- */

  function readHash() {
    try {
      var raw = location.hash.replace(/^#/, '');
      if (!raw) return;
      var p = new URLSearchParams(raw);
      if (p.has('q')) state.q = p.get('q') || '';
      if (p.has('cat') && (p.get('cat') === 'all' || catById.has(p.get('cat')))) state.cat = p.get('cat');
      if (p.has('nsfw')) state.nsfw = p.get('nsfw') === '1';
      if (p.has('tags')) {
        var tags = [];
        p.get('tags').split('|').forEach(function (raw) {
          var en = byEn.has(raw) ? raw : bySlug.get(raw);
          if (en && tags.indexOf(en) === -1) tags.push(en);
        });
        state.selected = tags;
      }
    } catch (e) { /* ignore */ }
  }

  function writeHash() {
    try {
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.cat !== 'all') p.set('cat', state.cat);
      if (state.nsfw) p.set('nsfw', '1');
      if (state.selected.length) p.set('tags', state.selected.join('|'));
      var hash = p.toString();
      var url = location.pathname + location.search + (hash ? '#' + hash : '');
      history.replaceState(null, '', url);
    } catch (e) { /* file:// may refuse */ }
  }

  /* ---------- rendering ---------- */

  function renderStats() {
    if (el.statTerms) el.statTerms.textContent = countLabel(TOTAL);
    if (el.statCats) el.statCats.textContent = countLabel(CATS.length);
    if (el.statRecipes) el.statRecipes.textContent = countLabel(RECIPE_LIST.length);
    if (el.heroTerms) el.heroTerms.textContent = countLabel(TOTAL);
    if (el.heroCats) el.heroCats.textContent = countLabel(CATS.length);
    if (el.heroRecipes) el.heroRecipes.textContent = countLabel(RECIPE_LIST.length);
  }

  function renderCategories() {
    var frag = document.createDocumentFragment();
    var all = document.createElement('button');
    all.type = 'button';
    all.className = 'cat cat-all';
    all.dataset.cat = 'all';
    all.setAttribute('aria-pressed', String(state.cat === 'all'));
    all.innerHTML = '<span>全部</span><span class="cat-count">' + TOTAL + '</span>';
    frag.appendChild(all);

    CATS.forEach(function (c) {
      if (!c.count) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat';
      b.dataset.cat = c.id;
      b.setAttribute('aria-pressed', String(state.cat === c.id));
      b.innerHTML = '<span></span><span class="cat-count">' + c.count + '</span>';
      b.firstChild.textContent = c.zh;
      frag.appendChild(b);
    });
    el.catList.innerHTML = '';
    el.catList.appendChild(frag);
  }

  function setActiveCategory() {
    $$('.cat').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
    });
  }

  function renderRecipes() {
    var frag = document.createDocumentFragment();
    RECIPE_LIST.forEach(function (r, i) {
      var card = document.createElement('article');
      card.className = 'recipe';

      var top = document.createElement('div');
      top.className = 'recipe-top';
      var idx = document.createElement('span');
      idx.className = 'recipe-index';
      idx.textContent = String(i + 1).padStart(2, '0');
      var h3 = document.createElement('h3');
      h3.textContent = r.name_zh;
      var en = document.createElement('span');
      en.textContent = r.name_en;
      h3.appendChild(en);
      top.appendChild(h3);
      top.appendChild(idx);
      card.appendChild(top);

      var desc = document.createElement('p');
      desc.textContent = r.desc_zh;
      card.appendChild(desc);

      var tags = document.createElement('div');
      tags.className = 'recipe-tags';
      r.tags.slice(0, 4).forEach(function (t) {
        var s = document.createElement('span');
        s.textContent = t;
        tags.appendChild(s);
      });
      if (r.tags.length > 4) {
        var more = document.createElement('span');
        more.textContent = '+' + (r.tags.length - 4);
        tags.appendChild(more);
      }
      card.appendChild(tags);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recipe-apply';
      btn.textContent = '套用';
      btn.addEventListener('click', function () { applyRecipe(r); });
      card.appendChild(btn);

      frag.appendChild(card);
    });
    el.recipeList.innerHTML = '';
    el.recipeList.appendChild(frag);
    requestAnimationFrame(updateRecipeNav);
  }

  function scrollRecipes(dir) {
    var card = el.recipeList.querySelector('.recipe');
    var gap = 10;
    var step = card ? card.getBoundingClientRect().width + gap : 258;
    if (el.recipeList.scrollBy) {
      el.recipeList.scrollBy({ left: dir * step, behavior: 'smooth' });
    } else {
      el.recipeList.scrollLeft += dir * step;
    }
  }

  function updateRecipeNav() {
    if (!el.recipeList || !el.recipePrev) return;
    var max = el.recipeList.scrollWidth - el.recipeList.clientWidth;
    el.recipePrev.disabled = el.recipeList.scrollLeft <= 2;
    el.recipeNext.disabled = max <= 2 || el.recipeList.scrollLeft >= max - 2;
  }

  var recipeDrag = null;
  var suppressRecipeClick = false;

  function makeTagCard(t) {
    var selected = state.selected.indexOf(t.en) !== -1;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tag' + (selected ? ' is-on' : '') + (t.nsfw ? ' is-nsfw' : '');
    b.dataset.en = t.en;
    b.setAttribute('aria-pressed', String(selected));

    var title = t.en + ' · ' + t.zh;
    if (t.aliases && t.aliases.length) title += '\n别名：' + t.aliases.join(', ');
    if (t.zhAliases && t.zhAliases.length) title += ' / ' + t.zhAliases.join('、');
    title += '\n点击加入 / 移出工作台';
    b.title = title;

    var en = document.createElement('span');
    en.className = 'tag-en';
    en.textContent = t.en;
    b.appendChild(en);

    var zh = document.createElement('span');
    zh.className = 'tag-zh';
    zh.textContent = t.zh;
    b.appendChild(zh);

    var meta = document.createElement('span');
    meta.className = 'tag-meta';
    var cat = document.createElement('span');
    cat.className = 'cat-chip';
    cat.textContent = catName(t.primary);
    meta.appendChild(cat);
    b.appendChild(meta);

    if (t.nsfw) {
      var flag = document.createElement('span');
      flag.className = 'tag-flag';
      flag.textContent = '18+';
      b.appendChild(flag);
    }

    b.addEventListener('click', function () { toggleTag(t.en); });
    return b;
  }

  function renderTags() {
    var list = filtered();
    var slice = list.slice(0, state.shown);
    var frag = document.createDocumentFragment();
    slice.forEach(function (t) { frag.appendChild(makeTagCard(t)); });
    el.tagGrid.innerHTML = '';
    el.tagGrid.appendChild(frag);

    el.resultCount.textContent = list.length + ' / ' + TOTAL;
    el.moreBtn.hidden = list.length <= state.shown;
    el.emptyState.hidden = list.length !== 0;
    if (list.length === 0) el.emptyState.hidden = false;

    renderActiveFilters();
  }

  function renderActiveFilters() {
    var chips = [];
    if (state.q) chips.push(['q', '搜索：' + state.q]);
    if (state.cat !== 'all') chips.push(['cat', catName(state.cat)]);
    if (state.nsfw) chips.push(['nsfw', '显示 18+']);
    if (!chips.length) {
      el.activeFilters.hidden = true;
      el.activeFilters.innerHTML = '';
      return;
    }
    el.activeFilters.hidden = false;
    el.activeFilters.innerHTML = '';
    chips.forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.clear = pair[0];
      b.innerHTML = '<b>×</b> ';
      b.appendChild(document.createTextNode(pair[1]));
      b.addEventListener('click', function () { clearFilter(pair[0]); });
      el.activeFilters.appendChild(b);
    });
  }

  function clearFilter(kind) {
    if (kind === 'q') { state.q = ''; el.q.value = ''; }
    if (kind === 'cat') { state.cat = 'all'; setActiveCategory(); }
    if (kind === 'nsfw') { state.nsfw = false; el.nsfwBtn.setAttribute('aria-pressed', 'false'); }
    state.shown = PAGE;
    renderCategories();
    renderTags();
    writeHash();
  }

  function orderedSelected() {
    return state.selected.map(function (en) { return byEn.get(en); }).filter(Boolean).sort(function (a, b) {
      var oa = ORDER.has(a.primary) ? ORDER.get(a.primary) : 99;
      var ob = ORDER.has(b.primary) ? ORDER.get(b.primary) : 99;
      if (oa !== ob) return oa - ob;
      return state.selected.indexOf(a.en) - state.selected.indexOf(b.en);
    });
  }

  function buildPrompt() {
    var tags = orderedSelected().map(function (t) { return t.en; });
    var pre = state.prefix.trim().replace(/,\s*$/, '');
    var suf = state.suffix.trim().replace(/^,\s*/, '');
    return [pre, tags.join(', '), suf].filter(Boolean).join(', ');
  }

  function buildCopyText() {
    var positive = buildPrompt().trim();
    var negative = state.negative.trim();
    if (!negative) return positive;
    return (positive ? positive + '\n\n' : '') + 'Negative prompt: ' + negative;
  }

  function copyPromptText() {
    copyText(buildCopyText(), state.negative.trim() ? '已复制提示词 + 负面' : '已复制提示词');
  }

  function renderBench() {
    var list = orderedSelected();
    el.selected.innerHTML = '';
    list.forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'sel-chip';
      var name = document.createElement('span');
      name.textContent = t.en;
      var zh = document.createElement('em');
      zh.textContent = t.zh;
      var x = document.createElement('button');
      x.type = 'button';
      x.setAttribute('aria-label', '移除 ' + t.en);
      x.textContent = '×';
      x.addEventListener('click', function () { toggleTag(t.en); });
      chip.appendChild(name);
      chip.appendChild(zh);
      chip.appendChild(x);
      el.selected.appendChild(chip);
    });
    el.benchEmpty.hidden = list.length > 0;
    el.prompt.value = buildPrompt();
    el.fabCount.textContent = String(list.length);
    el.clearBtn.disabled = list.length === 0;
  }

  function renderAll() {
    renderCategories();
    renderTags();
    renderBench();
  }

  /* ---------- actions ---------- */

  function toggleTag(en) {
    var i = state.selected.indexOf(en);
    if (i === -1) state.selected.push(en);
    else state.selected.splice(i, 1);
    state.shown = Math.max(state.shown, PAGE);
    renderTags();
    renderBench();
    saveSettings();
    writeHash();
  }

  function applyRecipe(r) {
    state.selected = r.tags.filter(function (en) { return byEn.has(en); });
    if (typeof r.prefix === 'string') state.prefix = r.prefix;
    if (typeof r.suffix === 'string') state.suffix = r.suffix;
    syncInputs();
    renderTags();
    renderBench();
    saveSettings();
    writeHash();
    toast('已套用：' + r.name_zh);
  }

  var LIGHT_PICKS = [
    'golden hour front', 'golden hour backlight', 'blue hour', 'moonlight', 'overcast',
    'dappled light', 'screen glow', 'string lights', 'car headlights', 'stage spotlight',
    'butterfly light', 'loop light', 'rembrandt light', 'split light', 'rim light',
    'top light', 'under light', 'clamshell light', 'three-point lighting', 'high-key',
    'low-key', 'silhouette', 'teal & orange', 'god rays', 'backlit fog',
  ];

  function pickRandom() {
    var pool = function (id) {
      var arr = TERMS.filter(function (t) { return t.primary === id && !t.nsfw; });
      return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    };
    var pickLight = function () {
      var arr = LIGHT_PICKS.map(function (en) { return byEn.get(en); }).filter(Boolean);
      return arr.length ? arr[Math.floor(Math.random() * arr.length)] : pool('light');
    };
    var useDress = Math.random() < 0.3 && TERMS.some(function (t) { return t.primary === 'dress' && !t.nsfw; });
    var ids = ['color', 'shoes', 'hair', 'expression', 'scene', 'light', 'composition'];
    if (useDress) ids.splice(1, 0, 'dress');
    else ids.splice(1, 0, 'top', 'bottom');
    var picked = [];
    ids.forEach(function (id) {
      var t = id === 'light' ? pickLight() : pool(id);
      if (t && picked.indexOf(t.en) === -1) picked.push(t.en);
    });
    state.selected = picked;
    renderTags();
    renderBench();
    saveSettings();
    writeHash();
    toast('随机了一组');
  }

  function syncSuffixPreset() {
    if (!el.suffixPreset) return;
    var v = state.suffix.trim();
    if (!v) { el.suffixPreset.value = '__none__'; return; }
    var found = STYLE_PRESETS.some(function (p) { return p.en === v; });
    el.suffixPreset.value = found ? v : '__none__';
  }

  function renderSuffixPresets() {
    if (!el.suffixPreset) return;
    el.suffixPreset.innerHTML = '';
    STYLE_PRESETS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.en;
      o.textContent = p.zh + ' · ' + (p.label || p.en);
      el.suffixPreset.appendChild(o);
    });
    var none = document.createElement('option');
    none.value = '__none__';
    none.textContent = '无（留空）';
    el.suffixPreset.appendChild(none);
    syncSuffixPreset();
  }

  function syncInputs() {
    el.prefix.value = state.prefix;
    syncSuffixPreset();
    el.negative.value = state.negative;
    el.q.value = state.q;
    el.nsfwBtn.setAttribute('aria-pressed', String(state.nsfw));
  }

  var sheetMq = window.matchMedia('(max-width: 1160px)');
  function syncSheetInert() {
    if (!el.bench) return;
    if (sheetMq.matches && !el.bench.classList.contains('open')) {
      el.bench.setAttribute('inert', '');
      el.bench.setAttribute('aria-hidden', 'true');
    } else {
      el.bench.removeAttribute('inert');
      el.bench.removeAttribute('aria-hidden');
    }
  }

  function openSheet() {
    el.bench.classList.add('open');
    el.backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    syncSheetInert();
  }
  function closeSheet() {
    el.bench.classList.remove('open');
    el.backdrop.hidden = true;
    document.body.style.overflow = '';
    syncSheetInert();
  }

  /* ---------- bind ---------- */

  var qTimer = null;
  el.q.addEventListener('input', function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      state.q = el.q.value.trim();
      state.shown = PAGE;
      renderTags();
      writeHash();
    }, 90);
  });

  el.recipePrev.addEventListener('click', function () { scrollRecipes(-1); });
  el.recipeNext.addEventListener('click', function () { scrollRecipes(1); });
  el.recipeList.addEventListener('scroll', updateRecipeNav, { passive: true });
  window.addEventListener('resize', updateRecipeNav);

  el.recipeList.addEventListener('pointerdown', function (e) {
    suppressRecipeClick = false;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    // 按钮 / 链接 / 表单上按下时不启动拖动，保证「套用」正常点击
    if (e.target.closest('button, a, input, select, textarea')) return;
    recipeDrag = { id: e.pointerId, x: e.clientX, left: el.recipeList.scrollLeft, moved: false };
  });

  el.recipeList.addEventListener('pointermove', function (e) {
    if (!recipeDrag || e.pointerId !== recipeDrag.id) return;
    var dx = e.clientX - recipeDrag.x;
    if (!recipeDrag.moved) {
      if (Math.abs(dx) <= 8) return;
      recipeDrag.moved = true;
      suppressRecipeClick = true;
      el.recipeList.classList.add('is-dragging');
      try { el.recipeList.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    el.recipeList.scrollLeft = recipeDrag.left - dx;
  });

  function endRecipeDrag(e) {
    if (!recipeDrag || e.pointerId !== recipeDrag.id) return;
    try {
      if (el.recipeList.hasPointerCapture && el.recipeList.hasPointerCapture(e.pointerId)) {
        el.recipeList.releasePointerCapture(e.pointerId);
      }
    } catch (err) { /* ignore */ }
    recipeDrag = null;
    el.recipeList.classList.remove('is-dragging');
    updateRecipeNav();
  }

  el.recipeList.addEventListener('pointerup', endRecipeDrag);
  el.recipeList.addEventListener('pointercancel', endRecipeDrag);
  el.recipeList.addEventListener('click', function (e) {
    if (!suppressRecipeClick) return;
    suppressRecipeClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  el.recipeList.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollRecipes(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollRecipes(-1); }
    else if (e.key === 'Home') { e.preventDefault(); el.recipeList.scrollTo({ left: 0, behavior: 'smooth' }); }
    else if (e.key === 'End') { e.preventDefault(); el.recipeList.scrollTo({ left: el.recipeList.scrollWidth, behavior: 'smooth' }); }
  });

  el.catList.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cat]');
    if (!b) return;
    state.cat = b.dataset.cat;
    state.shown = PAGE;
    setActiveCategory();
    renderTags();
    writeHash();
  });

  el.nsfwBtn.addEventListener('click', function () {
    state.nsfw = !state.nsfw;
    el.nsfwBtn.setAttribute('aria-pressed', String(state.nsfw));
    state.shown = PAGE;
    renderTags();
    writeHash();
  });

  el.themeBtn.addEventListener('click', function () {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  el.moreBtn.addEventListener('click', function () {
    state.shown += PAGE;
    renderTags();
  });

  el.resetBtn.addEventListener('click', function () {
    state.q = '';
    state.cat = 'all';
    state.nsfw = false;
    state.shown = PAGE;
    el.q.value = '';
    el.nsfwBtn.setAttribute('aria-pressed', 'false');
    renderCategories();
    renderTags();
    writeHash();
  });

  el.clearBtn.addEventListener('click', function () {
    state.selected = [];
    renderTags();
    renderBench();
    saveSettings();
    writeHash();
    toast('已清空');
  });

  el.prefix.addEventListener('input', function () {
    state.prefix = el.prefix.value;
    el.prompt.value = buildPrompt();
    saveSettings();
  });
  el.suffixPreset.addEventListener('change', function () {
    var v = el.suffixPreset.value;
    state.suffix = v === '__none__' ? '' : v;
    el.prompt.value = buildPrompt();
    saveSettings();
  });
  el.negative.addEventListener('input', function () {
    state.negative = el.negative.value;
    saveSettings();
  });

  el.copyPrompt.addEventListener('click', copyPromptText);
  el.randomBtn.addEventListener('click', pickRandom);
  el.copyLink.addEventListener('click', function () { copyText(location.href, '已复制链接'); });

  el.benchFab.addEventListener('click', openSheet);
  el.benchClose.addEventListener('click', closeSheet);
  el.backdrop.addEventListener('click', closeSheet);

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      el.q.focus();
      el.q.select();
      return;
    }
    if (e.key === 'Escape') {
      if (el.bench.classList.contains('open')) { closeSheet(); return; }
      if (typing && document.activeElement === el.q && el.q.value) {
        el.q.value = '';
        state.q = '';
        state.shown = PAGE;
        renderTags();
        writeHash();
        return;
      }
      if (typing && document.activeElement) document.activeElement.blur();
      return;
    }
    if ((e.key === 'c' || e.key === 'C') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      copyPromptText();
    }
  });

  /* ---------- init ---------- */

  loadSettings();
  readHash();
  syncSheetInert();
  if (sheetMq.addEventListener) sheetMq.addEventListener('change', syncSheetInert);
  setTheme(state.theme);
  renderSuffixPresets();
  syncInputs();
  renderStats();
  renderRecipes();
  renderAll();
  if (!location.hash) writeHash();
})();
