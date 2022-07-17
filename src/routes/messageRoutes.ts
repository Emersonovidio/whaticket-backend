import { Router } from "express";
import multer from "multer";
// import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get("/messages/:ticketId", MessageController.index);

messageRoutes.post(
  "/messages/:ticketId",
  upload.array("medias"),
  MessageController.store
);

messageRoutes.delete("/messages/:messageId", MessageController.remove);

export default messageRoutes;
