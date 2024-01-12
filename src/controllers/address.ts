import { Request, Response, NextFunction } from 'express';
import * as moment from 'moment';
import * as _ from 'underscore';
import * as lodash from 'lodash';

import { jwtHelper, normalizeError, helpers } from '../utils';

import GoogleMapService from '../services/googleMap';

export default class AddressController {
  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get user by id
  static async createAddress(googleMapData: Object): Promise<any> {
    const { address: addressModel } = global.mongoModel;

    let initData = {
      address: googleMapData['formatted_address'],
      components: googleMapData['address_components'],
      geometry: googleMapData['geometry'],
      placeId: googleMapData['place_id'],
      plusCode: googleMapData['plus_code'],
      types: googleMapData['types'],
    };

    // Find data of user
    return await addressModel.create(initData);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
