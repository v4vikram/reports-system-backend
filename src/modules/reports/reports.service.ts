import type { Prisma } from "@prisma/client";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { getOwnedClient } from "../clients/clients.service.js";
import type { ClientActor } from "../clients/clients.service.js";
import type { CreateReportInput, ReportDto, ReportsQuery, UpdateReportInput } from "./reports.types.js";

// Who is acting, and how much of the reports table they may see.
// - portalClientId is a hard ceiling: if set, it wins even over canReadAll —
//   a portal login should never see another client's reports no matter what
//   an admin fat-fingers onto their permission set. It's not a role-name
//   check; it's the same "facts come from the database" discipline the rest
//   of this system already follows, just treated as authoritative.
// - canReadAll comes from the reports:read-all grant.
// - Otherwise, scoped to reports the actor is an assignee on.
export interface ReportActor {
  userId: string;
  canReadAll: boolean;
  portalClientId: string | null;
}

function reportsWhere(actor: ReportActor): Prisma.ReportWhereInput {
  if (actor.portalClientId) return { clientId: actor.portalClientId };
  if (actor.canReadAll) return {};
  return { assignees: { some: { userId: actor.userId } } };
}

const reportInclude = {
  assignees: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.ReportInclude;

type ReportWithAssignees = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

function toReportDto(report: ReportWithAssignees): ReportDto {
  return {
    id: report.id,
    title: report.title,
    content: report.content,
    clientId: report.clientId,
    eventId: report.eventId,
    categoryId: report.categoryId,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    assignees: report.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
  };
}

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new ApiError(HttpStatus.BAD_REQUEST, "categoryId does not reference a valid category");
}

async function assertUsersExist(userIds: string[]) {
  if (userIds.length === 0) return;
  const count = await prisma.user.count({ where: { id: { in: userIds } } });
  if (count !== new Set(userIds).size) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "One or more assigneeUserIds are invalid");
  }
}

// Loads a report and enforces record-level access via reportsWhere — a
// scoped actor gets the same 404-not-403 treatment as clients, so they can't
// probe for ids outside their visibility. Exported: Sections/CoverageTables/
// CoverageRows are sub-resources of a report and reuse this verbatim to
// check "can this actor see the report behind this section/table/row."
export async function getOwnedReport(id: string, actor: ReportActor) {
  const report = await prisma.report.findFirst({
    where: { id, ...reportsWhere(actor) },
    include: reportInclude,
  });
  if (!report) throw new ApiError(HttpStatus.NOT_FOUND, "Report not found");
  return report;
}

export async function listReports(query: ReportsQuery, actor: ReportActor): Promise<ReportDto[]> {
  const reports = await prisma.report.findMany({
    where: {
      ...reportsWhere(actor),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.eventId && { eventId: query.eventId }),
    },
    include: reportInclude,
    orderBy: { createdAt: "desc" },
  });
  return reports.map(toReportDto);
}

export async function getReport(id: string, actor: ReportActor): Promise<ReportDto> {
  return toReportDto(await getOwnedReport(id, actor));
}

export async function createReport(
  input: CreateReportInput,
  clientActor: ClientActor
): Promise<ReportDto> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) throw new ApiError(HttpStatus.NOT_FOUND, "Event not found");

  // Stops an actor with bare reports:create from attaching a report to a
  // client outside their scope — the client is never trusted from input,
  // only derived from the (ownership-checked) event.
  await getOwnedClient(event.clientId, clientActor);
  await assertCategoryExists(input.categoryId);
  await assertUsersExist(input.assigneeUserIds);

  const report = await prisma.report.create({
    data: {
      title: input.title,
      content: input.content,
      eventId: event.id,
      clientId: event.clientId,
      categoryId: input.categoryId,
      assignees: { create: input.assigneeUserIds.map((userId) => ({ userId })) },
    },
    include: reportInclude,
  });
  return toReportDto(report);
}

export async function updateReport(
  id: string,
  input: UpdateReportInput,
  actor: ReportActor
): Promise<ReportDto> {
  await getOwnedReport(id, actor);

  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);
  if (input.assigneeUserIds !== undefined) await assertUsersExist(input.assigneeUserIds);

  const report = await prisma.$transaction(async (tx) => {
    if (input.assigneeUserIds !== undefined) {
      await tx.reportAssignee.deleteMany({ where: { reportId: id } });
      await tx.reportAssignee.createMany({
        data: input.assigneeUserIds.map((userId) => ({ reportId: id, userId })),
      });
    }
    return tx.report.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      },
      include: reportInclude,
    });
  });

  return toReportDto(report);
}

export async function deleteReport(id: string, actor: ReportActor): Promise<void> {
  await getOwnedReport(id, actor);
  await prisma.report.delete({ where: { id } });
}
