"use client";

import * as React from "react";
import {
  ClipboardCheck,
  Activity,
  Send,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface CaretakerDashboardClientProps {
  caretakerName: string;
  initialTasks: any[];
  initialNotes: any[];
  profiles: any[];
}

export function CaretakerDashboardClient({
  caretakerName,
  initialTasks,
  initialNotes,
  profiles,
}: CaretakerDashboardClientProps) {
  const [tasks, setTasks] = React.useState<any[]>(initialTasks);
  const [notes, setNotes] = React.useState<any[]>(initialNotes);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    profiles[0]?.id || ""
  );

  // New Note / Vitals Form state
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteContent, setNoteContent] = React.useState("");
  const [category, setCategory] = React.useState<string>("HEALTH_UPDATE");
  const [bp, setBp] = React.useState("122/80");
  const [pulse, setPulse] = React.useState("74");
  const [sugar, setSugar] = React.useState("114");
  const [temp, setTemp] = React.useState("98.4");
  const [savingNote, setSavingNote] = React.useState(false);
  const [noteSuccess, setNoteSuccess] = React.useState(false);

  // Quick task toggle
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      alert("Failed to update task status");
    }
  };

  // Submit new clinical care note or shift handover
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;
    setSavingNote(true);
    setNoteSuccess(false);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: selectedProfileId,
          category,
          title: noteTitle,
          content: noteContent,
          vitalSigns: {
            bloodPressure: bp || undefined,
            heartRate: pulse ? Number(pulse) : undefined,
            bloodGlucose: sugar ? Number(sugar) : undefined,
            temperature: temp ? Number(temp) : undefined,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        setNoteTitle("");
        setNoteContent("");
        setNoteSuccess(true);
        setTimeout(() => setNoteSuccess(false), 5000);
      }
    } catch {
      alert("Failed to record care note");
    } finally {
      setSavingNote(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center space-x-2">
              <Badge variant="info">Licensed Caretaker Workspace</Badge>
              <span className="text-xs text-slate-500">• Daily Shift Care</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Welcome, {caretakerName}
            </h1>
            <p className="text-xs text-slate-500">
              Manage daily clinical care tasks, log vital signs, and coordinate seamless shift handovers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Assigned Patient:</span>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preferredName || p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Caretaker Action Layout */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Tasks & Check-ins (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="h-5 w-5 text-teal-700" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Today&apos;s Care Tasks ({pendingTasks.length} pending)
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No care tasks currently scheduled.
                </div>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === "COMPLETED";
                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-4 shadow-2xs transition-all flex items-start justify-between ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50/40 opacity-75"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                            isDone
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 hover:border-teal-600"
                          }`}
                        >
                          {isDone && <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-bold ${
                                isDone
                                  ? "line-through text-slate-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {task.title}
                            </span>
                            <Badge
                              variant={
                                task.priority === "URGENT"
                                  ? "urgent"
                                  : task.priority === "HIGH"
                                  ? "warning"
                                  : "secondary"
                              }
                              className="text-[9px]"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                          )}
                          <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>
                              Due:{" "}
                              {new Date(task.dueDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {task.completedAt && (
                              <span className="text-emerald-700 font-semibold">
                                • Completed {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recent Care Notes Stream */}
            <div className="pt-4 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="h-5 w-5 text-teal-700" />
                <span>Recent Observations & Shift Logs</span>
              </h2>

              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {note.title}
                        </span>
                        <Badge variant={note.category === "HANDOVER" ? "default" : "secondary"}>
                          {note.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-[11px]">
                        Logged by {note.author?.name || "Care Staff"} •{" "}
                        {new Date(note.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-2">
                      <p className="text-xs text-slate-700 dark:text-slate-300">{note.content}</p>

                      {note.vitalSigns && Object.keys(note.vitalSigns).length > 0 && (
                        <div className="rounded-lg bg-teal-50/60 p-2.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 dark:bg-slate-800">
                          {note.vitalSigns.bloodPressure && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">BP (mmHg)</span>
                              <strong className="font-bold text-teal-900 dark:text-teal-200">
                                {note.vitalSigns.bloodPressure}
                              </strong>
                            </div>
                          )}
                          {note.vitalSigns.bloodGlucose && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Glucose (mg/dL)</span>
                              <strong className="font-bold text-teal-900 dark:text-teal-200">
                                {note.vitalSigns.bloodGlucose}
                              </strong>
                            </div>
                          )}
                          {note.vitalSigns.heartRate && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                              <strong className="font-bold text-teal-900 dark:text-teal-200">
                                {note.vitalSigns.heartRate} bpm
                              </strong>
                            </div>
                          )}
                          {note.vitalSigns.temperature && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Temp (°F)</span>
                              <strong className="font-bold text-teal-900 dark:text-teal-200">
                                {note.vitalSigns.temperature}°
                              </strong>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Vitals & Shift Handover Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="sticky top-20">
              <CardHeader className="p-5">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-teal-700" />
                  <span>Log Vitals & Care Note</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Record real-time clinical vital signs or create a shift handover for family review.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                {noteSuccess && (
                  <div className="mb-4 rounded-lg bg-emerald-100 p-3 text-xs font-bold text-emerald-800 border border-emerald-300">
                    Care note and vital signs recorded successfully!
                  </div>
                )}

                <form onSubmit={handleSaveNote} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="note-cat">Note Category</Label>
                    <select
                      id="note-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      <option value="HEALTH_UPDATE">Health Update & Vitals</option>
                      <option value="HANDOVER">Shift Handover Note</option>
                      <option value="OBSERVATION">General Clinical Observation</option>
                      <option value="MOOD">Mood & Mobility Check</option>
                      <option value="INCIDENT">Incident / Note of Concern</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="note-title">Title / Summary *</Label>
                    <Input
                      id="note-title"
                      required
                      placeholder="e.g. Afternoon Vitals & Meal Tolerance"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                  </div>

                  {/* Vitals 4-Grid */}
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2 dark:bg-slate-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Vital Signs (Optional)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="v-bp" className="text-[11px]">BP (mmHg)</Label>
                        <Input
                          id="v-bp"
                          placeholder="120/80"
                          value={bp}
                          onChange={(e) => setBp(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="v-sugar" className="text-[11px]">Glucose (mg/dL)</Label>
                        <Input
                          id="v-sugar"
                          type="number"
                          placeholder="110"
                          value={sugar}
                          onChange={(e) => setSugar(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="v-pulse" className="text-[11px]">Heart Rate (bpm)</Label>
                        <Input
                          id="v-pulse"
                          type="number"
                          placeholder="72"
                          value={pulse}
                          onChange={(e) => setPulse(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="v-temp" className="text-[11px]">Temp (°F)</Label>
                        <Input
                          id="v-temp"
                          type="number"
                          step="0.1"
                          placeholder="98.6"
                          value={temp}
                          onChange={(e) => setTemp(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="note-content">Clinical Observation Notes *</Label>
                    <Textarea
                      id="note-content"
                      required
                      rows={3}
                      placeholder="Document patient wellness, hydration, symptoms, appetite, or instructions for the incoming caregiver..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={savingNote}
                    className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs h-10"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {savingNote ? "Recording Note..." : "Publish Care Note"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
