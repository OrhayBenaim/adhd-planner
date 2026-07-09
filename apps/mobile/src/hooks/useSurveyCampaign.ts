import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { SurveyCampaign } from "@adhd-planner/types";
import { formatSurveyRewardCelebration } from "../lib/surveyRewards";
import { track } from "../lib/analytics";

interface UseSurveyCampaignOptions {
  onRewardGranted?: (message: string) => void;
  forcedCampaignId?: Id<"surveyCampaigns"> | null;
  /** Clears push-notification force flag when invite is dismissed or deferred */
  onInviteHandled?: () => void;
}

export function useSurveyCampaign({
  onRewardGranted,
  forcedCampaignId = null,
  onInviteHandled,
}: UseSurveyCampaignOptions = {}) {
  const pendingCampaign = useQuery(api.surveys.getPendingCampaign);
  const dismissDeferredTask = useMutation(api.surveys.dismissDeferredTask);

  const [dismissedCampaignId, setDismissedCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const [remindLaterCampaignId, setRemindLaterCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const [formCampaign, setFormCampaign] = useState<SurveyCampaign | null>(null);
  const [activeCampaignId, setActiveCampaignId] =
    useState<Id<"surveyCampaigns"> | null>(null);
  const celebratedRef = useRef<string | null>(null);

  const campaign: SurveyCampaign | null | undefined = pendingCampaign;

  const rewardStatus = useQuery(
    api.surveys.getRewardStatus,
    activeCampaignId ? { campaignId: activeCampaignId } : "skip",
  );

  const grantedCampaignId =
    rewardStatus?.rewardStatus === "granted" ? rewardStatus.campaignId : null;

  const overlayVisible =
    !!campaign &&
    !formCampaign &&
    dismissedCampaignId !== campaign._id &&
    remindLaterCampaignId !== campaign._id &&
    grantedCampaignId !== campaign._id &&
    (!forcedCampaignId || forcedCampaignId === campaign._id);

  const reminderVisible =
    !!campaign &&
    !formCampaign &&
    remindLaterCampaignId === campaign._id &&
    dismissedCampaignId !== campaign._id &&
    grantedCampaignId !== campaign._id;

  const formVisible = formCampaign !== null;

  const dismissInvite = useCallback(
    (campaignId: Id<"surveyCampaigns">) => {
      setDismissedCampaignId(campaignId);
      onInviteHandled?.();
    },
    [onInviteHandled],
  );

  const openSurveyForm = useCallback(
    (c: SurveyCampaign) => {
      dismissInvite(c._id as Id<"surveyCampaigns">);
      setRemindLaterCampaignId(null);
      setActiveCampaignId(c._id as Id<"surveyCampaigns">);
      setFormCampaign(c);
      track("survey_invite_started", { campaign_id: c._id });
    },
    [dismissInvite],
  );

  const closeSurveyForm = useCallback(() => {
    setFormCampaign(null);
  }, []);

  const handleStart = useCallback(() => {
    if (!campaign) return;
    openSurveyForm(campaign);
  }, [campaign, openSurveyForm]);

  const handleDefer = useCallback(() => {
    if (!campaign) return;
    track("survey_invite_deferred", { campaign_id: campaign._id });
    setRemindLaterCampaignId(campaign._id as Id<"surveyCampaigns">);
    dismissInvite(campaign._id as Id<"surveyCampaigns">);
  }, [campaign, dismissInvite]);

  const handleDismissOverlay = useCallback(() => {
    if (!campaign) return;
    dismissInvite(campaign._id as Id<"surveyCampaigns">);
  }, [campaign, dismissInvite]);

  const handleDismissReminder = useCallback(() => {
    if (!campaign) return;
    dismissInvite(campaign._id as Id<"surveyCampaigns">);
    setRemindLaterCampaignId(null);
  }, [campaign, dismissInvite]);

  const handleFormSubmitted = useCallback(() => {
    // activeCampaignId already set when form opened — reward query stays subscribed
  }, []);

  useEffect(() => {
    if (!rewardStatus || rewardStatus.rewardStatus !== "granted") return;
    const key = `${rewardStatus.campaignId}:${rewardStatus.completedAt}`;
    if (celebratedRef.current === key) return;
    celebratedRef.current = key;

    onRewardGranted?.(
      formatSurveyRewardCelebration(
        rewardStatus.rewardType,
        rewardStatus.rewardAmount,
      ),
    );

    void dismissDeferredTask({ campaignId: rewardStatus.campaignId }).catch(
      () => undefined,
    );
  }, [rewardStatus, onRewardGranted, dismissDeferredTask]);

  return {
    campaign,
    overlayVisible,
    reminderVisible,
    formVisible,
    formCampaign,
    handleStart,
    handleDefer,
    handleDismissOverlay,
    handleDismissReminder,
    openSurveyForm,
    closeSurveyForm,
    handleFormSubmitted,
  };
}
