const fs = require("fs");
const path = require("path");

const apiBaseUrl = process.env.API_BASE_URL;

if (!apiBaseUrl) {
  console.error("❌ Missing API_BASE_URL environment variable.");
  process.exit(1);
}

const filePath = path.join(__dirname, "../src/environments/environment.prod.ts");

let content = fs.readFileSync(filePath, "utf8");

// Reemplaza SOLO el placeholder
content = content.replace("__API_BASE_URL__", apiBaseUrl);

fs.writeFileSync(filePath, content, "utf8");

console.log("✅ Injected API_BASE_URL into environment.prod.ts:", apiBaseUrl);
