import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2 } from "lucide-react";
import { Button } from "../ui";
import { cropImage } from "../../lib/imageUtils";
import { cn } from "../../lib/utils";

const ASPECTS: { label: string; value: number }[] = [
  { label: "Free", value: 0 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

interface CropDialogProps {
  src: string;
  alt?: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

/**
 * Modal crop/zoom/rotate editor built on react-easy-crop.
 * Keyboard accessible (Esc closes, arrow keys nudge the crop area,
 * buttons for zoom/rotate/aspect). Produces the cropped image on the
 * client only — nothing is uploaded until the user hits Solve.
 */
export default function CropDialog({ src, alt, onCancel, onSave }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(0); // 0 = free-form
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  const onMediaLoaded = useCallback((size: MediaSize) => {
    setMediaSize(size);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSave = async () => {
    if (!pixels || saving) return;
    setSaving(true);
    try {
      const out = await cropImage(src, pixels, rotation);
      onSave(out);
    } catch (err) {
      console.error("[CropDialog] crop failed", err);
      onSave(src); // fall back to the uncropped image — never block the user
    }
  };

  // "Free" mode uses the image's own proportions so the crop box starts
  // covering the whole image (react-easy-crop requires a numeric aspect).
  const freeAspect = mediaSize && mediaSize.naturalWidth > 0 && mediaSize.naturalHeight > 0
    ? mediaSize.naturalWidth / mediaSize.naturalHeight
    : 4 / 3;
  const aspectValue = aspect === 0 ? freeAspect : ASPECTS.find((a) => a.value === aspect)?.value ?? 4 / 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Crop and zoom image">
      <div className="bg-ink-900 border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Crop &amp; zoom image</h2>
          <button ref={closeRef} onClick={onCancel} aria-label="Close crop editor" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-[45vh] min-h-56 w-full bg-ink-950">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectValue}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            objectFit="contain"
            zoomWithScroll
          />
        </div>

        <div className="px-4 py-3 border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 w-16 shrink-0">Zoom</span>
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label="Zoom out" className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-white/10">
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom level"
              className="flex-1 min-w-24 accent-accent-500"
            />
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} aria-label="Zoom in" className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-white/10">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setRotation((r) => r + 90)} aria-label="Rotate image 90 degrees" className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-white/10">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 w-16 shrink-0">Aspect</span>
            <div className="flex flex-wrap gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => setAspect(a.value)}
                  aria-pressed={aspect === a.value}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg border transition-colors",
                    aspect === a.value
                      ? "bg-accent-600 border-accent-500 text-white"
                      : "border-white/10 text-slate-300 hover:bg-white/5",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!pixels || saving} loading={saving}>
              {saving ? null : <Check className="w-4 h-4" />}
              Apply crop
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">{alt ? `Source: ${alt}` : "Tip: scroll or pinch to zoom inside the box."}</p>
        </div>
      </div>
      {saving && <Loader2 className="absolute bottom-6 right-6 w-5 h-5 animate-spin text-accent-400" aria-hidden />}
    </div>
  );
}
