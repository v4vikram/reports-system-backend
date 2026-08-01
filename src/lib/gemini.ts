import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { ApiError } from "../utils/ApiError.js";

export interface ExtractedRow {
  headline: string;
  publication: string;
  edition: string;
  pageNo: string;
  date: string;
  link: string;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "AI auto-fill isn't configured on this server (missing GEMINI_API_KEY)"
    );
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

// Runs server-side deliberately — the API key must never reach the browser.
// Takes the already-uploaded image buffer (from multer's memory storage,
// never written to disk) and asks Gemini to structure it into coverage rows,
// same extraction shape the reference implementation used.
export async function extractRowsFromImage(buffer: Buffer, mimeType: string): Promise<ExtractedRow[]> {
  const ai = getClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Extract all table rows from this image. Parse the data structurally into a JSON array of objects. Map the properties strictly to these keys: headline, publication, edition, pageNo, date, link. If any data is missing or empty for a column, use an empty string. Convert dates into exactly YYYY-MM-DD wherever reasonably possible.",
            },
            { inlineData: { data: buffer.toString("base64"), mimeType } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              publication: { type: Type.STRING },
              edition: { type: Type.STRING },
              pageNo: { type: Type.STRING },
              date: { type: Type.STRING },
              link: { type: Type.STRING },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new ApiError(HttpStatus.BAD_GATEWAY, "Gemini request failed", { cause: (error as Error).message });
  }

  const text = response.text;
  if (!text) {
    throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to extract data from image");
  }

  try {
    return JSON.parse(text) as ExtractedRow[];
  } catch {
    throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, "Gemini returned an unparseable response");
  }
}
