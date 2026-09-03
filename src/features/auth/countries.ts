/**
 * Every country a person can declare at the age gate (#1764, spec #227 §3).
 *
 * The gate needs a country because the floor is per-country (`floorForCountry`,
 * #1761). It needs the whole world, not just the floor table's rows: an
 * unlisted country takes the catch-all, and a selector that offered only the
 * jurisdictions with an entry would tell the person which countries the app
 * has an opinion about - and would leave everyone else with nothing to pick.
 *
 * **Names are bundled, not resolved at runtime.** `Intl.DisplayNames` is the
 * obvious way to localise a region code, and it is exactly what generated this
 * table - but on Node, once, rather than on the device every launch. Hermes
 * ships a partial `Intl`, so the runtime answer would differ between Android,
 * iOS and web, and a country selector that reads "DE" on one platform is worse
 * than a slightly stale name on all three.
 *
 * They are also deliberately NOT i18n keys. These are reference data like the
 * floor table itself, they change on ISO's schedule rather than the product's,
 * and 500 of them would swamp the `auth` namespace and Weblate both.
 *
 * The list is ISO 3166-1 alpha-2's 249 currently-assigned codes plus `XK`
 * (Kosovo), which is user-assigned rather than ISO-assigned but is where people
 * actually live. Its floor is the catch-all, like any code the table in #1761
 * does not name.
 *
 * ⚠️ Only the `COUNTRIES` table below is generated. The helpers under it are
 * hand-written and survive a regeneration - re-emit the array, not the file.
 *
 * Regenerate (Node with full ICU - `node --version` >= 14 on an official build):
 *
 * ```js
 * const en = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
 * const bg = new Intl.DisplayNames(["bg"], { type: "region", fallback: "none" });
 * // for each code below: { code, en: en.of(code), bg: bg.of(code) }
 * ```
 */

/** One country, named in each language the app ships. */
export interface Country {
  /** ISO 3166-1 alpha-2, uppercase - the form `age_attested_country` stores. */
  code: string;
  en: string;
  bg: string;
}

/**
 * Sorted by English name, which is only the storage order: the selector sorts
 * for the reader's own language (`countriesForLanguage`).
 */
