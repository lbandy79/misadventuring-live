import { SystemConfigProvider } from '../../contexts/SystemConfigProvider';
import MotWCreator from './MotWCreator';

export default function MotWCreationPage() {
  return (
    <SystemConfigProvider systemId="monster-of-the-week">
      <MotWCreator />
    </SystemConfigProvider>
  );
}
