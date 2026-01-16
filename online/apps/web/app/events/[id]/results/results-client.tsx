"use client";

import { useEffect, useMemo, useState } from "react";

type Participant = {
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

type RoundInfo = {
  id: string;
  roundNo: number;
  status: "PENDING" | "DRAWN" | "CONFIRMED" | "VOIDED";
  createdAt: string;
};

type RoundRecord = RoundInfo & {
  prize: { level: string; name: string };
};

type Winner = {
  id: string;
  participant: Participant;
  prize: { level: string; name: string };
  round: RoundInfo;
  createdAt: string;
};

type RoundGroup = {
  key: string;
  title: string;
  subtitle: string;
  status?: RoundInfo["status"];
  createdAt: string;
  winners: Winner[];
};

type EventInfo = {
  name: string;
  requiredFields: string[];
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function buildCardMeta(requiredFields: string[], participant: Participant) {
  const fieldMap: Record<string, string | null | undefined> = {
    display_name: participant.displayName,
    unique_key: participant.uniqueKey,
    employee_id: participant.employeeId,
    email: participant.email,
    username: participant.username,
    department: participant.department,
    title: participant.title,
    org_path: participant.orgPath,
    custom_field: participant.customField,
  };
  const normalized = requiredFields.includes("display_name")
    ? requiredFields
    : ["display_name", ...requiredFields];
  const displayFields = normalized.filter((field) => field !== "display_name");
  const values = displayFields
    .map((field) => fieldMap[field]?.toString().trim())
    .filter((value): value is string => Boolean(value));
  return {
    meta: values[0] ?? "-",
    sub: values[1] ?? "",
  };
}

export default function ResultsClient({ eventId }: { eventId: string }) {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"round" | "prize">("round");

  const headers: Record<string, string> = {};
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [eventRes, winnersRes, roundsRes] = await Promise.all([
        fetch(`${getBaseUrl()}/events/${eventId}`, { headers, cache: "no-store" }),
        fetch(`${getBaseUrl()}/events/${eventId}/winners?includePending=1`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${getBaseUrl()}/events/${eventId}/draw/rounds`, {
          headers,
          cache: "no-store",
        }),
      ]);
      if (!eventRes.ok) {
        const text = await eventRes.text();
        throw new Error(text || "event load failed");
      }
      if (!winnersRes.ok) {
        const text = await winnersRes.text();
        throw new Error(text || "winners load failed");
      }
      if (!roundsRes.ok) {
        const text = await roundsRes.text();
        throw new Error(text || "rounds load failed");
      }
      const eventData = (await eventRes.json()) as { name?: string; requiredFields?: string[] };
      const winnerData = (await winnersRes.json()) as Winner[];
      const roundData = (await roundsRes.json()) as RoundRecord[];
      setEventInfo({
        name: eventData?.name || "活动",
        requiredFields: Array.isArray(eventData?.requiredFields)
          ? eventData.requiredFields
          : ["display_name"],
      });
      setWinners(Array.isArray(winnerData) ? winnerData : []);
      setRounds(Array.isArray(roundData) ? roundData : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setStatus(`加载失败：${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roundGroups = useMemo<RoundGroup[]>(() => {
    if (rounds.length === 0) {
      const map = new Map<string, RoundGroup>();
      const sorted = [...winners].sort((a, b) => {
        const aTime = new Date(a.round.createdAt).getTime();
        const bTime = new Date(b.round.createdAt).getTime();
        return bTime - aTime;
      });
      sorted.forEach((winner) => {
        const key = winner.round.id;
        if (!map.has(key)) {
          const title = `第 ${winner.round.roundNo} 轮`;
          const subtitle = `${winner.prize.level} · ${winner.prize.name}`;
          map.set(key, {
            key,
            title,
            subtitle,
            status: winner.round.status,
            createdAt: winner.round.createdAt,
            winners: [],
          });
        }
        map.get(key)!.winners.push(winner);
      });
      return Array.from(map.values());
    }

    const winnersByRound = new Map<string, Winner[]>();
    winners.forEach((winner) => {
      if (!winnersByRound.has(winner.round.id)) {
        winnersByRound.set(winner.round.id, []);
      }
      winnersByRound.get(winner.round.id)!.push(winner);
    });

    return rounds.map((round) => ({
      key: round.id,
      title: `第 ${round.roundNo} 轮`,
      subtitle: round.prize ? `${round.prize.level} · ${round.prize.name}` : "",
      status: round.status,
      createdAt: round.createdAt,
      winners: winnersByRound.get(round.id) || [],
    }));
  }, [rounds, winners]);

  const prizeGroups = useMemo<RoundGroup[]>(() => {
    const map = new Map<string, RoundGroup>();
    const sorted = [...winners].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    sorted.forEach((winner) => {
      const key = `${winner.prize.level}__${winner.prize.name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: `${winner.prize.level} · ${winner.prize.name}`,
          subtitle: "",
          createdAt: winner.createdAt,
          winners: [],
        });
      }
      map.get(key)!.winners.push(winner);
    });
    return Array.from(map.values());
  }, [winners]);

  const exportCsv = () => {
    const headersRow = [
      "轮次",
      "轮次状态",
      "奖项等级",
      "奖项名称",
      "姓名",
      "唯一标识",
      "工号",
      "邮箱",
      "用户名",
      "部门",
      "职位",
      "组织路径",
      "自定义字段",
      "中奖时间",
    ];
    const rows = winners.map((winner) => [
      String(winner.round.roundNo),
      winner.round.status,
      winner.prize.level,
      winner.prize.name,
      winner.participant.displayName || "",
      winner.participant.uniqueKey || "",
      winner.participant.employeeId || "",
      winner.participant.email || "",
      winner.participant.username || "",
      winner.participant.department || "",
      winner.participant.title || "",
      winner.participant.orgPath || "",
      winner.participant.customField || "",
      winner.createdAt || "",
    ]);
    const csvBody = [headersRow, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell ?? ""))).join(","))
      .join("\n");
    const csv = `\uFEFF${csvBody}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (eventInfo?.name || "event").replace(/[\\/:*?"<>|]/g, "-");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${safeName}_获奖名单_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const requiredFields = eventInfo?.requiredFields ?? ["display_name"];

  return (
    <section className="results-board">
      <div className="results-toolbar">
        <h2 className="results-event">{eventInfo?.name || "活动"}</h2>
        <div className="results-bar">
          <div className="results-total">本次活动获奖人数 {winners.length} 人</div>
          <div className="results-actions">
            <div className="results-view-toggle" role="tablist" aria-label="获奖视图">
              <button
                className={`btn btn-ghost btn-small ${viewMode === "round" ? "is-active" : ""}`}
                type="button"
                onClick={() => setViewMode("round")}
                aria-pressed={viewMode === "round"}
              >
                按轮次
              </button>
              <button
                className={`btn btn-ghost btn-small ${viewMode === "prize" ? "is-active" : ""}`}
                type="button"
                onClick={() => setViewMode("prize")}
                aria-pressed={viewMode === "prize"}
              >
                按奖项
              </button>
            </div>
            <button
              className="btn btn-ghost btn-small"
              type="button"
              onClick={load}
              disabled={loading}
            >
              {loading ? "刷新中..." : "刷新"}
            </button>
            <button className="btn btn-primary btn-small" type="button" onClick={exportCsv}>
              导出 CSV
            </button>
          </div>
        </div>
      </div>
      {status ? <p className="hint">{status}</p> : null}
      {(viewMode === "round" ? roundGroups : prizeGroups).length === 0 ? (
        <div className="results-empty">暂无中奖记录</div>
      ) : (
        <div className="results-groups">
          {(viewMode === "round" ? roundGroups : prizeGroups).map((group) => (
            <section className="results-group" key={group.key}>
              <header className="results-group-header">
                <div className="results-group-title">
                  <span className="results-round">{group.title}</span>
                  {group.subtitle ? <span className="results-prize">{group.subtitle}</span> : null}
                  <span className="results-count">获奖人数 {group.winners.length} 人</span>
                </div>
              </header>
              {group.winners.length > 0 ? (
                <div className="results-card-grid">
                  {group.winners.map((winner) => {
                    const { meta, sub } = buildCardMeta(requiredFields, winner.participant);
                    return (
                      <article className="results-card-chip" key={winner.id}>
                        <span className="card-name">{winner.participant.displayName}</span>
                        <span className="card-meta">{meta}</span>
                        {sub ? <span className="card-sub">{sub}</span> : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="results-empty-round">
                  {group.status === "VOIDED" ? "本轮已重抽，无获奖人员" : "暂无中奖记录"}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
