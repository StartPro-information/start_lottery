"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

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

type GuideDraft = {
  name: string;
  prizes: { level: string; name: string; totalCount: number }[];
  participantMode: ParticipantMode;
  csvText: string;
  requiredFields: RequiredField[];
  checkinDeviceLimit: boolean;
  customFieldLabel: string;
};

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

const FIELD_SAMPLE_VALUES: Record<RequiredField, string> = {
  display_name: "张三",
  unique_key: "EMP000",
  employee_id: "A1024",
  email: "zhangsan@demo.com",
  username: "zhangsan",
  department: "市场部",
  title: "产品经理",
  org_path: "总部 / 市场部",
  custom_field: "座位 A3",
};

const STEPS = [
  { id: 1, title: "活动设置" },
  { id: 2, title: "抽奖人员名单导入" },
  { id: 3, title: "CSV 导入" },
  { id: 4, title: "展示字段" },
] as const;

function createId() {
  return `guide-${Math.random().toString(36).slice(2, 9)}`;
}

export default function GuideClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [participantMode, setParticipantMode] = useState<ParticipantMode>("csv");
  const [checkinDeviceLimit, setCheckinDeviceLimit] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [prizes, setPrizes] = useState<PrizeDraft[]>([
    { id: createId(), level: "", name: "", totalCount: 1 },
  ]);
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>(["display_name"]);
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [editingCustomFieldLabel, setEditingCustomFieldLabel] = useState(false);
  const [customFieldDraft, setCustomFieldDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const showCsvStep = participantMode !== "checkin";
  const stepTitle = useMemo(() => {
    return STEPS.find((item) => item.id === step)?.title || "";
  }, [step]);
  const stepHeroTitle = useMemo(() => {
    switch (step) {
      case 1:
        return "请为本次抽奖活动设置名称、奖品类型及数量";
      case 2:
        return "哪些人具备本次活动的抽奖资格？";
      case 3:
        return "请按照CSV模板导入你的人员名单";
      case 4:
        return "你希望抽奖时展示哪几项信息？";
      default:
        return "";
    }
  }, [step]);

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

  const validateStep = () => {
    setStatus(null);
    if (step === 1) {
      if (!name.trim()) {
        setStatus("请填写活动名称。");
        return false;
      }
      const validPrizes = prizes.filter(
        (item) => item.level.trim() && item.name.trim() && item.totalCount > 0,
      );
      if (validPrizes.length === 0) {
        setStatus("请至少填写一个有效的奖品等级、名称与数量。");
        return false;
      }
    }
    if (step === 3 && showCsvStep) {
      if (!csvText.trim()) {
        setStatus(participantMode === "csv" ? "CSV 模式需要导入名单。" : "混合模式需要导入名单。");
        return false;
      }
    }
    if (step === 4) {
      if (!requiredFields.includes("display_name")) {
        setStatus("必选字段必须包含姓名。");
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step === 2 && !showCsvStep) {
      setStep(4);
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  };

  const goPrev = () => {
    setStatus(null);
    if (step === 4 && !showCsvStep) {
      setStep(2);
      return;
    }
    setStep((value) => Math.max(1, value - 1));
  };

  const finishGuide = () => {
    if (!validateStep()) return;
    const draft: GuideDraft = {
      name: name.trim(),
      prizes: prizes.map((item) => ({
        level: item.level.trim(),
        name: item.name.trim(),
        totalCount: Number.isFinite(item.totalCount) ? item.totalCount : 1,
      })),
      participantMode,
      csvText,
      requiredFields,
      checkinDeviceLimit,
      customFieldLabel: customFieldLabel.trim(),
    };
    window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(draft));
    router.push("/events/new?fromGuide=1");
  };

  return (
    <div className="guide-stack">
      <div className="guide-top">
        <div className="guide-top-title">{stepHeroTitle}</div>
      </div>

      <div className="guide-layout">
        <aside className="guide-rail">
          <div className="guide-stepper guide-stepper--vertical">
            {STEPS.map((item) => {
              const disabled = item.id === 3 && !showCsvStep;
              const active = item.id === step;
              return (
                <div
                  key={item.id}
                  className={`guide-step${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
                >
                  <span className="guide-step-index">{String(item.id).padStart(2, "0")}</span>
                  <span className="guide-step-title">{item.title}</span>
                  {disabled ? <em className="guide-step-note">跳过</em> : null}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="guide-main">
          <section className="card setup-section guide-step-card">
            <div className="guide-step-header">
              <h3 className="setup-section-title">{stepTitle}</h3>
              <span className="guide-step-count">步骤 {step} / 4</span>
            </div>

        {step === 1 ? (
          <div className="form guide-step-body">
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
            <div className="guide-divider" />
            <div className="setup-section-header">
              <h4 className="setup-section-title">奖品设置</h4>
              <button className="btn btn-primary btn-small" type="button" onClick={addPrize}>
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form guide-step-body">
            <p className="guide-tip">
              请选择一种方式导入人员名单：
            </p>
            <div className="setup-mode-grid guide-mode-grid">
              <label className="setup-mode-card">
                <input
                  type="radio"
                  name="participantMode"
                  value="csv"
                  checked={participantMode === "csv"}
                  onChange={() => setParticipantMode("csv")}
                />
                <span>
                  CSV文件导入模式
                  <em className="setup-mode-tip">
                    只认CSV导入名单，无需签到即可参与抽奖
                    <br />
                    -  仅在CSV名单内的人员即具备抽奖资格；
                    <br />
                    -  无需扫码签到即可参与抽奖；
                    <br />
                    -  需要按照模板准备名单，必须包含姓名（display_name）字段。 
                  </em>
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
                  扫二维码签到模式
                  <em className="setup-mode-tip">
                    无需CSV导入，只要是扫码签到人员即可参与抽奖
                    <br />
                    -  无需提前导入名单，任何扫码签到人员均具备抽奖资格；
                    <br />
                    -  用户扫码填写信息即可参与抽奖；
                    <br />
                    -  适合现场开放式活动，无法提前准备名单的场景。
                    <br />
                    
                  </em>
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
                  混合模式（CSV + 签到）
                  <em className="setup-mode-tip">
                    CSV导入并扫码签到才可参与抽奖，未在CSV名单或未签到均不可参与抽奖
                    <br />
                    -  需提前导入名单；
                    <br />
                    -  只有在名单内且完成签到的人员才可参与抽奖；
                    <br />
                    -  签到时，用户输入的字段必须完全匹配名单才能签到成功；
                    <br />
                    -  不在名单内，或者虽在名单内但未签到成功的人员，均不可参与抽奖。
                  </em>
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
            <div className="guide-note">
              <p>选择后会影响下一步是否需要 CSV 名单导入。</p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form guide-step-body">
            <p className="guide-tip">
              请导入包含姓名（display_name）的 CSV 名单。混合模式下名单用于限制可签到人员。
            </p>
            <div className="field">
              <div className="setup-csv-actions">
                <a className="btn btn-ghost btn-small" href="/templates/participants-template.csv" download>
                  下载 CSV 模板
                </a>
                <label className="btn btn-ghost btn-small setup-csv-upload guide-csv-upload">
                  导入 CSV 文件
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
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form guide-step-body">
            <p className="guide-tip">
              请选择需要展示的名单信息（必选"姓名"display_name）字段：
            </p>
            <div className="setup-required-grid">
              {REQUIRED_FIELD_OPTIONS.map((option) => {
                const displayLabel =
                  option.key === "custom_field" ? customFieldLabel.trim() || option.label : option.label;
                const isCustomField = option.key === "custom_field";
                return (
                  <label
                    key={option.key}
                    className={`setup-required-item${isCustomField ? " setup-required-item--custom" : ""}`}
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
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="currentColor"
                        >
                          <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08ZM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.98-2.98a1.25 1.25 0 0 0-1.77 0l-1.85 1.85 4.75 4.75 1.85-1.85Z" />
                        </svg>
                      </button>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <div className="guide-preview">
              <div className="guide-preview-panel">
                <div className="guide-preview-title">中奖卡片预览</div>
                <div className="guide-winner-card">
                  <div className="guide-winner-name">{FIELD_SAMPLE_VALUES.display_name}</div>
                  <div className="guide-winner-meta">
                    {requiredFields
                      .filter((field) => field !== "display_name")
                      .slice(0, 2)
                      .map((field) => {
                        if (field === "custom_field") {
                          const label = customFieldLabel.trim();
                          const value = label ? `${label} · 示例` : FIELD_SAMPLE_VALUES[field];
                          return <span key={field}>{value}</span>;
                        }
                        return <span key={field}>{FIELD_SAMPLE_VALUES[field]}</span>;
                      })}
                  </div>
                </div>
              </div>
              <div className="guide-preview-panel">
                <div className="guide-preview-title">扫码输入预览</div>
                <div className="guide-checkin-preview">
                  <div className="guide-checkin-header">签到信息</div>
                  <div className="guide-checkin-fields">
                    {requiredFields.map((field) => {
                      const label =
                        field === "custom_field"
                          ? customFieldLabel.trim() || "自定义字段"
                          : REQUIRED_FIELD_OPTIONS.find((item) => item.key === field)?.label ||
                            field;
                      return (
                        <label key={field} className="guide-checkin-field">
                          <span>{label}</span>
                          <div className="guide-checkin-input" />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {status ? <p className="hint setup-import-hint">{status}</p> : null}
          </section>

          <div className="guide-actions">
            <div className="guide-actions-left">
              <Link className="btn btn-ghost" href="/">
                返回首页
              </Link>
              {step > 1 ? (
                <button className="btn btn-ghost" type="button" onClick={goPrev}>
                  上一步
                </button>
              ) : null}
            </div>
            <div className="guide-actions-right">
              {step < 4 ? (
                <button className="btn btn-primary" type="button" onClick={goNext}>
                  下一步
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={finishGuide}>
                  进入确认页
                </button>
              )}
            </div>
          </div>
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
