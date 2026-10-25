import { cx } from "@/components/ui";

const tone = { high: "text-critical", medium: "text-high", low: "text-low", none: "text-ink-3" } as const;
const label = { high: "High applicability", medium: "Medium applicability", low: "Low applicability", none: "Not applicable" } as const;

export function ImpactMeter({ score, applicability }: { score: number; applicability: keyof typeof tone }) {
  return (
    <div className="flex items-center gap-2" title={`${label[applicability]} · impact ${score}/100`}>
      <div className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cx("h-3 w-[5px] rounded-[1px]", i < Math.round(score / 10) ? "bg-current" : "bg-rule", tone[applicability])} />
        ))}
      </div>
      <span className="num text-sm">{score}</span>
      <span className="sr-only">{label[applicability]}</span>
    </div>
  );
}

export function ApplicabilityLabel({ value }: { value: keyof typeof tone }) {
  return <span className={cx("text-xs font-semibold tracking-wide uppercase", tone[value])}>{label[value]}</span>;
}
