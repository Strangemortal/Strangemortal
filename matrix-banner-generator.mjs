#!/usr/bin/env node
/**
 * Script to generate a Soothing, Ultra-Dense Matrix Digital Rain Header SVG
 * featuring "Hi, I'm Bharat Bhushan" with bright, crisp vertical 'grvsnh'
 * easter egg streams rendered in natural bright Matrix green/white.
 *
 * Outputs:
 *   - dist/matrix-header-dark.svg
 *   - dist/matrix-header-light.svg
 *   - dist/matrix-header.svg (default)
 */

import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = process.env.OUTPUT_DIR || "dist";

const MATRIX_CHARSET = [
  "0", "1", "1", "0", "{", "}", "&lt;", "&gt;", "/", ";", "*", "&amp;", "%", "$", "#", "@",
  "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
  "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ",
  "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン"
];

function getRandomChar() {
  return MATRIX_CHARSET[Math.floor(Math.random() * MATRIX_CHARSET.length)];
}

function generateMatrixHeader(theme = "dark") {
  const width = 900;
  const height = 220;
  const colCount = 135; // Ultra-dense matrix columns
  const colWidth = width / colCount;

  const isDark = theme === "dark";
  const bgColor = isDark ? "#05080e" : "#f0f4f8";
  const textPrimary = isDark ? "#ffffff" : "#0f172a";
  const accentColor = isDark ? "#00ff66" : "#059669";
  const matrixHeadColor = isDark ? "#ffffff" : "#047857";
  const matrixBodyColor = isDark ? "#00ff66" : "#059669";
  const matrixTailColor = isDark ? "#003b18" : "#93c5fd";

  // Dedicated easter egg columns for "grvsnh"
  const easterEggCols = new Set([18, 48, 82, 112]);
  const grvsnhChars = ["g", "r", "v", "s", "n", "h"];

  let keyframeCss = `@keyframes fall {\n`;
  keyframeCss += `  0% { transform: translateY(-320px); }\n`;
  keyframeCss += `  100% { transform: translateY(${height + 320}px); }\n`;
  keyframeCss += `}\n`;

  let streamsSvg = "";

  for (let i = 0; i < colCount; i++) {
    const x = (i * colWidth + colWidth / 2).toFixed(1);
    const isEasterEgg = easterEggCols.has(i);

    // Soothing slow speeds (5.5s to 9.5s)
    const depthLayer = i % 3;
    const baseOpacity = depthLayer === 0 ? 0.35 : depthLayer === 1 ? 0.65 : 0.9;
    const dur = (depthLayer === 0 ? 7.5 + Math.random() * 2.5 : depthLayer === 1 ? 6.2 + Math.random() * 2.0 : 5.0 + Math.random() * 1.8).toFixed(2);
    const delay = (-Math.random() * 8.0).toFixed(2);

    let charTspans = "";

    if (isEasterEgg) {
      // Crisp, highly-visible grvsnh vertical stream in matrix green/white
      const streamSequence = ["0", "1", "g", "r", "v", "s", "n", "h", "1", "0", "1"];
      const charLen = streamSequence.length;

      for (let c = 0; c < charLen; c++) {
        const char = streamSequence[c];
        const isGrvsnh = grvsnhChars.includes(char);
        const isHead = c === charLen - 1;

        const opacity = isHead ? 1 : isGrvsnh ? 0.95 : 0.7;
        const fill = isHead ? matrixHeadColor : matrixBodyColor; // Crisp matrix green!
        const fontSize = isGrvsnh ? 14 : 12;
        const fontWeight = isGrvsnh ? "bold" : "normal";

        charTspans += `<tspan x="${x}" dy="15" fill="${fill}" opacity="${opacity}" font-size="${fontSize}" font-weight="${fontWeight}">${char}</tspan>`;
      }
    } else {
      // Standard soothing Matrix rain column
      const charLen = 18 + Math.floor(Math.random() * 12);
      for (let c = 0; c < charLen; c++) {
        const char = getRandomChar();
        const isHead = c === charLen - 1;
        const opacity = (isHead ? 1 : ((c + 1) / charLen * baseOpacity)).toFixed(2);
        const fill = isHead ? matrixHeadColor : (c > charLen - 5 ? matrixBodyColor : matrixTailColor);
        const fontSize = isHead ? 13 : (depthLayer === 0 ? 10 : 11);
        const fontWeight = isHead ? "bold" : "normal";

        charTspans += `<tspan x="${x}" dy="13" fill="${fill}" opacity="${opacity}" font-size="${fontSize}" font-weight="${fontWeight}">${char}</tspan>`;
      }
    }

    streamsSvg += `<g transform="translate(0, 0)">
  <text x="${x}" y="-240" font-family="'Courier New', monospace" text-anchor="middle">
    ${charTspans}
  </text>
  <animateTransform attributeName="transform" type="translate" from="0,-260" to="0,${height + 280}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" />
</g>\n`;
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="border-radius: 12px; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<defs>
  <style>
    ${keyframeCss}
    .title-text {
      font-weight: 800;
      font-size: 42px;
      fill: ${textPrimary};
      letter-spacing: -0.5px;
    }
  </style>

  <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="${bgColor}" flood-opacity="0.98"/>
    <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="${bgColor}" flood-opacity="0.98"/>
  </filter>

  <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${textPrimary}"/>
    <stop offset="60%" stop-color="${textPrimary}"/>
    <stop offset="100%" stop-color="${accentColor}"/>
  </linearGradient>

  <linearGradient id="centerFade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${bgColor}" stop-opacity="0.92"/>
    <stop offset="25%" stop-color="${bgColor}" stop-opacity="0.45"/>
    <stop offset="75%" stop-color="${bgColor}" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="${bgColor}" stop-opacity="0.92"/>
  </linearGradient>
</defs>

<!-- Background Base -->
<rect width="${width}" height="${height}" fill="${bgColor}" rx="12"/>

<!-- 135-Column Soothing Matrix Digital Rain Layer with Crisp 'grvsnh' Easter Egg Streams -->
<g id="matrix-rain" opacity="${isDark ? '0.92' : '0.7'}">
${streamsSvg}</g>

<!-- Soft Vignette Fade Overlay -->
<rect width="${width}" height="${height}" fill="url(#centerFade)" pointer-events="none" rx="12"/>

<!-- Foreground Content: "Hi, I'm Bharat Bhushan" -->
<g transform="translate(0, 0)" filter="url(#textShadow)">
  <text x="450" y="125" text-anchor="middle" class="title-text">
    Hi, I&#39;m <tspan fill="url(#textGrad)">Bharat Bhushan</tspan>
  </text>
</g>
</svg>`;
}

async function main() {
  const outDir = path.resolve(OUTPUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const darkSvg = generateMatrixHeader("dark");
  const lightSvg = generateMatrixHeader("light");

  const darkPath = path.join(outDir, "matrix-header-dark.svg");
  const lightPath = path.join(outDir, "matrix-header-light.svg");
  const defaultPath = path.join(outDir, "matrix-header.svg");

  fs.writeFileSync(darkPath, darkSvg, "utf8");
  fs.writeFileSync(lightPath, lightSvg, "utf8");
  fs.writeFileSync(defaultPath, darkSvg, "utf8");

  console.log(`Generated Crisp Matrix Header SVGs with visible 'grvsnh' easter egg in '${outDir}':`);
  console.log(` - Dark: ${darkPath}`);
  console.log(` - Light: ${lightPath}`);
}

main().catch((err) => {
  console.error("Error generating Matrix Header SVG:", err);
  process.exit(1);
});
