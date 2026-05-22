/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParkingLot {
  id: string;
  name: string;
  summary: string;
  address: string;
  tel: string;
  payex: string;
  serviceTime: string;
  tw97x: string;
  tw97y: string;
  totalcar: number;
  totalmotor: number;
  totalbike: number;
  totalbus: number;
  availablecar: number;
  availablemotor: number;
  availablebus: number;
  ChargeFeeDescription?: string;
  heightLimit?: number; // Calculated or extracted
}

export enum VehicleType {
  CAR = 'CAR',
  HEAVY_BIKE = 'HEAVY_BIKE',
  MOTORBIKE = 'MOTORBIKE',
}

export interface VehicleInfo {
  type: VehicleType;
  width: number;
  height: number;
  length: number;
}
