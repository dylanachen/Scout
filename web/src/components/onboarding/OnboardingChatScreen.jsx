import { useState, useEffect, useRef, useCallback } from 'react';
import OnboardingProgress from './OnboardingProgress';
import TypingIndicator from './TypingIndicator';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function AiAvatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      AI
    </div>
  );
}

function interpolateMessage(text, firstName) {
  if (!text) return '';
  return text.replace(/\{\{firstName\}\}/g, firstName || 'there');
}

/**
 * @param {object} props
 * @param {import('../../data/onboardingFlows').OnboardingStep[]} props.steps
 * @param {string} props.storageKey sessionStorage key for answers JSON
 * @param {boolean} [props.showBuildProfileFinale] freelancer: show loading before onComplete
 * @param {string} [props.buildProfileMessage]
 * @param {string} [props.firstName] user's first name for personalized messages
 * @param {(answers: Record<string, string | null>) => void | Promise<void>} props.onComplete
 */
export default function OnboardingChatScreen({
  steps,
  storageKey,
  showBuildProfileFinale = false,
  buildProfileMessage = 'Building your profile…',
  firstName,
  onComplete,
}) {
  const total = steps.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', text: interpolateMessage(steps[0]?.assistantText, firstName) },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [multi, setMulti] = useState([]);
  const [building, setBuilding] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const current = steps[stepIndex];

  const persist = useCallback(
    (answers) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(answers));
      } catch {
        /* ignore quota */
      }
    },
    [storageKey],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, building, scrollToBottom]);

  useEffect(() => {
    const t = current?.inputType;
    if (t === 'text' || t === 'numeric' || t === 'decimal' || t === 'tools') {
      inputRef.current?.focus();
    }
  }, [stepIndex, current?.inputType]);

  const readAnswers = () => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const shouldSkipStep = (step, answers) => {
    if (step.skipIf) {
      for (const [key, val] of Object.entries(step.skipIf)) {
        if (answers[key] === val) return true;
      }
    }
    if (step.showIf && step.conditionalOn) {
      const depAnswer = answers[step.conditionalOn];
      if (!step.showIf.includes(depAnswer)) return true;
    }
    return false;
  };

  const resolveAssistantText = (step, answers) => {
    if (step.conditionalOn && step.conditionalText) {
      const depAnswer = answers[step.conditionalOn];
      if (depAnswer && step.conditionalText[depAnswer]) {
        return step.conditionalText[depAnswer];
      }
    }
    return step.assistantText;
  };

  const finishFlow = async (finalAnswers) => {
    persist(finalAnswers);
    if (showBuildProfileFinale) {
      setBuilding(true);
      await delay(2400);
    }
    await onComplete(finalAnswers);
  };

  const goNext = async (displayText, value) => {
    const prev = readAnswers();
    const nextAnswers = { ...prev, [current.id]: value };
    persist(nextAnswers);
    setMessages((m) => [...m, { role: 'user', text: displayText }]);
    setInput('');
    setMulti([]);
    setShowDatePicker(false);
    setDateValue('');

    if (current.followUp && value === current.followUp.trigger) {
      setTyping(true);
      await delay(750);
      setTyping(false);
      setMessages((m) => [...m, { role: 'assistant', text: current.followUp.text }]);
      await delay(500);
    }

    let nextIdx = stepIndex + 1;
    while (nextIdx < total && shouldSkipStep(steps[nextIdx], nextAnswers)) {
      nextIdx++;
    }

    if (nextIdx >= total) {
      setTyping(true);
      await delay(700);
      setTyping(false);
      await finishFlow(nextAnswers);
      return;
    }

    setTyping(true);
    await delay(750);
    setTyping(false);
    setStepIndex(nextIdx);
    const next = steps[nextIdx];
    const text = resolveAssistantText(next, nextAnswers);
    setMessages((m) => [...m, { role: 'assistant', text: interpolateMessage(text, firstName) }]);
  };

  const handleSkip = async () => {
    await goNext('Skipped', null);
  };

  const handleChip = async (label) => {
    if (typing || building) return;
    if (current.datePickerChip && label === current.datePickerChip) {
      setShowDatePicker(true);
      return;
    }
    await goNext(label, label);
  };

  const handleDateSelect = async () => {
    if (!dateValue) return;
    const formatted = new Date(dateValue + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const display = `Yes, starting ${formatted}`;
    setShowDatePicker(false);
    setDateValue('');
    await goNext(display, display);
  };

  const submitTools = async () => {
    if (typing || building) return;
    const extra = input.trim();
    const parts = [...multi];
    if (extra) parts.push(extra);
    const display = parts.length ? parts.join(', ') : '—';
    const stored = parts.length ? parts.join('; ') : null;
    await goNext(display, stored);
  };

  const submitTextual = async () => {
    if (typing || building) return;
    const raw = input.trim();
    if (!raw && !current?.optional) return;
    const display = raw || 'Skipped';
    const value = raw || null;
    await goNext(display, value);
  };

  const submitNumeric = async () => {
    if (typing || building) return;
    const raw = input.trim();
    if (!raw && !current?.optional) return;
    await goNext(raw, raw);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (current?.inputType === 'tools') submitTools();
      else if (current?.inputType === 'numeric' || current?.inputType === 'decimal') submitNumeric();
      else submitTextual();
    }
  };

  const toggleMulti = (label) => {
    setMulti((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };

  const inputTypeProps = () => {
    if (current?.inputType === 'numeric') return { inputMode: 'numeric', pattern: '[0-9]*' };
    if (current?.inputType === 'decimal') return { inputMode: 'decimal' };
    return {};
  };

  const resolvedChips = (() => {
    if (!current) return [];
    if (current.conditionalOn && current.conditionalChips) {
      const answers = readAnswers();
      const depAnswer = answers[current.conditionalOn];
      if (depAnswer && current.conditionalChips[depAnswer]) {
        return current.conditionalChips[depAnswer];
      }
    }
    return current.chips || [];
  })();
  const hasSkipChip = resolvedChips.includes('Skip');
  const displayChips = resolvedChips.filter((c) => c !== 'Skip');

  const canSendTools = multi.length > 0 || input.trim().length > 0;
  const showComposer = !building && !typing && stepIndex < total;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-2)',
        overflow: 'hidden',
      }}
    >
      <OnboardingProgress currentIndex={stepIndex} total={total} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'user' ? 'fos-slide-in-right' : 'fos-slide-in-left'}
            style={{
              display: 'flex',
              gap: 10,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
            }}
          >
            {msg.role === 'assistant' ? <AiAvatar /> : null}
            <div
              style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.55,
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                borderTopLeftRadius: msg.role === 'user' ? 12 : 4,
                borderTopRightRadius: msg.role === 'user' ? 4 : 12,
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {typing ? <TypingIndicator /> : null}

        {building ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                color: 'var(--color-text-2)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <div className="fos-spinner fos-spinner--on-light" style={{ width: 28, height: 28, borderWidth: 3 }} />
              {buildProfileMessage}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {showComposer && current ? (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(180deg, rgba(246,248,251,0) 0%, var(--color-surface-2) 18%)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {current.optional && !hasSkipChip ? (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-text-3)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Skip
              </button>
            </div>
          ) : null}

          {displayChips.length > 0 && (current.inputType === 'chips' || current.inputType === 'tools' || current.chips?.length) ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 10,
                justifyContent: 'flex-start',
              }}
            >
              {displayChips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => (current.inputType === 'chips' ? handleChip(c) : toggleMulti(c))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: `1px solid ${current.inputType === 'tools' && multi.includes(c) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background:
                      current.inputType === 'tools' && multi.includes(c) ? 'rgba(29, 110, 205, 0.1)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                  }}
                >
                  {c}
                </button>
              ))}
              {hasSkipChip ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px dashed var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text-3)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                  }}
                >
                  Skip
                </button>
              ) : null}
            </div>
          ) : null}

          {showDatePicker ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--color-text)',
                  background: 'var(--color-surface)',
                }}
              />
              <button
                type="button"
                onClick={handleDateSelect}
                disabled={!dateValue}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: dateValue ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: dateValue ? '#fff' : 'var(--color-text-3)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: dateValue ? 'pointer' : 'default',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Confirm
              </button>
            </div>
          ) : null}

          {current.inputType === 'chips' ? null : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 14,
                padding: '10px 12px',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  current.placeholder
                    ? current.placeholder
                    : current.inputType === 'tools'
                      ? 'Add tools (optional)'
                      : current.inputType === 'numeric'
                        ? 'Years…'
                        : current.inputType === 'decimal'
                          ? 'Amount in USD…'
                          : 'Type your answer…'
                }
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
                {...inputTypeProps()}
              />
              <button
                type="button"
                onClick={() => {
                  if (current.inputType === 'tools') submitTools();
                  else if (current.inputType === 'numeric' || current.inputType === 'decimal') submitNumeric();
                  else submitTextual();
                }}
                disabled={
                  current.inputType === 'tools'
                    ? !canSendTools
                    : current.inputType === 'numeric' || current.inputType === 'decimal'
                      ? !input.trim()
                      : !input.trim() && !current.optional
                }
                style={{
                  minWidth: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  padding: current.inputType === 'tools' && canSendTools ? '0 14px' : 0,
                  background:
                    current.inputType === 'tools'
                      ? canSendTools
                        ? 'var(--color-primary)'
                        : 'var(--color-surface-3)'
                      : input.trim() || current.optional
                        ? 'var(--color-primary)'
                        : 'var(--color-surface-3)',
                  cursor:
                    current.inputType === 'tools'
                      ? canSendTools
                        ? 'pointer'
                        : 'default'
                      : input.trim() || current.optional
                        ? 'pointer'
                        : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-label={current.inputType === 'tools' && canSendTools ? 'Done' : 'Send'}
              >
                {current.inputType === 'tools' && canSendTools ? (
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                    Done
                  </span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M12 7L2 2l3 5-3 5 10-5z"
                      fill={
                        current.inputType === 'tools'
                          ? 'var(--color-text-3)'
                          : input.trim() || current.optional
                            ? '#fff'
                            : 'var(--color-text-3)'
                      }
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
