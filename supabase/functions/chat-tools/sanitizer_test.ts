import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  sanitizeBodyHtml,
  ensureSingleH1,
  validatePdfHtml,
  processPdfHtml,
} from "./sanitizer.ts";

/**
 * Messy inputs the AI has historically leaked into PDF output.
 * After processPdfHtml(), every fixture must produce PDF-safe HTML
 * with: exactly 1 <h1>, ≥1 <p>, no LaTeX, no markdown fences, no wrappers.
 */
const MESSY_FIXTURES: Array<{ name: string; raw: string; title: string }> = [
  {
    name: "markdown fences around full html doc",
    title: "T",
    raw: "```html\n<!DOCTYPE html><html><head><title>T</title></head><body><h1>Title</h1><section><h2>A</h2><p>One.</p></section></body></html>\n```",
  },
  {
    name: "inline LaTeX with $...$",
    title: "Math",
    raw: "<h1>Math</h1><section><p>Energy is $E = mc^2$ in physics. Also see $\\alpha + \\beta$.</p></section>",
  },
  {
    name: "block LaTeX with $$...$$",
    title: "Calc",
    raw: "<h1>Calc</h1><section><p>$$\\frac{a}{b} + \\sqrt{x}$$ is the formula.</p><p>Done.</p></section>",
  },
  {
    name: "begin/end environments",
    title: "Eq",
    raw: "<h1>Eq</h1><section><p>\\begin{equation} x = 1 \\end{equation} done.</p></section>",
  },
  {
    name: "raw markdown headings + bold + italic",
    title: "MD",
    raw: "# Heading\nThis is **bold** and *italic* text.\n\nAnother paragraph.",
  },
  {
    name: "raw LaTeX commands sprinkled",
    title: "Phys",
    raw: "<h1>Phys</h1><section><p>The \\lambda value with \\sum and \\theta are common in physics.</p></section>",
  },
  {
    name: "naked snippet, no h1",
    title: "Fallback Title",
    raw: "<section><h2>Intro</h2><p>Hello world.</p></section>",
  },
  {
    name: "two h1 — second must be demoted",
    title: "Doc",
    raw: "<h1>One</h1><p>a</p><h1>Two</h1><p>b</p>",
  },
  {
    name: "embedded <style> + <script>",
    title: "Doc",
    raw: '<style>body{color:red}</style><script>alert(1)</script><h1>Doc</h1><p>Body.</p>',
  },
  {
    name: "wrapped in code fences without language",
    title: "Doc",
    raw: "```\n<h1>Doc</h1><section><p>Inside fence.</p></section>\n```",
  },
];

for (const fx of MESSY_FIXTURES) {
  Deno.test(`processPdfHtml: ${fx.name}`, () => {
    const { html, validation } = processPdfHtml(fx.raw, fx.title);
    if (!validation.ok) {
      console.log("FAIL", fx.name, validation.reasons, "\n---\n", html);
    }
    assert(validation.ok, `validation failed: ${validation.reasons.join(", ")}`);
    assertEquals(validation.stats.h1, 1, "must have exactly one h1");
    assert(validation.stats.paragraphs >= 1, "must have at least one <p>");
    assert(!/```/.test(html), "code fence leaked");
    assert(!/\\begin\{|\\frac|\\sqrt|\\sum|\\lambda|\\theta|\\alpha|\\beta/.test(html), "latex leaked");
    assert(!/<style|<script|<!doctype|<html\b|<body\b/i.test(html), "wrapper leaked");
  });
}

Deno.test("sanitizeBodyHtml strips dollar math", () => {
  const out = sanitizeBodyHtml("<p>x is $a+b$ and also $$c+d$$ end.</p>");
  assert(!/\$/.test(out));
});

Deno.test("ensureSingleH1 prepends fallback when missing", () => {
  const out = ensureSingleH1("<p>no heading</p>", "My Title");
  assert(out.startsWith("<h1>My Title</h1>"));
});

Deno.test("ensureSingleH1 demotes extra h1 to h2", () => {
  const out = ensureSingleH1("<h1>A</h1><h1>B</h1><h1>C</h1>", "x");
  assertEquals((out.match(/<h1\b/g) || []).length, 1);
  assertEquals((out.match(/<h2\b/g) || []).length, 2);
});

Deno.test("validatePdfHtml flags forbidden artifacts", () => {
  const v = validatePdfHtml("<h1>x</h1><p>$$y$$</p>");
  assert(!v.ok);
  assert(v.reasons.includes("block-math"));
});