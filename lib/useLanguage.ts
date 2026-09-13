"use client";
import { useSyncExternalStore } from "react";
export type Language = "fr" | "en" | "tr";
const key = "if-sigorta-language", eventName = "if-sigorta-language-change";
let memory: Language = "fr";
function snapshot(): Language { try {
    const value = window.localStorage.getItem(key);
    return value === "fr" || value === "en" || value === "tr" ? value : memory;
}
catch {
    return memory;
} }
function subscribe(callback: () => void) {
    const changed = (event: Event) => { const next = (event as CustomEvent<{
        language?: Language;
    }>).detail?.language; if (next === "fr" || next === "en" || next === "tr")
        memory = next; callback(); };
    window.addEventListener(eventName, changed);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener(eventName, changed); window.removeEventListener("storage", changed); };
}
function setLanguage(next: Language) { memory = next; try {
    window.localStorage.setItem(key, next);
}
catch { } window.dispatchEvent(new CustomEvent(eventName, { detail: { language: next } })); }
export function useLanguage(): readonly [
    Language,
    typeof setLanguage
] { return [useSyncExternalStore(subscribe, snapshot, () => "fr"), setLanguage]; }
