"use client";

import { useCallback, useEffect, useState } from "react";

type Participant = {
  id: string;
  displayName: string;
  employeeId?: string | null;
  email?: string | null;
  department?: string | null;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

export default function ParticipantsClient({ eventId }: { eventId: string }) {
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const load = useCallback(async () => {
    const res = await fetch(
      `${getBaseUrl()}/events/${eventId}/participants?status=eligible`,
      {
        headers,
        cache: "no-store",
      },
    );
    if (!res.ok) return;
    const data = (await res.json()) as Participant[];
    setParticipants(data);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const importCsv = async () => {
    if (!csvText.trim()) {
      setStatus("请粘贴 CSV 内容");
      return;
    }
    setLoading(true);
    setStatus(null);
    const res = await fetch(
      `${getBaseUrl()}/events/${eventId}/participants/import`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ csv: csvText }),
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(`导入失败：${data?.message || res.status}`);
      setLoading(false);
      return;
    }
    setStatus(`导入完成：${data.inserted}/${data.received}`);
    setCsvText("");
    await load();
    setLoading(false);
  };

  return (
    <section className="card">
      <div className="form">
        <div className="field">
          <label>CSV 内容</label>
          <textarea
            rows={6}
            placeholder="粘贴 CSV 内容（含表头）"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
        </div>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={importCsv}>
            {loading ? "导入中..." : "执行导入"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={load}>
            刷新列表
          </button>
        </div>
        {status ? <p className="hint">{status}</p> : null}
      </div>
      <div className="section-title">参与者预览</div>
      <div className="list">
        {participants.slice(0, 10).map((person) => (
          <div className="row" key={person.id}>
            <strong>{person.displayName}</strong>
            <span>
              {person.employeeId || person.email || "-"} ·{" "}
              {person.department || "未分配"}
            </span>
            <span className="hint">可抽</span>
          </div>
        ))}
        {participants.length === 0 ? <p className="hint">暂无名单</p> : null}
      </div>
    </section>
  );
}
