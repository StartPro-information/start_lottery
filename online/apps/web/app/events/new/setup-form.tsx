"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";

type PrizeDraft = {
  id: string;
  level: string;
  name: string;
  totalCount: number;
};

type ParticipantMode = "csv" | "checkin" | "mixed";
type RequiredField =
  | "display_name"
  | "unique_key"
  | "employee_id"
  | "email"
  | "username"
  | "department"
  | "title"
  | "org_path"
  | "custom_field";

type EventPayload = {
  id: string;
  name: string;
  requireFinishPrize: boolean;
  requiredFields?: string[];
  participantMode?: ParticipantMode;
  checkinDeviceLimit?: boolean;
  customFieldLabel?: string | null;
};

type PrizePayload = {
  id: string;
  level: string;
  name: string;
  totalCount: number;
};

type ParticipantPayload = {
  displayName: string;
  uniqueKey?: string | null;
  employeeId?: string | null;
  email?: string | null;
  username?: string | null;
  department?: string | null;
  title?: string | null;
  orgPath?: string | null;
  customField?: string | null;
};

type GuideDraft = {
  name: string;
  prizes: { level: string; name: string; totalCount: number }[];
  participantMode: ParticipantMode;
  csvText: string;
  requiredFields: RequiredField[];
  checkinDeviceLimit: boolean;
  customFieldLabel: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function createId() {
  return `prize-${Math.random().toString(36).slice(2, 9)}`;
}

const GUIDE_STORAGE_KEY = "lottery.eventGuideDraft";

const REQUIRED_FIELD_OPTIONS: { key: RequiredField; label: string; locked?: boolean }[] = [
  { key: "display_name", label: "姓名", locked: true },
  { key: "unique_key", label: "唯一标识" },
  { key: "employee_id", label: "工号" },
  { key: "email", label: "邮箱" },
  { key: "username", label: "账号" },
  { key: "department", label: "部门" },
  { key: "title", label: "岗位" },
  { key: "org_path", label: "组织路径" },
  { key: "custom_field", label: "自定义字段" },
];

const SUPPORTED_CSV_FIELDS = [
  "display_name",
  "unique_key",
  "employee_id",
  "email",
  "username",
  "department",
  "title",
  "org_path",
  "custom_field",
];

function getModeStorageKey(eventId: string) {
  return `lottery.participantMode.${eventId}`;
}

function buildCsv(items: ParticipantPayload[]) {
  const header = [
    "display_name",
    "unique_key",
    "employee_id",
    "email",
    "username",
    "department",
    "title",
    "org_path",
    "custom_field",
  ];
  const rows = items.map((item) => [
    item.displayName || "",
    item.uniqueKey || "",
    item.employeeId || "",
    item.email || "",
    item.username || "",
    item.department || "",
    item.title || "",
    item.orgPath || "",
    item.customField || "",
  ]);
  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

function formatImportWarning(raw: string | string[] | null | undefined) {
  if (!raw) return null;
  const warnings = Array.isArray(raw) ? raw.map((item) => String(item)) : [String(raw)];
  const warning = warnings.join("; ");
  const parts: string[] = [];
  if (/CSV header missing\s+display_name/i.test(warning)) {
    parts.push("CSV 表头缺少姓名（display_name），姓名为必填字段，会影响抽奖名单导入");
  }
  const ignored = Array.from(warning.matchAll(/([a-z0-9_]+)\s+will be ignored/gi)).map((match) =>
    match[1].toLowerCase(),
  );
  const ignoredFields = Array.from(new Set(ignored)).filter((field) => field !== "custom_field");
  if (ignoredFields.length > 0) {
    parts.push(
      `检测到不支持字段：${ignoredFields.join("、")}，将被忽略。仅支持以下字段生效：${SUPPORTED_CSV_FIELDS.join(
        "、",
      )}`,
    );
    parts.push("只要包含姓名（display_name）就不会影响抽奖使用");
  }
  if (!parts.length) {
    return null;
  }
  return `${parts.join("，")}。该情况不影响抽奖正常使用，但不支持字段将无法导入。`;
}

export default function SetupForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const fromGuide = searchParams.get("fromGuide") === "1";

  const [name, setName] = useState("");
  const [requireFinishPrize, setRequireFinishPrize] = useState(true);
  const [participantMode, setParticipantMode] = useState<ParticipantMode>("csv");
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>(["display_name"]);
  const [checkinDeviceLimit, setCheckinDeviceLimit] = useState(true);
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [editingCustomFieldLabel, setEditingCustomFieldLabel] = useState(false);
  const [customFieldDraft, setCustomFieldDraft] = useState("");
  const [csvText, setCsvText] = useState("");
  const [prizes, setPrizes] = useState<PrizeDraft[]>([
    { id: createId(), level: "", name: "", totalCount: 1 },
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [importHint, setImportHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const updatePrize = (id: string, patch: Partial<PrizeDraft>) => {
    setPrizes((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addPrize = () => {
    setPrizes((items) => [...items, { id: createId(), level: "", name: "", totalCount: 1 }]);
  };

  const removePrize = (id: string) => {
    setPrizes((items) => (items.length > 1 ? items.filter((item) => item.id !== id) : items));
  };

  const handleCsvFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const validateParticipants = () => {
    if (!requiredFields.includes("display_name")) {
      setStatus("必选字段必须包含姓名。");
      return false;
    }
    if (participantMode === "csv" && !csvText.trim()) {
      setStatus("请选择仅CSV导入时，需要填写名单内容。");
      return false;
    }
    if (participantMode === "mixed" && !csvText.trim()) {
      setStatus("混合模式需要提供名单，用于限制可签到人员。");
      return false;
    }
    return true;
  };

  const loadEditData = async (id: string) => {
    setStatus(null);
    setLoading(true);
    const storedMode = typeof window !== "undefined" ? window.localStorage.getItem(getModeStorageKey(id)) : null;
    if (storedMode === "csv" || storedMode === "checkin" || storedMode === "mixed") {
      setParticipantMode(storedMode);
    }
    try {
      const [eventRes, prizeRes, participantsRes] = await Promise.all([
        fetch(`${getBaseUrl()}/events/${id}`, { headers, cache: "no-store" }),
        fetch(`${getBaseUrl()}/events/${id}/prizes`, { headers, cache: "no-store" }),
        fetch(`${getBaseUrl()}/events/${id}/participants`, { headers, cache: "no-store" }),
      ]);

      if (eventRes.ok) {
        const eventData = (await eventRes.json()) as EventPayload;
        setName(eventData.name || "");
        setRequireFinishPrize(Boolean(eventData.requireFinishPrize));
        if (eventData.participantMode) {
          setParticipantMode(eventData.participantMode);
        }
        if (typeof eventData.checkinDeviceLimit === "boolean") {
          setCheckinDeviceLimit(eventData.checkinDeviceLimit);
        }
        setCustomFieldLabel(eventData.customFieldLabel || "");
        setCustomFieldDraft(eventData.customFieldLabel || "");
        if (Array.isArray((eventData as { requiredFields?: string[] }).requiredFields)) {
          const fields = (eventData as { requiredFields?: string[] }).requiredFields || [];
          const normalized = fields.filter((field) =>
            REQUIRED_FIELD_OPTIONS.some((option) => option.key === field),
          ) as RequiredField[];
          if (!normalized.includes("display_name")) {
            normalized.unshift("display_name");
          }
          setRequiredFields(Array.from(new Set(normalized)));
        }
      }

      if (prizeRes.ok) {
        const prizeData = (await prizeRes.json()) as PrizePayload[];
        if (prizeData.length > 0) {
          setPrizes(
            prizeData.map((item) => ({
              id: item.id,
              level: item.level,
              name: item.name,
              totalCount: item.totalCount,
            })),
          );
        }
      }

      if (participantsRes.ok) {
        const participantData = (await participantsRes.json()) as ParticipantPayload[];
        if (participantData.length > 0) {
          setCsvText(buildCsv(participantData));
          if (!storedMode) {
            setParticipantMode("csv");
          }
        } else {
          if (!storedMode) {
            setParticipantMode("checkin");
          }
        }
      }
    } catch (err) {
      setStatus("加载活动数据失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!editId) return;
    setEventId(editId);
    loadEditData(editId);
  }, [editId]);

  useEffect(() => {
    if (editId || !fromGuide) return;
    const raw = window.localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as GuideDraft;
      if (draft?.name) {
        setName(draft.name);
      }
      if (Array.isArray(draft?.prizes) && draft.prizes.length > 0) {
        setPrizes(
          draft.prizes.map((item) => ({
            id: createId(),
            level: item.level || "",
            name: item.name || "",
            totalCount: Number.isFinite(item.totalCount) ? item.totalCount : 1,
          })),
        );
      }
      if (draft?.participantMode) {
        setParticipantMode(draft.participantMode);
      }
      if (typeof draft?.csvText === "string") {
        setCsvText(draft.csvText);
      }
      if (Array.isArray(draft?.requiredFields)) {
        const normalized = draft.requiredFields.filter((field) =>
          REQUIRED_FIELD_OPTIONS.some((option) => option.key === field),
        ) as RequiredField[];
        if (!normalized.includes("display_name")) {
          normalized.unshift("display_name");
        }
        setRequiredFields(Array.from(new Set(normalized)));
      }
      if (typeof draft?.customFieldLabel === "string") {
        setCustomFieldLabel(draft.customFieldLabel);
        setCustomFieldDraft(draft.customFieldLabel);
      }
      if (typeof draft?.checkinDeviceLimit === "boolean") {
        setCheckinDeviceLimit(draft.checkinDeviceLimit);
      }
    } catch {
      return;
    }
  }, [editId, fromGuide]);

  useEffect(() => {
    const targetId = eventId || editId;
    if (!targetId) return;
    window.localStorage.setItem(getModeStorageKey(targetId), participantMode);
  }, [participantMode, eventId, editId]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("活动名称不能为空。");
      return;
    }
    if (!validateParticipants()) {
      return;
    }
    setLoading(true);
    setStatus(null);
    setImportHint(null);

    try {
      let currentEventId = eventId;
      let importWarning: string | null = null;

      if (!currentEventId) {
        const res = await fetch(`${getBaseUrl()}/events`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: trimmed,
            requireFinishPrize,
            participantMode,
            requiredFields,
            checkinDeviceLimit,
            customFieldLabel: customFieldLabel.trim() || null,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.id) {
          setStatus(`创建活动失败：${data?.message || res.status}`);
          return;
        }
        currentEventId = data.id as string;
        setEventId(currentEventId);
      } else {
        const res = await fetch(`${getBaseUrl()}/events/${currentEventId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: trimmed,
            requireFinishPrize,
            participantMode,
            requiredFields,
            checkinDeviceLimit,
            customFieldLabel: customFieldLabel.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setStatus(`更新活动失败：${data?.message || res.status}`);
          return;
        }
      }

      if (participantMode !== "checkin" && csvText.trim()) {
        const importRes = await fetch(`${getBaseUrl()}/events/${currentEventId}/participants/import`, {
          method: "POST",
          headers,
          body: JSON.stringify({ csv: csvText }),
        });
        if (!importRes.ok) {
          const importData = await importRes.json().catch(() => null);
          if (importRes.status === 413 || /entity too large/i.test(String(importData?.message || ""))) {
            setImportHint("导入失败：CSV 文件过大，请确保文件小于 1MB。");
          } else if (importData?.message && String(importData.message).includes("EVENT_LOCKED")) {
            setStatus("导入名单失败：活动已锁定，无法继续新增人员。");
          } else {
            setStatus(`导入名单失败：${importData?.message || importRes.status}`);
          }
          return;
        }
        const importData = await importRes.json().catch(() => null);
        if (importData?.warning) {
          importWarning = importData.warning;
        }
      }

      const validPrizes = prizes.filter((item) => item.level.trim() && item.name.trim());
      for (const prize of validPrizes) {
        if (prize.id.startsWith("prize-")) {
          const prizeRes = await fetch(`${getBaseUrl()}/events/${currentEventId}/prizes`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              level: prize.level.trim(),
              name: prize.name.trim(),
              totalCount: prize.totalCount,
            }),
          });
          if (!prizeRes.ok) {
            const prizeData = await prizeRes.json().catch(() => null);
            setStatus(`创建奖品失败：${prizeData?.message || prizeRes.status}`);
            return;
          }
        } else {
          const prizeRes = await fetch(`${getBaseUrl()}/events/${currentEventId}/prizes/${prize.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              level: prize.level.trim(),
              name: prize.name.trim(),
              totalCount: prize.totalCount,
            }),
          });
          if (!prizeRes.ok) {
            const prizeData = await prizeRes.json().catch(() => null);
            setStatus(`更新奖品失败：${prizeData?.message || prizeRes.status}`);
            return;
          }
        }
      }

      if (importWarning) {
        setImportHint(formatImportWarning(importWarning));
      } else {
        setImportHint(null);
      }
      setStatus("配置完成。");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`保存失败：${message || "请稍后重试"}`);
    } finally {
      setLoading(false);
    }
  };

  const nextLink = eventId
    ? participantMode === "csv"
      ? `/events/${eventId}/host`
      : `/events/${eventId}/screen`
    : null;

  const nextLabel = participantMode === "csv" ? "进入主持台" : "进入签到大屏";

  const submitLabel = "保存配置";
  const headerId = editId || eventId;

  return (
    <div className="setup-stack">
      <div className="setup-toolbar">
        <div className="setup-title">
          创建抽奖活动{headerId ? ` · ${headerId}` : ""}
        </div>
        <div className="setup-actions">
          <button className="btn btn-primary" type="button" onClick={submit} disabled={loading}>
            {loading ? "正在保存..." : submitLabel}
          </button>
          {nextLink ? (
            <Link className="btn btn-ghost" href={nextLink}>
              {nextLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="setup-grid">
        <div className="setup-column setup-column--left">
          <section className="card setup-section">
            <h3 className="setup-section-title">创建活动</h3>
            <div className="form">
              <div className="setup-row setup-row--single">
                <div className="field">
                  <label className="setup-label-strong">活动名称</label>
                  <input
                    placeholder="例如：2025 年会抽奖"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="card setup-section">
            <div className="setup-section-header">
              <h3 className="setup-section-title">配置奖品</h3>
              <button
                className="btn btn-primary btn-small setup-add-prize"
                type="button"
                onClick={addPrize}
              >
                添加奖品
              </button>
            </div>
            <div className="form">
              <div className="setup-prize-head">
                <span className="setup-prize-col setup-prize-col--level setup-label-strong">
                  奖品等级
                </span>
                <span className="setup-prize-col setup-prize-col--name setup-label-strong">
                  奖品名称
                </span>
                <span className="setup-prize-col setup-prize-col--count setup-label-strong">数量</span>
                <span className="setup-prize-col setup-prize-col--remove" />
              </div>
              {prizes.map((prize) => (
                <div className="setup-prize-row" key={prize.id}>
                  <div className="field field--compact setup-prize-col setup-prize-col--level">
                    <input
                      placeholder="例如：一等奖"
                      value={prize.level}
                      onChange={(event) => updatePrize(prize.id, { level: event.target.value })}
                    />
                  </div>
                  <div className="field setup-prize-col setup-prize-col--name">
                    <input
                      placeholder="例如：MacBook Air"
                      value={prize.name}
                      onChange={(event) => updatePrize(prize.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="field setup-prize-col setup-prize-col--count">
                    <input
                      type="number"
                      min={1}
                      value={prize.totalCount === 0 ? "" : prize.totalCount}
                      onChange={(event) =>
                        updatePrize(prize.id, {
                          totalCount: event.target.value === "" ? 0 : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="setup-prize-actions setup-prize-col setup-prize-col--remove">
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      onClick={() => removePrize(prize.id)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="setup-column setup-column--right">
          <section className="card setup-section">
            <h3 className="setup-section-title">人员管理</h3>
            <div className="form">
              <div className="setup-mode-block">
                <span className="setup-mode-label setup-label-strong">抽奖名单导入</span>
                <div className="setup-mode-grid">
                  <label className="setup-mode-card">
                    <input
                      type="radio"
                      name="participantMode"
                      value="csv"
                      checked={participantMode === "csv"}
                      onChange={() => setParticipantMode("csv")}
                    />
                    <span>
                      CSV模式
                      <em className="setup-mode-tip">只认CSV导入名单，无需签到即可参与抽奖</em>
                    </span>
                  </label>
                  <label className="setup-mode-card">
                    <input
                      type="radio"
                      name="participantMode"
                      value="checkin"
                      checked={participantMode === "checkin"}
                      onChange={() => setParticipantMode("checkin")}
                    />
                    <span>
                      签到模式
                      <em className="setup-mode-tip">无需CSV导入，只要是扫码签到人员即可参与抽奖</em>
                    </span>
                  </label>
                  <label className="setup-mode-card">
                    <input
                      type="radio"
                      name="participantMode"
                      value="mixed"
                      checked={participantMode === "mixed"}
                      onChange={() => setParticipantMode("mixed")}
                    />
                    <span>
                      混合模式（CSV且签到）
                      <em className="setup-mode-tip">CSV导入并扫码签到才可参与抽奖，未在CSV名单或未签到均不可参与抽奖</em>
                    </span>
                  </label>
                </div>
                {participantMode !== "csv" ? (
                  <label className="setup-required-item setup-device-limit">
                    <input
                      type="checkbox"
                      checked={checkinDeviceLimit}
                      onChange={(event) => setCheckinDeviceLimit(event.target.checked)}
                    />
                    <span>限制同设备 2 小时内重复签到</span>
                  </label>
                ) : null}
              </div>
              {participantMode !== "checkin" ? (
                <div className="field">
                  <label className="setup-label-strong">CSV 内容</label>
                  <div className="setup-csv-actions">
                    <a
                      className="btn btn-ghost btn-small"
                      href="/templates/participants-template.csv"
                      download
                    >
                      下载CSV模板
                    </a>
                    <label className="btn btn-ghost btn-small setup-csv-upload">
                      导入CSV文件
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(event) => handleCsvFile(event.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="粘贴 CSV 内容（包含表头）"
                    value={csvText}
                    onChange={(event) => setCsvText(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="field">
                <label className="setup-label-strong">抽奖时显示的字段（如果需要扫码，则是扫码签到填入的字段）</label>
                <div className="setup-required-grid">
                  {REQUIRED_FIELD_OPTIONS.map((option) => {
                    const displayLabel =
                      option.key === "custom_field"
                        ? customFieldLabel.trim() || option.label
                        : option.label;
                    const isCustomField = option.key === "custom_field";
                    return (
                      <label
                        key={option.key}
                        className={`setup-required-item${
                          isCustomField ? " setup-required-item--custom" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={requiredFields.includes(option.key)}
                          onChange={(event) => {
                            if (option.locked) {
                              return;
                            }
                            const checked = event.target.checked;
                            setRequiredFields((items) => {
                              if (checked) {
                                return Array.from(new Set([...items, option.key]));
                              }
                              return items.filter((item) => item !== option.key);
                            });
                          }}
                        />
                        <span>
                          {displayLabel}
                          <em className="setup-required-key">({option.key.toLowerCase()})</em>
                        </span>
                        {isCustomField ? (
                          <button
                            className="setup-custom-edit"
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setCustomFieldDraft(customFieldLabel || "");
                              setEditingCustomFieldLabel(true);
                            }}
                            aria-label="编辑自定义字段显示名"
                          >
                            ✎
                          </button>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {importHint ? <p className="hint setup-import-hint">{importHint}</p> : null}
            {status ? <p className="hint setup-import-hint">{status}</p> : null}
          </section>
        </div>
      </div>

      {editingCustomFieldLabel
        ? createPortal(
            <div
              className="setup-modal-backdrop"
              role="presentation"
              onClick={() => setEditingCustomFieldLabel(false)}
            >
              <div
                className="setup-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="custom-field-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="custom-field-title">自定义字段显示名</h3>
                <input
                  placeholder="例如：座位号"
                  value={customFieldDraft}
                  onChange={(event) => setCustomFieldDraft(event.target.value)}
                />
                <div className="setup-custom-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setEditingCustomFieldLabel(false)}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => {
                      setCustomFieldLabel(customFieldDraft.trim());
                      setEditingCustomFieldLabel(false);
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
