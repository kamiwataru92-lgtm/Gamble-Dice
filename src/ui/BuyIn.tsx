import { MAX_BUY_IN, MIN_BUY_IN } from '../game/config'

/** Buy-in amount input shared by the lobby and the room. */
export function BuyIn({ value, onChange, coins }: { value: number; onChange: (v: number) => void; coins: number }) {
  return (
    <label>
      持ち込むクレジット（{MIN_BUY_IN}〜{MAX_BUY_IN}、ゲーム中は追加できません）
      <input type="number" min={MIN_BUY_IN} max={Math.min(MAX_BUY_IN, coins)} value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)} />
      <small>所持コイン：{coins.toLocaleString()}（1 コイン = 1 クレジット）</small>
    </label>
  )
}
