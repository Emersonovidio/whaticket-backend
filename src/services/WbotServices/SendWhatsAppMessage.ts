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

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<Message> => {
  try {
    const sentMessage = await axios.post(
      `${process.env.WHATSAPP_API_URI}/messages`,
      {
        messaging_product: "whatsapp",
        to: ticket.contact.number,
        type: "text",
        text: {
          body
        }
      },
      {
        headers: {
          Authorization: String(process.env.ACCESS_TOKEN_FACEBOOK)
        }
      }
    );

    const messageData = {
      id: randomUUID(),
      ack: sentMessage.status === 200 ? 1 : 0,
      ticketId: ticket.id,
      body,
      fromMe: true,
      read: true,
      mediaType: "chat",
      quotedMsgId: quotedMsg ? quotedMsg.id : null
    };

    await ticket.update({ lastMessage: body });
    return await CreateMessageService({ messageData });
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
