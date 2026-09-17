"use client";
import PageError from "@/components/admin/pages/PageError";
export default function ErrorPage({reset}:{reset:()=>void}){return <PageError reset={reset} dashboardHref="/partenaire/tableau-de-bord"/>;}
