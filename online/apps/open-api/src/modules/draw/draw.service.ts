import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDrawRoundDto } from './dto/create-draw-round.dto';
import { ConfirmDrawRoundDto } from './dto/confirm-draw-round.dto';
import { EventStatus, RoundStatus } from '@prisma/client';

@Injectable()
export class DrawService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureEventLocked(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, locked: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (!event.locked) {
      throw new BadRequestException('EVENT_NOT_LOCKED');
    }

    if (event.status !== EventStatus.RUNNING) {
      throw new BadRequestException('EVENT_NOT_RUNNING');
    }

    return event;
  }

  private async selectWinners(tenantId: string, eventId: string, count: number) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM participants
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}::uuid
        AND has_won = false
      ORDER BY RANDOM()
      LIMIT ${count}
    `;

    return rows.map((row) => row.id);
  }

  async createRound(tenantId: string, eventId: string, dto: CreateDrawRoundDto) {
    await this.ensureEventLocked(tenantId, eventId);

    const drawCount = Number(dto.drawCount);
    if (!dto.prizeId || !Number.isFinite(drawCount) || drawCount <= 0) {
      throw new BadRequestException('invalid prizeId/drawCount');
    }

    const prize = await this.prisma.prize.findFirst({
      where: { id: dto.prizeId, tenantId, eventId },
    });

    if (!prize) {
      throw new NotFoundException('prize not found');
    }

    if (prize.remainingCount < drawCount) {
      throw new BadRequestException('PRIZE_OUT_OF_STOCK');
    }

    const participantIds = await this.selectWinners(tenantId, eventId, drawCount);
    if (participantIds.length < drawCount) {
      throw new BadRequestException('NOT_ENOUGH_ELIGIBLE');
    }

    const roundNo = await this.prisma.drawRound.count({
      where: { tenantId, eventId, prizeId: prize.id },
    });

    return this.prisma.$transaction(async (tx) => {
      const round = await tx.drawRound.create({
        data: {
          tenantId,
          eventId,
          prizeId: prize.id,
          roundNo: roundNo + 1,
          drawCount,
          status: RoundStatus.DRAWN,
        },
      });

      await tx.winner.createMany({
        data: participantIds.map((participantId) => ({
          tenantId,
          eventId,
          roundId: round.id,
          prizeId: prize.id,
          participantId,
        })),
      });

      const winners = await tx.winner.findMany({
        where: { roundId: round.id },
        include: { participant: true },
      });

      return { round, winners };
    });
  }

  async redraw(tenantId: string, eventId: string, roundId: string) {
    await this.ensureEventLocked(tenantId, eventId);

    const round = await this.prisma.drawRound.findFirst({
      where: { id: roundId, tenantId, eventId },
    });

    if (!round) {
      throw new NotFoundException('round not found');
    }

    if (round.status !== RoundStatus.DRAWN) {
      throw new BadRequestException('ROUND_NOT_DRAWN');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.winner.deleteMany({ where: { roundId: round.id } });
      await tx.drawRound.update({
        where: { id: round.id },
        data: { status: RoundStatus.VOIDED },
      });
    });

    return this.createRound(tenantId, eventId, {
      prizeId: round.prizeId,
      drawCount: round.drawCount,
    });
  }

  async confirm(tenantId: string, eventId: string, roundId: string, dto?: ConfirmDrawRoundDto) {
    await this.ensureEventLocked(tenantId, eventId);

    return this.prisma.$transaction(async (tx) => {
      const round = await tx.drawRound.findFirst({
        where: { id: roundId, tenantId, eventId },
      });

      if (!round) {
        throw new NotFoundException('round not found');
      }

      if (round.status === RoundStatus.CONFIRMED) {
        throw new BadRequestException('ROUND_ALREADY_CONFIRMED');
      }

      if (round.status !== RoundStatus.DRAWN) {
        throw new BadRequestException('ROUND_NOT_DRAWN');
      }

      const winners = await tx.winner.findMany({
        where: { roundId: round.id },
        select: { participantId: true },
      });

      if (winners.length === 0) {
        throw new BadRequestException('NO_WINNERS');
      }

      let selectedIds = winners.map((winner) => winner.participantId);
      if (dto?.winnerIds && dto.winnerIds.length > 0) {
        const allowed = new Set(selectedIds);
        const requested = Array.from(new Set(dto.winnerIds));
        const invalid = requested.filter((id) => !allowed.has(id));
        if (invalid.length > 0) {
          throw new BadRequestException('INVALID_WINNER_SELECTION');
        }
        selectedIds = requested;
      }

      if (selectedIds.length === 0) {
        throw new BadRequestException('NO_WINNERS_SELECTED');
      }

      const prize = await tx.prize.findFirst({
        where: { id: round.prizeId, tenantId, eventId },
      });

      if (!prize) {
        throw new NotFoundException('prize not found');
      }

      if (prize.remainingCount < selectedIds.length) {
        throw new BadRequestException('PRIZE_OUT_OF_STOCK');
      }

      if (selectedIds.length < winners.length) {
        await tx.winner.deleteMany({
          where: { roundId: round.id, participantId: { notIn: selectedIds } },
        });
      }

      await tx.participant.updateMany({
        where: { id: { in: selectedIds } },
        data: { hasWon: true },
      });

      await tx.prize.update({
        where: { id: prize.id },
        data: { remainingCount: prize.remainingCount - selectedIds.length },
      });

      const updated = await tx.drawRound.update({
        where: { id: round.id },
        data: { status: RoundStatus.CONFIRMED, drawCount: selectedIds.length },
      });

      return { round: updated, winnersCount: selectedIds.length };
    });
  }

  async winners(tenantId: string, eventId: string, includePending = false) {
    const status = includePending
      ? { in: [RoundStatus.DRAWN, RoundStatus.CONFIRMED] }
      : RoundStatus.CONFIRMED;
    return this.prisma.winner.findMany({
      where: { tenantId, eventId, round: { status } },
      include: { participant: true, prize: true, round: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async rounds(tenantId: string, eventId: string) {
    return this.prisma.drawRound.findMany({
      where: { tenantId, eventId },
      include: { prize: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
