import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ImportParticipantsDto } from './dto/import-participants.dto';

@Controller('events/:id/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  private getTenantId(headerTenantId?: string) {
    return headerTenantId || process.env.TENANT_ID || 'default';
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.participantsService.create(this.getTenantId(tenantId), eventId, dto);
  }

  @Post('import')
  import(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: ImportParticipantsDto,
  ) {
    return this.participantsService.import(this.getTenantId(tenantId), eventId, dto);
  }

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Query('status') status?: 'eligible' | 'checkedin' | 'won',
  ) {
    return this.participantsService.list(this.getTenantId(tenantId), eventId, status);
  }

  @Get('fields')
  fields(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Query('keys') keys?: string,
  ) {
    const parsed = keys
      ? keys
          .split(',')
          .map((key) => key.trim())
          .filter((key) => key.length > 0)
      : [];
    return this.participantsService.fieldOptions(this.getTenantId(tenantId), eventId, parsed);
  }
}
