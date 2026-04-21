import { SystemConfigProvider } from '../../contexts/SystemConfigProvider';
import BladeRunnerCreator from './BladeRunnerCreator';

export default function BladeRunnerCreationPage() {
  return (
    <SystemConfigProvider systemId="blade-runner-rpg">
      <BladeRunnerCreator />
    </SystemConfigProvider>
  );
}
