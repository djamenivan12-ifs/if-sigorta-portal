type PreferredLanguage =
  | "fr"
  | "en"
  | "tr";

type SendWhatsAppMessageParams = {
  phoneNumber: string;
  matricule: string;
  firstName?: string;
  preferredLanguage?: string | null;
};

function normalizeLanguage(
  language?: string | null,
): PreferredLanguage {
  const normalized =
    language
      ?.trim()
      .toLowerCase();

  if (
    normalized === "en" ||
    normalized === "english"
  ) {
    return "en";
  }

  if (
    normalized === "tr" ||
    normalized === "turkish" ||
    normalized === "türkçe" ||
    normalized === "turkce"
  ) {
    return "tr";
  }

  return "fr";
}

export async function sendWhatsAppMessage({
  phoneNumber,
  matricule,
  firstName,
  preferredLanguage,
}: SendWhatsAppMessageParams) {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN est absent dans .env.local",
    );
  }

  if (!phoneNumberId) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID est absent dans .env.local",
    );
  }

  const cleanPhoneNumber =
    phoneNumber.replace(
      /\D/g,
      "",
    );

  if (!cleanPhoneNumber) {
    throw new Error(
      "Le numéro WhatsApp est invalide.",
    );
  }

  const cleanFirstName =
    firstName?.trim() ||
    "Client";

  const cleanMatricule =
    matricule.trim();

  if (!cleanMatricule) {
    throw new Error(
      "Le matricule du dossier est absent.",
    );
  }

  const language =
    normalizeLanguage(
      preferredLanguage,
    );

  /*
   * Le même nom de template est utilisé
   * avec trois traductions Meta :
   *
   * Français : fr
   * English  : en
   * Türkçe   : tr
   *
   * Variables :
   * {{1}} = prénom
   * {{2}} = matricule
   */

  const response =
    await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            messaging_product:
              "whatsapp",

            recipient_type:
              "individual",

            to:
              cleanPhoneNumber,

            type:
              "template",

            template: {
              name:
                "insurance_available",

              language: {
                code:
                  language,
              },

              components: [
                {
                  type:
                    "body",

                  parameters: [
                    {
                      type:
                        "text",

                      text:
                        cleanFirstName,
                    },

                    {
                      type:
                        "text",

                      text:
                        cleanMatricule,
                    },
                  ],
                },
              ],
            },
          }),
      },
    );

  let result: {
    messages?: Array<{
      id?: string;
    }>;

    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
    };

    [key: string]:
      unknown;
  };

  try {
    result =
      (await response.json()) as typeof result;
  } catch {
    throw new Error(
      `Meta a retourné une réponse invalide (${response.status}).`,
    );
  }

  if (!response.ok) {
    console.error(
      "Erreur WhatsApp :",
      {
        status:
          response.status,

        phoneNumber:
          cleanPhoneNumber,

        language,

        template:
          "insurance_available",

        result,
      },
    );

    throw new Error(
      result?.error?.message ??
        "Impossible d’envoyer le message WhatsApp.",
    );
  }

  const messageId =
    result?.messages?.[0]?.id ??
    null;

  console.log(
    "Notification WhatsApp acceptée par Meta :",
    {
      phoneNumber:
        cleanPhoneNumber,

      matricule:
        cleanMatricule,

      language,

      template:
        "insurance_available",

      messageId,
    },
  );

  return result;
}