# 開発タスク

## Phase 1: プロジェクトセットアップ

- [x] Next.js + TypeScript + Tailwind CSS プロジェクト作成
- [x] 依存パッケージインストール（Liveblocks, React Flow, d3-hierarchy, d3-flextree）
- [x] CLAUDE.md・ドキュメント・設定ファイル配置
- [x] Liveblocks APIキー取得・環境変数設定

## Phase 2: マインドマップ基本機能（ローカルのみ）

- [x] 共通型定義（`types/mindmap.ts`）
- [x] 色パレット定義（`lib/colors.ts`）
- [x] カスタムノードコンポーネント（`components/mindmap-node.tsx`）
  - XMind風カラフルデザイン（角丸、階層色分け）
  - ダブルクリックでインライン編集
  - ノード追加ボタン（子ノード作成）
- [x] カスタムエッジコンポーネント（`components/mindmap-edge.tsx`）
  - ベジェ曲線、親ノードの色に合わせた色
- [x] レイアウト計算フック（`hooks/use-mindmap-layout.ts`）
  - d3-flextree でツリーレイアウト
  - horizontal（マインドマップ）/ vertical（ロジックツリー）切替
- [x] マップ編集ページ骨格（`app/map/[roomId]/page.tsx`）
- [x] ノードの追加・削除・テキスト編集
- [x] キーボードショートカット（Tab: 子ノード追加、Enter: 兄弟ノード追加、Delete: 削除）

## Phase 3: リアルタイム共同編集

- [x] Liveblocks 設定（`lib/liveblocks.ts`）
- [x] RoomProvider 統合
- [x] Storage にノード・エッジの状態を同期
- [x] React Flow と Liveblocks Storage の双方向バインディング
- [x] プレゼンス機能（他ユーザーのカーソル・選択状態表示）
- [x] ニックネーム入力ダイアログ

## Phase 4: 画面・UX仕上げ

- [x] トップページ（新規マップ作成ボタン）
- [x] ツールバー（レイアウト切替、ズーム、共有URLコピー）
- [x] マップ名の編集機能
- [ ] レスポンシブ調整（PC中心だがタブレットでも崩れない程度に）

## Phase 5: テスト・仕上げ

- [x] Liveblocks 接続・Storage永続化の動作確認
- [ ] 複数ブラウザタブでの同時編集テスト（手動確認推奨）
- [ ] エッジケース対応（空ノード、深い階層、大量ノード）
- [x] ビルド確認（`npm run build`）
