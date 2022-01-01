"use strict";

// const { Duplex: DuplexStream } = require('stream');

import { Duplex as DuplexStream } from "stream";

/**
 * Represents a fake transport adapter that implements the read/write interface
 * and just emits a send and recv event
 */
export class FakeTransport extends DuplexStream {
  /**
   * @constructor
   */
  constructor() {
    super({ objectMode: true });
  }

  /**
   * @private
   */
  _read() {
    this.once("recv", (data) => this.push(data));
  }

  /**
   * @private
   */
  _write(data, enc, callback) {
    this.emit("send", data);
    callback();
  }

  listen() {}
}
