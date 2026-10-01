import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { shortDate } from '@/utils/date';

const TICK = { fill: 'var(--muted)', fontSize: 12 };

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text)',
  fontSize: 13,
};

export function SkillRadar({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="label" tick={TICK} />
          <PolarRadiusAxis domain={[0, 1000]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.28} strokeWidth={2} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface LinePoint {
  date: string;
  value: number | null;
}

export function ScoreLine({
  data,
  color = 'var(--accent)',
  height = 220,
  label,
  domain = [0, 1000],
  unit = '',
}: {
  data: LinePoint[];
  color?: string;
  height?: number;
  label: string;
  domain?: [number, number];
  unit?: string;
}) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={TICK} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
          <YAxis domain={domain} tick={TICK} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v) => [`${v}${unit}`, 'Skor']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
