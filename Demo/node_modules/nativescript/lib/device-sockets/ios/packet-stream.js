///<reference path="../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var stream = require("stream");
var PacketStream = (function (_super) {
    __extends(PacketStream, _super);
    function PacketStream(opts) {
        _super.call(this, opts);
    }
    PacketStream.prototype._transform = function (packet, encoding, done) {
        while (packet.length > 0) {
            if (!this.buffer) {
                var length_1 = packet.readInt32BE(0);
                this.buffer = new Buffer(length_1);
                this.offset = 0;
                packet = packet.slice(4);
            }
            packet.copy(this.buffer, this.offset);
            var copied = Math.min(this.buffer.length - this.offset, packet.length);
            this.offset += copied;
            packet = packet.slice(copied);
            if (this.offset === this.buffer.length) {
                this.push(this.buffer);
                this.buffer = undefined;
            }
        }
        done();
    };
    return PacketStream;
})(stream.Transform);
exports.PacketStream = PacketStream;
