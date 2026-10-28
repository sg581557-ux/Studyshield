import { CrazyFullPageLoader, CrazyInlineLoader } from "./loaders/AestheticLoader";

export function FullPageLoader({ message = "Loading…" }: { message?: string }) {
  return <CrazyFullPageLoader message={message} />;
}
export function InlineLoader({ message }: { message?: string }) {
  return <CrazyInlineLoader message={message} />;
}
