# Gamble Dice

それぞれの端末から部屋コードで参加して遊ぶ、オンラインのダイスゲームです。
ハズレの確率（1/6〜5/6）を自分で選び、ハズレたクレジットは中央のプールへ。決められた回数だけ連続で当たった人がプールを総取りします。

- ルールと設計：[docs/superpowers/specs/2026-11-23-gamble-dice-design.md](docs/superpowers/specs/2026-11-23-gamble-dice-design.md)
- 使うもの：Firebase の無料プラン（Spark）だけ。サーバーや課金は不要です

## 遊び方

1. Google でログインします（初回は 1000 コインがもらえます）
2. 持ち込むクレジット（最大 100）を決めて、部屋を作るか、部屋コードを入れて参加します（途中で追加はできません）
3. 自分の番では、賭け額とハズレの面数を選んで「振る」か「パス」
   - 当たり：賭け額 × 増加率 だけ増え、続けて振るかパスを選べる
   - ハズレ：没収されてプールへ（没収ルールは部屋ごとに「賭けた額」か「手持ちの半分」）
4. 連続で当たって総取りするか、全員が 2 周続けてパスしたら終了（プールは没収された額の割合で山分け）
5. 残ったクレジットはコインに戻ります。コインはアカウントに保存され、ほかのゲームとも共有できる形になっています

## ガチャ

- 1連 1000 コイン、9連 8000 コイン（9連はレア以上 1 つ保証）
- 確率：コモン 63.35% ／ アンコモン 25% ／ レア 10% ／ スーパーレア 1% ／ Epic 0.5% ／ Legendary 0.1% ／ Mythic 0.05%
- 当たったアイテムは「所持品」でアイコンに設定でき、部屋で名前の横に表示されます
- 総取りで勝った人のアイコンに BGM があると、結果画面で流れます

### アイテムを追加する

`src/gacha/catalog.ts` の `ITEMS` に書き足します。画像や音は `public/items/` に置きます。

```ts
{ id: 'my-meme', rarity: 'epic', name: '名前', image: '/items/my-meme.png', bgm: '/items/my-meme.mp3' }
```

- `id` は一度決めたら変えない（所持品は id で保存されます）
- `bgm` はスーパーレア以上だけ
- まだアイテムがないレア度が当たったときは、一つ下のレア度のアイテムが出ます
- 国旗の絵文字は Windows では文字（例：JP）で表示されます

## 管理者ページ

`https://<プロジェクトID>.web.app/admin` で、パスワードだけでログインします。プレイヤーのコインを増減したり、アイテムを配ったりできます。

- 管理者アカウントは GitHub だけで作れます。リポジトリの Settings → Secrets and variables → Actions に `ADMIN_PASSWORD`（8 文字以上、長めを推奨）を登録し、公開（Actions の「Deploy to Firebase」）を実行すると、作成または更新されます
- パスワードを変えるときは `ADMIN_PASSWORD` を書き換えて、もう一度公開を実行します
- 管理者以外は、画面からもデータベースからも、他人のコインやアイテムを変更できない

## 公開する手順

### 1. Firebase プロジェクトを作る（無料）

1. https://console.firebase.google.com/ で「プロジェクトを追加」
2. **Authentication** → 「始める」→ ログイン方法で **Google** を有効にする
3. **Firestore Database** → 「データベースの作成」→ 本番モードで作成（場所は `asia-northeast1` など近いところ）
4. **プロジェクトの設定**（歯車）→「マイアプリ」でウェブアプリ（`</>`）を追加し、表示される設定値を控える

### 2. 設定値

Firebase の設定値は `.env` に、プロジェクト ID は `.firebaserc` に書いてあります（公開前提の値なのでリポジトリに含めています）。別のプロジェクトで使うときはこの 2 つを書き換えます。

### 3. 公開する

Node.js 20 以上が必要です。

```bash
npm install
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting,firestore
```

表示された `https://<プロジェクトID>.web.app` を友達に送れば遊べます。

## 開発

```bash
npm test        # ルールとゲーム進行のテスト
npm run dev     # .env の Firebase に接続して起動
```

本物の Firebase を使わずに試すときは、エミュレーターを使います（Java と `npm install -g firebase-tools` が必要）。ログイン画面に「テストユーザーでログイン」が出るので、2 つのブラウザで別の名前を入れれば 1 台で対戦を試せます。

```bash
npm run emulators   # 別のターミナルで
npm run dev:emu
```
