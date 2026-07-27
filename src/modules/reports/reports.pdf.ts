import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { Document, Image as PdfImage, Link as PdfLink, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CanvasObject, CanvasPage } from "./reports.types.js";
import type { ExportRow, ExportSection, ExportTable, ReportExportData } from "./reports.export.service.js";

const h = React.createElement;

// True A4 in PDF points (72dpi) — 595.28 x 841.89. react-pdf's `size` prop
// treats a bare [number, number] as points, NOT pixels; the canvas editor's
// own CanvasPage.width/height (794x1123) are CSS pixels at 96dpi, a
// different unit entirely that happens to be numerically similar enough to
// look plausible at a glance. Using those numbers directly as point values
// made every page ~33% oversized (96/72 too large in both dimensions), not
// actually A4. Cover pages (which use the editor's own page.width/height for
// their objects' x/y) get their content scaled down to this size in
// renderCoverPage; every other page already just uses fixed dimensions here.
const A4_SIZE: [number, number] = [595.28, 841.89];

function resolveUrl(baseUrl: string, src: string) {
  return src.startsWith("/") ? `${baseUrl}${src}` : src;
}

// Lives at backend/assets (a sibling of src/, like uploads/ — see
// config/uploads.ts), not inside src/, so it survives `tsc`'s build (which
// only compiles .ts) and resolves the same way whether this runs from
// src/ via tsx (dev) or dist/ after a build (prod): both are exactly two
// directories below the project root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEADER_LOGO = readFileSync(path.resolve(__dirname, "../../../assets/header-logo.png"));
const FLAG_BACKGROUND = readFileSync(path.resolve(__dirname, "../../../assets/flag.png"));

const headerStyles = StyleSheet.create({
  band: { position: "absolute", top: 20, left: 0, right: 0, height: 180 },
  // left + right both set (no explicit width) stretches an absolutely
  // positioned node edge-to-edge — the previous right-only inset gave it an
  // auto (intrinsic-content) width, anchored to the right, which is why it
  // only ever occupied its own natural size instead of the full band.
  logo: { position: "absolute", top: 0, left: 30, height: 80, width: "90%" },
  pageNumber: { position: "relative", top: 10, left: 40, fontSize: 13, fontWeight: 700, color: "#ffffff" },
});

// The reference asset (frontend/public/header.webp) has this same diagonal
// ribbon baked in, but with a hardcoded "2" — reusable for exactly one page.
// Recreated here as two overlapping triangles instead, with the real
// per-page number rendered on top via react-pdf's pageNumber render prop, so
// it's correct on every page rather than reading "2" everywhere.
function renderPageHeader() {
  return h(
    View,
    { fixed: true, style: headerStyles.band },
    // h(
    //   Svg,
    //   { width: 90, height: 70, style: { position: "absolute", top: 0, left: 0 } },
    //   h(Polygon, { points: "0,0 90,0 0,70", fill: "#2f5f8f" }),
    //   h(Polygon, { points: "0,0 60,0 0,45", fill: "#6f9bc7" })
    // ),
    h(PdfImage, { src: HEADER_LOGO, style: headerStyles.logo }),
    h(Text, { style: headerStyles.pageNumber, render: ({ pageNumber }: { pageNumber: number }) => String(pageNumber) }),
  );
}

const fontWeightMap = { normal: 400, medium: 500, bold: 700 } as const;

// Converts one canvas object from the editor's own coordinate space (CSS
// pixels, page.width/height — 794x1123) into the true-A4-point space the PDF
// page actually renders at, preserving the exact same relative layout. Every
// length on the object scales, including the isotropic ones (font size,
// stroke width, corner radius) — using scaleX for those since a correctly
// authored page has scaleX≈scaleY (both axes share the same aspect ratio),
// but position/size stay split by axis for precision regardless.
function scaleCanvasObject(object: CanvasObject, scaleX: number, scaleY: number): CanvasObject {
  const base = {
    ...object,
    x: object.x * scaleX,
    y: object.y * scaleY,
    width: object.width * scaleX,
    height: object.height * scaleY,
  };
  if (base.type === "text") {
    return { ...base, fontSize: base.fontSize * scaleX, letterSpacing: base.letterSpacing * scaleX };
  }
  if (base.type === "image") {
    return { ...base, radius: base.radius * scaleX };
  }
  return { ...base, strokeWidth: base.strokeWidth * scaleX, radius: base.radius * scaleX };
}

