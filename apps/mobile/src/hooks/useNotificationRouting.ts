import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";

function readSurveyCampaignId(
  data: Record<string, unknown> | undefined,
): Id<"surveyCampaigns"> | null {
  if (!data || data.type !== "survey") return null;
  const campaignId = data.campaignId;
  return typeof campaignId === "string"
    ? (campaignId as Id<"surveyCampaigns">)
    : null;
}

export function useNotificationRouting(
  onSurveyCampaign: (campaignId: Id<"surveyCampaigns">) => void,
) {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content
        .data as Record<string, unknown> | undefined;
      const campaignId = readSurveyCampaignId(data);
      if (!campaignId) return;
      if (handledRef.current === campaignId) return;
      handledRef.current = campaignId;
      onSurveyCampaign(campaignId);
    };

    const sub = Notifications.addNotificationResponseReceivedListener(
      handleResponse,
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handleResponse(response);
    });

    return () => sub.remove();
  }, [onSurveyCampaign]);
}
