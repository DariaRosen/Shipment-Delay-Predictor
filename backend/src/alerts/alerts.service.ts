import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AlertShipment,
  AlertsResponse,
} from './types/alert-shipment.interface';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { GetShipmentsDto, ShipmentStatus } from './dto/get-shipments.dto';
import {
  DelayCalculatorService,
  ShipmentData,
  ShipmentEvent,
} from './services/delay-calculator.service';

interface ShipmentRow {
  shipment_id: string;
  order_date: string;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  expected_delivery: string;
  current_status: string;
  carrier: string;
  service_level: string;
  mode: string;
  priority_level: string;
  owner: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

interface EventRow {
  event_time: string;
  event_stage: string;
  description: string | null;
  location: string | null;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly delayCalculator: DelayCalculatorService,
  ) {}

  /**
   * Fetch shipment with its events and calculate alert dynamically
   */
  private async fetchShipmentWithEvents(
    shipmentId: string,
  ): Promise<AlertShipment | null> {
    const supabase = this.supabase.getClient();

    // Fetch shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return null;
    }

    // Fetch events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Convert to ShipmentData format
    const shipmentData: ShipmentData = {
      shipment_id: (shipment as ShipmentRow).shipment_id,
      order_date: (shipment as ShipmentRow).order_date,
      expected_delivery: (shipment as ShipmentRow).expected_delivery,
      current_status: (shipment as ShipmentRow).current_status,
      carrier: (shipment as ShipmentRow).carrier,
      mode: (shipment as ShipmentRow).mode,
      origin_city: (shipment as ShipmentRow).origin_city,
      dest_city: (shipment as ShipmentRow).dest_city,
      service_level: (shipment as ShipmentRow).service_level,
      owner: (shipment as ShipmentRow).owner,
      events: (events || []).map((e) => ({
        event_time: (e as EventRow).event_time,
        event_stage: (e as EventRow).event_stage,
        description: (e as EventRow).description || undefined,
        location: (e as EventRow).location || undefined,
      })),
    };

    // Calculate alert dynamically
    const calculatedAlert = this.delayCalculator.calculateAlert(shipmentData);

