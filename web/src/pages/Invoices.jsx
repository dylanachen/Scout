import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const load = () => {
    api
      .get('/invoices')
      .then((r) => setRows(r.data ?? []))
      .catch(() => setErr('Could not load invoices.'));
  };

  useEffect(() => {
    load();
  }, []);

  const markPaid = async (id) => {
    try {
      await api.patch(`/invoices/${id}`, { status: 'paid' });
      load();
    } catch {
      setErr('Update failed.');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Invoices</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>GET /invoices · PATCH /invoices/:id</p>
      {err && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{err}</p>}
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 12 }}>ID</th>
              <th style={{ padding: 12 }}>Amount</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 12 }}>{inv.id}</td>
                <td style={{ padding: 12 }}>{inv.amount ?? '—'}</td>
                <td style={{ padding: 12 }}>{inv.status ?? '—'}</td>
                <td style={{ padding: 12 }}>
                  {inv.status !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => markPaid(inv.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-2)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                      }}
                    >
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} style={{ padding: 20, color: 'var(--color-text-3)' }}>
                  No invoices (or API offline).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
