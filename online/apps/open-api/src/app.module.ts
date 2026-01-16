import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { PrizesModule } from './modules/prizes/prizes.module';
import { DrawModule } from './modules/draw/draw.module';
import { CheckinModule } from './modules/checkin/checkin.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ParticipantsModule,
    PrizesModule,
    DrawModule,
    CheckinModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
