const https = require("https");
const { logger } = require("streembit-util");
class Cloudflare {
  constructor() {
    this.provider_name = "Cloudflare";
    this.dnsZone_id = "";
  }
  getZoneId(domain, email, key) {
    const options = {
      hostname: `https://api.cloudflare.com/client/v4/zones?name=${domain}&page=1&per_page=20&order=status&direction=desc&match=all`,
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": key,
      },
    };
    logger.error(options);
    https.get(options, (response) => {
      var result = "";
      response.on("data", function (chunk) {
        result += chunk;
      });

      response.on("end", function () {
        logger.debug(result);
      });
    });
  }
  getRecordId() {
    return id;
  }
  updateDns() {
    return id;
  }
}

module.exports = Cloudflare;
