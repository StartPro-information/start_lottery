"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HostClient from "./host-client";
import DrawStage from "./draw-stage";
import type {
  AlignEffect,
  DealEffect,
  MotionEffect,
  RevealEffect,
  ScatterEffect,
} from "./draw-stage.types";

type Participant = {
  id: string;
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


function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

function getRandomIndex(max: number) {
  if (max <= 0) return 0;
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function getRandomFloat() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}

function pickRandom<T>(list: T[]) {
  if (list.length === 0) {
    throw new Error("pickRandom requires a non-empty list");
  }
  return list[getRandomIndex(list.length)];
}

const DEAL_EFFECTS: DealEffect[] = ["drop", "fan", "burst"];
const SCATTER_EFFECTS: ScatterEffect[] = ["linear", "arc", "wave"];
const ALIGN_EFFECTS: AlignEffect[] = ["smooth", "snap", "bounce"];
const MOTION_EFFECTS: MotionEffect[] = [
  "bounce",
  "orbit",
  "swirl",
  "sphere",
  "ring",
  "magnet",
  "wheel",
  "waterfall",
];
const REVEAL_EFFECTS: RevealEffect[] = ["classic"];
const MOTION_EFFECT_DURATIONS: Record<MotionEffect, { min: number; max: number }> = {
  bounce: { min: 2200, max: 3000 },
  orbit: { min: 2800, max: 4000 },
  swirl: { min: 2500, max: 3500 },
  sphere: { min: 3000, max: 4200 },
  ring: { min: 3000, max: 4000 },
  magnet: { min: 3000, max: 4000 },
  wheel: { min: 3000, max: 4200 },
  waterfall: { min: 3200, max: 4500 },
};
const MOTION_SWITCH_DELAY_MS = 3200;

function getMotionDuration(effect: MotionEffect) {
  const { min, max } = MOTION_EFFECT_DURATIONS[effect];
  return Math.round(min + getRandomFloat() * (max - min));
}

export default function HostStage({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<"idle" | "deal" | "dealt" | "scatter" | "align">("idle");
  const [stageState, setStageState] = useState<
    "idle" | "dealing" | "ready" | "scatter" | "align" | "stopped" | "exit"
  >("idle");
  const [shuffleKey, setShuffleKey] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>(["display_name"]);
  const [stopSignal, setStopSignal] = useState(0);
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [hasDealtOnce, setHasDealtOnce] = useState(false);
  const [drawCount, setDrawCount] = useState<number | null>(null);
  const [roundPrizeLabel, setRoundPrizeLabel] = useState<string>("");
  const [roundWinnerIds, setRoundWinnerIds] = useState<string[]>([]);
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [exitActive, setExitActive] = useState(false);
  const [exitNonce, setExitNonce] = useState(0);
  const [exitedWinnerIds, setExitedWinnerIds] = useState<string[]>([]);
  const [demotedWinnerIds, setDemotedWinnerIds] = useState<string[]>([]);
  const [dealEffect, setDealEffect] = useState<DealEffect>("drop");
  const [scatterEffect, setScatterEffect] = useState<ScatterEffect>("linear");
  const [alignEffect, setAlignEffect] = useState<AlignEffect>("smooth");
  const [motionEffect, setMotionEffect] = useState<MotionEffect>("bounce");
  const [revealEffect, setRevealEffect] = useState<RevealEffect>("classic");
  const exitTimerRef = useRef<number | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const stopTimerRef = useRef<number | null>(null);
  const [stopReady, setStopReady] = useState(false);
  const isDrawing = stageState === "align";
  const drawDelayTimerRef = useRef<number | null>(null);
  const motionSwitchTimerRef = useRef<number | null>(null);
  const motionSwitchDelayRef = useRef<number | null>(null);
  const lastMotionEffectRef = useRef<MotionEffect>(motionEffect);
  const stageStateRef = useRef(stageState);

  useEffect(() => {
    stageStateRef.current = stageState;
  }, [stageState]);

  useEffect(() => {
    lastMotionEffectRef.current = motionEffect;
  }, [motionEffect]);

  const pickNextMotionEffect = useCallback((previous?: MotionEffect) => {
    if (MOTION_EFFECTS.length === 0) {
      return "bounce";
    }
    if (!previous || MOTION_EFFECTS.length === 1) {
      return pickRandom(MOTION_EFFECTS);
    }
    let next = previous;
    let guard = 6;
    while (next === previous && guard > 0) {
      next = MOTION_EFFECTS[getRandomIndex(MOTION_EFFECTS.length)];
      guard -= 1;
    }
    return next;
  }, []);

  const clearMotionSwitchTimers = useCallback(() => {
    if (motionSwitchTimerRef.current) {
      window.clearTimeout(motionSwitchTimerRef.current);
      motionSwitchTimerRef.current = null;
    }
    if (motionSwitchDelayRef.current) {
      window.clearTimeout(motionSwitchDelayRef.current);
      motionSwitchDelayRef.current = null;
    }
  }, []);

  const scheduleMotionSwitch = useCallback(
    (currentEffect: MotionEffect) => {
      const duration = getMotionDuration(currentEffect);
      motionSwitchTimerRef.current = window.setTimeout(() => {
        if (stageStateRef.current !== "align") return;
        const next = pickNextMotionEffect(lastMotionEffectRef.current);
        setMotionEffect(next);
        lastMotionEffectRef.current = next;
        scheduleMotionSwitch(next);
      }, duration);
    },
    [pickNextMotionEffect],
  );

  const fetchParticipants = useCallback(async () => {
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }
    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}/participants?status=eligible`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("participants fetch failed");
      }
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
      return true;
    } catch {
      return false;
    }
  }, [eventId]);

  const loadEvent = useCallback(async () => {
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    try {
      const res = await fetch(`${getBaseUrl()}/events/${eventId}`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      setIsLocked(Boolean(data.locked));
      if (data.locked) {
        setHasDealtOnce(true);
      }
      return true;
    } catch {
      return false;
    }
  }, [eventId]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    fetch(`${getBaseUrl()}/events/${eventId}`, {
      headers,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.requiredFields) && data.requiredFields.length > 0) {
          setRequiredFields(data.requiredFields);
        }
      })
      .catch(() => null);
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (isLocked && hasDealtOnce && stageState === "idle") {
      setPhase("dealt");
      setStageState("ready");
    }
  }, [isLocked, hasDealtOnce, stageState]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    if (stageState !== "align") {
      clearMotionSwitchTimers();
      return;
    }
    clearMotionSwitchTimers();
    motionSwitchDelayRef.current = window.setTimeout(() => {
      if (stageStateRef.current !== "align") return;
      const next = pickNextMotionEffect(lastMotionEffectRef.current);
      setMotionEffect(next);
      lastMotionEffectRef.current = next;
      scheduleMotionSwitch(next);
    }, MOTION_SWITCH_DELAY_MS);
    return () => {
      clearMotionSwitchTimers();
    };
  }, [stageState, clearMotionSwitchTimers, pickNextMotionEffect, scheduleMotionSwitch]);

  return (
    <div className="host-layout">
      <DrawStage
        phase={phase}
        participants={participants}
        shuffleKey={shuffleKey}
        requiredFields={requiredFields}
        stopSignal={stopSignal}
        isLocked={isLocked}
        drawCount={drawCount ?? undefined}
        roundPrizeLabel={roundPrizeLabel}
        winnerIds={roundWinnerIds}
        selectedWinnerIds={selectedWinnerIds}
        exitActive={exitActive}
        exitNonce={exitNonce}
        exitedWinnerIds={exitedWinnerIds}
        demotedWinnerIds={demotedWinnerIds}
        dealEffect={dealEffect}
        scatterEffect={scatterEffect}
        alignEffect={alignEffect}
        motionEffect={motionEffect}
        revealEffect={revealEffect}
        soundEnabled={soundEnabled}
        onStopAnimationComplete={() => {
          setConfirmReady(true);
        }}
        onToggleWinner={(id) =>
          setSelectedWinnerIds((prev) =>
            prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
          )
        }
        onDealComplete={() => {
          setPhase("dealt");
          setStageState("ready");
          setHasDealtOnce(true);
        }}
      />
      <div className="host-controls">
        <HostClient
          eventId={eventId}
          isDrawing={isDrawing}
          isLocked={isLocked}
          stageState={stageState}
          confirmReady={confirmReady}
          stopReady={stopReady}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((value) => !value)}
          onLockEvent={() => {
            setShuffleKey((value) => value + 1);
            if (!hasDealtOnce) {
              setDealEffect(pickRandom(DEAL_EFFECTS));
              setPhase("deal");
              setStageState("dealing");
            } else {
              setStageState("ready");
            }
            loadEvent();
            setConfirmReady(false);
            setStopReady(false);
          }}
          onStartEvent={() => {
            if (stageState !== "ready" && stageState !== "idle") return;
            setScatterEffect(pickRandom(SCATTER_EFFECTS));
            setPhase("scatter");
            setStageState("scatter");
            setConfirmReady(false);
            setStopReady(false);
          }}
          onDrawEvent={() => {
            setConfirmReady(false);
            setStopReady(false);
            setAlignEffect(pickRandom(ALIGN_EFFECTS));
            const nextMotion = pickNextMotionEffect(lastMotionEffectRef.current);
            setMotionEffect(nextMotion);
            lastMotionEffectRef.current = nextMotion;
            setRevealEffect(pickRandom(REVEAL_EFFECTS));
            if (drawDelayTimerRef.current) {
              window.clearTimeout(drawDelayTimerRef.current);
            }
            drawDelayTimerRef.current = window.setTimeout(() => {
              setPhase("align");
              setStageState("align");
              if (stopTimerRef.current) {
                window.clearTimeout(stopTimerRef.current);
              }
              stopTimerRef.current = window.setTimeout(() => {
                setStopReady(true);
                stopTimerRef.current = null;
              }, 5000);
              drawDelayTimerRef.current = null;
            }, 1000);
          }}
          onRedrawEvent={() => {
            setShuffleKey((value) => value + 1);
            setAlignEffect(pickRandom(ALIGN_EFFECTS));
            const nextMotion = pickNextMotionEffect(lastMotionEffectRef.current);
            setMotionEffect(nextMotion);
            lastMotionEffectRef.current = nextMotion;
            setRevealEffect(pickRandom(REVEAL_EFFECTS));
            setPhase("align");
            setStageState("align");
            setConfirmReady(false);
            setStopReady(false);
            if (stopTimerRef.current) {
              window.clearTimeout(stopTimerRef.current);
            }
            stopTimerRef.current = window.setTimeout(() => {
              setStopReady(true);
              stopTimerRef.current = null;
            }, 5000);
          }}
          onStopDraw={() => {
            if (stageState !== "align") return;
            if (confirmTimerRef.current) {
              window.clearTimeout(confirmTimerRef.current);
              confirmTimerRef.current = null;
            }
            if (drawDelayTimerRef.current) {
              window.clearTimeout(drawDelayTimerRef.current);
              drawDelayTimerRef.current = null;
            }
            if (stopTimerRef.current) {
              window.clearTimeout(stopTimerRef.current);
              stopTimerRef.current = null;
            }
            clearMotionSwitchTimers();
            setStopSignal((value) => value + 1);
            setStageState("stopped");
            setConfirmReady(false);
            setStopReady(false);
            confirmTimerRef.current = window.setTimeout(() => {
              setConfirmReady(true);
              confirmTimerRef.current = null;
            }, 5000);
          }}
          onRoundReady={(count, prizeLabel) => {
            if (drawDelayTimerRef.current) {
              window.clearTimeout(drawDelayTimerRef.current);
              drawDelayTimerRef.current = null;
            }
            if (exitTimerRef.current) {
              window.clearTimeout(exitTimerRef.current);
              exitTimerRef.current = null;
            }
            if (confirmTimerRef.current) {
              window.clearTimeout(confirmTimerRef.current);
              confirmTimerRef.current = null;
            }
            if (stopTimerRef.current) {
              window.clearTimeout(stopTimerRef.current);
              stopTimerRef.current = null;
            }
            setDrawCount(count);
            setRoundPrizeLabel(prizeLabel);
            setRoundWinnerIds([]);
            setSelectedWinnerIds([]);
            setExitedWinnerIds([]);
            setDemotedWinnerIds([]);
            setExitActive(false);
            setStageState("ready");
            setConfirmReady(false);
            setStopReady(false);
          }}
          onRoundCreated={(winners) => {
            if (drawDelayTimerRef.current) {
              window.clearTimeout(drawDelayTimerRef.current);
              drawDelayTimerRef.current = null;
            }
            if (exitTimerRef.current) {
              window.clearTimeout(exitTimerRef.current);
              exitTimerRef.current = null;
            }
            if (confirmTimerRef.current) {
              window.clearTimeout(confirmTimerRef.current);
              confirmTimerRef.current = null;
            }
            if (stopTimerRef.current) {
              window.clearTimeout(stopTimerRef.current);
              stopTimerRef.current = null;
            }
            const ids = winners.map((winner) => winner.participantId);
            setRoundWinnerIds(ids);
            setSelectedWinnerIds(ids);
            setExitedWinnerIds([]);
            setDemotedWinnerIds([]);
            setExitActive(false);
            setConfirmReady(false);
            setStopReady(false);
          }}
          onConfirmComplete={() => {
            if (drawDelayTimerRef.current) {
              window.clearTimeout(drawDelayTimerRef.current);
              drawDelayTimerRef.current = null;
            }
            if (exitTimerRef.current) {
              window.clearTimeout(exitTimerRef.current);
            }
            if (confirmTimerRef.current) {
              window.clearTimeout(confirmTimerRef.current);
              confirmTimerRef.current = null;
            }
            if (stopTimerRef.current) {
              window.clearTimeout(stopTimerRef.current);
              stopTimerRef.current = null;
            }
            const selectedSet = new Set(selectedWinnerIds);
            setDemotedWinnerIds(roundWinnerIds.filter((id) => !selectedSet.has(id)));
            setExitNonce((value) => value + 1);
            setExitActive(true);
            setStageState("exit");
            setConfirmReady(false);
            setStopReady(false);
            exitTimerRef.current = window.setTimeout(() => {
              setExitActive(false);
              setExitedWinnerIds(selectedWinnerIds);
              setStageState("idle");
              exitTimerRef.current = null;
            }, 2200);
          }}
          selectedWinnerIds={selectedWinnerIds}
        />
      </div>
    </div>
  );
}
