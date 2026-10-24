import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { messageAPI } from "../services/api";
import { API_URL } from "../config";
import { SendIcon } from "./Icons";

const DEFAULT_SUGGESTIONS = [
  "Is this still available?",
  "Where can we meet on campus?",
  "Can you do a lower price?",
];

const timeFmt = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function ChatBox({ offerId, receiverId, suggestions = DEFAULT_SUGGESTIONS, className = "" }) {
  const { token, user } = useSelector((s) => s.auth);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const addMessage = useCallback((m) => {
    setMessages((prev) => (m.id != null && prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  // Load history, then keep a live STOMP connection open for new messages
  useEffect(() => {
    let active = true;
    setMessages([]);
    setLoading(true);

    messageAPI
      .getForOffer(offerId)
      .then((res) => {
        if (!active) return;
        setMessages((prev) => {
          const ids = new Set(res.data.map((m) => m.id));
          return [...res.data, ...prev.filter((m) => !ids.has(m.id))];
        });
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/offer/${offerId}`, (frame) => addMessage(JSON.parse(frame.body)));
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;

    return () => {
      active = false;
      client.deactivate();
    };
  }, [offerId, token, addMessage]);

  // Keep the newest message in view
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Grow the input with its content, up to about four lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [text]);

  const send = () => {
    const content = text.trim();
    if (!content || !connected) return;
    clientRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({ offerId, receiverId, content }),
    });
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const pickSuggestion = (s) => {
    setText(s);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate2">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-pine" : "bg-ochre"}`} />
        {connected ? "Live" : "Connecting…"}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-3" aria-live="polite">
        {loading && <p className="py-6 text-center text-sm text-slate2">Loading messages…</p>}

        {!loading && messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate2">No messages yet. Start with a quick question:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm hover:border-stamp hover:text-stamp"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.senderId === user?.id;
          const when = new Date(m.time);
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || new Date(prev.time).toDateString() !== when.toDateString();
          const showTime =
            !next || next.senderId !== m.senderId || new Date(next.time) - when > 5 * 60 * 1000;

          return (
            <div key={m.id ?? `${m.senderId}-${m.time}`} className="animate-fade">
              {newDay && <p className="py-2 text-center text-xs text-slate2">{dayLabel(when)}</p>}
              <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                    mine ? "rounded-br-sm bg-stamp text-white" : "rounded-bl-sm border border-rule bg-white"
                  }`}
                >
                  {m.content}
                </p>
                {showTime && <span className="mt-0.5 px-1 text-xs text-slate2">{timeFmt.format(when)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 border-t border-rule p-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message"
          aria-label="Message"
          className="field max-h-24 resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || !connected}
          aria-label="Send message"
          className="btn-primary h-9 w-9 shrink-0 p-0"
        >
          <SendIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
