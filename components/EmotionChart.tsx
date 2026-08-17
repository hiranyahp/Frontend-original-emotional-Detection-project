"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type EmotionPoint = {
  time: string;
  calm: number;
  engaged: number;
  frustrated: number;
};

type EmotionChartProps = {
  data: EmotionPoint[];
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-slate-500">{label}</p>

      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-slate-700 capitalize">
              {entry.dataKey}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmotionChart({ data }: EmotionChartProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xl font-bold text-slate-900">Emotion Trend</h3>

      <div className="h-[340px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#CBD5E1" strokeDasharray="4 4" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#475569", fontSize: 14 }}
              axisLine={{ stroke: "#94A3B8" }}
              tickLine={{ stroke: "#94A3B8" }}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 14 }}
              axisLine={{ stroke: "#94A3B8" }}
              tickLine={{ stroke: "#94A3B8" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                color: "#0F172A",
                fontSize: "14px",
                paddingTop: "10px",
              }}
            />

            <Line
              type="monotone"
              dataKey="calm"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: "#2563EB", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />

            <Line
              type="monotone"
              dataKey="engaged"
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: "#059669", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />

            <Line
              type="monotone"
              dataKey="frustrated"
              stroke="#DC2626"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: "#DC2626", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}