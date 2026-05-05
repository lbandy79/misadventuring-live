/**
 * EncounterVote — Phase 3c thin wrapper.
 *
 * The real implementation lives in `lib/components/VoteSubmission`. This
 * file remains so existing AudienceView imports keep working. It pulls
 * the active showId from ShowProvider so writes carry provenance.
 */

import { VoteSubmission } from '../lib/components';
import { useShowOptional } from '../lib/shows';
import type { VoteOption } from '../lib/types/interaction.types';

interface VoteConfig {
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  sessionId?: string;
  /** If the active interaction already has a showId, prefer it. */
  showId?: string;
}

interface EncounterVoteProps {
  config: VoteConfig;
}

export default function EncounterVote({ config }: EncounterVoteProps) {
  const { showId: providerShowId } = useShowOptional();
  return (
    <VoteSubmission
      question={config.question}
      options={config.options}
      isOpen={config.isOpen}
      timer={config.timer}
      startedAt={config.startedAt}
      sessionId={config.sessionId}
      showId={config.showId ?? providerShowId}
    />
  );
}
