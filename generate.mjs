#!/usr/bin/env node
/**
 * Generates animated "jet over contribution grid" SVGs (both dark & light modes)
 * using a GitHub user's REAL contribution calendar / latest commits.
 *
 * Primary source: GitHub GraphQL API (when GH_TOKEN / GITHUB_TOKEN is available).
 * Fallback source: GitHub's public contribution calendar HTML endpoint.
 *
 * Outputs:
 *   - dist/github-jet-dark.svg (Dark theme)
 *   - dist/github-jet-light.svg (Light theme)
 *   - dist/github-jet.svg (Default fallback / alias for dark)
 */

import fs from "node:fs";
import path from "node:path";

const USERNAME = process.env.GH_USERNAME || "Strangemortal";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OUTPUT_DIR = process.env.OUTPUT_DIR || "dist";

const COLS = 34; // weeks shown (34 columns x 7 rows)
const ROWS = 7;
const CELL = 11;
const STEP = 14; // cell + gap
const GRID_X = 20;
const GRID_Y = 15;
const WIDTH = 513;
const HEIGHT = 170;
const JET_X_START = 35;
const JET_X_END = 478;
const LOOP_DUR = 20; // seconds per pass
const MAX_TARGETS = 12; // busiest days target by the jet
const PAD_Y = 128; // bullet launch line

const GRAPHQL_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

const DARK_COLORS = {
  bg: "#0d1117",
  emptyCell: "#161b22",
  star: "#8b949e",
  flash: "#39d353",
  bullet: "#7ee787",
  blast: "#56d364",
  jetBody: "#58a6ff",
  jetStroke: "#1f6feb",
  jetWing: "#388bfd",
  jetCockpit: "#c9e6ff",
  jetThruster: "#f0883e",
  levels: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

const LIGHT_COLORS = {
  bg: "#ffffff",
  emptyCell: "#ebedf0",
  star: "#d0d7de",
  flash: "#1a7f37",
  bullet: "#2da44e",
  blast: "#2da44e",
  jetBody: "#0969da",
  jetStroke: "#054da7",
  jetWing: "#218bf5",
  jetCockpit: "#ddf4ff",
  jetThruster: "#cf222e",
  levels: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
};

async function fetchWeeksViaGraphQL() {
  if (!TOKEN) return null;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "Node-Fetch",
      },
      body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { login: USERNAME } }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors || !json.data?.user?.contributionsCollection?.contributionCalendar?.weeks) {
      return null;
    }
    return json.data.user.contributionsCollection.contributionCalendar.weeks;
  } catch (err) {
    console.warn("GraphQL fetch failed, falling back to public HTML:", err.message);
    return null;
  }
}

