"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsChartsProps {
  trendData: Array<{
    dayName: string;
    taken: number;
    missed: number;
    skipped: number;
    rate: number;
  }>;
  distributionData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  adherencePercentage: number;
}

export function AnalyticsCharts({
  trendData,
  distributionData,
  adherencePercentage,
}: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 7-Day Adherence Trend */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              7-Day Medication Adherence Trend
            </h3>
            <p className="text-xs text-slate-500">
              Taken vs Missed doses recorded from actual database logs
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Overall Rate:</span>
            <span className="text-lg font-black text-teal-700 dark:text-teal-400">
              {adherencePercentage}%
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="dayName" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Bar dataKey="taken" name="Taken" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed" name="Missed" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="skipped" name="Skipped" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dose Status Distribution Pie Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Dose Status Distribution
          </h3>
          <p className="text-xs text-slate-500 mb-2">14-day cumulative proportion</p>
        </div>

        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {distributionData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
