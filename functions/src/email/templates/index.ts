export { renderCharacterSaved, type CharacterSavedData } from './characterSaved';

// Stub render functions — fill these in when the Notebook page and next-show
// announcement features are built.
export function renderNotebookReady(_data: Record<string, unknown>): never {
  throw new Error('notebook-ready template not yet implemented');
}

export function renderNextShowAnnouncement(_data: Record<string, unknown>): never {
  throw new Error('next-show-announcement template not yet implemented');
}

export type EmailTemplate =
  | 'character-saved'
  | 'notebook-ready'
  | 'next-show-announcement';
