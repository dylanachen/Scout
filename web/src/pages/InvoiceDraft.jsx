import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectFromParams } from '../hooks/useProjectFromParams';
import { useTimeTracking } from '../hooks/useTimeTracking';
import {
  buildSuggestedLineItems,
  computeTotals,
  generateInvoiceNumber,
  getInvoice,
  loadDefaultHourlyRate,
  newId,
  slugEmail,
  upsertInvoice,
} from '../utils/invoiceStorage';
import { formatShortDate } from '../utils/dashboard';

const fieldShell = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function addDaysISO(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function InvoicePreviewBody({
  invoiceNumber,
  invoiceDateLabel,
  dueDateLabel,
  projectName,
  clientName,
  clientEmail,
  freelancerName,
  freelancerEmail,
  lineItems,
  subtotal,
  taxPercent,
  taxAmount,
  total,
  notes,
}) {
  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

  return (
    <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>INVOICE</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>FreelanceOS</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>
            Invoice
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{invoiceNumber}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>{projectName}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--color-text-3)' }}>Date </span>
            {invoiceDateLabel}
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ color: 'var(--color-text-3)' }}>Due </span>
            {dueDateLabel}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>From</div>
          <div style={{ fontWeight: 700 }}>{freelancerName}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{freelancerEmail}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>Bill to</div>
          <div style={{ fontWeight: 700 }}>{clientName}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{clientEmail}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <th style={{ padding: '8px 8px 8px 0' }}>Description</th>
            <th style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>Qty / hrs</th>
            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Rate</th>
            <th style={{ padding: '8px 0 8px 8px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li) => (
            <tr key={li.id} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 8px 10px 0', verticalAlign: 'top' }}>
                {li.description}
                {li.kind === 'change_order' ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#92400e',
                      background: '#fef3c7',
                      padding: '2px 6px',
                      borderRadius: 6,
                    }}
                  >
                    Change order
                  </span>
                ) : null}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{li.hoursOrQty}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(li.rate)}</td>
              <td style={{ padding: '10px 0 10px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(li.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, fontSize: 13 }}>
        <div>
          <span style={{ color: 'var(--color-text-3)' }}>Subtotal </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(subtotal)}</span>
        </div>
        {taxPercent != null && taxPercent !== '' && Number(taxPercent) > 0 ? (
          <div>
            <span style={{ color: 'var(--color-text-3)' }}>Tax ({taxPercent}%) </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(taxAmount)}</span>
          </div>
        ) : null}
        <div style={{ fontSize: 16, fontWeight: 800 }}>
          <span style={{ color: 'var(--color-text-3)' }}>Total </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
        </div>
      </div>

      {notes?.trim() ? (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Notes & terms</div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--color-text-2)' }}>{notes}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function InvoiceDraft() {
  const navigate = useNavigate();
  const { projectId, project, loading, projectName } = useProjectFromParams();
  const { entries } = useTimeTracking();
  const invoiceIdRef = useRef(newId());

  const clientNameDefault = project?.client_name ?? project?.clientName ?? 'Client';
  const clientEmailDefault = slugEmail(clientNameDefault);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => addDaysISO(new Date().toISOString().slice(0, 10), 14));
  const [clientName, setClientName] = useState(clientNameDefault);
  const [clientEmail, setClientEmail] = useState(clientEmailDefault);
  const [freelancerName, setFreelancerName] = useState('Your Name');
  const [freelancerEmail, setFreelancerEmail] = useState('you@example.com');
  const [lineItems, setLineItems] = useState([]);
  const [taxPercent, setTaxPercent] = useState('');
  const [notes, setNotes] = useState('Payment due within 14 days of invoice date. Thank you for your business.');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [formReady, setFormReady] = useState(false);
  const [readOnlyDoc, setReadOnlyDoc] = useState(true);
  const createdAtRef = useRef(new Date().toISOString());

  const initialized = useRef(false);

  useEffect(() => {
    if (loading || !projectId || initialized.current) return;
    initialized.current = true;
    setInvoiceNumber(generateInvoiceNumber());
    setClientName(project?.client_name ?? project?.clientName ?? 'Client');
    setClientEmail(slugEmail(project?.client_name ?? project?.clientName ?? 'Client'));
    const suggested = buildSuggestedLineItems(projectId, projectName, entries ?? []);
    setLineItems(suggested.length ? suggested : [
      {
        id: newId(),
        description: `Professional services — ${projectName}`,
        kind: 'service',
        hoursOrQty: 1,
        rate: loadDefaultHourlyRate(),
        total: loadDefaultHourlyRate(),
      },
    ]);
    setFormReady(true);
  }, [loading, projectId, project, projectName, entries]);

  const { subtotal, tax: taxAmount, total } = useMemo(
    () => computeTotals(lineItems, taxPercent),
    [lineItems, taxPercent],
  );

  const invoiceDateLabel = useMemo(() => {
    try {
      return formatShortDate(new Date(`${invoiceDate}T12:00:00`));
    } catch {
      return invoiceDate;
    }
  }, [invoiceDate]);

  const dueDateLabel = useMemo(() => {
    try {
      return formatShortDate(new Date(`${dueDate}T12:00:00`));
    } catch {
      return dueDate;
    }
  }, [dueDate]);

  const updateLine = useCallback((id, patch) => {
    setLineItems((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        const qty = Number(next.hoursOrQty);
        const rate = Number(next.rate);
        if (patch.hoursOrQty != null || patch.rate != null) {
          const t = (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : Number(next.total)) || 0;
          next.total = Math.round(t * 100) / 100;
        }
        return next;
      }),
    );
  }, []);

  const addLine = useCallback(() => {
    const rate = loadDefaultHourlyRate();
    setLineItems((rows) => [
      ...rows,
      {
        id: newId(),
        description: 'Line item',
        kind: 'service',
        hoursOrQty: 1,
        rate,
        total: rate,
      },
    ]);
  }, []);

  const deleteLine = useCallback((id) => {
    setLineItems((rows) => rows.filter((r) => r.id !== id));
  }, []);

  const buildRecord = useCallback(
    (status, timelinePatch) => {
      const existing = getInvoice(invoiceIdRef.current);
      return {
        id: invoiceIdRef.current,
        invoiceNumber,
        projectId,
        projectName,
        clientName,
        clientEmail,
        freelancerName,
        freelancerEmail,
        invoiceDate,
        dueDate,
        lineItems,
        taxPercent: taxPercent === '' ? null : Number(taxPercent),
        notes,
        status,
        timeline: {
          sentAt: null,
          viewedAt: null,
          paidAt: null,
          ...(existing?.timeline ?? {}),
          ...timelinePatch,
        },
        createdAt: existing?.createdAt ?? createdAtRef.current,
        updatedAt: new Date().toISOString(),
      };
    },
    [invoiceNumber, projectId, projectName, clientName, clientEmail, freelancerName, freelancerEmail, invoiceDate, dueDate, lineItems, taxPercent, notes],
  );

  const saveDraft = () => {
    upsertInvoice(buildRecord('draft', {}));
    setToast('Draft saved.');
    window.setTimeout(() => setToast(''), 2500);
  };

  const sendToClient = () => {
    const sentAt = new Date().toISOString();
    upsertInvoice(
      buildRecord('sent', {
        sentAt,
      }),
    );
    setToast('Invoice sent to client.');
    window.setTimeout(() => setToast(''), 2500);
    navigate('/invoices');
  };

  if (!projectId) {
    return (
      <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>Missing project. Open this screen from a project.</p>
        <Link to="/projects" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Back to projects
        </Link>
      </div>
    );
  }

  const ro = readOnlyDoc;
  const readOnlyBox = {
    ...fieldShell,
    background: ro ? 'var(--color-surface-2)' : 'var(--color-surface)',
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/projects" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
          ← Projects
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '14px 0 6px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Invoice Draft</h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(29, 110, 205, 0.1)',
              color: 'var(--color-primary)',
              letterSpacing: '0.02em',
            }}
          >
            AI-generated from your project
          </span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{loading ? 'Loading…' : projectName}</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0, fontStyle: 'italic' }}>
          Pre-filled from your project chat and time logs
        </p>
      </div>

      {!formReady ? (
        <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>Preparing invoice…</p>
      ) : (
        <>
          {toast ? (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 10,
                background: '#ecfdf5',
                color: '#065f46',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {toast}
            </div>
          ) : null}

          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              background: 'var(--color-surface)',
              padding: '20px 20px 18px',
              boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>INVOICE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>FreelanceOS</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Invoice number</label>
                {ro ? (
                  <div style={readOnlyBox}>{invoiceNumber}</div>
                ) : (
                  <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} style={fieldShell} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Invoice date</label>
                {ro ? (
                  <div style={readOnlyBox}>{invoiceDateLabel}</div>
                ) : (
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={fieldShell} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Due date</label>
                {ro ? (
                  <div style={readOnlyBox}>{dueDateLabel}</div>
                ) : (
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldShell} />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Your name</label>
                {ro ? (
                  <div style={readOnlyBox}>{freelancerName}</div>
                ) : (
                  <input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} style={fieldShell} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Your email</label>
                {ro ? (
                  <div style={readOnlyBox}>{freelancerEmail}</div>
                ) : (
                  <input type="email" value={freelancerEmail} onChange={(e) => setFreelancerEmail(e.target.value)} style={fieldShell} />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Client name</label>
                {ro ? (
                  <div style={readOnlyBox}>{clientName}</div>
                ) : (
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={fieldShell} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Client email</label>
                {ro ? (
                  <div style={readOnlyBox}>{clientEmail}</div>
                ) : (
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} style={fieldShell} />
                )}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: 10 }}>
              Line items
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 700 }}>
                    <th style={{ padding: '8px 8px 8px 0' }}>Description</th>
                    <th style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>Hours / qty</th>
                    <th style={{ padding: '8px 8px' }}>Rate</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right' }}>Total</th>
                    {ro ? null : <th style={{ padding: '8px 0', width: 44 }} />}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} style={{ borderTop: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                      <td style={{ padding: '10px 8px 10px 0' }}>
                        {ro ? (
                          <div style={{ fontSize: 13, lineHeight: 1.45 }}>{li.description}</div>
                        ) : (
                          <input
                            value={li.description}
                            onChange={(e) => updateLine(li.id, { description: e.target.value })}
                            style={{ ...fieldShell, padding: '8px 10px' }}
                          />
                        )}
                        {li.kind === 'change_order' ? (
                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#92400e' }}>Approved change order</div>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {ro ? (
                          <div style={{ ...readOnlyBox, display: 'inline-flex', minHeight: 0 }}>{li.hoursOrQty}</div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={0.25}
                            value={li.hoursOrQty}
                            onChange={(e) => updateLine(li.id, { hoursOrQty: parseFloat(e.target.value) || 0 })}
                            style={{ ...fieldShell, padding: '8px 10px', maxWidth: 100 }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {ro ? (
                          <div style={{ ...readOnlyBox, display: 'inline-flex', minHeight: 0 }}>
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(li.rate ?? 0)}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={li.rate}
                            onChange={(e) => updateLine(li.id, { rate: parseFloat(e.target.value) || 0 })}
                            style={{ ...fieldShell, padding: '8px 10px', maxWidth: 110 }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(li.total ?? 0)}
                      </td>
                      {ro ? null : (
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => deleteLine(li.id)}
                            aria-label="Delete line"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--color-text-3)',
                              cursor: 'pointer',
                              fontSize: 18,
                              lineHeight: 1,
                              padding: 4,
                            }}
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ro ? null : (
              <button
                type="button"
                onClick={addLine}
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px dashed var(--color-border)',
                  background: 'var(--color-surface-2)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                }}
              >
                + Add line item
              </button>
            )}

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-3)' }}>Subtotal </span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(subtotal)}
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <label style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Tax (%)</label>
                {ro ? (
                  <div style={{ ...readOnlyBox, display: 'inline-flex', minWidth: 72 }}>
                    {taxPercent === '' ? '—' : taxPercent}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Optional"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    style={{ ...fieldShell, maxWidth: 100, padding: '8px 10px' }}
                  />
                )}
                {taxPercent !== '' && Number(taxPercent) > 0 ? (
                  <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(taxAmount)}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-3)' }}>Total </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(total)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Notes & terms</label>
              {ro ? (
                <div style={{ ...fieldShell, background: 'var(--color-surface-2)', whiteSpace: 'pre-wrap', minHeight: 96 }}>{notes}</div>
              ) : (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ ...fieldShell, resize: 'vertical', minHeight: 96 }} />
              )}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-3)' }}>
              Created at {formatShortDate(new Date(createdAtRef.current))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setReadOnlyDoc((v) => !v)}
              style={{
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              {ro ? 'Edit' : 'Done'}
            </button>
            <button
              type="button"
              onClick={sendToClient}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
              }}
            >
              Send to Client
            </button>
            <button
              type="button"
              onClick={saveDraft}
              style={{
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              style={{
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              Preview
            </button>
          </div>
        </>
      )}

      {projectId ? (
        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--color-text-3)' }}>
          <Link to={`/projects/${projectId}/change-order`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Change order
          </Link>
          {' · '}
          <Link to="/invoices" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            All invoices
          </Link>
        </div>
      ) : null}

      {previewOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invoice preview"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15,22,35,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewOpen(false)}
        >
          <div
            style={{
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 14,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Client preview</div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: 'var(--color-text-3)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '0 0 16px' }}>This is how your invoice appears to the client before sending.</p>
            <InvoicePreviewBody
              invoiceNumber={invoiceNumber}
              invoiceDateLabel={invoiceDateLabel}
              dueDateLabel={dueDateLabel}
              projectName={projectName}
              clientName={clientName}
              clientEmail={clientEmail}
              freelancerName={freelancerName}
              freelancerEmail={freelancerEmail}
              lineItems={lineItems}
              subtotal={subtotal}
              taxPercent={taxPercent}
              taxAmount={taxAmount}
              total={total}
              notes={notes}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
