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
Author: Tibor Z Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


import { createHash } from 'crypto';
import { EccKey as ecckey } from '../crypto/index.js';
import secrand from "secure-random";


let password;
try {
    if (process.argv.indexOf("-pksecret") != -1) {
        password = process.argv[process.argv.indexOf("-pksecret") + 1];
    }
}
catch (err) {
}

if (password) {
    password = createHash('sha256').update(password).digest('hex');
}
else {
    password = secrand.randomBuffer(32).toString("hex");
}

let entropy = createHash('sha256').update(password).digest('hex');

let key = new ecckey();
key.generateKey(entropy);

console.log("Key created");
console.log("Private key: %s", key.privateKeyHex);
console.log("Public key HEX: %s", key.publicKeyHex);
console.log("Public key BS58: %s", key.publicKeyBs58);
console.log("Public key hash: %s", key.pubkeyhash);