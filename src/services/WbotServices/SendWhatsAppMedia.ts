import axios from "axios";
import FormData from "form-data";
import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

interface GetMediaObjectId {
  id: string;
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

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<Message> => {
  try {
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", media.mimetype);
    formData.append("file", createReadStream(media.path));

    const { data } = await axios.post<GetMediaObjectId>(
      `${process.env.WHATSAPP_API_URI}/media`,
      formData,
      {
        headers: {
          Authorization: String(process.env.ACCESS_TOKEN_FACEBOOK),
          "Content-Type": "multipart/form-data"
        }
      }
    );
    const [type] = media.mimetype.split("/");
    console.log(type);

    const sendMediaMessageResponse = await axios.post<SendMediaMessageResponse>(
      `${process.env.WHATSAPP_API_URI}/messages`,
      {
        messaging_product: "whatsapp",
        to: ticket.contact.number,
        type: type === "application" ? "document" : type,
        [type === "application" ? "document" : type]: {
          id: data.id
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
      body: body === undefined ? "" : body,
      ack: sendMediaMessageResponse.status === 200 ? 1 : 0,
      read: true,
      mediaType: type === "application" ? "document" : type,
      mediaUrl: media.filename,
      ticketId: ticket.id,
      fromMe: true
    };

    await ticket.update({ lastMessage: body || media.filename });
    return await CreateMessageService({ messageData });
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
