import { z } from "zod";
import { ALERT_RESOLUTIONS } from "@/types/alerts";

const MAX_NOTE = 1000;

export const acknowledgeAlertSchema = z.object({
  note: z.string().trim().max(MAX_NOTE),
});

export type AcknowledgeAlertValues = z.infer<typeof acknowledgeAlertSchema>;

/** Takes the "pick someone" message from `Alerts.assignDialog.errors`. */
export function createAssignAlertSchema(userRequired: string) {
  return z.object({
    userId: z.string().min(1, userRequired),
  });
}

export type AssignAlertValues = z.infer<
  ReturnType<typeof createAssignAlertSchema>
>;

export const resolveAlertSchema = z.object({
  resolution: z.enum(ALERT_RESOLUTIONS),
  note: z.string().trim().max(MAX_NOTE),
});

export type ResolveAlertValues = z.infer<typeof resolveAlertSchema>;
