"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/lib/useLanguage";
export type SelectOption = {
    id: number;
    name: string;
};
type Props = {
    label: string;
    placeholder: string;
    options: SelectOption[];
    value: string;
    disabled?: boolean;
    loading?: boolean;
    onChange: (value: string) => void;
};
const translations = { fr: { loading: "Chargement…", search: "Rechercher…", noResult: "Aucun résultat" }, en: { loading: "Loading…", search: "Search…", noResult: "No results" }, tr: { loading: "Yükleniyor…", search: "Ara…", noResult: "Sonuç bulunamadı" } };
export default function SearchableSelect({ label, placeholder, options, value, disabled = false, loading = false, onChange }: Props) {
    const id = useId(), [language] = useLanguage(), t = translations[language];
    const [open, setOpen] = useState(false), [search, setSearch] = useState(""), [active, setActive] = useState(0);
    const container = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
    const selected = options.find(o => String(o.id) === value);
    const filtered = options.filter(o => o.name.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")));
    const activeIndex = Math.max(0, Math.min(active, Math.max(0, filtered.length - 1)));
    const expanded = open && !disabled && !loading;
    function close() { setOpen(false); setSearch(""); trigger.current?.focus(); }
    function select(option: SelectOption) { onChange(String(option.id)); close(); }
    useEffect(() => { function outside(e: MouseEvent) { if (container.current && !container.current.contains(e.target as Node))
        setOpen(false); } document.addEventListener("mousedown", outside); return () => document.removeEventListener("mousedown", outside); }, []);
    useEffect(() => { if (expanded)
        document.getElementById(id + "-option-" + activeIndex)?.scrollIntoView({ block: "nearest" }); }, [activeIndex, expanded, id]);
    return <div ref={container} className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null))
        setOpen(false); }}>
  <label id={id + "-label"} htmlFor={id} className="mb-2 block font-medium text-slate-800">{label}</label>
  <button id={id} ref={trigger} type="button" aria-labelledby={id + "-label " + id + "-value"} aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? id + "-list" : undefined} disabled={disabled || loading} onClick={() => { setSearch(""); setActive(0); setOpen(!open); }} onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setActive(0);
    } }} className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 outline-none focus:ring-4 focus:ring-[#0B5D3B]/10 disabled:bg-slate-100 disabled:text-slate-400">
   <span id={id + "-value"}>{loading ? t.loading : selected?.name || placeholder}</span><span aria-hidden="true">⌄</span>
  </button>
  {expanded && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
   <div className="border-b border-slate-200 p-3"><input autoFocus type="search" role="combobox" aria-labelledby={id + "-label"} aria-expanded="true" aria-autocomplete="list" aria-controls={id + "-list"} aria-activedescendant={filtered.length ? id + "-option-" + activeIndex : undefined} value={search} onChange={e => { setSearch(e.target.value); setActive(0); }} placeholder={t.search} onKeyDown={e => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    close();
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive(Math.min(activeIndex + 1, filtered.length - 1));
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive(Math.max(0, activeIndex - 1));
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered[activeIndex])
                        select(filtered[activeIndex]);
                }
            }} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-4 focus:ring-[#0B5D3B]/10"/></div>
   <div id={id + "-list"} role="listbox" aria-labelledby={id + "-label"} className="max-h-64 overflow-y-auto p-2">{filtered.map((option, index) => <button key={option.id} id={id + "-option-" + index} type="button" role="option" tabIndex={-1} aria-selected={String(option.id) === value} onMouseDown={e => e.preventDefault()} onClick={() => select(option)} className={"w-full rounded-lg px-3 py-2 text-left hover:bg-[#F3F8F2] " + (index === activeIndex ? "bg-[#F3F8F2] text-[#0B5D3B]" : "")}>{option.name}</button>)}</div>
   {!filtered.length && <p role="status" className="px-3 py-5 text-center text-sm text-slate-500">{t.noResult}</p>}
  </div>}
 </div>;
}
