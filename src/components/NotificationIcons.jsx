import { NOTIFICATION_TYPES } from '../utils/notificationModel';

const iconWrap = { display: 'inline-flex', flexShrink: 0 };

export function NotificationTypeIcon({ type, size = 22 }) {
  const s = size;
  const stroke = 'currentColor';
  const sw = 1.5;

  switch (type) {
    case NOTIFICATION_TYPES.MATCH:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M7 14.5l-2.5-2.5a2 2 0 012.8-2.9l1.1 1.1M17 14.5l2.5-2.5a2 2 0 00-2.8-2.9l-1.1 1.1M9 12l2 2 4-4 2 2"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 16v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.MESSAGE:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6.5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3.5V15.5H6a2 2 0 01-2-2v-7z"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path d="M8 9.5h8M8 12h5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.SCOPE:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3l8 4v6c0 5-3.5 9.2-8 10-4.5-.8-8-5-8-10V7l8-4z"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path d="M12 8v5M12 16h.01" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.DECISION:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
            <path
              d="M8 12l3 3 5-5"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.MILESTONE:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="5" width="16" height="16" rx="2" stroke={stroke} strokeWidth={sw} />
            <path d="M8 3v4M16 3v4M4 11h16" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.INVOICE_VIEWED:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
              stroke={stroke}
              strokeWidth={sw}
            />
            <circle cx="12" cy="12" r="2.5" stroke={stroke} strokeWidth={sw} />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.CHANGE_ORDER:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 6l4 4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.MEETING_SUMMARY:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path d="M8 11a4 4 0 008 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <path d="M12 17v2M9 19h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.VARIANCE:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
            <path d="M12 7v6l4 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case NOTIFICATION_TYPES.ASSET_REMINDER:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path
              d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10L4 17V7m8 14V11m0 0L4 7"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    default:
      return (
        <span style={iconWrap} aria-hidden>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
          </svg>
        </span>
      );
  }
}
