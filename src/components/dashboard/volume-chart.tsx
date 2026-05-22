"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function VolumeChart({
  data,
}: {
  data: { week: string; volume: number; workouts: number }[];
}) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <BarChart data={data}>
        <XAxis dataKey="week" tick={{ fontSize: 13 }} />
        <YAxis tick={{ fontSize: 13 }} />
        <Tooltip />
        <Bar
          dataKey="volume"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
