import type { NotificationsResponse } from '../types';
import { api, errorMessage } from '../api';
import { PageHeader } from '../components/ui';

interface Props {
  notifications: NotificationsResponse;
  onChanged: () => Promise<void>;
}

export default function Notifications({ notifications, onChanged }: Props) {
  async function markRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function markAll() {
    try {
      await api.post('/notifications/read-all');
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="INBOX"
        title="Notifications"
        subtitle="Approval decisions and requests waiting for you"
        action={notifications.unread > 0 ? (
          <button onClick={() => void markAll()} className="px-4 py-2 rounded text-sm border" style={{ borderColor: '#30363d', color: '#8b949e' }}>
            Mark all as read
          </button>
        ) : undefined}
      />

      <div className="rounded-lg border divide-y" style={{ background: '#161b22', borderColor: '#30363d' }}>
        {notifications.items.length === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: '#8b949e' }}>No notifications yet</div>
        )}
        {notifications.items.map(n => (
          <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-4" style={{ borderColor: '#30363d' }}>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.isRead ? '#30363d' : '#f0a428' }} />
              <div>
                <div className="text-sm" style={{ color: n.isRead ? '#8b949e' : '#c9d1d9' }}>{n.message}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#8b949e' }}>{new Date(n.createdAt).toLocaleString('en-GB')}</div>
              </div>
            </div>
            {!n.isRead && (
              <button onClick={() => void markRead(n.id)} className="text-xs px-2 py-1 rounded border shrink-0" style={{ borderColor: '#30363d', color: '#8b949e' }}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
