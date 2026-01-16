"use client";

import { useCallback, useEffect, useState } from "react";

type Prize = {
  id: string;
  level: string;
  name: string;
  totalCount: number;
  remainingCount: number;
  orderIndex: number;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

export default function PrizesClient({ eventId }: { eventId: string }) {
  const [level, setLevel] = useState("");
  const [name, setName] = useState("");
  const [totalCount, setTotalCount] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const load = useCallback(async () => {
    const res = await fetch(`${getBaseUrl()}/events/${eventId}/prizes`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as Prize[];
    setPrizes(data);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!level.trim() || !name.trim()) {
      setStatus("请填写奖品等级与名称");
      return;
    }
    setLoading(true);
    setStatus(null);
    const res = await fetch(`${getBaseUrl()}/events/${eventId}/prizes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ level, name, totalCount }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(`保存失败：${data?.message || res.status}`);
      setLoading(false);
      return;
    }
    setLevel("");
    setName("");
    setTotalCount(1);
    await load();
    setLoading(false);
  };

  return (
    <section className="card">
      <div className="form">
        <div className="field">
          <label>奖品等级</label>
          <input
            placeholder="例如：一等奖"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </div>
        <div className="field">
          <label>奖品名称</label>
          <input
            placeholder="例如：MacBook Air"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label>数量</label>
          <input
            type="number"
            min={1}
            value={totalCount}
            onChange={(event) => setTotalCount(Number(event.target.value))}
          />
        </div>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={create}>
            {loading ? "保存中..." : "保存奖品"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={load}>
            刷新列表
          </button>
        </div>
        {status ? <p className="hint">{status}</p> : null}
      </div>

      <div className="section-title">奖品列表</div>
      <div className="list">
        {prizes.map((prize) => (
          <div className="row" key={prize.id}>
            <strong>
              {prize.level} · {prize.name}
            </strong>
            <span>数量 {prize.totalCount} · 顺序 {prize.orderIndex}</span>
            <span className="hint">剩余 {prize.remainingCount}</span>
          </div>
        ))}
        {prizes.length === 0 ? <p className="hint">暂无奖品</p> : null}
      </div>
    </section>
  );
}
