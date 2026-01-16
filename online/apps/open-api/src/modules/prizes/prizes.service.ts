import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { UpdatePrizeDto } from './dto/update-prize.dto';
import { ReorderPrizesDto } from './dto/reorder-prizes.dto';
import { EventStatus } from '@prisma/client';

@Injectable()
export class PrizesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureEventEditable(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('EVENT_NOT_EDITABLE');
    }

    return event;
  }

  private async ensureEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    return event;
  }

  async create(tenantId: string, eventId: string, dto: CreatePrizeDto) {
    await this.ensureEventEditable(tenantId, eventId);

    const level = dto.level?.trim();
    const name = dto.name?.trim();
    const totalCount = Number(dto.totalCount);
    const orderIndex = dto.orderIndex ?? 0;

    if (!level || !name) {
      throw new BadRequestException('level/name is required');
    }
    if (!Number.isFinite(totalCount) || totalCount < 0) {
      throw new BadRequestException('totalCount must be >= 0');
    }

    return this.prisma.prize.create({
      data: {
        tenantId,
        eventId,
        level,
        name,
        totalCount,
        remainingCount: totalCount,
        orderIndex,
      },
    });
  }

  async list(tenantId: string, eventId: string) {
    await this.ensureEvent(tenantId, eventId);
    return this.prisma.prize.findMany({
      where: { tenantId, eventId },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(tenantId: string, eventId: string, prizeId: string, dto: UpdatePrizeDto) {
    await this.ensureEventEditable(tenantId, eventId);

    const prize = await this.prisma.prize.findFirst({
      where: { id: prizeId, tenantId, eventId },
    });
    if (!prize) {
      throw new NotFoundException('prize not found');
    }

    const level = dto.level?.trim();
    const name = dto.name?.trim();
    const totalCount =
      dto.totalCount === undefined ? undefined : Number(dto.totalCount);
    const remainingCount =
      dto.remainingCount === undefined ? undefined : Number(dto.remainingCount);

    if (dto.level !== undefined && !level) {
      throw new BadRequestException('level is required');
    }
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('name is required');
    }
    if (totalCount !== undefined && (!Number.isFinite(totalCount) || totalCount < 0)) {
      throw new BadRequestException('totalCount must be >= 0');
    }
    if (
      remainingCount !== undefined &&
      (!Number.isFinite(remainingCount) || remainingCount < 0)
    ) {
      throw new BadRequestException('remainingCount must be >= 0');
    }

    const nextRemaining =
      remainingCount ?? (totalCount !== undefined ? totalCount : prize.remainingCount);

    return this.prisma.prize.update({
      where: { id: prize.id },
      data: {
        level: level ?? prize.level,
        name: name ?? prize.name,
        totalCount: totalCount ?? prize.totalCount,
        remainingCount: nextRemaining,
        orderIndex: dto.orderIndex ?? prize.orderIndex,
      },
    });
  }

  async reorder(tenantId: string, eventId: string, dto: ReorderPrizesDto) {
    await this.ensureEventEditable(tenantId, eventId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('items is required');
    }

    const ids = dto.items.map((item) => item.id);
    const existing = await this.prisma.prize.findMany({
      where: { tenantId, eventId, id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      throw new BadRequestException('invalid prize id in items');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.prize.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    return this.list(tenantId, eventId);
  }
}
