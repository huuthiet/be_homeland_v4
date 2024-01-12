import { Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import { jwtHelper, normalizeError, helpers } from '../../utils';

import ImageService from '../../services/image';
import HttpResponse from '../../services/response';

import FloorController from './floor';
import RoomController from './room';

export default class NotificationController {

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get motel room by id
  static async createNotification(data: any): Promise<any> {
    // Init models
    const { notification: notificationModel } = global.mongoModel;

    return await notificationModel.create(data);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
