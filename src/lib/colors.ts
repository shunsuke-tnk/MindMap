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

// ノードの背景色（depth に応じてアルファ値で薄くする）
// opacity をノード全体に適用するとテキストも薄くなるため、背景色自体に透明度を含める
export function getNodeBgColor(color: string, depth: number): string {
  if (depth === 0) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  if (depth === 1) return `rgba(${r}, ${g}, ${b}, 0.9)`;
  if (depth === 2) return `rgba(${r}, ${g}, ${b}, 0.7)`;
  return `rgba(${r}, ${g}, ${b}, 0.55)`;
}

// テキストカラー（背景色に対するコントラスト）
export function getTextColor(depth: number): string {
  if (depth <= 1) return "#FFFFFF";
  return "#111827"; // gray-900
}
