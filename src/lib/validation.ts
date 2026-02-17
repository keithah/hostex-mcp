import { z } from "zod";

export const paginationSchema = {
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
};

export const propertyIdSchema = z.number().int().positive();

export const reservationCodeSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9-]+$/, {
    error: "Reservation code must contain only letters, numbers, and hyphens",
  });

export const dateSchema = z.iso.date();

export const stayCodeSchema = z.string().min(1);

export const schemas = {
  paginationSchema,
  propertyIdSchema,
  reservationCodeSchema,
  dateSchema,
  stayCodeSchema,
};
