//= Popups: nutshell, country album + lightbox, certificates, hidden story.

// Keyboard and focus for the popups. A popup takes focus on its close button when it opens, gives focus back to what opened it
// when it closes, keeps Tab inside while it is open, and closes on Escape (the top one first, see POPUP_STACK at the end).
const popupOpeners = {};
function openPopup(id){
  const el = document.getElementById(id);
  if(!el.classList.contains('open')){
    const a = document.activeElement;
    popupOpeners[id] = a && a !== document.body ? a : null;
  }
  el.classList.add('open');
  const first = el.querySelector('button');
  if(first) first.focus();
}
function closePopup(id){
  const el = document.getElementById(id);
  const wasOpen = el.classList.contains('open');
  el.classList.remove('open');
  if(!wasOpen) return;
  const back = popupOpeners[id];
  popupOpeners[id] = null;
  if(back && back.isConnected !== false && typeof back.focus === 'function') back.focus();
}
function trapTab(e, id){
  const el = document.getElementById(id);
  const items = [...el.querySelectorAll('button, [tabindex="0"]')];
  if(!items.length) return;
  const first = items[0], last = items[items.length - 1];
  const inside = el.contains(document.activeElement);
  if(e.shiftKey && (!inside || document.activeElement === first)){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && (!inside || document.activeElement === last)){ e.preventDefault(); first.focus(); }
}

function openNutshell(){
  openPopup('nutshellOverlay');
  logVlogEvent('Cracked open the walnut');
}
function closeNutshell(){
  closePopup('nutshellOverlay');
}
document.getElementById('nutshellOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'nutshellOverlay') closeNutshell();
});

function openCountryAlbum(id){
  const info = countryAlbums[id];
  const d = countryData[id];
  if(!info || !d) return;
  document.getElementById('albumFlagStrip').style.background = info.flag;
  document.getElementById('albumKicker').textContent = info.kicker;
  document.getElementById('albumCountryName').textContent = d.name;
  document.getElementById('albumIntroText').textContent = info.intro;
  const grid = document.getElementById('albumPhotoGrid');
  grid.innerHTML = '';
  const photos = countryPhotos[id];
  if(photos && photos.length){
    photos.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'album-photo-card';
      card.onclick = ()=>openPhotoLightbox(p.src, p.caption);
      makeCardKeyboardable(card, 'Open photo: ' + p.caption, ()=>openPhotoLightbox(p.src, p.caption));
      const wm = p.wm ? albumMolecule.replace('class="album-photo-wm"', 'class="album-photo-wm wm-strong"') : albumMolecule;
      card.innerHTML = '<img class="album-photo-img" src="' + p.src + '" alt="' + p.caption + '">' + wm + '<div class="album-photo-caption">' + p.caption + '</div>';
      grid.appendChild(card);
    });
  } else {
    for(let i=0;i<3;i++){
      const card = document.createElement('div');
      card.className = 'album-photo-card';
      card.onclick = ()=>openPhotoLightbox(null, null);
      makeCardKeyboardable(card, 'Open photo: image yet to be uploaded', ()=>openPhotoLightbox(null, null));
      card.innerHTML = '<div class="album-photo-placeholder"><span>Image yet to be uploaded</span>' + albumMolecule + '</div>';
      grid.appendChild(card);
    }
  }
  openPopup('countryAlbumOverlay');
  logVlogEvent('Opened the ' + d.name + ' album');
}
function makeCardKeyboardable(card, label, open){
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', label);
  card.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
  });
}
function closeCountryAlbum(){
  closePopup('countryAlbumOverlay');
}
function openPhotoLightbox(src, caption){
  const box = document.getElementById('lightboxContent');
  if(src){
    box.innerHTML = '<img class="lightbox-img" src="' + src + '" alt="' + caption + '">' + albumMolecule.replace('album-photo-wm','lightbox-wm');
  } else {
    box.innerHTML = '<div class="lightbox-placeholder"><span>Image yet to be uploaded</span>' + albumMolecule.replace('album-photo-wm','lightbox-wm') + '</div>';
  }
  openPopup('photoLightboxOverlay');
}
function closePhotoLightbox(){
  closePopup('photoLightboxOverlay');
}
document.getElementById('photoLightboxOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'photoLightboxOverlay') closePhotoLightbox();
});
document.getElementById('countryAlbumOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'countryAlbumOverlay') closeCountryAlbum();
});

function openCert(name, issuer, date, imgKey){
  document.getElementById('certPopupName').textContent = name;
  document.getElementById('certPopupMeta').textContent = issuer + ' \u00b7 ' + date;
  const imgBox = document.getElementById('certPopupImage');
  const src = imgKey && window.certImages ? window.certImages[imgKey] : null;
  if(src){
    imgBox.outerHTML = '<img class="cert-popup-image-real" id="certPopupImage" src="' + src + '" alt="' + name + ' certificate">';
  } else {
    imgBox.outerHTML = '<div class="cert-popup-image-placeholder" id="certPopupImage">Certificate image<br>not yet uploaded</div>';
  }
  openPopup('certPopupOverlay');
}
function closeCertPopup(){
  closePopup('certPopupOverlay');
}
document.getElementById('certPopupOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'certPopupOverlay') closeCertPopup();
});

// ---------- Hidden story overlay ----------
const storyOverlay = document.getElementById('storyOverlay');
function openStory(){
  storyOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  storyOverlay.scrollTop = 0;
  logVlogEvent('Found the hidden story');
}
function closeStory(){
  storyOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
// Top first: the photo viewer sits over the album (z-index 400 against 300), the story is under everything.
const POPUP_STACK = [
  { id: 'photoLightboxOverlay', close: closePhotoLightbox, trap: true },
  { id: 'countryAlbumOverlay', close: closeCountryAlbum, trap: true },
  { id: 'certPopupOverlay', close: closeCertPopup, trap: true },
  { id: 'nutshellOverlay', close: closeNutshell, trap: true },
  { id: 'storyOverlay', close: closeStory, trap: false },
];
document.addEventListener('keydown', (e)=>{
  const top = POPUP_STACK.find((p)=>document.getElementById(p.id).classList.contains('open'));
  if(!top) return;
  if(e.key === 'Escape') top.close();
  else if(e.key === 'Tab' && top.trap) trapTab(e, top.id);
});
