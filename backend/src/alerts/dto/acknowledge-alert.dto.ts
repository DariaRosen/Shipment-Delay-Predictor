import { IsString } from 'class-validator';

export class AcknowledgeAlertDto {
  @IsString()
  shipmentId!: string;

  @IsString()
  userId!: string;
}
