import fs from "fs";
import path from "path";

const fontPath = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff2"
);
const exists = fs.existsSync(fontPath);
console.log("font file exists:", exists, fontPath);

(async () => {
  const fontkitMod = await import("fontkit");
  const fontkit = fontkitMod.default || fontkitMod;

  const bidi = await import("bidi-shaper").catch((e) => {
    console.log("bidi-shaper import failed:", e.message);
    return null;
  });
  if (bidi) {
    console.log("bidi-shaper exports:", Object.keys(bidi));
  }
  const render = bidi?.render;

  let font = null;
  if (exists) {
    const buf = fs.readFileSync(fontPath);
    try {
      font = fontkit.create(buf);
      console.log("fontkit.create(buf) OK");
    } catch (e) {
      console.log("fontkit.create failed:", e.message);
      try {
        font = fontkit.openSync(fontPath);
        console.log("fontkit.openSync OK");
      } catch (e2) {
        console.log("fontkit.openSync failed:", e2.message);
      }
    }
  }
  if (!font) {
    console.log("could not open font; aborting glyph check");
    return;
  }
  console.log("numGlyphs:", font.numGlyphs);

  const tests = ["مرحبا بالعالم", "السلام عليكم ورحمة الله", "مشروع اختبار 123", "INV-1001"];
  for (const t of tests) {
    const shaped = render ? render(t) : t;
    const cps = Array.from(shaped);
    let missing = 0;
    const have = [];
    for (const cp of cps) {
      let has = false;
      try {
        has = !!font.hasGlyphForCodepoint(cp.codePointAt(0));
      } catch (e) {
        try {
          has = !!font.glyphForCodepoint(cp.codePointAt(0));
        } catch {
          has = false;
        }
      }
      have.push({ cp: cp.codePointAt(0).toString(16), has });
      if (!has) missing++;
    }
    console.log("---");
    console.log("orig:", JSON.stringify(t));
    console.log("shaped:", JSON.stringify(shaped));
    console.log("render was:", !!render);
    console.log("codepoints:", JSON.stringify(cps.map((c) => c.codePointAt(0).toString(16))));
    console.log("glyphs ok:", have.length, "missing:", missing);
    if (!hasAll(have)) console.log("  MISSING details:", have.filter((h) => !h.has).map((h) => h.cp));
  }
})();

function hasAll(arr) {
  return arr.every((x) => x.has);
}
