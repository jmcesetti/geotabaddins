'use strict';

/* ════════════════════════════════════════════
   CONFIGURATION
════════════════════════════════════════════ */
const CFG = {
  PAGE: 50,
  RETRIES: 3,
  RETRY_MS: 1200,
  CONCURRENCY: 8,
  BADGE_MAX: 3
};

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
const S = {
  api: null,
  type: 'User',
  raw: [],
  filtered: [],
  sel: new Set(),
  groups: [],
  gMap: {},     // id → group obj
  page: 1,
  sortCol: 'name',
  sortDir: 'asc',
  filterGroups: [],   // selected group IDs for filter
  pending: null,      // { action, groupIds }

  get totalPages() { return Math.max(1, Math.ceil(this.filtered.length / CFG.PAGE)); },
  get paged() {
    const s = (this.page - 1) * CFG.PAGE;
    return this.filtered.slice(s, s + CFG.PAGE);
  }
};

/* ════════════════════════════════════════════
   API SERVICE
════════════════════════════════════════════ */
const API = {
  init(api) { S.api = api; },

  call(method, params) {
    return new Promise((res, rej) => {
      try { S.api.call(method, params, res, rej); }
      catch(e) { rej(e); }
    });
  },

  async retry(method, params, attempts = CFG.RETRIES) {
    for (let i = 0; i <= attempts; i++) {
      try { return await this.call(method, params); }
      catch(e) {
        const msg = String(e || '');
        const fatal = /MissingMandatory|InvalidUser|NotFound|permission/i.test(msg);
        if (i === attempts || fatal) throw e;
        await sleep(CFG.RETRY_MS * (i + 1));
      }
    }
  },

  async getGroups() {
    return await this.retry('Get', { typeName: 'Group', resultsLimit: 10000 }) || [];
  },

  async getEntities(type) {
    const params = { typeName: type, resultsLimit: 50000 };
    return await this.retry('Get', params) || [];
  },

  async setEntity(type, entity) {
    return await this.retry('Set', { typeName: type, entity });
  }
};

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
function gName(id) { const g = S.gMap[id]; return g ? (g.name || id) : id; }
function isActive(e) {
  const now = Date.now();
  const from = e.activeFrom ? new Date(e.activeFrom).getTime() : 0;
  const to = e.activeTo ? new Date(e.activeTo).getTime() : Infinity;
  return from <= now && now <= to;
}
function pgnPages(cur, tot) {
  if (tot <= 7) return Array.from({length: tot}, (_, i) => i + 1);
  const p = [];
  if (cur <= 4) { for (let i=1;i<=5;i++) p.push(i); p.push('…'); p.push(tot); }
  else if (cur >= tot - 3) { p.push(1); p.push('…'); for (let i=tot-4;i<=tot;i++) p.push(i); }
  else { p.push(1); p.push('…'); p.push(cur-1,cur,cur+1); p.push('…'); p.push(tot); }
  return p;
}

