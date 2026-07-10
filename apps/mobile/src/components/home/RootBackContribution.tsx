import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthFlowView } from "../../lib/authFlow";
import type { ProfileSubView } from "../../lib/rootBackAction";

export interface RootBackContribution {
  profileSubView?: ProfileSubView;
  profileAuthView?: AuthFlowView;
  settingsVoiceExpanded?: boolean;
  authGoBack?: () => void;
  profileToMain?: () => void;
  collapseVoiceLanguages?: () => void;
}

interface RootBackContributionContextValue {
  contribution: RootBackContribution;
  setContribution: (id: string, patch: RootBackContribution | null) => void;
}

const RootBackContributionContext =
  createContext<RootBackContributionContextValue | null>(null);

function mergeContributions(
  map: Record<string, RootBackContribution>,
): RootBackContribution {
  return Object.values(map).reduce<RootBackContribution>(
    (acc, part) => ({ ...acc, ...part }),
    {},
  );
}

/**
 * Collects sheet-local back state (Profile sub-views, Settings expansion)
 * so the Home root back handler can build a resolveBackAction snapshot.
 */
export function RootBackContributionProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Record<string, RootBackContribution>>({});

  const setContribution = useCallback((id: string, patch: RootBackContribution | null) => {
    setParts((prev) => {
      if (patch == null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: patch };
    });
  }, []);

  const contribution = useMemo(() => mergeContributions(parts), [parts]);

  const value = useMemo(
    () => ({ contribution, setContribution }),
    [contribution, setContribution],
  );

  return (
    <RootBackContributionContext.Provider value={value}>
      {children}
    </RootBackContributionContext.Provider>
  );
}

export function useRootBackContribution() {
  const ctx = useContext(RootBackContributionContext);
  if (!ctx) {
    throw new Error("useRootBackContribution must be used within RootBackContributionProvider");
  }
  return ctx;
}

/** Register sheet-local back state under a stable id for as long as deps change. */
export function useRegisterRootBackContribution(
  id: string,
  patch: RootBackContribution,
) {
  const ctx = useContext(RootBackContributionContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setContribution(id, patch);
    return () => ctx.setContribution(id, null);
  }, [
    ctx,
    id,
    patch.profileSubView,
    patch.profileAuthView,
    patch.settingsVoiceExpanded,
    patch.authGoBack,
    patch.profileToMain,
    patch.collapseVoiceLanguages,
  ]);
}
