import { randomUUID } from "crypto";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

/* eslint-disable camelcase */
type WebhookNotification = {
  contacts: {
    profile: {
      name: string;
    };
    wa_id: number;
  };
  messages: {
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
  };
};

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  console.log(body.messages);

  const { from, type, text, button } = body.messages;

  const contact = await Contact.findOne({
    where: { number: from }
  });

  if (contact) {
    const ticket = await Ticket.findOne({
      where: { contactId: contact.id }
    });

    if (ticket) {
      let ticketUpdate;
      let messageData;

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

        await ticket.update(ticketUpdate);
        return CreateMessageService({ messageData });
      }

      if (button) {
        messageData = {
          id: randomUUID(),
          ack: 1,
          ticketId: ticket.id,
          body: button.text,
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

        await ticket.update(ticketUpdate);
        return CreateMessageService({ messageData });
      }
    }
  }
};

export default ReceiveEventService;
