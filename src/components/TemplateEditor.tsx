"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALIGN_OPTIONS,
  ELEMENT_TYPES,
  FONT_OPTIONS,
  IMAGE_FIT_OPTIONS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PLACEHOLDER_HINTS,
  SAMPLE_DATA,
  TemplateElement,
  createElement,
  resolvePlaceholders,
} from "@/lib/templates";

type EditorProps = {
  templateId?: string;
  initialName: string;
  initialElements: TemplateElement[];
  defaultTemplateId?: string | null;
  isNew?: boolean;
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origX: number;
  origY: number;
};

const FONT_CSS: Record<string, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  "Helvetica-Bold": "Helvetica, Arial, sans-serif",
  "Helvetica-Oblique": "Helvetica, Arial, sans-serif",
  "Times-Roman": "'Times New Roman', Times, serif",
  "Times-Bold": "'Times New Roman', Times, serif",
  "Times-Italic": "'Times New Roman', Times, serif",
  Courier: "'Courier New', Courier, monospace",
  "Courier-Bold": "'Courier New', Courier, monospace",
};

function isBold(font?: string) {
  return !!font && font.includes("Bold");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function TemplateEditor({
  templateId,
  initialName,
  initialElements,
  defaultTemplateId,
  isNew,
}: EditorProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [elements, setElements] = useState<TemplateElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const [saving, setSaving] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>(templateId);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const dragRef = useRef<DragState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = elements.find((e) => e.id === selectedId) || null;

  useLayoutEffect(() => {
    function measure() {
      const el = canvasWrapRef.current;
      if (!el) return;
      const available = el.clientWidth - 40;
      setScale(clamp(available / PAGE_WIDTH, 0.3, 0.95));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const s = scaleRef.current;
    const dx = (e.clientX - d.startX) / s;
    const dy = (e.clientY - d.startY) / s;
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== d.id) return el;
        if (d.mode === "move") {
          return {
            ...el,
            x: clamp(Math.round(d.origX + dx), 0, PAGE_WIDTH),
            y: clamp(Math.round(d.origY + dy), 0, PAGE_HEIGHT),
          };
        }
        return {
          ...el,
          w: Math.max(10, Math.round(d.origX + dx)),
          h: Math.max(6, Math.round(d.origY + dy)),
        };
      })
    );
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }, [onDragMove]);

  function beginDrag(
    e: React.PointerEvent,
    el: TemplateElement,
    mode: "move" | "resize"
  ) {
    e.preventDefault();
    if (mode === "resize") e.stopPropagation();
    setSelectedId(el.id);
    dragRef.current = {
      id: el.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: mode === "move" ? el.x : el.w,
      origY: mode === "move" ? el.y : el.h,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }

  function updateSelected(patch: Partial<TemplateElement>) {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...patch } : el))
    );
  }

  function addElement(type: (typeof ELEMENT_TYPES)[number]) {
    const el = createElement(type);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...selected, id: `${selected.id}_copy_${Date.now().toString(36)}`, x: selected.x + 16, y: selected.y + 16 };
    setElements((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function moveSelected(direction: "up" | "down") {
    if (!selectedId) return;
    setElements((prev) => {
      const index = prev.findIndex((e) => e.id === selectedId);
      if (index < 0) return prev;
      const target = direction === "up" ? index + 1 : index - 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function insertPlaceholder(token: string) {
    if (!selected || selected.type !== "text") return;
    const ta = textareaRef.current;
    const content = selected.content || "";
    if (ta && document.activeElement === ta) {
      const start = ta.selectionStart ?? content.length;
      const end = ta.selectionEnd ?? content.length;
      const next = content.slice(0, start) + token + content.slice(end);
      updateSelected({ content: next });
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + token.length;
      });
    } else {
      updateSelected({ content: content + token });
    }
  }

  function onImageUpload(file: File | null) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage("Image is too large (max ~1.5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateSelected({ src: String(reader.result || "") });
    reader.onerror = () => setMessage("Could not read image file.");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!name.trim()) {
      setMessage("Please enter a template name.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = { name: name.trim(), elements };
      const url = currentId ? `/api/templates/${currentId}` : "/api/templates";
      const method = currentId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      if (!currentId && data.id) {
        setCurrentId(data.id);
        router.replace(`/templates/${data.id}/edit`);
      }
      setMessage("Saved.");
    } catch {
      setMessage("Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function setAsDefault() {
    if (!currentId) return;
    setSavingDefault(true);
    try {
      await fetch("/api/templates/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId }),
      });
      setMessage("Set as default.");
      router.refresh();
    } finally {
      setSavingDefault(false);
    }
  }

  return (
    <div className="template-editor">
      <div className="editor-toolbar">
        <div className="editor-toolbar-group">
          <span className="editor-toolbar-label">Add</span>
          {ELEMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addElement(t)}
            >
              {t === "items" ? "Items table" : t === "totals" ? "Totals" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="editor-toolbar-group">
          <input
            type="text"
            className="template-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
          />
          {currentId && (
            <a
              className="btn btn-ghost btn-sm"
              href={`/api/templates/${currentId}/preview`}
              target="_blank"
              rel="noreferrer"
            >
              Preview PDF
            </a>
          )}
          {currentId && defaultTemplateId !== currentId && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={setAsDefault}
              disabled={savingDefault}
            >
              {savingDefault ? "…" : "Set as default"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : isNew && !currentId ? "Create template" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-canvas-wrap" ref={canvasWrapRef}>
          <div
            className="editor-page"
            style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
            onPointerDown={() => setSelectedId(null)}
          >
            <div
              className="editor-page-inner"
              style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  onPointerDown={(e) => beginDrag(e, el, "move")}
                  onResizePointerDown={(e) => beginDrag(e, el, "resize")}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="editor-properties">
          {!selected ? (
            <div className="properties-empty">
              <h3>Template</h3>
              <p>Pick an element to edit its content, position, and style. Drag to move, drag the corner to resize.</p>
              <p className="muted">{elements.length} elements</p>
            </div>
          ) : (
            <div className="properties-panel">
              <div className="properties-head">
                <h3>{selected.type}</h3>
                <div className="properties-head-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveSelected("up")} title="Bring forward">↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveSelected("down")} title="Send backward">↓</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={duplicateSelected} title="Duplicate">⧉</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={removeSelected} title="Delete">✕</button>
                </div>
              </div>

              {selected.type === "text" && (
                <>
                  <Field label="Content">
                    <textarea
                      ref={textareaRef}
                      value={selected.content || ""}
                      onChange={(e) => updateSelected({ content: e.target.value })}
                      rows={4}
                      placeholder="Text… use {{placeholders}}"
                    />
                  </Field>
                  <Field label="Insert placeholder">
                    <div className="placeholder-chips">
                      {PLACEHOLDER_HINTS.map((p) => (
                        <button
                          key={p.token}
                          type="button"
                          className="chip"
                          onClick={() => insertPlaceholder(p.token)}
                          title={p.label}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {(selected.type === "text" || selected.type === "items" || selected.type === "totals") && (
                <>
                  <div className="properties-row">
                    <Field label="Font">
                      <select
                        value={selected.font}
                        onChange={(e) => updateSelected({ font: e.target.value as TemplateElement["font"] })}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Size">
                      <input
                        type="number"
                        min="6"
                        max="72"
                        value={selected.fontSize}
                        onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <Field label="Color">
                    <ColorInput value={selected.color || "#0f172a"} onChange={(v) => updateSelected({ color: v })} />
                  </Field>
                </>
              )}

              {selected.type === "text" && (
                <Field label="Align">
                  <div className="segmented">
                    {ALIGN_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={selected.align === a ? "active" : ""}
                        onClick={() => updateSelected({ align: a })}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {(selected.type === "line" || selected.type === "rect") && (
                <>
                  <Field label="Stroke color">
                    <ColorInput value={selected.strokeColor || "#94a3b8"} onChange={(v) => updateSelected({ strokeColor: v })} />
                  </Field>
                  <Field label="Stroke width">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selected.strokeWidth}
                      onChange={(e) => updateSelected({ strokeWidth: Number(e.target.value) })}
                    />
                  </Field>
                </>
              )}

              {selected.type === "rect" && (
                <Field label="Fill color">
                  <ColorInput value={selected.fillColor || "#e2e8f0"} onChange={(v) => updateSelected({ fillColor: v })} allowNone />
                </Field>
              )}

              {selected.type === "image" && (
                <>
                  <Field label="Image">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => onImageUpload(e.target.files?.[0] ?? null)}
                    />
                  </Field>
                  {selected.src && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => updateSelected({ src: "" })}
                    >
                      Remove image
                    </button>
                  )}
                  <Field label="Fit">
                    <select
                      value={selected.fit || "contain"}
                      onChange={(e) => updateSelected({ fit: e.target.value as TemplateElement["fit"] })}
                    >
                      {IMAGE_FIT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f === "contain" ? "Contain (keep ratio)" : "Stretch (fill box)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="muted small">PNG or JPEG. The file is embedded in the template.</p>
                </>
              )}

              {selected.type === "stamp" && (
                <>
                  <Field label="Text">
                    <input
                      type="text"
                      value={selected.content || ""}
                      onChange={(e) => updateSelected({ content: e.target.value })}
                      placeholder="PAID"
                    />
                  </Field>
                  <Field label="Color">
                    <ColorInput
                      value={selected.color || "#c70d3a"}
                      onChange={(v) => updateSelected({ color: v, strokeColor: v })}
                    />
                  </Field>
                  <div className="properties-row">
                    <Field label="Size">
                      <input
                        type="number"
                        min="8"
                        max="96"
                        value={selected.fontSize ?? 28}
                        onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Angle">
                      <input
                        type="number"
                        min="-90"
                        max="90"
                        value={selected.angle ?? -18}
                        onChange={(e) => updateSelected({ angle: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <Field label="Border width">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selected.strokeWidth ?? 3}
                      onChange={(e) => updateSelected({ strokeWidth: Number(e.target.value) })}
                    />
                  </Field>
                  <p className="muted small">Tip: use {"{{invoice.status}}"} as the text for a dynamic stamp.</p>
                </>
              )}

              <div className="properties-row">
                <Field label="X">
                  <input type="number" value={Math.round(selected.x)} onChange={(e) => updateSelected({ x: Number(e.target.value) })} />
                </Field>
                <Field label="Y">
                  <input type="number" value={Math.round(selected.y)} onChange={(e) => updateSelected({ y: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="properties-row">
                <Field label="Width">
                  <input type="number" value={Math.round(selected.w)} onChange={(e) => updateSelected({ w: Number(e.target.value) })} />
                </Field>
                <Field label="Height">
                  <input type="number" value={Math.round(selected.h)} onChange={(e) => updateSelected({ h: Number(e.target.value) })} />
                </Field>
              </div>

              <p className="muted small">Tip: drag on the page to move, drag the corner handle to resize.</p>
            </div>
          )}
        </aside>
      </div>

      {message && <div className="editor-message">{message}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="property-field">
      <span className="property-label">{label}</span>
      {children}
    </label>
  );
}

function ColorInput({
  value,
  onChange,
  allowNone,
}: {
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  const isNone = allowNone && (value === "none" || value === "");
  return (
    <div className="color-input">
      <input
        type="color"
        value={isNone ? "#ffffff" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isNone}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {allowNone && (
        <button
          type="button"
          className={isNone ? "btn btn-sm active" : "btn btn-ghost btn-sm"}
          onClick={() => onChange(isNone ? "#e2e8f0" : "none")}
        >
          {isNone ? "None" : "Fill"}
        </button>
      )}
    </div>
  );
}

function ElementView({
  el,
  selected,
  onPointerDown,
  onResizePointerDown,
}: {
  el: TemplateElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
}) {
  const common = {
    position: "absolute" as const,
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
  };
  const ring = selected ? { outline: "2px solid #0d9488", outlineOffset: "1px" } : undefined;

  if (el.type === "text") {
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          fontFamily: FONT_CSS[el.font || "Helvetica"],
          fontSize: el.fontSize,
          fontWeight: isBold(el.font) ? 700 : 400,
          color: el.color,
          textAlign: el.align,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          lineHeight: 1.3,
        }}
      >
        {resolvePlaceholders(el.content || "", SAMPLE_DATA) || (
          <span style={{ opacity: 0.4 }}>(empty)</span>
        )}
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  if (el.type === "line") {
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          height: Math.max(el.strokeWidth || 1, 2),
          background: el.strokeColor || "#94a3b8",
          marginTop: ((el.h || 0) - (el.strokeWidth || 1)) / 2,
        }}
      >
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  if (el.type === "rect") {
    const noFill = !el.fillColor || el.fillColor === "none";
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          background: noFill ? "transparent" : el.fillColor,
          border: `${el.strokeWidth}px solid ${el.strokeColor || "#94a3b8"}`,
          opacity: noFill && (!el.strokeColor || el.strokeColor === "none") ? 0.3 : 1,
        }}
      >
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  if (el.type === "items") {
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          display: "flex",
          flexDirection: "column",
          fontSize: el.fontSize,
          color: el.color,
          fontFamily: FONT_CSS[el.font || "Helvetica"],
        }}
      >
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700, fontSize: (el.fontSize || 9) - 1 }}>
          <span style={{ flex: "0 0 50%" }}>DESCRIPTION</span>
          <span style={{ flex: "0 0 12%", textAlign: "right" }}>QTY</span>
          <span style={{ flex: "0 0 16%", textAlign: "right" }}>RATE</span>
          <span style={{ flex: "0 0 17%", textAlign: "right" }}>AMOUNT</span>
        </div>
        {SAMPLE_DATA.items.map((item, i) => (
          <div key={i} style={{ display: "flex", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ flex: "0 0 50%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</span>
            <span style={{ flex: "0 0 12%", textAlign: "right" }}>{item.quantity}</span>
            <span style={{ flex: "0 0 16%", textAlign: "right" }}>{item.unitPrice}</span>
            <span style={{ flex: "0 0 17%", textAlign: "right" }}>{item.amount}</span>
          </div>
        ))}
        <span style={{ position: "absolute", top: -14, left: 0, fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
          ◇ Items table
        </span>
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  if (el.type === "image") {
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          background: "#f8fafc",
          border: "1px dashed #94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {el.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={el.src}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: el.fit === "stretch" ? "fill" : "contain",
            }}
          />
        ) : (
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
            No image — upload in properties
          </span>
        )}
        <span style={{ position: "absolute", top: -14, left: 0, fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
          ◇ Image
        </span>
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  if (el.type === "stamp") {
    return (
      <div
        onPointerDown={onPointerDown}
        style={{
          ...common,
          ...ring,
          cursor: "move",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(${el.angle ?? -18}deg)`,
            transformOrigin: "center",
            border: `${el.strokeWidth ?? 3}px solid ${el.color || "#c70d3a"}`,
            outline: `1px solid ${el.color || "#c70d3a"}`,
            outlineOffset: 4,
            borderRadius: 12,
            color: el.color || "#c70d3a",
            fontWeight: 700,
            fontSize: el.fontSize || 28,
            letterSpacing: "0.05em",
            opacity: 0.9,
          }}
        >
          {resolvePlaceholders(el.content || "", SAMPLE_DATA) || "STAMP"}
        </div>
        <span style={{ position: "absolute", top: -14, left: 0, fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
          ◇ Stamp
        </span>
        {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
      </div>
    );
  }

  // totals
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        ...common,
        ...ring,
        cursor: "move",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: el.fontSize,
        color: el.color,
        fontFamily: FONT_CSS[el.font || "Helvetica"],
      }}
    >
      <TotalsRow label="Subtotal" value={SAMPLE_DATA.invoice.subtotal} />
      <div style={{ borderTop: "1px solid #e2e8f0" }} />
      <TotalsRow label="Total" value={SAMPLE_DATA.invoice.total} bold />
      <span style={{ position: "absolute", top: -14, left: 0, fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
        ◇ Totals
      </span>
      {selected && <ResizeHandle onPointerDown={onResizePointerDown} />}
    </div>
  );
}

function TotalsRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <span
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        right: -5,
        bottom: -5,
        width: 12,
        height: 12,
        background: "#0d9488",
        border: "2px solid #fff",
        borderRadius: 3,
        cursor: "nwse-resize",
      }}
    />
  );
}