/* ════════════════════════════════════════════
   MULTI-SELECT COMPONENT
════════════════════════════════════════════ */
const MS = {
  _filter: new Set(),    // selected IDs for filter dropdown
  _group: new Set(),     // selected IDs for group modal

  renderList(containerId, groups, selectedSet, onChange) {
    const el = document.getElementById(containerId);
    if (!groups.length) { el.innerHTML = '<div class="ms-empty">Sin grupos disponibles</div>'; return; }
    const sorted = [...groups].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    el.innerHTML = sorted.map(g => `
      <label class="ms-opt" data-id="${esc(g.id)}">
        <input type="checkbox" value="${esc(g.id)}" ${selectedSet.has(g.id)?'checked':''}>
        ${esc(g.name || g.id)}
      </label>`).join('');
    // event delegation
    el.addEventListener('change', ev => {
      const cb = ev.target;
      if (cb.type !== 'checkbox') return;
      const id = cb.value;
      if (cb.checked) selectedSet.add(id); else selectedSet.delete(id);
      if (onChange) onChange(id, cb.checked);
    }, {once: false});
  },

  renderFilterList() {
    this.renderList('msFilterList', S.groups, this._filter, () => {
      this._updateFilterTags();
      App.filter();
    });
  },

  renderGroupList() {
    this.renderList('mGroupList', S.groups, this._group, null);
  },

  toggle(which) {
    if (which === 'filter') {
      const drop = document.getElementById('msFilterDrop');
      const trig = document.getElementById('msFilterTrigger');
      const hidden = drop.classList.contains('hidden');
      drop.classList.toggle('hidden', !hidden);
      trig.classList.toggle('open', hidden);
      if (hidden) setTimeout(() => document.getElementById('msFilterSearch').focus(), 50);
    }
  },

  search(val, listId) {
    const q = val.toLowerCase();
    document.querySelectorAll(`#${listId} .ms-opt`).forEach(opt => {
      opt.style.display = opt.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  _updateFilterTags() {
    const el = document.getElementById('msFilterTags');
    if (!this._filter.size) {
      el.innerHTML = '<span class="ms-placeholder">Todos los grupos...</span>';
      S.filterGroups = [];
      return;
    }
    S.filterGroups = [...this._filter];
    el.innerHTML = [...this._filter].map(id => {
      const name = gName(id);
      return `<span class="tag">${esc(trunc(name,18))}<span class="tag-x" onclick="MS._removeFilter('${esc(id)}')">✕</span></span>`;
    }).join('');
  },

  _removeFilter(id) {
    this._filter.delete(id);
    const cb = document.querySelector(`#msFilterList input[value="${id}"]`);
    if (cb) cb.checked = false;
    this._updateFilterTags();
    App.filter();
  },

  resetGroup() {
    this._group.clear();
    document.querySelectorAll('#mGroupList input[type=checkbox]').forEach(cb => cb.checked = false);
  },

  getGroupSelected() { return [...this._group]; }
};

// Close filter dropdown on outside click
document.addEventListener('click', e => {
  const wrap = document.getElementById('msFilterWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('msFilterDrop').classList.add('hidden');
    document.getElementById('msFilterTrigger').classList.remove('open');
  }
});

/* ════════════════════════════════════════════
   FILTER + SORT ENGINE
════════════════════════════════════════════ */
const Filter = {
  apply() {
    const name = document.getElementById('fName').value.trim().toLowerCase();
    const status = document.getElementById('fStatus').value;
    const noGroups = document.getElementById('fNoGroups').checked;
    const gids = S.filterGroups;

    let r = S.raw;

    if (name) r = r.filter(e => (e.name||'').toLowerCase().includes(name));

    if (gids.length) r = r.filter(e => {
      const ids = (e.groups||[]).map(g => g.id);
      return gids.some(id => ids.includes(id));
    });

    if (status === 'active')   r = r.filter(e => isActive(e));
    if (status === 'inactive') r = r.filter(e => !isActive(e));
    if (noGroups) r = r.filter(e => !(e.groups||[]).length);

    // Sort
    const col = S.sortCol, dir = S.sortDir === 'asc' ? 1 : -1;
    r = [...r].sort((a, b) => {
      if (col === 'name') return dir * (a.name||'').localeCompare(b.name||'');
      if (col === 'groups') return dir * ((a.groups||[]).length - (b.groups||[]).length);
      if (col === 'status') return dir * ((isActive(a)?1:0) - (isActive(b)?1:0));
      return 0;
    });

    S.filtered = r;
    S.page = 1;
  }
};

/* ════════════════════════════════════════════
   TABLE RENDERER
════════════════════════════════════════════ */
const Tbl = {
  render() {
    const el = document.getElementById('tblContent');
    const pgn = document.getElementById('pgnWrap');

    if (!S.raw.length) {
      el.innerHTML = `<div class="empty"><div class="empty-ico">📋</div><h3>Sin datos cargados</h3><p>Presiona "Cargar datos" para obtener registros de Geotab.</p></div>`;
      pgn.classList.add('hidden');
      this._count();
      return;
    }
    if (!S.filtered.length) {
      el.innerHTML = `<div class="empty"><div class="empty-ico">🔍</div><h3>Sin resultados</h3><p>Ajusta los filtros para ver registros.</p></div>`;
      pgn.classList.add('hidden');
      this._count();
      return;
    }

    const isUser = S.type === 'User';
    const si = col => `<i class="sort-i">${S.sortCol===col ? (S.sortDir==='asc'?'↑':'↓') : '↕'}</i>`;

    let h = `<div class="tbl-wrap"><table><thead><tr>
      <th style="width:40px"><input type="checkbox" id="chkPage" onchange="App.selPage(this.checked)" title="Selec. página"></th>
      <th class="sortable${S.sortCol==='name'?' sorted':''}" onclick="App.sort('name')">${isUser?'Usuario':'Dispositivo'} ${si('name')}</th>
      <th>ID</th>
      <th class="sortable${S.sortCol==='groups'?' sorted':''}" onclick="App.sort('groups')">Grupos ${si('groups')}</th>
      <th class="sortable${S.sortCol==='status'?' sorted':''}" onclick="App.sort('status')">Estado ${si('status')}</th>
    </tr></thead><tbody>`;

    for (const e of S.paged) {
      const sel = S.sel.has(e.id);
      const active = isActive(e);
      const grps = e.groups || [];

      let gbHtml = '';
      for (let i = 0; i < Math.min(grps.length, CFG.BADGE_MAX); i++) {
        const n = gName(grps[i].id);
        gbHtml += `<span class="gbadge" title="${esc(n)}">${esc(trunc(n,26))}</span>`;
      }
      if (grps.length > CFG.BADGE_MAX) gbHtml += `<span class="gbadge gbadge-more">+${grps.length-CFG.BADGE_MAX} más</span>`;
      if (!grps.length) gbHtml = '<span class="gbadge-none">Sin grupos</span>';

      let sub = '';
      if (isUser) {
        const full = [e.firstName, e.lastName].filter(Boolean).join(' ');
        if (full && full !== e.name) sub = `<div class="td-sub">${esc(full)}</div>`;
      }

      h += `<tr class="${sel?'sel':''}" data-id="${esc(e.id)}">
        <td><input type="checkbox" ${sel?'checked':''} onchange="App.selOne('${esc(e.id)}',this.checked)"></td>
        <td><div class="td-name">${esc(e.name||'(sin nombre)')}</div>${sub}</td>
        <td class="muted sm" style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${esc(e.id)}</td>
        <td><div class="gbadges">${gbHtml}</div></td>
        <td><span class="sbadge ${active?'s-on':'s-off'}">${active?'● Activo':'● Inactivo'}</span></td>
      </tr>`;
    }
    h += '</tbody></table></div>';
    el.innerHTML = h;

    this._count();
    this._pageCheck();
    this._pgn();
    pgn.classList.remove('hidden');
  },

  _count() {
    document.getElementById('recCount').textContent = `${S.filtered.length} de ${S.raw.length} registros`;
    document.getElementById('tblTitleText').textContent = S.type === 'User' ? 'Usuarios' : 'Activos (Dispositivos)';
  },

  _pageCheck() {
    const cb = document.getElementById('chkPage');
    if (!cb) return;
    const ids = S.paged.map(e => e.id);
    const all = ids.length && ids.every(id => S.sel.has(id));
    const some = ids.some(id => S.sel.has(id));
    cb.checked = all;
    cb.indeterminate = !all && some;
  },

  _pgn() {
    const tot = S.totalPages;
    const cur = S.page;
    const s = (cur-1)*CFG.PAGE+1, en = Math.min(cur*CFG.PAGE, S.filtered.length);
    document.getElementById('pgnInfo').textContent = `Mostrando ${s}–${en} de ${S.filtered.length}`;

    let h = `<button class="pg-btn" ${cur<=1?'disabled':''} onclick="App.goPage(${cur-1})">‹</button>`;
    for (const p of pgnPages(cur, tot)) {
      if (p === '…') h += `<span class="pg-btn" style="border:none;cursor:default">…</span>`;
      else h += `<button class="pg-btn${p===cur?' on':''}" onclick="App.goPage(${p})">${p}</button>`;
    }
    h += `<button class="pg-btn" ${cur>=tot?'disabled':''} onclick="App.goPage(${cur+1})">›</button>`;
    document.getElementById('pgnCtrl').innerHTML = h;
  }
};

/* ════════════════════════════════════════════
   SELECTION BAR
════════════════════════════════════════════ */
function updateSelBar() {
  const n = S.sel.size;
  document.getElementById('selCnt').textContent = n;
  document.getElementById('selBar').classList.toggle('hidden', n === 0);
}

/* ════════════════════════════════════════════
   GROUP OPERATION (add / remove)
════════════════════════════════════════════ */
const GroupOp = {
  _action: null,

  open(action) {
    this._action = action;
    MS.resetGroup();

    const isAdd = action === 'add';
    document.getElementById('mGroupTitle').textContent = isAdd ? 'Agregar grupos a la selección' : 'Eliminar grupos de la selección';
    document.getElementById('mGroupInfo').innerHTML = `<strong>${S.sel.size}</strong> entidad(es) seleccionada(s). Elige los grupos a <strong>${isAdd ? 'agregar' : 'eliminar'}</strong>.`;
    document.getElementById('mGroupSearch').value = '';
    const btn = document.getElementById('mGroupOkBtn');
    btn.className = isAdd ? 'btn btn-success' : 'btn btn-danger';
    btn.textContent = isAdd ? 'Agregar grupos' : 'Eliminar grupos';

    MS.renderGroupList();
    document.getElementById('mGroup').classList.remove('hidden');
  },

  close() { document.getElementById('mGroup').classList.add('hidden'); },

  confirm() {
    const ids = MS.getGroupSelected();
    if (!ids.length) { Toast.show('Selecciona al menos un grupo', 'warning'); return; }
    this.close();
    Confirm.show(this._action, ids);
  }
};

/* ════════════════════════════════════════════
   CONFIRMATION MODAL
════════════════════════════════════════════ */
const Confirm = {
  show(action, groupIds) {
    const names = groupIds.map(gName);
    const cnt = S.sel.size;
    const eLabel = S.type === 'User' ? 'usuario(s)' : 'dispositivo(s)';
    const isAdd = action === 'add';
    const color = isAdd ? 'var(--success)' : '#dc3545';

    S.pending = { action, groupIds };

    document.getElementById('mConfirmBody').innerHTML = `
      <div class="sum-box">
        <div class="sum-lbl">Entidades afectadas</div>
        <div class="sum-num">${cnt}</div>
        <div style="font-size:13px;color:var(--g600)">${eLabel} serán modificados</div>
      </div>
      <div class="sum-box">
        <div class="sum-lbl">Operación</div>
        <div style="font-size:18px;font-weight:700;color:${color}">${isAdd ? '+ AGREGAR GRUPOS' : '− ELIMINAR GRUPOS'}</div>
      </div>
      <div class="sum-box">
        <div class="sum-lbl">Grupos seleccionados (${groupIds.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">
          ${names.map(n => `<span class="gbadge" style="font-size:13px">${esc(n)}</span>`).join('')}
        </div>
      </div>
      <div class="warn-box">⚠ Esta operación modificará registros directamente en Geotab. Verifica la selección antes de continuar.</div>`;

    const btn = document.getElementById('mConfirmOkBtn');
    btn.className = isAdd ? 'btn btn-success' : 'btn btn-danger';
    btn.textContent = isAdd ? 'Confirmar y agregar' : 'Confirmar y eliminar';

    document.getElementById('mConfirm').classList.remove('hidden');
  },

  close() {
    document.getElementById('mConfirm').classList.add('hidden');
    S.pending = null;
  }
};

/* ════════════════════════════════════════════
   EXECUTOR (batch apply)
════════════════════════════════════════════ */
const Executor = {
  async run() {
    const op = S.pending;
    if (!op) return;
    Confirm.close();

    const entities = S.raw.filter(e => S.sel.has(e.id));
    const total = entities.length;
    const isAdd = op.action === 'add';

    document.getElementById('progMsg').textContent = isAdd ? 'Agregando grupos...' : 'Eliminando grupos...';
    document.getElementById('progFill').style.width = '0%';
    document.getElementById('progTxt').textContent = `0 / ${total}`;
    document.getElementById('mProgress').classList.remove('hidden');

    let done = 0, success = 0;
    const errors = [];

    // Process in concurrent batches
    for (let i = 0; i < entities.length; i += CFG.CONCURRENCY) {
      const batch = entities.slice(i, i + CFG.CONCURRENCY);
      await Promise.all(batch.map(async entity => {
        try {
          const updated = this._applyOp(entity, op.action, op.groupIds);
          await API.setEntity(S.type, updated);
          success++;
        } catch(e) {
          errors.push({ name: entity.name || entity.id, error: String(e) });
        }
        done++;
        const pct = Math.round(done / total * 100);
        document.getElementById('progFill').style.width = pct + '%';
        document.getElementById('progTxt').textContent = `${done} / ${total}`;
      }));
    }

    document.getElementById('mProgress').classList.add('hidden');

    const groupNames = op.groupIds.map(gName);
    Results.show({ success, errors, action: op.action, groupNames });

    S.pending = null;
    S.sel.clear();
    updateSelBar();

    const msg = errors.length
      ? `Completado: ${success} exitosos, ${errors.length} errores`
      : `Operación completada: ${success} entidades modificadas`;
    Toast.show(msg, errors.length ? 'warning' : 'success');
  },

  _applyOp(entity, action, groupIds) {
    const cur = entity.groups || [];
    let groups;
    if (action === 'add') {
      const existing = new Set(cur.map(g => g.id));
      const toAdd = groupIds.filter(id => !existing.has(id)).map(id => ({ id }));
      groups = [...cur, ...toAdd];
    } else {
      const remove = new Set(groupIds);
      groups = cur.filter(g => !remove.has(g.id));
    }
    return { ...entity, groups };
  }
};

/* ════════════════════════════════════════════
   RESULTS MODAL
════════════════════════════════════════════ */
const Results = {
  show({ success, errors, action, groupNames }) {
    const total = success + errors.length;
    const isAdd = action === 'add';

    let h = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="sum-box" style="text-align:center">
          <div class="sum-lbl">Exitosos</div>
          <div class="sum-num" style="color:var(--success)">${success}</div>
        </div>
        <div class="sum-box" style="text-align:center">
          <div class="sum-lbl">Con error</div>
          <div class="sum-num" style="color:${errors.length?'#dc3545':'var(--g400)'}">${errors.length}</div>
        </div>
      </div>
      <div class="sum-box">
        <div class="sum-lbl">Operación</div>
        <div style="font-size:13px;margin-top:4px">
          <strong>${isAdd ? 'Grupos agregados' : 'Grupos eliminados'}:</strong>
          ${groupNames.map(n => `<span class="gbadge" style="font-size:12px">${esc(n)}</span>`).join(' ')}
        </div>
      </div>`;

    if (errors.length) {
      h += `<div class="sum-box" style="border-color:#dc3545;background:var(--danger-lt)">
        <div class="sum-lbl" style="color:#dc3545">Errores (${errors.length})</div>
        <div style="max-height:200px;overflow-y:auto;margin-top:8px">
          ${errors.map(e => `<div class="res-item">
            <span class="res-err">✕</span>
            <span class="bold">${esc(e.name)}</span>
            <span class="muted sm">— ${esc(e.error)}</span>
          </div>`).join('')}
        </div>
      </div>`;
    }

    document.getElementById('mResultsBody').innerHTML = h;
    document.getElementById('mResults').classList.remove('hidden');
  },

  close() { document.getElementById('mResults').classList.add('hidden'); },
  closeReload() { this.close(); App.load(); }
};

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
const Toast = {
  show(msg, type = 'info', ms = 4000) {
    const c = document.getElementById('toastWrap');
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${esc(msg)}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),350); }, ms);
  }
};

/* ════════════════════════════════════════════
   APP CONTROLLER
════════════════════════════════════════════ */
const App = {
  async init(api) {
    API.init(api);
    try {
      const grps = await API.getGroups();
      S.groups = grps;
      S.gMap = {};
      grps.forEach(g => { S.gMap[g.id] = g; });
      MS.renderFilterList();
      Toast.show('Grupos cargados. Presiona "Cargar datos" para continuar.', 'success');
    } catch(e) {
      Toast.show('Error cargando grupos: ' + String(e), 'error');
    }
  },

  async setType(type) {
    if (S.type === type && S.raw.length) return;
    S.type = type;
    S.raw = []; S.filtered = []; S.sel.clear(); S.page = 1;
    document.querySelectorAll('#toggleEl button').forEach(b => b.classList.toggle('on', b.dataset.type === type));
    updateSelBar();
    Tbl.render();
  },

  async load() {
    const btn = document.getElementById('loadBtn');
    btn.disabled = true;
    S.sel.clear();
    updateSelBar();
    document.getElementById('tblContent').innerHTML = '<div class="loading"><div class="spinner"></div>Obteniendo datos de Geotab...</div>';
    document.getElementById('pgnWrap').classList.add('hidden');

    try {
      S.raw = await API.getEntities(S.type);
      Filter.apply();
      Tbl.render();
      Toast.show(`${S.raw.length} registros cargados`, 'success');
    } catch(e) {
      const msg = String(e||'');
      const permErr = /[Uu]nauthorized|[Pp]ermission|[Aa]ccess|[Ff]orbidden/.test(msg);
      Toast.show(permErr ? 'Sin permisos para ver estos datos' : 'Error: ' + msg, 'error');
      document.getElementById('tblContent').innerHTML = permErr
        ? `<div class="empty"><div class="empty-ico">🔒</div><h3>Permisos insuficientes</h3><p>Tu cuenta no tiene acceso para ver estos registros.</p></div>`
        : `<div class="empty"><div class="empty-ico">⚠</div><h3>Error al cargar</h3><p>${esc(msg)}</p></div>`;
    } finally {
      btn.disabled = false;
    }
  },

  filter() { Filter.apply(); Tbl.render(); },

  clearFilters() {
    document.getElementById('fName').value = '';
    document.getElementById('fStatus').value = '';
    document.getElementById('fNoGroups').checked = false;
    MS._filter.clear();
    MS._updateFilterTags();
    document.querySelectorAll('#msFilterList input[type=checkbox]').forEach(cb => cb.checked = false);
    Filter.apply(); Tbl.render();
  },

  sort(col) {
    S.sortDir = S.sortCol === col && S.sortDir === 'asc' ? 'desc' : 'asc';
    S.sortCol = col;
    Filter.apply(); Tbl.render();
  },

  goPage(p) {
    if (p < 1 || p > S.totalPages) return;
    S.page = p; Tbl.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  selOne(id, checked) {
    if (checked) S.sel.add(id); else S.sel.delete(id);
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.classList.toggle('sel', checked);
    Tbl._pageCheck();
    updateSelBar();
  },

  selPage(checked) {
    S.paged.forEach(e => checked ? S.sel.add(e.id) : S.sel.delete(e.id));
    Tbl.render(); updateSelBar();
  },

  selAllFiltered(checked) {
    S.filtered.forEach(e => checked ? S.sel.add(e.id) : S.sel.delete(e.id));
    Tbl.render(); updateSelBar();
    document.getElementById('chkAllFiltered').checked = checked;
  },

  clearSel() {
    S.sel.clear();
    document.getElementById('chkAllFiltered').checked = false;
    Tbl.render(); updateSelBar();
  }
};

/* ════════════════════════════════════════════
   GEOTAB ADD-IN REGISTRATION
════════════════════════════════════════════ */
var geotabGroupManager = function(api, state) {
  return {
    initialize: function(freshApi, freshState, callback) {
      App.init(freshApi).finally(() => { if (typeof callback === 'function') callback(); });
    },
    focus: function(focusApi) { API.init(focusApi); },
    blur: function() {}
  };
};

(function() {
  if (typeof geotab !== 'undefined' && geotab.addin) {
    geotab.addin.groupManager = geotabGroupManager;
  } else if (typeof api !== 'undefined') {
    App.init(api);
  } else {
    console.info('[GroupManager] Waiting for Geotab API. Register as Add-In or inject api globally.');
  }
})();

// Expose for browser console debugging
window._GM = { App, State: S, API, Filter, Tbl };
