"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

// React Flow のキャンバスをPNG画像としてキャプチャ
async function captureCanvas(): Promise<string> {
  const viewport = document.querySelector(
    ".react-flow__viewport"
  ) as HTMLElement | null;
  if (!viewport) throw new Error("キャンバスが見つかりません");

  return toPng(viewport, {
    backgroundColor: "#f9fafb",
    quality: 1,
    pixelRatio: 2,
  });
}

// PDFとしてダウンロード
export async function exportToPdf(filename = "mindmap") {
  const dataUrl = await captureCanvas();

  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  const isLandscape = img.width > img.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "px",
    format: [img.width / 2, img.height / 2],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, img.width / 2, img.height / 2);
  pdf.save(`${filename}.pdf`);
}

// PNG画像としてダウンロード
export async function exportToPng(filename = "mindmap") {
  const dataUrl = await captureCanvas();

  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
