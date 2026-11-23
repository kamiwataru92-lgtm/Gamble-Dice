# Gamble Dice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase（Spark）上で動く、各自の端末から部屋コードで参加するオンライン・ダイスゲームを作る。

**Architecture:** ルールはすべて純粋関数（`src/game/`）に置き、Vitest でテストする。Firestore の部屋ドキュメントに状態を1つにまとめ、行動はトランザクション内で純粋関数を適用して書き戻す。ウォレットは `users/{uid}.coins` に置き、ゲームから独立させる。

**Tech Stack:** Vite 5 + React 18 + TypeScript 5、Firebase JS SDK 10（Auth / Firestore / Hosting）、Vitest 2

**Spec:** `docs/superpowers/specs/2026-11-23-gamble-dice-design.md`

## Global Constraints

- Firebase Spark プランのみ。Cloud Functions は使わない
- 初回ログインで 1000 コイン。1 コイン = 1 クレジット
- 部屋は 2〜6 人。部屋コードは 6 文字。開始後の途中参加不可
- 途中の追加換金不可
- 増加率：ハズレ面 1→10%、2→20%、3→40%、4→60%、5→90%（`src/game/config.ts` に集約）。増加額は `floor(bet × rate)`
- 没収：`bet` モードは賭け額、`half` モードは `max(1, floor(credits / 2))`
- 連続当たり必要回数：初期値 3（ホスト設定、1〜10）
- 全員パス：失格していない全員が 2 周続けて「振らずにパス」で終了。誰かが振ったらリセット
- 山分け：没収累計の割合、切り捨て、余りは没収累計が最も多い人（同数なら手番順で先の人）
- 手番の時間切れ：60 秒で自動パス
- UI 文言は日本語

## Review Focus