// A full-bleed background image (or any object nudged past an edge on
// purpose, a common design trick to avoid a hairline gap) can end up with
// x+width or y+height slightly past the page's own declared size — e.g. a
// page.height of 1123 with an object bottom edge at 1128. React-pdf's
// layout engine doesn't exempt position:'absolute' children from page-break
// calculations the way CSS would, so that few points of overflow was enough
// to make it think a second physical page was needed to fit "the rest" of
// the content — producing a near-blank continuation page per cover page.
// Clamping every object's box to the page bounds here (not at the editor
// level, which should keep letting the user nudge things past an edge for
// full-bleed designs) fixes it at the one place it actually matters: export.
function renderCanvasObject(object: CanvasObject, baseUrl: string, pageWidth: number, pageHeight: number) {
  const left = Math.max(0, object.x);
  const top = Math.max(0, object.y);
  const right = Math.min(pageWidth, object.x + object.width);
  const bottom = Math.min(pageHeight, object.y + object.height);

  const wrapperStyle = {
    position: "absolute" as const,
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    transform: object.rotation ? `rotate(${object.rotation}deg)` : undefined,
  };

  if (object.type === "text") {
    return h(
      View,
      { key: object.id, style: wrapperStyle },
      h(
        Text,
        {
          style: {
            fontSize: object.fontSize,
            fontWeight: fontWeightMap[object.fontWeight],
            color: object.color,
            textAlign: object.align,
            letterSpacing: object.letterSpacing || undefined,
          },
        },
        object.content
      )
    );
  }

  if (object.type === "image") {
    if (!object.src) return null;
    return h(View, { key: object.id, style: wrapperStyle }, [
      h(PdfImage, {
        key: "img",
        src: resolveUrl(baseUrl, object.src),
        // width/height: '100%' is safe here specifically because the parent
        // View (wrapperStyle, above) has explicit numeric dimensions already
        // clamped to the page bounds — Yoga resolves the percentage against
        // that, unlike dividerStyles.background's case (see its comment).
        style: { width: "100%", height: "100%", opacity: object.opacity, objectFit: "cover" },
      }),
    ]);
  }

  // shape
  if (object.shapeType === "line") {
    return h(View, {
      key: object.id,
      style: { ...wrapperStyle, backgroundColor: object.stroke ?? object.fill ?? "#000000" },
    });
  }
  return h(View, {
    key: object.id,
    style: {
      ...wrapperStyle,
      backgroundColor: object.fill ?? undefined,
      borderWidth: object.strokeWidth || undefined,
      borderColor: object.stroke ?? undefined,
      borderStyle: object.strokeWidth ? "solid" : undefined,
      borderRadius: object.shapeType === "ellipse" ? 9999 : object.radius || undefined,
    },
  });
}

function renderCoverPage(page: CanvasPage, baseUrl: string) {
  const scaleX = A4_SIZE[0] / page.width;
  const scaleY = A4_SIZE[1] / page.height;
  return h(
    Page,
    { key: page.id, size: A4_SIZE, style: { backgroundColor: page.background } },
    [...page.objects]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((object) => {
        const scaled = scaleCanvasObject(object, scaleX, scaleY);
        return renderCanvasObject(scaled, baseUrl, A4_SIZE[0], A4_SIZE[1]);
      })
  );
}

const dividerStyles = StyleSheet.create({
  // Explicit point dimensions, not width/height: '100%' — a percentage on an
  // absolutely-positioned Image with no explicitly-sized ancestor gets
  // resolved against the image's own intrinsic pixel size by Yoga instead of
  // the page, and flag.png's intrinsic size (2480x3508px) read as points is
  // vastly taller than an A4 page, which is what actually produced the extra
  // near-blank page.
  background: { position: "absolute", top: 0, left: 0, width: A4_SIZE[0], height: A4_SIZE[1] },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 70 },
  sectionTitle: {
    fontFamily: "Times-Roman",
    fontSize: 40,
    lineHeight: 1.3,
    color: "#111827",
    fontWeight: 700,
    textAlign: "center",
    width: "70%",
  },
});

