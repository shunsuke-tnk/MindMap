"use client";

import { useCallback } from "react";

const COLOR_OPTIONS = [
  { value: "#374151", label: "黒" },
  { value: "#DC2626", label: "赤" },
  { value: "#2563EB", label: "青" },
  { value: "#059669", label: "緑" },
  { value: "#D97706", label: "オレンジ" },
  { value: "#7C3AED", label: "紫" },
];

const FONT_SIZE_OPTIONS: { value: "sm" | "md" | "lg"; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

interface CommentToolbarProps {
  commentId: string;
  bold: boolean;
  color: string;
  fontSize: "sm" | "md" | "lg";
  onStyleChange: (
    id: string,
    style: Partial<{ bold: boolean; color: string; fontSize: "sm" | "md" | "lg" }>
  ) => void;
}

export function CommentToolbar({
  commentId,
  bold,
  color,
  fontSize,
  onStyleChange,
}: CommentToolbarProps) {
  const handleBoldToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStyleChange(commentId, { bold: !bold });
    },
    [commentId, bold, onStyleChange]
  );

  const handleColorChange = useCallback(
    (e: React.MouseEvent, newColor: string) => {
      e.stopPropagation();
      onStyleChange(commentId, { color: newColor });
    },
    [commentId, onStyleChange]
  );

  const handleFontSizeChange = useCallback(
    (e: React.MouseEvent, newSize: "sm" | "md" | "lg") => {
      e.stopPropagation();
      onStyleChange(commentId, { fontSize: newSize });
    },
    [commentId, onStyleChange]
  );

  return (
    <div
      className="absolute -top-10 left-0 flex items-center gap-1.5 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 z-50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 太字トグル */}
      <button
        onClick={handleBoldToggle}
        className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-colors ${
          bold
            ? "bg-gray-800 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
        title="太字"
      >
        B
      </button>

      <div className="w-px h-4 bg-gray-200" />

      {/* 色パレット */}
      {COLOR_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={(e) => handleColorChange(e, opt.value)}
          className={`w-4 h-4 rounded-full transition-transform ${
            color === opt.value ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "hover:scale-110"
          }`}
          style={{ backgroundColor: opt.value }}
          title={opt.label}
        />
      ))}

      <div className="w-px h-4 bg-gray-200" />

      {/* フォントサイズ */}
      {FONT_SIZE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={(e) => handleFontSizeChange(e, opt.value)}
          className={`px-1.5 h-6 rounded text-xs transition-colors ${
            fontSize === opt.value
              ? "bg-indigo-100 text-indigo-700 font-semibold"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title={`フォントサイズ: ${opt.label}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
