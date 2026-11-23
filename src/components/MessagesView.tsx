import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import type { ContactItem, SimSlot, SmsMessage } from '../types/bridge';
import { normalizeDigits, toPersianDigits } from '../lib/otp';

interface MessagesViewProps {
  messages: SmsMessage[];
  contacts: ContactItem[];
  activeOtpBanner: { messageId: string; code: string; issuer: string; simSlot: SimSlot } | null;
  onDismissOtpBanner: () => void;
  onMarkThreadRead: (address: string) => void;
  onSendSms: (address: string, contactName: string, body: string, simSlot: SimSlot) => Promise<void>;
}

type SmsFilter = 'all' | 'otp' | 'sim1' | 'sim2';

function formatRelativeTime(ts: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'هم‌اکنون';
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${toPersianDigits(diffHr)} ساعت پیش`;
  return `${toPersianDigits(Math.floor(diffHr / 24))} روز پیش`;
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${hh}:${mm}`);
}

const DELIVERY_LABELS: Record<SmsMessage['status'], string> = {
  sending: 'در حال ارسال روی پل...',
  sent: 'ارسال شد از اندروید',
  delivered: 'تحویل شد',
  received: 'دریافت‌شده',
  failed: 'خطا در ارسال',
};

export const MessagesView: React.FC<MessagesViewProps> = ({
  messages,
  contacts,
  activeOtpBanner,
  onDismissOtpBanner,
  onMarkThreadRead,
  onSendSms,
}) => {
  const [filter, setFilter] = useState<SmsFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    messages[0]?.address ?? null
  );
  const [replyText, setReplyText] = useState('');
  const [replySim, setReplySim] = useState<SimSlot>(1);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [composingNew, setComposingNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSim, setNewSim] = useState<SimSlot>(1);
  const [newFormError, setNewFormError] = useState<string | null>(null);

  // Group messages into threads ordered by latest message timestamp
  const threads = useMemo(() => {
    const map = new Map<
      string,
      {
        address: string;
        contactName: string;
        latest: SmsMessage;
        unreadCount: number;
        hasOtp: boolean;
        messages: SmsMessage[];
      }
    >();

    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    for (const msg of sorted) {
      const existing = map.get(msg.address);
      if (!existing) {
        map.set(msg.address, {
          address: msg.address,
          contactName: msg.contactName || msg.address,
          latest: msg,
          unreadCount: !msg.read && msg.direction === 'incoming' ? 1 : 0,
          hasOtp: Boolean(msg.otpCode),
          messages: [msg],
        });
      } else {
        existing.messages.push(msg);
        existing.latest = msg;
        if (!msg.read && msg.direction === 'incoming') {
          existing.unreadCount += 1;
        }
        if (msg.otpCode) {
          existing.hasOtp = true;
        }
      }
    }

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((t) => {
        if (filter === 'otp' && !t.hasOtp) return false;
        if (filter === 'sim1' && t.latest.simSlot !== 1) return false;
        if (filter === 'sim2' && t.latest.simSlot !== 2) return false;
        if (q) {
          const hit =
            t.contactName.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q) ||
            t.messages.some((m) => m.body.toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.latest.timestamp - a.latest.timestamp);
  }, [messages, filter, search]);

  const activeThread = useMemo(() => {
    if (!selectedAddress) return threads[0] ?? null;
    return threads.find((t) => t.address === selectedAddress) ?? threads[0] ?? null;
  }, [threads, selectedAddress]);

  const handleCopyOtp = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API may be restricted in headless contexts; still reflect copied UI state
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleSelectThread = (address: string, preferredSim: SimSlot) => {
    setSelectedAddress(address);
    setReplySim(preferredSim);
    setComposingNew(false);
    onMarkThreadRead(address);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError(null);
    if (!activeThread) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError('متن پیامک نمی‌تواند خالی باشد.');
      return;
    }
    setReplyText('');
    await onSendSms(activeThread.address, activeThread.contactName, trimmed, replySim);
  };

  const handleNewSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewFormError(null);
    const cleanedNum = normalizeDigits(newRecipient).replace(/[\s\-()]/g, '');
    if (!/^(?:09\d{9}|\+989\d{9}|0\d{9,10}|\d{4,12})$/.test(cleanedNum)) {
      setNewFormError('شماره گیرنده معتبر وارد کنید (مثلاً 09121184420).');
      return;
    }
    const trimmedBody = newBody.trim();
    if (!trimmedBody) {
      setNewFormError('متن پیامک جدید را وارد کنید.');
      return;
    }
    const matchedContact = contacts.find((c) => c.number === cleanedNum);
    await onSendSms(cleanedNum, matchedContact?.name ?? cleanedNum, trimmedBody, newSim);
    setSelectedAddress(cleanedNum);
    setNewRecipient('');
    setNewBody('');
    setComposingNew(false);
  };

  return (
    <div className="space-y-4">
      {/* Auto-OTP Quick Copy Banner */}
      {activeOtpBanner && (
        <section
          aria-label="رمز پویا آماده کپی"
          data-testid="auto-otp-banner"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4 dark:border-blue-900/70 dark:bg-blue-950/35"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shrink-0">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-medium text-blue-900 dark:text-blue-200">
                رمز پویا تشخیص داده شد · {activeOtpBanner.issuer} · سیم {toPersianDigits(activeOtpBanner.simSlot)}
              </div>
              <div
                dir="ltr"
                data-testid="auto-otp-code"
                className="font-mono-tabular mt-0.5 text-2xl font-bold tracking-[0.18em] text-slate-900 dark:text-white"
              >
                {activeOtpBanner.code}
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => void handleCopyOtp(activeOtpBanner.code)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap sm:flex-initial"
            >
              {copiedCode === activeOtpBanner.code ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>کپی کد</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onDismissOtpBanner}
              aria-label="بستن اعلان رمز پویا"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-blue-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-blue-900/50 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Main Two-Column Inbox + Thread Surface */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Thread List Column */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] lg:col-span-5">
          <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                صندوق پیامک (دوطرفه)
              </h1>
              <button
                type="button"
                onClick={() => setComposingNew(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>پیامک جدید</span>
              </button>
            </div>

            <div className="relative">
              <label htmlFor="sms-search" className="sr-only">
                جستجو در پیامک‌ها و رمزهای پویا
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="sms-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی فرستنده، شماره یا متن پیامک..."
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:bg-slate-900"
              />
            </div>

            <div
              role="group"
              aria-label="فیلتر پیامک‌ها"
              className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90"
            >
              {(
                [
                  { id: 'all', label: 'همه' },
                  { id: 'otp', label: 'رمز پویا' },
                  { id: 'sim1', label: 'سیم ۱' },
                  { id: 'sim2', label: 'سیم ۲' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/80">
            {threads.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  پیامکی با این فیلتر یافت نشد.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  فیلتر را روی «همه» بگذارید یا از پنل میزبان اندروید یک پیامک آزمایشی ارسال کنید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setSearch('');
                  }}
                  className="mt-4 min-h-[40px] rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  نمایش همه پیامک‌ها
                </button>
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = !composingNew && activeThread?.address === thread.address;
                return (
                  <button
                    key={thread.address}
                    type="button"
                    onClick={() => handleSelectThread(thread.address, thread.latest.simSlot)}
                    className={`flex w-full flex-col gap-1.5 px-4 py-3.5 text-right transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {thread.contactName}
                        {thread.unreadCount > 0 && (
                          <span className="mr-1.5 font-mono-tabular text-xs font-bold text-blue-700 dark:text-blue-400">
                            ({toPersianDigits(thread.unreadCount)})
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                        {formatRelativeTime(thread.latest.timestamp)}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {thread.latest.body}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{thread.latest.carrierName}</span>
                      <span aria-hidden="true">·</span>
                      <span>سیم {toPersianDigits(thread.latest.simSlot)}</span>
                      {thread.latest.otpCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                            کد {thread.latest.otpCode}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Conversation or New SMS Composer Column */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] lg:col-span-7">
          {composingNew ? (
            <form onSubmit={(e) => void handleNewSmsSubmit(e)} className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  ارسال پیامک جدید از سیم‌کارت اندروید
                </h2>
                <button
                  type="button"
                  onClick={() => setComposingNew(false)}
                  aria-label="انصراف از پیامک جدید"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 flex-1">
                <div>
                  <label htmlFor="new-sms-recipient" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    شماره موبایل یا مخاطب
                  </label>
                  <input
                    id="new-sms-recipient"
                    type="text"
                    dir="ltr"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="09121184420"
                    className="font-mono-tabular mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {contacts.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setNewRecipient(c.number);
                          setNewSim(c.preferredSim);
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    انتخاب سیم‌کارت ارسال‌کننده
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {([1, 2] as const).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewSim(slot)}
                        className={`min-h-[42px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          newSim === slot
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        سیم {toPersianDigits(slot)} · {slot === 1 ? 'همراه اول' : 'ایرانسل'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="new-sms-body" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    متن پیامک
                  </label>
                  <textarea
                    id="new-sms-body"
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="پیامک خود را بنویسید..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {newFormError && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {newFormError}
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>ارسال رمزنگاری‌شده از سیم {toPersianDigits(newSim)}</span>
                </button>
              </div>
            </form>
          ) : activeThread ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeThread.contactName}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span dir="ltr" className="font-mono-tabular">
                      {activeThread.address}
                    </span>
                    {' · '}
                    <span>{activeThread.latest.carrierName}</span>
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {toPersianDigits(activeThread.messages.length)} پیام در گفتگو
                </div>
              </div>

              <div className="max-h-[380px] flex-1 space-y-3 overflow-y-auto p-5">
                {activeThread.messages.map((msg) => {
                  const isOut = msg.direction === 'outgoing';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-line ${
                          isOut
                            ? 'bg-blue-700 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                        }`}
                      >
                        <p>{msg.body}</p>
                        {msg.otpCode && (
                          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5 dark:border-slate-700">
                            <span dir="ltr" className="font-mono-tabular text-base font-bold tracking-wider text-blue-700 dark:text-blue-400">
                              {msg.otpCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleCopyOtp(msg.otpCode!)}
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-800"
                            >
                              {copiedCode === msg.otpCode ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>کپی شد</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>کپی رمز</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatClock(msg.timestamp)}</span>
                        <span aria-hidden="true">·</span>
                        <span>سیم {toPersianDigits(msg.simSlot)}</span>
                        {isOut && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{DELIVERY_LABELS[msg.status]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => void handleReplySubmit(e)}
                className="border-t border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>ارسال پاسخ با:</span>
                    {([1, 2] as const).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setReplySim(slot)}
                        className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          replySim === slot
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        سیم {toPersianDigits(slot)} ({slot === 1 ? 'همراه اول' : 'ایرانسل'})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="reply-sms-input" className="sr-only">
                    پاسخ به {activeThread.contactName}
                  </label>
                  <input
                    id="reply-sms-input"
                    type="text"
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      if (replyError) setReplyError(null);
                    }}
                    placeholder={`پاسخ به ${activeThread.contactName}...`}
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>ارسال</span>
                  </button>
                </div>
                {replyError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {replyError}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-center text-sm text-slate-500">
              یک گفتگو را از فهرست انتخاب کنید یا پیامک جدید بنویسید.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
