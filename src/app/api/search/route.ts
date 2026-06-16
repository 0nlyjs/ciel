import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, calendarEvents, searchDocuments } from "@/lib/schema";
import { getEmbedding } from "@/lib/embeddings";
import { getServerSession } from "@/lib/auth";
import { eq, and, or, ilike, desc, asc, cosineDistance } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all"; // "all" | "email" | "calendar"

    const lowerQuery = q.trim();

    // 1. If query is empty, return latest records
    if (!lowerQuery) {
      const emailResult =
        type === "calendar"
          ? []
          : await db
              .select({
                id: emails.id,
                from: emails.fromName,
                fromEmail: emails.fromEmail,
                subject: emails.subject,
                body: emails.body,
                date: emails.date,
                read: emails.read,
                priority: emails.priority,
                category: emails.category,
              })
              .from(emails)
              .where(eq(emails.userId, userId))
              .orderBy(desc(emails.createdAt))
              .limit(50);

      const calendarResult =
        type === "email"
          ? []
          : (
              await db
                .select({
                  id: calendarEvents.id,
                  title: calendarEvents.title,
                  start: calendarEvents.startTime,
                  end: calendarEvents.endTime,
                  location: calendarEvents.location,
                  attendees: calendarEvents.attendees,
                  description: calendarEvents.description,
                })
                .from(calendarEvents)
                .where(eq(calendarEvents.userId, userId))
                .orderBy(asc(calendarEvents.startTime))
                .limit(50)
            ).map((row) => ({
              ...row,
              attendees: Array.isArray(row.attendees) ? row.attendees : [],
              start:
                row.start instanceof Date
                  ? row.start.toISOString().split(".")[0]
                  : row.start,
              end:
                row.end instanceof Date
                  ? row.end.toISOString().split(".")[0]
                  : row.end,
            }));

      return NextResponse.json({
        emails: emailResult,
        calendarEvents: calendarResult,
      });
    }

    // 2. Query is present. Try Vector Search first
    const embedding = await getEmbedding(lowerQuery);

    if (embedding) {
      console.log(
        `[Search API] Performing fast vector search for: "${lowerQuery}" (user: ${userId})`,
      );

      let emailResult =
        type === "calendar"
          ? []
          : await db
              .select({
                id: emails.id,
                from: emails.fromName,
                fromEmail: emails.fromEmail,
                subject: emails.subject,
                body: emails.body,
                date: emails.date,
                read: emails.read,
                priority: emails.priority,
                category: emails.category,
              })
              .from(emails)
              .innerJoin(
                searchDocuments,
                eq(emails.id, searchDocuments.sourceId),
              )
              .where(
                and(
                  eq(emails.userId, userId),
                  eq(searchDocuments.sourceType, "email"),
                ),
              )
              .orderBy(cosineDistance(searchDocuments.embedding, embedding))
              .limit(20);

      let calendarResult =
        type === "email"
          ? []
          : (
              await db
                .select({
                  id: calendarEvents.id,
                  title: calendarEvents.title,
                  start: calendarEvents.startTime,
                  end: calendarEvents.endTime,
                  location: calendarEvents.location,
                  attendees: calendarEvents.attendees,
                  description: calendarEvents.description,
                })
                .from(calendarEvents)
                .innerJoin(
                  searchDocuments,
                  eq(calendarEvents.id, searchDocuments.sourceId),
                )
                .where(
                  and(
                    eq(calendarEvents.userId, userId),
                    eq(searchDocuments.sourceType, "event"),
                  ),
                )
                .orderBy(cosineDistance(searchDocuments.embedding, embedding))
                .limit(20)
            ).map((row) => ({
              ...row,
              attendees: Array.isArray(row.attendees) ? row.attendees : [],
              start:
                row.start instanceof Date
                  ? row.start.toISOString().split(".")[0]
                  : row.start,
              end:
                row.end instanceof Date
                  ? row.end.toISOString().split(".")[0]
                  : row.end,
            }));

      // If vector search returned 0 items, fall back to ILIKE search for that entity
      const searchPattern = `%${lowerQuery}%`;

      if (type !== "calendar" && emailResult.length === 0) {
        console.log(
          `[Search API] Vector search returned 0 emails. Falling back to SQL ILIKE search for: "${lowerQuery}"`,
        );
        emailResult = await db
          .select({
            id: emails.id,
            from: emails.fromName,
            fromEmail: emails.fromEmail,
            subject: emails.subject,
            body: emails.body,
            date: emails.date,
            read: emails.read,
            priority: emails.priority,
            category: emails.category,
          })
          .from(emails)
          .where(
            and(
              eq(emails.userId, userId),
              or(
                ilike(emails.subject, searchPattern),
                ilike(emails.body, searchPattern),
                ilike(emails.fromName, searchPattern),
                ilike(emails.fromEmail, searchPattern),
              ),
            ),
          )
          .orderBy(desc(emails.createdAt))
          .limit(20);
      }

      if (type !== "email" && calendarResult.length === 0) {
        console.log(
          `[Search API] Vector search returned 0 calendar events. Falling back to SQL ILIKE search for: "${lowerQuery}"`,
        );
        calendarResult = (
          await db
            .select({
              id: calendarEvents.id,
              title: calendarEvents.title,
              start: calendarEvents.startTime,
              end: calendarEvents.endTime,
              location: calendarEvents.location,
              attendees: calendarEvents.attendees,
              description: calendarEvents.description,
            })
            .from(calendarEvents)
            .where(
              and(
                eq(calendarEvents.userId, userId),
                or(
                  ilike(calendarEvents.title, searchPattern),
                  ilike(calendarEvents.description, searchPattern),
                  ilike(calendarEvents.location, searchPattern),
                ),
              ),
            )
            .orderBy(asc(calendarEvents.startTime))
            .limit(20)
        ).map((row) => ({
          ...row,
          attendees: Array.isArray(row.attendees) ? row.attendees : [],
          start:
            row.start instanceof Date
              ? row.start.toISOString().split(".")[0]
              : row.start,
          end:
            row.end instanceof Date
              ? row.end.toISOString().split(".")[0]
              : row.end,
        }));
      }

      return NextResponse.json({
        emails: emailResult,
        calendarEvents: calendarResult,
      });
    }

    // 3. Fall back to standard ILIKE keyword search if embedding fails/OpenAI not configured
    console.log(
      `[Search API] Falling back to SQL ILIKE search for: "${lowerQuery}" (user: ${userId})`,
    );
    const searchPattern = `%${lowerQuery}%`;

    const emailResult =
      type === "calendar"
        ? []
        : await db
            .select({
              id: emails.id,
              from: emails.fromName,
              fromEmail: emails.fromEmail,
              subject: emails.subject,
              body: emails.body,
              date: emails.date,
              read: emails.read,
              priority: emails.priority,
              category: emails.category,
            })
            .from(emails)
            .where(
              and(
                eq(emails.userId, userId),
                or(
                  ilike(emails.subject, searchPattern),
                  ilike(emails.body, searchPattern),
                  ilike(emails.fromName, searchPattern),
                  ilike(emails.fromEmail, searchPattern),
                ),
              ),
            )
            .orderBy(desc(emails.createdAt))
            .limit(20);

    const calendarResult =
      type === "email"
        ? []
        : (
            await db
              .select({
                id: calendarEvents.id,
                title: calendarEvents.title,
                start: calendarEvents.startTime,
                end: calendarEvents.endTime,
                location: calendarEvents.location,
                attendees: calendarEvents.attendees,
                description: calendarEvents.description,
              })
              .from(calendarEvents)
              .where(
                and(
                  eq(calendarEvents.userId, userId),
                  or(
                    ilike(calendarEvents.title, searchPattern),
                    ilike(calendarEvents.description, searchPattern),
                    ilike(calendarEvents.location, searchPattern),
                  ),
                ),
              )
              .orderBy(asc(calendarEvents.startTime))
              .limit(20)
          ).map((row) => ({
            ...row,
            attendees: Array.isArray(row.attendees) ? row.attendees : [],
            start:
              row.start instanceof Date
                ? row.start.toISOString().split(".")[0]
                : row.start,
            end:
              row.end instanceof Date
                ? row.end.toISOString().split(".")[0]
                : row.end,
          }));

    return NextResponse.json({
      emails: emailResult,
      calendarEvents: calendarResult,
    });
  } catch (error: any) {
    console.error("[Search API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
