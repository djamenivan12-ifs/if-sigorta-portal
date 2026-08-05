"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = {
  id: number;
  name: string;
};

type SearchableSelectProps = {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
};

export default function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  disabled = false,
  loading = false,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(
    (option) => String(option.id) === value,
  );

  const filteredOptions = options.filter((option) =>
    option.name
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR")),
  );

  useEffect(() => {
    function closeWhenClickingOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeWhenClickingOutside);

    return () => {
      document.removeEventListener("mousedown", closeWhenClickingOutside);
    };
  }, []);

  function selectOption(option: SelectOption) {
    onChange(String(option.id));
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-2 block font-medium text-slate-800">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span>
          {loading
            ? "Chargement..."
            : selectedOption?.name || placeholder}
        </span>

        <span>⌄</span>
      </button>

      {open && !disabled && !loading && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(option)}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-800"
                >
                  {option.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-sm text-slate-500">
                Aucun résultat
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}