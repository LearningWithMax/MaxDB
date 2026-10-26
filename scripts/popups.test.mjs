import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

// A very small fake page: elements with classes, children, focus, and listeners. Enough to drive js/popups.js the way a keyboard does.
function build() {
  const registry = {};
  const doc = { listeners: {}, activeElement: null };
  class El {
    constructor(id) { this.id = id; this.cls = new Set(); this.attrs = {}; this.children = []; this.listeners = {}; this.style = {}; this.buttons = []; this.tabIndex = -1; this.textContent = ''; this._html = ''; this.className = ''; this.parent = null; }
    get classList() { const s = this.cls; return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) }; }
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
    get innerHTML() { return this._html; }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    appendChild(c) { c.parent = this; this.children.push(c); return c; }
    focus() { doc.activeElement = this; }
    contains(n) { for (let x = n; x; x = x.parent) if (x === this) return true; return false; }
    querySelector() { return this.buttons[0] || null; }
    querySelectorAll() { return [...this.buttons, ...(this.id === 'countryAlbumOverlay' ? get('albumPhotoGrid').children : [])]; }
  }
  const get = (id) => registry[id] || (registry[id] = new El(id));
  const body = new El('body');
  doc.body = body;
  doc.activeElement = body;
  doc.getElementById = get;
  doc.createElement = () => new El('made');
  doc.addEventListener = (t, f) => { (doc.listeners[t] ||= []).push(f); };
  for (const id of ['nutshellOverlay', 'countryAlbumOverlay', 'photoLightboxOverlay', 'certPopupOverlay', 'storyOverlay']) {
    const o = get(id); const close = new El(id + 'Close'); close.parent = o; o.buttons = [close];
  }
  for (const id of ['countryAlbumOverlay', 'photoLightboxOverlay']) get(id).children = [];
  get('albumPhotoGrid').parent = get('countryAlbumOverlay');
  const api = loadClassic('js/popups.js',
    ['openNutshell', 'closeNutshell', 'openCountryAlbum', 'closeCountryAlbum', 'openPhotoLightbox', 'closePhotoLightbox', 'openCert', 'closeCertPopup', 'openStory', 'closeStory'],
    {
      document: doc, window: {},
      countryAlbums: { VE: { flag: 'red', kicker: 'Home', intro: 'Intro' } }, countryData: { VE: { name: 'Venezuela' } },
      countryPhotos: { VE: [{ src: 'a.jpg', caption: 'A' }, { src: 'b.jpg', caption: 'B' }] },
      albumMolecule: '<svg class="album-photo-wm"></svg>', logVlogEvent: () => {},
    });
  const press = (key, opts = {}, target = doc) => {
    const e = { key, shiftKey: !!opts.shift, prevented: false, preventDefault() { this.prevented = true; } };
    for (const f of target.listeners[opts.type || 'keydown'] || []) f(e);
    return e;
  };
  const opener = new El('opener'); opener.parent = body;
  return { api, doc, get, press, opener, isOpen: (id) => get(id).classList.contains('open') };
}

test('opening the album moves focus to its close button, and Escape closes it and gives focus back to the button that opened it', () => {
  const t = build();
  t.opener.focus();
  t.api.openCountryAlbum('VE');
  assert.ok(t.isOpen('countryAlbumOverlay'));
  assert.equal(t.doc.activeElement, t.get('countryAlbumOverlay').buttons[0]);
  t.press('Escape');
  assert.ok(!t.isOpen('countryAlbumOverlay'));
  assert.equal(t.doc.activeElement, t.opener);
});

test('Escape closes only the top popup: the photo viewer first, then the album; focus returns step by step', () => {
  const t = build();
  t.opener.focus();
  t.api.openCountryAlbum('VE');
  const card = t.get('albumPhotoGrid').children[0];
  card.focus();
  t.api.openPhotoLightbox('a.jpg', 'A');
  assert.equal(t.doc.activeElement, t.get('photoLightboxOverlay').buttons[0]);
  t.press('Escape');
  assert.ok(!t.isOpen('photoLightboxOverlay'));
  assert.ok(t.isOpen('countryAlbumOverlay'), 'the album stays open under the photo');
  assert.equal(t.doc.activeElement, card);
  t.press('Escape');
  assert.ok(!t.isOpen('countryAlbumOverlay'));
  assert.equal(t.doc.activeElement, t.opener);
});

