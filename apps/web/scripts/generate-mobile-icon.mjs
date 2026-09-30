import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = path.join(webRoot, "..", "mobile");
const svg = await readFile(path.join(mobileRoot, "assets", "sapa_launcher.svg"));
const base = path.join(mobileRoot, "android", "app", "src", "main", "res");
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

for (const [density, size] of Object.entries(sizes)) {
  const mark = await sharp(svg).resize(size, size).png().toBuffer();
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * .22)}" fill="#17233D"/></svg>`);
  const icon = await sharp(background).composite([{ input: mark }]).png().toBuffer();
  await writeFile(path.join(base, `mipmap-${density}`, "ic_launcher.png"), icon);
}
await writeFile(path.join(base, "drawable", "ic_launcher_foreground.png"), await sharp(svg).resize(432, 432).png().toBuffer());
console.log("Ikon launcher SAPA dibuat untuk Android legacy dan adaptive.");