// Just the section's own name/title, big and centered — no report title
// line above it (the report is already identified everywhere else: file
// name, breadcrumb, cover page).
function renderDividerPage(key: string, section: ExportSection) {
  return h(
    Page,
    { key, size: A4_SIZE },
    // The tricolor watercolor wash the user supplied (backend/assets/flag.png)
    // as a full-bleed background image, not a code-drawn gradient — simpler
    // and matches their reference exactly instead of approximating it.
    // fixed: true — same escape hatch renderPageHeader's band already uses.
    // react-pdf's pagination algorithm (splitNodes in @react-pdf/layout)
    // skips the "does this fit" check entirely for fixed nodes; without it,
    // a full-page background image sitting before other content in the same
    // Page can get judged as not fitting and spawn a phantom next page —
    // regardless of the image's actual file size/format/encoding (tried
    // several; this is what actually fixed it).
    h(PdfImage, { src: FLAG_BACKGROUND, style: dividerStyles.background, fixed: true }),
    h(
      View,
      { style: dividerStyles.container },
      h(Text, { style: dividerStyles.sectionTitle }, section.title || section.name)
    )
  );
}

// Static closing page — same flag background as the section dividers, fixed
// "Thank You" text. Not data-driven yet (no per-report customization), per
// the current ask; revisit if a custom closing message is ever wanted.
function renderThankYouPage(key: string) {
  return h(
    Page,
    { key, size: A4_SIZE },
    h(PdfImage, { src: FLAG_BACKGROUND, style: dividerStyles.background, fixed: true }),
    h(
      View,
      { style: dividerStyles.container },
      h(Text, { style: dividerStyles.sectionTitle }, "Thank You")
    )
  );
}

const COLUMN_WIDTHS: Record<string, number> = {
  srNo: 6,
  isTopCoverage: 5,
  headline: 24,
  publication: 15,
  edition: 11,
  pageNo: 8,
  date: 10,
  link: 14,
  image: 7,
};

// Auto-alternated when a table has no explicit color of its own (index is
// each table's position across the whole document, in render order) — so
// nobody has to configure anything to get the two-tone look in the
// reference, but a table can still opt into a specific/custom one.
const DEFAULT_TABLE_COLOR_SEQUENCE = ["#4472C4", "#ED7D31"];

// Exact Office/Excel "Lighter %" tints for the two defaults, so they match
// the reference pixel-for-pixel rather than an approximation.
const KNOWN_THEME_TINTS: Record<string, { border: string; tint: string }> = {
  "#4472c4": { border: "#B4C7E7", tint: "#D9E2F3" },
  "#ed7d31": { border: "#F8CBAD", tint: "#FBE4D5" },
};

// Linear mix toward white — not Excel's actual (HSL-based) tint algorithm,
// but a close enough approximation for any custom color that isn't one of
// the two known defaults above.
function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

interface TableTheme {
  header: string;
  border: string;
  tint: string;
}

function resolveTableTheme(color: string | null, index: number): TableTheme {
  const header = color ?? DEFAULT_TABLE_COLOR_SEQUENCE[index % DEFAULT_TABLE_COLOR_SEQUENCE.length];
  const known = KNOWN_THEME_TINTS[header.toLowerCase()];
  if (known) return { header, ...known };
  return { header, border: lightenHex(header, 0.55), tint: lightenHex(header, 0.82) };
}

