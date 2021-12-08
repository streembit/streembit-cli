/*
 * xbee-api
 * https://github.com/jouz/xbee-api
 *
 * Copyright (c) 2013 Jan Kolkmeier
 * Licensed under the MIT license.
 */

'use strict';



import assert from 'assert';
import events from 'events';
import { Buffer } from 'safe-buffer';
import BufferBuilder from 'buffer-builder';
import BufferReader from 'buffer-reader';
export const exports = {};
import * as _constants from './constants.js';
import * as frame_parser from './frame-parser.js';
import * as frame_builder from './frame-builder.js';
export const constants = _constants;
export const _frame_parser = frame_parser;
export const _frame_builder = frame_builder;

let C = constants;


let _options = {
  raw_frames: false,
  api_mode: 1,
  module: "Any",
  convert_adc: true,
  vref_adc: 1200,
};
export class XBeeAPI extends events.EventEmitter {

  constructor(options) {
    super();
    options = options || {};
    options.__proto__ = _options;
    this.options = options;

    this.parseState = {
      buffer: Buffer.alloc(128),
      offset: 0,         // Offset in buffer
      length: 0,         // Packet Length
      total: 0,          // To test Checksum
      checksum: 0x00,    // Checksum byte
      b: 0x00,           // Working byte
      escape_next: false,// For escaping in AP=2
      waiting: true
    };
  }


  escape(buffer) {
    if (this.escapeBuffer === undefined)
      this.escapeBuffer = Buffer.alloc(512);

    let offset = 0;
    this.escapeBuffer.writeUInt8(buffer[0], offset++);
    for (let i = 1; i < buffer.length; i++) {
      if (C.ESCAPE_BYTES.indexOf(buffer[i]) > -1) {
        this.escapeBuffer.writeUInt8(C.ESCAPE, offset++);
        this.escapeBuffer.writeUInt8(buffer[i] ^ C.ESCAPE_WITH, offset++);
      } else {
        this.escapeBuffer.writeUInt8(buffer[i], offset++);
      }
    }

    return Buffer.from(this.escapeBuffer.slice(0, offset));
  };


  buildFrame(frame) {
    assert(frame, 'Frame parameter must be a frame object');

    let packet = Buffer.alloc(256); // Packet buffer
    let payload = packet.slice(3); // Reference the buffer past the header
    let builder = new BufferBuilder(payload);

    if (!frame_builder[frame.type])
      throw new Error('This library does not implement building the %d frame type.', frame.type);

    // Let the builder fill the payload
    frame_builder[frame.type](frame, builder);

    // Calculate & Append Checksum
    let checksum = 0;
    for (let i = 0; i < builder.length; i++) checksum += payload[i];
    builder.appendUInt8(255 - (checksum % 256));

    // Get just the payload
    payload = payload.slice(0, builder.length);

    // Build the header at the start of the packet buffer
    builder = new BufferBuilder(packet);
    builder.appendUInt8(C.START_BYTE);
    builder.appendUInt16BE(payload.length - 1); // Sans checksum

    // Get the header and payload as one contiguous buffer
    packet = packet.slice(0, builder.length + payload.length);

    // Escape the packet, if needed
    return this.options.api_mode === 2 ? this.escape(packet) : packet;
  };

  // Note that this expects the whole frame to be escaped!
  parseFrame(rawFrame) {
    // Trim the header and trailing checksum
    let reader = new BufferReader(rawFrame.slice(3, rawFrame.length - 1));

    let frame = {
      type: reader.nextUInt8() // Read Frame Type
    };

    // Frame type specific parsing.
    frame_parser[frame.type](frame, reader, this.options);

    return frame;
  };


  canParse(buffer) {
    let type = buffer.readUInt8(3);
    return type in frame_parser;
  };

  canBuild(type) {
    return type in frame_builder;
  };

  nextFrameId() {
    return frame_builder.nextFrameId();
  };

  rawParser() {
    return function (emitter, buffer) {
      this.parseRaw(buffer);
    }.bind(this);
  };

  parseRaw(buffer) {
    let S = this.parseState;
    for (let i = 0; i < buffer.length; i++) {
      S.b = buffer[i];
      if ((S.waiting || (this.options.api_mode === 2 && !S.escape_next)) && S.b === C.START_BYTE) {
        S.buffer = Buffer.alloc(128);
        S.length = 0;
        S.total = 0;
        S.checksum = 0x00;
        S.offset = 0;
        S.escape_next = false;
        S.waiting = false;
      }

      if (this.options.api_mode === 2 && S.b === C.ESCAPE) {
        S.escape_next = true;
        continue;
      }

      if (S.escape_next) {
        S.b = 0x20 ^ S.b;
        S.escape_next = false;
      }

      if (!S.waiting) {
        if (S.buffer.length > S.offset) {
          S.buffer.writeUInt8(S.b, S.offset++);
        } else {
          console.log("We would have a problem...");
          S.waiting = true;
        }
      }

      if (S.offset === 1) {
        continue;
      }

      if (S.offset === 2) {
        S.length = S.b << 8; // most sign. bit of the length
        continue;
      }
      if (S.offset === 3) {
        S.length += S.b;     // least sign. bit of the length
        continue;
      }

      if (S.offset > 3) { // unnessary check
        if (S.offset < S.length + 4) {
          S.total += S.b;
          continue;
        } else {
          S.checksum = S.b;
        }
      }

      if (S.length > 0 && S.offset === S.length + 4) {
        if (S.checksum !== (255 - (S.total % 256))) {
          let err = new Error("Checksum Mismatch " + JSON.stringify(S));
          this.emit('error', err);
        }

        let rawFrame = S.buffer.slice(0, S.offset);
        if (this.options.raw_frames || !this.canParse(rawFrame)) {
          this.emit("frame_raw", rawFrame);
        } else {
          let frame = this.parseFrame(rawFrame);
          this.emit("frame_object", frame);
        }

        // Reset some things so we don't try to reeimt the same package if there is more (bogus?) data
        S.waiting = true;
        S.length = 0;
      }
    }
  };
}










