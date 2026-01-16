import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PrizesService } from './prizes.service';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { UpdatePrizeDto } from './dto/update-prize.dto';
import { ReorderPrizesDto } from './dto/reorder-prizes.dto';

@Controller('events/:id/prizes')
export class PrizesController {
  constructor(private readonly prizesService: PrizesService) {}

  private getTenantId(headerTenantId?: string) {
    return headerTenantId || process.env.TENANT_ID || 'default';
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: CreatePrizeDto,
  ) {
    return this.prizesService.create(this.getTenantId(tenantId), eventId, dto);
  }

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Param('id') eventId: string) {
    return this.prizesService.list(this.getTenantId(tenantId), eventId);
  }

  @Put(':pid')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Param('pid') prizeId: string,
    @Body() dto: UpdatePrizeDto,
  ) {
    return this.prizesService.update(this.getTenantId(tenantId), eventId, prizeId, dto);
  }

  @Post('reorder')
  reorder(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: ReorderPrizesDto,
  ) {
    return this.prizesService.reorder(this.getTenantId(tenantId), eventId, dto);
  }
}
