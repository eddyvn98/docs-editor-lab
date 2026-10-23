import type { JSONContent } from "@tiptap/core";
export type DocumentTemplate = { id: string; name: string; description: string; category: string; content: JSONContent[] };
const text = (value: string): JSONContent => ({ type: "text", text: value });
const paragraph = (value = ""): JSONContent => ({ type: "paragraph", content: value ? [text(value)] : [] });
const heading = (value: string, level = 2): JSONContent => ({ type: "heading", attrs: { level }, content: [text(value)] });
const bullets = (values: string[]): JSONContent => ({ type: "bulletList", content: values.map(value => ({ type: "listItem", content: [paragraph(value)] })) });
const tasks = (values: string[]): JSONContent => ({ type: "taskList", content: values.map(value => ({ type: "taskItem", attrs: { checked: false }, content: [paragraph(value)] })) });
const callout = (value: string): JSONContent => ({ type: "callout", content: [paragraph(value)] });
const table = (rows: string[][]): JSONContent => ({ type: "table", content: rows.map((cells, index) => ({
  type: "tableRow", content: cells.map(value => ({ type: index ? "tableCell" : "tableHeader", content: [paragraph(value)] })),
})) });
export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  { id: "meeting", name: "Meeting Notes", category: "Meetings", description: "Agenda, decisions and clearly owned follow-up actions.", content: [
    heading("Meeting Notes"), paragraph("Date: ____   Participants: ____"), callout("Purpose: what decision or outcome do we need?"),
    heading("Agenda", 3), bullets(["Topic and expected outcome", "Questions to resolve"]),
    heading("Decisions", 3), paragraph("Record the decision, reasoning and any constraints."),
    heading("Action items", 3), table([["Action", "Owner", "Due date"], ["Next action", "Name", "Date"]]),
    { type: "toggleBlock", attrs: { title: "Background and references", open: true }, content: [paragraph("Add supporting details here.")] },
  ] },
  { id: "brief", name: "Project brief", category: "Planning", description: "Goal, scope, success criteria and delivery milestones.", content: [
    heading("Project brief"), callout("Goal: describe the change this project should create."),
    { type: "columns", content: [
      { type: "column", content: [heading("In scope", 3), bullets(["Primary deliverable", "Acceptance criteria"])] },
      { type: "column", content: [heading("Out of scope", 3), bullets(["Explicit exclusion", "Dependency to confirm"])] },
    ] },
    heading("Milestones", 3), table([["Milestone", "Owner", "Target"], ["Discovery", "Name", "Date"], ["Delivery", "Name", "Date"]]),
    heading("Risks and assumptions", 3), paragraph("State assumptions, open questions and the owner of each risk."),
  ] },
  { id: "decision", name: "Decision record", category: "Planning", description: "Make alternatives and trade-offs easy to review later.", content: [
    heading("Decision record"), callout("Status: Proposed. Owner: ____. Review date: ____."),
    heading("Context", 3), paragraph("What problem are we solving, and what constraints apply?"),
    heading("Options", 3), table([["Option", "Benefits", "Trade-offs"], ["Option A", "", ""], ["Option B", "", ""]]),
    heading("Decision and reasoning", 3), paragraph("Explain why the chosen option fits the constraints."),
    heading("Follow-up", 3), tasks(["Validate the assumptions", "Share the decision with affected people"]),
  ] },
  { id: "weekly", name: "Weekly update", category: "Updates", description: "A readable status update with next steps and blockers.", content: [
    heading("Weekly Report"), paragraph("Week of: ____   Owner: ____"),
    heading("Summary", 3), callout("Overall status and the most important change this week."),
    heading("Completed", 3), bullets(["Outcome delivered", "Evidence or reference"]),
    heading("Next week", 3), tasks(["Priority one", "Priority two"]),
    heading("Needs attention", 3), table([["Blocker", "Impact", "Help needed"], ["Issue", "Impact", "Decision or owner"]]),
  ] },
  { id: "plan", name: "Project Plan", category: "Planning", description: "Plan outcomes, activities and responsibilities.", content: [
    heading("Project Plan"), callout("Objective: define a measurable outcome."), heading("Workstreams",3),
    table([["Workstream","Owner","Due"],["Discovery","",""],["Delivery","",""]]),
    heading("Milestones",3), tasks(["Confirm scope","Review risks","Ship the result"])
  ] },
  { id: "swot", name: "SWOT Mind Map", category: "Planning", description: "Strengths, weaknesses, opportunities and threats.", content: [
    heading("SWOT Mind Map"), table([["Strengths","Weaknesses"],["What works?","Where are the gaps?"],["Opportunities","Threats"],["What can improve?","What could block progress?"]])
  ] },
  { id: "implementation", name: "Project Planning and Implementation", category: "Planning", description: "Delivery plan, milestones and review checkpoints.", content: [
    heading("Project Planning and Implementation"), heading("Objectives",3),paragraph("Describe the intended outcome."),
    heading("Implementation schedule",3),table([["Phase","Action","Owner"],["Plan","",""],["Implement","",""],["Verify","",""]]),
    heading("Review",3),tasks(["Check milestones","Record lessons learned"])
  ] },
  { id: "checklist", name: "Review checklist", category: "Meetings", description: "A reusable checklist with a place for review notes.", content: [
    heading("Review checklist"), tasks(["Confirm the goal and scope", "Check the evidence", "Review edge cases", "Record the decision"]),
    heading("Review notes", 3), paragraph(),
  ] },
];
export function searchTemplates(query: string, category = "All") {
  const term = query.trim().toLocaleLowerCase();
  return DOCUMENT_TEMPLATES.filter(template => (category === "All" || template.category === category)
    && `${template.name} ${template.description}`.toLocaleLowerCase().includes(term));
}
