import { randomUUID } from "crypto";
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

  const messageReceived = body.entry[0].changes[0].value.messages[0];

  const messageData = {
    id: randomUUID(),
    ack: 1,
    ticketId: 1,
    body: messageReceived.text.body,
    fromMe: false,
    read: true,
    mediaType: messageReceived.type === "text" ? "chat" : messageReceived.type,
    quotedMsgId: null
  };

  // await ticket.update({ lastMessage: body });
  return CreateMessageService({ messageData });
};

export default ReceiveEventService;