    // Add acknowledgment info
    return {
      ...calculatedAlert,
      acknowledged: (shipment as ShipmentRow).acknowledged,
      acknowledgedBy:
        (shipment as ShipmentRow).acknowledged_by || undefined,
      acknowledgedAt:
        (shipment as ShipmentRow).acknowledged_at || undefined,
    };
  }

  async findAll(filters: GetAlertsDto): Promise<AlertsResponse> {
    const supabase = this.supabase.getClient();
    let query = supabase.from('shipments').select('*');

    // Apply filters on shipments table
    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }

    if (filters.carrier) {
      query = query.ilike('carrier', `%${filters.carrier}%`);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      query = query.or(
        `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
      );
    }

    const { data: shipments, error } = await query.order('expected_delivery', {
      ascending: true,
    });

    if (error) {
      throw new Error(`Failed to fetch shipments: ${error.message}`);
    }

    if (!shipments || shipments.length === 0) {
      return {
        data: [],
        meta: {
          lastUpdated: new Date().toISOString(),
          count: 0,
        },
      };
    }

    // Fetch all events for these shipments in one query
    const shipmentIds = shipments.map((s) => (s as ShipmentRow).shipment_id);
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('event_time', { ascending: true });

    // Group events by shipment_id
    const eventsByShipment = new Map<string, EventRow[]>();
    (allEvents || []).forEach((e) => {
      const event = e as EventRow & { shipment_id: string };
      if (!eventsByShipment.has(event.shipment_id)) {
        eventsByShipment.set(event.shipment_id, []);
      }
      eventsByShipment.get(event.shipment_id)!.push({
        event_time: event.event_time,
        event_stage: event.event_stage,
        description: event.description,
        location: event.location,
      });
    });

    // Calculate alerts for each shipment
    const alerts: AlertShipment[] = [];

    for (const shipment of shipments) {
      const s = shipment as ShipmentRow;
      const events = eventsByShipment.get(s.shipment_id) || [];

      const shipmentData: ShipmentData = {
        shipment_id: s.shipment_id,
        order_date: s.order_date,
        expected_delivery: s.expected_delivery,
        current_status: s.current_status,
        carrier: s.carrier,
        mode: s.mode,
        origin_city: s.origin_city,
        dest_city: s.dest_city,
        service_level: s.service_level,
        owner: s.owner,
        events: events.map((e) => ({
          event_time: e.event_time,
          event_stage: e.event_stage,
          description: e.description || undefined,
          location: e.location || undefined,
        })),
      };

      const calculatedAlert = this.delayCalculator.calculateAlert(shipmentData);
      
      // Only include shipments that are in_progress (not completed, canceled, or future)
      // Only in-progress shipments can be at risk
      if (calculatedAlert.status !== 'in_progress') {
        continue;
      }

      // Only include shipments with risk factors (riskReasons or riskScore > 0)
      if (calculatedAlert.riskReasons.length === 0 && calculatedAlert.riskScore === 0) {
        continue;
      }

      // Apply severity filter after calculation
      if (filters.severity && calculatedAlert.severity !== filters.severity) {
        continue;
      }

      alerts.push({
        ...calculatedAlert,
        acknowledged: s.acknowledged,
        acknowledgedBy: s.acknowledged_by || undefined,
        acknowledgedAt: s.acknowledged_at || undefined,
      });
    }

    return {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };
  }

  async findOne(shipmentId: string): Promise<AlertShipment> {
    const alert = await this.fetchShipmentWithEvents(shipmentId);

    if (!alert) {
      throw new NotFoundException(
        `Shipment with id ${shipmentId} was not found`,
      );
    }

    return alert;
  }

  async acknowledge({ shipmentId, userId }: AcknowledgeAlertDto) {
    const supabase = this.supabase.getClient();
    const { data, error } = await supabase
      .from('shipments')
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
      acknowledgedAt: (data as ShipmentRow).acknowledged_at,
    };
  }

  /**
   * Get all shipments with filters (year, month, status)
   * This includes both completed and incomplete shipments
   */
  async findAllShipments(filters: GetShipmentsDto): Promise<AlertsResponse> {
    const supabase = this.supabase.getClient();
    let query = supabase.from('shipments').select('*');

    // Apply year filter
    if (filters.year) {
      const startDate = `${filters.year}-01-01T00:00:00Z`;
      const endDate = `${filters.year}-12-31T23:59:59Z`;
      query = query
        .gte('order_date', startDate)
        .lte('order_date', endDate);
    }

    // Apply month filter (requires year)
    if (filters.month && filters.year) {
      const monthStr = String(filters.month).padStart(2, '0');
      const startDate = `${filters.year}-${monthStr}-01T00:00:00Z`;
      const daysInMonth = new Date(filters.year, filters.month, 0).getDate();
      const endDate = `${filters.year}-${monthStr}-${daysInMonth}T23:59:59Z`;
      query = query
        .gte('order_date', startDate)
        .lte('order_date', endDate);
    }

    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      query = query.or(
        `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
      );
    }

    const { data: shipments, error } = await query.order('order_date', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to fetch shipments: ${error.message}`);
    }

    if (!shipments || shipments.length === 0) {
      return {
        data: [],
        meta: {
          lastUpdated: new Date().toISOString(),
          count: 0,
        },
      };
    }

    // Fetch all events for these shipments
    const shipmentIds = shipments.map((s) => (s as ShipmentRow).shipment_id);
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('event_time', { ascending: true });

    // Group events by shipment_id
    const eventsByShipment = new Map<string, EventRow[]>();
    (allEvents || []).forEach((e) => {
      const event = e as EventRow & { shipment_id: string };
      if (!eventsByShipment.has(event.shipment_id)) {
        eventsByShipment.set(event.shipment_id, []);
      }
      eventsByShipment.get(event.shipment_id)!.push({
        event_time: event.event_time,
        event_stage: event.event_stage,
        description: event.description,
        location: event.location,
      });
    });

    // Calculate alerts for each shipment
    const alerts: AlertShipment[] = [];

    for (const shipment of shipments) {
      const s = shipment as ShipmentRow;
      const events = eventsByShipment.get(s.shipment_id) || [];

      const shipmentData: ShipmentData = {
        shipment_id: s.shipment_id,
        order_date: s.order_date,
        expected_delivery: s.expected_delivery,
        current_status: s.current_status,
        carrier: s.carrier,
        mode: s.mode,
        origin_city: s.origin_city,
        dest_city: s.dest_city,
        service_level: s.service_level,
        owner: s.owner,
        events: events.map((e) => ({
          event_time: e.event_time,
          event_stage: e.event_stage,
          description: e.description || undefined,
          location: e.location || undefined,
        })),
      };

      const calculatedAlert = this.delayCalculator.calculateAlert(shipmentData);

      // Apply status filter (only if status is specified and not 'all')
      if (filters.status && filters.status !== ShipmentStatus.ALL) {
        // calculatedAlert.status should always be set by calculateAlert
        const alertStatus = calculatedAlert.status;
        
        // Strictly match the filter status - if status doesn't match, skip this shipment
        if (filters.status === ShipmentStatus.COMPLETED && alertStatus !== 'completed') {
          continue; // Skip non-completed shipments
        }
        if (filters.status === ShipmentStatus.IN_PROGRESS && alertStatus !== 'in_progress') {
          continue; // Skip non-in-progress shipments
        }
        if (filters.status === ShipmentStatus.CANCELED && alertStatus !== 'canceled') {
          continue; // Skip non-canceled shipments
        }
        if (filters.status === ShipmentStatus.FUTURE && alertStatus !== 'future') {
          continue; // Skip non-future shipments
        }
      }

      alerts.push({
        ...calculatedAlert,
        acknowledged: s.acknowledged,
        acknowledgedBy: s.acknowledged_by || undefined,
        acknowledgedAt: s.acknowledged_at || undefined,
      });
    }

    return {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };
  }
}
