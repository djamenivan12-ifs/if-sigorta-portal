"use client";
import Link from "next/link";
import Dialog from "./Dialog";
export default function Legacy({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return isOpen ? (
    <Dialog title="Gestion comptable" onClose={onClose}>
      <div className="p-6">
        <Link href="/admin/comptabilite?tab=rates" className="font-semibold text-emerald-800">
          Ouvrir la nouvelle rubrique comptabilité →
        </Link>
      </div>
    </Dialog>
  ) : null;
}
