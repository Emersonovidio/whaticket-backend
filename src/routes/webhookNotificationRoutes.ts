import { Router } from "express";

import {
  VerifyToken,
  ReceiveEvent
} from "../controllers/WebhookNotificationController";

const webhookNotificationRoutes = Router();

webhookNotificationRoutes.get("/webhook", VerifyToken);

webhookNotificationRoutes.post("/webhook", ReceiveEvent);

export default webhookNotificationRoutes;
