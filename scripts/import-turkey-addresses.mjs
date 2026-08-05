import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    "❌ Variables manquantes dans .env.local :\n" +
      "- NEXT_PUBLIC_SUPABASE_URL\n" +
      "- SUPABASE_SERVICE_ROLE_KEY",
  );

  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const API_BASE_URL = "https://api.turkiyeapi.dev/v2/datasets";
const BATCH_SIZE = 500;

async function downloadDataset(fileName) {
  console.log(`⬇️ Téléchargement de ${fileName}...`);

  const response = await fetch(`${API_BASE_URL}/${fileName}`);

  if (!response.ok) {
    throw new Error(
      `Impossible de télécharger ${fileName} : ${response.status}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`${fileName} ne contient pas un tableau valide.`);
  }

  console.log(`✅ ${data.length} éléments téléchargés.`);

  return data;
}

function splitIntoBatches(items, batchSize = BATCH_SIZE) {
  const batches = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

async function upsertInBatches(tableName, rows) {
  const batches = splitIntoBatches(rows);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, {
        onConflict: "external_id",
      });

    if (error) {
      throw new Error(
        `Erreur dans ${tableName}, lot ${index + 1} : ${error.message}`,
      );
    }

    console.log(
      `   ${tableName} : lot ${index + 1}/${batches.length} importé`,
    );
  }
}

async function getIdMap(tableName) {
  const idMap = new Map();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("id, external_id")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Impossible de lire ${tableName} : ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      idMap.set(Number(row.external_id), Number(row.id));
    }

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return idMap;
}

async function importProvinces(provinces) {
  console.log("\n🏙️ Importation des provinces...");

  const rows = provinces.map((province) => ({
    external_id: province.id,
    name: province.name,
  }));

  await upsertInBatches("provinces", rows);

  console.log("✅ Provinces importées.");
}

async function importDistricts(districts, provinceIdMap) {
  console.log("\n🏘️ Importation des districts...");

  const rows = districts.map((district) => {
    const internalProvinceId = provinceIdMap.get(
      Number(district.provinceId),
    );

    if (!internalProvinceId) {
      throw new Error(
        `Province introuvable pour le district ${district.name} ` +
          `(provinceId externe : ${district.provinceId})`,
      );
    }

    return {
      external_id: district.id,
      province_id: internalProvinceId,
      name: district.name,
    };
  });

  await upsertInBatches("districts", rows);

  console.log("✅ Districts importés.");
}

async function importNeighborhoods(neighborhoods, districtIdMap) {
  console.log("\n🏡 Importation des quartiers...");

  const rows = neighborhoods.map((neighborhood) => {
    const internalDistrictId = districtIdMap.get(
      Number(neighborhood.districtId),
    );

    if (!internalDistrictId) {
      throw new Error(
        `District introuvable pour le quartier ${neighborhood.name} ` +
          `(districtId externe : ${neighborhood.districtId})`,
      );
    }

    return {
      external_id: neighborhood.id,
      district_id: internalDistrictId,
      name: neighborhood.name,
    };
  });

  await upsertInBatches("neighborhoods", rows);

  console.log("✅ Quartiers importés.");
}

async function verifyImport() {
  console.log("\n🔍 Vérification des données...");

  const tables = ["provinces", "districts", "neighborhoods"];

  for (const tableName of tables) {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      throw new Error(
        `Impossible de compter ${tableName} : ${error.message}`,
      );
    }

    console.log(`   ${tableName} : ${count ?? 0} lignes`);
  }
}

async function main() {
  try {
    console.log("🚀 Début de l’importation des adresses de Türkiye\n");

    const [provinces, districts, neighborhoods] = await Promise.all([
      downloadDataset("provinces.json"),
      downloadDataset("districts.json"),
      downloadDataset("neighborhoods.json"),
    ]);

    await importProvinces(provinces);

    const provinceIdMap = await getIdMap("provinces");

    await importDistricts(districts, provinceIdMap);

    const districtIdMap = await getIdMap("districts");

    await importNeighborhoods(neighborhoods, districtIdMap);

    await verifyImport();

    console.log("\n🎉 Importation terminée avec succès !");
  } catch (error) {
    console.error("\n❌ Échec de l’importation.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();