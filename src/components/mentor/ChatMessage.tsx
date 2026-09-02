import { memo, useMemo } from "react";
import {
  Copy, Image as ImageIcon, RotateCcw, Share2, ShieldCheck, ThumbsDown, ThumbsUp, Volume2, VolumeX,
} from "lucide-react";
import { Markdown } from "../Markdown";
import { getSessionImage, splitImageMarkers } from "../../lib/imageUtils";
import { cn } from "../../lib/utils";
import type { MentorChatMessage } from "../../services/mentor";

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
    <div className="flex items-center gap-2.5">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400 [animation-delay:240ms]" />
      </span>
      <span className="text-xs text-slate-400">{label}</span>
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
        "flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200",
        active && "text-accent-400 hover:text-accent-400",
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
        <div className="flex min-w-0 max-w-[85%] flex-col items-end md:max-w-[75%]">
          <div className="chat-user rounded-2xl rounded-tr-md bg-accent-600 px-4 py-2.5 text-white md:px-5 md:py-3">
            <MessageContent content={msg.content} onOpenImage={onOpenImage} />
          </div>
          {time && <span className="mt-1 text-[10px] text-slate-500">{time}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="flex min-w-0 max-w-full flex-col items-start md:max-w-[80%]">
        <div className="flex w-full gap-2.5 md:gap-3">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-600/20">
            <ShieldCheck className="h-4 w-4 text-accent-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("rounded-2xl rounded-tl-md border border-white/5 bg-ink-800 px-4 py-3 text-slate-200 md:px-5 md:py-4", streaming && "chat-caret")}>
              <MessageContent content={msg.content} onOpenImage={onOpenImage} />
            </div>
            {time && <span className="mt-1 block text-[10px] text-slate-500">{time}</span>}
            {!streaming && (
              <div className="mt-1 flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <ActionButton title="Copy" onClick={() => onCopy(msg.content)}>
                  <Copy className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title="Regenerate" onClick={() => onRegenerate(index)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title={speaking ? "Stop reading" : "Read aloud"} active={speaking} onClick={() => onReadAloud(index, msg.content)}>
                  {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </ActionButton>
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
