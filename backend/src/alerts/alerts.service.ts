import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AlertShipment,
  AlertsResponse,
} from './types/alert-shipment.interface';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';

interface AlertRow {
  id: string;
  shipment_id: string;
  origin: string;
  destination: string;
  mode: string;
  carrier_name: string;
  service_level: string;
  current_stage: string;
  planned_eta: string;
  days_to_eta: number;
  last_milestone_update: string;
  risk_score: number;
  severity: string;
  risk_reasons: string[];
  owner: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class AlertsService {
  constructor(private readonly supabase: SupabaseService) {}

  private mapRowToAlert(row: AlertRow): AlertShipment {
    return {
      shipmentId: row.shipment_id,
      origin: row.origin,
      destination: row.destination,
      mode: row.mode as 'Air' | 'Sea' | 'Road',
      carrierName: row.carrier_name,
      serviceLevel: row.service_level,
      currentStage: row.current_stage,
      plannedEta: row.planned_eta,
      daysToEta: row.days_to_eta,
      lastMilestoneUpdate: row.last_milestone_update,
      riskScore: row.risk_score,
      severity: row.severity as 'High' | 'Medium' | 'Low',
      riskReasons: row.risk_reasons as any[],
      owner: row.owner,
      acknowledged: row.acknowledged,
      acknowledgedBy: row.acknowledged_by || undefined,
      acknowledgedAt: row.acknowledged_at || undefined,
    };
  }

  async findAll(filters: GetAlertsDto): Promise<AlertsResponse> {
    const supabase = this.supabase.getClient();
    let query = supabase.from('alerts').select('*');

    // Apply filters
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }

    if (filters.carrier) {
      query = query.ilike('carrier_name', filters.carrier);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      query = query.or(
        `shipment_id.ilike.%${term}%,origin.ilike.%${term}%,destination.ilike.%${term}%`,
      );
    }

    const { data, error } = await query.order('planned_eta', {
      ascending: true,
    });

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    const alerts = (data || []).map((row) => this.mapRowToAlert(row as AlertRow));

    return {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };
  }

  async findOne(shipmentId: string): Promise<AlertShipment> {
    const supabase = this.supabase.getClient();
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('shipment_id', shipmentId)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Shipment with id ${shipmentId} was not found`,
      );
    }

    return this.mapRowToAlert(data as AlertRow);
  }

  async acknowledge({ shipmentId, userId }: AcknowledgeAlertDto) {
    const supabase = this.supabase.getClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('shipment_id', shipmentId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Shipment with id ${shipmentId} was not found`,
      );
    }

    return {
      message: `Shipment ${shipmentId} acknowledged by ${userId}`,
      acknowledgedAt: data.acknowledged_at,
    };
  }
}
