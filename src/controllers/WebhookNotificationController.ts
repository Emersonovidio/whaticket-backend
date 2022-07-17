import { Request, Response } from "express";
import ReceiveEventService from "../services/WebhookNotification/ReceiveEventService";

const token: string | undefined = process.env.VERIFY_TOKEN;

export const VerifyToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === token
  ) {
    return res.send(req.query["hub.challenge"]);
  }

  return res.sendStatus(400).json();
};

export const ReceiveEvent = async (
  req: Request,
  res: Response
): Promise<unknown> => {
  const response = await ReceiveEventService(req.body);
  return res.json({ response });
};
