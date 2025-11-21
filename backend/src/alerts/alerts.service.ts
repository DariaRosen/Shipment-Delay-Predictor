import { Injectable, NotFoundException } from '@nestjs/common';
import { sampleAlerts } from './data/sample-alerts';
import {
  AlertShipment,
  AlertsResponse,
} from './types/alert-shipment.interface';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';

@Injectable()
export class AlertsService {
  private alerts: AlertShipment[] = sampleAlerts.map((alert) => ({
    ...alert,
  }));

  findAll(filters: GetAlertsDto): AlertsResponse {
    let filtered = [...this.alerts];

    if (filters.severity) {
      filtered = filtered.filter(
        (alert) => alert.severity === filters.severity,
      );
    }

    if (filters.mode) {
      filtered = filtered.filter((alert) => alert.mode === filters.mode);
    }

    if (filters.carrier) {
      filtered = filtered.filter(
        (alert) =>
          alert.carrierName.toLowerCase() === filters.carrier?.toLowerCase(),
      );
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.shipmentId.toLowerCase().includes(term) ||
          `${alert.origin} ${alert.destination}`.toLowerCase().includes(term),
      );
    }

    return {
      data: filtered,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: filtered.length,
      },
    };
  }

  findOne(shipmentId: string): AlertShipment {
    const alert = this.alerts.find((item) => item.shipmentId === shipmentId);
    if (!alert) {
      throw new NotFoundException(
        `Shipment with id ${shipmentId} was not found`,
      );
    }
    return alert;
  }

  acknowledge({ shipmentId, userId }: AcknowledgeAlertDto) {
    const alert = this.findOne(shipmentId);
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    return {
      message: `Shipment ${shipmentId} acknowledged by ${userId}`,
      acknowledgedAt: alert.acknowledgedAt,
    };
  }
}
