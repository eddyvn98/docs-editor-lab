import { ModalSurface } from './ModalSurface';
const entries = [
  ['Ctrl / Cmd + B', 'Bold'], ['Ctrl / Cmd + I', 'Italic'], ['Ctrl / Cmd + U', 'Underline'],
  ['Ctrl / Cmd + K', 'Edit a link'], ['Ctrl / Cmd + Shift + M', 'Comment on selection'],
  ['Ctrl / Cmd + F', 'Find and replace; reveal folded sections'], ['Shift + F10', 'Current block actions'],
  ['Ctrl / Cmd + Shift + P', 'Insert a block'], ['Ctrl / Cmd + /', 'This keyboard guide'],
  ['Ctrl / Cmd + Z', 'Undo'], ['Ctrl / Cmd + Shift + Z', 'Redo'],
  ['/', 'Search block types on an empty paragraph'], ['Escape', 'Close the active menu, panel or dialog'],
  ['Arrow keys / Enter', 'Navigate and choose menu commands'], ['Double-click image', 'Open the image viewer'],
];
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return <ModalSurface title="Keyboard shortcuts" onClose={onClose}>
    <p className="dialog-hint">Use Cmd on macOS, Ctrl on Windows or Linux. Shortcuts apply while editing the document.</p>
    <dl className="shortcut-grid">{entries.map(([key, text]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{text}</dd></div>)}</dl>
  </ModalSurface>;
}