export const COUNTRIES: readonly Country[] = [
  { code: "AF", en: "Afghanistan", bg: "Афганистан" },
  { code: "AX", en: "Åland Islands", bg: "Оландски острови" },
  { code: "AL", en: "Albania", bg: "Албания" },
  { code: "DZ", en: "Algeria", bg: "Алжир" },
  { code: "AS", en: "American Samoa", bg: "Американска Самоа" },
  { code: "AD", en: "Andorra", bg: "Андора" },
  { code: "AO", en: "Angola", bg: "Ангола" },
  { code: "AI", en: "Anguilla", bg: "Ангуила" },
  { code: "AQ", en: "Antarctica", bg: "Антарктика" },
  { code: "AG", en: "Antigua & Barbuda", bg: "Антигуа и Барбуда" },
  { code: "AR", en: "Argentina", bg: "Аржентина" },
  { code: "AM", en: "Armenia", bg: "Армения" },
  { code: "AW", en: "Aruba", bg: "Аруба" },
  { code: "AU", en: "Australia", bg: "Австралия" },
  { code: "AT", en: "Austria", bg: "Австрия" },
  { code: "AZ", en: "Azerbaijan", bg: "Азербайджан" },
  { code: "BS", en: "Bahamas", bg: "Бахамски острови" },
  { code: "BH", en: "Bahrain", bg: "Бахрейн" },
  { code: "BD", en: "Bangladesh", bg: "Бангладеш" },
  { code: "BB", en: "Barbados", bg: "Барбадос" },
  { code: "BY", en: "Belarus", bg: "Беларус" },
  { code: "BE", en: "Belgium", bg: "Белгия" },
  { code: "BZ", en: "Belize", bg: "Белиз" },
  { code: "BJ", en: "Benin", bg: "Бенин" },
  { code: "BM", en: "Bermuda", bg: "Бермудски острови" },
  { code: "BT", en: "Bhutan", bg: "Бутан" },
  { code: "BO", en: "Bolivia", bg: "Боливия" },
  { code: "BA", en: "Bosnia & Herzegovina", bg: "Босна и Херцеговина" },
  { code: "BW", en: "Botswana", bg: "Ботсвана" },
  { code: "BV", en: "Bouvet Island", bg: "остров Буве" },
  { code: "BR", en: "Brazil", bg: "Бразилия" },
  { code: "IO", en: "British Indian Ocean Territory", bg: "Британска територия в Индийския океан" },
  { code: "VG", en: "British Virgin Islands", bg: "Британски Вирджински острови" },
  { code: "BN", en: "Brunei", bg: "Бруней Даруссалам" },
  { code: "BG", en: "Bulgaria", bg: "България" },
  { code: "BF", en: "Burkina Faso", bg: "Буркина Фасо" },
  { code: "BI", en: "Burundi", bg: "Бурунди" },
  { code: "KH", en: "Cambodia", bg: "Камбоджа" },
  { code: "CM", en: "Cameroon", bg: "Камерун" },
  { code: "CA", en: "Canada", bg: "Канада" },
  { code: "CV", en: "Cape Verde", bg: "Кабо Верде" },
  { code: "BQ", en: "Caribbean Netherlands", bg: "Карибска Нидерландия" },
  { code: "KY", en: "Cayman Islands", bg: "Кайманови острови" },
  { code: "CF", en: "Central African Republic", bg: "Централноафриканска република" },
  { code: "TD", en: "Chad", bg: "Чад" },
  { code: "CL", en: "Chile", bg: "Чили" },
  { code: "CN", en: "China", bg: "Китай" },
  { code: "CX", en: "Christmas Island", bg: "остров Рождество" },
  { code: "CC", en: "Cocos (Keeling) Islands", bg: "Кокосови острови (острови Кийлинг)" },
  { code: "CO", en: "Colombia", bg: "Колумбия" },
  { code: "KM", en: "Comoros", bg: "Коморски острови" },
  { code: "CG", en: "Congo - Brazzaville", bg: "Конго (Бразавил)" },
  { code: "CD", en: "Congo - Kinshasa", bg: "Конго (Киншаса)" },
  { code: "CK", en: "Cook Islands", bg: "острови Кук" },
  { code: "CR", en: "Costa Rica", bg: "Коста Рика" },
  { code: "CI", en: "Côte d’Ivoire", bg: "Кот д’Ивоар" },
  { code: "HR", en: "Croatia", bg: "Хърватия" },
  { code: "CU", en: "Cuba", bg: "Куба" },
  { code: "CW", en: "Curaçao", bg: "Кюрасао" },
  { code: "CY", en: "Cyprus", bg: "Кипър" },
  { code: "CZ", en: "Czechia", bg: "Чехия" },
  { code: "DK", en: "Denmark", bg: "Дания" },
  { code: "DJ", en: "Djibouti", bg: "Джибути" },
  { code: "DM", en: "Dominica", bg: "Доминика" },
  { code: "DO", en: "Dominican Republic", bg: "Доминиканска република" },
  { code: "EC", en: "Ecuador", bg: "Еквадор" },
  { code: "EG", en: "Egypt", bg: "Египет" },
  { code: "SV", en: "El Salvador", bg: "Салвадор" },
  { code: "GQ", en: "Equatorial Guinea", bg: "Екваториална Гвинея" },
  { code: "ER", en: "Eritrea", bg: "Еритрея" },
  { code: "EE", en: "Estonia", bg: "Естония" },
  { code: "SZ", en: "Eswatini", bg: "Есватини" },
  { code: "ET", en: "Ethiopia", bg: "Етиопия" },
  { code: "FK", en: "Falkland Islands", bg: "Фолкландски острови" },
  { code: "FO", en: "Faroe Islands", bg: "Фарьорски острови" },
  { code: "FJ", en: "Fiji", bg: "Фиджи" },
  { code: "FI", en: "Finland", bg: "Финландия" },
  { code: "FR", en: "France", bg: "Франция" },
  { code: "GF", en: "French Guiana", bg: "Френска Гвиана" },
  { code: "PF", en: "French Polynesia", bg: "Френска Полинезия" },
  { code: "TF", en: "French Southern Territories", bg: "Френски южни територии" },
  { code: "GA", en: "Gabon", bg: "Габон" },
  { code: "GM", en: "Gambia", bg: "Гамбия" },
  { code: "GE", en: "Georgia", bg: "Грузия" },
  { code: "DE", en: "Germany", bg: "Германия" },
  { code: "GH", en: "Ghana", bg: "Гана" },
  { code: "GI", en: "Gibraltar", bg: "Гибралтар" },
  { code: "GR", en: "Greece", bg: "Гърция" },
  { code: "GL", en: "Greenland", bg: "Гренландия" },
  { code: "GD", en: "Grenada", bg: "Гренада" },
  { code: "GP", en: "Guadeloupe", bg: "Гваделупа" },
  { code: "GU", en: "Guam", bg: "Гуам" },
  { code: "GT", en: "Guatemala", bg: "Гватемала" },
  { code: "GG", en: "Guernsey", bg: "Гърнзи" },
  { code: "GN", en: "Guinea", bg: "Гвинея" },
  { code: "GW", en: "Guinea-Bissau", bg: "Гвинея-Бисау" },
  { code: "GY", en: "Guyana", bg: "Гаяна" },
  { code: "HT", en: "Haiti", bg: "Хаити" },
  { code: "HM", en: "Heard & McDonald Islands", bg: "острови Хърд и Макдоналд" },
  { code: "HN", en: "Honduras", bg: "Хондурас" },
  { code: "HK", en: "Hong Kong SAR China", bg: "Хонконг, САР на Китай" },
  { code: "HU", en: "Hungary", bg: "Унгария" },
  { code: "IS", en: "Iceland", bg: "Исландия" },
  { code: "IN", en: "India", bg: "Индия" },
  { code: "ID", en: "Indonesia", bg: "Индонезия" },
  { code: "IR", en: "Iran", bg: "Иран" },
  { code: "IQ", en: "Iraq", bg: "Ирак" },
  { code: "IE", en: "Ireland", bg: "Ирландия" },
  { code: "IM", en: "Isle of Man", bg: "остров Ман" },
  { code: "IL", en: "Israel", bg: "Израел" },
  { code: "IT", en: "Italy", bg: "Италия" },
  { code: "JM", en: "Jamaica", bg: "Ямайка" },
  { code: "JP", en: "Japan", bg: "Япония" },
  { code: "JE", en: "Jersey", bg: "Джърси" },
  { code: "JO", en: "Jordan", bg: "Йордания" },
  { code: "KZ", en: "Kazakhstan", bg: "Казахстан" },
  { code: "KE", en: "Kenya", bg: "Кения" },
  { code: "KI", en: "Kiribati", bg: "Кирибати" },
  { code: "XK", en: "Kosovo", bg: "Косово" },
  { code: "KW", en: "Kuwait", bg: "Кувейт" },
  { code: "KG", en: "Kyrgyzstan", bg: "Киргизстан" },
  { code: "LA", en: "Laos", bg: "Лаос" },
  { code: "LV", en: "Latvia", bg: "Латвия" },
  { code: "LB", en: "Lebanon", bg: "Ливан" },
  { code: "LS", en: "Lesotho", bg: "Лесото" },
  { code: "LR", en: "Liberia", bg: "Либерия" },
  { code: "LY", en: "Libya", bg: "Либия" },
  { code: "LI", en: "Liechtenstein", bg: "Лихтенщайн" },
  { code: "LT", en: "Lithuania", bg: "Литва" },
  { code: "LU", en: "Luxembourg", bg: "Люксембург" },
  { code: "MO", en: "Macao SAR China", bg: "Макао, САР на Китай" },
  { code: "MG", en: "Madagascar", bg: "Мадагаскар" },
  { code: "MW", en: "Malawi", bg: "Малави" },
  { code: "MY", en: "Malaysia", bg: "Малайзия" },
  { code: "MV", en: "Maldives", bg: "Малдиви" },
  { code: "ML", en: "Mali", bg: "Мали" },
  { code: "MT", en: "Malta", bg: "Малта" },
  { code: "MH", en: "Marshall Islands", bg: "Маршалови острови" },
  { code: "MQ", en: "Martinique", bg: "Мартиника" },
  { code: "MR", en: "Mauritania", bg: "Мавритания" },
  { code: "MU", en: "Mauritius", bg: "Мавриций" },
  { code: "YT", en: "Mayotte", bg: "Майот" },
  { code: "MX", en: "Mexico", bg: "Мексико" },
  { code: "FM", en: "Micronesia", bg: "Микронезия" },
  { code: "MD", en: "Moldova", bg: "Молдова" },
  { code: "MC", en: "Monaco", bg: "Монако" },
  { code: "MN", en: "Mongolia", bg: "Монголия" },
  { code: "ME", en: "Montenegro", bg: "Черна гора" },
  { code: "MS", en: "Montserrat", bg: "Монтсерат" },
  { code: "MA", en: "Morocco", bg: "Мароко" },
  { code: "MZ", en: "Mozambique", bg: "Мозамбик" },
  { code: "MM", en: "Myanmar (Burma)", bg: "Мианмар (Бирма)" },
  { code: "NA", en: "Namibia", bg: "Намибия" },
  { code: "NR", en: "Nauru", bg: "Науру" },
  { code: "NP", en: "Nepal", bg: "Непал" },
  { code: "NL", en: "Netherlands", bg: "Нидерландия" },
  { code: "NC", en: "New Caledonia", bg: "Нова Каледония" },
  { code: "NZ", en: "New Zealand", bg: "Нова Зеландия" },
  { code: "NI", en: "Nicaragua", bg: "Никарагуа" },
  { code: "NE", en: "Niger", bg: "Нигер" },
  { code: "NG", en: "Nigeria", bg: "Нигерия" },
  { code: "NU", en: "Niue", bg: "Ниуе" },
  { code: "NF", en: "Norfolk Island", bg: "остров Норфолк" },
  { code: "KP", en: "North Korea", bg: "Северна Корея" },
  { code: "MK", en: "North Macedonia", bg: "Северна Македония" },
  { code: "MP", en: "Northern Mariana Islands", bg: "Северни Мариански острови" },
  { code: "NO", en: "Norway", bg: "Норвегия" },
  { code: "OM", en: "Oman", bg: "Оман" },
  { code: "PK", en: "Pakistan", bg: "Пакистан" },
  { code: "PW", en: "Palau", bg: "Палау" },
  { code: "PS", en: "Palestinian Territories", bg: "Палестински територии" },
  { code: "PA", en: "Panama", bg: "Панама" },
  { code: "PG", en: "Papua New Guinea", bg: "Папуа-Нова Гвинея" },
  { code: "PY", en: "Paraguay", bg: "Парагвай" },
  { code: "PE", en: "Peru", bg: "Перу" },
  { code: "PH", en: "Philippines", bg: "Филипини" },
  { code: "PN", en: "Pitcairn Islands", bg: "Острови Питкерн" },
  { code: "PL", en: "Poland", bg: "Полша" },
  { code: "PT", en: "Portugal", bg: "Португалия" },
  { code: "PR", en: "Puerto Rico", bg: "Пуерто Рико" },
  { code: "QA", en: "Qatar", bg: "Катар" },
  { code: "RE", en: "Réunion", bg: "Реюнион" },
  { code: "RO", en: "Romania", bg: "Румъния" },
  { code: "RU", en: "Russia", bg: "Русия" },
  { code: "RW", en: "Rwanda", bg: "Руанда" },
  { code: "WS", en: "Samoa", bg: "Самоа" },
  { code: "SM", en: "San Marino", bg: "Сан Марино" },
  { code: "ST", en: "São Tomé & Príncipe", bg: "Сао Томе и Принсипи" },
  { code: "SA", en: "Saudi Arabia", bg: "Саудитска Арабия" },
  { code: "SN", en: "Senegal", bg: "Сенегал" },
  { code: "RS", en: "Serbia", bg: "Сърбия" },
  { code: "SC", en: "Seychelles", bg: "Сейшели" },
  { code: "SL", en: "Sierra Leone", bg: "Сиера Леоне" },
  { code: "SG", en: "Singapore", bg: "Сингапур" },
  { code: "SX", en: "Sint Maarten", bg: "Синт Мартен" },
  { code: "SK", en: "Slovakia", bg: "Словакия" },
  { code: "SI", en: "Slovenia", bg: "Словения" },
  { code: "SB", en: "Solomon Islands", bg: "Соломонови острови" },
  { code: "SO", en: "Somalia", bg: "Сомалия" },
  { code: "ZA", en: "South Africa", bg: "Южна Африка" },
  {
    code: "GS",
    en: "South Georgia & South Sandwich Islands",
    bg: "Южна Джорджия и Южни Сандвичеви острови",
  },
  { code: "KR", en: "South Korea", bg: "Южна Корея" },
  { code: "SS", en: "South Sudan", bg: "Южен Судан" },
  { code: "ES", en: "Spain", bg: "Испания" },
  { code: "LK", en: "Sri Lanka", bg: "Шри Ланка" },
  { code: "BL", en: "St. Barthélemy", bg: "Сен Бартелеми" },
  { code: "SH", en: "St. Helena", bg: "Света Елена" },
  { code: "KN", en: "St. Kitts & Nevis", bg: "Сейнт Китс и Невис" },
  { code: "LC", en: "St. Lucia", bg: "Сейнт Лусия" },
  { code: "MF", en: "St. Martin", bg: "Сен Мартен" },
  { code: "PM", en: "St. Pierre & Miquelon", bg: "Сен Пиер и Микелон" },
  { code: "VC", en: "St. Vincent & Grenadines", bg: "Сейнт Винсънт и Гренадини" },
  { code: "SD", en: "Sudan", bg: "Судан" },
  { code: "SR", en: "Suriname", bg: "Суринам" },
  { code: "SJ", en: "Svalbard & Jan Mayen", bg: "Свалбард и Ян Майен" },
  { code: "SE", en: "Sweden", bg: "Швеция" },
  { code: "CH", en: "Switzerland", bg: "Швейцария" },
  { code: "SY", en: "Syria", bg: "Сирия" },
  { code: "TW", en: "Taiwan", bg: "Тайван" },
  { code: "TJ", en: "Tajikistan", bg: "Таджикистан" },
  { code: "TZ", en: "Tanzania", bg: "Танзания" },
  { code: "TH", en: "Thailand", bg: "Тайланд" },
  { code: "TL", en: "Timor-Leste", bg: "Тимор Лесте" },
  { code: "TG", en: "Togo", bg: "Того" },
  { code: "TK", en: "Tokelau", bg: "Токелау" },
  { code: "TO", en: "Tonga", bg: "Тонга" },
  { code: "TT", en: "Trinidad & Tobago", bg: "Тринидад и Тобаго" },
  { code: "TN", en: "Tunisia", bg: "Тунис" },
  { code: "TR", en: "Türkiye", bg: "Турция" },
  { code: "TM", en: "Turkmenistan", bg: "Туркменистан" },
  { code: "TC", en: "Turks & Caicos Islands", bg: "острови Търкс и Кайкос" },
  { code: "TV", en: "Tuvalu", bg: "Тувалу" },
  { code: "UM", en: "U.S. Outlying Islands", bg: "Отдалечени острови на САЩ" },
  { code: "VI", en: "U.S. Virgin Islands", bg: "Американски Вирджински острови" },
  { code: "UG", en: "Uganda", bg: "Уганда" },
  { code: "UA", en: "Ukraine", bg: "Украйна" },
  { code: "AE", en: "United Arab Emirates", bg: "Обединени арабски емирства" },
  { code: "GB", en: "United Kingdom", bg: "Обединеното кралство" },
  { code: "US", en: "United States", bg: "Съединени щати" },
  { code: "UY", en: "Uruguay", bg: "Уругвай" },
  { code: "UZ", en: "Uzbekistan", bg: "Узбекистан" },
  { code: "VU", en: "Vanuatu", bg: "Вануату" },
  { code: "VA", en: "Vatican City", bg: "Ватикан" },
  { code: "VE", en: "Venezuela", bg: "Венецуела" },
  { code: "VN", en: "Vietnam", bg: "Виетнам" },
  { code: "WF", en: "Wallis & Futuna", bg: "Уолис и Футуна" },
  { code: "EH", en: "Western Sahara", bg: "Западна Сахара" },
  { code: "YE", en: "Yemen", bg: "Йемен" },
  { code: "ZM", en: "Zambia", bg: "Замбия" },
  { code: "ZW", en: "Zimbabwe", bg: "Зимбабве" },
];

