"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type CheckinToken = {
  nonce: string;
  expires_at: number;
  sig: string;
  qr_url: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

export default function CheckinPanel({ eventId }: { eventId: string }) {
  const [token, setToken] = useState<CheckinToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const retryTimeout = useRef<number | null>(null);
  const failureCount = useRef(0);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/checkin/token`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`token fetch failed (${res.status})`);
      }
      const data: CheckinToken = await res.json();
      setToken(data);
      setTokenError(false);
      failureCount.current = 0;
      if (retryTimeout.current) {
        window.clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
    } catch {
      failureCount.current += 1;
      setTokenError(true);
      const backoff = Math.min(30000, 3000 * Math.pow(2, Math.min(3, failureCount.current)));
      if (retryTimeout.current) {
        window.clearTimeout(retryTimeout.current);
      }
      retryTimeout.current = window.setTimeout(() => {
        fetchToken();
      }, backoff);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (!token) return;
    const tick = () => {
      const left = Math.max(0, token.expires_at - Date.now());
      if (left <= 0) {
        fetchToken();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [token, fetchToken]);

  useEffect(() => {
    return () => {
      if (retryTimeout.current) {
        window.clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  const qrPayload = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${token.qr_url}`;
  }, [token]);

  const [qrImage, setQrImage] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (!qrPayload) {
      setQrImage("");
      return;
    }
    QRCode.toDataURL(qrPayload, { width: 420, margin: 1 })
      .then((url) => {
        if (active) {
          setQrImage(url);
        }
      })
      .catch(() => {
        if (active) {
          setQrImage("");
        }
      });
    return () => {
      active = false;
    };
  }, [qrPayload]);

  return (
    <div className="checkin-panel checkin-panel--screen">
      <div className="checkin-card">
        <div className="qr-box">
          <div className="qr-grid" aria-hidden />
          {qrImage ? (
            <img className="qr-image" src={qrImage} alt="签到二维码" />
          ) : (
            <div className="qr-text">
              {tokenError ? "网络异常，正在重试..." : loading ? "加载中..." : "二维码不可用"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
