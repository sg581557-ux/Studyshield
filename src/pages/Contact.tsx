import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, MapPin, Send } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/Button";
import { useToast } from "../context/ToastContext";
import { APP } from "../lib/constants";

export function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setForm({ name: "", email: "", subject: "", message: "" });
    toast.success("Message sent. We'll reply within 24 hours.");
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32">
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8">
              <ArrowLeft className="w-4 h-4" /> Back home
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight">Get in touch.</h1>
              <p className="mt-5 text-lg text-slate-400">
                Questions, feedback, partnership ideas, or institute inquiries — we read everything. Expect a reply within one business day.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6 mt-14">
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "Email", value: APP.email },
                  { icon: MapPin, label: "Office", value: "Indiranagar, Bengaluru 560038" },
                  { icon: MessageSquare, label: "Response time", value: "Within 24 hours" },
                ].map((c) => (
                  <div key={c.label} className="card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-600/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
                      <c.icon className="w-5 h-5 text-accent-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{c.label}</div>
                      <div className="text-sm text-white font-medium">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={submit} className="lg:col-span-2 card p-6 lg:p-8 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Your name" required />
                  <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" required />
                </div>
                <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="What's this about?" required />
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    className="w-full bg-ink-850 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 transition-all resize-none"
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send message"}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink-850 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 transition-all"
      />
    </div>
  );
}
