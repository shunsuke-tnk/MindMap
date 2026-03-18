"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { LayoutDirection } from "@/types/mindmap";

function FileMenu({ onSave, onLoad, onExportPdf }: { onSave?: () => void; onLoad?: () => void; onExportPdf?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
      >
        ファイル
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => { onSave?.(); setIsOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            JSONで保存
          </button>
          <button
            onClick={() => { onLoad?.(); setIsOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            JSONを読み込み
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={() => { onExportPdf?.(); setIsOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            PDFでエクスポート
          </button>
        </div>
      )}
    </div>
  );
}

interface ToolbarProps {
  direction: LayoutDirection;
  onDirectionChange: (direction: LayoutDirection) => void;
  onGroupSelected?: () => void;
  hasSelection?: boolean;
  onSave?: () => void;
  onLoad?: () => void;
  onExportPdf?: () => void;
  children?: React.ReactNode;
}

export function Toolbar({ direction, onDirectionChange, onGroupSelected, hasSelection, onSave, onLoad, onExportPdf, children }: ToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [copied, setCopied] = useState(false);
  const [mapName, setMapName] = useState("無題のマップ");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API が使えない場合のフォールバック
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
    if (!mapName.trim()) {
      setMapName("無題のマップ");
    }
  }, [mapName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleNameBlur();
      }
      if (e.key === "Escape") {
        setIsEditingName(false);
      }
    },
    [handleNameBlur]
  );

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      {/* 左: マップ名 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <FileMenu onSave={onSave} onLoad={onLoad} onExportPdf={onExportPdf} />
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="text-lg font-semibold text-gray-700 bg-transparent border-b-2 border-indigo-300 outline-none px-1"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-lg font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
          >
            {mapName}
          </button>
        )}
      </div>

      {/* 中央: レイアウト切替 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onDirectionChange("horizontal")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              direction === "horizontal"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            マインドマップ
          </button>
          <button
            onClick={() => onDirectionChange("vertical")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              direction === "vertical"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ロジックツリー
          </button>
        </div>

        {/* グループ化ボタン（複数選択時のみ表示） */}
        {hasSelection && onGroupSelected && (
          <button
            onClick={onGroupSelected}
            className="px-3 py-1 text-sm bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-colors"
          >
            グループ化
          </button>
        )}
      </div>

      {/* 右: 参加者・ズーム・共有 */}
      <div className="flex items-center gap-3">
        {/* 参加者バッジ */}
        {children}

        {/* ズーム */}
        <div className="flex items-center bg-gray-100 rounded-lg">
          <button
            onClick={() => zoomOut()}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
            title="ズームアウト"
          >
            -
          </button>
          <button
            onClick={() => fitView({ padding: 0.3 })}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs"
            title="全体表示"
          >
            Fit
          </button>
          <button
            onClick={() => zoomIn()}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
            title="ズームイン"
          >
            +
          </button>
        </div>

        {/* 共有ボタン */}
        <button
          onClick={handleCopyUrl}
          className={`px-4 py-1.5 text-sm rounded-lg transition-all ${
            copied
              ? "bg-green-100 text-green-600"
              : "bg-indigo-500 text-white hover:bg-indigo-600"
          }`}
        >
          {copied ? "コピーしました" : "URLを共有"}
        </button>
      </div>
    </div>
  );
}
