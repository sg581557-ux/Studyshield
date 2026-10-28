import { memo, useMemo } from "react";
import {
  Copy, Image as ImageIcon, RotateCcw, Share2, ThumbsDown, ThumbsUp, Volume2, VolumeX,
} from "lucide-react";
import { Markdown } from "../Markdown";
import { getSessionImage, splitImageMarkers } from "../../lib/imageUtils";
import { cn } from "../../lib/utils";
import type { MentorChatMessage } from "../../services/mentor";
import { EchoAvatar } from "./EchoAvatar";

export type MessageFeedback = "like" | "dislike";

function UploadedImage({ id, onOpen }: { id: string; onOpen: (src: string) => void }) {
  const entry = getSessionImage(id);
  if (!entry) {
    return (
      <div className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
        <ImageIcon className="h-4 w-4 shrink-0 text-accent-400" />
        Uploaded Image
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.dataUrl)}
      aria-label="View uploaded image"
      className="group relative block overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-accent-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <img
        src={entry.dataUrl}
        alt="Uploaded question image"
        loading="lazy"
        className="max-h-56 w-auto max-w-full rounded-xl bg-ink-950 object-contain"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
        Click to view
      </span>
    </button>
  );
}

function MessageContent({ content, onOpenImage }: { content: string; onOpenImage: (src: string) => void }) {
  const segments = useMemo(() => splitImageMarkers(content), [content]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "image" && seg.id ? (
          <UploadedImage key={i} id={seg.id} onOpen={onOpenImage} />
        ) : (
          <Markdown key={i} text={seg.text ?? ""} className="text-[15px] leading-7 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2" />
        ),
      )}
    </>
  );
}

export function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-7 w-7 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse" />
        <span className="relative flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400 [animation-delay:240ms]" />
        </span>
      </span>
      <span className="text-[13px] font-medium tracking-wide text-slate-200 animate-pulse">{label}</span>
    </div>
  );
}

function ActionButton({
  title, onClick, active = false, children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-zinc-500 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white hover:scale-105 active:scale-95",
        active && "border-accent-500/30 bg-accent-500/15 text-accent-400 hover:border-accent-500/40 hover:text-accent-300",
      )}
    >
      {children}
    </button>
  );
}

interface ChatMessageProps {
  msg: MentorChatMessage;
  index: number;
  time?: string;
  streaming?: boolean;
  feedback?: MessageFeedback | null;
  speaking?: boolean;
  onOpenImage: (src: string) => void;
  onCopy: (content: string) => void;
  onRegenerate: (index: number) => void;
  onReadAloud: (index: number, content: string) => void;
  onFeedback: (index: number, feedback: MessageFeedback) => void;
  onShare: (index: number, content: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  msg, index, time, streaming = false, feedback = null, speaking = false,
  onOpenImage, onCopy, onRegenerate, onReadAloud, onFeedback, onShare,
}: ChatMessageProps) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex min-w-0 max-w-[88%] flex-col items-end gap-1 sm:gap-1.5 md:max-w-[74%]">
          <div className="group relative overflow-hidden rounded-[18px] sm:rounded-[20px] rounded-br-md bg-gradient-to-br from-accent-600 via-accent-600 to-violet-600 px-3 sm:px-4 py-2.5 sm:py-3 text-white shadow-[0_8px_24px_rgba(29,150,245,0.22),0_1px_0_rgba(255,255,255,0.15)_inset] md:px-5 md:py-3.5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <MessageContent content={msg.content} onOpenImage={onOpenImage} />
            </div>
          </div>
          {time && <span className="mr-1 text-[10px] font-medium tracking-wide text-zinc-500">{time}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="flex min-w-0 max-w-full flex-col items-start gap-1 sm:gap-1.5 md:max-w-[82%]">
        <div className="flex w-full gap-2 sm:gap-3">
          <div className="mt-0.5 shrink-0 hidden sm:block">
            <EchoAvatar variant="message" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn(
              "relative overflow-hidden rounded-[18px] sm:rounded-[20px] rounded-tl-md border border-white/[0.06] bg-[#0f0f10]/80 backdrop-blur-xl px-3 sm:px-4 py-3 sm:py-3.5 text-[14px] sm:text-[15px] leading-6 sm:leading-7 text-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.24),0_1px_0_rgba(255,255,255,0.04)_inset] md:px-5 md:py-4",
              streaming && "chat-caret"
            )}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
              <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full bg-gradient-to-br from-accent-500/10 to-violet-500/10 blur-2xl pointer-events-none" />
              <div className="relative">
                <MessageContent content={msg.content} onOpenImage={onOpenImage} />
              </div>
            </div>
            {time && <span className="ml-1 mt-1 block text-[10px] font-medium tracking-wide text-zinc-500">{time}</span>}
            {!streaming && (
              <div className="mt-2 flex flex-wrap items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] px-1 py-1 backdrop-blur w-fit transition-all md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <ActionButton title="Copy" onClick={() => onCopy(msg.content)}>
                  <Copy className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title="Regenerate" onClick={() => onRegenerate(index)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title={speaking ? "Stop reading" : "Read aloud"} active={speaking} onClick={() => onReadAloud(index, msg.content)}>
                  {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </ActionButton>
                <span className="mx-1 h-4 w-px bg-white/10" />
                <ActionButton title="Like" active={feedback === "like"} onClick={() => onFeedback(index, "like")}>
                  <ThumbsUp className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title="Dislike" active={feedback === "dislike"} onClick={() => onFeedback(index, "dislike")}>
                  <ThumbsDown className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title="Share" onClick={() => onShare(index, msg.content)}>
                  <Share2 className="h-3.5 w-3.5" />
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
