import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Modal } from "./Modal";
import { searchTemplates } from "./templates";
import { insertFeatureBlocks } from "./featureCommands";

export function TemplateGallery({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState(""), [category, setCategory] = useState("All");
  const [selected, setSelected] = useState("meeting"), [error, setError] = useState("");
  const choices = searchTemplates(query, category);
  const template = choices.find(choice => choice.id === selected) || choices[0];
  return <Modal title="Template gallery" onClose={onClose} className="template-gallery">
    <p>Insert a starting point at the end of this document. Existing text and comments are kept.</p>
    <input autoFocus aria-label="Search templates" placeholder="Search templates..." value={query} onChange={event => setQuery(event.target.value)}/>
    <div className="template-categories" role="group" aria-label="Template categories">
      {["All", "Meetings", "Planning", "Updates"].map(value => <button type="button" key={value}
        aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}
    </div>
    <div className="template-grid">
      {choices.map(choice => <button type="button" key={choice.id} className="template-card"
        aria-pressed={template?.id === choice.id} onClick={() => setSelected(choice.id)}>
        <span className="template-mini-page" aria-hidden="true"><b/>{[0, 1, 2, 3].map(line => <i key={line}/>)}</span>
        <strong>{choice.name}</strong><span>{choice.description}</span><small>{choice.category}</small>
      </button>)}
      {!choices.length && <p role="status">No templates match this search.</p>}
    </div>
    {error && <p role="alert" className="feature-error">{error}</p>}
    <footer className="feature-dialog-actions"><button type="button" onClick={onClose}>Cancel</button>
      <button type="button" className="primary" disabled={!template} onClick={() => {
        if (!template) return;
        try {
          if (!insertFeatureBlocks(editor, template.content, true)) throw new Error("Return to editing mode to insert a template.");
          onClose();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Template could not be inserted."); }
      }}>Insert {template?.name || "template"}</button></footer>
  </Modal>;
}
