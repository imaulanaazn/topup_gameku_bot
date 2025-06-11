const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const dayjs = require("dayjs");
const { getOrderAnalytics, getRevenue } = require("../services/adminService");
const { currencyConverter } = require("./formatter");

const PDF_STYLES = {
  title: { size: 24, color: rgb(0, 0, 0), bold: true },
  sectionHeader: { size: 18, color: rgb(0, 0, 0) },
  dataRow: { size: 14, color: rgb(0, 0, 0) },
  footer: { size: 12, color: rgb(0.5, 0.5, 0.5) },
  margins: { x: 50, lineSpacing: 20, sectionSpacing: 30 },
};

module.exports = {
  getAnalyticsForDateRange: async (startDate, endDate, ctx) => {
    const orderAnalytics = await getOrderAnalytics(startDate, endDate, ctx);
    const revenue = await getRevenue(startDate, endDate, ctx);
    return { orderAnalytics, revenue };
  },
  formatAnalyticsData: (orderAnalytics, revenue) => {
    return [
      `Order Pending: ${orderAnalytics?.data?.statusCount.pending.total}`,
      `Order Sukses: ${orderAnalytics?.data?.statusCount.success.total}`,
      `Order Gagal: ${orderAnalytics?.data?.statusCount.failed.total}`,
      `Order Kadaluarsa: ${orderAnalytics?.data?.statusCount.expired.total}`,
      `Pembeli Baru: ${orderAnalytics?.data?.newBuyersCount}`,
      `Total Pembelian: ${orderAnalytics?.data?.totalOrders.total}`,
      `Total Pendapatan: ${currencyConverter(revenue?.data?.revenue || 0)}`,
    ];
  },
  generateRevenueReport: async (currentMonthData, previousMonthData) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();

    let yPosition = height - PDF_STYLES.margins.x;

    // Add report title
    page.drawText("LAPORAN PENDAPATAN", {
      ...PDF_STYLES.title,
      x: PDF_STYLES.margins.x,
      y: yPosition,
    });
    yPosition -= PDF_STYLES.margins.sectionSpacing;

    // Add current month section
    yPosition = addReportSection(
      page,
      `Bulan Ini (${dayjs().format("MMMM YYYY")}):`,
      currentMonthData,
      yPosition
    );

    // Add previous month section
    yPosition = addReportSection(
      page,
      `Bulan Sebelumnya (${dayjs().subtract(1, "month").format("MMMM YYYY")}):`,
      previousMonthData,
      yPosition
    );

    // Add footer
    page.drawText(`Dibuat pada: ${dayjs().format("DD MMMM YYYY HH:mm:ss")}`, {
      ...PDF_STYLES.footer,
      x: PDF_STYLES.margins.x,
      y: PDF_STYLES.margins.x,
    });

    return await pdfDoc.save();
  },
  createPdfWithTable: async (data) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    // Load font standard
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Judul Laporan
    page.drawText("LAPORAN PENDAPATAN", {
      x: 50,
      y: height - 50,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Parameter tabel
    const startY = height - 100;
    const rowHeight = 25;
    const columnWidth = 150;
    const headers = ["Kategori", "Bulan Ini", "Bulan Lalu"];

    // Fungsi untuk menggambar baris tabel
    const drawRow = (y, columns, isHeader = false) => {
      columns.forEach((text, i) => {
        page.drawText(text, {
          x: 50 + i * columnWidth,
          y,
          size: 10,
          font: isHeader ? boldFont : font,
          color: rgb(0, 0, 0),
        });
      });
    };

    // Fungsi untuk menggambar garis horizontal
    const drawHorizontalLine = (y) => {
      page.drawLine({
        start: { x: 50, y },
        end: { x: 50 + headers.length * columnWidth, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    };

    // Header tabel
    drawRow(startY, headers, true);
    drawHorizontalLine(startY - 5);

    // Data tabel
    let currentY = startY - rowHeight;

    // Contoh data - ganti dengan data sebenarnya dari database
    // const tableData = [
    //   { category: "Order Pending", current: 15, previous: 10 },
    //   { category: "Order Sukses", current: 120, previous: 100 },
    //   { category: "Order Gagal", current: 5, previous: 8 },
    //   { category: "Pembeli Baru", current: 30, previous: 25 },
    //   { category: "Total Pendapatan", current: 5000000, previous: 4500000 },
    // ];

    data.forEach((row) => {
      drawRow(currentY, [
        row.category,
        row.category.includes("Pendapatan")
          ? currencyConverter(row.current)
          : row.current.toString(),
        row.category.includes("Pendapatan")
          ? currencyConverter(row.previous)
          : row.previous.toString(),
      ]);

      drawHorizontalLine(currentY - 5);
      currentY -= rowHeight;
    });

    // Footer
    page.drawText(`Dibuat pada: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 50,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return await pdfDoc.save();
  },
};

function addReportSection(page, title, data, yPosition) {
  // Add section title
  page.drawText(title, {
    ...PDF_STYLES.sectionHeader,
    x: PDF_STYLES.margins.x,
    y: yPosition,
  });
  yPosition -= PDF_STYLES.margins.sectionSpacing;

  // Add data rows
  data.forEach((text) => {
    page.drawText(text, {
      ...PDF_STYLES.dataRow,
      x: PDF_STYLES.margins.x,
      y: yPosition,
    });
    yPosition -= PDF_STYLES.margins.lineSpacing;
  });

  return yPosition;
}
