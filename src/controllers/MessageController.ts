import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import Message from "../models/Message";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";

import ShowTicketService from "../services/TicketServices/ShowTicketService";
import SendWhatsAppMedia2 from "../services/WbotServices/SendWhatsAppMedia2";
import SendWhatsAppMessage2 from "../services/WbotServices/SendWhatsAppMessage2";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMessageTemplate from "../services/WbotServices/SendWhatsAppMessageTemplate";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        await SendWhatsAppMedia2({ media, ticket });
      })
    );
  } else if (body.split("/")[1] && !body.split("/")[1]) {
    await SendWhatsAppMessageTemplate({
      body: body.split("/")[1],
      ticket,
      quotedMsg
    });
  } else {
    await SendWhatsAppMessage2({ body, ticket, quotedMsg });
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};
