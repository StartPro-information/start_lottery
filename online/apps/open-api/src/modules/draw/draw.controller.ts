import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { DrawService } from './draw.service';
import { CreateDrawRoundDto } from './dto/create-draw-round.dto';
import type { ConfirmDrawRoundDto } from './dto/confirm-draw-round.dto';
import { RedrawDto } from './dto/redraw.dto';

@Controller('events/:id')
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  private getTenantId(headerTenantId?: string) {
    return headerTenantId || process.env.TENANT_ID || 'default';
  }

  @Post('draw/rounds')
  createRound(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: CreateDrawRoundDto,
  ) {
    return this.drawService.createRound(this.getTenantId(tenantId), eventId, dto);
  }

  @Post('draw/rounds/:rid/redraw')
  redraw(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Param('rid') roundId: string,
    @Body() _dto: RedrawDto,
  ) {
    return this.drawService.redraw(this.getTenantId(tenantId), eventId, roundId);
  }

  @Post('draw/rounds/:rid/confirm')
  confirm(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Param('rid') roundId: string,
    @Body() dto: ConfirmDrawRoundDto,
  ) {
    return this.drawService.confirm(this.getTenantId(tenantId), eventId, roundId, dto);
  }

  @Get('winners')
  winners(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Query('includePending') includePending?: string,
  ) {
    return this.drawService.winners(
      this.getTenantId(tenantId),
      eventId,
      includePending === '1' || includePending === 'true',
    );
  }

  @Get('draw/rounds')
  rounds(@Headers('x-tenant-id') tenantId: string, @Param('id') eventId: string) {
    return this.drawService.rounds(this.getTenantId(tenantId), eventId);
  }
}
