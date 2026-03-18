# テキストコメント機能 設計書

## 概要

キャンバス上の任意の位置に枠なしテキストを配置できる機能。太字・色・サイズの書式変更に対応。

## 操作フロー

1. モードパネルの「A」ボタンをクリック → テキストモードに切り替え
2. キャンバス上をクリック → その位置に枠なしテキストボックスを配置
3. 即座に編集モードに入り、テキスト入力可能
4. テキストボックスをクリック → 近くにミニバー（太字・色・サイズ）を表示
5. ミニバーで書式を変更

## データ構造

```typescript
export type StorageCommentData = {
  id: string;
  text: string;
  posX: number;
  posY: number;
  color: string;    // テキスト色（デフォルト: "#374151" gray-700）
  bold: boolean;    // 太字フラグ
  fontSize: "sm" | "md" | "lg";  // S / M / L
};
```

Liveblocksの Storage に `comments: LiveMap<string, LiveObject<StorageCommentData>>` を追加。

## アプローチ

React Flow のカスタムノード（`type: "comment"`）として実装する。

- ズーム・パン・ドラッグ移動・選択・削除が React Flow の仕組みで動く
- レイアウト計算（d3-flextree）からは `type === "comment"` で除外

## コンポーネント構成

| ファイル | 役割 |
|---|---|
| `comment-node.tsx` | 枠なしテキスト表示 + インライン編集 |
| `comment-toolbar.tsx` | 選択時に表示するミニバー（太字・色・サイズ） |
| `mode-panel.tsx`（既存） | 「A」ボタン追加 |
| `mindmap-canvas-live.tsx`（既存） | コメントCRUD操作 |
| `liveblocks.ts`（既存） | StorageCommentData型追加 |

## ミニバー仕様

- **B（太字トグル）**: テキスト全体の太字 ON/OFF
- **色パレット**: 6色ドット（黒・赤・青・緑・オレンジ・紫）
- **フォントサイズ**: S / M / L の3段階
- 表示位置: 選択中のコメントノードの上部

## 実装ステップ

1. `liveblocks.ts` に StorageCommentData 型と Storage への追加
2. `comment-node.tsx` 作成（枠なしテキスト + 編集）
3. `comment-toolbar.tsx` 作成（ミニバー）
4. `mode-panel.tsx` に「A」ボタン追加（テキストモード）
5. `mindmap-canvas-live.tsx` にコメント CRUD 操作を追加
6. 型チェック・ブラウザ検証
