/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TWD97 TM2 to WGS84 conversion
 * Simplified conversion for Taiwan area
 */
export function twd97_to_wgs84(x: number, y: number): { lat: number; lng: number } {
  const a = 6378137.0;
  const b = 6356752.314245;
  const lon0 = 121 * Math.PI / 180;
  const k0 = 0.9999;
  const dx = 250000;

  const e = Math.sqrt(1 - Math.pow(b / a, 2));
  const e2 = Math.pow(e, 2) / (1 - Math.pow(e, 2));

  y -= 0;
  x -= dx;

  const M = y / k0;
  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));
  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));

  const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32);
  const J2 = (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32);
  const J3 = (151 * Math.pow(e1, 3) / 96);
  const J4 = (1097 * Math.pow(e1, 4) / 512);

  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const C1 = e2 * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2));
  const D = x / (N1 * k0);

  const Q1 = N1 * Math.tan(fp) / R1;
  const Q2 = (D * D / 2);
  const Q3 = (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2) * Math.pow(D, 4) / 24;
  const Q4 = (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 3 * C1 * C1 - 252 * e2) * Math.pow(D, 6) / 720;
  let lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
  const Q7 = (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2 + 24 * T1 * T1) * Math.pow(D, 5) / 120;
  let lng = lon0 + (Q5 - Q6 + Q7) / Math.cos(fp);

  lat = lat * 180 / Math.PI;
  lng = lng * 180 / Math.PI;

  return { lat, lng };
}
