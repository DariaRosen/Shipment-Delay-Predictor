import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { Mode, Severity } from '../types/alert-shipment.interface';

export class GetAlertsDto {
  @IsOptional()
  @IsEnum(['Critical', 'High', 'Medium', 'Low', 'Minimal'], {
    message: 'severity must be Critical, High, Medium, Low, or Minimal',
  })
  severity?: Severity;

  @IsOptional()
  @IsEnum(['Air', 'Sea', 'Road'], {
    message: 'mode must be Air, Sea, or Road',
  })
  mode?: Mode;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;
}
