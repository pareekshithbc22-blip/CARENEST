"use client";

import * as React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsSummaryProps {
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
  trendData = [],
  distributionData = [],
  adherencePercentage = 0,
}: AnalyticsSummaryProps) {
  return (
    <div className="space-y-6">
      {/* 7-Day Medication Adherence Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              7-Day Adherence Rate
            </span>
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-black text-teal-700 dark:text-teal-400">
              {adherencePercentage}%
            </span>
            <span className="text-xs font-bold text-slate-500">of doses taken on time</span>
          </div>
        </div>

        {distributionData.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {item.name}
              </span>
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {item.value}
              </span>
              <span className="text-xs font-bold text-slate-500">doses</span>
            </div>
          </div>
        ))}
      </div>

      {/* 7-Day Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Daily Adherence Breakdown
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Day</th>
                <th className="py-2.5 px-3">Taken</th>
                <th className="py-2.5 px-3">Missed</th>
                <th className="py-2.5 px-3">Skipped</th>
                <th className="py-2.5 px-3 text-right">Adherence Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {trendData.map((day, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {day.dayName}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold">
                    {day.taken}
                  </td>
                  <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400 font-bold">
                    {day.missed}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-medium">
                    {day.skipped}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge
                      className={`text-[10px] font-bold ${
                        day.rate >= 80
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : day.rate >= 50
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {day.rate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
