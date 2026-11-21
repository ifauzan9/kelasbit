"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";

export function PythonEditor({
  value,
  onChange,
  onRun,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
  }, [onChange, onRun]);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          basicSetup,
          python(),
          oneDark,
          indentUnit.of("    "),
          EditorView.contentAttributes.of({
            "aria-label": "Editor kode Python",
          }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onRunRef.current();
                return true;
              },
            },
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px" },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            },
            ".cm-content": { padding: "10px 0" },
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current === value) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`h-[360px] w-full overflow-hidden bg-[#282c34] ${className}`}
    />
  );
}
