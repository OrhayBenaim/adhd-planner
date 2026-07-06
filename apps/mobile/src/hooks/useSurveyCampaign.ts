import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { SurveyCampaign } from "@adhd-planner/types";
import { posthog } from "../lib/posthog";
import { formatSurveyRewardCelebration } from "../lib/surveyRewards";

interface UseSurveyCampaignOptions {
  onRewardGranted?: (message: string) => void;
  forcedCampaignId?: Id<"surveyCampaigns"> | null;
}

export function useSurveyCampaign({
  onRewardGranted,
  forcedCampaignId = null,
}: UseSurveyCampaignOptions = {}) {
  const pendingCampaign = useQuery(api.surveys.getPendingCampaign);
  const deferAsTask = useMutation(api.surveys.deferAsTask);
  const dismissDeferredTask = useMutation(api.surveys.dismissDeferredTask);

  const [dismissedCampaignId, setDismissedCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const [activeCampaignId, setActiveCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const celebratedRef = useRef<string | null>(null);

  const campaign: SurveyCampaign | null | undefined = pendingCampaign;

  const overlayVisible =
    !!campaign &&
    !activeCampaignId &&
    (forcedCampaignId
      ? campaign._id === forcedCampaignId
      : dismissedCampaignId !== campaign._id);

  const rewardStatus = useQuery(
    api.surveys.getRewardStatus,
    activeCampaignId ? { campaignId: activeCampaignId } : "skip",
  );

  const openSurvey = useCallback((c: SurveyCampaign) => {
    setActiveCampaignId(c._id as Id<"surveyCampaigns">);
    posthog.capture("survey_campaign_opened", {
      campaign_id: c._id,
      survey_id: c.posthogSurveyId,
    });
    posthog.capture("survey_invite_started", { campaign_id: c._id });
  }, []);

  const handleStart = useCallback(() => {
    if (!campaign) return;
    openSurvey(campaign);
  }, [campaign, openSurvey]);

  const handleDefer = useCallback(async () => {
    if (!campaign) return;
    posthog.capture("survey_invite_deferred", { campaign_id: campaign._id });
    await deferAsTask({ campaignId: campaign._id as Id<"surveyCampaigns"> });
    setDismissedCampaignId(campaign._id as Id<"surveyCampaigns">);
  }, [campaign, deferAsTask]);

  const handleDismissOverlay = useCallback(() => {
    if (!campaign) return;
    setDismissedCampaignId(campaign._id as Id<"surveyCampaigns">);
  }, [campaign]);

  const handleSurveyTaskPress = useCallback(
    (taskCampaignId: string, posthogSurveyId: string) => {
      setActiveCampaignId(taskCampaignId as Id<"surveyCampaigns">);
      posthog.capture("survey_campaign_opened", {
        campaign_id: taskCampaignId,
        survey_id: posthogSurveyId,
      });
    },
    [],
  );

  useEffect(() => {
    if (!rewardStatus || rewardStatus.rewardStatus !== "granted") return;
    const key = `${rewardStatus.campaignId}:${rewardStatus.completedAt}`;
    if (celebratedRef.current === key) return;
    celebratedRef.current = key;

    const message = formatSurveyRewardCelebration(
      rewardStatus.rewardType,
      rewardStatus.rewardAmount,
    );
    onRewardGranted?.(message);

    void dismissDeferredTask({ campaignId: rewardStatus.campaignId }).catch(
      () => undefined,
    );
  }, [rewardStatus, onRewardGranted, dismissDeferredTask]);

  return {
    campaign,
    overlayVisible,
    handleStart,
    handleDefer,
    handleDismissOverlay,
    handleSurveyTaskPress,
    openSurvey,
  };
}
