import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Query() query: GetAlertsDto) {
    return this.alertsService.findAll(query);
  }

  @Get(':shipmentId')
  findOne(@Param('shipmentId') shipmentId: string) {
    return this.alertsService.findOne(shipmentId);
  }

  @Post('acknowledge')
  acknowledge(@Body() body: AcknowledgeAlertDto) {
    return this.alertsService.acknowledge(body);
  }
}
