import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = join(import.meta.dir, "../apps/web/public");

const logos = ["logo.svg", "logo-purple.svg", "logo-teal.svg", "logo-wordmark.svg"];

for (const logo of logos) {
  const svgPath = join(PUBLIC_DIR, logo);
  const pngPath = svgPath.replace(".svg", ".png");

  const svg = readFileSync(svgPath, "utf-8");

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 512 }, // 512px width, height scales proportionally
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(pngPath, pngBuffer);
  console.log(`✓ ${logo} → ${logo.replace(".svg", ".png")}`);
}

console.log("\nDone! PNGs saved to apps/web/public/");
