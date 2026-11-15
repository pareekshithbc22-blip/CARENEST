"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Heart,
  Bell,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Navbar({
  activeProfileId,
  onProfileChange,
  availableProfiles = [],
}: {
  activeProfileId?: string;
  onProfileChange?: (id: string) => void;
  availableProfiles?: Array<{ id: string; name: string; preferredName?: string | null }>;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showDemoMenu, setShowDemoMenu] = React.useState(false);
  const [isSwitching, setIsSwitching] = React.useState(false);

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // quiet fail on network transient
    }
  }, [session]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  // Instant demo role switch
  const handleDemoSwitch = async (email: string) => {
    setIsSwitching(true);
    setShowDemoMenu(false);
    await signIn("credentials", {
      email,
      password: "CareNest2026!",
      redirect: false,
    });
    setIsSwitching(false);
    router.refresh();
  };

  const userRole = session?.user?.role || "GUEST";
  const isSenior = userRole === "SENIOR";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Tagline */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md shadow-teal-700/20 group-hover:bg-teal-800 transition-colors">
              <Heart className="h-5 w-5 fill-white/20 stroke-white stroke-2" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  CARE<span className="text-teal-700 dark:text-teal-400">NEST</span>
                </span>
                <span className="hidden sm:inline-block rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                  HEALTHCARE
                </span>
              </div>
              <p className="hidden md:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                One connected circle of care
              </p>
            </div>
          </Link>

          {/* Elderly Profile Switcher (Multiple Profiles support) */}
          {availableProfiles.length > 0 && onProfileChange && (
            <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-400 mr-2">Loved One:</span>
              <div className="relative inline-block">
                <select
                  value={activeProfileId || availableProfiles[0]?.id}
                  onChange={(e) => onProfileChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {availableProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.preferredName || p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Central Navigation Links */}
        {session && (
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {isSenior ? (
              <>
                <Link
                  href="/dashboard/senior"
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    pathname.startsWith("/dashboard/senior")
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                  }`}
                >
                  My Daily Schedule
                </Link>
                <Link
                  href="/dashboard/senior#emergency"
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                >
                  Help & Contacts
                </Link>
              </>
            ) : userRole === "CARETAKER" ? (
              <>
                <Link
                  href="/dashboard/caretaker"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/dashboard/caretaker"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                  }`}
                >
                  Daily Tasks & Check-ins
                </Link>
                <Link
                  href="/dashboard/family"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                >
                  Circle Records
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/family"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/dashboard/family"
                      ? "bg-teal-50 text-teal-800 font-semibold dark:bg-teal-950 dark:text-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                  }`}
                >
                  Family Overview
                </Link>
                <Link
                  href="/dashboard/senior"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-teal-700 hover:bg-slate-50 dark:text-slate-400"
                >
                  Senior Mode View
                </Link>
                <Link
                  href="/dashboard/caretaker"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-teal-700 hover:bg-slate-50 dark:text-slate-400"
                >
                  Caretaker View
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Hackathon Evaluator Quick Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center space-x-1.5 rounded-lg border border-amber-300 bg-amber-50/90 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              title="Quickly switch between Eleanor (Senior), Sarah (Family), or Marcus (Caretaker)"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden sm:inline">Role Switcher</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in">
                <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Select Perspective (Instant Login)
                </div>
                <button
                  disabled={isSwitching}
                  onClick={() => handleDemoSwitch("eleanor.vance@carenest.org")}
                  className="w-full text-left rounded-lg p-2 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Eleanor Vance</div>
                    <div className="text-[11px] text-teal-700 font-medium">Senior Patient (Senior Mode)</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">PIN: 1234</Badge>
                </button>
                <button
                  disabled={isSwitching}
                  onClick={() => handleDemoSwitch("sarah.vance@carenest.org")}
                  className="w-full text-left rounded-lg p-2 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Sarah Vance</div>
                    <div className="text-[11px] text-slate-500">Family Admin & Daughter</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                </button>
                <button
                  disabled={isSwitching}
                  onClick={() => handleDemoSwitch("marcus.reed@carenest.org")}
                  className="w-full text-left rounded-lg p-2 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Marcus Reed, RN</div>
                    <div className="text-[11px] text-sky-700 font-medium">Licensed Caretaker / Nurse</div>
                  </div>
                  <Badge variant="info" className="text-[10px]">Caretaker</Badge>
                </button>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          {session && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      Notifications ({unreadCount} new)
                    </span>
                    <span className="text-xs text-slate-400">Proactive Care Alerts</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No notifications at this time
                      </p>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleMarkAsRead(item.id)}
                          className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            !item.isRead
                              ? "bg-slate-50 dark:bg-slate-800/60 font-medium"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.title}
                            </span>
                            {!item.isRead && (
                              <span className="h-2 w-2 rounded-full bg-teal-600" />
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile / Auth State */}
          {session?.user ? (
            <div className="flex items-center space-x-2 pl-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {session.user.name}
                </div>
                <div className="text-[10px] font-medium text-slate-500 uppercase">
                  {session.user.role}
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
