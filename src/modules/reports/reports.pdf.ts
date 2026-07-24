import React from "react";
import {
  Document,
  Image as PdfImage,
  Link as PdfLink,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from "@react-pdf/renderer";
import type { CanvasObject, CanvasPage } from "./reports.types.js";
import type { ExportRow, ExportSection, ExportTable, ReportExportData } from "./reports.export.service.js";

const h = React.createElement;

// A4 in points-as-pixels — matches the canvas editor's own page.width/height
// convention 1:1 (see canvas-editor's CanvasPage), so an object's stored x/y
// need zero rescaling to land in the same spot in the PDF as on screen.
const DEFAULT_PAGE_SIZE: [number, number] = [794, 1123];

function resolveUrl(baseUrl: string, src: string) {
  return src.startsWith("/") ? `${baseUrl}${src}` : src;
}

const fontWeightMap = { normal: 400, medium: 500, bold: 700 } as const;

function renderCanvasObject(object: CanvasObject, baseUrl: string) {
  const wrapperStyle = {
    position: "absolute" as const,
    left: object.x,
    top: object.y,
    width: object.width,
    height: object.height,
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
  return h(
    Page,
    { key: page.id, size: [page.width, page.height], style: { backgroundColor: page.background } },
    [...page.objects].sort((a, b) => a.zIndex - b.zIndex).map((object) => renderCanvasObject(object, baseUrl))
  );
}

const dividerStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  reportTitle: { fontSize: 14, color: "#6b7280", marginBottom: 10, fontWeight: 700 },
  sectionTitle: { fontSize: 28, color: "#111827", fontWeight: 700, textAlign: "center", paddingHorizontal: 60 },
  rule: { width: 160, height: 2, backgroundColor: "#2f5f8f", marginTop: 16 },
});

function renderDividerPage(key: string, reportTitle: string, section: ExportSection) {
  return h(
    Page,
    { key, size: DEFAULT_PAGE_SIZE },
    // Soft gradient wash behind the title — an SVG rect with a linear
    // gradient fill, since react-pdf Views don't support CSS gradients directly.
    h(
      Svg,
      { style: { position: "absolute", width: "100%", height: "100%" } },
      h(
        Defs,
        null,
        h(
          LinearGradient,
          { id: "divider-gradient", x1: "0", y1: "0", x2: "1", y2: "1" },
          h(Stop, { offset: "0", stopColor: "#fdf6ec", stopOpacity: 1 }),
          h(Stop, { offset: "1", stopColor: "#eef3ee", stopOpacity: 1 })
        )
      ),
      h(Rect, { x: "0", y: "0", width: "100%", height: "100%", fill: "url(#divider-gradient)" })
    ),
    h(
      View,
      { style: dividerStyles.container },
      h(Text, { style: dividerStyles.reportTitle }, reportTitle),
      h(Text, { style: dividerStyles.sectionTitle }, section.title || section.name),
      h(View, { style: dividerStyles.rule })
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

const tableStyles = StyleSheet.create({
  page: { padding: 28, fontSize: 8 },
  category: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 8 },
  headerRow: { flexDirection: "row", backgroundColor: "#2f5f8f", paddingVertical: 5 },
  headerCell: { color: "#ffffff", fontWeight: 700, fontSize: 8, paddingHorizontal: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  rowAlt: { backgroundColor: "#f8fafc" },
  cell: { fontSize: 7.5, color: "#1f2937", paddingHorizontal: 3 },
  link: { fontSize: 7.5, color: "#2563eb", paddingHorizontal: 3, textDecoration: "underline" },
  thumb: { width: 26, height: 26, objectFit: "cover" },
});

const COLUMN_LABELS: Record<string, string> = {
  srNo: "Sr",
  isTopCoverage: "Top",
  headline: "Headline",
  publication: "Publication",
  edition: "Edition",
  pageNo: "Page",
  date: "Date",
  link: "Link",
  image: "Image",
};

function visibleColumns(hiddenColumns: string[]) {
  return Object.keys(COLUMN_WIDTHS).filter((key) => !hiddenColumns.includes(key));
}

function renderCell(column: string, row: ExportRow, baseUrl: string) {
  const width = `${COLUMN_WIDTHS[column]}%`;
  switch (column) {
    case "srNo":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, String(row.srNo));
    case "isTopCoverage":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, row.isTopCoverage ? "★" : "");
    case "headline":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, row.headline ?? "");
    case "publication":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, row.publication ?? "");
    case "edition":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, row.edition ?? "");
    case "pageNo":
      return h(Text, { key: column, style: [tableStyles.cell, { width }] }, row.pageNo ?? "");
    case "date":
      return h(
        Text,
        { key: column, style: [tableStyles.cell, { width }] },
        row.date ? new Date(row.date).toLocaleDateString() : ""
      );
    case "link":
      return row.link
        ? h(PdfLink, { key: column, src: row.link, style: [tableStyles.link, { width }] }, "Link")
        : h(Text, { key: column, style: [tableStyles.cell, { width }] }, "");
    case "image":
      return h(
        View,
        { key: column, style: { width } },
        row.image ? h(PdfImage, { src: resolveUrl(baseUrl, row.image), style: tableStyles.thumb }) : null
      );
    default:
      return h(View, { key: column, style: { width } });
  }
}

function renderTablePage(key: string, section: ExportSection, table: ExportTable, baseUrl: string) {
  const columns = visibleColumns(table.hiddenColumns);
  return h(
    Page,
    { key, size: DEFAULT_PAGE_SIZE, style: tableStyles.page },
    h(Text, { style: tableStyles.category }, table.category || section.title || section.name),
    h(
      View,
      { style: tableStyles.headerRow, fixed: true },
      columns.map((column) =>
        h(Text, { key: column, style: [tableStyles.headerCell, { width: `${COLUMN_WIDTHS[column]}%` }] }, COLUMN_LABELS[column])
      )
    ),
    table.rows.length === 0
      ? h(Text, { style: { padding: 8, color: "#6b7280" } }, "No rows in this table.")
      : table.rows.map((row, index) =>
          h(
            View,
            { key: index, style: index % 2 === 1 ? [tableStyles.row, tableStyles.rowAlt] : tableStyles.row },
            columns.map((column) => renderCell(column, row, baseUrl))
          )
        )
  );
}

export async function renderReportPdf(data: ReportExportData, baseUrl: string): Promise<Buffer> {
  const pages: React.ReactElement[] = [];

  if (data.coverPages.length > 0) {
    pages.push(...data.coverPages.map((page) => renderCoverPage(page, baseUrl)));
  }

  data.sections.forEach((section, sectionIndex) => {
    if (section.tables.length === 0) return;
    pages.push(renderDividerPage(`divider-${sectionIndex}`, data.reportTitle, section));
    section.tables.forEach((table, tableIndex) => {
      pages.push(renderTablePage(`table-${sectionIndex}-${tableIndex}`, section, table, baseUrl));
    });
  });

  const document = h(Document, { title: data.reportTitle }, pages);
  return renderToBuffer(document);
}
