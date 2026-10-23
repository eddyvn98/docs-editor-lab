import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";

const starterContent = `
  <h1>Product planning notes</h1>
  <p>Select text, hover a block, or right-click content to explore the editor.</p>
  <h2>Today</h2>
  <ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Review the editor interactions</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Collect feedback</p></div></li></ul>
  <blockquote><p>Keep each action close to the content it affects.</p></blockquote>
  <p><a href="https://example.com">Reference link</a></p>
  <pre><code>const focused = true;</code></pre>
  <table><tbody><tr><th><p>Item</p></th><th><p>Status</p></th></tr><tr><td><p>Selection toolbar</p></td><td><p>Ready to improve</p></td></tr></tbody></table>
  <p>Use / on a blank line to add a block.</p>
`;

export default function App() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Link.configure({ openOnClick: false }),
      Image,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: starterContent,
    immediatelyRender: false,
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="crumb">Documents</span><span className="slash">/</span><strong>Product planning notes</strong></div>
        <div className="save-state"><span className="save-dot" /> All changes saved</div>
      </header>
      <section className="page">
        <div className="page-meta"><span>Workspace</span><span>Updated just now</span></div>
        <h1 className="document-title">Product planning notes</h1>
        <p className="document-hint">Select text or point to a block. Contextual controls will appear beside the content.</p>
        <div className="editor-frame"><EditorContent editor={editor} /></div>
      </section>
    </main>
  );
}