const BY_CODE: ReadonlyMap<string, Country> = new Map(COUNTRIES.map((c) => [c.code, c]));

/**
 * The bundled name for a code, in `language` where we have one.
 *
 * Falls back to the code itself rather than throwing or returning empty: an
 * unrecognised code reaches here only from stored data, and showing "ZZ" beats
 * showing a blank row where a country should be.
 */
export function countryName(code: string, language: string): string {
  const country = BY_CODE.get(code.trim().toUpperCase());
  if (!country) return code.trim().toUpperCase();
  return language.startsWith("bg") ? country.bg : country.en;
}

export interface NamedCountry {
  code: string;
  name: string;
}

/**
 * Case- and accent-insensitive form for matching.
 *
 * `normalize` is guarded because Hermes' Unicode support is the same partial
 * story as its `Intl`: where it is missing, "cote" simply stops matching
 * "Côte d'Ivoire" and everything else still works. The combining-mark range is
 * written out rather than as `\p{M}`, which needs regex unicode property
 * escapes that are a second thing to be unsure about.
 */
function fold(value: string): string {
  const lower = value.toLowerCase();
  try {
    return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return lower;
  }
}

/**
 * The countries worth offering for what the person has typed so far.
 *
 * Ranked, not merely filtered: an exact code, then names that START with the
 * query, then names that merely contain it. Typing "ni" should offer Nicaragua
 * and Niger before Bosnia & Herzegovina, and a plain `includes` filter does the
 * opposite - it returns them in alphabetical order, which puts the two
 * countries the person probably means below one they did not type.
 *
 * `limit` exists because this feeds a short list rendered under a text field
 * rather than a scrollable modal. An empty query returns nothing rather than
 * everything, for the same reason.
 */
