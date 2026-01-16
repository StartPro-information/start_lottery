"use client";

import { useEffect, useMemo, useState } from "react";

type Participant = {
  id: string;
  displayName: string;
  employeeId?: string | null;
  email?: string | null;
};

const fallback = [
  "市场部 / Alice",
  "工程部 / Bob",
  "财务部 / Cindy",
  "人事部 / Devin",
  "产品部 / Ella",
  "设计部 / Finn",
  "销售部 / Grace",
  "运营部 / Henry",
  "支持部 / Iris",
  "法务部 / Jack",
];

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function makePosition(index: number) {
  const left = (index * 37) % 92;
  const top = (index * 23) % 78;
  const delay = (index % 6) * 0.6;
  const duration = 5 + (index % 5) * 1.2;
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

export default function DrawPool({
  eventId,
  active = false,
}: {
  eventId: string;
  active?: boolean;
}) {
  const [people, setPeople] = useState<Participant[]>([]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    fetch(`${getBaseUrl()}/events/${eventId}/participants?status=eligible`, {
      headers,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPeople(Array.isArray(data) ? data : []))
      .catch(() => setPeople([]));
  }, [eventId]);

  const chips = useMemo(() => {
    if (!people.length) {
      return fallback.map((name, index) => ({
        id: `f-${index}`,
        label: name,
        meta: "",
      }));
    }
    return people.slice(0, 26).map((person, index) => ({
      id: person.id,
      label: person.displayName,
      meta: person.employeeId || person.email || "",
      index,
    }));
  }, [people]);

  return (
    <div className={`draw-pool ${active ? "draw-pool--active" : ""}`}>
      <div className="pool-grid" aria-hidden />
      <div className="pool-spotlight" aria-hidden />
      <div className="pool-title">DRAW POOL</div>
      {chips.map((chip, index) => (
        <div className="pool-chip" style={makePosition(index)} key={chip.id}>
          <strong>{chip.label}</strong>
          {chip.meta ? ` · ${chip.meta}` : ""}
        </div>
      ))}
    </div>
  );
}