test('album photos are reachable and openable from the keyboard: Enter and Space on a card open the photo viewer', () => {
  const t = build();
  t.api.openCountryAlbum('VE');
  const cards = t.get('albumPhotoGrid').children;
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.equal(card.tabIndex, 0, 'a card can take focus');
    assert.equal(card.attrs.role, 'button');
    assert.match(card.attrs['aria-label'], /^Open photo: /);
  }
  for (const key of ['Enter', ' ']) {
    t.api.closePhotoLightbox();
    const e = t.press(key, { type: 'keydown' }, cards[1]);
    assert.ok(t.isOpen('photoLightboxOverlay'), `${JSON.stringify(key)} opens the viewer`);
    assert.ok(e.prevented, 'the key does not also scroll the page');
  }
  t.api.closePhotoLightbox();
  t.press('a', {}, cards[0]);
  assert.ok(!t.isOpen('photoLightboxOverlay'), 'other keys do nothing');
});

test('Tab stays inside the open album: past the last item it wraps to the close button, Shift+Tab from the close button wraps to the last item', () => {
  const t = build();
  t.api.openCountryAlbum('VE');
  const overlay = t.get('countryAlbumOverlay');
  const items = overlay.querySelectorAll();
  const first = items[0], last = items[items.length - 1];
  last.focus();
  let e = t.press('Tab');
  assert.ok(e.prevented); assert.equal(t.doc.activeElement, first);
  e = t.press('Tab', { shift: true });
  assert.ok(e.prevented); assert.equal(t.doc.activeElement, last);
  items[1].focus();
  e = t.press('Tab');
  assert.ok(!e.prevented, 'in the middle, the browser moves focus by itself');
  t.opener.focus();
  e = t.press('Tab');
  assert.ok(e.prevented && t.doc.activeElement === first, 'focus that got outside is pulled back in');
});

test('with nothing open, Tab and Escape do nothing, and closing a popup that is not open does not take focus', () => {
  const t = build();
  t.opener.focus();
  assert.ok(!t.press('Tab').prevented);
  t.press('Escape');
  t.api.closeCountryAlbum(); t.api.closePhotoLightbox(); t.api.closeCertPopup(); t.api.closeNutshell();
  assert.equal(t.doc.activeElement, t.opener);
});

test('the certificate popup and the nutshell take focus on open and give it back on close', () => {
  const t = build();
  t.opener.focus();
  t.api.openCert('Name', 'Issuer', '2024', null);
  assert.equal(t.doc.activeElement, t.get('certPopupOverlay').buttons[0]);
  t.press('Escape');
  assert.ok(!t.isOpen('certPopupOverlay'));
  assert.equal(t.doc.activeElement, t.opener);
  t.api.openNutshell();
  assert.equal(t.doc.activeElement, t.get('nutshellOverlay').buttons[0]);
  t.api.closeNutshell();
  assert.equal(t.doc.activeElement, t.opener);
});

test('the hidden story still closes with Escape and gives the page its scrolling back', () => {
  const t = build();
  t.api.openStory();
  assert.ok(t.isOpen('storyOverlay'));
  assert.equal(t.doc.body.style.overflow, 'hidden');
  t.press('Escape');
  assert.ok(!t.isOpen('storyOverlay'));
  assert.equal(t.doc.body.style.overflow, '');
});

test('the album ends with its photos: no footnote line under them, and no CSS left for one', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const album = html.slice(html.indexOf('id="countryAlbumOverlay"'), html.indexOf('id="photoLightboxOverlay"'));
  assert.ok(album.includes('id="albumPhotoGrid"'), 'the slice is the album');
  assert.doesNotMatch(album, /album-footnote|no next button|back in 30 seconds/);
  assert.doesNotMatch(fs.readFileSync(new URL('../css/map.css', import.meta.url), 'utf8'), /album-footnote/);
});

test('the four popups are announced as modal dialogs with a name', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [cls, name] of [['country-album-popup', /aria-labelledby="albumCountryName"/], ['nutshell-popup', /aria-label="[^"]+"/], ['cert-popup', /aria-labelledby="certPopupName"/]]) {
    const tag = html.match(new RegExp('<div class="' + cls + '"[^>]*>'))[0];
    assert.match(tag, /role="dialog"/, cls);
    assert.match(tag, /aria-modal="true"/, cls);
    assert.match(tag, name, cls);
  }
  const lightbox = html.match(/<div class="photo-lightbox-overlay"[^>]*>/)[0];
  assert.match(lightbox, /role="dialog"/); assert.match(lightbox, /aria-modal="true"/); assert.match(lightbox, /aria-label="[^"]+"/);
});