export function searchCountries(language: string, query: string, limit = 8): NamedCountry[] {
  const needle = fold(query.trim());
  if (!needle) return [];

  const exact: NamedCountry[] = [];
  const prefix: NamedCountry[] = [];
  const contains: NamedCountry[] = [];

  for (const country of countriesForLanguage(language)) {
    const name = fold(country.name);
    if (country.code.toLowerCase() === needle) {
      exact.push(country);
    } else if (name.startsWith(needle)) {
      prefix.push(country);
    } else if (name.includes(needle)) {
      contains.push(country);
    }
  }

  return [...exact, ...prefix, ...contains].slice(0, limit);
}

/**
 * Every country named and ordered for a reader of `language`.
 *
 * Ordering is cosmetic and `localeCompare` is allowed to be approximate: a
 * runtime without collation data falls back to code-point order, which is
 * already correct for the Bulgarian alphabet and only misplaces the handful of
 * accented English names (Åland, Côte d'Ivoire, Réunion, São Tomé, Türkiye).
 * The names themselves are bundled precisely because a wrong NAME would not be
 * cosmetic.
 */
export function countriesForLanguage(language: string): NamedCountry[] {
  const named = COUNTRIES.map((country) => ({
    code: country.code,
    name: language.startsWith("bg") ? country.bg : country.en,
  }));
  return named.sort((a, b) => a.name.localeCompare(b.name, language));
}
