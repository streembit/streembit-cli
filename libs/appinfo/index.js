/*
This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/ or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or(at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
    Author: Streembit team
Copyright(C) 2017 ZoVolt Ltd
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const singleton = Symbol();
const singleton_verifier = Symbol();

export class AppInfo {
    constructor(enforcer) {
        if (enforcer != singleton_verifier) {
            throw "AppInfo must be a singleton";
        }

        this.m_wsavailable = false;
        this.m_wsclientcount = 0;
        this.m_wsmaxconn = 0;
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new AppInfo(singleton_verifier);
        }
        return this[singleton];
    }

    get wsavailable() {
        return this.m_wsavailable;
    }
    set wsavailable(value) {
        this.m_wsavailable = value;
    }

    get wsclientcount() {
        return this.m_wsclientcount;
    }
    set wsclientcount(value) {
        this.m_wsclientcount = value;
    }

    get wsmaxconn() {
        return this.m_wsmaxconn;
    }
    set wsmaxconn(value) {
        this.m_wsmaxconn = value;
    }
}