const tableStyles = StyleSheet.create({
  page: { paddingTop: 125, paddingHorizontal: 28, paddingBottom: 28, fontSize: 8 },
  headerRow: { flexDirection: "row", paddingVertical: 6 },
  headerCell: { color: "#ffffff", fontWeight: 700, fontSize: 8, paddingHorizontal: 4, textAlign: "center" },
  row: { flexDirection: "row" },
  // Every body cell carries its own full border rather than the row having
  // one bottom rule — react-pdf has no border-collapse, so adjacent cells'
  // borders simply overlap at shared edges, which is what produces the grid
  // look in the reference image rather than a single ruled line per row.
  // Border/background colors are theme-derived (see resolveTableTheme),
  // applied per-call alongside these static layout properties.
  cell: {
    fontSize: 7.5,
    color: "#1f2937",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 0.75,
  },
  cellCenter: { textAlign: "center" },
  link: {
    fontSize: 7.5,
    color: "#2563eb",
    paddingHorizontal: 4,
    paddingVertical: 6,
    textDecoration: "underline",
    textAlign: "center",
    borderWidth: 0.75,
  },
  imageCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderWidth: 0.75,
  },
  thumb: { width: 26, height: 26, objectFit: "cover" },
});

const COLUMN_LABELS: Record<string, string> = {
  srNo: "Sr. No.",
  isTopCoverage: "Top",
  headline: "Headline",
  publication: "Publication",
  edition: "Edition",
  pageNo: "Page No.",
  date: "Date",
  link: "Link",
  image: "Image",
};

function visibleColumns(hiddenColumns: string[]) {
  return Object.keys(COLUMN_WIDTHS).filter((key) => !hiddenColumns.includes(key));
}

// COLUMN_WIDTHS are relative weights, not literal percentages — they only
// summed to 100% when every column was shown. Hiding a column (Link/Image
// are commonly toggled off) left its share of the page as blank space on
// the right instead of the remaining columns stretching to fill it. This
// re-normalizes whatever's actually visible back up to 100%.
function computeColumnWidths(columns: string[]): Record<string, number> {
  const totalWeight = columns.reduce((sum, column) => sum + COLUMN_WIDTHS[column], 0);
  return Object.fromEntries(columns.map((column) => [column, (COLUMN_WIDTHS[column] / totalWeight) * 100]));
}

function renderCell(column: string, row: ExportRow, baseUrl: string, widthPercent: number, theme: TableTheme) {
  const width = `${widthPercent}%`;
  const border = { borderColor: theme.border };
  switch (column) {
    case "srNo":
      return h(
        Text,
        { key: column, style: [tableStyles.cell, tableStyles.cellCenter, border, { width }] },
        String(row.srNo)
      );
    case "isTopCoverage":
      return h(
        Text,
        { key: column, style: [tableStyles.cell, tableStyles.cellCenter, border, { width }] },
        row.isTopCoverage ? "★" : ""
      );
    case "headline":
      return h(Text, { key: column, style: [tableStyles.cell, border, { width }] }, row.headline ?? "");
    case "publication":
      return h(Text, { key: column, style: [tableStyles.cell, border, { width }] }, row.publication ?? "");
    case "edition":
      return h(Text, { key: column, style: [tableStyles.cell, border, { width }] }, row.edition ?? "");
    case "pageNo":
      return h(
        Text,
        { key: column, style: [tableStyles.cell, tableStyles.cellCenter, border, { width }] },
        row.pageNo ?? ""
      );
    case "date":
      return h(
        Text,
        { key: column, style: [tableStyles.cell, tableStyles.cellCenter, border, { width }] },
        row.date ? new Date(row.date).toLocaleDateString() : ""
      );
    case "link":
      return row.link
        ? h(PdfLink, { key: column, src: row.link, style: [tableStyles.link, border, { width }] }, "Link")
        : h(Text, { key: column, style: [tableStyles.cell, tableStyles.cellCenter, border, { width }] }, "");
    case "image":
      return h(
        View,
        { key: column, style: [tableStyles.imageCell, border, { width }] },
        row.image ? h(PdfImage, { src: resolveUrl(baseUrl, row.image), style: tableStyles.thumb }) : null
      );
    default:
      return h(View, { key: column, style: { width } });
  }
}

