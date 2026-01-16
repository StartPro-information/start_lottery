"use client";

import { useState } from "react";

const DEVICE_KEY = "lottery_checkin_device_id";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function createDeviceId() {
  const webCrypto = (typeof globalThis !== "undefined"
    ? (globalThis.crypto as Crypto | undefined)
    : undefined);
  if (webCrypto && "randomUUID" in webCrypto) {
    return webCrypto.randomUUID();
  }
  if (webCrypto && "getRandomValues" in webCrypto) {
    const bytes = new Uint8Array(16);
    (webCrypto as Crypto).getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDeviceId() {
  if (typeof window === "undefined") return "device-unknown";
  const stored = window.localStorage.getItem(DEVICE_KEY);
  if (stored) return stored;
  const created = createDeviceId();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export default function CheckinClient({ eventId }: { eventId: string }) {
  const [identity, setIdentity] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parseToken = () => {
    try {
      const url = new URL(token);
      const nonce = url.searchParams.get("nonce");
      const expiresAt = url.searchParams.get("expires_at");
      const sig = url.searchParams.get("sig");
      return {
        nonce,
        expiresAt: expiresAt ? Number(expiresAt) : null,
        sig,
      };
    } catch {
      return { nonce: null, expiresAt: null, sig: null };
    }
  };

  const submit = async () => {
    setLoading(true);
    setStatus(null);
    const parsed = parseToken();
    if (!parsed.nonce || !parsed.expiresAt) {
      setStatus("二维码链接无效，请重新扫码或复制完整链接。");
      setLoading(false);
      return;
    }

    const res = await fetch(`${getBaseUrl()}/events/${eventId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonce: parsed.nonce,
        expiresAt: parsed.expiresAt,
        sig: parsed.sig,
        deviceId: getDeviceId(),
        participantIdentity: identity,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      setStatus(`签到失败：${text || res.status}`);
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.reason === "device_recent") {
      setStatus("你已在本场活动签到过，无需重复签到。");
    } else {
      setStatus(data.checked_in ? "签到成功 ✅" : "未签到，请补全信息");
    }
    setLoading(false);
  };

  return (
    <section className="checkin-card">
      <div className="form">
        <div className="field">
          <label>你的工号 / 邮箱 / 账号</label>
          <input
            placeholder="EMP001 / alice@example.com / alice"
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
          />
        </div>
        <div className="field">
          <label>二维码链接</label>
          <textarea
            rows={3}
            placeholder="请粘贴扫描得到的链接"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </div>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={submit}>
            {loading ? "签到中..." : "确认签到"}
          </button>
        </div>
        {status ? <p className="hint">{status}</p> : null}
      </div>
    </section>
  );
}
