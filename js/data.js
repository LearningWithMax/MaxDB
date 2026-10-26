//= Site data: map countries, album intros, photo list, certificate images.

const countryData = {"VE":{"tier":"born","name":"Venezuela","note":"Born and raised here. Visited hatcheries and farms nationwide, worked in and for a laboratory. Learned about the local poultry industry."},"IL":{"tier":"home","name":"Israel","note":"Home today, in Central Israel. Worked my way up quickly, from the floor to leading a team. Also spent time doing research at a top science institute."},"ES":{"tier":"home","name":"Spain","note":"Lived here while completing a Master's degree. Worked at a company scaling fast, helping every new hire get up to speed."},"FR":{"tier":"study","name":"France","note":"Studied chemistry here, in two different cities. Spent time in an R&D lab looking at rubber on a molecular level."},"CZ":{"tier":"study","name":"Czech Republic","note":"Research internship at ICPF, Czech Academy of Sciences, Prague, running HPLC and HPLC-MS analyses for membrane filtration research."},"RU":{"tier":"visit","name":"Russia","note":"Visited."},"TR":{"tier":"visit","name":"Turkey","note":"Visited."},"BE":{"tier":"visit","name":"Belgium","note":"Visited."},"HR":{"tier":"visit","name":"Croatia","note":"Visited."},"DK":{"tier":"visit","name":"Denmark","note":"Visited."},"EE":{"tier":"visit","name":"Estonia","note":"Visited."},"FI":{"tier":"visit","name":"Finland","note":"Visited."},"MQ":{"tier":"visit","name":"Martinique","note":"Visited."},"GR":{"tier":"visit","name":"Greece","note":"Visited."},"IE":{"tier":"visit","name":"Ireland","note":"Visited."},"IT":{"tier":"visit","name":"Italy","note":"Visited, including Vatican City."},"NO":{"tier":"visit","name":"Norway","note":"Visited."},"AW":{"tier":"visit","name":"Aruba","note":"Visited."},"CW":{"tier":"visit","name":"Curaçao","note":"Visited."},"PT":{"tier":"visit","name":"Portugal","note":"Visited."},"CH":{"tier":"visit","name":"Switzerland","note":"Visited."},"GB":{"tier":"visit","name":"United Kingdom","note":"Visited England, Scotland and Wales."},"DO":{"tier":"visit","name":"Dominican Republic","note":"Visited."},"HT":{"tier":"visit","name":"Haiti","note":"Visited."},"JM":{"tier":"visit","name":"Jamaica","note":"Visited."},"MX":{"tier":"visit","name":"Mexico","note":"Visited."},"PA":{"tier":"visit","name":"Panama","note":"Visited."},"US":{"tier":"visit","name":"United States","note":"Visited, including IPPE Atlanta, the world's largest poultry trade show."},"BR":{"tier":"visit","name":"Brazil","note":"Visited, including SIAVS in São Paulo."},"CO":{"tier":"visit","name":"Colombia","note":"Visited."},"EC":{"tier":"visit","name":"Ecuador","note":"Visited."},"PE":{"tier":"visit","name":"Peru","note":"Visited."}};
const tierLabels = {born:'Born here', home:'Lived & worked', study:'Studied / interned', visit:'Visited'};

const countryAlbums = {
  VE: { kicker: '🇻🇪 Born here', flag: 'linear-gradient(180deg,#FCD116 0%,#FCD116 33%,#003893 33%,#003893 66%,#CF142B 66%,#CF142B 100%)', intro: "Caracas, born and raised. Arepas for breakfast, hallacas at Christmas. Venezuelans are warm, loud in the best way, and fiercely proud of home, even from far away." },
  IL: { kicker: '🇮🇱 Home now', flag: 'linear-gradient(180deg,#0038b8 0%,#0038b8 25%,#ffffff 25%,#ffffff 75%,#0038b8 75%,#0038b8 100%)', intro: "Central Israel, home today. Shabbat dinners, a culture that says exactly what it thinks, no filter. Israelis are direct, warm once you're in, and somehow always finding a reason to gather around food." },
  FR: { kicker: '🇫🇷 Lived & Studied', flag: 'linear-gradient(90deg,#0055A4 0%,#0055A4 33%,#ffffff 33%,#ffffff 66%,#EF4135 66%,#EF4135 100%)', intro: "French, through and through. Poitiers, then Bordeaux, then Clermont-Ferrand, chasing chemistry all over the place. Bread as a daily ritual, not a special occasion. The wine and the cheese, occasionally. The French take pride seriously. Arguing about food, politics, anything, is basically a national pastime." },
  ES: { kicker: '🇪🇸 Lived & Studied', flag: 'linear-gradient(180deg,#AA151B 0%,#AA151B 25%,#F1BF00 25%,#F1BF00 75%,#AA151B 75%,#AA151B 100%)', intro: "Madrid, a second home. Tapas meant for sharing, dinner that never starts before nine, plazas full of people with somewhere to be and no rush to get there. Spaniards make time for each other, without really trying." }
};
const countryPhotos = {
  VE: [
    { src: 'img/photos/ve-el-avila-caracas.jpg', caption: 'El Ávila, Caracas', wm: true },
    { src: 'img/photos/ve-sunset-in-the-jungle.jpg', caption: 'Sunset in the jungle' },
    { src: 'img/photos/ve-a-home-on-the-orinoco-riverbank.jpg', caption: 'A home on the Orinoco riverbank', wm: true },
  ],
  ES: [
    { src: 'img/photos/es-guggenheim-museum-bilbao.jpg', caption: 'Guggenheim Museum, Bilbao' },
    { src: 'img/photos/es-la-concha-beach-san-sebastian.jpg', caption: 'La Concha Beach, San Sebastián', wm: true },
    { src: 'img/photos/es-tower-of-hercules-a-coruna.jpg', caption: 'Tower of Hercules, A Coruña' },
  ],
  FR: [
    { src: 'img/photos/fr-cap-ferret.jpg', caption: 'Cap-Ferret', wm: true },
    { src: 'img/photos/fr-la-mongie.jpg', caption: 'La Mongie' },
    { src: 'img/photos/fr-oyster-parks.jpg', caption: 'Oyster beds' },
  ],
  IL: [
    { src: 'img/photos/il-masada.jpg', caption: 'Masada' },
    { src: 'img/photos/il-road-to-the-dead-sea.jpg', caption: 'Road to the Dead Sea', wm: true },
    { src: 'img/photos/il-haifa-from-acco.jpg', caption: 'Haifa, from Acco' }
  ]
};
const albumMolecule = '<svg class="album-photo-wm" viewBox="120 0 82 45"><polygon points="161,26 154.5,37.26 141.5,37.26 135,26 141.5,14.74 154.5,14.74" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="158.5" y1="24.4" x2="153.2" y2="16.2" stroke="currentColor" stroke-width="2.2"/><line x1="161" y1="26" x2="172" y2="26" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><text x="173" y="30" font-family="Inter" font-weight="800" font-size="13" fill="currentColor">OH</text></svg>';

window.certImages = {
  claude101: 'img/certs/claude101.jpg',
  aifluency: 'img/certs/aifluency.jpg'
};
