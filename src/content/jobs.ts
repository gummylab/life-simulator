import type { JobSpec } from "../core/model/JobSpec";
import { SALARY } from "../core/config";

/**
 * The fictional job catalog.
 *
 * Every job is invented; none refers to a real employer. Salaries live in
 * core/config.ts with the rest of the balance numbers (Task 2.8) and read
 * as sensible USD figures at the fallback rate: 0.0012 BTC is a modest
 * yearly wage, 0.0035 a strong professional one.
 */
export const JOBS: readonly JobSpec[] = [
  {
    id: "part-time-shop",
    label: "พนักงานพาร์ตไทม์ร้านสะดวกซื้อ",
    minAge: 14,
    educationRequired: "none",
    salary: SALARY["part-time-shop"],
    timeCost: 25,
  },
  {
    id: "kitchen-helper",
    label: "ลูกมือครัว",
    minAge: 16,
    educationRequired: "none",
    salary: SALARY["kitchen-helper"],
    timeCost: 30,
  },
  {
    id: "delivery-rider",
    label: "คนส่งของ",
    minAge: 16,
    educationRequired: "none",
    salary: SALARY["delivery-rider"],
    timeCost: 35,
  },
  {
    id: "clerk",
    label: "พนักงานต้อนรับ",
    minAge: 18,
    educationRequired: "secondary",
    salary: SALARY["clerk"],
    timeCost: 40,
  },
  {
    id: "sales",
    label: "พนักงานขาย",
    minAge: 18,
    educationRequired: "secondary",
    salary: SALARY["sales"],
    timeCost: 40,
  },
  {
    id: "technician",
    label: "ช่างเทคนิค",
    minAge: 18,
    educationRequired: "secondary",
    salary: SALARY["technician"],
    timeCost: 40,
    statRequirement: { stat: "smarts", min: 50 },
  },
  {
    id: "teacher",
    label: "ครู",
    minAge: 22,
    educationRequired: "university",
    salary: SALARY["teacher"],
    timeCost: 45,
    statRequirement: { stat: "smarts", min: 55 },
  },
  {
    id: "engineer",
    label: "วิศวกร",
    minAge: 22,
    educationRequired: "university",
    salary: SALARY["engineer"],
    timeCost: 50,
    statRequirement: { stat: "smarts", min: 70 },
  },
];
