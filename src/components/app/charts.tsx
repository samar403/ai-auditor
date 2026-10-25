"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDate } from "@/lib/format";

type TrendPoint = { week: string; open: number; raised: number; resolved: number; score: number };

const axis = { stroke: "var(--ink-3)", fontSize: 11, tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] border border-rule-strong bg-sheet px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-semibold">Week of {fmtDate(label, { day: "numeric", month: "short" })}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="num text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PostureTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-44" role="img" aria-label={`Posture score over 8 weeks, from ${data[0]?.score} to ${data.at(-1)?.score}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--rule)" />
          <XAxis dataKey="week" {...axis} tickFormatter={(v) => fmtDate(v, { day: "numeric", month: "short" })} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axis} />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--rule-strong)" }} />
          <Line type="monotone" dataKey="score" name="Posture score" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "var(--sheet)" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FlowChart({ data }: { data: TrendPoint[] }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--chart-2)]" /> Raised
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--chart-1)]" /> Resolved
        </span>
      </div>
      <div className="h-40" role="img" aria-label="Issues raised and resolved per week">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--rule)" />
            <XAxis dataKey="week" {...axis} tickFormatter={(v) => fmtDate(v, { day: "numeric", month: "short" })} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--paper-2)" }} />
            <Bar dataKey="raised" name="Raised" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Bar dataKey="resolved" name="Resolved" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
