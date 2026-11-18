/**
 * Projector: townies and rumors up at the same time. Townies in a column on
 * the left, the Rumor Mill board (smaller, BOTH_RUMORS_PER_PAGE per page)
 * on the right.
 */

import type { DisplayableNpc } from '../../../components/display/NpcDisplayRow';
import { RumorBoard, type RumorMillConfig } from '../../rumor-mill';
import type { Rumor } from '@mtp/lib/rumors';
import { BOTH_RUMORS_PER_PAGE } from '../screenMode';
import { TownieColumn } from './TownieColumn';
import '../big-screen.css';

interface Props {
  showId: string;
  npcs: DisplayableNpc[];
  rumorConfig: RumorMillConfig;
  open: boolean;
  joinUrl: string;
  townieTitle: string;
  demoRumors?: Rumor[];
}

export function CombinedScreen({ showId, npcs, rumorConfig, open, joinUrl, townieTitle, demoRumors }: Props) {
  return (
    <div className="combined-screen">
      <TownieColumn npcs={npcs} title={townieTitle} />
      <RumorBoard
        showId={showId}
        config={rumorConfig}
        open={open}
        joinUrl={joinUrl}
        demoRumors={demoRumors}
        pageSize={BOTH_RUMORS_PER_PAGE}
        variant="side"
      />
    </div>
  );
}
