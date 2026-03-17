"use client";

export type CanvasMode = "pointer" | "hand";

interface ModePanelProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
}

export function ModePanel({ mode, onModeChange }: ModePanelProps) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* ポインターモード */}
      <button
        onClick={() => onModeChange("pointer")}
        className={`p-2 transition-colors ${
          mode === "pointer"
            ? "bg-indigo-50 text-indigo-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
        title="ポインターモード (V)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      </button>

      {/* 区切り線 */}
      <div className="h-px bg-gray-200" />

      {/* ハンドモード */}
      <button
        onClick={() => onModeChange("hand")}
        className={`p-2 transition-colors ${
          mode === "hand"
            ? "bg-indigo-50 text-indigo-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
        title="ハンドモード (H)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      </button>
    </div>
  );
}