async function fetchWeeksViaHTML() {
  const url = `https://github.com/users/${USERNAME}/contributions`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch public contributions page: ${res.status}`);
  }
  const html = await res.text();

  // Match all <td ... class="ContributionCalendar-day" ...> elements
  const dayRegex = /<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/gi;
  const matches = [...html.matchAll(dayRegex)];

  const dayMap = new Map();
  for (const m of matches) {
    const tag = m[0];
    const dateMatch = tag.match(/data-date="([^"]+)"/);
    const levelMatch = tag.match(/data-level="([^"]+)"/);
    if (dateMatch && levelMatch) {
      const date = dateMatch[1];
      const level = parseInt(levelMatch[1], 10) || 0;
      dayMap.set(date, level);
    }
  }

  if (dayMap.size === 0) {
    throw new Error("Could not parse contribution days from GitHub HTML page");
  }

  // Organize days chronologically into weeks (7 days each)
  const sortedDates = [...dayMap.keys()].sort();
  const weeks = [];
  let currentWeek = [];

  for (const date of sortedDates) {
    const level = dayMap.get(date);
    const count = level === 0 ? 0 : level === 1 ? 2 : level === 2 ? 5 : level === 3 ? 8 : 12;
    currentWeek.push({
      date,
      level,
      contributionCount: count,
    });
    if (currentWeek.length === 7) {
      weeks.push({ contributionDays: currentWeek });
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push({ contributionDays: currentWeek });
  }

  return weeks;
}

async function getContributionWeeks() {
  const graphqlWeeks = await fetchWeeksViaGraphQL();
  if (graphqlWeeks && graphqlWeeks.length > 0) {
    console.log(`Fetched GraphQL contribution calendar for ${USERNAME}`);
    return { weeks: graphqlWeeks, source: "graphql" };
  }
  console.log(`Fetching public contribution calendar for ${USERNAME}...`);
  const htmlWeeks = await fetchWeeksViaHTML();
  console.log(`Fetched public HTML contribution calendar for ${USERNAME}`);
  return { weeks: htmlWeeks, source: "html" };
}

function buildCells(weeks, themeColors) {
  const recent = weeks.slice(-COLS);
  const padCount = COLS - recent.length;
  const padded = Array.from({ length: padCount }, () => ({
    contributionDays: Array.from({ length: ROWS }, () => ({
      contributionCount: 0,
      color: themeColors.emptyCell,
      date: null,
    })),
  })).concat(recent);

  const cells = [];
  padded.forEach((week, col) => {
    week.contributionDays.forEach((day, row) => {
      let cellColor = day.color;
      if (!cellColor || cellColor === "#161b22" || cellColor === "#ebedf0") {
        const lvl = typeof day.level === "number" ? day.level : 0;
        cellColor = themeColors.levels[lvl] || themeColors.emptyCell;
      }
      cells.push({
        col,
        row,
        x: GRID_X + col * STEP,
        y: GRID_Y + row * STEP,
        color: cellColor,
        count: day.contributionCount || 0,
        date: day.date,
      });
    });
  });
  return cells;
}

function pickTargets(cells) {
  return [...cells]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TARGETS)
    .sort((a, b) => a.col - b.col || a.row - b.row);
}

function keyTimeForCol(col, direction) {
  const span = 0.46;
  const t = 0.02 + (col / (COLS - 1)) * span;
  return direction === "forward" ? t : 1 - t;
}

function fmt(n) {
  return Number(n.toFixed(4));
}

function buildGrid(cells, targets, themeColors) {
  const targetKey = new Set(targets.map((t) => `${t.col}-${t.row}`));
  let svg = "";
  for (const c of cells) {
    const isTarget = targetKey.has(`${c.col}-${c.row}`);
    if (!isTarget) {
      svg += `<rect x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${c.color}"/>\n`;
      continue;
    }
    const tFwd = keyTimeForCol(c.col, "forward");
    const tBack = keyTimeForCol(c.col, "backward");
    const [t1, t2] = [Math.min(tFwd, tBack), Math.max(tFwd, tBack)];
    const dur = 0.006;
    svg += `<rect x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${c.color}">` +
      `<animate attributeName="fill" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
      `keyTimes="0;${fmt(t1)};${fmt(t1 + dur)};${fmt(t2)};${fmt(t2 + dur)};1" ` +
      `values="${c.color};${c.color};${themeColors.flash};${c.color};${themeColors.flash};${c.color}"/>` +
      `</rect>\n`;
  }
  return svg;
}

function buildBulletsAndBlasts(targets, themeColors) {
  let bullets = "";
  let blasts = "";
  const dur = 0.006;

  for (const dir of ["forward", "backward"]) {
    const ordered = dir === "forward" ? targets : [...targets].reverse();
    for (const c of ordered) {
      const t = keyTimeForCol(c.col, dir);
      const rise = t - dur * 3;
      const arrive = t;
      const fadeEnd = t + dur;
      const cx = fmt(c.x + CELL / 2);
      const targetY = fmt(c.y + CELL / 2);

      bullets += `<circle cx="${cx}" cy="${PAD_Y}" r="2.4" fill="${themeColors.bullet}">` +
        `<animate attributeName="cy" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
        `keyTimes="0;${fmt(rise)};${fmt(arrive)};1" values="${PAD_Y};${PAD_Y};${targetY};${targetY}"/>` +
        `<animate attributeName="opacity" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
        `keyTimes="0;${fmt(rise)};${fmt(arrive)};${fmt(fadeEnd)};1" values="0;1;1;0;0"/>` +
        `</circle>\n`;

      blasts += `<circle cx="${cx}" cy="${targetY}" r="0" fill="none" stroke="${themeColors.blast}" stroke-width="1.6" opacity="0">` +
        `<animate attributeName="r" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
        `keyTimes="0;${fmt(arrive)};${fmt(arrive + dur * 3)};1" values="0;1;9;9"/>` +
        `<animate attributeName="opacity" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
        `keyTimes="0;${fmt(arrive)};${fmt(arrive + dur * 3)};1" values="0;1;1;0"/>` +
        `</circle>\n`;
    }
  }
  return { bullets, blasts };
}

function buildStars(themeColors) {
  const pts = [
    [8, 20, 1.2], [8, 60, 1.6], [8, 100, 2.0],
    [505, 25, 1.2], [505, 70, 1.6], [505, 110, 2.0],
    [30, 164, 1.2], [483, 164, 1.6],
  ];
  return pts.map(([x, y, dur]) =>
    `<circle cx="${x}" cy="${y}" r="1.1" fill="${themeColors.star}"><animate attributeName="opacity" values="0.2;1;0.2" dur="${dur}s" repeatCount="indefinite"/></circle>`
  ).join("\n");
}

function buildJet(themeColors) {
  return `<g id="jet">
  <g transform="translate(0,0)">
    <polygon points="0,-16 8,6 4,3 -4,3 -8,6" fill="${themeColors.jetBody}" stroke="${themeColors.jetStroke}" stroke-width="1"/>
    <polygon points="-8,6 -14,12 -4,7" fill="${themeColors.jetWing}"/>
    <polygon points="8,6 14,12 4,7" fill="${themeColors.jetWing}"/>
    <circle cx="0" cy="-6" r="2.2" fill="${themeColors.jetCockpit}"/>
    <polygon points="-3,7 3,7 0,15" fill="${themeColors.jetThruster}">
      <animate attributeName="opacity" values="0.5;1;0.6;1" dur="0.18s" repeatCount="indefinite"/>
    </polygon>
  </g>
  <animateTransform attributeName="transform" attributeType="XML" type="translate"
    dur="${LOOP_DUR}s" repeatCount="indefinite"
    keyTimes="0;0.5;1"
    values="${JET_X_START}.00,140.00;${JET_X_END}.00,140.00;${JET_X_START}.00,140.00"/>
