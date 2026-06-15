import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechClient, protos } from "@google-cloud/text-to-speech";

// Initialize the Google Cloud TTS client
// Requires GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON key)
// or the key JSON set in GOOGLE_CREDENTIALS env var
let client: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient | null {
  if (client) return client;

  const credentials = process.env.GOOGLE_CREDENTIALS;
  if (!credentials) {
    // Fallback: relies on GOOGLE_APPLICATION_CREDENTIALS env var set in the environment
    try {
      client = new TextToSpeechClient();
      return client;
    } catch {
      return null;
    }
  }

  try {
    const credsJson = JSON.parse(credentials);
    client = new TextToSpeechClient({
      credentials: credsJson,
    });
    return client;
  } catch {
    return null;
  }
}

// Available voice options mapping
const VOICE_MAP: Record<
  string,
  { languageCode: string; name: string; ssmlGender: "MALE" | "FEMALE" }
> = {
  "en-noah": {
    languageCode: "en-US",
    name: "en-US-Studio-Magic",
    ssmlGender: "MALE",
  },
  "en-nova": {
    languageCode: "en-US",
    name: "en-US-Studio-Nova",
    ssmlGender: "FEMALE",
  },
  "en-joni": {
    languageCode: "en-US",
    name: "en-US-News-Kenneth",
    ssmlGender: "MALE",
  },
  "en-ryan": {
    languageCode: "en-US",
    name: "en-US-Standard-C",
    ssmlGender: "MALE",
  },
  "en-emma": {
    languageCode: "en-US",
    name: "en-US-Standard-D",
    ssmlGender: "FEMALE",
  },
  "en-nancy": {
    languageCode: "en-US",
    name: "en-US-Journey-F",
    ssmlGender: "FEMALE",
  },
  "en-andy": {
    languageCode: "en-US",
    name: "en-US-Journey-D",
    ssmlGender: "MALE",
  },
  // Default: high-quality Studio voice
  default: {
    languageCode: "en-US",
    name: "en-US-Studio-Magic",
    ssmlGender: "MALE",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "default" } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const ttsClient = getClient();
    if (!ttsClient) {
      // Graceful fallback: return error so client can use browser TTS
      return NextResponse.json(
        {
          error:
            "Google Cloud TTS not configured. Set GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS.",
          fallback: true,
        },
        { status: 503 },
      );
    }

    const voiceConfig = VOICE_MAP[voice] || VOICE_MAP["default"];

    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
      {
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.name,
          ssmlGender: voiceConfig.ssmlGender,
        },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
          speakingRate: 1.05,
          pitch: 0,
          sampleRateHertz: 24000,
        },
      };

    const [response] = await ttsClient.synthesizeSpeech(request);

    // response.audioContent can be string (base64), Uint8Array, or Buffer
    const audioContent = response.audioContent;
    if (!audioContent) {
      return NextResponse.json(
        { error: "No audio generated" },
        { status: 500 },
      );
    }

    // Convert to Buffer
    let audioBuffer: Buffer;
    if (typeof audioContent === "string") {
      audioBuffer = Buffer.from(audioContent, "base64");
    } else {
      audioBuffer = Buffer.from(audioContent);
    }

    // Return as MP3 audio stream
    return new NextResponse(audioBuffer as unknown as Blob, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[TTS API Error]", error);
    return NextResponse.json(
      {
        error: "Failed to synthesize speech",
        message: error.message,
        fallback: true,
      },
      { status: 500 },
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  try {
    const ttsClient = getClient();
    if (!ttsClient) {
      // Return the built-in voice map as fallback
      return NextResponse.json({
        voices: Object.entries(VOICE_MAP).map(([key, config]) => ({
          id: key,
          languageCode: config.languageCode,
          name: config.name,
          ssmlGender: config.ssmlGender,
        })),
        configured: false,
      });
    }

    const [response] = await ttsClient.listVoices({ languageCode: "en-US" });
    const voices = response.voices || [];

    return NextResponse.json({
      voices: voices.map((v: protos.google.cloud.texttospeech.v1.IVoice) => ({
        languageCodes: v.languageCodes,
        name: v.name,
        ssmlGender: v.ssmlGender,
        naturalSampleRateHertz: v.naturalSampleRateHertz,
      })),
      configured: true,
    });
  } catch (error: any) {
    console.error("[TTS Voices API Error]", error);
    return NextResponse.json(
      {
        error: "Failed to list voices",
        message: error.message,
        configured: false,
      },
      { status: 500 },
    );
  }
}
