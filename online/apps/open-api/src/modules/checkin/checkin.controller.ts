import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Controller('events/:id/checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  private getTenantId(headerTenantId?: string) {
    return headerTenantId || process.env.TENANT_ID || 'default';
  }

  @Get('token')
  token(@Headers('x-tenant-id') tenantId: string, @Param('id') eventId: string) {
    return this.checkinService.getToken(this.getTenantId(tenantId), eventId);
  }

  @Post()
  checkin(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: CreateCheckinDto,
  ) {
    return this.checkinService.checkin(
      this.getTenantId(tenantId),
      eventId,
      dto.nonce,
      dto.expiresAt,
      dto.sig,
      dto.deviceId,
      dto.participantIdentity,
      dto.participantFields,
    );
  }
}
