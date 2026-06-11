import { sanitizeInlineHtml, hasInlineMarkup, stripInlineMarkup } from "../lib/sections/rich-text";

const cases: [string, string][] = [
  ["plain text", "plain text"],
  ["a <b>bold</b> word", "a <b>bold</b> word"],
  ["<script>alert(1)</script>hi", "alert(1)hi"],
  ['<a href="javascript:alert(1)">x</a>', "x"],
  ['<a href="https://x.com" target="_blank" onclick="evil()">go</a>', '<a href="https://x.com" target="_blank" rel="noopener noreferrer">go</a>'],
  ["<u>under<i>both</u></i>", "<u>under<i>both</i></u>"],
  ["<div>line1</div><div>line2</div>", "line1<br>line2"],
  ["unclosed <b>bold", "unclosed <b>bold</b>"],
  ["5 < 6 and 7 > 2", "5 &lt; 6 and 7 &gt; 2"],
  ['<em style="color:red">em</em>', "<em>em</em>"],
];
let fail = 0;
for (const [inp, want] of cases) {
  const got = sanitizeInlineHtml(inp);
  if (got !== want) { console.log("FAIL", JSON.stringify(inp), "→", JSON.stringify(got), "want", JSON.stringify(want)); fail++; }
}
console.log(fail ? `${fail} failures` : `sanitizer: all ${cases.length} cases pass`);
console.log("strip:", JSON.stringify(stripInlineMarkup("a <b>bold</b> word<br>line")));
console.log("detect:", hasInlineMarkup("x <u>y</u>"), hasInlineMarkup("plain"));
