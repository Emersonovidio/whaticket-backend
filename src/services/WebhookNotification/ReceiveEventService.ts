import { randomUUID } from "crypto";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

/* eslint-disable camelcase */
// type WebhookNotification = {
//   object: string;
//   entry: [
//     {
//       id: number;
//       time: number;
//       changes: [
//         {
//           value: {
//             messaging_product: string;
//             metadata: {
//               display_phone_number: number;
//               phone_number_id: number;
//             };
//             contacts: [
//               {
//                 profile: {
//                   name: string;
//                 };
//                 wa_id: number;
//               }
//             ];
//             messages: [
//               {
//                 from: number;
//                 id: string;
//                 timestamp: Date;
//                 text: {
//                   body: string;
//                 };
//                 type: string;
//               }
//             ];
//           };
//           field: string;
//         }
//       ];
//     }
//   ];
// };

interface WebhookNotification {
  context: {
    from: string;
    id: string;
  };
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  button?: {
    payload: string;
    text: string;
  };
}

export const ReceiveEventService = async (
  body: WebhookNotification
): Promise<unknown> => {
  console.log(body);

  const { from, text, type } = body;

  const contact = await Contact.findOne({
    where: { number: from }
  });

  if (contact) {
    const ticket = await Ticket.findOne({
      where: { contactId: contact.id }
    });

    let ticketUpdate;
    let messageData;

    if (ticket) {
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
            ticket.status === "pending" ? ticket.unreadMessages + 1 : 0
        };
      }

      if (ticket && body.button) {
        messageData = {
          id: randomUUID(),
          ack: 1,
          ticketId: ticket.id,
          body: body.button.text,
          fromMe: false,
          read: true,
          mediaType: type === "text" ? "chat" : type
        };

        ticketUpdate = {
          lastMessage: body.button.text,
          unreadMessages:
            ticket.status === "pending" ? ticket.unreadMessages + 1 : 0
        };

        await ticket.update(ticketUpdate);
        return CreateMessageService({ messageData });
      }
    }
  }
};

export default ReceiveEventService;
