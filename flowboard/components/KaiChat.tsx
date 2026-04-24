"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { I } from "./Icons";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export function KaiChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Merhaba! 👋 Ben **KAI**, FlowBoard asistanınım. Board'larınız hakkında sorular sorabilir, task oluşturabilir veya uygulama hakkında bilgi alabilirsiniz.\n\nSize nasıl yardımcı olabilirim?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Extract board ID from path
  const boardIdMatch = pathname.match(/^\/board\/([\w-]+)/);
  const activeBoardId = boardIdMatch ? boardIdMatch[1] : undefined;

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build history for API
      const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/kai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          activeBoardId,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "model",
            text: `⚠️ ${data.error}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "model",
            text: data.reply,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: "⚠️ Bağlantı hatası. Lütfen tekrar deneyin.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeBoardId]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="kai-backdrop"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`kai-panel ${open ? "kai-panel-open" : ""}`}>
        {/* Header */}
        <div className="kai-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="kai-avatar">
              <span className="kai-avatar-text">KAI</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.02em" }}>KAI</div>
              <div style={{ fontSize: 11, color: "var(--ink-4)", fontWeight: 400 }}>
                FlowBoard Asistan
              </div>
            </div>
          </div>
          <button className="kai-close" onClick={onClose} aria-label="Close KAI">
            {I.x}
          </button>
        </div>

        {/* Messages */}
        <div className="kai-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`kai-msg ${msg.role === "user" ? "kai-msg-user" : "kai-msg-bot"}`}
            >
              {msg.role === "model" && (
                <div className="kai-msg-avatar">
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".04em" }}>KAI</span>
                </div>
              )}
              <div
                className={`kai-msg-bubble ${
                  msg.role === "user" ? "kai-msg-bubble-user" : "kai-msg-bubble-bot"
                }`}
              >
                <div
                  className="kai-msg-text"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                />
                <div className="kai-msg-time">
                  {msg.timestamp.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="kai-msg kai-msg-bot">
              <div className="kai-msg-avatar">
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".04em" }}>KAI</span>
              </div>
              <div className="kai-msg-bubble kai-msg-bubble-bot">
                <div className="kai-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="kai-input-area">
          <input
            ref={inputRef}
            type="text"
            className="kai-input"
            placeholder="KAI'ya bir şey sor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={loading}
          />
          <button
            className="kai-send"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Gönder"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// Simple markdown-like formatting
function formatMessage(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:var(--surface-2);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>')
    .replace(/\n/g, "<br />");
}
