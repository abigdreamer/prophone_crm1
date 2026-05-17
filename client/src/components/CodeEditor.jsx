import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, highlightSpecialChars, ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from "@codemirror/commands";
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from "@codemirror/language";
import { html, htmlLanguage } from "@codemirror/lang-html";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { tags } from "@lezer/highlight";

// ── VS Code-inspired dark theme ────────────────────────────────────────────────
const vsCodeTheme = EditorView.theme({
  "&": {
    color: "#d4d4d4",
    backgroundColor: "#0d1117",
    height: "100%",
    fontSize: "13px",
    fontFamily: "'Fira Code','Cascadia Code','Consolas','Courier New',monospace",
  },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "20px",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "#569cd6",
  },
  ".cm-focused": { outline: "none" },
  ".cm-editor.cm-focused": { outline: "none" },
  ".cm-gutters": {
    backgroundColor: "#0d1117",
    color: "#495162",
    border: "none",
    borderRight: "1px solid #21262d",
    minWidth: "48px",
  },
  ".cm-gutter.cm-lineNumbers": { minWidth: "40px" },
  ".cm-lineNumbers .cm-gutterElement": {
    paddingLeft: "8px",
    paddingRight: "8px",
  },
  ".cm-activeLine": { backgroundColor: "#1a1f2e" },
  ".cm-activeLineGutter": { backgroundColor: "#1a1f2e", color: "#7e8a9a" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "#264f78 !important" },
  ".cm-cursor": { borderLeftColor: "#569cd6", borderLeftWidth: "2px" },
  ".cm-matchingBracket": {
    backgroundColor: "#3a3d41",
    outline: "1px solid #888",
    borderRadius: "2px",
  },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px", cursor: "pointer" },
  ".cm-tooltip": {
    backgroundColor: "#252526",
    border: "1px solid #454545",
    borderRadius: "4px",
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li": {
      fontFamily: "'Fira Code','Consolas','Courier New',monospace",
      fontSize: "12px",
      padding: "4px 8px",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: "#094771",
      color: "#d4d4d4",
    },
  },
  ".cm-completionIcon": { paddingRight: "6px" },
  ".cm-completionIcon-keyword": { color: "#c586c0" },
  ".cm-completionIcon-property": { color: "#9cdcfe" },
  ".cm-completionIcon-type": { color: "#4ec9b0" },
}, { dark: true });

// ── VS Code HTML syntax highlighting ──────────────────────────────────────────
const vsCodeHighlight = HighlightStyle.define([
  { tag: tags.processingInstruction, color: "#808080" },
  { tag: tags.comment,               color: "#6a9955", fontStyle: "italic" },
  { tag: tags.tagName,               color: "#569cd6" },
  { tag: tags.angleBracket,          color: "#808080" },
  { tag: tags.attributeName,         color: "#9cdcfe" },
  { tag: tags.attributeValue,        color: "#ce9178" },
  { tag: tags.string,                color: "#ce9178" },
  { tag: tags.content,               color: "#d4d4d4" },
  { tag: tags.keyword,               color: "#c586c0" },
  { tag: tags.propertyName,          color: "#9cdcfe" },
  { tag: tags.number,                color: "#b5cea8" },
  { tag: tags.className,             color: "#4ec9b0" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.operator,              color: "#d4d4d4" },
  { tag: tags.punctuation,           color: "#d4d4d4" },
  { tag: tags.special(tags.string),  color: "#d7ba7d" },
  { tag: tags.url,                   color: "#3794ff", textDecoration: "underline" },
  { tag: tags.meta,                  color: "#569cd6" },
]);

// ── Merge tag autocomplete ─────────────────────────────────────────────────────
const mergeTags = [
  { label: "{{firstName}}",    type: "variable",  detail: "Contact first name" },
  { label: "{{lastName}}",     type: "variable",  detail: "Contact last name"  },
  { label: "{{fullName}}",     type: "variable",  detail: "Full name"          },
  { label: "{{email}}",        type: "variable",  detail: "Contact email"      },
  { label: "{{company}}",      type: "variable",  detail: "Company name"       },
];

const commonSnippets = [
  { label: "div",       type: "keyword", apply: "<div></div>",             detail: "Block element" },
  { label: "p",         type: "keyword", apply: "<p></p>",                 detail: "Paragraph" },
  { label: "a href",    type: "keyword", apply: '<a href="#"></a>',         detail: "Link" },
  { label: "img",       type: "keyword", apply: '<img src="" alt="" />',    detail: "Image" },
  { label: "table",     type: "keyword", apply: "<table><tr><td></td></tr></table>", detail: "Table" },
  { label: "style",     type: "keyword", apply: 'style=""',                 detail: "Inline style" },
  { label: "button",    type: "keyword", apply: '<a href="#" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Button</a>', detail: "Email button" },
];

function mergeTagCompletion(context) {
  const word = context.matchBefore(/\{\{[a-zA-Z]*/);
  if (!word) return null;
  return {
    from: word.from,
    options: mergeTags.map(t => ({ ...t, boost: 99 })),
  };
}

function htmlSnippetCompletion(context) {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: commonSnippets };
}

// ── Main component ─────────────────────────────────────────────────────────────
const CodeEditor = forwardRef(function CodeEditor({ value, onChange, readOnly = false }, ref) {
  const containerRef = useRef(null);
  const viewRef      = useRef(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  // Expose insertText(text) for parent components to insert at cursor
  useImperativeHandle(ref, () => ({
    insertText(text) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    },
  }), []);

  // Stable update listener
  const updateListener = useCallback(
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString());
      }
    }),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value ?? "",
      extensions: [
        // Theme & appearance
        vsCodeTheme,
        syntaxHighlighting(vsCodeHighlight),

        // Language
        html({ matchClosingTags: true, autoCloseTags: true }),

        // Line numbers + gutter
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),

        // Editor behaviour
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        highlightSpecialChars(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),

        // Autocomplete
        autocompletion({
          override: [mergeTagCompletion, htmlSnippetCompletion],
          defaultKeymap: true,
        }),

        // Keymaps
        keymap.of([
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),

        // Change listener
        updateListener,

        // Read-only guard
        EditorView.editable.of(!readOnly),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // mount once

  // Sync external value changes without resetting cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value ?? "" },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
    />
  );
});

export default CodeEditor;
