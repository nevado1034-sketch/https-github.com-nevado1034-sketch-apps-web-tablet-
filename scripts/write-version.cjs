const fs = require("fs");
const path = require("path");
const dist = path.join(__dirname, "..", "dist");
const assets = path.join(dist, "assets");
if (!fs.existsSync(assets)) {
  console.error("No hay bundle en dist. Corre 'vite build' primero.");
  process.exit(1);
}
const jsFile = fs.readdirSync(assets).find((f) => f.startsWith("index-") && f.endsWith(".js"));
if (!jsFile) {
  console.error("No se encontró el bundle index-*.js");
  process.exit(1);
}
const version = jsFile.replace("index-", "").replace(".js", "");
fs.writeFileSync(path.join(dist, "version.txt"), version + "\n");
console.log("version.txt =", version);