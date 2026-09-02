import { Crop, Image as ImageIcon, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../ui";

export interface PendingImage {
  id: string;
  dataUrl: string;
  fileName: string;
}

interface ImagePreviewPanelProps {
  image: PendingImage;
  preparing: boolean;
  onCropZoom: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onSolve: () => void;
}

/**
 * Preview panel shown above the composer while an image is attached but
 * NOT yet sent. The user can zoom/crop, replace, remove — and only then
 * press "Solve Question".
 */
export default function ImagePreviewPanel({
  image,
  preparing,
  onCropZoom,
  onReplace,
  onRemove,
  onSolve,
}: ImagePreviewPanelProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border border-white/10 rounded-xl bg-ink-800/60 p-3" role="group" aria-label="Attached image preview">
      <img
        src={image.dataUrl}
        alt="Selected question image"
        className="max-h-44 w-full sm:w-32 sm:max-h-32 object-contain rounded-lg border border-white/10 bg-ink-950 shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <p className="text-xs text-slate-400 truncate" title={image.fileName}>
          <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-accent-400 align-[-2px]" />
          {image.fileName || "Captured image"}
        </p>
        <p className="text-[11px] text-slate-500">JPG / PNG / WEBP · max 10 MB · sent only when you solve</p>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={onCropZoom} aria-label="Zoom or crop image">
            <Crop className="w-3.5 h-3.5" /> Zoom &amp; crop
          </Button>
          <Button variant="outline" size="sm" onClick={onReplace} aria-label="Replace image">
            <RefreshCw className="w-3.5 h-3.5" /> Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove image" className="text-danger-300 hover:text-danger-200">
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </Button>
        </div>
      </div>
      <div className="flex sm:flex-col items-center gap-2 sm:items-end sm:gap-1.5 shrink-0">
        <Button variant="primary" size="sm" onClick={onSolve} disabled={preparing} loading={preparing} className="w-full sm:w-auto">
          {preparing ? null : <Sparkles className="w-4 h-4" />}
          {preparing ? "Uploading image…" : "Solve Question"}
        </Button>
      </div>
    </div>
  );
}
