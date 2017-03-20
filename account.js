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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';

var streembit = streembit || {};

var async = require("async");
var crypto = require('crypto');
var ecckey = require('./libs/index').crypto;
var secrand = require('secure-random');
streembit.config = require("./config.json");

streembit.account = (function (accountobj, logger) {
    
    var m_name = null;
    var key = null;
    var ecdhkey = null;
    var m_port = null;
    var m_address = null;
    var m_ecdhkeys = null;
    var m_lastpkey = null;
    
    Object.defineProperty(accountobj, "name", {
        get: function () {
            return m_name;
        },
        
        set: function (value) {
            m_name = value;
        }
    });
    
    Object.defineProperty(accountobj, "port", {
        get: function () {
            return m_port;
        },
        
        set: function (value) {
            m_port = value;
        }
    });
    
    Object.defineProperty(accountobj, "address", {
        get: function () {
            return m_address;
        },
        
        set: function (value) {
            m_address = value;
        }
    });
    
    Object.defineProperty(accountobj, "crypto_key", {
        get: function () {
            return key;
        },
        
        set: function (value) {
            key = value;
        }
    });
    
    Object.defineProperty(accountobj, "private_key", {
        get: function () {
            return key ? key.privateKey : '';
        }
    });
    
    
    Object.defineProperty(accountobj, "public_key", {
        get: function () {
            return key ? key.publicKeyHex : '';
        }
    });

    Object.defineProperty(accountobj, "publicKeyBs58", {
        get: function () {
            return key ? key.publicKeyBs58 : '';
        }
    });
    
    
    Object.defineProperty(accountobj, "is_user_initialized", {
        get: function () {
            var isuser = m_name && key && ecdhkey;
            return isuser ? true : false;
        }
    });
   
    
    accountobj.create = function (callback) {
        try {    
            if (!streembit.config.private_network) {
                return callback();
            }

            var privatekeyhex = streembit.config.privatekey;
            if (!privatekeyhex) {
                return callback("private key is required for private networks");
            }

            var key = new ecckey();
            key.keyFromPrivate(privatekeyhex);
            
            // set the PPKI key
            accountobj.crypto_key = key;

            // The account name will be the ip address + port set by the node StreembitContact object 
            accountobj.name = streembit.config.username ? streembit.config.username : key.pubkeyhash;

            callback();
        }
        catch (err) {
            callback("create_account error: " + err.message);
        }
    };

    accountobj.clear = function () {
        accountobj.crypto_key = null;
        accountobj.name = null;
        accountobj.ecdh_key = null;
    }
    
    return accountobj;

}(streembit.account || {}, global.applogger ));

module.exports = streembit.account;