"use client";
import { useEffect } from "react";
import { useLanguage } from "@/lib/useLanguage";
export default function DocumentLanguage() { const [language] = useLanguage(); useEffect(() => { document.documentElement.lang = language; }, [language]); return null; }
