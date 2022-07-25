import axios from "axios";
import { randomUUID } from "crypto";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
// import CreateTicketService from "../TicketServices/CreateTicketService";

/* eslint-disable camelcase */
interface WebhookNotification {
  object: string;
  entry: [
    {
      id: number;
      time: number;
      changes: [
        {
          value: {
            messaging_product: string;
            metadata: {
              display_phone_number: number;
              phone_number_id: number;
            };
            contacts: [
              {
                profile: {
                  name: string;
                };
                wa_id: number;
              }
            ];
            messages: [
              {
                from: number;
                id: string;
                timestamp: Date;
                text?: {
                  body: string;
                };
                type: string;
                button?: {
                  payload: string;
                  text: string;
                };
                image?: {
                  mime_type: string;
                  sha256: string;
                  id: string;
                };
              }
            ];
            statuses?: [
              {
                id: string;
                status: string;
                timestamp: string;
                recipient_id: string;
              }
            ];
          };
          field: string;
        }
      ];
    }
  ];
}

interface MessageData {
  id: string;
  ticketId: number;
  ack?: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
}

interface SendMediaMessageResponse {
  messaging_product: string;
  contacts: {
    input: string;
    wa_id: string;
  };
  messages: {
    id: string;
  };
}

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  const messages = body.entry[0].changes[0].value.messages[0];

  const contact = await Contact.findOne({
    where: { number: messages.from }
  });

  if (!contact) {
    throw new AppError("ERR_404_CONTACT_NOT_FOUND");
  }

  const ticket = await Ticket.findOne({
    where: { contactId: contact.id, status: { [Op.or]: ["open", "pending"] } }
  });

  if (!ticket) {
    throw new AppError("ERR_404_TICKET_NOT_FOUND");
  }

  // if (ticket.status === "closed" || ticket.status !== "open") {
  //   ticket = await CreateTicketService({
  //     contactId: contact.id,
  //     status: "peding",
  //     userId: 1
  //   });
  // }

  let messageData: MessageData;
  let ticketUpdate;

  if (messages.text) {
    messageData = {
      id: randomUUID(),
      ack: 1,
      ticketId: ticket.id,
      body: messages.text.body,
      fromMe: false,
      read: true,
      mediaType: messages.type === "text" ? "chat" : messages.type
    };

    ticketUpdate = {
      lastMessage: messages.text.body,
      unreadMessages:
        ticket.status === "pending" || ticket.status === "closed"
          ? ticket.unreadMessages + 1
          : 0
    };

    await ticket.update({ ticketUpdate });
    return CreateMessageService({ messageData });
  }

  if (messages.button) {
    messageData = {
      id: randomUUID(),
      ticketId: ticket.id,
      ack: 1,
      body: messages.button.text,
      contactId: contact.id,
      fromMe: false,
      read: true,
      mediaType: messages.type
    };

    ticketUpdate = {
      lastMessage: messages.button.text,
      unreadMessages:
        ticket.status === "pending" || ticket.status === "closed"
          ? ticket.unreadMessages + 1
          : 0
    };

    await ticket.update({ ticketUpdate });
    return CreateMessageService({ messageData });
  }

  // if (messages.image) {
  //   const medias = messages.image as Express.Multer.File[];
  //   // return CreateMessageService({ messageData });
  // }
};

export default ReceiveEventService;
