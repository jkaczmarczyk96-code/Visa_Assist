export type Country = {
  name: string
  iso: string
  cz: string
  sk: string
  continent: string
}

export const COUNTRIES_DATA: Country[] = [
  // AFRIKA
  { name: "Egypt", iso: "EG", cz: "egypt", sk: "egypt", continent: "afrika" },
  { name: "Morocco", iso: "MA", cz: "maroko", sk: "maroko", continent: "afrika" },
  { name: "Tunisia", iso: "TN", cz: "tunisko", sk: "tunisko", continent: "afrika" },
  { name: "Kenya", iso: "KE", cz: "kena", sk: "kena", continent: "afrika" },
  { name: "Tanzania", iso: "TZ", cz: "tanzanie", sk: "tanzania", continent: "afrika" },
  { name: "South Africa", iso: "ZA", cz: "jihoafricka_republika", sk: "juhoafricka-republika", continent: "afrika" },
  { name: "Namibia", iso: "NA", cz: "namibie", sk: "namibia", continent: "afrika" },
  { name: "Zambia", iso: "ZM", cz: "zambie", sk: "zambia", continent: "afrika" },
  { name: "Zimbabwe", iso: "ZW", cz: "zimbabwe", sk: "zimbabwe", continent: "afrika" },
  { name: "Ethiopia", iso: "ET", cz: "etiopie", sk: "etiopia", continent: "afrika" },
  { name: "Rwanda", iso: "RW", cz: "rwanda", sk: "rwanda", continent: "afrika" },
  { name: "Ghana", iso: "GH", cz: "ghana", sk: "ghana", continent: "afrika" },
  { name: "Nigeria", iso: "NG", cz: "nigerie", sk: "nigeria", continent: "afrika" },
  { name: "Uganda", iso: "UG", cz: "uganda", sk: "uganda", continent: "afrika" },

  // ASIE
  { name: "Thailand", iso: "TH", cz: "thajsko", sk: "thajsko", continent: "asie" },
  { name: "Vietnam", iso: "VN", cz: "vietnam", sk: "vietnam", continent: "asie" },
  { name: "Indonesia", iso: "ID", cz: "indonesie", sk: "indonezia", continent: "asie" },
  { name: "Malaysia", iso: "MY", cz: "malajsie", sk: "malajzia", continent: "asie" },
  { name: "Philippines", iso: "PH", cz: "filipiny", sk: "filipiny", continent: "asie" },
  { name: "Japan", iso: "JP", cz: "japonsko", sk: "japonsko", continent: "asie" },
  { name: "South Korea", iso: "KR", cz: "korejska_republika", sk: "juzna-korea", continent: "asie" },
  { name: "Singapore", iso: "SG", cz: "singapur", sk: "singapur", continent: "asie" },
  { name: "India", iso: "IN", cz: "indie", sk: "india", continent: "asie" },
  { name: "Sri Lanka", iso: "LK", cz: "sri_lanka", sk: "srí-lanka", continent: "asie" },
  { name: "Nepal", iso: "NP", cz: "nepal", sk: "nepal", continent: "asie" },
  { name: "Maldives", iso: "MV", cz: "maledivy", sk: "maldivy", continent: "asie" },
  { name: "United Arab Emirates", iso: "AE", cz: "spojene_arabske_emiraty", sk: "spojene-arabske-emiraty", continent: "asie" },
  { name: "Qatar", iso: "QA", cz: "katar", sk: "katar", continent: "asie" },
  { name: "Saudi Arabia", iso: "SA", cz: "saudska_arabie", sk: "saudska-arabia", continent: "asie" },
  { name: "Oman", iso: "OM", cz: "oman", sk: "oman", continent: "asie" },
  { name: "Jordan", iso: "JO", cz: "jordansko", sk: "jordansko", continent: "asie" },
  { name: "Israel", iso: "IL", cz: "izrael", sk: "izrael", continent: "asie" },
  { name: "China", iso: "CN", cz: "cina", sk: "cina", continent: "asie" },
  { name: "Hong Kong", iso: "HK", cz: "hongkong", sk: "hongkong", continent: "asie" },
  { name: "Taiwan", iso: "TW", cz: "taiwan", sk: "taiwan", continent: "asie" },
  { name: "Kazakhstan", iso: "KZ", cz: "kazachstan", sk: "kazachstan", continent: "asie" },
  { name: "Uzbekistan", iso: "UZ", cz: "uzbekistan", sk: "uzbekistan", continent: "asie" },
  { name: "Georgia", iso: "GE", cz: "gruzie", sk: "gruzinsko", continent: "asie" },
  { name: "Armenia", iso: "AM", cz: "armenie", sk: "armensko", continent: "asie" },
  { name: "Azerbaijan", iso: "AZ", cz: "azerbajdzan", sk: "azerbajdzan", continent: "asie" },
  { name: "Cambodia", iso: "KH", cz: "kambodza", sk: "kambodza", continent: "asie" },
  { name: "Laos", iso: "LA", cz: "laos", sk: "laos", continent: "asie" },
  { name: "Bangladesh", iso: "BD", cz: "banglades", sk: "banglades", continent: "asie" },

  // AMERIKA
  { name: "United States", iso: "US", cz: "usa", sk: "spojene-staty-americke", continent: "severni_amerika" },
  { name: "Canada", iso: "CA", cz: "kanada", sk: "kanada", continent: "severni_amerika" },
  { name: "Mexico", iso: "MX", cz: "mexiko", sk: "mexiko", continent: "severni_amerika" },
  { name: "Cuba", iso: "CU", cz: "kuba", sk: "kuba", continent: "stredni_amerika" },
  { name: "Dominican Republic", iso: "DO", cz: "dominikanska_republika", sk: "dominikanska_republika", continent: "stredni_amerika" },
  { name: "Jamaica", iso: "JM", cz: "jamajka", sk: "jamajka", continent: "stredni_amerika" },
  { name: "Costa Rica", iso: "CR", cz: "kostarika", sk: "kostarika", continent: "stredni_amerika" },
  { name: "Panama", iso: "PA", cz: "panama", sk: "panama", continent: "stredni_amerika" },
  { name: "Brazil", iso: "BR", cz: "brazilie", sk: "brazilia", continent: "jizni_amerika" },
  { name: "Argentina", iso: "AR", cz: "argentina", sk: "argentina", continent: "jizni_amerika" },
  { name: "Chile", iso: "CL", cz: "chile", sk: "cile", continent: "jizni_amerika" },
  { name: "Peru", iso: "PE", cz: "peru", sk: "peru", continent: "jizni_amerika" },
  { name: "Colombia", iso: "CO", cz: "kolumbie", sk: "kolumbia", continent: "jizni_amerika" },
  { name: "Ecuador", iso: "EC", cz: "ekvador", sk: "ekvador", continent: "jizni_amerika" },

  // OSTATNÍ
  { name: "Australia", iso: "AU", cz: "australie", sk: "australia", continent: "australie_a_oceanie" },
  { name: "New Zealand", iso: "NZ", cz: "novy_zeland", sk: "novy-zeland", continent: "australie_a_oceanie" },
]

// 🔤 dropdown
export const COUNTRIES = COUNTRIES_DATA.map(c => c.name).sort()

// 🔍 helpers
export function getCountry(name: string) {
  return COUNTRIES_DATA.find(c => c.name === name)
}

export function getCountryByIso(iso: string) {
  return COUNTRIES_DATA.find(c => c.iso === iso)
}

export function toApiFormat(name: string) {
  const c = getCountry(name)
  return c ? c.iso : name
}

// 🔗 MZV CZ
export function getMzvCzLink(name: string) {
  const c = getCountry(name)
  if (!c) return null
  return `https://mzv.gov.cz/jnp/cz/encyklopedie_statu/${c.continent}/${c.cz}/cestovani/index.html`
}

// 🔗 MZV SK
export function getMzvSkLink(name: string) {
  const c = getCountry(name)
  if (!c) return null
  return `https://www.mzv.sk/web/sk/${c.sk}`
}