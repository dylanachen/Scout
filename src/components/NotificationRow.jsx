import { useNavigate } from 'react-router-dom';
import { NotificationTypeIcon } from './NotificationIcons';
import { formatRelativeTime } from '../utils/notificationModel';

const rowBase = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};

export default function NotificationRow({
  n,
  unread,
  compact,
  onBeforeNavigate,
  markRead,
}) {
  const navigate = useNavigate();

  function handleClick() {
    markRead(n.id);
    onBeforeNavigate?.();
    navigate(n.navigate.path, { state: n.navigate.state });
  }

  return (
    <button type="button" onClick={handleClick} style={{ ...rowBase, padding: compact ? '10px 10px' : rowBase.padding }}>
      <span
        style={{
          width: 8,
          marginTop: 6,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {unread ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-primary)',
            }}
          />
        ) : (
          <span style={{ width: 8, height: 8 }} />
        )}
      </span>
      <span style={{ color: 'var(--color-primary)', marginTop: 2 }}>
        <NotificationTypeIcon type={n.type} size={compact ? 20 : 22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: unread ? 700 : 400, fontSize: compact ? 13 : 14, color: 'var(--color-text)', lineHeight: 1.35 }}>
          {n.title}
        </span>
        <span
          style={{
            display: compact ? 'block' : '-webkit-box',
            WebkitLineClamp: compact ? undefined : 2,
            WebkitBoxOrient: compact ? undefined : 'vertical',
            fontSize: compact ? 12 : 13,
            color: 'var(--color-text-2)',
            marginTop: 2,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: compact ? 'nowrap' : 'normal',
          }}
        >
          {n.description}
        </span>
        <time
          dateTime={n.at}
          style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}
        >
          {formatRelativeTime(n.at)}
        </time>
      </span>
    </button>
  );
}
