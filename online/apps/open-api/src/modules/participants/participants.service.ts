import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ImportParticipantsDto } from './dto/import-participants.dto';

type ParticipantStatus = 'eligible' | 'checkedin' | 'won';
type FieldOptionKey = 'department' | 'title' | 'org_path';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, locked: true },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    return event;
  }

  async create(tenantId: string, eventId: string, dto: CreateParticipantDto) {
    const event = await this.ensureEvent(tenantId, eventId);
    if (event.locked) {
      throw new BadRequestException('EVENT_LOCKED');
    }

    const displayName = dto.displayName?.trim();
    if (!displayName) {
      throw new BadRequestException('displayName is required');
    }

    const uniqueKey = dto.uniqueKey?.trim() || null;

    return this.prisma.participant.create({
      data: {
        tenantId,
        eventId,
        displayName,
        uniqueKey,
        employeeId: dto.employeeId?.trim() || null,
        email: dto.email?.trim() || null,
        username: dto.username?.trim() || null,
        department: dto.department?.trim() || null,
        title: dto.title?.trim() || null,
        orgPath: dto.orgPath?.trim() || null,
        customField: dto.customField?.trim() || null,
      },
    });
  }

  private parseCsvHeaderInfo(input: string) {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      return { hasHeader: false, headerKeys: [] as string[] };
    }
    const first = lines[0];
    const delimiter = first.includes('\t') ? '\t' : ',';
    const headerCells = first.split(delimiter).map((cell) => cell.trim());
    const headerKeys = headerCells.map((cell) => cell.toLowerCase());
    const hasHeader = headerKeys.some((key) =>
      [
        'display_name',
        'displayname',
        'name',
        'unique_key',
        'uniquekey',
        'employee_id',
        'email',
        'username',
        'department',
        'title',
        'org_path',
        'custom_field',
        'manager_email',
      ].includes(key),
    );
    return { hasHeader, headerKeys };
  }

  private parseCsv(input: string) {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return [];
    }

    const first = lines[0];
    const delimiter = first.includes('\t') ? '\t' : ',';
    const headerCells = first.split(delimiter).map((cell) => cell.trim());

    const headerKeys = headerCells.map((cell) => cell.toLowerCase());
    const hasHeader = headerKeys.some((key) =>
      [
        'display_name',
        'displayname',
        'name',
        'unique_key',
        'uniquekey',
        'employee_id',
        'email',
        'username',
        'department',
        'title',
        'org_path',
        'custom_field',
      ].includes(key),
    );

    const startIndex = hasHeader ? 1 : 0;
    const headerMap = new Map<string, number>();

    if (hasHeader) {
      headerCells.forEach((cell, idx) => {
        headerMap.set(cell.toLowerCase(), idx);
      });
    }

    return lines.slice(startIndex).map((line) => {
      const cells = line.split(delimiter).map((cell) => cell.trim());
      if (hasHeader) {
        const nameIndex =
          headerMap.get('display_name') ??
          headerMap.get('displayname') ??
          headerMap.get('name') ??
          0;
        const keyIndex =
          headerMap.get('unique_key') ?? headerMap.get('uniquekey') ?? 1;
        const employeeIdIndex = headerMap.get('employee_id');
        const emailIndex = headerMap.get('email');
        const usernameIndex = headerMap.get('username');
        const departmentIndex = headerMap.get('department');
        const titleIndex = headerMap.get('title');
        const orgPathIndex = headerMap.get('org_path');
        const customFieldIndex = headerMap.get('custom_field');
        return {
          displayName: cells[nameIndex] ?? '',
          uniqueKey: cells[keyIndex] ?? undefined,
          employeeId:
            employeeIdIndex === undefined ? undefined : cells[employeeIdIndex],
          email: emailIndex === undefined ? undefined : cells[emailIndex],
          username: usernameIndex === undefined ? undefined : cells[usernameIndex],
          department:
            departmentIndex === undefined ? undefined : cells[departmentIndex],
          title: titleIndex === undefined ? undefined : cells[titleIndex],
          orgPath: orgPathIndex === undefined ? undefined : cells[orgPathIndex],
          customField:
            customFieldIndex === undefined ? undefined : cells[customFieldIndex],
        };
      }

      return {
        displayName: cells[0] ?? '',
        uniqueKey: cells[1] ?? undefined,
        employeeId: cells[2] ?? undefined,
        email: cells[3] ?? undefined,
        username: cells[4] ?? undefined,
        department: cells[5] ?? undefined,
        title: cells[6] ?? undefined,
        orgPath: cells[7] ?? undefined,
        customField: cells[8] ?? undefined,
      };
    });
  }

  async import(tenantId: string, eventId: string, dto: ImportParticipantsDto) {
    const event = await this.ensureEvent(tenantId, eventId);
    if (event.locked) {
      throw new BadRequestException('EVENT_LOCKED');
    }

    let warning: string | null = null;
    let items = dto.items;
    if (!items && dto.csv) {
      const headerInfo = this.parseCsvHeaderInfo(dto.csv);
      if (headerInfo.hasHeader) {
        const headerSet = new Set(headerInfo.headerKeys);
        const hasDisplayName =
          headerSet.has('display_name') ||
          headerSet.has('displayname') ||
          headerSet.has('name');
        const warnings: string[] = [];
        if (!hasDisplayName) {
          warnings.push('CSV header missing display_name');
        }
        const supported = new Set([
          'display_name',
          'displayname',
          'name',
          'unique_key',
          'uniquekey',
          'employee_id',
          'email',
          'username',
          'department',
          'title',
          'org_path',
          'custom_field',
        ]);
        const ignoredFields = headerInfo.headerKeys.filter((key) => !supported.has(key));
        if (ignoredFields.length > 0) {
          const uniqueIgnored = Array.from(new Set(ignoredFields));
          for (const field of uniqueIgnored) {
            warnings.push(`${field} will be ignored.`);
          }
        }
        if (warnings.length > 0) {
          warning = warnings.join('; ');
        }
      }
      items = this.parseCsv(dto.csv);
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('items or csv is required');
    }

    const data = items
      .map((item) => ({
        displayName: item.displayName?.trim(),
        uniqueKey: item.uniqueKey?.trim() || null,
        employeeId: item.employeeId?.trim() || null,
        email: item.email?.trim() || null,
        username: item.username?.trim() || null,
        department: item.department?.trim() || null,
        title: item.title?.trim() || null,
        orgPath: item.orgPath?.trim() || null,
        customField: item.customField?.trim() || null,
      }))
      .filter((item) => item.displayName);

    if (data.length === 0) {
      throw new BadRequestException('no valid participants');
    }

    const result = await this.prisma.participant.createMany({
      data: data.map((item) => ({
        tenantId,
        eventId,
        displayName: item.displayName as string,
        uniqueKey: item.uniqueKey,
        employeeId: item.employeeId,
        email: item.email,
        username: item.username,
        department: item.department,
        title: item.title,
        orgPath: item.orgPath,
        customField: item.customField,
      })),
      skipDuplicates: true,
    });

    return { inserted: result.count, received: items.length, warning };
  }

  async list(tenantId: string, eventId: string, status?: ParticipantStatus) {
    await this.ensureEvent(tenantId, eventId);

    const where: Record<string, unknown> = { tenantId, eventId };
    if (status === 'won') {
      where.hasWon = true;
    } else if (status === 'checkedin') {
      where.checkedInAt = { not: null };
    } else if (status === 'eligible') {
      where.hasWon = false;
    }

    return this.prisma.participant.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async fieldOptions(tenantId: string, eventId: string, keys: string[]) {
    await this.ensureEvent(tenantId, eventId);
    const allowed = new Set<FieldOptionKey>(['department', 'title', 'org_path']);
    const normalized = keys.filter((key): key is FieldOptionKey => allowed.has(key as FieldOptionKey));
    if (normalized.length === 0) {
      return {};
    }
    const rows = await this.prisma.participant.findMany({
      where: { tenantId, eventId },
      select: {
        department: true,
        title: true,
        orgPath: true,
      },
    });
    const result: Record<string, string[]> = {};
    const buckets: Record<FieldOptionKey, Set<string>> = {
      department: new Set<string>(),
      title: new Set<string>(),
      org_path: new Set<string>(),
    };
    for (const row of rows) {
      const dept = row.department?.trim();
      const title = row.title?.trim();
      const path = row.orgPath?.trim();
      if (dept) buckets.department.add(dept);
      if (title) buckets.title.add(title);
      if (path) buckets.org_path.add(path);
    }
    for (const key of normalized) {
      result[key] = Array.from(buckets[key]).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }
    return result;
  }
}
