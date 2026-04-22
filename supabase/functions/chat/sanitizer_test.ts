import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  sanitizePdfHtml,
  validatePdfHtml,
  buildFallbackHtml,
  autoBalanceSections,
} from "./index.ts";

/**
 * Common LaTeX/markdown artifact fixtures the model has been observed
 * to leak into PDF output. Each must sanitize → validate → ok=true.
 */
const FIXTURES: Array<{ name: string; raw: string }> = [
  {
    name: "markdown fences around html",
    raw: "```html\n<!DOCTYPE html><html><head><title>T</title></head><body><h1>Title</h1><p>Hello world.</p></body></html>\n```",
  },
  {
    name: "inline LaTeX with $...$",
    raw: "<!DOCTYPE html><html><head><title>T</title></head><body><h1>Math</h1><p>Energy is $E = mc^2$ in physics.</p></body></html>",
  },
  {
    name: "block LaTeX with $$...$$",
    raw: "<!DOCTYPE html><html><head><title>T</title></head><body><h1>Math</h1><p>$$\\frac{a}{b} + \\sqrt{x}$$ is the formula.</p></body></html>",
  },
  {
    name: "begin/end environments",
    raw: "<!DOCTYPE html><html><head><title>T</title></head><body><p>\\begin{equation} x = 1 \\end{equation} done.</p></body></html>",
  },
  {
    name: "markdown headings and bold",
    raw: "<!DOCTYPE html><html><head><title>T</title></head><body><p># Heading\nThis is **bold** and *italic* text.</p></body></html>",
  },
  {
    name: "raw latex commands",
    raw: "<!DOCTYPE html><html><head><title>T</title></head><body><p>The \\lambda value with \\sum and \\theta are common.</p></body></html>",
  },
  {
    name: "no doctype, partial html",
    raw: "<h1>Hello</h1><p>Just a snippet.</p>",
  },
];

for (const fx of FIXTURES) {
  Deno.test(`sanitizer fixture: ${fx.name}`, () => {
    const cleaned = sanitizePdfHtml(fx.raw);
    const v = validatePdfHtml(cleaned);
    if (!v.ok) {
      console.log("FAILED:", fx.name, v.reasons, "\n---\n", cleaned);
    }
    assert(v.ok, `validation failed: ${v.reasons.join(", ")}`);
    // Ensure forbidden artifacts are stripped
    assert(!/```/.test(cleaned), "markdown fences leaked");
    assert(!/\\begin\{|\\frac|\\sqrt/.test(cleaned), "latex leaked");
    assert(!/\$\$[^$]+\$\$/.test(cleaned), "block math leaked");
  });
}

Deno.test("buildFallbackHtml produces valid PDF html", () => {
  const html = buildFallbackHtml("My Title", "Para one.\n\nPara two with more text.");
  const v = validatePdfHtml(html);
  assert(v.ok, `fallback invalid: ${v.reasons.join(", ")}`);
  assert(html.includes("My Title"));
  assert(html.includes("Para one."));
});

Deno.test("validatePdfHtml flags forbidden artifacts", () => {
  const bad = "<!DOCTYPE html><html><head><title>x</title></head><body><p>$$x$$</p></body></html>";
  const v = validatePdfHtml(bad);
  assert(!v.ok);
  assert(v.reasons.includes("dollar-math"));
});

Deno.test("autoBalanceSections caps sections for short length", () => {
  const body = Array.from({ length: 8 })
    .map((_, i) => `<section><h2>S${i}</h2><p>Para ${i}.</p></section>`)
    .join("\n");
  const html = `<!DOCTYPE html><html><head><title>T</title></head><body>${body}</body></html>`;
  const balanced = autoBalanceSections(html, "short");
  const count = (balanced.match(/<section\b/gi) || []).length;
  assert(count <= 4, `expected <=4 sections, got ${count}`);
});

Deno.test("autoBalanceSections splits overlong paragraphs", () => {
  const longText = "Sentence one. ".repeat(120); // ~1680 chars
  const html = `<!DOCTYPE html><html><head><title>T</title></head><body><section><h2>X</h2><p>${longText}</p></section></body></html>`;
  const balanced = autoBalanceSections(html, "medium");
  const paraCount = (balanced.match(/<p>/gi) || []).length;
  assert(paraCount >= 2, `expected paragraph split, got ${paraCount}`);
});