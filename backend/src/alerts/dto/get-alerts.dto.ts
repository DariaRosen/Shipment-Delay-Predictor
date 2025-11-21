import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { Mode, Severity } from '../types/alert-shipment.interface';

export class GetAlertsDto {
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'], {
    message: 'severity must be High, Medium, or Low',
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
