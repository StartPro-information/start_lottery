import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequiredFields(fields?: string[]) {
    const allowed = new Set([
      'display_name',
      'unique_key',
      'employee_id',
      'email',
      'username',
      'department',
      'title',
      'org_path',
      'custom_field',
    ]);
    const normalized = (fields ?? [])
      .map((field) => field?.trim())
      .filter((field) => field && allowed.has(field));
    if (!normalized.includes('display_name')) {
      normalized.unshift('display_name');
    }
    return Array.from(new Set(normalized));
  }

  private normalizeParticipantMode(mode?: string) {
    if (mode === 'checkin' || mode === 'mixed' || mode === 'csv') {
      return mode;
    }
    return 'csv';
  }

  async create(tenantId: string, dto: CreateEventDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    const customFieldLabel = dto.customFieldLabel?.trim() || null;

    return this.prisma.event.create({
      data: {
        tenantId,
        name,
        requireFinishPrize: dto.requireFinishPrize ?? false,
        participantMode: this.normalizeParticipantMode(dto.participantMode),
        requiredFields: this.normalizeRequiredFields(dto.requiredFields) as Prisma.InputJsonValue,
        checkinDeviceLimit: dto.checkinDeviceLimit ?? true,
        customFieldLabel,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    return event;
  }

  async update(tenantId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.findOne(tenantId, id);

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('name is required');
    }
    const customFieldLabel =
      dto.customFieldLabel === undefined ? existing.customFieldLabel : dto.customFieldLabel?.trim() || null;

    return this.prisma.event.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        requireFinishPrize: dto.requireFinishPrize ?? existing.requireFinishPrize,
        participantMode:
          dto.participantMode === undefined
            ? existing.participantMode
            : this.normalizeParticipantMode(dto.participantMode),
        requiredFields:
          dto.requiredFields === undefined
            ? (this.normalizeRequiredFields(
                Array.isArray(existing.requiredFields)
                  ? (existing.requiredFields as string[])
                  : [],
              ) as Prisma.InputJsonValue)
            : (this.normalizeRequiredFields(dto.requiredFields) as Prisma.InputJsonValue),
        checkinDeviceLimit:
          dto.checkinDeviceLimit === undefined
            ? existing.checkinDeviceLimit
            : dto.checkinDeviceLimit,
        customFieldLabel,
        updatedAt: new Date(),
      },
    });
  }

  async setLocked(tenantId: string, id: string, locked: boolean) {
    const existing = await this.findOne(tenantId, id);

    return this.prisma.event.update({
      where: { id: existing.id },
      data: {
        locked,
        updatedAt: new Date(),
      },
    });
  }

  async setStatus(tenantId: string, id: string, status: EventStatus) {
    const existing = await this.findOne(tenantId, id);

    return this.prisma.event.update({
      where: { id: existing.id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }
}
