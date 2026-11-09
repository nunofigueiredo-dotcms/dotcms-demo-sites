import { stepTone } from "@/lib/format";

const TONES = {
  neutral: "bg-warm text-ink-soft border-line",
  info: "bg-blue-soft text-blue border-blue/30",
  warning: "bg-amber-soft text-amber border-amber/30",
  success: "bg-green-soft text-green border-green/30",
  danger: "bg-red-soft text-red border-red/30",
  external: "bg-violet-soft text-violet border-violet/30",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** A workflow step as a badge. A Draft that was sent back reads "Sent back". */
export function StepBadge({ step, rejected }: { step?: string; rejected?: boolean }) {
  if (!step) return null;
  if (rejected) return <Badge tone="danger">Sent back · Draft</Badge>;
  return <Badge tone={stepTone(step)}>{step}</Badge>;
}
