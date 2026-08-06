"use client";

import { Button } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type ChatStep = "closed" | "intro" | "form" | "chat";

export function ChatWidget() {
  const [step, setStep] = useState<ChatStep>("closed");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === "closed") setStep("intro");
    }, 20000);
    return () => clearTimeout(timer);
  }, [step]);

  const handleLeadSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep("chat");
    setMessages([
      {
        role: "bot",
        text: "Thanks! I'm here to help you understand escrow. What would you like to know?",
      },
    ]);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: message },
      {
        role: "bot",
        text: "Great question! Our team can provide detailed answers. Would you like to book a free escrow audit?",
      },
    ]);
    setMessage("");
  };

  const isOpen = step !== "closed";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-primary px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">EXCRO Support</p>
                  <p className="text-xs text-blue-100">Typically replies instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("closed")}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-5">
              {step === "intro" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-lg font-semibold text-foreground">👋 Hi!</p>
                  <p className="mt-2 text-sm text-muted">
                    Need help understanding escrow? We&apos;re here to help you get started.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="mt-4 w-full"
                    onClick={() => setStep("form")}
                  >
                    Start Conversation
                  </Button>
                </motion.div>
              )}

              {step === "form" && (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleLeadSubmit}
                  className="space-y-3"
                >
                  <p className="mb-4 text-sm text-muted">
                    Before we chat, tell us a bit about yourself:
                  </p>
                  {[
                    { name: "name", label: "Name", type: "text", placeholder: "Your name" },
                    { name: "email", label: "Email", type: "email", placeholder: "you@company.com" },
                    { name: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
                    { name: "company", label: "Company", type: "text", placeholder: "Company name" },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        {field.label}
                      </label>
                      <input
                        name={field.name}
                        type={field.type}
                        required
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                  <Button type="submit" variant="primary" size="md" className="w-full">
                    Continue to Chat
                  </Button>
                </motion.form>
              )}

              {step === "chat" && (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-foreground"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {step === "chat" && (
              <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-4">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setStep(step === "closed" ? "intro" : "closed")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </>
  );
}
