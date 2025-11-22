import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { DelayCalculatorService } from './services/delay-calculator.service';

@Module({
  providers: [AlertsService, DelayCalculatorService],
  controllers: [AlertsController],
})
export class AlertsModule {}
