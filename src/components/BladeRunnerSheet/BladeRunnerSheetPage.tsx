import { SystemConfigProvider } from '../../contexts/SystemConfigProvider';
import BladeRunnerSheet from './BladeRunnerSheet';

export default function BladeRunnerSheetPage() {
  return (
    <SystemConfigProvider systemId="blade-runner-rpg">
      <BladeRunnerSheet />
    </SystemConfigProvider>
  );
}
