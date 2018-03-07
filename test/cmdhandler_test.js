/*
This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Team Streembit
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
*/


const assert = require('chai').assert;
const logger = require('streembit-util').logger;
const stdout = require('test-console').stdout;
const prompt = require('prompt');

const res = require('../resolvedir');
const config_json = require('../config');
const config = require('libs/config');
const CmdHandler = require('apps/cmd');
const BlockchainHandler = require('apps/blockchain');


describe("CMD input", function () {
    let out, cmd, inspect;

    before(function(done) {
        config.init(config_json.transport.port, config_json.transport.host, config_json.password, () => {
            cmd = new CmdHandler();
            logger.init('debug', null, ['file']);
            done();
        })
    });

    describe("CmdHandler: command prompt", function () {
        it("should not show logger strings in console", function () {
            inspect = stdout.inspect();
            logger.debug('Running CMD tests');
            assert.isEmpty(inspect.output);
            inspect.restore();
        });

        it("should start blockchain commands handler", function () {

        });

        // Keep it the last one
        it('should show initial command prompt', function (done) {
            inspect = stdout.inspect();
            cmd.run(()=>{});
            setTimeout(() => {
                out = inspect.output;
                inspect.restore();
                assert.include(out.join(), 'Enter');
                prompt.stop();
                done();
            }, 1000);
        });
    });
});
