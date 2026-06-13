import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { dbInit } from "@/lib/db";

const handler = toNextJsHandler(auth);

export async function GET(req: Request) {
  await dbInit();
  return handler.GET(req);
}

export async function POST(req: Request) {
  await dbInit();
  return handler.POST(req);
}
