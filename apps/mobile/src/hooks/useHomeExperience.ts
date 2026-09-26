import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { Task } from "@adhd-planner/types";

import { useSurveyCampaign } from "./useSurveyCampaign";
import { useNotificationRouting } from "./useNotificationRouting";
import { useQueryTime } from "./useQueryTime";
import { getLocalToday } from "../lib/dateTimeConvert";
import {
  UNSCORED_BANNER_DELAY_MS,
  hasUnscoredTasks,
  pickTaskForMood,
  resolveBannerVisibility,
  type AiPickOutcome,
  type BannerVisibility,
} from "../lib/homeExperience";

const SURVEY_REWARD_TOAST_MS = 3500;

export interface HomeExperience {
  aiPickDaysAhead: number;
  ceilingStatus:
    | { atCeiling: false }
    | { atCeiling: true; reason: string }
    | undefined;
  creditBalance: number | undefined;
  banner: BannerVisibility;
  survey: ReturnType<typeof useSurveyCampaign>;
  surveyRewardToast: string | null;
  /** `completedTaskId` is never picked, even before the task list reflects it. */
  evaluateAiPick: (moodLevel: number, completedTaskId?: string) => AiPickOutcome;
}

export function useHomeExperience(tasks: readonly Task[]): HomeExperience {
  const nowMs = useQueryTime();
  const ceilingStatus = useQuery(api.ai.getCeilingStatus, { nowMs });
  const creditBalance = useQuery(api.credits.getMyBalance);
  const aiPickDaysAhead =
    useQuery(api.appConfig.getPublic, { key: "aiPickDaysAhead" }) ?? 7;

  const [forcedSurveyCampaignId, setForcedSurveyCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const [surveyRewardToast, setSurveyRewardToast] = useState<string | null>(null);

  const survey = useSurveyCampaign({
    forcedCampaignId: forcedSurveyCampaignId,
    onRewardGranted: (message) => setSurveyRewardToast(message),
    onInviteHandled: () => setForcedSurveyCampaignId(null),
  });

  useNotificationRouting(
    useCallback((campaignId) => {
      setForcedSurveyCampaignId(campaignId);
    }, []),
  );

  const hasUnscored = useMemo(() => hasUnscoredTasks(tasks), [tasks]);
  const [showUnscoredBanner, setShowUnscoredBanner] = useState(false);
  const unscoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasUnscored) {
      if (unscoredTimerRef.current) clearTimeout(unscoredTimerRef.current);
      unscoredTimerRef.current = null;
      setShowUnscoredBanner(false);
      return;
    }
    unscoredTimerRef.current = setTimeout(() => {
      setShowUnscoredBanner(true);
    }, UNSCORED_BANNER_DELAY_MS);
    return () => {
      if (unscoredTimerRef.current) clearTimeout(unscoredTimerRef.current);
    };
  }, [hasUnscored]);

  useEffect(() => {
    if (!surveyRewardToast) return;
    const timer = setTimeout(() => setSurveyRewardToast(null), SURVEY_REWARD_TOAST_MS);
    return () => clearTimeout(timer);
  }, [surveyRewardToast]);

  const banner = useMemo(
    () =>
      resolveBannerVisibility({
        atCeiling: ceilingStatus?.atCeiling === true,
        ceilingReason:
          ceilingStatus?.atCeiling === true ? ceilingStatus.reason : undefined,
        showUnscoredBanner,
      }),
    [ceilingStatus, showUnscoredBanner],
  );

  const evaluateAiPick = useCallback(
    (moodLevel: number, completedTaskId?: string): AiPickOutcome =>
      pickTaskForMood({
        tasks,
        moodLevel,
        completedTaskId,
        today: getLocalToday(),
        daysAhead: aiPickDaysAhead,
      }),
    [tasks, aiPickDaysAhead],
  );

  return {
    aiPickDaysAhead,
    ceilingStatus,
    creditBalance,
    banner,
    survey,
    surveyRewardToast,
    evaluateAiPick,
  };
}
