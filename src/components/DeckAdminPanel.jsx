/**
 * DeckAdminPanel — Sales OS controls for the FreightPOP sales deck.
 * Talks to the deck-config-api (Railway) using the signed-in user's Supabase access token.
 * Rendered as a tab inside SKUAdminPanel (Super Admin only).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseConfig';

const API = import.meta.env.VITE_DECK_CONFIG_API || 'https://deck-config-api-production.up.railway.app';
const DECK_URL = import.meta.env.VITE_DECK_URL || 'https://beta--fpdeck.netlify.app/FreightPOP%20TMS%20Sales%20Deck%20v17.dc.html';

const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null) a[k] = /^\d+$/.test(k) ? [] : {}; a = a[k]; } a[ks[ks.length - 1]] = v; };

const S = {
  wrap: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0', minHeight: '520px', maxHeight: 'calc(85vh - 120px)' },
  rail: { borderRight: '1px solid #e5e7eb', padding: '12px 10px', overflowY: 'auto', background: '#f9fafb' },
  grp: { fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9ca3af', padding: '12px 10px 4px' },
  railBtn: (a) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: '1px solid transparent', background: a ? '#dbeafe' : 'transparent', color: a ? '#1d4ed8' : '#374151', fontWeight: a ? 600 : 500, fontSize: '13px', cursor: 'pointer' }),
  count: { fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' },
  main: { padding: '18px 22px 90px', overflowY: 'auto', position: 'relative' },
  h1: { fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  hint: { fontSize: '12.5px', color: '#6b7280', margin: '0 0 16px' },
  card: { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 18px', marginBottom: '14px', background: '#fff' },
  h3: { fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 12px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em' },
  help: { fontSize: '11px', color: '#9ca3af' },
  input: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  ta: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', minHeight: '64px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45 },
  row: (off) => ({ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: '12px', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', marginBottom: '8px', background: '#fff', opacity: off ? 0.55 : 1 }),
  num: { fontSize: '12px', fontWeight: 700, color: '#2563eb', fontVariantNumeric: 'tabular-nums' },
  title: { fontSize: '14px', fontWeight: 600, color: '#111827' },
  sub: { fontSize: '12px', color: '#6b7280' },
  acts: { display: 'flex', gap: '6px', alignItems: 'center' },
  iconBtn: (dis) => ({ width: '28px', height: '28px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', color: '#374151', cursor: dis ? 'default' : 'pointer', opacity: dis ? 0.35 : 1, fontSize: '13px' }),
  btn: { padding: '8px 14px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  primary: { background: '#2563eb', color: '#fff' }, success: { background: '#10b981', color: '#fff' }, secondary: { background: '#f3f4f6', color: '#374151' }, danger: { background: '#fee2e2', color: '#b91c1c' }, small: { padding: '5px 9px', fontSize: '12px' },
  editor: { borderLeft: '3px solid #2563eb', background: '#f8fafc', borderRadius: '0 8px 8px 0', padding: '14px 16px', margin: '-2px 0 12px 12px' },
  status: (dirty) => ({ position: 'sticky', bottom: '-18px', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: dirty ? '#fffbeb' : '#f9fafb', border: '1px solid ' + (dirty ? '#fcd34d' : '#e5e7eb'), borderRadius: '10px' }),
  toggle: (on) => ({ width: '34px', height: '18px', borderRadius: '9px', background: on ? '#10b981' : '#d1d5db', position: 'relative', cursor: 'pointer', flex: 'none', transition: 'background .15s' }),
  knob: (on) => ({ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left .15s' }),
  pill: { fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: '#dbeafe', color: '#1d4ed8', marginRight: '6px' },
  err: { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  ok: { background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  hist: { display: 'grid', gridTemplateColumns: '60px 1fr 170px auto', gap: '12px', alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }
};

const SECTIONS = [
  ['grp', 'Deck'], ['settings', 'Settings & links'], ['nav', 'Tabs & navigation'], ['ui', 'Appearance & size'], ['controls', 'Presentation controls'], ['labels', 'Labels & text'], ['pages', 'Page headings'],
  ['grp', 'Modules'], ['tms', 'TMS modules'], ['wms', 'WMS modules'], ['oms', 'OMS modules'],
  ['grp', 'Sections'], ['roadmap', 'Roadmap'], ['onboarding', 'Onboarding'], ['workflows', 'Workflows'],
  ['grp', 'System'], ['history', 'History & reset']
];

export default function DeckAdminPanel() {
  const [cfg, setCfg] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tick, setTick] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState('settings');
  const [open, setOpen] = useState({});
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const [busy, setBusy] = useState(false);
  const [revs, setRevs] = useState(null);
  const tokenRef = useRef('');

  const token = useCallback(async () => {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    tokenRef.current = data?.session?.access_token || '';
    return tokenRef.current;
  }, []);
  const api = useCallback(async (path, opts = {}) => {
    const t = await token();
    const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ? j.error + (j.details ? ': ' + j.details.join('; ') : '') : 'HTTP ' + r.status);
    return j;
  }, [token]);

  const load = useCallback(async () => {
    setBusy(true); setMsg(null);
    try { const c = await api('/api/config'); setCfg(c.data); setMeta(c); setDirty(false); }
    catch (e) { setMsg({ type: 'err', text: 'Could not load deck config: ' + e.message }); }
    finally { setBusy(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (section === 'history') api('/api/revisions').then(r => setRevs(r.revisions)).catch(e => setMsg({ type: 'err', text: e.message })); }, [section, api, meta]);

  const change = (p, v) => { setPath(cfg, p, v); setDirty(true); setTick(t => t + 1); };
  const publish = async () => {
    const note = window.prompt('Optional note for this revision', '') ?? ''; setBusy(true);
    try { const r = await api('/api/config', { method: 'PUT', body: JSON.stringify({ data: cfg, note }) }); setMsg({ type: 'ok', text: 'Published version ' + r.version + '. The deck picks it up on its next load.' }); await load(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); } finally { setBusy(false); }
  };
  const reset = async (sec) => {
    if (!window.confirm(`Reset ${sec ? '"' + sec + '"' : 'EVERYTHING'} to the deck defaults? This publishes immediately.`)) return;
    try { const r = await api('/api/config/reset', { method: 'POST', body: JSON.stringify({ section: sec }) }); setMsg({ type: 'ok', text: 'Reset published as version ' + r.version }); await load(); } catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  const restore = async (v) => {
    if (!window.confirm('Restore version ' + v + '? This publishes it as a new version.')) return;
    try { const r = await api('/api/revisions/' + v + '/restore', { method: 'POST' }); setMsg({ type: 'ok', text: 'Restored as version ' + r.version }); await load(); } catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  const move = (listPath, i, d) => { const l = get(cfg, listPath); const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; change(listPath, l); };
  const remove = (listPath, i) => { const l = get(cfg, listPath); l.splice(i, 1); change(listPath, l); };
  const add = (listPath, item) => { const l = get(cfg, listPath) || []; l.push(item); change(listPath, l); };

  // ---------- field primitives ----------
  const Text = ({ p, label, help, multi }) => (
    <div style={S.field}><label style={S.label}>{label}</label>
      {multi ? <textarea style={S.ta} value={get(cfg, p) ?? ''} onChange={e => change(p, e.target.value)} /> : <input style={S.input} type="text" value={get(cfg, p) ?? ''} onChange={e => change(p, e.target.value)} />}
      {help && <span style={S.help}>{help}</span>}</div>);
  const Num = ({ p, label, min, max, step, help }) => (
    <div style={S.field}><label style={S.label}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '10px', alignItems: 'center' }}>
        <input type="range" min={min} max={max} step={step} value={get(cfg, p) ?? min} onChange={e => change(p, Number(e.target.value))} style={{ width: '100%', accentColor: '#2563eb' }} />
        <input type="number" style={{ ...S.input, padding: '5px 6px', fontSize: '12px' }} min={min} max={max} step={step} value={get(cfg, p) ?? ''} onChange={e => change(p, Number(e.target.value))} />
      </div>{help && <span style={S.help}>{help}</span>}</div>);
  const Toggle = ({ p, label, help }) => { const on = !!get(cfg, p); return (
    <div style={S.field}><div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => change(p, !on)}><div style={S.toggle(on)}><div style={S.knob(on)} /></div><span style={{ fontSize: '13px', color: '#374151' }}>{label}</span></div>{help && <span style={S.help}>{help}</span>}</div>); };
  const Select = ({ p, label, options, numeric, help }) => (
    <div style={S.field}><label style={S.label}>{label}</label>
      <select style={S.input} value={String(get(cfg, p))} onChange={e => change(p, numeric ? Number(e.target.value) : e.target.value)}>{options.map(([v, l]) => <option key={v} value={String(v)}>{l}</option>)}</select>
      {help && <span style={S.help}>{help}</span>}</div>);
  const Lines = ({ p, label }) => { const arr = get(cfg, p) || []; return (
    <div style={S.field}><label style={S.label}>{label}</label>
      {arr.map((b, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginBottom: '6px' }}><input style={S.input} type="text" value={b} onChange={e => change(`${p}.${i}`, e.target.value)} /><button style={{ ...S.btn, ...S.danger, ...S.small }} onClick={() => remove(p, i)}>✕</button></div>)}
      <div><button style={{ ...S.btn, ...S.secondary, ...S.small }} onClick={() => add(p, '')}>+ Add line</button></div></div>); };
  const Acts = ({ listPath, i, len, editKey, children }) => (
    <div style={S.acts}>{children}
      <button style={S.iconBtn(i === 0)} disabled={i === 0} onClick={() => move(listPath, i, -1)} title="Move up">↑</button>
      <button style={S.iconBtn(i === len - 1)} disabled={i === len - 1} onClick={() => move(listPath, i, 1)} title="Move down">↓</button>
      {editKey && <button style={{ ...S.btn, ...S.primary, ...S.small }} onClick={() => setOpen(o => ({ ...o, [editKey]: !o[editKey] }))}>{open[editKey] ? 'Close' : 'Edit'}</button>}</div>);
  const OnOff = ({ p }) => { const on = get(cfg, p) !== false; return <div style={S.toggle(on)} onClick={() => change(p, !on)} title="Show / hide"><div style={S.knob(on)} /></div>; };

  // ---------- sections ----------
  const counts = cfg ? { tms: `${cfg.systems.tms.modules.filter(m => m.enabled !== false).length}/${cfg.systems.tms.modules.length}`, wms: `${cfg.systems.wms.modules.filter(m => m.enabled !== false).length}/${cfg.systems.wms.modules.length}`, oms: `${cfg.systems.oms.modules.filter(m => m.enabled !== false).length}/${cfg.systems.oms.modules.length}`, nav: `${cfg.nav.filter(n => n.enabled !== false).length}/${cfg.nav.length}`, workflows: `${cfg.workflows.filter(w => w.enabled !== false).length}/${cfg.workflows.length}` } : {};

  const renderSection = () => {
    switch (section) {
      case 'settings': return (<>
        <h1 style={S.h1}>Settings & links</h1><p style={S.hint}>Where the deck points. Embedded URLs must allow framing.</p>
        <div style={S.card}><h3 style={S.h3}>Embedded experiences</h3><div style={S.grid2}><Text p="settings.startUrl" label="Interactive walkthrough URL" /><Text p="settings.mainMenuUrl" label="Main menu graphic URL" /><Text p="settings.aiUrl" label="FreightPOP AI URL" /><Text p="settings.liveSiteUrl" label="Live Site (nav pill) URL" /><Text p="settings.roiUrl" label="ROI intake form URL" help="Opens in a new tab" /></div></div>
        <div style={S.card}><h3 style={S.h3}>Live app deep links (per system)</h3><div style={S.grid3}><Text p="settings.liveUrls.tms" label="TMS" /><Text p="settings.liveUrls.wms" label="WMS" /><Text p="settings.liveUrls.oms" label="OMS" /></div></div>
        <div style={S.card}><h3 style={S.h3}>Intro screen</h3><div style={S.grid2}><Text p="settings.intro.headline" label="Headline" /><Text p="settings.intro.subtitle" label="Subtitle" /><Text p="settings.intro.cta" label="Button label" /><Text p="settings.intro.urlCaption" label="Top-left caption" /></div><div style={{ marginTop: '12px' }}><Toggle p="settings.showMarquee" label="Show customer-logo marquee on the intro" /></div></div></>);
      case 'nav': return (<>
        <h1 style={S.h1}>Tabs & navigation</h1><p style={S.hint}>Toggle a tab off to hide it from the top bar and the Jump-to menu. Reorder with the arrows. The label is what the tab says; the subtitle shows on its Jump-to tile.</p>
        {cfg.nav.map((n, i) => <div key={n.key} style={S.row(n.enabled === false)}><span style={S.num}>{String(i + 1).padStart(2, '0')}</span><div style={S.grid2}><Text p={`nav.${i}.label`} label={`Tab label · ${n.key}`} /><Text p={`nav.${i}.sub`} label="Jump-to subtitle" /></div><Acts listPath="nav" i={i} len={cfg.nav.length}><OnOff p={`nav.${i}.enabled`} /></Acts></div>)}</>);
      case 'ui': return (<>
        <h1 style={S.h1}>Appearance & size</h1><p style={S.hint}>Scales are multipliers (1.0 = as designed). They apply the next time the deck loads.</p>
        <div style={S.card}><h3 style={S.h3}>Global</h3><div style={S.grid2}><Num p="ui.uiScale" label="Whole deck scale" min={0.7} max={1.4} step={0.05} help="Use for small laptops or big projectors" /><Num p="ui.navScale" label="Top bar scale" min={0.8} max={1.4} step={0.05} /></div></div>
        <div style={S.card}><h3 style={S.h3}>Hubs (TMS / WMS / OMS / Workflows)</h3><div style={S.grid3}><Num p="ui.hubScale" label="Hub content scale" min={0.7} max={1.4} step={0.05} /><Select p="ui.hubColumns" label="Card columns" numeric options={[[2, '2 columns'], [3, '3 columns'], [4, '4 columns']]} /><Num p="ui.cardMinHeight" label="Card min height (px)" min={140} max={280} step={10} /></div></div>
        <div style={S.card}><h3 style={S.h3}>Module pages</h3><div style={S.grid3}><Num p="ui.featureScale" label="Module page scale" min={0.7} max={1.4} step={0.05} /><Num p="ui.demoMaxWidth" label="Demo stage width (px)" min={760} max={1400} step={20} /><Num p="ui.demoScale" label="Demo stage scale" min={0.7} max={1.3} step={0.05} /><Num p="ui.statSize" label="Validation stat size (px)" min={48} max={140} step={2} /></div></div>
        <div style={S.card}><h3 style={S.h3}>Intro</h3><div style={S.grid2}><Num p="ui.introHeadlineSize" label="Headline size (px)" min={60} max={160} step={2} /><Num p="ui.introSubtitleSize" label="Subtitle size (px)" min={20} max={56} step={1} /></div></div></>);
      case 'controls': return (<>
        <h1 style={S.h1}>Presentation controls</h1><p style={S.hint}>How the deck behaves in the room.</p>
        <div style={S.card}><h3 style={S.h3}>Start & navigation</h3><div style={S.grid2}><Select p="controls.startView" label="Start screen" options={[['intro', 'Intro (animated hero)'], ['explore', 'Interactive walkthrough'], ['mainmenu', 'Main menu'], ['hub', 'TMS module hub']]} /><Toggle p="controls.keyboardNav" label="Arrow-key / Esc navigation" help="Turn off if a clicker sends stray keys" /></div></div>
        <div style={S.card}><h3 style={S.h3}>Chrome</h3><div style={S.grid3}><Toggle p="controls.showBreadcrumb" label="Breadcrumb in top bar" /><Toggle p="controls.showLiveSitePill" label="“Live Site” pill" /><Toggle p="controls.showMenuButton" label="“Menu” (Jump-to) button" /><Toggle p="controls.showStepDots" label="Step dots on module pages" /><Toggle p="controls.showPagingArrows" label="Prev / Next arrows" /><Toggle p="controls.showFullscreenPills" label="“⛶ Fullscreen” pills" /></div></div>
        <div style={S.card}><h3 style={S.h3}>Live Demo step</h3><div style={S.grid3}><Toggle p="controls.showAiDemoTab" label="“✦ AI Demo” tab" /><Toggle p="controls.showLiveSiteTab" label="“Live Site ↗” tab" /><Toggle p="controls.showExpandTab" label="“⛶ Expand” tab" /><Toggle p="controls.demoAutoPlay" label="Demos auto-play on open" /><Num p="controls.demoSpeed" label="Demo playback speed" min={0.5} max={2} step={0.25} /><Toggle p="controls.showValidationLibrary" label="Open Validation Library on step 4" help="Off = show the ROI layout directly" /></div></div></>);
      case 'labels': return (<>
        <h1 style={S.h1}>Labels & text</h1><p style={S.hint}>Buttons, step tabs and small labels.</p>
        <div style={S.card}><h3 style={S.h3}>Step tabs (module pages)</h3><div style={S.grid2}>{[0, 1, 2, 3].map(i => <Text key={'s' + i} p={`labels.steps.${i}`} label={`Step ${i + 1} tab`} />)}{[0, 1, 2, 3].map(i => <Text key={'e' + i} p={`labels.stepEyebrows.${i}`} label={`Step ${i + 1} eyebrow`} />)}</div></div>
        <div style={S.card}><h3 style={S.h3}>Buttons</h3><div style={S.grid3}><Text p="labels.back" label="Back" /><Text p="labels.menu" label="Menu" /><Text p="labels.liveSite" label="Live Site pill" /><Text p="labels.backToModule" label="Back to module" /><Text p="labels.allModules" label="All modules" /><Text p="labels.nextModule" label="Next module" /><Text p="labels.backToModules" label="Back to modules" /><Text p="labels.openCard" label="Hub card link" /><Text p="labels.watchCard" label="Workflow card link" /></div></div>
        <div style={S.card}><h3 style={S.h3}>Live Demo tabs</h3><div style={S.grid2}><Text p="labels.demoTabs.walkthrough" label="Walkthrough" /><Text p="labels.demoTabs.ai" label="AI demo" /><Text p="labels.demoTabs.live" label="Live site" /><Text p="labels.demoTabs.expand" label="Expand" /></div></div></>);
      case 'pages': return (<>
        <h1 style={S.h1}>Page headings</h1><p style={S.hint}>Hub and section copy.</p>
        <div style={S.card}><h3 style={S.h3}>TMS hub</h3><div style={S.grid2}><Text p="pages.tms.eyebrow" label="Eyebrow" /><Text p="systems.tms.name" label="Title (H1)" /></div><div style={{ marginTop: '10px' }}><Text p="systems.tms.intro" label="Lede" multi /></div></div>
        {['wms', 'oms'].map(k => <div key={k} style={S.card}><h3 style={S.h3}>{k.toUpperCase()} hub</h3><div style={S.grid2}><Text p={`systems.${k}.kicker`} label={`Eyebrow (after “FreightPOP ${k.toUpperCase()} ·”)`} /><Text p={`systems.${k}.name`} label="Title (H1)" /></div><div style={{ marginTop: '10px' }}><Text p={`systems.${k}.intro`} label="Lede" multi /></div></div>)}
        {['workflows', 'roadmap', 'onboarding'].map(k => <div key={k} style={S.card}><h3 style={S.h3}>{k[0].toUpperCase() + k.slice(1)}</h3><div style={S.grid2}><Text p={`pages.${k}.eyebrow`} label="Eyebrow" /><Text p={`pages.${k}.h1`} label="Title (H1)" /></div><div style={{ marginTop: '10px' }}><Text p={`pages.${k}.lede`} label="Lede" multi help={k === 'workflows' ? '{count} is replaced with the number of enabled workflows' : ''} /></div>{k === 'roadmap' && <div style={{ ...S.grid2, marginTop: '10px' }}><Text p="pages.roadmap.aiTitle" label="AI track title" /><Text p="pages.roadmap.platformTitle" label="Platform track title" /></div>}</div>)}</>);
      case 'tms': case 'wms': case 'oms': { const sys = section; const base = `systems.${sys}.modules`; const mods = get(cfg, base); return (<>
        <h1 style={S.h1}>{get(cfg, `systems.${sys}.name`)} <span style={{ ...S.pill, marginLeft: '8px' }}>{counts[sys]} shown</span></h1><p style={S.hint}>Toggle a module off to hide it from the hub, Jump-to menu and arrow-key paging. Reorder with the arrows. “Edit” opens every piece of copy for the four steps.</p>
        {mods.map((m, i) => { const key = sys + ':' + m.num; const p = `${base}.${i}`; return (<div key={key}>
          <div style={S.row(m.enabled === false)}><span style={S.num}>{m.num}</span><div><div style={S.title}>{m.name}</div><div style={S.sub}>{m.tag}</div></div><Acts listPath={base} i={i} len={mods.length} editKey={key}><OnOff p={`${p}.enabled`} /></Acts></div>
          {open[key] && <div style={S.editor}>
            <div style={S.grid3}><Text p={`${p}.name`} label="Module name" />{sys === 'tms' ? <><Text p={`${p}.t1`} label="Card title line 1" /><Text p={`${p}.t2`} label="Card title line 2" /></> : <Text p={`${p}.cardTag`} label="Hub card description" />}</div>
            <div style={{ marginTop: '10px' }}><Text p={`${p}.tag`} label="Tagline (under the module name)" /></div>
            <h3 style={{ ...S.h3, margin: '16px 0 8px' }}><span style={S.pill}>01</span>{cfg.labels.stepEyebrows[0]}</h3><Text p={`${p}.problem.heading`} label="Heading" /><div style={{ marginTop: '8px' }}><Text p={`${p}.problem.body`} label="Body" multi /></div>
            <h3 style={{ ...S.h3, margin: '16px 0 8px' }}><span style={S.pill}>02</span>{cfg.labels.stepEyebrows[1]}</h3><Text p={`${p}.benefit.heading`} label="Heading" /><div style={{ marginTop: '8px' }}><Lines p={`${p}.benefit.bullets`} label="Bullets" /></div>
            <h3 style={{ ...S.h3, margin: '16px 0 8px' }}><span style={S.pill}>03</span>{cfg.labels.stepEyebrows[2]}</h3><div style={S.grid2}><Text p={`${p}.demo.caption`} label="Caption under the demo" /><Text p={`${p}.demo.liveUrl`} label="Live Site URL for this module" /><Text p={`${p}.demo.anim`} label="Demo key" help="Which cooking demo mounts (e.g. rate, rules, wreceive). Blank = placeholder." /><Text p={`${p}.demo.ai`} label="AI demo key" help="copilot · accessorial · consol · clipRate · clipAudit — blank = no AI tab" /></div>
            <h3 style={{ ...S.h3, margin: '16px 0 8px' }}><span style={S.pill}>04</span>{cfg.labels.stepEyebrows[3]}</h3><div style={S.grid3}><Text p={`${p}.roi.stat`} label="Big stat" /><Text p={`${p}.roi.statLabel`} label="Stat label" /><Select p={`${p}.roi.ev.grade`} label="Evidence grade" options={[['Measured', 'Measured'], ['Reported', 'Reported'], ['Modeled', 'Modeled'], ['Platform', 'Platform']]} /></div><div style={{ marginTop: '8px' }}><Text p={`${p}.roi.proof`} label="Proof sentence" multi /></div><div style={{ ...S.grid2, marginTop: '8px' }}><Text p={`${p}.roi.ev.quote`} label="Quote (optional)" multi /><Text p={`${p}.roi.ev.who`} label="Quote attribution" /></div><div style={{ marginTop: '8px' }}><Text p={`${p}.roi.ev.src`} label="Source line" /></div>
          </div>}</div>); })}</>); }
      case 'roadmap': { const lane = (p, title) => { const arr = get(cfg, p); return (<div style={S.card}><h3 style={S.h3}>{title} <span style={S.pill}>{arr.length}</span></h3>{arr.map((r, i) => <div key={i} style={S.row(false)}><span style={S.num}>{String(i + 1).padStart(2, '0')}</span><div style={S.grid2}><Text p={`${p}.${i}.label`} label="Label" /><Text p={`${p}.${i}.body`} label="Body" /></div><Acts listPath={p} i={i} len={arr.length}><button style={{ ...S.btn, ...S.danger, ...S.small }} onClick={() => remove(p, i)}>✕</button></Acts></div>)}<button style={{ ...S.btn, ...S.secondary, ...S.small }} onClick={() => add(p, { label: 'New item', body: '' })}>+ Add item</button></div>); };
        return (<><h1 style={S.h1}>Roadmap</h1><p style={S.hint}>Two tracks; the timelines resize to the number of items.</p>{lane('roadmap.ai', cfg.pages.roadmap.aiTitle)}{lane('roadmap.platform', cfg.pages.roadmap.platformTitle)}</>); }
      case 'onboarding': return (<><h1 style={S.h1}>Onboarding</h1><p style={S.hint}>Steps on the “From kickoff to production” timeline.</p>
        {cfg.onboarding.map((s, i) => <div key={i} style={S.row(false)}><span style={S.num}>{s.num}</span><div><Text p={`onboarding.${i}.label`} label="Step label" /><div style={{ marginTop: '8px' }}><Lines p={`onboarding.${i}.lines`} label="Lines" /></div></div><Acts listPath="onboarding" i={i} len={cfg.onboarding.length}><button style={{ ...S.btn, ...S.danger, ...S.small }} onClick={() => remove('onboarding', i)}>✕</button></Acts></div>)}
        <button style={{ ...S.btn, ...S.secondary, ...S.small }} onClick={() => add('onboarding', { num: String(cfg.onboarding.length + 1).padStart(2, '0'), label: 'New step', lines: [''] })}>+ Add step</button></>);
      case 'workflows': return (<><h1 style={S.h1}>Workflows</h1><p style={S.hint}>Customer flows shown on the Workflows hub.</p>
        {cfg.workflows.map((w, i) => <div key={w.num + i} style={S.row(w.enabled === false)}><span style={S.num}>{w.num}</span><div style={S.grid2}><Text p={`workflows.${i}.title`} label="Title" /><Text p={`workflows.${i}.src`} label="Player file / URL" /><div style={{ gridColumn: '1 / -1' }}><Text p={`workflows.${i}.tag`} label="Description" /></div></div><Acts listPath="workflows" i={i} len={cfg.workflows.length}><OnOff p={`workflows.${i}.enabled`} /></Acts></div>)}</>);
      case 'history': return (<><h1 style={S.h1}>History & reset</h1><p style={S.hint}>Every publish is kept (last 60). Restoring publishes that revision as a new version.</p>
        <div style={S.card}>{revs === null ? 'Loading…' : revs.length === 0 ? 'No revisions yet.' : revs.map(v => <div key={v.version} style={S.hist}><span style={S.num}>v{v.version}</span><span>{v.note || '—'} <span style={{ color: '#9ca3af' }}>· {v.updatedBy}</span></span><span style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(v.updatedAt).toLocaleString()}</span><button style={{ ...S.btn, ...S.secondary, ...S.small }} disabled={meta && v.version === meta.version} onClick={() => restore(v.version)}>{meta && v.version === meta.version ? 'Current' : 'Restore'}</button></div>)}</div>
        <div style={S.card}><h3 style={S.h3}>Reset to deck defaults</h3><p style={S.hint}>Publishes immediately. Resets one area, or everything.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{['settings', 'nav', 'ui', 'controls', 'labels', 'pages', 'systems', 'roadmap', 'onboarding', 'workflows'].map(s => <button key={s} style={{ ...S.btn, ...S.secondary, ...S.small }} onClick={() => reset(s)}>{s}</button>)}<button style={{ ...S.btn, ...S.danger, ...S.small }} onClick={() => reset(undefined)}>Everything</button></div></div></>);
      default: return null;
    }
  };

  if (!cfg) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>{msg ? <div style={S.err}>{msg.text} <button style={{ ...S.btn, ...S.secondary, ...S.small, marginLeft: '10px' }} onClick={load}>Retry</button></div> : 'Loading deck configuration…'}</div>;

  return (
    <div style={S.wrap} data-tick={tick}>
      <aside style={S.rail}>
        {SECTIONS.map(([k, l], i) => k === 'grp' ? <div key={'g' + i} style={S.grp}>{l}</div> : <button key={k} style={S.railBtn(section === k)} onClick={() => setSection(k)}>{l}{counts[k] && <span style={S.count}>{counts[k]}</span>}</button>)}
        <div style={{ ...S.grp, marginTop: '14px' }}>Deck</div>
        <a href={`${DECK_URL}?fpcfg=${Date.now()}`} target="_blank" rel="noopener noreferrer" style={{ ...S.railBtn(false), color: '#2563eb', textDecoration: 'none' }}>Open beta deck ↗</a>
        <div style={{ padding: '10px', fontSize: '11px', color: '#9ca3af' }}>Config v{meta?.version}{meta?.updatedAt ? ' · ' + new Date(meta.updatedAt).toLocaleString() : ''}</div>
      </aside>
      <main style={S.main}>
        {msg && <div style={msg.type === 'ok' ? S.ok : S.err} onClick={() => setMsg(null)}>{msg.text}</div>}
        {renderSection()}
        <div style={S.status(dirty)}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dirty ? '#f59e0b' : '#9ca3af', flex: 'none' }} />
          <span style={{ flex: 1, fontSize: '13px', color: '#374151' }}>{dirty ? 'Unsaved changes — publish to update the deck.' : 'All changes published. The deck picks up the published version on its next load.'}</span>
          <button style={{ ...S.btn, ...S.secondary }} disabled={!dirty || busy} onClick={() => { if (window.confirm('Discard unsaved changes?')) load(); }}>Discard</button>
          <button style={{ ...S.btn, ...S.success, opacity: dirty && !busy ? 1 : 0.5 }} disabled={!dirty || busy} onClick={publish}>Save & publish</button>
        </div>
      </main>
    </div>
  );
}
