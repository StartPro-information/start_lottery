"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

export default function EventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [requireFinishPrize, setRequireFinishPrize] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createEvent = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("活动名称不能为空");
      return;
    }
    setLoading(true);
    setStatus(null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    const res = await fetch(`${getBaseUrl()}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: trimmed, requireFinishPrize }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(`创建失败：${data?.message || res.status}`);
      setLoading(false);
      return;
    }

    router.push(`/events/${data.id}/participants`);
  };

  return (
    <>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label>活动名称</label>
          <input
            placeholder="例如：2025 年会抽奖"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label>奖品发放策略</label>
          <select
            value={requireFinishPrize ? "finish" : "allow"}
            onChange={(event) => setRequireFinishPrize(event.target.value === "finish")}
          >
            <option value="finish">必须发完</option>
            <option value="allow">允许剩余</option>
          </select>
        </div>
        <div className="field">
          <label>备注</label>
          <textarea rows={4} placeholder="活动说明、主持人提醒等" />
        </div>
      </form>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={createEvent}>
          {loading ? "创建中..." : "创建并进入下一步"}
        </button>
      </div>
      {status ? <p className="hint">{status}</p> : null}
    </>
  );
}
