"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Heart,
  Bell,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNavButton } from "@/demo/demo-dialog";

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

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [newToast, setNewToast] = React.useState<NotificationItem | null>(null);
  const [browserNotifEnabled, setBrowserNotifEnabled] = React.useState(false);
  const previousUnreadIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotifEnabled(permission === "granted");
    }
  };

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const incoming: NotificationItem[] = data.notifications || [];
        setNotifications(incoming);
        setUnreadCount(data.unreadCount || 0);

        // Detect new unread items for in-app toast & browser notification
        const unreadItems = incoming.filter((n) => !n.isRead);
        for (const item of unreadItems) {
          if (!previousUnreadIds.current.has(item.id)) {
            previousUnreadIds.current.add(item.id);
            // Trigger in-app toast
            setNewToast(item);
            setTimeout(() => setNewToast(null), 5000);

            // Trigger system browser notification if enabled
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(item.title, {
                  body: item.message,
                });
              } catch (e) {
                console.warn("Notification error", e);
              }
            }
          }
        }
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
        {session ? (
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
            ) : userRole === "ADMIN" ? (
              <>
                <Link
                  href="/dashboard/admin/verifications"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/dashboard/admin")
                      ? "bg-teal-50 text-teal-800 font-semibold dark:bg-teal-950 dark:text-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                  }`}
                >
                  License Verifications
                </Link>
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
              </>
            )}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Link href="/#about" className="hover:text-teal-700 transition-colors">
              About
            </Link>
            <Link href="/#features" className="hover:text-teal-700 transition-colors">
              Features
            </Link>
            <Link href="/#help" className="hover:text-teal-700 transition-colors">
              Help
            </Link>
            <Link href="/#contact" className="hover:text-teal-700 transition-colors">
              Contact
            </Link>
          </nav>
        )}

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
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
                    {!browserNotifEnabled && (
                      <button
                        type="button"
                        onClick={requestBrowserPermission}
                        className="text-[10px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
                      >
                        Enable Browser Alerts
                      </button>
                    )}
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
              <DemoNavButton />
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

      {/* Floating In-App Toast for New Incoming Alerts */}
      {newToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl bg-slate-900 text-white p-4 shadow-2xl border border-teal-500/40 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping" />
              <h4 className="font-extrabold text-xs text-teal-300 uppercase tracking-wider">
                {newToast.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setNewToast(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-200">{newToast.message}</p>
        </div>
      )}
    </header>
  );
}
