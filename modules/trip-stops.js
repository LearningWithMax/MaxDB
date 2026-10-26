// The stops of the Trip page: the site's own words. Pure data, no imports, so Node tests and the page can both read it.
// The globe gets these through mountGlobe(host, { stops: TRIP_STOPS }); Fable's own list in globe-data.js stays as the lab's default.
//
// To change the wording: edit this file, then run `node scripts/trip-list.mjs` (it rewrites the plain stop list in index.html that
// visitors see when the globe cannot load) and `node --test scripts/*.test.mjs`. Positions and countries are Fable's (matched by city
// in scripts/trip-stops.test.mjs); the kind is 'born', 'study' or 'work' and sets the marker and the tag.
// Rules: `what` is one plain line, 120 characters or fewer; no dashes, American spelling, straight apostrophes, Cann.Edenn with two n,
// and Intelcia only by the approved sentence.
export const TRIP_STOPS = [
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'born', when: 'Born here', what: 'The route starts here.' },
  { cc: 'FR', city: 'Poitiers', country: 'France', lat: 46.58, lon: 0.34, kind: 'study', when: '2017 to 2019', what: 'Associate degree in analytical and synthetic chemistry.' },
  { cc: 'CZ', city: 'Prague', country: 'Czech Republic', lat: 50.08, lon: 14.44, kind: 'work', when: '2019', what: 'HPLC research internship at the Czech Academy of Sciences.' },
  { cc: 'FR', city: 'Bordeaux', country: 'France', lat: 44.84, lon: -0.58, kind: 'study', when: '2019 to 2020', what: "Bachelor's in chemistry and polymer formulation, Université de Bordeaux." },
  { cc: 'FR', city: 'Clermont-Ferrand', country: 'France', lat: 45.78, lon: 3.08, kind: 'work', when: '2019 to 2021', what: 'R&D work-study at Michelin, modeling rubber at the molecular level.' },
  { cc: 'IL', city: 'Rehovot', country: 'Israel', lat: 31.89, lon: 34.81, kind: 'work', when: '2021', what: 'Lab assistant at the Weizmann Institute, on algae and calcite research.' },
  { cc: 'ES', city: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70, kind: 'study', when: '2021 to 2022', what: "Master's in Chemical Industry Management." },
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'work', when: '2022 to 2023', what: 'Commercial technical representative at Laboratorios Chacao, in lab and feed.' },
  { cc: 'ES', city: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70, kind: 'work', when: '2023 to 2024', what: 'Operations support and team coordinator at Intelcia. Onboarded every new hire as the team grew from about 10 to 35.' },
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'work', when: '2024 to 2025', what: 'Commercial technician at Avicampo: field visits nationwide and IPPE Atlanta.' },
  { cc: 'IL', city: 'Yashresh', country: 'Israel', lat: 31.87, lon: 34.86, kind: 'work', when: '2025 to 2026', what: 'Team lead at Cann.Edenn, running the greenhouses.' },
];
