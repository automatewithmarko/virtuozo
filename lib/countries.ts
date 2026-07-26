/**
 * ISO 3166-1 alpha-2 country codes. Meta's geo targeting speaks codes;
 * the UI speaks names. Names come from Intl so both stay consistent.
 */

export const COUNTRY_CODES: string[] = [
  "AD","AE","AF","AG","AL","AM","AO","AR","AT","AU","AZ","BA","BB","BD","BE",
  "BF","BG","BH","BI","BJ","BN","BO","BR","BS","BT","BW","BY","BZ","CA","CD",
  "CF","CG","CH","CI","CL","CM","CN","CO","CR","CU","CV","CY","CZ","DE","DJ",
  "DK","DM","DO","DZ","EC","EE","EG","ER","ES","ET","FI","FJ","FM","FR","GA",
  "GB","GD","GE","GH","GM","GN","GQ","GR","GT","GW","GY","HK","HN","HR","HT",
  "HU","ID","IE","IL","IN","IQ","IS","IT","JM","JO","JP","KE","KG","KH","KI",
  "KM","KN","KR","KW","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV",
  "LY","MA","MC","MD","ME","MG","MH","MK","ML","MM","MN","MR","MT","MU","MV",
  "MW","MX","MY","MZ","NA","NE","NG","NI","NL","NO","NP","NR","NZ","OM","PA",
  "PE","PG","PH","PK","PL","PT","PW","PY","QA","RO","RS","RW","SA","SB","SC",
  "SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST","SV","SZ","TD",
  "TG","TH","TJ","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","US",
  "UY","UZ","VC","VE","VN","VU","WS","XK","YE","ZA","ZM","ZW",
];

const display = new Intl.DisplayNames(["en"], { type: "region" });

const codeToNameMap = new Map<string, string>();
const nameToCodeMap = new Map<string, string>();
for (const code of COUNTRY_CODES) {
  const name = display.of(code) ?? code;
  codeToNameMap.set(code, name);
  nameToCodeMap.set(name.toLowerCase(), code);
}

export function countryCodeToName(code: string): string {
  return codeToNameMap.get(code.toUpperCase()) ?? code;
}

export function countryNameToCode(name: string): string | undefined {
  return nameToCodeMap.get(name.toLowerCase());
}

export const COUNTRY_NAMES: string[] = [...codeToNameMap.values()].sort((a, b) =>
  a.localeCompare(b)
);
