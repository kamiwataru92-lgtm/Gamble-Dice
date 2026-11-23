import { useEffect, useState } from 'react'
import {
  acceptRequest, deleteRequest, findByHandle, removeFriend, sendRequest, setHandle, watchRequests,
  type FriendRequest, type FriendStatus, type Profile,
} from '../firebase/friends'
import { FriendRooms } from './FriendRooms'
import { PlayerName } from './ItemView'
import { errorMessage } from './messages'

interface Props {
  me: { uid: string; displayName: string }
  handle: string | null
  friends: FriendStatus[]
  onEnter: (code: string) => void
}

export function Friends({ me, handle, friends, onEnter }: Props) {
  const [handleInput, setHandleInput] = useState(handle ?? '')
  const [editing, setEditing] = useState(!handle)
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<Profile | null | undefined>(undefined)
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => watchRequests(me.uid, (i, o) => { setIncoming(i); setOutgoing(o) }), [me.uid])
  useEffect(() => { if (handle) { setHandleInput(handle); setEditing(false) } }, [handle])

  async function run(fn: () => Promise<unknown>, ok = '') {
    setError('')
    setMessage('')
    try {
      await fn()
      if (ok) setMessage(ok)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>あなたのフレンドID</h2>
        {editing ? (
          <>
            <input value={handleInput} placeholder="例：dice_king" maxLength={16} autoCapitalize="off"
              onChange={(e) => setHandleInput(e.target.value)} />
            <small>半角の英小文字・数字・_ で 3〜16 文字。フレンドはこの ID であなたを探します。</small>
            <div className="row">
              <button className="primary grow" onClick={() => run(() => setHandle(me.uid, handleInput), 'フレンドID を保存しました')}>保存</button>
              {handle && <button className="grow" onClick={() => setEditing(false)}>やめる</button>}
            </div>
          </>
        ) : (
          <div className="row">
            <span className="grow code-sm">@{handle}</span>
            <button onClick={() => setEditing(true)}>変更</button>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2>フレンドを探す</h2>
        <div className="row">
          <input className="grow" value={search} placeholder="フレンドID" autoCapitalize="off" onChange={(e) => setSearch(e.target.value)} />
          <button onClick={() => run(async () => setFound(await findByHandle(search)))}>検索</button>
        </div>
        {found === null && <small>見つかりませんでした</small>}
        {found && (
          <div className="row">
            <span className="grow"><PlayerName name={found.displayName} icon={found.icon} /> <small>@{found.handle}</small></span>
            {friends.some((f) => f.uid === found.uid) ? <small>フレンドです</small>
              : found.uid === me.uid ? <small>あなたです</small>
              : <button className="primary" onClick={() => run(async () => {
                  const r = await sendRequest(me, found)
                  setMessage(r === 'accepted' ? 'フレンドになりました' : '申請しました')
                })}>申請</button>}
          </div>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="card stack">
          <h2>届いた申請</h2>
          <ul className="list">
            {incoming.map((r) => (
              <li key={r.id}>
                <span>{r.fromName}</span>
                <span className="row">
                  <button className="primary" onClick={() => run(() => acceptRequest(r), 'フレンドになりました')}>承認</button>
                  <button onClick={() => run(() => deleteRequest(r.id))}>拒否</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="card stack">
          <h2>送った申請</h2>
          <ul className="list">
            {outgoing.map((r) => (
              <li key={r.id}>
                <span>{r.toName} <small>承認待ち</small></span>
                <button onClick={() => run(() => deleteRequest(r.id))}>取り消し</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card stack">
        <h2>フレンドの部屋</h2>
        <FriendRooms friends={friends} onEnter={onEnter} />
      </section>

      <section className="card stack">
        <h2>フレンド（{friends.length} 人）</h2>
        <ul className="list">
          {friends.map((f) => (
            <li key={f.uid}>
              <span><PlayerName name={f.displayName} icon={f.icon} /> {f.handle && <small>@{f.handle}</small>}</span>
              <button className="link" onClick={() => confirm(`${f.displayName} とのフレンドを解除しますか？`) && run(() => removeFriend(me.uid, f.uid))}>解除</button>
            </li>
          ))}
          {friends.length === 0 && <li><small>まだフレンドがいません</small></li>}
        </ul>
      </section>
      {message && <p className="center ok">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
