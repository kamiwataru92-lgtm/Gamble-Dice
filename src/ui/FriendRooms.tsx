import type { FriendStatus } from '../firebase/friends'
import { PlayerName } from './ItemView'

const STATUS = { waiting: '参加者募集中', playing: 'ゲーム中', finished: '結果発表中' } as const

/** Rooms friends are in, with a button to go there. */
export function FriendRooms({ friends, onEnter }: { friends: FriendStatus[]; onEnter: (code: string) => void }) {
  const rows = friends.flatMap((f) => f.rooms.map((r) => ({ friend: f, ...r })))
  if (rows.length === 0) return <small>部屋にいるフレンドはいません</small>
  return (
    <ul className="list">
      {rows.map(({ friend, code, room }) => (
        <li key={`${friend.uid}-${code}`}>
          <span className="stack" style={{ gap: 2 }}>
            <PlayerName name={friend.displayName} icon={friend.icon} />
            <small>{code} ・ {STATUS[room.status]}（{Object.keys(room.players).length} 人）</small>
          </span>
          <button className={room.status === 'waiting' ? 'primary' : ''} onClick={() => onEnter(code)}>
            {room.status === 'waiting' ? '入る' : '見に行く'}
          </button>
        </li>
      ))}
    </ul>
  )
}
