import axios from "axios";
import { randomUUID } from "crypto";
import { Op, or, where } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import CreateTicketService from "../TicketServices/CreateTicketService";

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

// interface SendMediaMessageResponse {
//   messaging_product: string;
//   contacts: {
//     input: string;
//     wa_id: string;
//   };
//   messages: {
//     id: string;
//   };
// }

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  const messages = body.entry[0].changes[0].value.messages[0];

  console.log(messages);

  const contact = await Contact.findOne({
    where: { number: messages.from }
  });

  if (!contact) {
    throw new AppError("ERR_404_CONTACT_NOT_FOUND");
  }

  let ticket = await Ticket.findOne({
    where: { contactId: contact.id, status: { [Op.or]: ["pending", "open"] } }
  });

  console.log(ticket);

  if (!ticket) {
    ticket = await CreateTicketService({
      contactId: contact.id,
      status: "pending",
      userId: 1
    });
  }

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
      id: ticket.id,
      lastMessage: messages.text.body,
      unreadMessages:
        ticket.status === "pending" || ticket.status === "closed"
          ? ticket.unreadMessages + 1
          : 0
    };

    await ticket.update(ticketUpdate, {
      where: { id: ticket.id }
    });
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

    await ticket.update(ticketUpdate, {
      where: { id: ticket.id }
    });
    return CreateMessageService({ messageData });
  }
};

export default ReceiveEventService;
