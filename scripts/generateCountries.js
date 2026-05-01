const countries = require("i18n-iso-countries")

countries.registerLocale(require("i18n-iso-countries/langs/en.json"))

const all = countries.getNames("en", { select: "official" })

const result = Object.entries(all).map(([iso, name]) => ({
  name,
  iso,
}))

result.sort((a, b) => a.name.localeCompare(b.name))

result.forEach(c => {
  console.log(`{ name: "${c.name}", iso: "${c.iso}", cz: "", sk: "", continent: "" },`)
})