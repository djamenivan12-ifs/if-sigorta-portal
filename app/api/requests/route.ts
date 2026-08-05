import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";

const BUCKET_NAME = "insurance-documents";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function validateFile(file: File, label: string) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      `${label} : format non accepté. Utilisez PDF, JPG, JPEG ou PNG.`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `${label} : le fichier ne doit pas dépasser 10 Mo.`,
    );
  }
}

async function uploadFile({
  supabase,
  requestId,
  documentType,
  file,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  requestId: string;
  documentType:
    | "passport"
    | "kimlik_front"
    | "kimlik_back"
    | "payment_receipt";
  file: File;
}) {
  validateFile(file, documentType);

  const safeName = sanitizeFileName(file.name);

  const storagePath =
    `${requestId}/${documentType}/${Date.now()}-${safeName}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Téléversement impossible pour ${documentType} : ${uploadError.message}`,
    );
  }

  return {
    storagePath,
    originalFileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  let createdClientId: string | null = null;
  let createdRequestId: string | null = null;

  try {
    const formData = await request.formData();

    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json(
        { error: "Les données de la demande sont absentes." },
        { status: 400 },
      );
    }

    const payload = JSON.parse(payloadRaw) as {
      requestCode: string;
      lastName: string;
      firstName: string;
      fatherName: string;
      birthDate: string;
      gender: "male" | "female";
      nationality: string;
      whatsappCountryCode: string;
      whatsappNumber: string;
      address: {
        provinceId: string;
        districtId: string;
        neighborhoodId: string;
        street: string;
        buildingNumber: string;
        apartmentNumber: string;
      };
      kimlikNumber: string;
      kimlikExpirationDate: string;
      passportNumber: string;
      duration: 1 | 2;
      calculatedAge: number;
      calculatedPrice: number;
    };

    const passportFile = formData.get("passportFile");
    const kimlikFrontFile = formData.get("kimlikFrontFile");
    const kimlikBackFile = formData.get("kimlikBackFile");
    const paymentReceiptFile =
      formData.get("paymentReceiptFile");

    if (
      !(passportFile instanceof File) ||
      !(kimlikFrontFile instanceof File) ||
      !(kimlikBackFile instanceof File) ||
      !(paymentReceiptFile instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Le passeport, le Kimlik recto, le Kimlik verso et le dekont sont obligatoires.",
        },
        { status: 400 },
      );
    }

    const { data: existingRequest } = await supabase
      .from("insurance_requests")
      .select("id")
      .eq("request_code", payload.requestCode)
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "Ce code de dossier existe déjà. Recommencez la soumission.",
        },
        { status: 409 },
      );
    }

    const { data: client, error: clientError } =
      await supabase
        .from("clients")
        .insert({
          last_name: payload.lastName.trim(),
          first_name: payload.firstName.trim(),
          father_name: payload.fatherName.trim(),
          birth_date: payload.birthDate,
          gender: payload.gender,
          nationality: payload.nationality.trim(),
          whatsapp_country_code:
            payload.whatsappCountryCode,
          whatsapp_number: payload.whatsappNumber,
          province_id: Number(payload.address.provinceId),
          district_id: Number(payload.address.districtId),
          neighborhood_id: Number(
            payload.address.neighborhoodId,
          ),
          street: payload.address.street.trim(),
          building_number:
            payload.address.buildingNumber.trim(),
          apartment_number:
            payload.address.apartmentNumber.trim() || null,
        })
        .select("id")
        .single();

    if (clientError || !client) {
      throw new Error(
        `Création du client impossible : ${clientError?.message ?? "erreur inconnue"}`,
      );
    }

    createdClientId = client.id;

    const { data: insuranceRequest, error: requestError } =
      await supabase
        .from("insurance_requests")
        .insert({
          request_code: payload.requestCode,
          client_id: client.id,
          kimlik_number: payload.kimlikNumber.trim(),
          kimlik_expiration_date:
            payload.kimlikExpirationDate,
          passport_number:
            payload.passportNumber.trim().toUpperCase(),
          insurance_duration_years: payload.duration,
          calculated_age: payload.calculatedAge,
          calculated_price: payload.calculatedPrice,
          status: "payment_review",
        })
        .select("id, request_code")
        .single();

    if (requestError || !insuranceRequest) {
      throw new Error(
        `Création du dossier impossible : ${requestError?.message ?? "erreur inconnue"}`,
      );
    }

    createdRequestId = insuranceRequest.id;

    const uploadedFiles = await Promise.all([
      uploadFile({
        supabase,
        requestId: insuranceRequest.id,
        documentType: "passport",
        file: passportFile,
      }),
      uploadFile({
        supabase,
        requestId: insuranceRequest.id,
        documentType: "kimlik_front",
        file: kimlikFrontFile,
      }),
      uploadFile({
        supabase,
        requestId: insuranceRequest.id,
        documentType: "kimlik_back",
        file: kimlikBackFile,
      }),
      uploadFile({
        supabase,
        requestId: insuranceRequest.id,
        documentType: "payment_receipt",
        file: paymentReceiptFile,
      }),
    ]);

    const documentRows = [
      {
        documentType: "passport",
        file: uploadedFiles[0],
      },
      {
        documentType: "kimlik_front",
        file: uploadedFiles[1],
      },
      {
        documentType: "kimlik_back",
        file: uploadedFiles[2],
      },
      {
        documentType: "payment_receipt",
        file: uploadedFiles[3],
      },
    ].map(({ documentType, file }) => ({
      request_id: insuranceRequest.id,
      document_type: documentType,
      storage_path: file.storagePath,
      original_file_name: file.originalFileName,
      mime_type: file.mimeType,
      file_size: file.fileSize,
    }));

    const { error: documentsError } = await supabase
      .from("uploaded_documents")
      .insert(documentRows);

    if (documentsError) {
      throw new Error(
        `Enregistrement des documents impossible : ${documentsError.message}`,
      );
    }

    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        request_id: insuranceRequest.id,
        payment_method: "bank_transfer",
        expected_amount: payload.calculatedPrice,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });

    if (paymentError) {
      throw new Error(
        `Enregistrement du paiement impossible : ${paymentError.message}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        requestId: insuranceRequest.id,
        requestCode: insuranceRequest.request_code,
        status: "payment_review",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erreur de création du dossier :", error);

    if (createdRequestId) {
      await supabase
        .from("insurance_requests")
        .delete()
        .eq("id", createdRequestId);
    } else if (createdClientId) {
      await supabase
        .from("clients")
        .delete()
        .eq("id", createdClientId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      { status: 500 },
    );
  }
}