function renderTablePage(key: string, table: ExportTable, baseUrl: string, theme: TableTheme) {
  const columns = visibleColumns(table.hiddenColumns);
  const widths = computeColumnWidths(columns);
  return h(
    Page,
    { key, size: A4_SIZE, style: tableStyles.page },
    renderPageHeader(),
    h(
      View,
      { style: [tableStyles.headerRow, { backgroundColor: theme.header }], fixed: true },
      columns.map((column) =>
        h(Text, { key: column, style: [tableStyles.headerCell, { width: `${widths[column]}%` }] }, COLUMN_LABELS[column])
      )
    ),
    table.rows.length === 0
      ? h(Text, { style: { padding: 8, color: "#6b7280" } }, "No rows in this table.")
      : table.rows.map((row, index) =>
          h(
            View,
            {
              key: index,
              style: index % 2 === 1 ? [tableStyles.row, { backgroundColor: theme.tint }] : tableStyles.row,
            },
            columns.map((column) => renderCell(column, row, baseUrl, widths[column], theme))
          )
        )
  );
}

const SCREENSHOT_PAGE_PADDING = { top: 125, horizontal: 28, bottom: 28 };

const screenshotStyles = StyleSheet.create({
  page: {
    paddingTop: SCREENSHOT_PAGE_PADDING.top,
    paddingHorizontal: SCREENSHOT_PAGE_PADDING.horizontal,
    paddingBottom: SCREENSHOT_PAGE_PADDING.bottom,
  },
  // Explicit point dimensions matching the page's own content area, not
  // width/height: '100%' — see dividerStyles.background's comment; the same
  // percentage-resolves-against-intrinsic-size issue applies here.
  image: {
    width: A4_SIZE[0] - SCREENSHOT_PAGE_PADDING.horizontal * 2,
    height: A4_SIZE[1] - SCREENSHOT_PAGE_PADDING.top - SCREENSHOT_PAGE_PADDING.bottom,
    objectFit: "contain",
  },
});

// One full page per uploaded screenshot, image only — these are table-level
// gallery uploads (ScreenshotItem: {url, caption, order}), not tied to any
// one row, so there's no headline/publication/date to show alongside them
// the way a row's own cells have. `objectFit: 'contain'` rather than
// 'cover': unlike the cover canvas or row thumbnails, these are often
// full-page article scans where cropping to fill the box would cut off
// real content.
function renderScreenshotPage(key: string, url: string, baseUrl: string) {
  return h(
    Page,
    { key, size: A4_SIZE, style: screenshotStyles.page },
    renderPageHeader(),
    h(PdfImage, { src: resolveUrl(baseUrl, url), style: screenshotStyles.image })
  );
}

export async function renderReportPdf(data: ReportExportData, baseUrl: string): Promise<Buffer> {
  const pages: React.ReactElement[] = [];

  // Skip pages with nothing drawn on them — a fresh report's cover-page
  // document starts as one blank {objects: []} page by default (see
  // canvas-editor.tsx's load effect), and a user can just as easily leave a
  // page empty after adding it. Either way, an entirely blank page has
  // nothing to export.
  const nonEmptyCoverPages = data.coverPages.filter((page) => page.objects.length > 0);
  pages.push(...nonEmptyCoverPages.map((page) => renderCoverPage(page, baseUrl)));

  // Runs across the whole document (not reset per section) so the
  // blue/orange default alternates by each table's overall position, per
  // resolveTableTheme.
  let tableCounter = 0;

  data.sections.forEach((section, sectionIndex) => {
    if (section.tables.length === 0) return;
    pages.push(renderDividerPage(`divider-${sectionIndex}`, section));
    section.tables.forEach((table, tableIndex) => {
      const theme = resolveTableTheme(table.color, tableCounter++);
      pages.push(renderTablePage(`table-${sectionIndex}-${tableIndex}`, table, baseUrl, theme));
      [...table.screenshots]
        .sort((a, b) => a.order - b.order)
        .forEach((screenshot, screenshotIndex) => {
          pages.push(
            renderScreenshotPage(`screenshot-${sectionIndex}-${tableIndex}-${screenshotIndex}`, screenshot.url, baseUrl)
          );
        });
    });
  });

  pages.push(renderThankYouPage("thank-you"));

  const document = h(Document, { title: data.reportTitle }, pages);
  return renderToBuffer(document);
}
