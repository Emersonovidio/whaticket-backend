import { randomUUID } from "crypto";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

/* eslint-disable camelcase */
type WebhookNotification = {
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
              }
            ];
          };
          field: string;
        }
      ];
    }
  ];
};

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

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  console.log(body.entry[0].changes[0].value);

  const { from, type, text, button } =
    body.entry[0].changes[0].value.messages[0];

  const contact = await Contact.findOne({
    where: { number: from }
  });

  if (!contact) {
    throw new AppError("ERR_404_CONTACT_NOT_FOUND");
  }

  const ticket = await Ticket.findOne({
    where: { contactId: contact.id }
  });

  if (!ticket) {
    throw new AppError("ERR_404_TICKET_NOT_FOUND");
  }

  let messageData: MessageData;
  let ticketUpdate;

  if (text) {
    messageData = {
      id: randomUUID(),
      ack: 1,
      ticketId: ticket.id,
      body: text.body,
      fromMe: false,
      read: true,
      mediaType: type === "text" ? "chat" : type
    };

    ticketUpdate = {
      lastMessage: text.body,
      unreadMessages:
        ticket.status === "pending" || ticket.status === "closed"
          ? ticket.unreadMessages + 1
          : 0
    };

    await ticket.update({ ticketUpdate });
    return CreateMessageService({ messageData });
  }

  if (button) {
    messageData = {
      id: randomUUID(),
      ticketId: ticket.id,
      ack: 1,
      body: button.text,
      contactId: contact.id,
      fromMe: false,
      read: true,
      mediaType: type
    };

    ticketUpdate = {
      lastMessage: button.text,
      unreadMessages:
        ticket.status === "pending" || ticket.status === "closed"
          ? ticket.unreadMessages + 1
          : 0
    };

    await ticket.update({ ticketUpdate });
    return CreateMessageService({ messageData });
  }
};

export default ReceiveEventService;
