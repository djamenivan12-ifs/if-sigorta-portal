"use client";
import { useLanguage } from "@/lib/useLanguage";

import {
  useEffect,
  useState,
} from "react";

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

  onChange: (
    value: AddressValue,
  ) => void;
};



const translations = {
  fr: {
    title:
      "Adresse en Turquie",

    description:
      "Recherchez et sélectionnez votre province, district et quartier.",

    provinceLabel:
      "İl — Province",

    provincePlaceholder:
      "Sélectionner une province",

    districtLabel:
      "İlçe — District",

    districtPlaceholder:
      "Sélectionner un district",

    neighborhoodLabel:
      "Mahalle — Quartier",

    neighborhoodPlaceholder:
      "Sélectionner un quartier",

    street:
      "Cadde / Sokak",

    buildingNumber:
      "Bina No",

    apartmentNumber:
      "Daire No",

    provincesError:
      "Impossible de charger les provinces.",

    districtsError:
      "Impossible de charger les districts.",

    neighborhoodsError:
      "Impossible de charger les quartiers.",
  },

  en: {
    title:
      "Address in Türkiye",

    description:
      "Search and select your province, district and neighborhood.",

    provinceLabel:
      "İl — Province",

    provincePlaceholder:
      "Select a province",

    districtLabel:
      "İlçe — District",

    districtPlaceholder:
      "Select a district",

    neighborhoodLabel:
      "Mahalle — Neighborhood",

    neighborhoodPlaceholder:
      "Select a neighborhood",

    street:
      "Street / Avenue",

    buildingNumber:
      "Building No",

    apartmentNumber:
      "Apartment No",

    provincesError:
      "Unable to load provinces.",

    districtsError:
      "Unable to load districts.",

    neighborhoodsError:
      "Unable to load neighborhoods.",
  },

  tr: {
    title:
      "Türkiye adresi",

    description:
      "İl, ilçe ve mahallenizi arayın ve seçin.",

    provinceLabel:
      "İl",

    provincePlaceholder:
      "İl seçin",

    districtLabel:
      "İlçe",

    districtPlaceholder:
      "İlçe seçin",

    neighborhoodLabel:
      "Mahalle",

    neighborhoodPlaceholder:
      "Mahalle seçin",

    street:
      "Cadde / Sokak",

    buildingNumber:
      "Bina No",

    apartmentNumber:
      "Daire No",

    provincesError:
      "İller yüklenemedi.",

    districtsError:
      "İlçeler yüklenemedi.",

    neighborhoodsError:
      "Mahalleler yüklenemedi.",
  },
};

export default function AddressSelector({
  value,
  onChange,
}: AddressSelectorProps) {
  const [language] =
    useLanguage();

  const [
    provinces,
    setProvinces,
  ] =
    useState<
      SelectOption[]
    >([]);

  const [
    districts,
    setDistricts,
  ] =
    useState<
      SelectOption[]
    >([]);

  const [
    neighborhoods,
    setNeighborhoods,
  ] =
    useState<
      SelectOption[]
    >([]);

  const [
    loadingProvinces,
    setLoadingProvinces,
  ] =
    useState(true);

  const [
    loadingDistricts,
    setLoadingDistricts,
  ] =
    useState(false);

  const [
    loadingNeighborhoods,
    setLoadingNeighborhoods,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");



  const t =
    translations[
      language
    ];

  useEffect(() => {
    async function loadProvinces() {
      setLoadingProvinces(
        true,
      );

      setErrorMessage("");

      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "provinces",
          )
          .select(
            "id, name",
          )
          .order(
            "name",
          );

      if (error) {
        setErrorMessage(
          t.provincesError,
        );
      } else {
        setProvinces(
          data ?? [],
        );
      }

      setLoadingProvinces(
        false,
      );
    }

    void loadProvinces();
  }, [
    t.provincesError,
  ]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!value.provinceId) { if(active) {setDistricts([]);setLoadingDistricts(false);} return; }
      setLoadingDistricts(true);
      setDistricts([]);
      try {
        const {data,error}=await createClient().from("districts").select("id, name").eq("province_id",Number(value.provinceId)).order("name");
        if(!active) return;
        if(error) setErrorMessage(t.districtsError); else {setDistricts(data ?? []);setErrorMessage("");}
      } catch {if(active) setErrorMessage(t.districtsError);}
      finally {if(active) setLoadingDistricts(false);}
    }
    void load();
    return () => {active=false;};
  }, [value.provinceId,t.districtsError]);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!value.districtId) { if(active) {setNeighborhoods([]);setLoadingNeighborhoods(false);} return; }
      setLoadingNeighborhoods(true);
      setNeighborhoods([]);
      try {
        const {data,error}=await createClient().from("neighborhoods").select("id, name").eq("district_id",Number(value.districtId)).order("name");
        if(!active) return;
        if(error) setErrorMessage(t.neighborhoodsError); else {setNeighborhoods(data ?? []);setErrorMessage("");}
      } catch {if(active) setErrorMessage(t.neighborhoodsError);}
      finally {if(active) setLoadingNeighborhoods(false);}
    }
    void load();
    return () => {active=false;};
  }, [value.districtId,t.neighborhoodsError]);

  function selectProvince(provinceId: string) { onChange({...value,provinceId,districtId:"",neighborhoodId:""}); }

  function selectDistrict(districtId: string) { onChange({...value,districtId,neighborhoodId:""}); }

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
        {t.title}
      </h2>

      <p className="mb-5 mt-2 text-sm text-slate-600">
        {
          t.description
        }
      </p>

      {errorMessage && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            errorMessage
          }
        </p>
      )}

      <div className="space-y-5">
        <SearchableSelect
          label={
            t.provinceLabel
          }
          placeholder={
            t.provincePlaceholder
          }
          options={
            provinces
          }
          value={
            value.provinceId
          }
          loading={
            loadingProvinces
          }
          onChange={
            selectProvince
          }
        />

        <SearchableSelect
          label={
            t.districtLabel
          }
          placeholder={
            t.districtPlaceholder
          }
          options={
            districts
          }
          value={
            value.districtId
          }
          disabled={
            !value.provinceId
          }
          loading={
            loadingDistricts
          }
          onChange={
            selectDistrict
          }
        />

        <SearchableSelect
          label={
            t.neighborhoodLabel
          }
          placeholder={
            t.neighborhoodPlaceholder
          }
          options={
            neighborhoods
          }
          value={
            value.neighborhoodId
          }
          disabled={
            !value.districtId
          }
          loading={
            loadingNeighborhoods
          }
          onChange={(
            neighborhoodId,
          ) =>
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
            {
              t.street
            }
          </label>

          <input
            id="street"
            type="text"
            required
            value={
              value.street
            }
            onChange={(
              event,
            ) =>
              onChange({
                ...value,
                street:
                  event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="buildingNumber"
              className="mb-2 block font-medium text-slate-800"
            >
              {
                t.buildingNumber
              }
            </label>

            <input
              id="buildingNumber"
              type="text"
              required
              value={
                value.buildingNumber
              }
              onChange={(
                event,
              ) =>
                onChange({
                  ...value,
                  buildingNumber:
                    event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
            />
          </div>

          <div>
            <label
              htmlFor="apartmentNumber"
              className="mb-2 block font-medium text-slate-800"
            >
              {
                t.apartmentNumber
              }
            </label>

            <input
              id="apartmentNumber"
              type="text"
              value={
                value.apartmentNumber
              }
              onChange={(
                event,
              ) =>
                onChange({
                  ...value,
                  apartmentNumber:
                    event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
            />
          </div>
        </div>
      </div>
    </section>
  );
}