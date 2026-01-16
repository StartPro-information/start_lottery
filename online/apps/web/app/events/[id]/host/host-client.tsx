"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Prize = {
  id: string;
  level: string;
  name: string;
  remainingCount: number;
};

const LABELS = {
  pages: "\u64cd\u4f5c\u9875\u9762",
  settings: "\u672c\u8f6e\u62bd\u53d6",
  actions: "\u64cd\u4f5c\u6309\u94ae",
  remaining: "\u5269\u4f59",
  drawPrize: "\u672c\u8f6e\u62bd\u53d6\u5956\u54c1",
  drawCountLabel: "\u672c\u8f6e\u62bd\u53d6\u4eba\u6570",
  lock: "\u9501\u5b9a\u4eba\u5458",
  start: "\u672c\u8f6e\u8bbe\u7f6e",
  draw: "\u5f00\u59cb\u62bd\u53d6",
  stop: "\u505c\u6b62\u62bd\u53d6",
  screen: "\u7b7e\u5230\u5927\u5c4f \u2197",
  results: "\u83b7\u5956\u7ed3\u679c \u2197",
  edit: "\u7f16\u8f91\u6d3b\u52a8 \u2197",
  confirm: "\u786e\u8ba4\u9886\u5956",
  confirmDone: "\u786e\u8ba4\u6210\u529f",
  redraw: "\u672c\u8f6e\u91cd\u62bd",
  redrawTitle: "\u786e\u8ba4\u91cd\u62bd",
  redrawTip: "\u672c\u8f6e\u4e2d\u5956\u4eba\u5458\u5c06\u88ab\u653e\u5f03\uff0c\u5c06\u4f7f\u7528\u76f8\u540c\u5956\u54c1\u4e0e\u4eba\u6570\u91cd\u65b0\u62bd\u53d6\u3002",
  roundUnset: "\u672a\u8bbe\u7f6e",
  roundConfirm: "\u786e\u8ba4\u8bbe\u7f6e",
  cancel: "\u53d6\u6d88",
  confirmLock: "\u786e\u8ba4\u9501\u5b9a",
  lockTitle: "\u672c\u64cd\u4f5c\u4e0d\u53ef\u9006\uff0c\u8bf7\u8c28\u614e\u786e\u8ba4\uff01\uff01\uff01",
  lockLine1: "\u53ea\u6709\u88ab\u6709\u6548\u9501\u5b9a\u7684\u4eba\u5458\uff0c\u53ef\u4ee5\u53c2\u4e0e\u672c\u6b21\u62bd\u5956\u3002",
  lockLine2: "\u9501\u5b9a\u540e\uff0c\u4e0d\u5141\u8bb8\u518d\u589e\u52a0\u62bd\u5956\u4eba\u5458\u3002",
  lockNoteTitle: "\u9501\u5b9a\u8bf4\u660e\uff1a",
  lockNoteCsv: "CSV \u6a21\u5f0f\uff1a\u4ee5\u5df2\u5bfc\u5165\u540d\u5355\u4e3a\u51c6\u3002",
  lockNoteCheckin: "\u626b\u7801\u7b7e\u5230\u6a21\u5f0f\uff1a\u4ee5\u5f53\u524d\u5df2\u7b7e\u5230\u4eba\u5458\u4e3a\u51c6\u3002",
  lockNoteMixed:
    "\u6df7\u5408\u6a21\u5f0f\uff1a\u4ee5\u5df2\u5bfc\u5165\u540d\u5355\u4e3a\u51c6\uff0c\u7b7e\u5230\u4ec5\u5728\u540d\u5355\u5185\u751f\u6548\u3002",
  roundSetupTitle: "\u672c\u8f6e\u62bd\u5956\u8bbe\u7f6e",
  roundSetupTip:
    "\u62bd\u53d6\u4eba\u6570\u4e0d\u80fd\u8d85\u8fc7\u672c\u8f6e\u5956\u54c1\u5269\u4f59\u6570\u91cf\uff0c\u4e14\u6bcf\u8f6e\u6700\u591a\u62bd\u53d6 60 \u4eba\u3002",
  roundPrizeLabel: "\u62bd\u53d6\u5956\u54c1",
  roundCountLabel: "\u62bd\u53d6\u4eba\u6570",
  decreaseCount: "\u51cf\u5c11\u4eba\u6570",
  increaseCount: "\u589e\u52a0\u4eba\u6570",
  selectWinnerRequired: "\u8bf7\u81f3\u5c11\u52fe\u9009\u4e00\u4f4d\u4e2d\u5956\u4eba\u5458\u3002",
  confirmTitle: "\u786e\u8ba4\u9886\u5956",
  confirmTip: "\u8bf7\u786e\u8ba4\u5df2\u52fe\u9009\u7684\u4eba\u5458\u9886\u5956\uff0c\u786e\u8ba4\u540e\u5c06\u65e0\u6cd5\u64a4\u9500\u3002",
  soundOn: "\u97f3\u6548\uff1a\u5f00",
  soundOff: "\u97f3\u6548\uff1a\u5173",
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

export default function HostClient({
  eventId,
  isDrawing,
  isLocked,
  onStartEvent,
  onLockEvent,
  onDrawEvent,
  onStopDraw,
  onRedrawEvent,
  onRoundReady,
  onRoundCreated,
  onConfirmComplete,
  selectedWinnerIds,
  stageState,
  confirmReady,
  stopReady,
  soundEnabled,
  onToggleSound,
}: {
  eventId: string;
  isDrawing?: boolean;
  isLocked?: boolean | null;
  stageState?: "idle" | "dealing" | "ready" | "scatter" | "align" | "stopped" | "exit";
  confirmReady?: boolean;
  stopReady?: boolean;
  onStartEvent?: () => void;
  onLockEvent?: () => void;
  onDrawEvent?: () => void;
  onStopDraw?: () => void;
  onRedrawEvent?: () => void;
  onRoundReady?: (drawCount: number, prizeLabel: string) => void;
  onRoundCreated?: (winners: { participantId: string }[]) => void;
  onConfirmComplete?: () => void;
  selectedWinnerIds?: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}) {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [roundPrizeId, setRoundPrizeId] = useState<string>("");
  const [roundDrawCount, setRoundDrawCount] = useState<number>(1);
  const [draftPrizeId, setDraftPrizeId] = useState<string>("");
  const [draftDrawCount, setDraftDrawCount] = useState<number>(1);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    null | "lock" | "start" | "redraw" | "confirm"
  >(null);
  const drawInFlightRef = useRef(false);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [hasStopped, setHasStopped] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showRoundSetup, setShowRoundSetup] = useState(false);
  const [showConfirmRound, setShowConfirmRound] = useState(false);
  const [showRedrawConfirm, setShowRedrawConfirm] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [pendingAllDone, setPendingAllDone] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const lockedReady = Boolean(isLocked);
  const roundReady = Boolean(roundPrizeId);
  const canStartDraw = stageState === "scatter" || stageState === "ready";
  const canStopDraw = stageState === "align" && Boolean(stopReady);
  const canConfirm = stageState === "stopped" && Boolean(confirmReady);
  const canRedraw = stageState === "stopped" && Boolean(confirmReady) && Boolean(roundId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const isLoading = loadingAction !== null;
  const loadPrizes = useCallback(async () => {
    const res = await fetch(`${getBaseUrl()}/events/${eventId}/prizes`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Prize[];
    setPrizes(data);
    if (!draftPrizeId && data[0]) {
      setDraftPrizeId(data[0].id);
    }
    return data;
  }, [eventId, draftPrizeId]);

  useEffect(() => {
    loadPrizes();
  }, [loadPrizes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pendingAllDone) return;
    if (stageState !== "idle") return;
    setShowAllDone(true);
    setPendingAllDone(false);
  }, [pendingAllDone, stageState]);

  const lockEvent = async () => {
    if (isLoading) return;
    setLoadingAction("lock");
    setStatus(null);
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/lock`, {
        method: "POST",
        headers,
      });
      const body = await res.text();
      if (res.ok) {
        onLockEvent?.();
      } else {
        setStatus(body ? `\u9501\u5b9a\u5931\u8d25\uff1a${body}` : "\u9501\u5b9a\u5931\u8d25");
      }
    } catch {
      setStatus("\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    } finally {
      setLoadingAction(null);
    }
  };

  const startEvent = async () => {
    if (isLoading) return false;
    setLoadingAction("start");
    setStatus(null);
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/start`, {
        method: "POST",
        headers,
      });
      const body = await res.text();
      if (res.ok) {
        onStartEvent?.();
        return true;
      } else {
        setStatus(body ? `\u51c6\u5907\u5931\u8d25\uff1a${body}` : "\u51c6\u5907\u5931\u8d25");
        return false;
      }
    } catch {
      setStatus("\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
      return false;
    } finally {
      setLoadingAction(null);
    }
  };

  const startDraw = async () => {
    if (!roundPrizeId) {
      setDrawError("\u8bf7\u5148\u9009\u62e9\u5956\u54c1\u3002");
      return;
    }
    const selected = prizes.find((item) => item.id === roundPrizeId);
    if (!selected) {
      setDrawError("\u672a\u627e\u5230\u5f53\u524d\u5956\u54c1\u4fe1\u606f\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5\u3002");
      return;
    }
    if (selected.remainingCount <= 0) {
      setDrawError("\u672c\u8f6e\u5956\u54c1\u5df2\u65e0\u5269\u4f59\u6570\u91cf\uff0c\u8bf7\u9009\u62e9\u5176\u4ed6\u5956\u54c1\u3002");
      return;
    }
    if (roundDrawCount > selected.remainingCount) {
      setDrawError(
        `\u672c\u6b21\u62bd\u53d6\u4eba\u6570\u5927\u4e8e\u5269\u4f59\u5956\u54c1\u4eba\u6570\uff08\u5269\u4f59 ${selected.remainingCount} \u4eba\uff09\u3002`,
      );
      return;
    }
    if (stageState === "ready") {
      onStartEvent?.();
    }
    if (isLoading || drawInFlightRef.current) return;
    drawInFlightRef.current = true;
    setStatus(null);
    setDrawError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/draw/rounds`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prizeId: roundPrizeId, drawCount: roundDrawCount }),
      });
      if (!res.ok) {
        const text = await res.text();
        setDrawError(text ? `\u62bd\u53d6\u5931\u8d25\uff1a${text}` : "\u62bd\u53d6\u5931\u8d25\u3002");
        return;
      }
      const data = await res.json();
      setRoundId(data?.round?.id ?? null);
      if (Array.isArray(data?.winners)) {
        onRoundCreated?.(data.winners);
      }
      setHasStopped(false);
      onDrawEvent?.();
    } catch {
      setDrawError("\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      drawInFlightRef.current = false;
    }
  };

  const redrawRound = async () => {
    if (!roundId || isLoading) return;
    setLoadingAction("redraw");
    setStatus(null);
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/draw/rounds/${roundId}/redraw`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "manual" }),
      });
      if (!res.ok) {
        const text = await res.text();
        setStatus(text ? `\u91cd\u62bd\u5931\u8d25\uff1a${text}` : "\u91cd\u62bd\u5931\u8d25");
        return;
      }
      const data = await res.json();
      setRoundId(data?.round?.id ?? null);
      if (Array.isArray(data?.winners)) {
        onRoundCreated?.(data.winners);
      }
      setHasStopped(false);
      onRedrawEvent?.();
    } catch {
      setStatus("\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmRound = async () => {
    if (!roundId || isLoading) return;
    if (selectedWinnerIds && selectedWinnerIds.length === 0) {
      setStatus(LABELS.selectWinnerRequired);
      return;
    }
    setLoadingAction("confirm");
    setStatus(null);
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/draw/rounds/${roundId}/confirm`, {
        method: "POST",
        headers,
        body: selectedWinnerIds ? JSON.stringify({ winnerIds: selectedWinnerIds }) : undefined,
      });
      const text = await res.text();
      if (res.ok) {
        setStatus(LABELS.confirmDone);
        setRoundId(null);
        setHasStopped(false);
        onConfirmComplete?.();
        const refreshed = await loadPrizes();
        const isAllDone = refreshed.length > 0 && refreshed.every((item) => item.remainingCount <= 0);
        if (isAllDone) {
          setPendingAllDone(true);
        }
      } else {
        setStatus(text ? `\u786e\u8ba4\u5931\u8d25\uff1a${text}` : "\u786e\u8ba4\u5931\u8d25");
      }
    } catch {
      setStatus("\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    } finally {
      setLoadingAction(null);
    }
  };

  const stopDraw = () => {
    setHasStopped(true);
    onStopDraw?.();
  };

  const openRoundSetup = () => {
    const nextPrizeId = draftPrizeId || prizes[0]?.id || "";
    if (nextPrizeId && nextPrizeId !== draftPrizeId) {
      setDraftPrizeId(nextPrizeId);
    }
    const prize = prizes.find((item) => item.id === nextPrizeId);
    const maxAllowed = Math.max(1, Math.min(60, prize?.remainingCount ?? 1));
    const nextCount = roundDrawCount || 1;
    setDraftDrawCount(Math.min(nextCount, maxAllowed));
    setShowRoundSetup(true);
  };

  const confirmRoundSetup = async () => {
    if (!draftPrizeId) {
      setStatus("\u8bf7\u9009\u62e9\u5956\u54c1\u3002");
      return;
    }
    const selected = prizes.find((item) => item.id === draftPrizeId);
    const maxAllowed = Math.max(1, Math.min(60, selected?.remainingCount ?? 1));
    if (!Number.isFinite(draftDrawCount) || draftDrawCount <= 0) {
      setStatus("\u8bf7\u8bbe\u7f6e\u6b63\u786e\u7684\u62bd\u53d6\u4eba\u6570\u3002");
      return;
    }
    if (draftDrawCount > maxAllowed) {
      setStatus(`\u62bd\u53d6\u4eba\u6570\u4e0d\u80fd\u8d85\u8fc7 ${maxAllowed} \u4eba\u3002`);
      return;
    }
    const readyOk = await startEvent();
    if (!readyOk) {
      return;
    }
    setShowRoundSetup(false);
    setRoundPrizeId(draftPrizeId);
    setRoundDrawCount(draftDrawCount);
    const prizeLabel = selected ? `${selected.level} ${selected.name}` : LABELS.roundUnset;
    onRoundReady?.(draftDrawCount, prizeLabel);
  };

  const selectedPrize = prizes.find((item) => item.id === roundPrizeId) || null;

  return (
    <section className="card host-panel">
      <div className="host-panel-popover host-panel-popover--compact">
        <button
          className="host-panel-popover-trigger"
          type="button"
          aria-label={LABELS.pages}
          title={LABELS.pages}
        >
          <svg aria-hidden="true" viewBox="0 0 1024 1024" width="52" height="52">
            <path
              d="M563.192832 1024h-409.6A51.2 51.2 0 0 1 102.392832 972.8v-921.6A51.2 51.2 0 0 1 153.592832 0h569.685333a42.666667 42.666667 0 0 1 30.037334 12.288l155.989333 155.989333a42.666667 42.666667 0 0 1 12.288 30.037334V597.333333h-34.133333V198.314667a8.192 8.192 0 0 0-2.389334-5.802667l-155.989333-155.989333a8.192 8.192 0 0 0-5.802667-2.389334H153.592832a17.066667 17.066667 0 0 0-17.066667 17.066667v921.6a17.066667 17.066667 0 0 0 17.066667 17.066667h409.6z"
              fill="#4D4D4D"
            />
            <path
              d="M904.526165 204.8h-170.666666a17.066667 17.066667 0 0 1-17.066667-17.066667v-170.666666h34.133333V170.666667h153.6z"
              fill="#4D4D4D"
            />
            <path
              d="M204.792832 170.666667h443.733333v34.133333H204.792832zM204.792832 307.2h614.4v34.133333H204.792832zM204.792832 443.733333h614.4v34.133334H204.792832zM204.792832 580.266667h238.933333v34.133333H204.792832zM204.792832 716.8h204.8v34.133333H204.792832z"
              fill="#B3B3B3"
            />
            <path
              d="M892.238165 827.392a37.546667 37.546667 0 0 1 0-49.834667l24.576-27.306666a19.114667 19.114667 0 0 0 2.048-22.528l-40.96-72.021334a20.48 20.48 0 0 0-20.821333-9.557333l-35.84 7.509333a37.888 37.888 0 0 1-43.349333-25.258666l-11.605334-34.133334a19.114667 19.114667 0 0 0-18.090666-13.312h-82.944a19.114667 19.114667 0 0 0-18.432 13.312l-11.946667 34.133334a37.888 37.888 0 0 1-43.349333 24.917333l-35.84-7.509333a19.797333 19.797333 0 0 0-20.821334 9.216l-41.642666 71.68a19.114667 19.114667 0 0 0 2.389333 22.528l24.234667 27.648a37.546667 37.546667 0 0 1 0 49.834666l-24.234667 27.306667a19.114667 19.114667 0 0 0-2.389333 22.528l41.301333 72.021333a18.773333 18.773333 0 0 0 20.48 9.557334l36.181333-7.168a37.205333 37.205333 0 0 1 43.008 24.917333l11.605334 34.133333a19.114667 19.114667 0 0 0 18.432 13.312h82.944a19.797333 19.797333 0 0 0 18.432-13.312l11.605333-34.133333a37.546667 37.546667 0 0 1 41.984-24.576l34.133333 7.168a19.114667 19.114667 0 0 0 20.821334-9.216l41.642666-71.68a19.456 19.456 0 0 0-2.048-22.528z m-168.277333 46.421333a74.069333 74.069333 0 1 1 53.589333-54.613333 73.045333 73.045333 0 0 1-53.589333 54.613333z"
              fill="#05AFC8"
            />
          </svg>
        </button>
        <div className="host-panel-block host-panel-block--popover">
          <div className="host-panel-block-title">{LABELS.pages}</div>
          <div className="host-panel-links">
            <Link
              className="btn btn-ghost btn-small host-panel-link"
              href={`/events/new?edit=${eventId}`}
              target="_blank"
              rel="noreferrer"
            >
              {LABELS.edit}
            </Link>
            <Link
              className="btn btn-ghost btn-small host-panel-link"
              href={`/events/${eventId}/screen`}
              target="_blank"
              rel="noreferrer"
            >
              {LABELS.screen}
            </Link>
            <Link
              className="btn btn-ghost btn-small host-panel-link"
              href={`/events/${eventId}/results`}
              target="_blank"
              rel="noreferrer"
            >
              {LABELS.results}
            </Link>
          </div>
        </div>
      </div>
      <div className="host-panel-block host-panel-block--readonly">
        <div className="host-panel-section">
          <div className="host-panel-field">
            <div className="host-panel-label">{LABELS.drawPrize}</div>
            <div className="host-panel-value">
              {selectedPrize
                ? `${selectedPrize.level} - ${selectedPrize.name} - ${LABELS.remaining} ${selectedPrize.remainingCount}`
                : LABELS.roundUnset}
            </div>
          </div>
          <div className="host-panel-field">
            <div className="host-panel-label">{LABELS.drawCountLabel}</div>
            <div className="host-panel-value">
              {roundReady ? String(roundDrawCount) : LABELS.roundUnset}
            </div>
          </div>
        </div>
      </div>
      <div className="host-panel-block">
        <div className="host-panel-block-title">{LABELS.actions}</div>
        <div className="host-panel-actions">
          <button
            className="btn btn-ghost btn-small host-panel-action host-panel-action--emphasis"
            type="button"
            onClick={() => setShowLockConfirm(true)}
            disabled={loadingAction === "lock" || lockedReady}
          >
            {LABELS.lock}
          </button>
          <button
            className="btn btn-ghost btn-small host-panel-primary host-panel-action host-panel-action--emphasis"
            type="button"
            onClick={openRoundSetup}
            disabled={loadingAction === "start" || !lockedReady || stageState !== "ready"}
          >
            {LABELS.start}
          </button>
          {isDrawing ? (
            <button
              className="btn btn-primary btn-small host-panel-primary host-panel-action"
              type="button"
              onClick={stopDraw}
              disabled={!lockedReady || !roundReady || !canStopDraw}
            >
              {LABELS.stop}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-small host-panel-primary host-panel-action"
              type="button"
              onClick={startDraw}
              disabled={!lockedReady || !roundReady || !canStartDraw}
            >
              {LABELS.draw}
            </button>
          )}
          <button
            className="btn btn-ghost btn-small host-panel-action host-panel-action--emphasis"
            type="button"
            onClick={() => setShowConfirmRound(true)}
            disabled={
              loadingAction === "confirm" ||
              !lockedReady ||
              !roundReady ||
              !roundId ||
              !hasStopped ||
              !canConfirm
            }
          >
            {LABELS.confirm}
          </button>
          <button
            className="btn btn-ghost btn-small host-panel-action host-panel-action--emphasis"
            type="button"
            onClick={() => setShowRedrawConfirm(true)}
            disabled={loadingAction === "redraw" || !lockedReady || !roundReady || !canRedraw}
          >
            {LABELS.redraw}
          </button>
          <button
            className={`btn btn-ghost btn-small host-panel-action${soundEnabled ? "" : " host-panel-action--mute"}`}
            type="button"
            onClick={onToggleSound}
            disabled={isLoading}
            aria-label={soundEnabled ? LABELS.soundOn : LABELS.soundOff}
          >
            {soundEnabled ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M12.5 3.5 8.2 7H4.8a1.8 1.8 0 0 0-1.8 1.8v6.4A1.8 1.8 0 0 0 4.8 17h3.4l4.3 3.5a1 1 0 0 0 1.6-.8V4.3a1 1 0 0 0-1.6-.8Z" />
                <path d="M16.6 7.4a1 1 0 0 1 1.4 0c2.5 2.5 2.5 6.7 0 9.2a1 1 0 1 1-1.4-1.4 4.6 4.6 0 0 0 0-6.4 1 1 0 0 1 0-1.4Z" />
                <path d="M18.9 5.1a1 1 0 0 1 1.4 0c3.8 3.8 3.8 10 0 13.8a1 1 0 0 1-1.4-1.4 8.6 8.6 0 0 0 0-11 1 1 0 0 1 0-1.4Z" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M12.5 3.5 8.2 7H4.8a1.8 1.8 0 0 0-1.8 1.8v6.4A1.8 1.8 0 0 0 4.8 17h3.4l4.3 3.5a1 1 0 0 0 1.6-.8V4.3a1 1 0 0 0-1.6-.8Z" />
                <path d="M15.5 7.5a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 1 1-1.4 1.4l-5.6-5.6a1 1 0 0 1 0-1.4Z" />
                <path d="M22.5 7.5a1 1 0 0 1 0 1.4l-5.6 5.6a1 1 0 1 1-1.4-1.4l5.6-5.6a1 1 0 0 1 1.4 0Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {status ? <p className="hint">{status}</p> : null}
      {mounted && showLockConfirm
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setShowLockConfirm(false)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lock-confirm-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="lock-confirm-title">{LABELS.lockTitle}</h3>
                <ul className="lock-modal-list">
                  <li>{LABELS.lockLine1}</li>
                  <li>{LABELS.lockLine2}</li>
                  <li className="lock-modal-subtitle">{LABELS.lockNoteTitle}</li>
                </ul>
                <ul className="lock-modal-sublist">
                  <li>{LABELS.lockNoteCsv}</li>
                  <li>{LABELS.lockNoteCheckin}</li>
                  <li>{LABELS.lockNoteMixed}</li>
                </ul>
                <div className="host-modal-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setShowLockConfirm(false)}
                    disabled={isLoading}
                  >
                    {LABELS.cancel}
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={async () => {
                      setShowLockConfirm(false);
                      await lockEvent();
                    }}
                    disabled={loadingAction === "lock" || lockedReady}
                  >
                    {LABELS.confirmLock}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && showRoundSetup
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setShowRoundSetup(false)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="round-setup-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="round-setup-title" className="round-setup-title">
                  {LABELS.roundSetupTitle}
                </h3>
                <p className="round-setup-tip">{LABELS.roundSetupTip}</p>
                <div className="round-setup-grid">
                  <div className="round-setup-row">
                    <div className="round-setup-label">{LABELS.roundPrizeLabel}</div>
                    <div className="round-setup-control">
                      <select
                        value={draftPrizeId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setDraftPrizeId(nextId);
                          const selected = prizes.find((item) => item.id === nextId);
                          const maxAllowed = Math.max(
                            1,
                            Math.min(60, selected?.remainingCount ?? 1),
                          );
                          setDraftDrawCount((count) => Math.min(count, maxAllowed));
                        }}
                      >
                        {prizes.map((prize) => (
                          <option key={prize.id} value={prize.id}>
                            {prize.level} - {prize.name} - {LABELS.remaining} {prize.remainingCount}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="round-setup-row">
                    <div className="round-setup-label">{LABELS.roundCountLabel}</div>
                    <div className="round-setup-control round-setup-number">
                      {(() => {
                        const selected = prizes.find((item) => item.id === draftPrizeId);
                        const maxAllowed = Math.max(1, Math.min(60, selected?.remainingCount ?? 1));
                        return (
                          <>
                            <button
                              className="round-step"
                              type="button"
                              onClick={() => setDraftDrawCount(Math.max(1, draftDrawCount - 1))}
                              disabled={isLoading || draftDrawCount <= 1}
                              aria-label={LABELS.decreaseCount}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxAllowed}
                              value={draftDrawCount === 0 ? "" : draftDrawCount}
                              onChange={(e) => {
                                if (e.target.value === "") {
                                  setDraftDrawCount(0);
                                  return;
                                }
                                const nextValue = Number(e.target.value);
                                if (!Number.isFinite(nextValue)) return;
                                setDraftDrawCount(Math.min(maxAllowed, Math.max(1, nextValue)));
                              }}
                            />
                            <button
                              className="round-step"
                              type="button"
                              onClick={() => setDraftDrawCount(Math.min(maxAllowed, draftDrawCount + 1))}
                              disabled={isLoading || draftDrawCount >= maxAllowed}
                              aria-label={LABELS.increaseCount}
                            >
                              +
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="host-modal-actions round-setup-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setShowRoundSetup(false)}
                    disabled={isLoading}
                  >
                    {LABELS.cancel}
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={confirmRoundSetup}
                    disabled={isLoading}
                  >
                    {LABELS.roundConfirm}
                  </button>
                </div>
                {status ? <p className="hint">{status}</p> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && showConfirmRound
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setShowConfirmRound(false)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-round-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="confirm-round-title">{LABELS.confirmTitle}</h3>
                <p className="round-setup-tip">{LABELS.confirmTip}</p>
                <div className="host-modal-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setShowConfirmRound(false)}
                    disabled={isLoading}
                  >
                    {LABELS.cancel}
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={async () => {
                      setShowConfirmRound(false);
                      await confirmRound();
                    }}
                    disabled={isLoading}
                  >
                    {LABELS.confirm}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && showRedrawConfirm
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setShowRedrawConfirm(false)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="redraw-round-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="redraw-round-title">{LABELS.redrawTitle}</h3>
                <p className="round-setup-tip">{LABELS.redrawTip}</p>
                <div className="host-modal-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setShowRedrawConfirm(false)}
                    disabled={isLoading}
                  >
                    {LABELS.cancel}
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={async () => {
                      setShowRedrawConfirm(false);
                      await redrawRound();
                    }}
                    disabled={isLoading}
                  >
                    {LABELS.redraw}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && showAllDone
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setShowAllDone(false)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="all-done-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="all-done-title">奖品已全部抽完</h3>
                <p className="round-setup-tip">全部奖品已抽取完成，是否前往获奖结果页面？</p>
                <div className="host-modal-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => setShowAllDone(false)}
                  >
                    {LABELS.cancel}
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => {
                      setShowAllDone(false);
                      window.location.assign(`/events/${eventId}/results`);
                    }}
                  >
                    {LABELS.results}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && drawError
        ? createPortal(
            <div
              className="host-modal-backdrop"
              role="presentation"
              onClick={() => setDrawError(null)}
            >
              <div
                className="host-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="draw-error-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="draw-error-title">抽取提示</h3>
                <p className="round-setup-tip">{drawError}</p>
                <div className="host-modal-actions">
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => setDrawError(null)}
                  >
                    我知道了
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
