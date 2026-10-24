import { AlignLeft, ArrowDown, ArrowUp, CalendarRange, CheckSquare, ChevronRight, Code2, Columns2, Copy, File, FileText, Globe, Hash, Image, Images, LayoutTemplate, Link2, List, ListOrdered, ListTree, MessageSquare, Minus, Music, Quote, RefreshCw, Sigma, Table2, Trash2, Video } from 'lucide-react';
const icons: Record<string, typeof FileText> = { paragraph:AlignLeft,bullet:List,numbered:ListOrdered,task:CheckSquare,quote:Quote,callout:MessageSquare,toggle:ChevronRight,code:Code2,divider:Minus,image:Image,'image-gallery':Images,table:Table2,columns:Columns2,'columns-3':Columns2,'columns-4':Columns2,file:File,audio:Music,video:Video,'web-card':Globe,equation:Sigma,'inline-equation':Sigma,toc:ListTree,timeline:CalendarRange,synced:RefreshCw,copy:Copy,duplicate:Copy,delete:Trash2,'block-link':Link2,'move-up':ArrowUp,'move-down':ArrowDown,comment:MessageSquare };
export function BlockIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = /^h[1-9]$/.test(id) ? Hash : id.startsWith('template') ? LayoutTemplate : icons[id] || FileText;
  return <span className="docs-block-icon"><Icon size={size}/>{/^h[1-9]$/.test(id) && <small>{id[1]}</small>}</span>;
}
