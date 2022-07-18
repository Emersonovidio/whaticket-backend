import axios from "axios";
import { randomUUID } from "crypto";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessageTemplate = async ({
  body,
  ticket
}: Request): Promise<Message> => {
  try {
    const data = {
      messaging_product: "whatsapp",
      to: ticket.contact.number,
      type: "template",
      template: {
        name: body,
        language: {
          code: "pt_BR"
        }
      }
    };

    const config = {
      headers: {
        Authorization: String(process.env.ACCESS_TOKEN_FACEBOOK)
      }
    };

    const sentMessageTemplate = await axios.post(
      `${process.env.WHATSAPP_API_URI}/messages`,
      data,
      config
    );

    if (sentMessageTemplate.status !== 200) {
      throw new AppError("ERR_SENDING_WAPP_TEMPLATE");
    }

    const messageData = {
      id: randomUUID(),
      ack: sentMessageTemplate.status === 200 ? 1 : 0,
      ticketId: ticket.id,
      body: `*Template*: ${body}`,
      fromMe: true,
      read: true,
      mediaType: "chat",
      quotedMsgId: null
    };

    await ticket.update({ lastMessage: `*Template*: ${body}` });
    return await CreateMessageService({ messageData });
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_TEMPLATE");
  }
};

export default SendWhatsAppMessageTemplate;
