"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
  listId?: string;
};

const FIELD_KEYS = [
  "display_name",
  "unique_key",
  "employee_id",
  "email",
  "username",
  "department",
  "title",
  "org_path",
  "custom_field",
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

const BASE_FIELD_DEFS: FieldDef[] = [
  { key: "display_name", label: "姓名", placeholder: "例如：张三" },
  { key: "unique_key", label: "唯一标识", placeholder: "例如：UK00001" },
  { key: "employee_id", label: "工号", placeholder: "例如：EMP001", autoComplete: "username" },
  { key: "email", label: "邮箱", placeholder: "例如：user@example.com", autoComplete: "email" },
  { key: "username", label: "账号", placeholder: "例如：user001", autoComplete: "username" },
  { key: "department", label: "部门", placeholder: "例如：市场部", listId: "opt-department" },
  { key: "title", label: "岗位", placeholder: "例如：专员", listId: "opt-title" },
  { key: "org_path", label: "组织路径", placeholder: "例如：/公司/中国", listId: "opt-org-path" },
  { key: "custom_field", label: "自定义字段", placeholder: "例如：备注信息" },
];

const DEVICE_KEY = "lottery_checkin_device_id";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function normalizeRequiredFields(fields: string[] | undefined) {
  const allowed = new Set<FieldKey>(FIELD_KEYS);
  const normalized = (fields || []).filter((field): field is FieldKey =>
    allowed.has(field as FieldKey),
  );
  if (!normalized.includes("display_name")) {
    normalized.unshift("display_name");
  }
  return Array.from(new Set(normalized));
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

export default function CheckinClient() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id") || "";
  const nonce = searchParams.get("nonce") || "";
  const sig = searchParams.get("sig") || "";
  const expiresAtParam = searchParams.get("expires_at") || "";
  const expiresAt = Number(expiresAtParam);

  const [requiredFields, setRequiredFields] = useState<string[]>(["display_name"]);
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [participantMode, setParticipantMode] = useState("csv");
  const [fieldOptions, setFieldOptions] = useState<Record<string, string[]>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<"idle" | "success" | "already" | "error">("idle");
  const [loading, setLoading] = useState(false);

  const fieldDefs = useMemo(() => {
    const displayLabel = customFieldLabel.trim() || "自定义字段";
    return BASE_FIELD_DEFS.map((field) =>
      field.key === "custom_field" ? { ...field, label: displayLabel } : field,
    );
  }, [customFieldLabel]);

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
        const fields = normalizeRequiredFields(data?.requiredFields);
        setRequiredFields(fields);
        setCustomFieldLabel(data?.customFieldLabel || "");
        setParticipantMode(data?.participantMode || "csv");
      })
      .catch(() => null);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || participantMode !== "mixed") return;
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }
    fetch(
      `${getBaseUrl()}/events/${eventId}/participants/fields?keys=department,title,org_path`,
      {
        headers,
        cache: "no-store",
      },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          setFieldOptions(data as Record<string, string[]>);
        }
      })
      .catch(() => null);
  }, [eventId, participantMode]);

  useEffect(() => {
    setFieldValues((prev) => {
      const next = { ...prev };
      requiredFields.forEach((field) => {
        if (next[field] === undefined) {
          next[field] = "";
        }
      });
      return next;
    });
  }, [requiredFields]);

  const orderedFields = useMemo(() => {
    const order = new Map(fieldDefs.map((field, index) => [field.key, index]));
    return requiredFields
      .slice()
      .sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
      .map((key) => fieldDefs.find((field) => field.key === key))
      .filter((field): field is FieldDef => Boolean(field));
  }, [requiredFields, fieldDefs]);

  const dropdownKeys = useMemo(() => new Set(["department", "title", "org_path"]), []);
  const filterOptions = useCallback((options: string[], query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return options.slice(0, 8);
    return options
      .filter((option) => option.includes(trimmed))
      .slice(0, 8);
  }, []);

  const isExpired = useMemo(() => {
    if (!expiresAtParam) return true;
    if (Number.isNaN(expiresAt)) return true;
    return Date.now() > expiresAt;
  }, [expiresAt, expiresAtParam]);

  const isValid = eventId && nonce && expiresAtParam && sig && !isExpired;

  const submit = async () => {
    if (!isValid) {
      setStatus("二维码已失效，请返回重新扫码。");
      setResult("error");
      return;
    }
    const missing = orderedFields.filter((field) => {
      const value = fieldValues[field.key]?.trim();
      if (value) return false;
      if (participantMode !== "mixed") return true;
      if (!dropdownKeys.has(field.key)) return true;
      const options = fieldOptions[field.key] || [];
      return options.length > 0;
    });
    if (missing.length > 0) {
      setStatus("请完整填写所有必选字段。");
      setResult("error");
      return;
    }
    setLoading(true);
    setStatus(null);
    setResult("idle");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    const participantFields: Record<string, string> = {};
    orderedFields.forEach((field) => {
      participantFields[field.key] = fieldValues[field.key]?.trim() || "";
    });

    const res = await fetch(`${getBaseUrl()}/events/${eventId}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        nonce,
        expiresAt,
        sig,
        deviceId: getDeviceId(),
        participantFields,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (text && text.includes("EVENT_LOCKED")) {
        setStatus("当前活动已锁定，暂停新增签到人员。");
        setResult("error");
      } else {
        setStatus(`签到失败：${text || res.status}`);
        setResult("error");
      }
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.reason === "device_recent") {
      setStatus("你已在本场活动签到过，无需重复签到。");
      setResult("already");
    } else if (data.checked_in) {
      setStatus("签到成功");
      setResult("success");
    } else {
      setStatus("未签到成功，请核对信息。");
      setResult("error");
    }
    setLoading(false);
  };

  const selectOption = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setActiveField(null);
  }, []);

  return (
    <div className="page page-host mobile-checkin-page">
      <main className="mobile-checkin-shell">
        <section className="mobile-checkin-card">
          <h1>扫码签到</h1>
          <p>请填写所有必选字段完成签到</p>
          {result === "success" || result === "already" ? (
            <div className="checkin-result">
              <div className="checkin-result-title">
                {result === "already" ? "已签到" : "签到成功"}
              </div>
              <div className="checkin-result-desc">
                {result === "already"
                  ? "你已在本场活动签到过，无需重复签到。"
                  : "签到已完成，可以返回现场。"}
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setResult("idle");
                  setStatus(null);
                }}
              >
                返回
              </button>
            </div>
          ) : (
            <div className="mobile-checkin-form">
              {orderedFields.map((field) => {
                const options = fieldOptions[field.key] || [];
                const useDropdown = participantMode === "mixed" && dropdownKeys.has(field.key);
                const filtered = useDropdown
                  ? filterOptions(options, fieldValues[field.key] || "")
                  : [];
                return (
                  <label key={field.key}>
                    {field.label}
                    <input
                      placeholder={field.placeholder}
                      value={fieldValues[field.key] || ""}
                      list={useDropdown ? field.listId : undefined}
                      onChange={(event) =>
                        setFieldValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      data-field-key={field.key}
                      onFocus={() => {
                        if (blurTimerRef.current) {
                          window.clearTimeout(blurTimerRef.current);
                          blurTimerRef.current = null;
                        }
                        setActiveField(field.key);
                      }}
                      onBlur={() => {
                        blurTimerRef.current = window.setTimeout(() => {
                          const activeElement = document.activeElement as HTMLElement | null;
                          const nextKey = activeElement?.getAttribute("data-field-key");
                          setActiveField(nextKey || null);
                          blurTimerRef.current = null;
                        }, 60);
                      }}
                      autoComplete={field.autoComplete || "off"}
                    />
                    {useDropdown && options.length > 0 && field.listId ? (
                      <datalist id={field.listId}>
                        {options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    ) : null}
                    {useDropdown && activeField === field.key && filtered.length > 0 ? (
                      <div className="checkin-suggestions">
                        {filtered.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectOption(field.key, option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                );
              })}
              <button className="btn btn-primary" type="button" onClick={submit} disabled={loading}>
                {loading ? "正在签到..." : "确认签到"}
              </button>
              {!isValid ? <p className="hint">二维码无效或已过期，请重新扫码。</p> : null}
              {status ? <p className="hint">{status}</p> : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


