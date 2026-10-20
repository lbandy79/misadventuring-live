interface Props {
  message: string | null;
  canUndo: boolean;
  onUndo: () => void;
  isError?: boolean;
}

export default function UndoToast({ message, canUndo, onUndo, isError }: Props) {
  return (
    <div className="wis-toast-wrap" role="status" aria-live="polite">
      {message && (
        <div className={`wis-toast ${isError ? 'wis-toast--error' : ''}`}>
          <span>{message}</span>
          {canUndo && (
            <button type="button" className="wis-btn wis-btn--small" onClick={onUndo}>
              Undo <kbd>Z</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
