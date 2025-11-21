import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      status: 'ok',
      service: 'shipment-delay-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
