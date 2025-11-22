import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max, IsIn } from 'class-validator';

export enum ShipmentStatus {
  ALL = 'all',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  CANCELED = 'canceled',
  FUTURE = 'future',
}

export class GetShipmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove any trailing characters like ":1" that might come from enum serialization
      const cleanValue = value.split(':')[0].toLowerCase().trim();
      // Map to enum values
      if (cleanValue === 'all') return ShipmentStatus.ALL;
      if (cleanValue === 'completed') return ShipmentStatus.COMPLETED;
      if (cleanValue === 'in_progress' || cleanValue === 'in-progress' || cleanValue === 'inprogress') {
        return ShipmentStatus.IN_PROGRESS;
      }
      if (cleanValue === 'canceled' || cleanValue === 'cancelled') {
        return ShipmentStatus.CANCELED;
      }
      if (cleanValue === 'future') {
        return ShipmentStatus.FUTURE;
      }
      // Return undefined for invalid values
      return undefined;
    }
    return value;
  })
  @IsIn([ShipmentStatus.ALL, ShipmentStatus.COMPLETED, ShipmentStatus.IN_PROGRESS, ShipmentStatus.CANCELED, ShipmentStatus.FUTURE], {
    message: 'status must be all, completed, in_progress, canceled, or future',
  })
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;
}

