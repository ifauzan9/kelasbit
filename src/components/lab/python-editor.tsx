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
  blockCopyPaste = false,
  onBlocked,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  blockCopyPaste?: boolean;
  onBlocked?: (reason: "copy" | "cut" | "paste" | "drop" | "contextmenu") => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const initialBlockCopyPasteRef = useRef(blockCopyPaste);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const blockCopyPasteRef = useRef(blockCopyPaste);
  const onBlockedRef = useRef(onBlocked);
  const lastKeyAtRef = useRef(0);

  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
    blockCopyPasteRef.current = blockCopyPaste;
    onBlockedRef.current = onBlocked;
  }, [onChange, onRun, blockCopyPaste, onBlocked]);

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
            autocomplete: "off",
            autocorrect: "off",
            autocapitalize: "off",
            spellcheck: "false",
            "data-gramm": "false",
            "data-gramm_editor": "false",
            "data-enable-grammarly": "false",
            ...(initialBlockCopyPasteRef.current
              ? { "data-copy-lock": "true" }
              : {}),
          }),
          EditorView.domEventHandlers({
            keydown: (event) => {
              if (!blockCopyPasteRef.current) return false;
              if (
                event.key.length === 1 ||
                event.key === "Backspace" ||
                event.key === "Delete" ||
                event.key === "Enter" ||
                event.key === "Tab"
              ) {
                lastKeyAtRef.current = performance.now();
              }
              return false;
            },
            beforeinput: (event) => {
              if (!blockCopyPasteRef.current) return false;
              const inputEvent = event as InputEvent;
              const inputType = String(inputEvent.inputType ?? "");
              if (
                inputType === "insertFromPaste" ||
                inputType === "insertFromDrop" ||
                inputType === "insertFromYank" ||
                inputType === "insertReplacementText" ||
                inputType === "deleteByCut" ||
                inputType === "deleteByDrag"
              ) {
                event.preventDefault();
                onBlockedRef.current?.(
                  inputType.includes("Cut") || inputType.includes("Drag")
                    ? "cut"
                    : "paste",
                );
                return true;
              }

              // Keyboard HP kadang menyisipkan clipboard sebagai insertText,
              // bukan paste. Blokir insert multi-karakter tanpa keydown baru.
              if (
                (inputType === "insertText" ||
                  inputType === "insertCompositionText") &&
                typeof inputEvent.data === "string"
              ) {
                const inserted = inputEvent.data;
                const looksLikeBulkInsert =
                  inserted.includes("\n") ||
                  inserted.includes("\r") ||
                  inserted.length > 2;
                const noRecentKeydown =
                  performance.now() - lastKeyAtRef.current > 800;

                if (looksLikeBulkInsert && noRecentKeydown) {
                  event.preventDefault();
                  onBlockedRef.current?.("paste");
                  return true;
                }
              }

              return false;
            },
            paste: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              onBlockedRef.current?.("paste");
              return true;
            },
            copy: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              onBlockedRef.current?.("copy");
              return true;
            },
            cut: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              onBlockedRef.current?.("cut");
              return true;
            },
            drop: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              onBlockedRef.current?.("drop");
              return true;
            },
            dragover: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              return true;
            },
            contextmenu: (event) => {
              if (!blockCopyPasteRef.current) return false;
              event.preventDefault();
              onBlockedRef.current?.("contextmenu");
              return true;
            },
          }),
          keymap.of([
            {
              key: "Mod-c",
              run: () => {
                if (!blockCopyPasteRef.current) return false;
                onBlockedRef.current?.("copy");
                return true;
              },
            },
            {
              key: "Mod-x",
              run: () => {
                if (!blockCopyPasteRef.current) return false;
                onBlockedRef.current?.("cut");
                return true;
              },
            },
            {
              key: "Mod-v",
              run: () => {
                if (!blockCopyPasteRef.current) return false;
                onBlockedRef.current?.("paste");
                return true;
              },
            },
            {
              key: "Shift-Insert",
              run: () => {
                if (!blockCopyPasteRef.current) return false;
                onBlockedRef.current?.("paste");
                return true;
              },
            },
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
            ".cm-content[data-copy-lock='true']": {
              WebkitTouchCallout: "none",
            },
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