1. 不正な賭け額（0、負数、小数、手持ち超え）や範囲外のハズレ面数 → 状態を変えず拒否される
2. `half` モードで手持ち 1 のときにハズレ → 1 没収され失格になる
3. 2 台の端末が同時に精算 → コインは 1 回だけ戻る（`settled` フラグ＋トランザクション）
4. 手番でない人の行動や、古い状態に基づく行動 → 拒否される
5. 手持ちコインを超える持ち込み、満員の部屋、開始済みの部屋への参加 → 拒否される

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html
firebase.json, firestore.rules, .firebaserc.example
src/game/config.ts      増加率表・定数
src/game/types.ts       GameState などの型
src/game/rules.ts       増加額・没収額・山分けの計算
src/game/engine.ts      行動を状態に適用する純粋関数
src/firebase/app.ts     Firebase 初期化（設定は環境変数から）
src/firebase/wallet.ts  ユーザー作成・コイン読み書き
src/firebase/rooms.ts   部屋の作成・参加・開始・行動・精算
src/ui/*.tsx            画面
tests/*.test.ts
README.md
```

注：spec の `rooms/{code}/players/{uid}` サブコレクションは、トランザクションを単純にするため部屋ドキュメント内の `players` マップに変更する（実装側の判断）。

---

### Task 1: 雛形とルール計算

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/game/config.ts`, `src/game/types.ts`, `src/game/rules.ts`
- Test: `tests/rules.test.ts`

**Interfaces:**
- Produces:
  - `config.ts`: `RATES: Record<1|2|3|4|5, number>`, `INITIAL_COINS = 1000`, `MIN_PLAYERS = 2`, `MAX_PLAYERS = 6`, `TURN_SECONDS = 60`, `DEFAULT_STREAK = 3`, `PASS_ROUNDS_TO_END = 2`
  - `types.ts`: `ForfeitMode = 'bet' | 'half'`、`LoseFaces = 1|2|3|4|5`、`PlayerState { uid; displayName; credits; buyIn; forfeitedTotal; eliminated; settled }`、`GameState`（Task 2 で定義）
  - `rules.ts`:
    - `winAmount(bet: number, loseFaces: LoseFaces): number`
    - `forfeitAmount(mode: ForfeitMode, bet: number, credits: number): number`
    - `isWin(face: number, loseFaces: LoseFaces): boolean` — face は 1〜6、`face > loseFaces` なら当たり
    - `splitPool(pool: number, forfeited: { uid: string; amount: number }[]): Record<string, number>` — 配列順が手番順

- [ ] **Step 1: Vite + React + TS の雛形を作り、Vitest を入れる**（`npm create vite` 相当を手で、`npm test` = `vitest run`）
- [ ] **Step 2: 失敗するテストを書く**

```ts
expect(winAmount(100, 1)).toBe(10)
expect(winAmount(100, 5)).toBe(90)
expect(winAmount(15, 3)).toBe(6)            // floor(15*0.4)
expect(forfeitAmount('bet', 30, 100)).toBe(30)
expect(forfeitAmount('half', 30, 101)).toBe(50)
expect(forfeitAmount('half', 30, 1)).toBe(1)
expect(isWin(2, 1)).toBe(true); expect(isWin(1, 1)).toBe(false)
expect(isWin(6, 5)).toBe(true); expect(isWin(5, 5)).toBe(false)
expect(splitPool(100, [{uid:'a',amount:1},{uid:'b',amount:2}])).toEqual({a:33, b:67}) // 余り1→最多のb
expect(splitPool(10, [{uid:'a',amount:3},{uid:'b',amount:3},{uid:'c',amount:3}])).toEqual({a:4,b:3,c:3}) // 同数→手番順で先
expect(splitPool(0, [{uid:'a',amount:0}])).toEqual({a:0})
expect(splitPool(50, [{uid:'a',amount:0},{uid:'b',amount:0}])).toEqual({a:0,b:0})  // 没収ゼロなら配分なし
```

- [ ] **Step 3: `npm test` で失敗を確認**
- [ ] **Step 4: `config.ts` / `types.ts` / `rules.ts` を実装**
- [ ] **Step 5: `npm test` で全件 PASS、`npm run build` 成功**
- [ ] **Step 6: Commit** `feat: scaffold app and dice rule calculations`

---

### Task 2: ゲームエンジン（純粋関数）

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/engine.ts`
- Test: `tests/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `rules.ts`、`config.ts`
- Produces:
  - `GameState { status: 'waiting'|'playing'|'finished'; hostUid; settings: { forfeitMode: ForfeitMode; streakToWin: number }; players: Record<string, PlayerState>; turnOrder: string[]; currentTurnIndex: number; currentStreak: number; rolledThisTurn: boolean; consecutivePasses: number; pool: number; turnDeadline: number; lastRoll: { uid; bet; loseFaces; face; win; delta } | null; result: { reason: 'streak'|'allPass'; winnerUid?: string; payouts: Record<string, number> } | null }`
  - `Action = { type: 'roll'; uid: string; bet: number; loseFaces: LoseFaces } | { type: 'pass'; uid: string } | { type: 'timeout'; now: number }`
  - `startGame(state: GameState, rng: () => number, now: number): GameState` — `turnOrder` をシャッフル
  - `applyAction(state: GameState, action: Action, rng: () => number, now: number): GameState` — 不正な行動は `GameError`（`code` プロパティ付き）を投げる
  - `export class GameError extends Error { code: string }`

挙動（spec 5.3〜5.6）：
- `roll`：出目 = `floor(rng()*6)+1`。当たり → credits += winAmount、streak+1、`rolledThisTurn=true`、手番継続。streak が `streakToWin` に達したら pool を総取りし `finished`（reason `streak`、payouts は勝者に pool）。ハズレ → forfeitAmount を没収し pool と forfeitedTotal に加算、credits 0 なら eliminated、手番終了
- 振ったら `consecutivePasses = 0`
- `pass`：`rolledThisTurn` が false なら `consecutivePasses+1`。手番終了
- `timeout`：`now >= turnDeadline` のときだけ有効。現在の手番の人の `pass` と同じ
- 手番終了：streak と rolledThisTurn をリセット、失格者を飛ばして次へ、`turnDeadline = now + TURN_SECONDS*1000`
- 終了判定：残り人数 0 → `allPass` 扱い。`consecutivePasses >= PASS_ROUNDS_TO_END × 残り人数` → `allPass`。`allPass` の payouts は `splitPool`（失格者含む、手番順）

- [ ] **Step 1: 失敗するテストを書く**（rng は固定値を返す関数で注入）
  - `startGame` が全員を含む順番を作り、`status='playing'`
  - 当たりで credits が `winAmount` 分増え、同じ人の手番のまま
  - ハズレ（bet モード）で賭け額が pool へ、次の人へ
  - ハズレ（half モード、credits 1）で eliminated、次の手番で飛ばされる
  - streakToWin=3 で3連続当たり → finished、勝者 credits += pool、`result.reason==='streak'`
  - 当たり後のパスは `consecutivePasses` を増やさない
  - 3人で振らずにパスが 5 回では継続、6 回目で finished（`allPass`）、payouts が没収割合
  - 途中で誰かが振ると `consecutivePasses` が 0 に戻る
  - 全員失格で finished（`allPass`）
  - `GameError`：手番でない人（`not_your_turn`）、bet が 0・負・小数・手持ち超え（`invalid_bet`）、loseFaces が 0 や 6（`invalid_faces`）、finished 後の行動（`not_playing`）、期限前の timeout（`not_expired`）
- [ ] **Step 2: `npm test` で失敗を確認**
- [ ] **Step 3: `engine.ts` を実装**（入力の state は変更せず新しいオブジェクトを返す）
- [ ] **Step 4: `npm test` で PASS**
- [ ] **Step 5: Commit** `feat: add game engine`

---

### Task 3: Firebase 初期化・ログイン・ウォレット

**Files:**
- Create: `src/firebase/app.ts`, `src/firebase/wallet.ts`, `.env.example`, `firebase.json`, `firestore.rules`, `.firebaserc.example`
- Test: なし（Firebase 実体が必要なため Task 6 の手動確認で検証）

**Interfaces:**
- Produces:
  - `app.ts`: `auth`, `db`、`signInWithGoogle(): Promise<void>`、`signOut(): Promise<void>` — 設定は `import.meta.env.VITE_FIREBASE_*`（apiKey, authDomain, projectId, appId）
  - `wallet.ts`: `ensureUser(uid: string, displayName: string): Promise<void>`（存在しなければ `coins: INITIAL_COINS` で作成、トランザクション）、`watchCoins(uid, cb: (coins: number) => void): () => void`

`firestore.rules`：
- `users/{uid}`：本人のみ read/write。`coins` は 0 以上の整数
- `rooms/{code}`：ログイン済みなら read。create はログイン済みで `hostUid == request.auth.uid`。update は既存の参加者、または参加で自分を `players` に加える人

- [ ] **Step 1: 上記を実装。`.env.example` に4つの変数名を書く**
- [ ] **Step 2: `npm run build` 成功**
- [ ] **Step 3: Commit** `feat: add firebase auth, wallet and security rules`

---

### Task 4: 部屋サービス

**Files:**
- Create: `src/firebase/rooms.ts`, `src/game/roomCode.ts`
- Test: `tests/roomCode.test.ts`

**Interfaces:**
- Consumes: Task 2 の `startGame`, `applyAction`, `GameError`、Task 3 の `db`
- Produces:
  - `roomCode.ts`: `generateRoomCode(rng: () => number): string` — 6 文字、紛らわしい文字（0,O,1,I）を除いた大文字英数字
  - `createRoom(host: {uid; displayName}, settings, buyIn: number): Promise<string>`
  - `joinRoom(code, user, buyIn): Promise<void>` — 1つのトランザクションでコインを減らし players に追加。`GameError`：`insufficient_coins`、`room_full`、`already_started`、`not_found`、`invalid_buyin`（1未満・小数）
  - `startRoom(code, uid)` — ホストのみ、`MIN_PLAYERS` 以上
  - `act(code, action)` — トランザクション内で `applyAction`
  - `watchRoom(code, cb: (s: GameState) => void): () => void`
  - `settle(code, uid): Promise<void>` — finished のとき、本人の `settled` が false なら、`credits + payouts[uid]` をコインに加算し `settled=true`（1トランザクション）
  - `settlePending(uid)` — 本人が参加した finished かつ未精算の部屋をすべて精算。`users/{uid}.openRooms: string[]` で追跡し、精算後に外す

- [ ] **Step 1: `generateRoomCode` の失敗するテスト**（長さ 6、除外文字が出ない、同じ rng 列なら同じ結果）
- [ ] **Step 2: 実装して PASS**
- [ ] **Step 3: `rooms.ts` を実装、`npm run build` 成功**
- [ ] **Step 4: Commit** `feat: add room service`

---

### Task 5: 画面

**Files:**
- Create: `src/ui/App.tsx`, `src/ui/Login.tsx`, `src/ui/Lobby.tsx`, `src/ui/WaitingRoom.tsx`, `src/ui/GameBoard.tsx`, `src/ui/Result.tsx`, `src/ui/styles.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: Task 3・4 のすべて

画面：
- **Login**：Google ログインボタン。ログイン後 `ensureUser` → `settlePending`
- **Lobby**：所持コイン表示。部屋を作る（没収ルール・連続回数・持ち込み額）／部屋コードと持ち込み額で参加
- **WaitingRoom**：コード表示（コピー可）、参加者一覧、ホストのみ開始ボタン
- **GameBoard**：プール、各プレイヤーのクレジット・失格表示、手番の人と残り秒数、直前の出目。自分の番なら賭け額入力・ハズレ面数選択（増加率を併記）・「振る」「パス」。`GameError.code` を日本語メッセージで表示
- **Result**：終了理由、各人の受け取り、自動で `settle` を実行し所持コインを表示、ロビーへ戻る
- 時間切れ：期限を過ぎたら参加中の全クライアントが `act({type:'timeout', now})` を送る（最初の1件だけ有効）
- スマホ幅（360px）で崩れないこと

- [ ] **Step 1: 実装、`npm run build` 成功**
- [ ] **Step 2: `npm run dev` を Playwright で開き、ログイン画面が表示されることを 360px 幅のスクリーンショットで確認**
- [ ] **Step 3: Commit** `feat: add game UI`

---

### Task 6: 公開手順と通しの確認

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README に日本語で書く**：Firebase プロジェクト作成、Google ログイン有効化、Firestore 作成、`.env.local` 作成、`npm install` / `npm run dev`、`firebase deploy --only hosting,firestore:rules`
- [ ] **Step 2: `npm test` 全件 PASS、`npm run build` 成功**
- [ ] **Step 3: 利用者の Firebase 設定値を受け取れたら、2つのブラウザで「部屋作成 → 参加 → 開始 → 振る/パス → 終了 → 精算」を確認。受け取れない場合は未確認として報告**
- [ ] **Step 4: Commit** `docs: add setup and deploy guide`
