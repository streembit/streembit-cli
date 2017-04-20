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

var config = require("config");
var logger = require("libs/logger");
var merkle = require("./merkle");

module.exports = exports = function (callback) {
    var confarr = config.modules.filter(function (item) {
        return item.name == "blockchain";
    });

    var moduleconf = confarr && confarr.length ? confarr[0] : [];
    if (!moduleconf.run) {
        logger.debug("Don't run blockchain handler");
        return callback();
    }

    /*
    //test
    var transactions = [];
    for (var i = 0; i < 5; i++) {
        transactions.push('' + i);
    }

    var tree = merkle('sha256').sync(transactions);
    var root = tree.root();

    var treearray = tree.level(3);
    console.log(treearray);
    */
   
    /*
    [ 'c7fa97592f2ae198f85e930e7cd18decf5f3dd1354b58618c44bf3bfd1e4ca18',
  '66b9f7ee7f601324b3d448f77da8c9ff2786f0c9ae80a9c869066c6a6b6cc266' ]

    [ '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
  '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
  'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
  '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
  '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
  'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
  'e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683',
  '7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451',
  '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3',
  '19581e27de7ced00ff1ce50b2047e7a567c76b1cbaebabe5ef03f7c3017bb5b7',
  '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5',
  '4fc82b26aecb47d2868c4efbe3581732a3e7cbcc6c2efb32062c08170a05eeb8',
  '6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918',
  '3fdba35f04dc8c462986c992bcf875546257113072a909c162f7e470e581e278',
  '8527a891e224136950ff32ca212b45bc93f69fbb801c3b1ebedac52775f99e61',
  'e629fa6598d732768f7c726b4b621285f9c3b85303900aa912017db7617d8bdb',
  'b17ef6d19c7a5b1ee83b907c595526dcb1eb06db8227d650d5dda0a9f4ce8cd9',
  '4523540f1504cd17100c4835e85b7eefd49911580f8efff0599a8f283be6b9e3',
  '4ec9599fc203d176a301536c2e091a19bc852759b255bd6818810a42c5fed14a',
  '9400f1b21cb527d7fa3d3eabba93557a18ebe7a2ca4e471cfe5e4c5b4ca7f767',
  'f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b',
  '6f4b6612125fb3a0daecd2799dfd6c9c299424fd920f9b308110a2c1fbd8f443',
  '785f3ec7eb32f30b90cd0fcf3657d388b5ff4297f2f9716ff66e9b69c05ddd09',
  '535fa30d7e25dd8a49f1536779734ec8286108d115da5045d77f3b4185d8f790',
  'c2356069e9d1e79ca924378153cfbbfb4d4416b1f99d41a2940bfdb66c5319db',
  'b7a56873cd771f2c446d369b649430b65a756ba278ff97ec81bb6f55b2e73569',
  '5f9c4ab08cac7457e9111a30e4664920607ea2c115a1433d7be98e97e64244ca',
  '670671cd97404156226e507973f2ab8330d3022ca96e0c93bdbdb320c41adcaf',
  '59e19706d51d39f66711c2653cd7eb1291c94d9b55eb14bda74ce4dc636d015a',
  '35135aaa6cc23891b40cb3f378c53a17a1127210ce60e125ccf03efcfdaec458',
  '624b60c58c9d8bfb6ff1886c2fd605d2adeb6ea4da576068201b6c6958ce93f4',
  'eb1e33e8a81b697b75855af6bfcdbcbf7cbbde9f94962ceaec1ed8af21f5a50f',
  'e29c9c180c6279b0b02abd6a1801c7c04082cf486ec027aa13515e4f3884bb6b',
  'c6f3ac57944a531490cd39902d0f777715fd005efac9a30622d5f5205e7f6894',
  '86e50149658661312a9e0b35558d84f6c6d3da797f552a9657fe0558ca40cdef',
  '9f14025af0065b30e47e23ebb3b491d39ae8ed17d33739e5ff3827ffb3634953',
  '76a50887d8f1c2e9301755428990ad81479ee21c25b43215cf524541e0503269',
  '7a61b53701befdae0eeeffaecc73f14e20b537bb0f8b91ad7c2936dc63562b25',
  'aea92132c4cbeb263e6ac2bf6c183b5d81737f179f21efdc5863739672f0f470',
  '0b918943df0962bc7a1824c0555a389347b4febdc7cf9d1254406d80ce44e3f9',
  'd59eced1ded07f84c145592f65bdf854358e009c5cd705f5215bf18697fed103',
  '3d914f9348c9cc0ff8a79716700b9fcd4d2f3e711608004eb8f138bcba7f14d9',
  '73475cb40a568e8da8a045ced110137e159f890ac4da883b6b17dc651b3a8049',
  '44cb730c420480a0477b505ae68af508fb90f96cf0ec54c6ad16949dd427f13a',
  '71ee45a3c0db9a9865f7313dd3372cf60dca6479d46261f3542eb9346e4a04d6',
  '811786ad1ae74adfdd20dd0372abaaebc6246e343aebd01da0bfc4c02bf0106c',
  '25fc0e7096fc653718202dc30b0c580b8ab87eac11a700cba03a7c021bc35b0c',
  '31489056e0916d59fe3add79e63f095af3ffb81604691f21cad442a85c7be617',
  '98010bd9270f9b100b6214a21754fd33bdc8d41b2bc9f9dd16ff54d3c34ffd71',
  '0e17daca5f3e175f448bacace3bc0da47d0655a74c8dd0dc497a3afbdad95f1f',
  '1a6562590ef19d1045d06c4055742d38288e9e6dcd71ccde5cee80f1d5a774eb',
  '031b4af5197ec30a926f48cf40e11a7dbc470048a21e4003b7a3c07c5dab1baa',
  '41cfc0d1f2d127b04555b7246d84019b4d27710a3f3aff6e7764375b1e06e05d',
  '2858dcd1057d3eae7f7d5f782167e24b61153c01551450a628cee722509f6529',
  '2fca346db656187102ce806ac732e06a62df0dbb2829e511a770556d398e1a6e',
  '02d20bbd7e394ad5999a4cebabac9619732c343a4cac99470c03e23ba2bdc2bc',
  '7688b6ef52555962d008fff894223582c484517cea7da49ee67800adc7fc8866',
  'c837649cce43f2729138e72cc315207057ac82599a59be72765a477f22d14a54',
  '6208ef0f7750c111548cf90b6ea1d0d0a66f6bff40dbef07cb45ec436263c7d6',
  '3e1e967e9b793e908f8eae83c74dba9bcccce6a5535b4b462bd9994537bfe15c',
  '39fa9ec190eee7b6f4dff1100d6343e10918d044c75eac8f9e9a2596173f80c9',
  'd029fa3a95e174a19934857f535eb9427d967218a36ea014b70ad704bc6c8d1c',
  '81b8a03f97e8787c53fe1a86bda042b6f0de9b0ec9c09357e107c99ba4d6948a',
  'da4ea2a5506f2693eae190d9360a1f31793c98a1adade51d93533a6f520ace1c',
  'a68b412c4282555f15546cf6e1fc42893b7e07f271557ceb021821098dd66c1b',
  '108c995b953c8a35561103e2014cf828eb654a99e310f87fab94c2f4b7d2a04f',
  '3ada92f28b4ceda38562ebf047c6ff05400d4c572352a1142eedfef67d21e662',
  '49d180ecf56132819571bf39d9b7b342522a2ac6d23c1418d3338251bfe469c8',
  'a21855da08cb102d1d217c53dc5824a3a795c1c1a44e971bf01ab9da3a2acbbf',
  'c75cb66ae28d8ebc6eded002c28a8ba0d06d3a78c6b5cbf9b2ade051f0775ac4',
  'ff5a1ae012afa5d4c889c50ad427aaf545d31a4fac04ffc1c4d03d403ba4250a',
  '7f2253d7e228b22a08bda1f09c516f6fead81df6536eb02fa991a34bb38d9be8',
  '8722616204217eddb39e7df969e0698aed8e599ba62ed2de1ce49b03ade0fede',
  '96061e92f58e4bdcdee73df36183fe3ac64747c81c26f6c83aada8d2aabb1864',
  'eb624dbe56eb6620ae62080c10a273cab73ae8eca98ab17b731446a31c79393a',
  'f369cb89fc627e668987007d121ed1eacdc01db9e28f8bb26f358b7d8c4f08ac',
  'f74efabef12ea619e30b79bddef89cffa9dda494761681ca862cff2871a85980',
  'a88a7902cb4ef697ba0b6759c50e8c10297ff58f942243de19b984841bfe1f73',
  '349c41201b62db851192665c504b350ff98c6b45fb62a8a2161f78b6534d8de9',
  '98a3ab7c340e8a033e7b37b6ef9428751581760af67bbab2b9e05d4964a8874a',
  '48449a14a4ff7d79bb7a1b6f3d488eba397c36ef25634c111b49baf362511afc',
  '5316ca1c5ddca8e6ceccfce58f3b8540e540ee22f6180fb89492904051b3d531',
  'a46e37632fa6ca51a13fe39a567b3c23b28c2f47d8af6be9bd63e030e214ba38',
  'bbb965ab0c80d6538cf2184babad2a564a010376712012bd07b0af92dcd3097d',
  '44c8031cb036a7350d8b9b8603af662a4b9cdbd2f96e8d5de5af435c9c35da69',
  'b4944c6ff08dc6f43da2e9c824669b7d927dd1fa976fadc7b456881f51bf5ccc',
  '434c9b5ae514646bbd91b50032ca579efec8f22bf0b4aac12e65997c418e0dd6',
  'bdd2d3af3a5a1213497d4f1f7bfcda898274fe9cb5401bbc0190885664708fc2',
  '8b940be7fb78aaa6b6567dd7a3987996947460df1c668e698eb92ca77e425349',
  'cd70bea023f752a0564abb6ed08d42c1440f2e33e29914e55e0be1595e24f45a',
  '69f59c273b6e669ac32a6dd5e1b2cb63333d8b004f9696447aee2d422ce63763',
  '1da51b8d8ff98f6a48f80ae79fe3ca6c26e1abb7b7d125259255d6d2b875ea08',
  '8241649609f88ccd2a0a5b233a07a538ec313ff6adf695aa44a969dbca39f67d',
  '6e4001871c0cf27c7634ef1dc478408f642410fd3a444e2a88e301f5c4a35a4d',
  'e3d6c4d4599e00882384ca981ee287ed961fa5f3828e2adb5e9ea890ab0d0525',
  'ad48ff99415b2f007dc35b7eb553fd1eb35ebfa2f2f308acd9488eeb86f71fa8',
  '7b1a278f5abe8e9da907fc9c29dfd432d60dc76e17b0fabab659d2a508bc65c4',
  'd6d824abba4afde81129c71dea75b8100e96338da5f416d2f69088f1960cb091',
  '29db0c6782dbd5000559ef4d9e953e300e2b479eed26d887ef3f92b921c06a67',
  '8c1f1046219ddd216a023f792356ddf127fce372a72ec9b4cdac989ee5b0b455' ]

    */

    //end test

    logger.info("Run blockchain handler");
    callback();
};