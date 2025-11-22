import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export enum ShipmentStatus {
  ALL = 'all',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  CANCELED = 'canceled',
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
  @IsEnum(ShipmentStatus, {
    message: 'status must be all, completed, in_progress, or canceled',
  })
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;
}

