import { randomUUID } from "crypto";
import { Op } from "sequelize/types";
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
                text: {
                  body: string;
                };
                type: string;
              }
            ];
          };
          field: string;
        }
      ];
    }
  ];
};

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  console.log(body.entry[0].changes[0].value.messages[0]);

  const { from, text, type } = body.entry[0].changes[0].value.messages[0];

  const contact = await Contact.findOne({
    where: { number: from }
  });

  if (contact) {
    const ticket = await Ticket.findOne({
      where: { contactId: contact.id }
    });

    if (ticket) {
      const messageData = {
        id: randomUUID(),
        ack: 1,
        ticketId: ticket.id,
        body: text.body,
        fromMe: false,
        read: true,
        mediaType: type === "text" ? "chat" : type,
        quotedMsgId: null
      };

      await ticket.update({ lastMessage: text.body });
      return CreateMessageService({ messageData });
    }
  }
};

export default ReceiveEventService;
