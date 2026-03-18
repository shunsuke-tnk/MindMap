// 階層ごとの色パレット定義（XMind風カラフルデザイン）

// ルートノードの色
export const ROOT_COLOR = "#6366F1"; // Indigo

// depth 1 の色（子ノードにサイクリックに割り当て）
export const BRANCH_COLORS = [
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#F97316", // Orange
] as const;

// 深さに応じて明度を調整する
// depth 2 以降は親の色をベースに明るくする
export function getNodeColor(depth: number, branchIndex: number): string {
  if (depth === 0) return ROOT_COLOR;

  const baseColor = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];

  if (depth === 1) return baseColor;

  // depth 2+ は明るいバリエーション（opacity で表現）
  // 実際のレンダリング時に opacity を使って表現する
  return baseColor;
}

// ノードの背景色（depth に応じて薄くする）
export function getNodeBgOpacity(depth: number): number {
  if (depth === 0) return 1;
  if (depth === 1) return 0.9;
  if (depth === 2) return 0.7;
  return 0.5;
}

// テキストカラー（背景色に対するコントラスト）
export function getTextColor(depth: number): string {
  if (depth <= 1) return "#FFFFFF";
  return "#1F2937"; // gray-800
}
