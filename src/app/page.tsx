"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function HomePage() {
  const router = useRouter();

  const handleCreateMap = useCallback(() => {
    const roomId = crypto.randomUUID();
    router.push(`/map/${roomId}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 flex flex-col items-center justify-center">
      <div className="text-center space-y-8">
        {/* ロゴ・タイトル */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-7 h-7 text-white"
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
            <h1 className="text-4xl font-bold text-gray-800">MindMap</h1>
          </div>
          <p className="text-lg text-gray-500 max-w-md">
            チームでリアルタイムに共同編集できるマインドマップツール
          </p>
        </div>

        {/* 作成ボタン */}
        <button
          onClick={handleCreateMap}
          className="px-8 py-4 bg-indigo-500 text-white text-lg font-semibold rounded-2xl shadow-lg hover:bg-indigo-600 hover:shadow-xl transition-all duration-200 active:scale-95"
        >
          新しいマップを作る
        </button>

        {/* 使い方 */}
        <div className="flex gap-8 text-sm text-gray-400 mt-12">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Tab</kbd>
            <span>子ノード追加</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Enter</kbd>
            <span>兄弟ノード追加</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Delete</kbd>
            <span>ノード削除</span>
          </div>
        </div>
      </div>
    </div>
  );
}
