const fs = require("fs")
const path = require("path")

console.log("SCRIPT START")

const filePath = path.join(__dirname, "data", "countries.csv")

console.log("PATH:", filePath)
console.log("EXISTS:", fs.existsSync(filePath))

const buffer = fs.readFileSync(filePath)
const csv = buffer.toString("utf8")

console.log("CSV LENGTH:", csv.length)

// 🔧 správný split (Windows + Unix)
const lines = csv.split(/\r?\n/).slice(1)

console.log("LINES COUNT:", lines.length)
console.log("FIRST 5 LINES:")
console.log(lines.slice(0, 5))

const countries = lines
  .map((line, i) => {
    if (!line.trim()) return null

    // DEBUG prvních pár řádků
    if (i < 5) console.log("LINE:", line)

    const lastComma = line.lastIndexOf(",")

    if (i < 5) console.log("LAST COMMA:", lastComma)

    if (lastComma === -1) return null

    const name = line.slice(0, lastComma).replace(/"/g, "").trim()
    const iso = line.slice(lastComma + 1).trim()

    if (i < 5) console.log("PARSED:", name, iso)

    if (!name || !iso) return null

    return {
      name,
      iso,
      cz: "",
      sk: "",
      continent: ""
    }
  })
  .filter(Boolean)

console.log("VALID COUNTRIES:", countries.length)

// seřadit
countries.sort((a, b) => a.name.localeCompare(b.name))

// výstup
countries.forEach(c => {
  console.log(`{ name: "${c.name}", iso: "${c.iso}", cz: "", sk: "", continent: "" },`)
})