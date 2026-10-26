//= Analytics consent: GA4 loads only after Accept.

function loadAnalyticsScript(){
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-W7V9P0BRKP';
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', 'G-W7V9P0BRKP');
}
function acceptConsent(){
  try{ localStorage.setItem('mdb-consent', 'accepted'); }catch(e){}
  loadAnalyticsScript();
  document.getElementById('consentBanner').classList.remove('show');
}
function declineConsent(){
  try{ localStorage.setItem('mdb-consent', 'declined'); }catch(e){}
  document.getElementById('consentBanner').classList.remove('show');
}
(function(){
  try{
    if(!localStorage.getItem('mdb-consent')){
      document.getElementById('consentBanner').classList.add('show');
    }
  }catch(e){}
})();
