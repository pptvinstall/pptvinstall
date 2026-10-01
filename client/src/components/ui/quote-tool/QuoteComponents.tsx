import { cn } from "@/lib/utils";

// ─── Speech Recognition Types ───────────────────────────────────────────────

export type SpeechRecognitionAlternativeLike = { transcript: string };
export type SpeechRecognitionResultLike = { 0: SpeechRecognitionAlternativeLike };
export type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
export type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};
export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
export type MicrophonePermissionState =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "unknown";

export type TurnstileInstance = {
  render: (
    container: string | HTMLElement,
    options: Record<string, unknown>,
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    turnstile?: TurnstileInstance;
  }
}

// ─── Reusable UI Primitives ──────────────────────────────────────────────────

export function SelectorButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
        selected
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ToggleCard({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600",
      )}
    >
      {title}
    </button>
  );
}
