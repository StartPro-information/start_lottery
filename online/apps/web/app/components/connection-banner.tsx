"use client";

import { useEffect, useState } from "react";

export default function ConnectionBanner({ className }: { className?: string }) {
  const [online, setOnline] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      setShowRecovery(true);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowRecovery(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!showRecovery) return;
    const timer = window.setTimeout(() => {
      setShowRecovery(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [showRecovery]);

  if (online && !showRecovery) {
    return null;
  }

  const message = online ? "网络已恢复" : "网络已断开，正在重试...";

  return (
    <div className={`connection-banner ${online ? "is-online" : "is-offline"} ${className ?? ""}`}>
      {message}
    </div>
  );
}