</g>`;
}

function renderSvg(weeks, themeColors) {
  const cells = buildCells(weeks, themeColors);
  const targets = pickTargets(cells);
  const { bullets, blasts } = buildBulletsAndBlasts(targets, themeColors);

  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${themeColors.bg}"/>
${buildStars(themeColors)}
<g id="grid">
${buildGrid(cells, targets, themeColors)}</g>
<g id="bullets">
${bullets}</g>
<g id="blasts">
${blasts}</g>
${buildJet(themeColors)}
</svg>`;
}

async function main() {
  const { weeks } = await getContributionWeeks();

  const darkSvg = renderSvg(weeks, DARK_COLORS);
  const lightSvg = renderSvg(weeks, LIGHT_COLORS);

  const outDir = path.resolve(OUTPUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const darkPath = path.join(outDir, "github-jet-dark.svg");
  const lightPath = path.join(outDir, "github-jet-light.svg");
  const defaultPath = path.join(outDir, "github-jet.svg");

  fs.writeFileSync(darkPath, darkSvg, "utf8");
  fs.writeFileSync(lightPath, lightSvg, "utf8");
  fs.writeFileSync(defaultPath, darkSvg, "utf8"); // default fallback

  console.log(`Generated SVGs successfully for user '${USERNAME}':`);
  console.log(` - Dark Mode: ${darkPath}`);
  console.log(` - Light Mode: ${lightPath}`);
  console.log(` - Default Fallback: ${defaultPath}`);
}

main().catch((err) => {
  console.error("Error generating SVGs:", err);
  process.exit(1);
});
