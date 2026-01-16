"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Participant = {
  id: string;
  displayName: string;
  uniqueKey?: string | null;
  department?: string | null;
  employeeId?: string | null;
  email?: string | null;
  username?: string | null;
  title?: string | null;
  orgPath?: string | null;
  customField?: string | null;
  checkedInAt?: string | null;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

export default function RollingList({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<Participant[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set());
  const [isStale, setIsStale] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>(["display_name"]);
  const [customFieldLabel, setCustomFieldLabel] = useState("自定义字段");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const lastIdsRef = useRef<string[]>([]);
  const recentTimeout = useRef<number | null>(null);
  const retryTimeout = useRef<number | null>(null);
  const failureCount = useRef(0);

  const updateRecent = useCallback((ids: string[]) => {
    if (recentTimeout.current) {
      window.clearTimeout(recentTimeout.current);
    }
    setRecentIds(new Set(ids));
    recentTimeout.current = window.setTimeout(() => {
      setRecentIds(new Set());
    }, 1800);
  }, []);

  const fetchCheckedIn = useCallback(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }
    const res = await fetch(`${getBaseUrl()}/events/${eventId}/participants?status=checkedin`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("fetch checkin failed");
    }
    const data = (await res.json()) as Participant[];
    const sorted = [...data].sort((a, b) => {
      const aTime = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const bTime = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return aTime - bTime;
    });
    const nextIds = sorted.map((item) => item.id);
    const prevIds = lastIdsRef.current;
    if (prevIds.length === nextIds.length && prevIds.every((id, index) => id === nextIds[index])) {
      return;
    }
    const prevSet = new Set(prevIds);
    const newIds = nextIds.filter((id) => !prevSet.has(id));
    lastIdsRef.current = nextIds;
    setItems(sorted);
    if (newIds.length > 0) {
      updateRecent(newIds);
    }
  }, [eventId, updateRecent]);

  useEffect(() => {
    if (!eventId) return;
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }
    fetch(`${getBaseUrl()}/events/${eventId}`, { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.requiredFields) && data.requiredFields.length > 0) {
          setRequiredFields(data.requiredFields);
        }
        if (data?.customFieldLabel) {
          setCustomFieldLabel(data.customFieldLabel);
        }
      })
      .catch(() => null);
  }, [eventId]);

  useEffect(() => {
    let active = true;
    const baseInterval = 4000;
    const maxInterval = 30000;
    const run = async () => {
      try {
        await fetchCheckedIn();
        failureCount.current = 0;
        setIsStale(false);
      } catch {
        failureCount.current += 1;
        setIsStale(true);
      } finally {
        if (!active) return;
        const backoffFactor = Math.min(3, failureCount.current);
        const delay = Math.min(maxInterval, baseInterval * Math.pow(2, backoffFactor));
        retryTimeout.current = window.setTimeout(run, delay);
      }
    };
    run();
    return () => {
      active = false;
      if (retryTimeout.current) {
        window.clearTimeout(retryTimeout.current);
      }
    };
  }, [fetchCheckedIn]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const rowHeight = rowRef.current?.getBoundingClientRect().height ?? 52;
      const height = container.getBoundingClientRect().height;
      const count = Math.max(1, Math.floor(height / rowHeight));
      setVisibleCount(count);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const visibleItems = useMemo(() => {
    if (items.length <= visibleCount) return items;
    return items.slice(-visibleCount);
  }, [items, visibleCount]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [visibleItems]);

  const fieldLabels = useMemo(() => {
    return {
      unique_key: "唯一标识",
      employee_id: "工号",
      email: "邮箱",
      username: "账号",
      department: "部门",
      title: "岗位",
      org_path: "组织路径",
      custom_field: customFieldLabel || "自定义字段",
    } as Record<string, string>;
  }, [customFieldLabel]);

  const displayFields = useMemo(
    () => requiredFields.filter((field) => field !== "display_name"),
    [requiredFields],
  );

  return (
    <div className="rolling rolling--screen" ref={containerRef}>
      {isStale ? <div className="screen-warning">数据更新失败，正在重试...</div> : null}
      {visibleItems.map((item, index) => (
        <div
          className={`rolling-row rolling-row--screen${recentIds.has(item.id) ? " is-new" : ""}`}
          key={item.id}
          ref={index === 0 ? rowRef : undefined}
        >
          <div className="rolling-primary">
            <strong>{item.displayName}</strong>
            <span className="rolling-meta">
              {displayFields.length === 0
                ? "--"
                : displayFields
                    .map((field) => {
                      const valueMap: Record<string, string | null | undefined> = {
                        unique_key: item.uniqueKey,
                        employee_id: item.employeeId,
                        email: item.email,
                        username: item.username,
                        department: item.department,
                        title: item.title,
                        org_path: item.orgPath,
                        custom_field: item.customField,
                      };
                    const label = fieldLabels[field] ?? field;
                    const value = valueMap[field]?.toString().trim();
                      return `${label}：${value || "--"}`;
                    })
                    .join(" · ")}
            </span>
          </div>
          <span className="rolling-time">{formatTime(item.checkedInAt)}</span>
          <span className="rolling-status">已签到</span>
        </div>
      ))}
    </div>
  );
}
