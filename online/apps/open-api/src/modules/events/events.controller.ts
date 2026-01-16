import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private getTenantId(headerTenantId?: string) {
    return headerTenantId || process.env.TENANT_ID || 'default';
  }

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(this.getTenantId(tenantId), dto);
  }

  @Get(':id')
  findOne(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.eventsService.findOne(this.getTenantId(tenantId), id);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(this.getTenantId(tenantId), id, dto);
  }

  @Post(':id/lock')
  lock(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.eventsService.setLocked(this.getTenantId(tenantId), id, true);
  }

  @Post(':id/unlock')
  unlock(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.eventsService.setLocked(this.getTenantId(tenantId), id, false);
  }

  @Post(':id/start')
  start(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.eventsService.setStatus(
      this.getTenantId(tenantId),
      id,
      EventStatus.RUNNING,
    );
  }

  @Post(':id/end')
  end(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.eventsService.setStatus(
      this.getTenantId(tenantId),
      id,
      EventStatus.ENDED,
    );
  }
}
