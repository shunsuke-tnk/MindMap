"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ランダムなニックネーム
const RANDOM_NAMES = [
  "ネコ", "イヌ", "パンダ", "ウサギ", "コアラ",
  "ペンギン", "キツネ", "タヌキ", "リス", "カワウソ",
];

function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

interface NicknameDialogProps {
  onSubmit: (nickname: string) => void;
}

export function NicknameDialog({ onSubmit }: NicknameDialogProps) {
  const [name, setName] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // クライアント側でのみランダム名を生成（ハイドレーション不一致を防ぐ）
  useEffect(() => {
    setPlaceholder(getRandomName());
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(name.trim() || placeholder);
    },
    [name, placeholder, onSubmit]
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          ニックネームを入力
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          他のメンバーに表示される名前です
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            maxLength={20}
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
