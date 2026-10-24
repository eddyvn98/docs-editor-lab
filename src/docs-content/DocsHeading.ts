import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
/** h7-h9 retain semantic outline levels while exporting valid HTML headings. */
export const DocsHeading = Node.create({
  name: 'heading', group: 'block', content: 'inline*', defining: true,
  addAttributes() { return { level: { default: 1, rendered: false } }; },
  parseHTML() { return [1, 2, 3, 4, 5, 6].map(level => ({ tag: `h${level}`, getAttrs: (element: HTMLElement) => ({ level: Math.min(9, Math.max(1, Number(element.getAttribute('data-heading-level')) || level)) }) })); },
  renderHTML({ node, HTMLAttributes }) {
    const level = Math.min(9, Math.max(1, Number(node.attrs.level) || 1));
    return [`h${Math.min(6, level)}`, mergeAttributes(HTMLAttributes, { 'data-heading-level': level, ...(level > 6 ? { role: 'heading', 'aria-level': level } : {}) }), 0];
  },
  addCommands() { return {
    setHeading: attributes => ({ commands }) => commands.setNode(this.name, { level: attributes.level }),
    toggleHeading: attributes => ({ commands }) => commands.toggleNode(this.name, 'paragraph', { level: attributes.level }),
  }; },
  addKeyboardShortcuts() { return Object.fromEntries([1, 2, 3, 4, 5, 6].map(level => [`Mod-Alt-${level}`, () => this.editor.commands.toggleNode('heading', 'paragraph', { level })])); },
  addInputRules() { return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => textblockTypeInputRule({ find: new RegExp(`^(#{${level}})\\s$`), type: this.type, getAttributes: { level } })); },
});
