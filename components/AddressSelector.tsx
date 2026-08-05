"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect, {
  SelectOption,
} from "@/components/SearchableSelect";

export type AddressValue = {
  provinceId: string;
  districtId: string;
  neighborhoodId: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
};

type AddressSelectorProps = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
};

export default function AddressSelector({
  value,
  onChange,
}: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<SelectOption[]>([]);
  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<SelectOption[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadProvinces() {
      setLoadingProvinces(true);
      setErrorMessage("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("provinces")
        .select("id, name")
        .order("name");

      if (error) {
        setErrorMessage("Impossible de charger les provinces.");
      } else {
        setProvinces(data ?? []);
      }

      setLoadingProvinces(false);
    }

    loadProvinces();
  }, []);

  async function selectProvince(provinceId: string) {
    onChange({
      ...value,
      provinceId,
      districtId: "",
      neighborhoodId: "",
    });

    setDistricts([]);
    setNeighborhoods([]);

    if (!provinceId) {
      return;
    }

    setLoadingDistricts(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("districts")
      .select("id, name")
      .eq("province_id", Number(provinceId))
      .order("name");

    if (error) {
      setErrorMessage("Impossible de charger les districts.");
    } else {
      setDistricts(data ?? []);
    }

    setLoadingDistricts(false);
  }

  async function selectDistrict(districtId: string) {
    onChange({
      ...value,
      districtId,
      neighborhoodId: "",
    });

    setNeighborhoods([]);

    if (!districtId) {
      return;
    }

    setLoadingNeighborhoods(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("neighborhoods")
      .select("id, name")
      .eq("district_id", Number(districtId))
      .order("name");

    if (error) {
      setErrorMessage("Impossible de charger les quartiers.");
    } else {
      setNeighborhoods(data ?? []);
    }

    setLoadingNeighborhoods(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Adresse en Turquie
      </h2>

      <p className="mb-5 text-sm text-slate-600">
        Recherchez et sélectionnez votre province, district et quartier.
      </p>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="space-y-5">
        <SearchableSelect
          label="İl — Province"
          placeholder="Sélectionner une province"
          options={provinces}
          value={value.provinceId}
          loading={loadingProvinces}
          onChange={selectProvince}
        />

        <SearchableSelect
          label="İlçe — District"
          placeholder="Sélectionner un district"
          options={districts}
          value={value.districtId}
          disabled={!value.provinceId}
          loading={loadingDistricts}
          onChange={selectDistrict}
        />

        <SearchableSelect
          label="Mahalle — Quartier"
          placeholder="Sélectionner un quartier"
          options={neighborhoods}
          value={value.neighborhoodId}
          disabled={!value.districtId}
          loading={loadingNeighborhoods}
          onChange={(neighborhoodId) =>
            onChange({
              ...value,
              neighborhoodId,
            })
          }
        />

        <div>
          <label
            htmlFor="street"
            className="mb-2 block font-medium text-slate-800"
          >
            Cadde / Sokak
          </label>

          <input
            id="street"
            type="text"
            required
            value={value.street}
            onChange={(event) =>
              onChange({
                ...value,
                street: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="buildingNumber"
              className="mb-2 block font-medium text-slate-800"
            >
              Bina No
            </label>

            <input
              id="buildingNumber"
              type="text"
              required
              value={value.buildingNumber}
              onChange={(event) =>
                onChange({
                  ...value,
                  buildingNumber: event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="apartmentNumber"
              className="mb-2 block font-medium text-slate-800"
            >
              Daire No
            </label>

            <input
              id="apartmentNumber"
              type="text"
              value={value.apartmentNumber}
              onChange={(event) =>
                onChange({
                  ...value,
                  apartmentNumber: event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>
    </section>
  );
}